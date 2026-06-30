import { PrismaClient } from '@prisma/client';
import { catchUpAccruals } from '../src/services/accrualService.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Seeding AB Capital database (backward-compatible, schema v2)...');

  // 1. Clean database
  await prisma.recoveryLedgerTransaction.deleteMany({});
  await prisma.dailyLedgerAccrual.deleteMany({});
  await prisma.penaltyTierConfig.deleteMany({});
  await prisma.loan.deleteMany({});
  await prisma.borrower.deleteMany({});
  await prisma.fund.deleteMany({});
  await prisma.systemConfig.deleteMany({});

  // 2. Create Funds
  const fund1 = await prisma.fund.create({
    data: {
      name: 'Institutional Growth Pool',
      total_capital: 50000000.0,
      allocated_capital: 0.0
    }
  });

  const fund2 = await prisma.fund.create({
    data: {
      name: 'Liquid Reserves Fund',
      total_capital: 20000000.0,
      allocated_capital: 0.0
    }
  });

  const fund3 = await prisma.fund.create({
    data: {
      name: 'Private Opportunity Pool',
      total_capital: 15000000.0,
      allocated_capital: 0.0
    }
  });

  // 3. Create Borrowers (with new schema fields - backward compatible defaults)
  const borrower1 = await prisma.borrower.create({
    data: {
      full_name: 'Devendra Singhania',
      phone: '+91 98765 43210',
      email: 'devendra@singhaniaholdings.com',
      internal_structural_notes: 'High net-worth developer. Subject to Tier-2 escalation if maturity breached by 10+ days.',
      is_deleted: false,
      edit_log: JSON.stringify([{
        action: 'CREATED',
        timestamp: new Date('2026-06-01T00:00:00.000Z').toISOString(),
        by: 'Admin',
        detail: 'Borrower profile created for Devendra Singhania.'
      }])
    }
  });

  const borrower2 = await prisma.borrower.create({
    data: {
      full_name: 'Meera Nair',
      phone: '+91 87654 32109',
      email: 'meera@alphalogistics.in',
      internal_structural_notes: 'Logistics expansion financing. Short term liquidity matching.',
      is_deleted: false,
      edit_log: JSON.stringify([{
        action: 'CREATED',
        timestamp: new Date('2026-06-05T00:00:00.000Z').toISOString(),
        by: 'Admin',
        detail: 'Borrower profile created for Meera Nair.'
      }])
    }
  });

  const borrower3 = await prisma.borrower.create({
    data: {
      full_name: 'Kabir Malhotra',
      phone: '+91 76543 21098',
      email: 'kabir@malhotravc.com',
      internal_structural_notes: 'Retail venture capital bridge loan. Historically partial repayments are received in multiple cycles.',
      is_deleted: false,
      edit_log: JSON.stringify([{
        action: 'CREATED',
        timestamp: new Date('2026-06-01T00:00:00.000Z').toISOString(),
        by: 'Admin',
        detail: 'Borrower profile created for Kabir Malhotra.'
      }])
    }
  });

  // 4. Set Initial System Date to June 1st, 2026
  await prisma.systemConfig.create({
    data: {
      id: 'default',
      system_date: new Date('2026-06-01T00:00:00.000Z'),
      is_manual_override: false
    }
  });

  // 5. Create Loans (Deploying Capital) - includes new interest_period field
  // Loan 1: Devendra (Overdue Loan, Issued June 1, Maturity June 12)
  const loan1 = await prisma.loan.create({
    data: {
      borrower_id: borrower1.id,
      fund_id: fund1.id,
      principal_disbursed: 1000000.0,
      remaining_principal: 1000000.0,
      remaining_interest: 0.0,
      remaining_penalty: 0.0,
      interest_rate_percentage: 12.0,
      interest_type: 'Simple',
      interest_period: 'Yearly',
      issue_date: new Date('2026-06-01T00:00:00.000Z'),
      maturity_due_date: new Date('2026-06-12T00:00:00.000Z'),
      status: 'Active',
      is_deleted: false,
      edit_log: JSON.stringify([{
        action: 'CREATED',
        timestamp: new Date('2026-06-01T00:00:00.000Z').toISOString(),
        by: 'Admin',
        detail: 'Loan originated: ₹10,00,000 at 12% p.a. (Yearly)'
      }])
    }
  });

  await prisma.fund.update({ where: { id: fund1.id }, data: { allocated_capital: 1000000.0 } });

  // Loan 2: Meera (Active Loan, Issued June 5, Maturity June 25)
  const loan2 = await prisma.loan.create({
    data: {
      borrower_id: borrower2.id,
      fund_id: fund2.id,
      principal_disbursed: 500000.0,
      remaining_principal: 500000.0,
      remaining_interest: 0.0,
      remaining_penalty: 0.0,
      interest_rate_percentage: 10.0,
      interest_type: 'Flat',
      interest_period: 'Monthly',
      issue_date: new Date('2026-06-05T00:00:00.000Z'),
      maturity_due_date: new Date('2026-06-25T00:00:00.000Z'),
      status: 'Active',
      is_deleted: false,
      edit_log: JSON.stringify([{
        action: 'CREATED',
        timestamp: new Date('2026-06-05T00:00:00.000Z').toISOString(),
        by: 'Admin',
        detail: 'Loan originated: ₹5,00,000 at 10% p.a. (Monthly)'
      }])
    }
  });

  await prisma.fund.update({ where: { id: fund2.id }, data: { allocated_capital: 500000.0 } });

  // Loan 3: Kabir (Overdue with partial payments, Issued June 1, Maturity June 10)
  const loan3 = await prisma.loan.create({
    data: {
      borrower_id: borrower3.id,
      fund_id: fund3.id,
      principal_disbursed: 300000.0,
      remaining_principal: 300000.0,
      remaining_interest: 0.0,
      remaining_penalty: 0.0,
      interest_rate_percentage: 15.0,
      interest_type: 'Simple',
      interest_period: 'Weekly',
      issue_date: new Date('2026-06-01T00:00:00.000Z'),
      maturity_due_date: new Date('2026-06-10T00:00:00.000Z'),
      status: 'Active',
      is_deleted: false,
      edit_log: JSON.stringify([{
        action: 'CREATED',
        timestamp: new Date('2026-06-01T00:00:00.000Z').toISOString(),
        by: 'Admin',
        detail: 'Loan originated: ₹3,00,000 at 15% p.a. (Weekly)'
      }])
    }
  });

  await prisma.fund.update({ where: { id: fund3.id }, data: { allocated_capital: 300000.0 } });

  // 6. Create Penalty Tier Configs
  await prisma.penaltyTierConfig.createMany({
    data: [
      { loan_id: loan1.id, start_day_overdue: 1, end_day_overdue: 5, penalty_amount_per_day: 150.0 },
      { loan_id: loan1.id, start_day_overdue: 6, end_day_overdue: 15, penalty_amount_per_day: 300.0 },
      { loan_id: loan1.id, start_day_overdue: 16, end_day_overdue: null, penalty_amount_per_day: 600.0 }
    ]
  });

  await prisma.penaltyTierConfig.createMany({
    data: [
      { loan_id: loan3.id, start_day_overdue: 1, end_day_overdue: 7, penalty_amount_per_day: 100.0 },
      { loan_id: loan3.id, start_day_overdue: 8, end_day_overdue: null, penalty_amount_per_day: 250.0 }
    ]
  });

  // 7. Simulate Time Progression & Accruals up to June 17, 2026
  console.log('📅 Simulating timeline: Catching up accruals to 2026-06-17...');
  await catchUpAccruals('2026-06-17T00:00:00.000Z');

  // 8. Process Kabir's Repayment on June 18th (Waterfall Engine simulation)
  console.log('💳 Simulating Kabir Malhotra partial repayment of ₹15,000 on June 18th...');
  await catchUpAccruals('2026-06-18T00:00:00.000Z');

  const loan3State = await prisma.loan.findUnique({
    where: { id: loan3.id },
    include: { fund: true }
  });

  const paymentAmount = 15000.0;
  let remainingPayment = paymentAmount;

  const pPaid = Math.min(remainingPayment, loan3State.remaining_penalty);
  remainingPayment = Math.round((remainingPayment - pPaid) * 100) / 100;
  const iPaid = Math.min(remainingPayment, loan3State.remaining_interest);
  remainingPayment = Math.round((remainingPayment - iPaid) * 100) / 100;
  const prPaid = Math.min(remainingPayment, loan3State.remaining_principal);

  await prisma.loan.update({
    where: { id: loan3.id },
    data: {
      remaining_penalty: Math.round((loan3State.remaining_penalty - pPaid) * 100) / 100,
      remaining_interest: Math.round((loan3State.remaining_interest - iPaid) * 100) / 100,
      remaining_principal: Math.round((loan3State.remaining_principal - prPaid) * 100) / 100
    }
  });

  await prisma.fund.update({
    where: { id: fund3.id },
    data: { allocated_capital: Math.round((loan3State.fund.allocated_capital - prPaid) * 100) / 100 }
  });

  await prisma.recoveryLedgerTransaction.create({
    data: {
      loan_id: loan3.id,
      date: new Date('2026-06-18T14:30:00.000Z'),
      total_amount_received: paymentAmount,
      allocated_to_penalty: pPaid,
      allocated_to_interest: iPaid,
      allocated_to_principal: prPaid,
      is_deleted: false
    }
  });

  // 9. Catch up accruals from June 18 to today's real-world calendar date
  const now = new Date();
  const todayLocalMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  console.log(`📅 Catching up accruals to today's real-world date: ${todayLocalMidnight.toDateString()}...`);
  await catchUpAccruals(todayLocalMidnight.toISOString());

  console.log('\n✅ Seeding complete!');
  console.log(`   Borrowers: 3 (Devendra Singhania, Meera Nair, Kabir Malhotra)`);
  console.log(`   Funds:     3 (Institutional Growth Pool, Liquid Reserves Fund, Private Opportunity Pool)`);
  console.log(`   Loans:     3 (Active/Overdue with full accrual history)`);
  console.log(`   System Date: ${todayLocalMidnight.toDateString()}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding DB:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
