import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import { getFunds, createFund } from './controllers/fundController.js';
import { getBorrowers, getBorrowerById, createBorrower, updateBorrower, softDeleteBorrower, getPaymentStatus } from './controllers/borrowerController.js';
import { getLoans, getLoanById, createLoan, updateLoan, softDeleteLoan } from './controllers/loanController.js';
import { getTransactions, createTransaction, softDeleteTransaction } from './controllers/transactionController.js';
import { getSystemState, updateSystemDate, syncSystemDate, getDashboardStats } from './controllers/systemController.js';
import { getTrashItems, restoreItem, purgeItem, purgeExpiredTrashItems } from './controllers/trashController.js';
import { catchUpAccruals } from './services/accrualService.js';

dotenv.config();

const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend Vite dev server (default port 5173 or other origins)
app.use(cors());

// Configure JSON body parsers
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- API ROUTES ---

// 1. Funds
app.get('/api/funds', getFunds);
app.post('/api/funds', createFund);

// 2. Borrowers
app.get('/api/borrowers/payment-status', getPaymentStatus);
app.get('/api/borrowers', getBorrowers);
app.post('/api/borrowers', createBorrower);
app.get('/api/borrowers/:id', getBorrowerById);
app.put('/api/borrowers/:id', updateBorrower);
app.delete('/api/borrowers/:id', softDeleteBorrower);

// 3. Loans
app.get('/api/loans', getLoans);
app.post('/api/loans', createLoan);
app.get('/api/loans/:id', getLoanById);
app.put('/api/loans/:id', updateLoan);
app.delete('/api/loans/:id', softDeleteLoan);

// 4. Recovery Transactions (Waterfall engine)
app.get('/api/transactions', getTransactions);
app.post('/api/transactions', createTransaction);
app.delete('/api/transactions/:id', softDeleteTransaction);

// 5. Trash Bin Management
app.get('/api/trash', getTrashItems);
app.post('/api/trash/restore/:type/:id', restoreItem);
app.delete('/api/trash/purge-now/:type/:id', purgeItem);

// 6. System Config, Clock & Time Simulation
app.get('/api/clock/state', getSystemState);
app.post('/api/clock/advance', updateSystemDate);
app.post('/api/clock/sync', syncSystemDate);
app.get('/api/dashboard/metrics', getDashboardStats);

// Legacy aliases for compatibility
app.get('/api/system', getSystemState);
app.post('/api/system', updateSystemDate);
app.post('/api/system/sync', syncSystemDate);
app.get('/api/system/dashboard', getDashboardStats);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

function scheduleMidnightAccruals() {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1, 0); // 12:00:01 AM local time
  const msToMidnight = nextMidnight.getTime() - now.getTime();

  console.log(`[Auto Scheduler] Next midnight accrual check scheduled in ${Math.round(msToMidnight / 1000 / 60)} minutes (at ${nextMidnight.toString()})`);

  setTimeout(async () => {
    try {
      // Run daily trash auto-purge
      await purgeExpiredTrashItems();

      const config = await prisma.systemConfig.findFirst();
      if (config && !config.is_manual_override) {
        const today = new Date();
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
        console.log(`[Auto Scheduler] Midnight transition detected! Running auto-accrual catchup to ${todayMidnight.toDateString()}`);
        await catchUpAccruals(todayMidnight.toISOString());
      }
    } catch (e) {
      console.error('[Auto Scheduler] Error during scheduled midnight accrual:', e);
    } finally {
      scheduleMidnightAccruals();
    }
  }, msToMidnight);
}

// Boot listener
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` AB CAPITAL LEDGER ENGINE STARTED`);
  console.log(` Running on port: http://localhost:${PORT}`);
  console.log(`=========================================`);
  
  scheduleMidnightAccruals();
  purgeExpiredTrashItems().catch(err => console.error('[Boot] Error running initial trash purge:', err));
});
