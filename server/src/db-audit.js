import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const [borrowers, loans, funds, transactions, accruals, configs] = await Promise.all([
    p.borrower.count(),
    p.loan.count(),
    p.fund.count(),
    p.recoveryLedgerTransaction.count(),
    p.dailyLedgerAccrual.count(),
    p.systemConfig.count()
  ]);
  console.log(JSON.stringify({ borrowers, loans, funds, transactions, accruals, configs }, null, 2));
  
  // List all borrowers
  const allBorrowers = await p.borrower.findMany({ include: { loans: { include: { fund: true } } } });
  console.log('\n=== BORROWERS ===');
  allBorrowers.forEach(b => {
    console.log(`  [${b.id}] ${b.full_name} | deleted=${b.is_deleted} | loans=${b.loans.length}`);
    b.loans.forEach(l => {
      console.log(`    -> L-${l.id} | ${l.status} | period=${l.interest_period} | del=${l.is_deleted}`);
    });
  });

  const allFunds = await p.fund.findMany();
  console.log('\n=== FUNDS ===');
  allFunds.forEach(f => console.log(`  [${f.id}] ${f.name} | total=${f.total_capital} | alloc=${f.allocated_capital}`));
  
  await p.$disconnect();
}

main().catch(console.error);
