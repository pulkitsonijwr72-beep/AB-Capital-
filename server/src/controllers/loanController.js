import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Utility: parse edit_log JSON safely
function parseLog(logStr) {
  try { return JSON.parse(logStr || '[]'); } catch { return []; }
}

// Utility: Append an audit entry, cap at 5
function appendAuditEntry(logStr, entry) {
  const logs = parseLog(logStr);
  logs.unshift(entry); // newest first
  return JSON.stringify(logs.slice(0, 5));
}

/**
 * Lists all non-deleted loans in the platform.
 */
export async function getLoans(req, res) {
  const { status } = req.query;

  try {
    const whereClause = { is_deleted: false, ...(status ? { status } : {}) };
    const loans = await prisma.loan.findMany({
      where: whereClause,
      include: {
        borrower: true,
        fund: true,
        penalty_tier_configs: true
      },
      orderBy: { issue_date: 'desc' }
    });

    return res.json(loans.map(l => ({ ...l, edit_log: parseLog(l.edit_log) })));
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
      where: { id: parseInt(id), is_deleted: false },
      include: {
        borrower: true,
        fund: true,
        penalty_tier_configs: { orderBy: { start_day_overdue: 'asc' } },
        daily_ledger_accruals: { orderBy: { date: 'desc' } },
        recovery_transactions: {
          where: { is_deleted: false },
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!loan) return res.status(404).json({ error: 'Loan not found.' });

    return res.json({ ...loan, edit_log: parseLog(loan.edit_log) });
  } catch (error) {
    console.error('Error fetching loan details:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Originates a new loan with interest_period support and input validation.
 */
export async function createLoan(req, res) {
  const {
    borrower_id,
    fund_id,
    principal_disbursed,
    interest_rate_percentage,
    interest_type,
    interest_period,
    issue_date,
    maturity_due_date,
    penalty_tiers
  } = req.body;

  // Validate required fields
  if (!borrower_id || !fund_id || !principal_disbursed || !interest_rate_percentage || !interest_type || !issue_date || !maturity_due_date) {
    return res.status(400).json({ error: 'All primary loan parameters are required.' });
  }

  const validPeriods = ['Daily', 'Weekly', 'Monthly', 'Yearly'];
  const resolvedPeriod = validPeriods.includes(interest_period) ? interest_period : 'Yearly';

  const validTypes = ['Flat', 'Simple'];
  if (!validTypes.includes(interest_type)) {
    return res.status(400).json({ error: 'interest_type must be "Flat" or "Simple".' });
  }

  const principal = parseFloat(principal_disbursed);
  const rate = parseFloat(interest_rate_percentage);

  if (isNaN(principal) || principal <= 0) return res.status(400).json({ error: 'Principal must be a positive number.' });
  if (isNaN(rate) || rate <= 0) return res.status(400).json({ error: 'Interest rate must be a positive number.' });

  try {
    const newLoan = await prisma.$transaction(async (tx) => {
      const borrowerObj = await tx.borrower.findUnique({ where: { id: parseInt(borrower_id), is_deleted: false } });
      if (!borrowerObj) throw new Error('Selected Borrower does not exist.');

      const fundObj = await tx.fund.findUnique({ where: { id: parseInt(fund_id) } });
      if (!fundObj) throw new Error('Selected Capital Fund does not exist.');

      const availableCapital = fundObj.total_capital - fundObj.allocated_capital;
      if (principal > availableCapital) {
        throw new Error(`Insufficient liquidity in fund "${fundObj.name}". Remaining capital: ₹${availableCapital.toFixed(2)}.`);
      }

      await tx.fund.update({
        where: { id: fundObj.id },
        data: { allocated_capital: Math.round((fundObj.allocated_capital + principal) * 100) / 100 }
      });

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
          interest_period: resolvedPeriod,
          issue_date: new Date(issue_date),
          maturity_due_date: new Date(maturity_due_date),
          status: 'Active',
          edit_log: JSON.stringify([{
            action: 'CREATED',
            timestamp: new Date().toISOString(),
            by: 'Admin',
            detail: `Loan originated: ₹${principal.toLocaleString('en-IN')} at ${rate}% p.a. (${resolvedPeriod})`
          }])
        }
      });

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

      await tx.penaltyTierConfig.createMany({ data: tiersToCreate });

      return await tx.loan.findUnique({
        where: { id: createdLoan.id },
        include: { penalty_tier_configs: true }
      });
    });

    return res.status(201).json({ ...newLoan, edit_log: parseLog(newLoan.edit_log) });
  } catch (error) {
    console.error('Loan Origination Error:', error);
    return res.status(500).json({ error: error.message || 'Error originating loan.' });
  }
}

/**
 * Updates a loan's editable fields and logs change (max 5 entries).
 */
export async function updateLoan(req, res) {
  const { id } = req.params;
  const { maturity_due_date, interest_rate_percentage, interest_period, interest_type, status } = req.body;

  try {
    const existing = await prisma.loan.findUnique({ where: { id: parseInt(id), is_deleted: false } });
    if (!existing) return res.status(404).json({ error: 'Loan not found.' });

    const changes = [];
    if (maturity_due_date && maturity_due_date !== existing.maturity_due_date.toISOString().split('T')[0]) {
      changes.push(`Maturity Date: "${new Date(existing.maturity_due_date).toLocaleDateString('en-IN')}" → "${new Date(maturity_due_date).toLocaleDateString('en-IN')}"`);
    }
    if (interest_rate_percentage !== undefined && parseFloat(interest_rate_percentage) !== existing.interest_rate_percentage) {
      changes.push(`Interest Rate: ${existing.interest_rate_percentage}% → ${interest_rate_percentage}%`);
    }
    if (interest_period && interest_period !== existing.interest_period) {
      changes.push(`Interest Period: ${existing.interest_period} → ${interest_period}`);
    }
    if (interest_type && interest_type !== existing.interest_type) {
      changes.push(`Interest Type: ${existing.interest_type} → ${interest_type}`);
    }
    if (status && status !== existing.status) {
      changes.push(`Status: ${existing.status} → ${status}`);
    }

    const newLog = appendAuditEntry(existing.edit_log, {
      action: 'UPDATED',
      timestamp: new Date().toISOString(),
      by: 'Admin',
      detail: changes.length > 0 ? changes.join('; ') : 'Minor update applied.'
    });

    const validPeriods = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

    const updated = await prisma.loan.update({
      where: { id: parseInt(id) },
      data: {
        ...(maturity_due_date && { maturity_due_date: new Date(maturity_due_date) }),
        ...(interest_rate_percentage !== undefined && { interest_rate_percentage: parseFloat(interest_rate_percentage) }),
        ...(interest_period && validPeriods.includes(interest_period) && { interest_period }),
        ...(interest_type && { interest_type }),
        ...(status && { status }),
        edit_log: newLog
      }
    });

    return res.json({ ...updated, edit_log: parseLog(updated.edit_log) });
  } catch (error) {
    console.error('Error updating loan:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Soft-deletes a loan (moves to Trash Bin with 30-day recovery window).
 */
export async function softDeleteLoan(req, res) {
  const { id } = req.params;

  try {
    const existing = await prisma.loan.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: 'Loan not found.' });
    if (existing.is_deleted) return res.status(400).json({ error: 'Loan is already in Trash Bin.' });

    await prisma.loan.update({
      where: { id: parseInt(id) },
      data: { is_deleted: true, deleted_at: new Date() }
    });

    return res.json({ success: true, message: `Loan L-${id} moved to Trash Bin. You have 30 days to restore.` });
  } catch (error) {
    console.error('Error soft-deleting loan:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Replaces all penalty tier configs for a loan.
 * Accepts body: { tiers: [{ start_day_overdue, end_day_overdue, penalty_amount_per_day }] }
 */
export async function updatePenaltyTiers(req, res) {
  const { id } = req.params;
  const { tiers } = req.body;

  if (!Array.isArray(tiers) || tiers.length === 0) {
    return res.status(400).json({ error: 'tiers must be a non-empty array.' });
  }

  // Validate each tier
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    const start = parseInt(t.start_day_overdue);
    const amount = parseFloat(t.penalty_amount_per_day);
    if (isNaN(start) || start < 1) return res.status(400).json({ error: `Tier ${i + 1}: start_day_overdue must be >= 1.` });
    if (isNaN(amount) || amount < 0) return res.status(400).json({ error: `Tier ${i + 1}: penalty_amount_per_day must be >= 0.` });
    if (t.end_day_overdue !== null && t.end_day_overdue !== '' && t.end_day_overdue !== undefined) {
      const end = parseInt(t.end_day_overdue);
      if (isNaN(end) || end < start) return res.status(400).json({ error: `Tier ${i + 1}: end_day_overdue must be >= start_day_overdue.` });
    }
  }

  try {
    const loan = await prisma.loan.findUnique({ where: { id: parseInt(id), is_deleted: false } });
    if (!loan) return res.status(404).json({ error: 'Loan not found.' });

    const newLog = appendAuditEntry(loan.edit_log, {
      action: 'UPDATED',
      timestamp: new Date().toISOString(),
      by: 'Admin',
      detail: `Penalty tiers updated: ${tiers.length} tier(s) configured.`
    });

    await prisma.$transaction(async (tx) => {
      // Delete existing tiers
      await tx.penaltyTierConfig.deleteMany({ where: { loan_id: parseInt(id) } });

      // Insert new tiers
      await tx.penaltyTierConfig.createMany({
        data: tiers.map(t => ({
          loan_id: parseInt(id),
          start_day_overdue: parseInt(t.start_day_overdue),
          end_day_overdue: (t.end_day_overdue !== null && t.end_day_overdue !== '' && t.end_day_overdue !== undefined)
            ? parseInt(t.end_day_overdue)
            : null,
          penalty_amount_per_day: parseFloat(t.penalty_amount_per_day)
        }))
      });

      await tx.loan.update({
        where: { id: parseInt(id) },
        data: { edit_log: newLog }
      });
    });

    const updatedLoan = await prisma.loan.findUnique({
      where: { id: parseInt(id) },
      include: { penalty_tier_configs: { orderBy: { start_day_overdue: 'asc' } } }
    });

    return res.json({
      ...updatedLoan,
      edit_log: parseLog(updatedLoan.edit_log)
    });
  } catch (error) {
    console.error('Error updating penalty tiers:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
