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
 * Lists all ACTIVE (non-deleted) borrowers with aggregated loan metrics.
 */
export async function getBorrowers(req, res) {
  try {
    const borrowers = await prisma.borrower.findMany({
      where: { is_deleted: false },
      include: {
        loans: {
          where: { is_deleted: false },
          select: {
            principal_disbursed: true,
            remaining_principal: true,
            remaining_interest: true,
            remaining_penalty: true,
            status: true
          }
        }
      }
    });

    const summaryBorrowers = borrowers.map(b => {
      const activeLoansCount = b.loans.filter(l => l.status !== 'Settled').length;
      const totalDisbursed = b.loans.reduce((acc, l) => acc + l.principal_disbursed, 0.0);
      const remainingPrincipal = b.loans.reduce((acc, l) => acc + l.remaining_principal, 0.0);
      const remainingInterest = b.loans.reduce((acc, l) => acc + l.remaining_interest, 0.0);
      const remainingPenalty = b.loans.reduce((acc, l) => acc + l.remaining_penalty, 0.0);
      const totalOutstanding = remainingPrincipal + remainingInterest + remainingPenalty;

      return {
        id: b.id,
        full_name: b.full_name,
        phone: b.phone,
        email: b.email,
        internal_structural_notes: b.internal_structural_notes,
        edit_log: parseLog(b.edit_log),
        active_loans_count: activeLoansCount,
        total_disbursed: Math.round(totalDisbursed * 100) / 100,
        remaining_principal: Math.round(remainingPrincipal * 100) / 100,
        remaining_interest: Math.round(remainingInterest * 100) / 100,
        remaining_penalty: Math.round(remainingPenalty * 100) / 100,
        total_outstanding: Math.round(totalOutstanding * 100) / 100
      };
    });

    return res.json(summaryBorrowers);
  } catch (error) {
    console.error('Error fetching borrowers:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Gets detailed profile for a borrower including loans and payment ledgers.
 */
export async function getBorrowerById(req, res) {
  const { id } = req.params;

  try {
    const borrower = await prisma.borrower.findUnique({
      where: { id: parseInt(id), is_deleted: false },
      include: {
        loans: {
          where: { is_deleted: false },
          include: {
            fund: true,
            recovery_transactions: {
              where: { is_deleted: false },
              orderBy: { date: 'desc' }
            },
            daily_ledger_accruals: {
              orderBy: { date: 'desc' }
            }
          },
          orderBy: { issue_date: 'desc' }
        }
      }
    });

    if (!borrower) {
      return res.status(404).json({ error: 'Borrower not found.' });
    }

    // Parse edit_log on borrower and on every nested loan (SQLite stores as JSON string)
    const parsed = {
      ...borrower,
      edit_log: parseLog(borrower.edit_log),
      loans: borrower.loans.map(loan => ({
        ...loan,
        edit_log: parseLog(loan.edit_log)
      }))
    };

    return res.json(parsed);
  } catch (error) {
    console.error('Error fetching borrower profile:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Registers a new borrower with input validation.
 */
export async function createBorrower(req, res) {
  const { full_name, phone, email, internal_structural_notes } = req.body;

  // Input validation
  if (!full_name || typeof full_name !== 'string' || full_name.trim().length === 0) {
    return res.status(400).json({ error: 'Full name is required.' });
  }
  if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  try {
    const newBorrower = await prisma.borrower.create({
      data: {
        full_name: full_name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        internal_structural_notes: internal_structural_notes?.trim() || '',
        edit_log: JSON.stringify([{
          action: 'CREATED',
          timestamp: new Date().toISOString(),
          by: 'Admin',
          detail: `Borrower profile created for ${full_name.trim()}.`
        }])
      }
    });

    return res.status(201).json(newBorrower);
  } catch (error) {
    console.error('Error creating borrower:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Updates a borrower's profile and logs the change (max 5 audit entries).
 */
export async function updateBorrower(req, res) {
  const { id } = req.params;
  const { full_name, phone, email, internal_structural_notes } = req.body;

  try {
    const existing = await prisma.borrower.findUnique({ where: { id: parseInt(id), is_deleted: false } });
    if (!existing) return res.status(404).json({ error: 'Borrower not found.' });

    const changes = [];
    if (full_name && full_name !== existing.full_name) changes.push(`Name: "${existing.full_name}" → "${full_name}"`);
    if (phone && phone !== existing.phone) changes.push(`Phone: "${existing.phone}" → "${phone}"`);
    if (email && email !== existing.email) changes.push(`Email: "${existing.email}" → "${email}"`);
    if (internal_structural_notes !== undefined && internal_structural_notes !== existing.internal_structural_notes) changes.push('Structural notes updated.');

    const newLog = appendAuditEntry(existing.edit_log, {
      action: 'UPDATED',
      timestamp: new Date().toISOString(),
      by: 'Admin',
      detail: changes.length > 0 ? changes.join('; ') : 'No field changes detected.'
    });

    const updated = await prisma.borrower.update({
      where: { id: parseInt(id) },
      data: {
        ...(full_name && { full_name: full_name.trim() }),
        ...(phone && { phone: phone.trim() }),
        ...(email && { email: email.trim().toLowerCase() }),
        ...(internal_structural_notes !== undefined && { internal_structural_notes: internal_structural_notes.trim() }),
        edit_log: newLog
      }
    });

    return res.json({ ...updated, edit_log: parseLog(updated.edit_log) });
  } catch (error) {
    console.error('Error updating borrower:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Soft-deletes a borrower (moves to Trash Bin with 30-day recovery window).
 */
export async function softDeleteBorrower(req, res) {
  const { id } = req.params;

  try {
    const existing = await prisma.borrower.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: 'Borrower not found.' });
    if (existing.is_deleted) return res.status(400).json({ error: 'Borrower is already in Trash Bin.' });

    await prisma.borrower.update({
      where: { id: parseInt(id) },
      data: { is_deleted: true, deleted_at: new Date() }
    });

    return res.json({ success: true, message: `Borrower "${existing.full_name}" moved to Trash Bin. You have 30 days to restore.` });
  } catch (error) {
    console.error('Error soft-deleting borrower:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * GET /api/borrowers/payment-status
 * Returns all active borrowers with their repayment health, sorted by nearest deadline (ASC).
 */
export async function getPaymentStatus(req, res) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const loans = await prisma.loan.findMany({
      where: {
        is_deleted: false,
        status: { in: ['Active', 'Overdue'] }
      },
      include: {
        borrower: { select: { id: true, full_name: true, phone: true, email: true } },
        fund: { select: { name: true } }
      },
      orderBy: { maturity_due_date: 'asc' } // Ascending — nearest deadline first
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

      return {
        loan_id: loan.id,
        borrower_id: loan.borrower.id,
        borrower_name: loan.borrower.full_name,
        borrower_phone: loan.borrower.phone,
        fund_name: loan.fund.name,
        principal_disbursed: loan.principal_disbursed,
        remaining_principal: loan.remaining_principal,
        remaining_interest: loan.remaining_interest,
        remaining_penalty: loan.remaining_penalty,
        total_outstanding: Math.round(totalOutstanding * 100) / 100,
        interest_rate: loan.interest_rate_percentage,
        interest_period: loan.interest_period,
        maturity_due_date: loan.maturity_due_date,
        days_until_due: daysUntilDue,
        dpd,
        status: loan.status,
        health_status: healthStatus
      };
    });

    return res.json(statusRows);
  } catch (error) {
    console.error('Error fetching payment status:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
