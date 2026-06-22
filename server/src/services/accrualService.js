import { PrismaClient } from '@prisma/client';
import { differenceInCalendarDays, addDays, format } from 'date-fns';

const prisma = new PrismaClient();

/**
 * Accrues interest and penalty for a single loan on a specific date.
 */
export async function accrueForLoan(loan, targetDate, tx) {
  const targetDateObj = new Date(targetDate);
  
  // Normalize date to prevent timestamp offset issues
  const startOfDay = new Date(targetDateObj.getFullYear(), targetDateObj.getMonth(), targetDateObj.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(targetDateObj.getFullYear(), targetDateObj.getMonth(), targetDateObj.getDate(), 23, 59, 59, 999);

  // Check if we already have an accrual record for this loan on this date
  const existingAccrual = await tx.dailyLedgerAccrual.findFirst({
    where: {
      loan_id: loan.id,
      date: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  });
  
  if (existingAccrual) {
    return null; // Already accrued for this day
  }

  // DPD calculation
  const maturityDateObj = new Date(loan.maturity_due_date);
  const dpd = differenceInCalendarDays(startOfDay, new Date(maturityDateObj.getFullYear(), maturityDateObj.getMonth(), maturityDateObj.getDate(), 0, 0, 0, 0));
  
  // Calculate Interest Accrued today
  let interestAccrued = 0.0;
  if (loan.interest_type === 'Simple') {
    // Interest on remaining principal: remaining_principal * (rate / 100) / 365
    interestAccrued = (loan.remaining_principal * (loan.interest_rate_percentage / 100)) / 365;
  } else if (loan.interest_type === 'Flat') {
    // Flat interest on total principal: principal_disbursed * (rate / 100) / 365
    interestAccrued = (loan.principal_disbursed * (loan.interest_rate_percentage / 100)) / 365;
  }
  
  interestAccrued = Math.round(interestAccrued * 100) / 100;
  
  // Calculate Penalty Accrued today
  let penaltyAccrued = 0.0;
  let activeTierLabel = 'Active';
  
  if (dpd > 0) {
    const configs = loan.penalty_tier_configs || [];
    const activeTier = configs.find(tier => {
      const startMatches = dpd >= tier.start_day_overdue;
      const endMatches = tier.end_day_overdue === null || dpd <= tier.end_day_overdue;
      return startMatches && endMatches;
    });
    
    if (activeTier) {
      penaltyAccrued = activeTier.penalty_amount_per_day;
      activeTierLabel = `Tier-${activeTier.id} Overdue`;
    } else {
      // Fallback to highest tier or default to 0
      penaltyAccrued = configs.length > 0 
        ? configs[configs.length - 1].penalty_amount_per_day 
        : 0.0;
      activeTierLabel = 'Overdue';
    }
  }
  
  // Calculate new balances
  const newRemainingInterest = Math.round((loan.remaining_interest + interestAccrued) * 100) / 100;
  const newRemainingPenalty = Math.round((loan.remaining_penalty + penaltyAccrued) * 100) / 100;
  
  let newStatus = loan.status;
  if (dpd > 0 && loan.status === 'Active') {
    newStatus = 'Overdue';
  }
  
  const totalOutstandingSnapshot = Math.round((loan.remaining_principal + newRemainingInterest + newRemainingPenalty) * 100) / 100;
  
  // Update the loan status and balances
  await tx.loan.update({
    where: { id: loan.id },
    data: {
      remaining_interest: newRemainingInterest,
      remaining_penalty: newRemainingPenalty,
      status: newStatus
    }
  });
  
  // Create daily accrual history entry
  const accrualRecord = await tx.dailyLedgerAccrual.create({
    data: {
      loan_id: loan.id,
      date: startOfDay,
      interest_accrued: interestAccrued,
      penalty_accrued: penaltyAccrued,
      active_tier_label: activeTierLabel,
      total_outstanding_snapshot: totalOutstandingSnapshot
    }
  });
  
  return {
    ...accrualRecord,
    loanCode: `L-${loan.id}`,
    borrowerName: loan.borrower?.full_name || 'Client',
    dpd
  };
}

/**
 * Runs daily accrual routine for all non-settled loans on a given day.
 */
export async function runAccrualsForDay(targetDate) {
  const targetDateObj = new Date(targetDate);
  const startOfDay = new Date(targetDateObj.getFullYear(), targetDateObj.getMonth(), targetDateObj.getDate(), 0, 0, 0, 0);

  return await prisma.$transaction(async (tx) => {
    // Fetch all Active or Overdue loans
    const loans = await tx.loan.findMany({
      where: {
        status: { in: ['Active', 'Overdue'] }
      },
      include: {
        penalty_tier_configs: true,
        borrower: true
      }
    });
    
    const auditLogs = [];
    for (const loan of loans) {
      const log = await accrueForLoan(loan, startOfDay, tx);
      if (log) {
        auditLogs.push(log);
      }
    }
    
    return auditLogs;
  });
}

/**
 * Catch up accruals day-by-day from system_date to the target system_date.
 */
export async function catchUpAccruals(targetDateStr) {
  const targetDate = new Date(targetDateStr);
  const targetStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
  
  let config = await prisma.systemConfig.findFirst();
  if (!config) {
    // Default system seed date
    config = await prisma.systemConfig.create({
      data: {
        system_date: new Date('2026-06-01T00:00:00.000Z')
      }
    });
  }
  
  let currentSystemDate = new Date(config.system_date);
  let currentStart = new Date(currentSystemDate.getFullYear(), currentSystemDate.getMonth(), currentSystemDate.getDate(), 0, 0, 0, 0);
  
  const daysDiff = differenceInCalendarDays(targetStart, currentStart);
  if (daysDiff <= 0) {
    return []; // Already up-to-date or target is in past
  }
  
  const allLogs = [];
  
  // Loop day-by-day to capture historical penalty escalations accurately
  for (let i = 1; i <= daysDiff; i++) {
    const nextDate = addDays(currentStart, i);
    const dayLogs = await runAccrualsForDay(nextDate);
    allLogs.push(...dayLogs);
  }
  
  // Update system config date to the new target date
  await prisma.systemConfig.update({
    where: { id: config.id },
    data: {
      system_date: targetStart
    }
  });
  
  return allLogs;
}
