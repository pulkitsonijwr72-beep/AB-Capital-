import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Lists all loans in the platform.
 */
export async function getLoans(req, res) {
  const { status } = req.query;

  try {
    const whereClause = status ? { status } : {};
    const loans = await prisma.loan.findMany({
      where: whereClause,
      include: {
        borrower: true,
        fund: true,
        penalty_tier_configs: true
      },
      orderBy: {
        issue_date: 'desc'
      }
    });

    return res.json(loans);
  } catch (error) {
    console.error('Error fetching loans:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Gets full ledger details for a specific loan.
 */
export async function getLoanById(req, res) {
  const { id } = req.params;

  try {
    const loan = await prisma.loan.findUnique({
      where: { id: parseInt(id) },
      include: {
        borrower: true,
        fund: true,
        penalty_tier_configs: {
          orderBy: { start_day_overdue: 'asc' }
        },
        daily_ledger_accruals: {
          orderBy: { date: 'desc' }
        },
        recovery_transactions: {
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found.' });
    }

    return res.json(loan);
  } catch (error) {
    console.error('Error fetching loan details:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Originates a new loan:
 * - Checks fund capacity
 * - Allocates capital in the source Fund
 * - Creates standard or custom penalty configs
 */
export async function createLoan(req, res) {
  const {
    borrower_id,
    fund_id,
    principal_disbursed,
    interest_rate_percentage,
    interest_type,
    issue_date,
    maturity_due_date,
    penalty_tiers // optional array of configs [{start, end, rate}]
  } = req.body;

  if (!borrower_id || !fund_id || !principal_disbursed || !interest_rate_percentage || !interest_type || !issue_date || !maturity_due_date) {
    return res.status(400).json({ error: 'All primary loan parameters are required.' });
  }

  const principal = parseFloat(principal_disbursed);
  const rate = parseFloat(interest_rate_percentage);

  try {
    const newLoan = await prisma.$transaction(async (tx) => {
      // 1. Validate Borrower exists
      const borrowerObj = await tx.borrower.findUnique({ where: { id: parseInt(borrower_id) } });
      if (!borrowerObj) throw new Error('Selected Borrower does not exist.');

      // 2. Validate Fund exists and has capacity
      const fundObj = await tx.fund.findUnique({ where: { id: parseInt(fund_id) } });
      if (!fundObj) throw new Error('Selected Capital Fund does not exist.');

      const availableCapital = fundObj.total_capital - fundObj.allocated_capital;
      if (principal > availableCapital) {
        throw new Error(`Insufficient liquidity in fund "${fundObj.name}". Remaining capital: ₹${availableCapital.toFixed(2)}.`);
      }

      // 3. Update Fund Allocation
      await tx.fund.update({
        where: { id: fundObj.id },
        data: {
          allocated_capital: Math.round((fundObj.allocated_capital + principal) * 100) / 100
        }
      });

      // 4. Create Loan
      const createdLoan = await tx.loan.create({
        data: {
          borrower_id: parseInt(borrower_id),
          fund_id: parseInt(fund_id),
          principal_disbursed: principal,
          remaining_principal: principal,
          remaining_interest: 0.0,
          remaining_penalty: 0.0,
          interest_rate_percentage: rate,
          interest_type,
          issue_date: new Date(issue_date),
          maturity_due_date: new Date(maturity_due_date),
          status: 'Active'
        }
      });

      // 5. Create Penalty Tiers (Default if not provided)
      const tiersToCreate = penalty_tiers && penalty_tiers.length > 0
        ? penalty_tiers.map(t => ({
            loan_id: createdLoan.id,
            start_day_overdue: parseInt(t.start_day_overdue),
            end_day_overdue: t.end_day_overdue ? parseInt(t.end_day_overdue) : null,
            penalty_amount_per_day: parseFloat(t.penalty_amount_per_day)
          }))
        : [
            { loan_id: createdLoan.id, start_day_overdue: 1, end_day_overdue: 10, penalty_amount_per_day: 100.0 },
            { loan_id: createdLoan.id, start_day_overdue: 11, end_day_overdue: 30, penalty_amount_per_day: 250.0 },
            { loan_id: createdLoan.id, start_day_overdue: 31, end_day_overdue: null, penalty_amount_per_day: 500.0 }
          ];

      await tx.penaltyTierConfig.createMany({
        data: tiersToCreate
      });

      return await tx.loan.findUnique({
        where: { id: createdLoan.id },
        include: { penalty_tier_configs: true }
      });
    });

    return res.status(201).json(newLoan);
  } catch (error) {
    console.error('Loan Origination Error:', error);
    return res.status(500).json({ error: error.message || 'Error originating loan.' });
  }
}
