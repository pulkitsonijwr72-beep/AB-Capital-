import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Creates a repayment transaction and applies the waterfall allocation:
 * 1. Penalty first
 * 2. Interest second
 * 3. Principal third
 */
export async function createTransaction(req, res) {
  const { loan_id, amount, date } = req.body;

  if (!loan_id || amount === undefined || amount <= 0) {
    return res.status(400).json({ error: 'Valid loan_id and positive amount are required.' });
  }

  const paymentDate = date ? new Date(date) : new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch the loan and its fund
      const loan = await tx.loan.findUnique({
        where: { id: parseInt(loan_id) },
        include: { fund: true }
      });

      if (!loan) {
        throw new Error(`Loan with ID ${loan_id} not found.`);
      }

      if (loan.status === 'Settled') {
        throw new Error('This loan is already Settled.');
      }

      const totalReceived = parseFloat(amount);
      let remPayment = totalReceived;

      // 2. Waterfall allocation logic
      const allocatedToPenalty = Math.min(remPayment, loan.remaining_penalty);
      remPayment = Math.round((remPayment - allocatedToPenalty) * 100) / 100;

      const allocatedToInterest = Math.min(remPayment, loan.remaining_interest);
      remPayment = Math.round((remPayment - allocatedToInterest) * 100) / 100;

      const allocatedToPrincipal = Math.min(remPayment, loan.remaining_principal);
      remPayment = Math.round((remPayment - allocatedToPrincipal) * 100) / 100;

      // Round allocations
      const finalPenaltyPaid = Math.round(allocatedToPenalty * 100) / 100;
      const finalInterestPaid = Math.round(allocatedToInterest * 100) / 100;
      const finalPrincipalPaid = Math.round(allocatedToPrincipal * 100) / 100;

      // 3. Update loan balances
      const newRemainingPenalty = Math.round((loan.remaining_penalty - finalPenaltyPaid) * 100) / 100;
      const newRemainingInterest = Math.round((loan.remaining_interest - finalInterestPaid) * 100) / 100;
      const newRemainingPrincipal = Math.round((loan.remaining_principal - finalPrincipalPaid) * 100) / 100;

      const shouldSettle = newRemainingPrincipal <= 0;
      const newStatus = shouldSettle ? 'Settled' : loan.status;

      const updatedLoan = await tx.loan.update({
        where: { id: loan.id },
        data: {
          remaining_penalty: newRemainingPenalty,
          remaining_interest: newRemainingInterest,
          remaining_principal: newRemainingPrincipal,
          status: newStatus
        }
      });

      // 4. Update Fund allocation
      // Deployed capital is reduced by the amount of principal recovered
      const newAllocatedCapital = Math.max(0, Math.round((loan.fund.allocated_capital - finalPrincipalPaid) * 100) / 100);
      await tx.fund.update({
        where: { id: loan.fund_id },
        data: {
          allocated_capital: newAllocatedCapital
        }
      });

      // 5. Create Transaction Record
      const transactionRecord = await tx.recoveryLedgerTransaction.create({
        data: {
          loan_id: loan.id,
          date: paymentDate,
          total_amount_received: totalReceived,
          allocated_to_penalty: finalPenaltyPaid,
          allocated_to_interest: finalInterestPaid,
          allocated_to_principal: finalPrincipalPaid
        }
      });

      return {
        transaction: transactionRecord,
        loan: updatedLoan,
        allocations: {
          penalty: finalPenaltyPaid,
          interest: finalInterestPaid,
          principal: finalPrincipalPaid,
          excess: remPayment // Any money paid over outstanding balance
        }
      };
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error('Waterfall Transaction Error:', error);
    return res.status(500).json({ error: error.message || 'Error processing transaction waterfall.' });
  }
}

/**
 * Lists all recovery ledger transactions, optionally filtering by date.
 */
export async function getTransactions(req, res) {
  const { date } = req.query;

  try {
    let whereClause = {};

    if (date) {
      const queryDate = new Date(date);
      const startOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 23, 59, 59, 999);
      whereClause.date = {
        gte: startOfDay,
        lte: endOfDay
      };
    }

    const transactions = await prisma.recoveryLedgerTransaction.findMany({
      where: whereClause,
      include: {
        loan: {
          include: {
            borrower: true,
            fund: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    return res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
