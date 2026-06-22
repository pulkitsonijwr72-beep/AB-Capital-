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
      // Calculate cumulative revenue (interest collected + penalty collected)
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
