import React, { useState, useEffect } from 'react';
import { 
  Search, 
  UserPlus, 
  DollarSign, 
  Calendar, 
  Info, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  ArrowRight,
  TrendingUp,
  Percent,
  CheckCircle,
  Plus
} from 'lucide-react';
import { API_BASE } from '../config';

export default function BorrowerRegistry({ systemState, onActionTriggered }) {
  const [borrowers, setBorrowers] = useState([]);
  const [funds, setFunds] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [dossier, setDossier] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form states
  const [showAddBorrower, setShowAddBorrower] = useState(false);
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  // New Borrower Form
  const [newBorrower, setNewBorrower] = useState({
    full_name: '',
    phone: '',
    email: '',
    internal_structural_notes: ''
  });

  // New Loan Form
  const [newLoan, setNewLoan] = useState({
    fund_id: '',
    principal_disbursed: '',
    interest_rate_percentage: '',
    interest_type: 'Simple',
    issue_date: '',
    maturity_due_date: ''
  });

  // Payment Form
  const [payment, setPayment] = useState({
    loan_id: '',
    amount: '',
    date: ''
  });

  // Feedback Messages
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchBorrowers();
    fetchFunds();
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchDossier(selectedId);
    }
  }, [selectedId]);

  // Set default payment date to system date
  useEffect(() => {
    if (systemState?.system_date) {
      const formattedDate = new Date(systemState.system_date).toISOString().split('T')[0];
      setPayment(p => ({ ...p, date: formattedDate }));
      setNewLoan(l => ({ 
        ...l, 
        issue_date: formattedDate,
        maturity_due_date: new Date(new Date(systemState.system_date).setDate(new Date(systemState.system_date).getDate() + 30)).toISOString().split('T')[0] // default 30 days
      }));
    }
  }, [systemState]);

  const fetchBorrowers = async () => {
    try {
      const res = await fetch(`${API_BASE}/borrowers`);
      const data = await res.json();
      setBorrowers(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFunds = async () => {
    try {
      const res = await fetch(`${API_BASE}/funds`);
      const data = await res.json();
      setFunds(data);
      if (data.length > 0) {
        setNewLoan(l => ({ ...l, fund_id: data[0].id.toString() }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDossier = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/borrowers/${id}`);
      const data = await res.json();
      setDossier(data);
      // Auto select the first active loan if any
      const activeLoan = data.loans.find(l => l.status !== 'Settled');
      if (activeLoan) {
        setPayment(p => ({ ...p, loan_id: activeLoan.id.toString() }));
      } else if (data.loans.length > 0) {
        setPayment(p => ({ ...p, loan_id: data.loans[0].id.toString() }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Currency Formatter
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleAddBorrower = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/borrowers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBorrower)
      });
      const data = await res.json();
      if (res.ok) {
        setNewBorrower({ full_name: '', phone: '', email: '', internal_structural_notes: '' });
        setShowAddBorrower(false);
        fetchBorrowers();
        setSelectedId(data.id);
        triggerMessage('Borrower registered successfully!', 'success');
      } else {
        triggerMessage(data.error || 'Failed to register borrower.', 'error');
      }
    } catch (e) {
      triggerMessage('Server connection error.', 'error');
    }
  };

  const handleAddLoan = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newLoan,
          borrower_id: selectedId,
          principal_disbursed: parseFloat(newLoan.principal_disbursed),
          interest_rate_percentage: parseFloat(newLoan.interest_rate_percentage)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddLoan(false);
        fetchDossier(selectedId);
        fetchBorrowers();
        fetchFunds();
        onActionTriggered(); // trigger parent update
        triggerMessage('Loan contract originated successfully!', 'success');
      } else {
        triggerMessage(data.error || 'Failed to originate loan.', 'error');
      }
    } catch (e) {
      triggerMessage('Server connection error.', 'error');
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payment,
          amount: parseFloat(payment.amount)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowPaymentForm(false);
        setPayment(p => ({ ...p, amount: '' }));
        fetchDossier(selectedId);
        fetchBorrowers();
        onActionTriggered();
        triggerMessage(`Waterfall payment processed! Penalty: ${formatCurrency(data.allocations.penalty)}, Interest: ${formatCurrency(data.allocations.interest)}, Principal: ${formatCurrency(data.allocations.principal)}`, 'success');
      } else {
        triggerMessage(data.error || 'Failed to process waterfall.', 'error');
      }
    } catch (e) {
      triggerMessage('Server connection error.', 'error');
    }
  };

  const triggerMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 6000);
  };

  const filteredBorrowers = borrowers.filter(b => 
    b.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1/3 COLUMN: Searchable Directory */}
      <div className="bg-brand-card border border-brand-border rounded-xl shadow-xl p-4 flex flex-col h-[calc(100vh-14rem)]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-brand-text font-bold text-sm uppercase tracking-wider">Client Directory</h3>
          <button 
            onClick={() => setShowAddBorrower(!showAddBorrower)}
            className="flex items-center gap-1 text-[11px] font-bold bg-brand-accent/20 hover:bg-brand-accent/40 text-brand-text border border-brand-accent/40 px-2 py-1 rounded transition-colors"
          >
            <UserPlus className="h-3 w-3" /> Register
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-brand-muted" />
          <input 
            type="text" 
            placeholder="Search clients..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-brand-dark/50 border border-brand-border/60 rounded-lg pl-9 pr-4 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-accent"
          />
        </div>

        {/* Add Borrower Form (Collapsible) */}
        {showAddBorrower && (
          <form onSubmit={handleAddBorrower} className="bg-brand-dark/40 border border-brand-border/60 p-3 rounded-lg mb-4 space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider border-b border-brand-border/40 pb-1.5 text-brand-accent">Register New Client</h4>
            <div>
              <label className="text-[10px] text-brand-muted uppercase block">Full Name</label>
              <input 
                type="text" 
                required
                value={newBorrower.full_name}
                onChange={e => setNewBorrower({...newBorrower, full_name: e.target.value})}
                className="w-full bg-brand-card border border-brand-border text-xs px-2.5 py-1.5 rounded text-brand-text focus:outline-none focus:border-brand-accent mt-1" 
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-brand-muted uppercase block">Phone</label>
                <input 
                  type="text" 
                  required
                  value={newBorrower.phone}
                  onChange={e => setNewBorrower({...newBorrower, phone: e.target.value})}
                  className="w-full bg-brand-card border border-brand-border text-xs px-2.5 py-1.5 rounded text-brand-text focus:outline-none focus:border-brand-accent mt-1" 
                />
              </div>
              <div>
                <label className="text-[10px] text-brand-muted uppercase block">Email</label>
                <input 
                  type="email" 
                  required
                  value={newBorrower.email}
                  onChange={e => setNewBorrower({...newBorrower, email: e.target.value})}
                  className="w-full bg-brand-card border border-brand-border text-xs px-2.5 py-1.5 rounded text-brand-text focus:outline-none focus:border-brand-accent mt-1" 
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-brand-muted uppercase block">Structural Notes</label>
              <textarea 
                value={newBorrower.internal_structural_notes}
                onChange={e => setNewBorrower({...newBorrower, internal_structural_notes: e.target.value})}
                className="w-full bg-brand-card border border-brand-border text-xs px-2.5 py-1.5 rounded text-brand-text h-12 focus:outline-none focus:border-brand-accent mt-1"
              ></textarea>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 text-[11px] font-bold bg-brand-emerald/20 hover:bg-brand-emerald/40 text-brand-text border border-brand-emerald/40 py-1.5 rounded">
                Confirm Registry
              </button>
              <button type="button" onClick={() => setShowAddBorrower(false)} className="px-3 text-[11px] bg-brand-border/40 hover:bg-brand-border/60 rounded text-brand-muted">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Directory List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredBorrowers.length > 0 ? (
            filteredBorrowers.map((b) => (
              <div 
                key={b.id} 
                onClick={() => setSelectedId(b.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedId === b.id ? 'bg-brand-slate border-brand-accent shadow-md' : 'bg-brand-dark/20 border-brand-border/40 hover:bg-brand-slate/40'}`}
              >
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-semibold text-brand-text">{b.full_name}</h4>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-mono ${b.active_loans_count > 0 ? 'bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/20' : 'bg-brand-emerald/15 text-brand-emerald border border-brand-emerald/20'}`}>
                    {b.active_loans_count} Active
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2.5 text-[10px] text-brand-muted font-mono">
                  <span>Out: {formatCurrency(b.total_outstanding)}</span>
                  <span>Disbursed: {formatCurrency(b.total_disbursed)}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-brand-muted italic text-center py-10">No borrowers found</div>
          )}
        </div>
      </div>

      {/* 2/3 COLUMN: Recipient Dossier & inner ledger details */}
      <div className="lg:col-span-2 space-y-6">
        {/* Alerts Block */}
        {message.text && (
          <div className={`p-4 rounded-lg border text-xs font-medium flex items-center justify-between shadow-md ${message.type === 'success' ? 'bg-brand-emerald/10 border-brand-emerald/30 text-brand-emerald' : 'bg-brand-crimson/10 border-brand-crimson/30 text-brand-crimson'}`}>
            <span>{message.text}</span>
            <button onClick={() => setMessage({ text: '', type: '' })} className="font-bold underline text-[10px] uppercase">Dismiss</button>
          </div>
        )}

        {dossier ? (
          <div className="bg-brand-card border border-brand-border rounded-xl shadow-xl p-6 space-y-6 h-[calc(100vh-14rem)] overflow-y-auto">
            {/* Dossier Header Info */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-brand-border/60 pb-5 gap-4">
              <div>
                <span className="text-[10px] bg-brand-accent/25 text-brand-text border border-brand-accent/40 px-2 py-0.5 rounded font-bold font-mono">CLIENT DOSSIER #C-{dossier.id}</span>
                <h2 className="text-xl font-extrabold text-brand-text mt-1.5">{dossier.full_name}</h2>
                <p className="text-xs text-brand-muted mt-1">{dossier.email} &bull; {dossier.phone}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowPaymentForm(!showPaymentForm)}
                  className="flex items-center gap-1.5 text-xs font-bold bg-brand-emerald/20 hover:bg-brand-emerald/40 text-brand-emerald border border-brand-emerald/40 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <DollarSign className="h-4 w-4" /> Collect Recovery
                </button>
                <button 
                  onClick={() => setShowAddLoan(!showAddLoan)}
                  className="flex items-center gap-1.5 text-xs font-bold bg-brand-accent/20 hover:bg-brand-accent/40 text-brand-text border border-brand-accent/40 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" /> Originate Loan
                </button>
              </div>
            </div>

            {/* Collapsible Forms */}
            {showPaymentForm && (
              <form onSubmit={handlePayment} className="bg-brand-dark/40 border border-brand-emerald/30 p-4 rounded-lg space-y-4">
                <div className="flex justify-between items-center border-b border-brand-border/40 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-emerald">Post Repayment Transaction</h4>
                  <span className="text-[10px] text-brand-muted">Waterfall Engine Priority</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-brand-muted uppercase block">Select Loan Account</label>
                    <select 
                      required
                      value={payment.loan_id}
                      onChange={e => setPayment({...payment, loan_id: e.target.value})}
                      className="w-full bg-brand-card border border-brand-border text-xs px-2.5 py-1.5 rounded text-brand-text focus:outline-none focus:border-brand-accent mt-1"
                    >
                      {dossier.loans.filter(l => l.status !== 'Settled').map(l => (
                        <option key={l.id} value={l.id}>L-{l.id} ({l.fund.name})</option>
                      ))}
                      {dossier.loans.filter(l => l.status === 'Settled').map(l => (
                        <option key={l.id} value={l.id} disabled>L-{l.id} (Settled)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-brand-muted uppercase block">Payment Amount (₹)</label>
                    <input 
                      type="number" 
                      required
                      min="1"
                      step="any"
                      placeholder="e.g. 50000"
                      value={payment.amount}
                      onChange={e => setPayment({...payment, amount: e.target.value})}
                      className="w-full bg-brand-card border border-brand-border text-xs px-2.5 py-1.5 rounded text-brand-text focus:outline-none focus:border-brand-accent mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-brand-muted uppercase block">Payment Date</label>
                    <input 
                      type="date" 
                      required
                      value={payment.date}
                      onChange={e => setPayment({...payment, date: e.target.value})}
                      className="w-full bg-brand-card border border-brand-border text-xs px-2.5 py-1.5 rounded text-brand-text focus:outline-none focus:border-brand-accent mt-1"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="submit" className="text-xs font-bold bg-brand-emerald hover:bg-brand-emerald/80 text-brand-dark px-4 py-2 rounded-lg transition-colors">
                    Trigger Waterfall Recovery
                  </button>
                  <button type="button" onClick={() => setShowPaymentForm(false)} className="text-xs bg-brand-border/40 hover:bg-brand-border/60 text-brand-muted px-4 py-2 rounded-lg">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {showAddLoan && (
              <form onSubmit={handleAddLoan} className="bg-brand-dark/40 border border-brand-accent/30 p-4 rounded-lg space-y-4">
                <div className="flex justify-between items-center border-b border-brand-border/40 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-accent">Originate New Capital Loan</h4>
                  <span className="text-[10px] text-brand-muted">Checks Fund Liquidity</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-brand-muted uppercase block">Capital Source Pool</label>
                    <select 
                      required
                      value={newLoan.fund_id}
                      onChange={e => setNewLoan({...newLoan, fund_id: e.target.value})}
                      className="w-full bg-brand-card border border-brand-border text-xs px-2.5 py-1.5 rounded text-brand-text focus:outline-none focus:border-brand-accent mt-1"
                    >
                      {funds.map(f => (
                        <option key={f.id} value={f.id}>{f.name} (Avail: {formatCurrency(f.total_capital - f.allocated_capital)})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-brand-muted uppercase block">Principal Amount (₹)</label>
                    <input 
                      type="number" 
                      required
                      min="1"
                      placeholder="Disbursed Principal"
                      value={newLoan.principal_disbursed}
                      onChange={e => setNewLoan({...newLoan, principal_disbursed: e.target.value})}
                      className="w-full bg-brand-card border border-brand-border text-xs px-2.5 py-1.5 rounded text-brand-text focus:outline-none focus:border-brand-accent mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-brand-muted uppercase block">Interest Rate (% p.a.)</label>
                    <input 
                      type="number" 
                      required
                      min="0.1"
                      step="any"
                      placeholder="e.g. 12"
                      value={newLoan.interest_rate_percentage}
                      onChange={e => setNewLoan({...newLoan, interest_rate_percentage: e.target.value})}
                      className="w-full bg-brand-card border border-brand-border text-xs px-2.5 py-1.5 rounded text-brand-text focus:outline-none focus:border-brand-accent mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-brand-muted uppercase block">Interest Structure</label>
                    <select 
                      value={newLoan.interest_type}
                      onChange={e => setNewLoan({...newLoan, interest_type: e.target.value})}
                      className="w-full bg-brand-card border border-brand-border text-xs px-2.5 py-1.5 rounded text-brand-text focus:outline-none focus:border-brand-accent mt-1"
                    >
                      <option value="Simple">Simple Daily Accrual</option>
                      <option value="Flat">Flat Daily Accrual</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-brand-muted uppercase block">Issue Date</label>
                    <input 
                      type="date" 
                      required
                      value={newLoan.issue_date}
                      onChange={e => setNewLoan({...newLoan, issue_date: e.target.value})}
                      className="w-full bg-brand-card border border-brand-border text-xs px-2.5 py-1.5 rounded text-brand-text focus:outline-none focus:border-brand-accent mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-brand-muted uppercase block">Maturity Date</label>
                    <input 
                      type="date" 
                      required
                      value={newLoan.maturity_due_date}
                      onChange={e => setNewLoan({...newLoan, maturity_due_date: e.target.value})}
                      className="w-full bg-brand-card border border-brand-border text-xs px-2.5 py-1.5 rounded text-brand-text focus:outline-none focus:border-brand-accent mt-1"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="submit" className="text-xs font-bold bg-brand-accent hover:bg-brand-accent/80 text-brand-text px-4 py-2 rounded-lg transition-colors">
                    Originate & Allocate
                  </button>
                  <button type="button" onClick={() => setShowAddLoan(false)} className="text-xs bg-brand-border/40 hover:bg-brand-border/60 text-brand-muted px-4 py-2 rounded-lg">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Internal structural notes */}
            <div className="bg-brand-slate border border-brand-border p-4 rounded-lg">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-muted flex items-center gap-1.5 mb-2">
                <Info className="h-4 w-4 text-brand-accent" /> Structural Notes & Directives
              </h3>
              <p className="text-xs text-brand-text leading-relaxed whitespace-pre-line italic">
                {dossier.internal_structural_notes || "No structural directives provided. Default system configurations apply."}
              </p>
            </div>

            {/* Cumulative balance cards */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text mb-3">Live Outstanding Balance Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-brand-dark/40 border border-brand-border p-3.5 rounded-lg text-center">
                  <span className="text-[10px] text-brand-muted uppercase block">Principal Outstanding</span>
                  <span className="text-lg font-bold text-brand-text mt-1 block">
                    {formatCurrency(dossier.loans.reduce((acc, l) => acc + l.remaining_principal, 0))}
                  </span>
                </div>
                <div className="bg-brand-dark/40 border border-brand-border p-3.5 rounded-lg text-center">
                  <span className="text-[10px] text-brand-muted uppercase block">Unpaid Interest</span>
                  <span className="text-lg font-bold text-brand-amber mt-1 block">
                    {formatCurrency(dossier.loans.reduce((acc, l) => acc + l.remaining_interest, 0))}
                  </span>
                </div>
                <div className="bg-brand-dark/40 border border-brand-border p-3.5 rounded-lg text-center">
                  <span className="text-[10px] text-brand-muted uppercase block">Accumulated Penalty</span>
                  <span className="text-lg font-bold text-brand-crimson mt-1 block">
                    {formatCurrency(dossier.loans.reduce((acc, l) => acc + l.remaining_penalty, 0))}
                  </span>
                </div>
                <div className="bg-brand-dark/40 border border-brand-border p-3.5 rounded-lg text-center">
                  <span className="text-[10px] text-brand-muted uppercase block">Aggregate Balance</span>
                  <span className="text-lg font-bold text-brand-accent mt-1 block">
                    {formatCurrency(dossier.loans.reduce((acc, l) => acc + l.remaining_principal + l.remaining_interest + l.remaining_penalty, 0))}
                  </span>
                </div>
              </div>
            </div>

            {/* Loans list */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text border-b border-brand-border/40 pb-2">Active & Historical Loan Accounts</h3>
              {dossier.loans.length > 0 ? (
                dossier.loans.map((loan) => {
                  const outBal = loan.remaining_principal + loan.remaining_interest + loan.remaining_penalty;
                  return (
                    <div key={loan.id} className="border border-brand-border/80 rounded-xl overflow-hidden bg-brand-slate/30">
                      {/* Loan header banner */}
                      <div className="bg-brand-slate px-4 py-3 flex flex-wrap justify-between items-center border-b border-brand-border gap-2">
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${loan.status === 'Active' ? 'bg-brand-accent/20 text-brand-accent' : loan.status === 'Overdue' ? 'bg-brand-crimson/20 text-brand-crimson' : 'bg-brand-emerald/20 text-brand-emerald'}`}>
                            L-{loan.id} &bull; {loan.status.toUpperCase()}
                          </span>
                          <span className="text-xs text-brand-text font-medium">{loan.fund.name}</span>
                        </div>
                        <div className="text-xs font-mono font-bold text-brand-text">
                          Total Bal: {formatCurrency(outBal)}
                        </div>
                      </div>

                      {/* Loan stats grid */}
                      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <span className="text-[10px] text-brand-muted uppercase block">Disbursed Principal</span>
                          <span className="font-semibold text-brand-text">{formatCurrency(loan.principal_disbursed)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-brand-muted uppercase block">Remaining Principal</span>
                          <span className="font-semibold text-brand-text">{formatCurrency(loan.remaining_principal)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-brand-muted uppercase block">Interest Parameter</span>
                          <span className="font-semibold text-brand-text">{loan.interest_rate_percentage}% ({loan.interest_type})</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-brand-muted uppercase block">Timeline (Issue - Due)</span>
                          <span className="font-semibold text-brand-text">
                            {new Date(loan.issue_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(loan.maturity_due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      {/* Event Log Chronology */}
                      <div className="border-t border-brand-border p-4 bg-brand-dark/25">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-3">Chronological Event Logs</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          
                          {/* Combine payments and accruals chronologically */}
                          {(() => {
                            const events = [];
                            loan.recovery_transactions.forEach(t => {
                              events.push({
                                type: 'payment',
                                date: new Date(t.date),
                                data: t
                              });
                            });
                            loan.daily_ledger_accruals.forEach(a => {
                              events.push({
                                type: 'accrual',
                                date: new Date(a.date),
                                data: a
                              });
                            });

                            // Sort chronologically desc
                            events.sort((a, b) => b.date - a.date);

                            if (events.length === 0) {
                              return <p className="text-xs text-brand-muted italic">No events logged yet.</p>;
                            }

                            return events.map((ev, i) => {
                              if (ev.type === 'payment') {
                                return (
                                  <div key={`p-${ev.data.id}`} className="flex justify-between items-center bg-brand-emerald/10 border border-brand-emerald/25 p-2 rounded text-[11px]">
                                    <div className="flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald"></span>
                                      <span className="font-medium text-brand-emerald">Repayment Processed</span>
                                      <span className="text-brand-muted font-mono font-bold">(TX #{ev.data.id})</span>
                                    </div>
                                    <div className="text-right font-mono">
                                      <div className="font-bold text-brand-emerald">+{formatCurrency(ev.data.total_amount_received)}</div>
                                      <div className="text-[9px] text-brand-muted">
                                        Principal: -{formatCurrency(ev.data.allocated_to_principal)} &bull; Interest: -{formatCurrency(ev.data.allocated_to_interest)} &bull; Penalty: -{formatCurrency(ev.data.allocated_to_penalty)}
                                      </div>
                                      <div className="text-[9px] text-brand-muted mt-0.5">
                                        {ev.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      </div>
                                    </div>
                                  </div>
                                );
                              } else {
                                const activeLabel = ev.data.active_tier_label;
                                const isOverdue = activeLabel.includes('Tier') || activeLabel.includes('Overdue');
                                return (
                                  <div key={`a-${ev.data.id}`} className={`flex justify-between items-center border p-2 rounded text-[11px] ${isOverdue ? 'bg-brand-crimson/5 border-brand-crimson/15' : 'bg-brand-slate/40 border-brand-border/40'}`}>
                                    <div className="flex items-center gap-2">
                                      <span className={`w-1.5 h-1.5 rounded-full ${isOverdue ? 'bg-brand-crimson' : 'bg-brand-accent'}`}></span>
                                      <span className="font-medium text-brand-text">Daily Ledger Accrual</span>
                                      <span className={`text-[9px] font-bold px-1 rounded font-mono ${isOverdue ? 'bg-brand-crimson/15 text-brand-crimson' : 'bg-brand-accent/15 text-brand-accent'}`}>
                                        {activeLabel}
                                      </span>
                                    </div>
                                    <div className="text-right font-mono">
                                      <div className="font-semibold text-brand-text">Yield: {formatCurrency(ev.data.interest_accrued + ev.data.penalty_accrued)}</div>
                                      <div className="text-[9px] text-brand-muted">
                                        Int: +{formatCurrency(ev.data.interest_accrued)} &bull; Penalty: +{formatCurrency(ev.data.penalty_accrued)}
                                      </div>
                                      <div className="text-[9px] text-brand-muted mt-0.5">
                                        {ev.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                            });
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-brand-muted italic py-6 text-center">No loans originated for this client.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-brand-card border border-brand-border rounded-xl shadow-xl p-10 flex flex-col items-center justify-center h-[calc(100vh-14rem)] text-brand-muted">
            <FileText className="h-12 w-12 text-brand-border mb-3" />
            <p className="text-sm">Select a borrower profile from the directory to inspect ledger dossiers.</p>
          </div>
        )}
      </div>
    </div>
  );
}
