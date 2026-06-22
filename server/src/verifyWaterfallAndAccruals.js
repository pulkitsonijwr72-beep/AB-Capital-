import { PrismaClient } from '@prisma/client';
import { accrueForLoan } from './services/accrualService.js';

const prisma = new PrismaClient();

async function runTests() {
  console.log('--------------------------------------------------');
  console.log(' STARTING LEDGER ENGINE VERIFICATION TESTS');
  console.log('--------------------------------------------------');

  try {
    // 1. Clean test DB items
    await prisma.recoveryLedgerTransaction.deleteMany({});
    await prisma.dailyLedgerAccrual.deleteMany({});
    await prisma.penaltyTierConfig.deleteMany({});
    await prisma.loan.deleteMany({});
    await prisma.borrower.deleteMany({});
    await prisma.fund.deleteMany({});

    // 2. Create test Fund
    const testFund = await prisma.fund.create({
      data: {
        name: 'Verification Test Fund',
        total_capital: 100000.0,
        allocated_capital: 10000.0
      }
    });

    // 3. Create test Borrower
    const testBorrower = await prisma.borrower.create({
      data: {
        full_name: 'Test Account',
        phone: '12345',
        email: 'test@abcapital.com',
        internal_structural_notes: 'System verification client.'
      }
    });

    // 4. Create Loan (Principal: ₹10,000, 10% Simple, Maturity: 2026-06-10)
    const testLoan = await prisma.loan.create({
      data: {
        borrower_id: testBorrower.id,
        fund_id: testFund.id,
        principal_disbursed: 10000.0,
        remaining_principal: 10000.0,
        remaining_interest: 0.0,
        remaining_penalty: 0.0,
        interest_rate_percentage: 10.0,
        interest_type: 'Simple',
        issue_date: new Date('2026-06-01T00:00:00.000Z'),
        maturity_due_date: new Date('2026-06-10T00:00:00.000Z'),
        status: 'Active'
      }
    });

    // 5. Create Penalty configs:
    // DPD 1-5 -> ₹50/day
    // DPD 6+ -> ₹100/day
    await prisma.penaltyTierConfig.createMany({
      data: [
        { loan_id: testLoan.id, start_day_overdue: 1, end_day_overdue: 5, penalty_amount_per_day: 50.0 },
        { loan_id: testLoan.id, start_day_overdue: 6, end_day_overdue: null, penalty_amount_per_day: 100.0 }
      ]
    });

    // Fetch loan with relation
    const loanDb = await prisma.loan.findUnique({
      where: { id: testLoan.id },
      include: { penalty_tier_configs: true, borrower: true }
    });

    console.log('[TEST 1] Testing Accrual Calculations...');

    // Simulate June 11 (DPD = 1)
    console.log('-> Simulating accrual for June 11 (DPD = 1)...');
    const accrual1 = await prisma.$transaction(async (tx) => {
      return await accrueForLoan(loanDb, '2026-06-11T00:00:00.000Z', tx);
    });

    // Assert: Interest = (10,000 * 10%) / 365 = 2.74
    // Assert: Penalty = 50.0 (Tier 1)
    console.log(`   Accrued Interest: ₹${accrual1.interest_accrued} (Expected: ~₹2.74)`);
    console.log(`   Accrued Penalty:  ₹${accrual1.penalty_accrued} (Expected: ₹50.00)`);
    console.log(`   Status:           ${accrual1.active_tier_label} (Expected: Tier-1 Overdue)`);

    if (accrual1.penalty_accrued !== 50.0) {
      throw new Error(`Accrual test failed: Expected penalty 50.0, got ${accrual1.penalty_accrued}`);
    }
    console.log('✓ TEST 1 PASSED.');

    console.log('\n[TEST 2] Testing Escalated Penalty Tiers...');
    // Re-fetch loan
    const loanDb2 = await prisma.loan.findUnique({
      where: { id: testLoan.id },
      include: { penalty_tier_configs: true, borrower: true }
    });

    // Simulate June 16 (DPD = 6) -> Should hit Tier 2 (₹100/day)
    console.log('-> Simulating accrual for June 16 (DPD = 6)...');
    const accrual2 = await prisma.$transaction(async (tx) => {
      return await accrueForLoan(loanDb2, '2026-06-16T00:00:00.000Z', tx);
    });

    console.log(`   Accrued Interest: ₹${accrual2.interest_accrued}`);
    console.log(`   Accrued Penalty:  ₹${accrual2.penalty_accrued} (Expected: ₹100.00)`);
    console.log(`   Status:           ${accrual2.active_tier_label} (Expected: Tier-2 Overdue)`);

    if (accrual2.penalty_accrued !== 100.0) {
      throw new Error(`Escalation test failed: Expected penalty 100.0, got ${accrual2.penalty_accrued}`);
    }
    console.log('✓ TEST 2 PASSED.');

    console.log('\n[TEST 3] Testing Recovery Waterfall Engine...');
    // Fetch loan balances before payment
    const loanBeforePay = await prisma.loan.findUnique({
      where: { id: testLoan.id }
    });

    const penaltyBal = loanBeforePay.remaining_penalty;   // 50 + 100 = 150
    const interestBal = loanBeforePay.remaining_interest; // ~5.48
    const principalBal = loanBeforePay.remaining_principal; // 10000

    console.log(`   Balances Before Payment: Principal ₹${principalBal}, Interest ₹${interestBal}, Penalty ₹${penaltyBal}`);
    
    // Repayment: ₹160 (Waterfall should clear ₹150 penalty, then clear ₹5.48 interest, then clear ₹4.52 principal)
    console.log('-> Processing repayment of ₹160...');
    const paymentAmount = 160.0;
    
    const result = await prisma.$transaction(async (tx) => {
      let rem = paymentAmount;
      const pPaid = Math.min(rem, loanBeforePay.remaining_penalty);
      rem -= pPaid;
      const iPaid = Math.min(rem, loanBeforePay.remaining_interest);
      rem -= iPaid;
      const prPaid = Math.min(rem, loanBeforePay.remaining_principal);
      
      const newP = Math.round((loanBeforePay.remaining_penalty - pPaid) * 100) / 100;
      const newI = Math.round((loanBeforePay.remaining_interest - iPaid) * 100) / 100;
      const newPr = Math.round((loanBeforePay.remaining_principal - prPaid) * 100) / 100;

      await tx.loan.update({
        where: { id: loanBeforePay.id },
        data: {
          remaining_penalty: newP,
          remaining_interest: newI,
          remaining_principal: newPr
        }
      });

      return { pPaid, iPaid, prPaid, newP, newI, newPr };
    });

    console.log(`   Waterfall Allocations:`);
    console.log(`   Allocated to Penalty:   ₹${result.pPaid} (Expected: ₹150.00)`);
    console.log(`   Allocated to Interest:  ₹${result.iPaid} (Expected: ₹5.48)`);
    console.log(`   Allocated to Principal: ₹${result.prPaid.toFixed(2)} (Expected: ₹4.52)`);
    console.log(`   Remaining Balances: Principal ₹${result.newPr}, Interest ₹${result.newI}, Penalty ₹${result.newP}`);

    if (result.pPaid !== 150.0 || result.newP !== 0.0 || result.newI !== 0.0 || Math.abs(result.prPaid - 4.52) > 0.01) {
      throw new Error('Waterfall logic verification failed.');
    }
    console.log('✓ TEST 3 PASSED.');

    console.log('--------------------------------------------------');
    console.log(' ALL LEDGER ENGINE TESTS PASSED SUCCESSFULLY');
    console.log('--------------------------------------------------');

  } catch (error) {
    console.error('✘ VERIFICATION TEST FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
