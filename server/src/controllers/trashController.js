import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TRASH_WINDOW_DAYS = 30;

function getDaysRemaining(deletedAt) {
  if (!deletedAt) return TRASH_WINDOW_DAYS;
  const elapsed = Math.floor((Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, TRASH_WINDOW_DAYS - elapsed);
}

/**
 * GET /api/trash
 * Returns all soft-deleted entities (Borrowers, Loans, Transactions) with days-remaining countdown.
 * Filters out entries that have already exceeded the 30-day window (they should have been auto-purged).
 */
export async function getTrashItems(req, res) {
  try {
    const [borrowers, loans, transactions] = await Promise.all([
      prisma.borrower.findMany({ where: { is_deleted: true } }),
      prisma.loan.findMany({
        where: { is_deleted: true },
        include: { borrower: { select: { full_name: true } }, fund: { select: { name: true } } }
      }),
      prisma.recoveryLedgerTransaction.findMany({
        where: { is_deleted: true },
        include: { loan: { include: { borrower: { select: { full_name: true } } } } }
      })
    ]);

    const trashItems = [
      ...borrowers.map(b => ({
        type: 'borrower',
        id: b.id,
        label: b.full_name,
        sub_label: b.email,
        deleted_at: b.deleted_at,
        days_remaining: getDaysRemaining(b.deleted_at)
      })),
      ...loans.map(l => ({
        type: 'loan',
        id: l.id,
        label: `Loan L-${l.id} — ${l.borrower?.full_name || 'Unknown'}`,
        sub_label: `${l.fund?.name || 'Fund'} · ₹${l.principal_disbursed?.toLocaleString('en-IN')}`,
        deleted_at: l.deleted_at,
        days_remaining: getDaysRemaining(l.deleted_at)
      })),
      ...transactions.map(t => ({
        type: 'transaction',
        id: t.id,
        label: `Transaction TX-${t.id} — ${t.loan?.borrower?.full_name || 'Unknown'}`,
        sub_label: `₹${t.total_amount_received?.toLocaleString('en-IN')} on ${t.date ? new Date(t.date).toLocaleDateString('en-IN') : '—'}`,
        deleted_at: t.deleted_at,
        days_remaining: getDaysRemaining(t.deleted_at)
      }))
    ]
    .filter(item => item.days_remaining > 0) // Don't show expired items (pending auto-purge)
    .sort((a, b) => new Date(a.deleted_at) - new Date(b.deleted_at)); // Oldest deleted first

    return res.json(trashItems);
  } catch (error) {
    console.error('Error fetching trash items:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * POST /api/trash/restore/:type/:id
 * Restores a soft-deleted item back to active status.
 */
export async function restoreItem(req, res) {
  const { type, id } = req.params;
  const numId = parseInt(id);

  try {
    if (type === 'borrower') {
      const item = await prisma.borrower.findUnique({ where: { id: numId } });
      if (!item || !item.is_deleted) return res.status(404).json({ error: 'Item not found in Trash.' });
      await prisma.borrower.update({ where: { id: numId }, data: { is_deleted: false, deleted_at: null } });
      return res.json({ success: true, message: `Borrower "${item.full_name}" restored successfully.` });

    } else if (type === 'loan') {
      const item = await prisma.loan.findUnique({ where: { id: numId } });
      if (!item || !item.is_deleted) return res.status(404).json({ error: 'Item not found in Trash.' });
      await prisma.loan.update({ where: { id: numId }, data: { is_deleted: false, deleted_at: null } });
      return res.json({ success: true, message: `Loan L-${numId} restored successfully.` });

    } else if (type === 'transaction') {
      const item = await prisma.recoveryLedgerTransaction.findUnique({ where: { id: numId } });
      if (!item || !item.is_deleted) return res.status(404).json({ error: 'Item not found in Trash.' });
      await prisma.recoveryLedgerTransaction.update({ where: { id: numId }, data: { is_deleted: false, deleted_at: null } });
      return res.json({ success: true, message: `Transaction TX-${numId} restored successfully.` });

    } else {
      return res.status(400).json({ error: 'Invalid entity type. Must be "borrower", "loan", or "transaction".' });
    }
  } catch (error) {
    console.error('Error restoring item:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * DELETE /api/trash/purge-now/:type/:id
 * Immediately and permanently deletes a row from the database (no recovery possible).
 */
export async function purgeItem(req, res) {
  const { type, id } = req.params;
  const numId = parseInt(id);

  try {
    if (type === 'borrower') {
      await prisma.borrower.delete({ where: { id: numId } });
      return res.json({ success: true, message: `Borrower permanently deleted.` });

    } else if (type === 'loan') {
      await prisma.loan.delete({ where: { id: numId } });
      return res.json({ success: true, message: `Loan L-${numId} permanently deleted.` });

    } else if (type === 'transaction') {
      await prisma.recoveryLedgerTransaction.delete({ where: { id: numId } });
      return res.json({ success: true, message: `Transaction TX-${numId} permanently deleted.` });

    } else {
      return res.status(400).json({ error: 'Invalid entity type.' });
    }
  } catch (error) {
    console.error('Error purging item:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Scheduled background function: auto-purges items that have exceeded the 30-day trash window.
 * Called daily by the server scheduler in index.js.
 */
export async function purgeExpiredTrashItems() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - TRASH_WINDOW_DAYS);

  try {
    const [deletedBorrowers, deletedLoans, deletedTransactions] = await Promise.all([
      prisma.borrower.deleteMany({
        where: { is_deleted: true, deleted_at: { lt: cutoffDate } }
      }),
      prisma.loan.deleteMany({
        where: { is_deleted: true, deleted_at: { lt: cutoffDate } }
      }),
      prisma.recoveryLedgerTransaction.deleteMany({
        where: { is_deleted: true, deleted_at: { lt: cutoffDate } }
      })
    ]);

    const total = deletedBorrowers.count + deletedLoans.count + deletedTransactions.count;
    if (total > 0) {
      console.log(`[Trash Purge] Auto-purged ${total} expired entities (>${TRASH_WINDOW_DAYS} days): Borrowers=${deletedBorrowers.count}, Loans=${deletedLoans.count}, Transactions=${deletedTransactions.count}`);
    } else {
      console.log(`[Trash Purge] No expired trash items found.`);
    }
    return { purged: total };
  } catch (error) {
    console.error('[Trash Purge] Error during auto-purge:', error);
    return { purged: 0, error: error.message };
  }
}
