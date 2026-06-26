import { PrismaClient } from '@prisma/client';
import { catchUpAccruals } from '../services/accrualService.js';

const prisma = new PrismaClient();

/**
 * Gets the current system configuration, including the virtual system date.
 */
export async function getSystemState(req, res) {
  try {
    const now = new Date();
    const realDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    let config = await prisma.systemConfig.findFirst();
    if (!config) {
      config = await prisma.systemConfig.create({
        data: { 
          system_date: realDate,
          is_manual_override: false
        }
      });
    } else if (!config.is_manual_override) {
      // If auto-sync is enabled, compare the stored date to the real-world date
      const configDate = new Date(config.system_date);
      const configDateMidnight = new Date(configDate.getFullYear(), configDate.getMonth(), configDate.getDate(), 0, 0, 0, 0);
      
      if (configDateMidnight < realDate) {
        // Automatically catch up accruals up to the real-world date
        console.log(`[Auto Clock] Advancing virtual date from ${configDateMidnight.toDateString()} to real-world date ${realDate.toDateString()}`);
        await catchUpAccruals(realDate.toISOString());
        config = await prisma.systemConfig.findFirst();
      }
    }
    return res.json(config);
  } catch (error) {
    console.error('Error fetching system state:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Updates the virtual system date and runs catch-up daily accruals for all intervening days.
 * Sets is_manual_override to true.
 */
export async function updateSystemDate(req, res) {
  const { system_date } = req.body;

  if (!system_date) {
    return res.status(400).json({ error: 'System date is required.' });
  }

  try {
    const targetDate = new Date(system_date);
    const targetStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);

    let config = await prisma.systemConfig.findFirst();
    if (!config) {
      config = await prisma.systemConfig.create({
        data: { 
          system_date: targetStart,
          is_manual_override: true
        }
      });
    } else {
      await prisma.systemConfig.update({
        where: { id: config.id },
        data: { is_manual_override: true }
      });
    }

    const logs = await catchUpAccruals(targetStart.toISOString());
    const updatedConfig = await prisma.systemConfig.findFirst();

    return res.json({
      message: 'System date updated successfully. Catch-up accruals completed.',
      system_date: updatedConfig.system_date,
      is_manual_override: updatedConfig.is_manual_override,
      accruals_logged_count: logs.length,
      accruals: logs
    });
  } catch (error) {
    console.error('Error updating system date:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

/**
 * Disables manual override, resets the system date to today's real date, and catches up.
 */
export async function syncSystemDate(req, res) {
  try {
    const now = new Date();
    const realDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    let config = await prisma.systemConfig.findFirst();
    if (!config) {
      config = await prisma.systemConfig.create({
        data: { 
          system_date: realDate,
          is_manual_override: false
        }
      });
      return res.json({
        message: 'System date synchronized successfully.',
        system_date: config.system_date,
        is_manual_override: config.is_manual_override,
        accruals_logged_count: 0,
        accruals: []
      });
    }

    await prisma.systemConfig.update({
      where: { id: config.id },
      data: { is_manual_override: false }
    });

    const configDate = new Date(config.system_date);
    const configDateMidnight = new Date(configDate.getFullYear(), configDate.getMonth(), configDate.getDate(), 0, 0, 0, 0);

    let logs = [];
    if (configDateMidnight < realDate) {
      console.log(`[Auto Clock] Syncing and catching up accruals to real-world date ${realDate.toDateString()}`);
      logs = await catchUpAccruals(realDate.toISOString());
    } else if (configDateMidnight > realDate) {
      // If future override date, reset config system_date to today
      console.log(`[Auto Clock] Syncing back to today's real date (reverting from future virtual date: ${configDateMidnight.toDateString()})`);
      await prisma.systemConfig.update({
        where: { id: config.id },
        data: { system_date: realDate }
      });
    }

    const updatedConfig = await prisma.systemConfig.findFirst();

    return res.json({
      message: 'System date synchronized successfully to real-world calendar.',
      system_date: updatedConfig.system_date,
      is_manual_override: updatedConfig.is_manual_override,
      accruals_logged_count: logs.length,
      accruals: logs
    });
  } catch (error) {
    console.error('Error synchronizing system date:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

/**
 * Computes dashboard stats filtered/grouped for a specific calendar day.
 */
export async function getDashboardStats(req, res) {
  const { date } = req.query;

  try {
    // Determine the query date (fallback to current system date)
    let queryDate;
    if (date) {
      queryDate = new Date(date);
    } else {
      const config = await prisma.systemConfig.findFirst();
      queryDate = config ? new Date(config.system_date) : new Date();
    }

    const startOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 23, 59, 59, 999);

    // 1. Daily Liquidity Flow (Cash Out vs Cash In)
    // Cash Out = sum of principal_disbursed for loans issued on this day
    const loansIssuedToday = await prisma.loan.findMany({
      where: {
        issue_date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      select: {
        principal_disbursed: true
      }
    });
    const cashOut = loansIssuedToday.reduce((acc, l) => acc + l.principal_disbursed, 0.0);

    // Cash In = sum of total_amount_received from recovery transactions on this day
    const transactionsToday = await prisma.recoveryLedgerTransaction.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        loan: {
          include: {
            borrower: true,
            fund: true
          }
        }
      }
    });
    const cashIn = transactionsToday.reduce((acc, t) => acc + t.total_amount_received, 0.0);

    // 2. Inflow Recovery Split (Principal, Interest, Penalty collected today)
    const principalRecovered = transactionsToday.reduce((acc, t) => acc + t.allocated_to_principal, 0.0);
    const interestRecovered = transactionsToday.reduce((acc, t) => acc + t.allocated_to_interest, 0.0);
    const penaltyRecovered = transactionsToday.reduce((acc, t) => acc + t.allocated_to_penalty, 0.0);

    // 3. Daily Asset Yield Growth (Accrued paper gains today: interest + penalty)
    const accrualsToday = await prisma.dailyLedgerAccrual.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        loan: {
          include: {
            borrower: true
          }
        }
      }
    });

    const interestAccruedToday = accrualsToday.reduce((acc, a) => acc + a.interest_accrued, 0.0);
    const penaltyAccruedToday = accrualsToday.reduce((acc, a) => acc + a.penalty_accrued, 0.0);

    // 4. Cumulative overall numbers for summary context
    const allLoans = await prisma.loan.findMany();
    const activeLoans = allLoans.filter(l => l.status !== 'Settled');
    const totalOutstandingPrincipal = activeLoans.reduce((acc, l) => acc + l.remaining_principal, 0.0);
    const totalOutstandingInterest = activeLoans.reduce((acc, l) => acc + l.remaining_interest, 0.0);
    const totalOutstandingPenalty = activeLoans.reduce((acc, l) => acc + l.remaining_penalty, 0.0);
    const totalAum = totalOutstandingPrincipal + totalOutstandingInterest + totalOutstandingPenalty;

    return res.json({
      query_date: queryDate,
      liquidity_flow: {
        cash_out: Math.round(cashOut * 100) / 100,
        cash_in: Math.round(cashIn * 100) / 100,
        net_flow: Math.round((cashIn - cashOut) * 100) / 100
      },
      inflow_split: {
        principal: Math.round(principalRecovered * 100) / 100,
        interest: Math.round(interestRecovered * 100) / 100,
        penalty: Math.round(penaltyRecovered * 100) / 100,
        total: Math.round(cashIn * 100) / 100
      },
      asset_yield: {
        interest_accrued: Math.round(interestAccruedToday * 100) / 100,
        penalty_accrued: Math.round(penaltyAccruedToday * 100) / 100,
        total_accrued: Math.round((interestAccruedToday + penaltyAccruedToday) * 100) / 100
      },
      audit_feed: accrualsToday.map(a => ({
        id: a.id,
        loan_id: a.loan_id,
        date: a.date,
        interest_accrued: a.interest_accrued,
        penalty_accrued: a.penalty_accrued,
        active_tier_label: a.active_tier_label,
        total_outstanding_snapshot: a.total_outstanding_snapshot,
        borrower_name: a.loan.borrower.full_name
      })),
      recent_transactions: transactionsToday.map(t => ({
        id: t.id,
        loan_id: t.loan_id,
        borrower_name: t.loan.borrower.full_name,
        fund_name: t.loan.fund.name,
        total_amount_received: t.total_amount_received,
        allocated_to_principal: t.allocated_to_principal,
        allocated_to_interest: t.allocated_to_interest,
        allocated_to_penalty: t.allocated_to_penalty,
        date: t.date
      })),
      overall_portfolio: {
        outstanding_principal: Math.round(totalOutstandingPrincipal * 100) / 100,
        outstanding_interest: Math.round(totalOutstandingInterest * 100) / 100,
        outstanding_penalty: Math.round(totalOutstandingPenalty * 100) / 100,
        total_aum: Math.round(totalAum * 100) / 100,
        active_count: activeLoans.length
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
