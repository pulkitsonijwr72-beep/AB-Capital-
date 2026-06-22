import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Lists all borrowers with aggregated metrics (number of active loans and total balances).
 */
export async function getBorrowers(req, res) {
  try {
    const borrowers = await prisma.borrower.findMany({
      include: {
        loans: {
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

    // Compute aggregated summaries
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
 * Gets detailed profile details for a specific borrower, including all loan files and payment ledgers.
 */
export async function getBorrowerById(req, res) {
  const { id } = req.params;

  try {
    const borrower = await prisma.borrower.findUnique({
      where: { id: parseInt(id) },
      include: {
        loans: {
          include: {
            fund: true,
            recovery_transactions: {
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

    return res.json(borrower);
  } catch (error) {
    console.error('Error fetching borrower profile:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Registers a new borrower.
 */
export async function createBorrower(req, res) {
  const { full_name, phone, email, internal_structural_notes } = req.body;

  if (!full_name || !phone || !email) {
    return res.status(400).json({ error: 'Full name, phone, and email are required.' });
  }

  try {
    const newBorrower = await prisma.borrower.create({
      data: {
        full_name,
        phone,
        email,
        internal_structural_notes: internal_structural_notes || ''
      }
    });

    return res.status(201).json(newBorrower);
  } catch (error) {
    console.error('Error creating borrower:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
