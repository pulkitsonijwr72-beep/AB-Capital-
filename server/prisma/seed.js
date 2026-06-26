import { PrismaClient } from '@prisma/client';
import { catchUpAccruals } from '../src/services/accrualService.js';
import { differenceInCalendarDays } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding AB Capital database...');

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
      total_capital: 50000000.0, // 5 Cr
      allocated_capital: 0.0
    }
  });

  const fund2 = await prisma.fund.create({
    data: {
      name: 'Liquid Reserves Fund',
      total_capital: 20000000.0, // 2 Cr
      allocated_capital: 0.0
    }
  });

  const fund3 = await prisma.fund.create({
    data: {
      name: 'Private Opportunity Pool',
      total_capital: 15000000.0, // 1.5 Cr
      allocated_capital: 0.0
    }
  });

  // 3. Create Borrowers
  const borrower1 = await prisma.borrower.create({
    data: {
      full_name: 'Devendra Singhania',
      phone: '+91 98765 43210',
      email: 'devendra@singhaniaholdings.com',
      internal_structural_notes: 'High net-worth developer. Subject to Tier-2 escalation if maturity breached by 10+ days.'
    }
  });

  const borrower2 = await prisma.borrower.create({
    data: {
      full_name: 'Meera Nair',
      phone: '+91 87654 32109',
      email: 'meera@alphalogistics.in',
      internal_structural_notes: 'Logistics expansion financing. Short term liquidity matching.'
    }
  });

  const borrower3 = await prisma.borrower.create({
    data: {
      full_name: 'Kabir Malhotra',
      phone: '+91 76543 21098',
      email: 'kabir@malhotravc.com',
      internal_structural_notes: 'Retail venture capital bridge loan. Historically partial repayments are received in multiple cycles.'
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

  // 5. Create Loans (Deploying Capital)
  // Loan 1: Devendra (Overdue Loan, Issued June 1, Maturity June 12)
  const loan1 = await prisma.loan.create({
    data: {
      borrower_id: borrower1.id,
      fund_id: fund1.id,
      principal_disbursed: 1000000.0, // 10 L
      remaining_principal: 1000000.0,
      remaining_interest: 0.0,
      remaining_penalty: 0.0,
      interest_rate_percentage: 12.0, // 12% per annum
      interest_type: 'Simple',
      issue_date: new Date('2026-06-01T00:00:00.000Z'),
      maturity_due_date: new Date('2026-06-12T00:00:00.000Z'),
      status: 'Active'
    }
  });

  // Update Fund 1 deployed capital
  await prisma.fund.update({
    where: { id: fund1.id },
    data: { allocated_capital: 1000000.0 }
  });

  // Loan 2: Meera (Active Loan, Issued June 5, Maturity June 25)
  const loan2 = await prisma.loan.create({
    data: {
      borrower_id: borrower2.id,
      fund_id: fund2.id,
      principal_disbursed: 500000.0, // 5 L
      remaining_principal: 500000.0,
      remaining_interest: 0.0,
      remaining_penalty: 0.0,
      interest_rate_percentage: 10.0, // 10% Flat
      interest_type: 'Flat',
      issue_date: new Date('2026-06-05T00:00:00.000Z'),
      maturity_due_date: new Date('2026-06-25T00:00:00.000Z'),
      status: 'Active'
    }
  });

  await prisma.fund.update({
    where: { id: fund2.id },
    data: { allocated_capital: 500000.0 }
  });

  // Loan 3: Kabir (Overdue with partial payments, Issued June 1, Maturity June 10)
  const loan3 = await prisma.loan.create({
    data: {
      borrower_id: borrower3.id,
      fund_id: fund3.id,
      principal_disbursed: 300000.0, // 3 L
      remaining_principal: 300000.0,
      remaining_interest: 0.0,
      remaining_penalty: 0.0,
      interest_rate_percentage: 15.0, // 15% Simple
      interest_type: 'Simple',
      issue_date: new Date('2026-06-01T00:00:00.000Z'),
      maturity_due_date: new Date('2026-06-10T00:00:00.000Z'),
      status: 'Active'
    }
  });

  await prisma.fund.update({
    where: { id: fund3.id },
    data: { allocated_capital: 300000.0 }
  });

  // 6. Create Penalty Tier Configs
  // Loan 1 Penalty Tiers
  await prisma.penaltyTierConfig.createMany({
    data: [
      { loan_id: loan1.id, start_day_overdue: 1, end_day_overdue: 5, penalty_amount_per_day: 150.0 },
      { loan_id: loan1.id, start_day_overdue: 6, end_day_overdue: 15, penalty_amount_per_day: 300.0 },
      { loan_id: loan1.id, start_day_overdue: 16, end_day_overdue: null, penalty_amount_per_day: 600.0 }
    ]
  });

  // Loan 3 Penalty Tiers
  await prisma.penaltyTierConfig.createMany({
    data: [
      { loan_id: loan3.id, start_day_overdue: 1, end_day_overdue: 7, penalty_amount_per_day: 100.0 },
      { loan_id: loan3.id, start_day_overdue: 8, end_day_overdue: null, penalty_amount_per_day: 250.0 }
    ]
  });

  // 7. Simulate Time Progression & Accruals up to June 17, 2026
  console.log('Simulating timeline: Catching up accruals to 2026-06-17...');
  await catchUpAccruals('2026-06-17T00:00:00.000Z');

  // 8. Process Kabir's Repayment on June 18th (Waterfall Engine simulation)
  console.log('Simulating Kabir Malhotra partial repayment of ₹15,000 on June 18th...');
  // Read current state of Loan 3 on June 18
  const currentLoan3 = await prisma.loan.findUnique({
    where: { id: loan3.id },
    include: { fund: true }
  });

  // Catch up Loan 3 to June 18 first
  await catchUpAccruals('2026-06-18T00:00:00.000Z');

  // Re-fetch to apply payment
  const loan3State = await prisma.loan.findUnique({
    where: { id: loan3.id },
    include: { fund: true }
  });

  const paymentAmount = 15000.0;
  let remainingPayment = paymentAmount;

  // Apply waterfall logic
  const pPaid = Math.min(remainingPayment, loan3State.remaining_penalty);
  remainingPayment = Math.round((remainingPayment - pPaid) * 100) / 100;

  const iPaid = Math.min(remainingPayment, loan3State.remaining_interest);
  remainingPayment = Math.round((remainingPayment - iPaid) * 100) / 100;

  const prPaid = Math.min(remainingPayment, loan3State.remaining_principal);
  remainingPayment = Math.round((remainingPayment - prPaid) * 100) / 100;

  // Update Loan 3
  const updatedLoan3 = await prisma.loan.update({
    where: { id: loan3.id },
    data: {
      remaining_penalty: Math.round((loan3State.remaining_penalty - pPaid) * 100) / 100,
      remaining_interest: Math.round((loan3State.remaining_interest - iPaid) * 100) / 100,
      remaining_principal: Math.round((loan3State.remaining_principal - prPaid) * 100) / 100
    }
  });

  // Update Fund deployed
  await prisma.fund.update({
    where: { id: fund3.id },
    data: {
      allocated_capital: Math.round((loan3State.fund.allocated_capital - prPaid) * 100) / 100
    }
  });

  // Create Transaction Record
  await prisma.recoveryLedgerTransaction.create({
    data: {
      loan_id: loan3.id,
      date: new Date('2026-06-18T14:30:00.000Z'),
      total_amount_received: paymentAmount,
      allocated_to_penalty: pPaid,
      allocated_to_interest: iPaid,
      allocated_to_principal: prPaid
    }
  });

  // 9. Catch up accruals from June 18 to today's real-world calendar date
  const now = new Date();
  const todayLocalMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  console.log(`Catching up accruals to today's real-world date: ${todayLocalMidnight.toISOString()}...`);
  await catchUpAccruals(todayLocalMidnight.toISOString());

  console.log(`Seeding complete! Database ready at system date ${todayLocalMidnight.toDateString()}.`);
}

main()
  .catch((e) => {
    console.error('Error seeding DB:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
