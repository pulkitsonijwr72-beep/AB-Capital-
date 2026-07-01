import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Lists all originating funds with performance metrics:
 * - Deployed capital
 * - Deployment rate (%)
 * - Cumulative revenue generated (interest + penalties recovered)
 */
export async function getFunds(req, res) {
  try {
    const funds = await prisma.fund.findMany({
      include: {
        loans: {
          include: {
            recovery_transactions: {
              select: {
                allocated_to_interest: true,
                allocated_to_penalty: true
              }
            }
          }
        }
      }
    });

    const summaryFunds = funds.map(f => {
      let cumulativeRevenue = 0.0;
      f.loans.forEach(l => {
        l.recovery_transactions.forEach(t => {
          cumulativeRevenue += t.allocated_to_interest + t.allocated_to_penalty;
        });
      });

      const deploymentRate = f.total_capital > 0
        ? (f.allocated_capital / f.total_capital) * 100
        : 0.0;

      return {
        id: f.id,
        name: f.name,
        total_capital: Math.round(f.total_capital * 100) / 100,
        allocated_capital: Math.round(f.allocated_capital * 100) / 100,
        deployment_rate: Math.round(deploymentRate * 100) / 100,
        cumulative_revenue: Math.round(cumulativeRevenue * 100) / 100
      };
    });

    return res.json(summaryFunds);
  } catch (error) {
    console.error('Error fetching funds:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Creates a new capital fund.
 */
export async function createFund(req, res) {
  const { name, total_capital } = req.body;

  if (!name || total_capital === undefined || total_capital <= 0) {
    return res.status(400).json({ error: 'Fund name and positive total capital capacity are required.' });
  }

  try {
    const newFund = await prisma.fund.create({
      data: {
        name,
        total_capital: parseFloat(total_capital),
        allocated_capital: 0.0
      }
    });

    return res.status(201).json(newFund);
  } catch (error) {
    console.error('Error creating fund:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * GET /api/funds/:id/payment-status
 *
 * Returns the running payment status for all Active/Overdue loans
 * that belong specifically to this fund.
 * Sorted by maturity_due_date ASC (nearest deadline first) —
 * mirrors the exact priority rules of the global /api/borrowers/payment-status endpoint.
 */
export async function getFundPaymentStatus(req, res) {
  const fundId = parseInt(req.params.id);
  if (isNaN(fundId)) return res.status(400).json({ error: 'Invalid fund ID.' });

  try {
    const fund = await prisma.fund.findUnique({ where: { id: fundId } });
    if (!fund) return res.status(404).json({ error: 'Fund not found.' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const loans = await prisma.loan.findMany({
      where: {
        fund_id: fundId,
        is_deleted: false,
        status: { in: ['Active', 'Overdue'] }
      },
      include: {
        borrower: { select: { id: true, full_name: true, phone: true, email: true } },
        fund: { select: { name: true } }
      },
      orderBy: { maturity_due_date: 'asc' } // Priority: nearest deadline first
    });

    const statusRows = loans.map(loan => {
      const maturityDate = new Date(loan.maturity_due_date);
      maturityDate.setHours(0, 0, 0, 0);

      const dpd = Math.max(0, Math.floor((today - maturityDate) / (1000 * 60 * 60 * 24)));
      const daysUntilDue = Math.floor((maturityDate - today) / (1000 * 60 * 60 * 24));
      const totalOutstanding = loan.remaining_principal + loan.remaining_interest + loan.remaining_penalty;

      let healthStatus = 'Healthy';
      if (dpd > 0) healthStatus = 'Overdue';
      else if (daysUntilDue <= 3) healthStatus = 'Critical';
      else if (daysUntilDue <= 7) healthStatus = 'Warning';

      // Countdown badge label
      let countdownLabel = '';
      if (dpd > 0) {
        countdownLabel = `${dpd} DPD`;
      } else if (daysUntilDue === 0) {
        countdownLabel = 'Due Today';
      } else if (daysUntilDue === 1) {
        countdownLabel = 'Due Tomorrow';
      } else {
        countdownLabel = `${daysUntilDue} Days Left`;
      }

      return {
        loan_id: loan.id,
        borrower_id: loan.borrower.id,
        borrower_name: loan.borrower.full_name,
        borrower_phone: loan.borrower.phone,
        fund_name: loan.fund.name,
        principal_disbursed: loan.principal_disbursed,
        remaining_principal: Math.round(loan.remaining_principal * 100) / 100,
        remaining_interest: Math.round(loan.remaining_interest * 100) / 100,
        remaining_penalty: Math.round(loan.remaining_penalty * 100) / 100,
        total_outstanding: Math.round(totalOutstanding * 100) / 100,
        interest_rate: loan.interest_rate_percentage,
        interest_period: loan.interest_period,
        interest_type: loan.interest_type,
        maturity_due_date: loan.maturity_due_date,
        issue_date: loan.issue_date,
        days_until_due: daysUntilDue,
        dpd,
        status: loan.status,
        health_status: healthStatus,
        countdown_label: countdownLabel
      };
    });

    return res.json({
      fund: {
        id: fund.id,
        name: fund.name,
        total_capital: fund.total_capital,
        allocated_capital: fund.allocated_capital
      },
      rows: statusRows
    });
  } catch (error) {
    console.error('Error fetching fund payment status:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
