import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

import { getFunds, createFund } from './controllers/fundController.js';
import { getBorrowers, getBorrowerById, createBorrower } from './controllers/borrowerController.js';
import { getLoans, getLoanById, createLoan } from './controllers/loanController.js';
import { getTransactions, createTransaction } from './controllers/transactionController.js';
import { getSystemState, updateSystemDate, getDashboardStats } from './controllers/systemController.js';

dotenv.config();

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
app.get('/api/borrowers', getBorrowers);
app.post('/api/borrowers', createBorrower);
app.get('/api/borrowers/:id', getBorrowerById);

// 3. Loans
app.get('/api/loans', getLoans);
app.post('/api/loans', createLoan);
app.get('/api/loans/:id', getLoanById);

// 4. Recovery Transactions (Waterfall engine)
app.get('/api/transactions', getTransactions);
app.post('/api/transactions', createTransaction);

// 5. System Config & Time Simulation
app.get('/api/system', getSystemState);
app.post('/api/system', updateSystemDate);
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

// Boot listener
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` AB CAPITAL LEDGER ENGINE STARTED`);
  console.log(` Running on port: http://localhost:${PORT}`);
  console.log(`=========================================`);
});
