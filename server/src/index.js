import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import { getFunds, createFund, getFundPaymentStatus } from './controllers/fundController.js';
import { getBorrowers, getBorrowerById, createBorrower, updateBorrower, softDeleteBorrower, getPaymentStatus } from './controllers/borrowerController.js';
import { getLoans, getLoanById, createLoan, updateLoan, softDeleteLoan, updatePenaltyTiers } from './controllers/loanController.js';
import { getTransactions, createTransaction, softDeleteTransaction } from './controllers/transactionController.js';
import { getSystemState, updateSystemDate, syncSystemDate, getDashboardStats } from './controllers/systemController.js';
import { getTrashItems, restoreItem, purgeItem, purgeExpiredTrashItems } from './controllers/trashController.js';
import { register, login, logout, refresh, forgotPassword, resetPassword, getMe } from './controllers/authController.js';
import { requireAuth } from './middleware/requireAuth.js';
import { catchUpAccruals } from './services/accrualService.js';

dotenv.config();

const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend Vite dev server (default port 5173 or other origins)
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));

// Configure JSON body parsers
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiter for auth routes (max 20 requests per 15 min per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});

// --- API ROUTES ---

// 0. Auth (public)
app.post('/api/auth/register', authLimiter, register);
app.post('/api/auth/login', authLimiter, login);
app.post('/api/auth/logout', logout);
app.post('/api/auth/refresh', refresh);
app.post('/api/auth/forgot-password', authLimiter, forgotPassword);
app.post('/api/auth/reset-password', authLimiter, resetPassword);
app.get('/api/auth/me', requireAuth, getMe);

// --- API ROUTES (all protected) ---

// 1. Funds
app.get('/api/funds', requireAuth, getFunds);
app.post('/api/funds', requireAuth, createFund);
app.get('/api/funds/:id/payment-status', requireAuth, getFundPaymentStatus);

// 2. Borrowers
app.get('/api/borrowers/payment-status', requireAuth, getPaymentStatus);
app.get('/api/borrowers', requireAuth, getBorrowers);
app.post('/api/borrowers', requireAuth, createBorrower);
app.get('/api/borrowers/:id', requireAuth, getBorrowerById);
app.put('/api/borrowers/:id', requireAuth, updateBorrower);
app.delete('/api/borrowers/:id', requireAuth, softDeleteBorrower);

// 3. Loans
app.get('/api/loans', requireAuth, getLoans);
app.post('/api/loans', requireAuth, createLoan);
app.get('/api/loans/:id', requireAuth, getLoanById);
app.put('/api/loans/:id', requireAuth, updateLoan);
app.delete('/api/loans/:id', requireAuth, softDeleteLoan);
app.put('/api/loans/:id/penalty-tiers', requireAuth, updatePenaltyTiers);

// 4. Recovery Transactions (Waterfall engine)
app.get('/api/transactions', requireAuth, getTransactions);
app.post('/api/transactions', requireAuth, createTransaction);
app.delete('/api/transactions/:id', requireAuth, softDeleteTransaction);

// 5. Trash Bin Management
app.get('/api/trash', requireAuth, getTrashItems);
app.post('/api/trash/restore/:type/:id', requireAuth, restoreItem);
app.delete('/api/trash/purge-now/:type/:id', requireAuth, purgeItem);

// 6. System Config, Clock & Time Simulation
app.get('/api/clock/state', requireAuth, getSystemState);
app.post('/api/clock/advance', requireAuth, updateSystemDate);
app.post('/api/clock/sync', requireAuth, syncSystemDate);
app.get('/api/dashboard/metrics', requireAuth, getDashboardStats);

// Legacy aliases for compatibility
app.get('/api/system', requireAuth, getSystemState);
app.post('/api/system', requireAuth, updateSystemDate);
app.post('/api/system/sync', requireAuth, syncSystemDate);
app.get('/api/system/dashboard', requireAuth, getDashboardStats);

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
