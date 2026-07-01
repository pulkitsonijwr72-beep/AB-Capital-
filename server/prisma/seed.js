import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Resetting AB Capital database to a clean state...');

  await prisma.recoveryLedgerTransaction.deleteMany({});
  await prisma.dailyLedgerAccrual.deleteMany({});
  await prisma.penaltyTierConfig.deleteMany({});
  await prisma.loan.deleteMany({});
  await prisma.borrower.deleteMany({});
  await prisma.fund.deleteMany({});
  await prisma.systemConfig.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('✅ Database reset complete. No records inserted.');
  console.log('   The application is ready for first use.');
}

main()
  .catch((e) => {
    console.error('❌ Error resetting DB:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
