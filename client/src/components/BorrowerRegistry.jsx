import React, { useState, useEffect } from 'react';
import {
    Search, UserPlus, DollarSign, Info, FileText,
    Percent, Plus, Trash2, History, Edit2, Save, X
} from 'lucide-react';
import { API_BASE } from '../config';
import { authFetch } from '../utils/authFetch';

export default function BorrowerRegistry({ systemState, onActionTriggered }) {
    const [borrowers, setBorrowers] = useState([]);
    const [funds, setFunds] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [dossier, setDossier] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddBorrower, setShowAddBorrower] = useState(false);
    const [showAddLoan, setShowAddLoan] = useState(false);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [newBorrower, setNewBorrower] = useState({ full_name: '', phone: '', email: '', internal_structural_notes: '' });
    const [newLoan, setNewLoan] = useState({
        fund_id: '', principal_disbursed: '', interest_rate_percentage: '',
        interest_type: 'Simple', interest_period: 'Yearly', issue_date: '', maturity_due_date: ''
    });
    const [newLoanPenaltyTiers, setNewLoanPenaltyTiers] = useState([
        { start_day_overdue: '1', end_day_overdue: '10', penalty_amount_per_day: '100' },
        { start_day_overdue: '11', end_day_overdue: '30', penalty_amount_per_day: '250' },
        { start_day_overdue: '31', end_day_overdue: '', penalty_amount_per_day: '500' }
    ]);
    const [editingPenaltyLoanId, setEditingPenaltyLoanId] = useState(null);
    const [editableTiers, setEditableTiers] = useState([]);
    const [payment, setPayment] = useState({ loan_id: '', amount: '', date: '' });
    const [message, setMessage] = useState({ text: '', type: '' });

    const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

    useEffect(() => { fetchBorrowers(); fetchFunds(); }, []);
    useEffect(() => { if (selectedId) fetchDossier(selectedId); }, [selectedId]);
    useEffect(() => {
        if (systemState?.system_date) {
            const d = new Date(systemState.system_date).toISOString().split('T')[0];
            setPayment(p => ({ ...p, date: d }));
            const plus30 = new Date(new Date(systemState.system_date).setDate(new Date(systemState.system_date).getDate() + 30)).toISOString().split('T')[0];
            setNewLoan(l => ({ ...l, issue_date: d, maturity_due_date: plus30 }));
        }
    }, [systemState]);

    const fetchBorrowers = async () => {
        try {
            const res = await authFetch(`${API_BASE}/borrowers`);
            const data = await res.json();
            setBorrowers(data);
            if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
        } catch (e) { console.error(e); }
    };

    const fetchFunds = async () => {
        try {
            const res = await authFetch(`${API_BASE}/funds`);
            const data = await res.json();
            setFunds(data);
            if (data.length > 0) setNewLoan(l => ({ ...l, fund_id: data[0].id.toString() }));
        } catch (e) { console.error(e); }
    };

    const fetchDossier = async (id) => {
        try {
            const res = await authFetch(`${API_BASE}/borrowers/${id}`);
            const data = await res.json();
            setDossier(data);
            const active = data.loans.find(l => l.status !== 'Settled');
            if (active) setPayment(p => ({ ...p, loan_id: active.id.toString() }));
            else if (data.loans.length > 0) setPayment(p => ({ ...p, loan_id: data.loans[0].id.toString() }));
        } catch (e) { console.error(e); }
    };

    const flash = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 6000);
    };

    const handleAddBorrower = async (e) => {
        e.preventDefault();
        try {
            const res = await authFetch(`${API_BASE}/borrowers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newBorrower) });
            const data = await res.json();
            if (res.ok) { setNewBorrower({ full_name: '', phone: '', email: '', internal_structural_notes: '' }); setShowAddBorrower(false); fetchBorrowers(); setSelectedId(data.id); flash('Borrower registered successfully!', 'success'); }
            else flash(data.error || 'Failed to register borrower.', 'error');
        } catch { flash('Server connection error.', 'error'); }
    };

    const handleAddLoan = async (e) => {
        e.preventDefault();
        try {
            const res = await authFetch(`${API_BASE}/loans`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newLoan, borrower_id: selectedId,
                    principal_disbursed: parseFloat(newLoan.principal_disbursed),
                    interest_rate_percentage: parseFloat(newLoan.interest_rate_percentage),
                    penalty_tiers: newLoanPenaltyTiers.map(t => ({
                        start_day_overdue: parseInt(t.start_day_overdue),
                        end_day_overdue: t.end_day_overdue !== '' ? parseInt(t.end_day_overdue) : null,
                        penalty_amount_per_day: parseFloat(t.penalty_amount_per_day)
                    }))
                })
            });
            const data = await res.json();
            if (res.ok) { setShowAddLoan(false); fetchDossier(selectedId); fetchBorrowers(); fetchFunds(); onActionTriggered(); flash('Loan originated successfully!', 'success'); }
            else flash(data.error || 'Failed to originate loan.', 'error');
        } catch { flash('Server connection error.', 'error'); }
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        try {
            const res = await authFetch(`${API_BASE}/transactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payment, amount: parseFloat(payment.amount) }) });
            const data = await res.json();
            if (res.ok) { setShowPaymentForm(false); setPayment(p => ({ ...p, amount: '' })); fetchDossier(selectedId); fetchBorrowers(); onActionTriggered(); flash(`Waterfall processed! Penalty: ${fmt(data.allocations.penalty)}, Interest: ${fmt(data.allocations.interest)}, Principal: ${fmt(data.allocations.principal)}`, 'success'); }
            else flash(data.error || 'Failed to process waterfall.', 'error');
        } catch { flash('Server connection error.', 'error'); }
    };

    const handleDeleteBorrower = async (e, id, name) => {
        e.stopPropagation();
        if (!confirm(`Move borrower "${name}" to Trash Bin?`)) return;
        try {
            const res = await authFetch(`${API_BASE}/borrowers/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) { flash(data.message || 'Borrower moved to trash.', 'success'); fetchBorrowers(); if (selectedId === id) { setSelectedId(null); setDossier(null); } onActionTriggered(); }
            else flash(data.error || 'Failed.', 'error');
        } catch { flash('Server connection error.', 'error'); }
    };

    const handleDeleteLoan = async (loanId) => {
        if (!confirm(`Move Loan L-${loanId} to Trash Bin?`)) return;
        try {
            const res = await authFetch(`${API_BASE}/loans/${loanId}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) { flash(data.message || 'Loan moved to trash.', 'success'); fetchDossier(selectedId); fetchBorrowers(); onActionTriggered(); }
            else flash(data.error || 'Failed.', 'error');
        } catch { flash('Server connection error.', 'error'); }
    };

    const startEditingTiers = (loan) => {
        setEditingPenaltyLoanId(loan.id);
        setEditableTiers((loan.penalty_tier_configs || []).sort((a, b) => a.start_day_overdue - b.start_day_overdue).map(t => ({
            start_day_overdue: String(t.start_day_overdue),
            end_day_overdue: t.end_day_overdue !== null ? String(t.end_day_overdue) : '',
            penalty_amount_per_day: String(t.penalty_amount_per_day)
        })));
    };

    const handleSaveTiers = async (loanId) => {
        try {
            const res = await authFetch(`${API_BASE}/loans/${loanId}/penalty-tiers`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tiers: editableTiers.map(t => ({ start_day_overdue: parseInt(t.start_day_overdue), end_day_overdue: t.end_day_overdue !== '' ? parseInt(t.end_day_overdue) : null, penalty_amount_per_day: parseFloat(t.penalty_amount_per_day) })) })
            });
            const data = await res.json();
            if (res.ok) { flash('Penalty tiers updated!', 'success'); setEditingPenaltyLoanId(null); setEditableTiers([]); fetchDossier(selectedId); onActionTriggered(); }
            else flash(data.error || 'Failed.', 'error');
        } catch { flash('Server connection error.', 'error'); }
    };

    const filtered = borrowers.filter(b =>
        b.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const INPUT = 'w-full bg-brand-card border border-brand-border text-xs px-2.5 py-1.5 rounded text-brand-text focus:outline-none focus:border-brand-accent mt-1';
    const INPUT_SM = 'bg-brand-card border border-brand-border text-xs px-2 py-1 rounded text-brand-text focus:outline-none focus:border-brand-accent w-full';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── LEFT: Directory ── */}
            <div className="bg-brand-card border border-brand-border rounded-xl shadow-xl p-4 flex flex-col h-[calc(100vh-14rem)]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-brand-text font-bold text-sm uppercase tracking-wider">Client Directory</h3>
                    <button onClick={() => setShowAddBorrower(!showAddBorrower)}
                        className="flex items-center gap-1 text-[11px] font-bold bg-brand-accent/20 hover:bg-brand-accent/40 text-brand-text border border-brand-accent/40 px-2 py-1 rounded transition-colors">
                        <UserPlus className="h-3 w-3" /> Register
                    </button>
                </div>

                <div className="relative mb-4">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-brand-muted" />
                    <input type="text" placeholder="Search clients..." value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-brand-dark/50 border border-brand-border/60 rounded-lg pl-9 pr-4 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-accent" />
                </div>

                {showAddBorrower && (
                    <form onSubmit={handleAddBorrower} className="bg-brand-dark/40 border border-brand-border/60 p-3 rounded-lg mb-4 space-y-3">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider border-b border-brand-border/40 pb-1.5 text-brand-accent">Register New Client</h4>
                        <div>
                            <label className="text-[10px] text-brand-muted uppercase block">Full Name</label>
                            <input type="text" required value={newBorrower.full_name} onChange={e => setNewBorrower({ ...newBorrower, full_name: e.target.value })} className={INPUT} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] text-brand-muted uppercase block">Phone</label>
                                <input type="text" required value={newBorrower.phone} onChange={e => setNewBorrower({ ...newBorrower, phone: e.target.value })} className={INPUT} />
                            </div>
                            <div>
                                <label className="text-[10px] text-brand-muted uppercase block">Email</label>
                                <input type="email" required value={newBorrower.email} onChange={e => setNewBorrower({ ...newBorrower, email: e.target.value })} className={INPUT} />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-brand-muted uppercase block">Structural Notes</label>
                            <textarea value={newBorrower.internal_structural_notes} onChange={e => setNewBorrower({ ...newBorrower, internal_structural_notes: e.target.value })} className={`${INPUT} h-12`} />
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 text-[11px] font-bold bg-brand-emerald/20 hover:bg-brand-emerald/40 text-brand-text border border-brand-emerald/40 py-1.5 rounded">Confirm Registry</button>
                            <button type="button" onClick={() => setShowAddBorrower(false)} className="px-3 text-[11px] bg-brand-border/40 hover:bg-brand-border/60 rounded text-brand-muted">Cancel</button>
                        </div>
                    </form>
                )}

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {filtered.length > 0 ? filtered.map(b => (
                        <div key={b.id} onClick={() => setSelectedId(b.id)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedId === b.id ? 'bg-brand-slate border-brand-accent shadow-md' : 'bg-brand-dark/20 border-brand-border/40 hover:bg-brand-slate/40'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="text-xs font-semibold text-brand-text">{b.full_name}</h4>
                                    <span className="text-[9px] text-brand-muted block mt-0.5">{b.email}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-mono ${b.active_loans_count > 0 ? 'bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/20' : 'bg-brand-emerald/15 text-brand-emerald border border-brand-emerald/20'}`}>
                                        {b.active_loans_count} Active
                                    </span>
                                    <button onClick={e => handleDeleteBorrower(e, b.id, b.full_name)}
                                        className="p-1 rounded bg-brand-dark hover:bg-brand-crimson/15 border border-brand-border/60 hover:border-brand-crimson/40 text-brand-muted hover:text-brand-crimson transition-colors" title="Move to Trash">
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-between mt-2.5 text-[10px] text-brand-muted font-mono">
                                <span>Out: {fmt(b.total_outstanding)}</span>
                                <span>Disbursed: {fmt(b.total_disbursed)}</span>
                            </div>
                        </div>
                    )) : (
                        <div className="text-xs text-brand-muted italic text-center py-10">No borrowers found</div>
                    )}
                </div>
            </div>

            {/* ── RIGHT: Dossier ── */}
            <div className="lg:col-span-2 space-y-6">
                {message.text && (
                    <div className={`p-4 rounded-lg border text-xs font-medium flex items-center justify-between shadow-md ${message.type === 'success' ? 'bg-brand-emerald/10 border-brand-emerald/30 text-brand-emerald' : 'bg-brand-crimson/10 border-brand-crimson/30 text-brand-crimson'}`}>
                        <span>{message.text}</span>
                        <button onClick={() => setMessage({ text: '', type: '' })} className="font-bold underline text-[10px] uppercase">Dismiss</button>
                    </div>
                )}

                {dossier ? (
                    <div className="bg-brand-card border border-brand-border rounded-xl shadow-xl p-6 space-y-6 h-[calc(100vh-14rem)] overflow-y-auto">

                        {/* Dossier header */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-brand-border/60 pb-5 gap-4">
                            <div>
                                <span className="text-[10px] bg-brand-accent/25 text-brand-text border border-brand-accent/40 px-2 py-0.5 rounded font-bold font-mono">CLIENT DOSSIER #C-{dossier.id}</span>
                                <h2 className="text-xl font-extrabold text-brand-text mt-1.5">{dossier.full_name}</h2>
                                <p className="text-xs text-brand-muted mt-1">{dossier.email} &bull; {dossier.phone}</p>
                                {Array.isArray(dossier.edit_log) && dossier.edit_log.length > 0 && (
                                    <details className="mt-3 text-[10.5px] text-brand-muted cursor-pointer">
                                        <summary className="hover:text-brand-text transition-colors font-semibold select-none flex items-center gap-1">
                                            <History className="h-3.5 w-3.5 text-brand-accent inline" /> View Edit History ({dossier.edit_log.length})
                                        </summary>
                                        <div className="mt-2 bg-brand-dark/30 border border-brand-border/40 p-2.5 rounded-lg space-y-1.5">
                                            {dossier.edit_log.map((log, i) => (
                                                <div key={i} className="flex items-start gap-1">
                                                    <span className="text-brand-accent font-semibold">[{log.action}]</span>
                                                    <span>{log.detail}</span>
                                                    <span className="ml-auto text-[9px] font-mono text-brand-muted/70">{new Date(log.timestamp).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setShowPaymentForm(!showPaymentForm)}
                                    className="flex items-center gap-1.5 text-xs font-bold bg-brand-emerald/20 hover:bg-brand-emerald/40 text-brand-emerald border border-brand-emerald/40 px-3 py-1.5 rounded-lg transition-colors">
                                    <DollarSign className="h-4 w-4" /> Collect Recovery
                                </button>
                                <button onClick={() => setShowAddLoan(!showAddLoan)}
                                    className="flex items-center gap-1.5 text-xs font-bold bg-brand-accent/20 hover:bg-brand-accent/40 text-brand-text border border-brand-accent/40 px-3 py-1.5 rounded-lg transition-colors">
                                    <Plus className="h-4 w-4" /> Originate Loan
                                </button>
                            </div>
                        </div>

                        {/* Payment form */}
                        {showPaymentForm && (
                            <form onSubmit={handlePayment} className="bg-brand-dark/40 border border-brand-emerald/30 p-4 rounded-lg space-y-4">
                                <div className="flex justify-between items-center border-b border-brand-border/40 pb-2">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-brand-emerald">Post Repayment Transaction</h4>
                                    <span className="text-[10px] text-brand-muted">Waterfall Engine Priority</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-[10px] text-brand-muted uppercase block">Select Loan Account</label>
                                        <select required value={payment.loan_id} onChange={e => setPayment({ ...payment, loan_id: e.target.value })} className={INPUT}>
                                            {dossier.loans.filter(l => l.status !== 'Settled').map(l => <option key={l.id} value={l.id}>L-{l.id} ({l.fund.name})</option>)}
                                            {dossier.loans.filter(l => l.status === 'Settled').map(l => <option key={l.id} value={l.id} disabled>L-{l.id} (Settled)</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-brand-muted uppercase block">Payment Amount (₹)</label>
                                        <input type="number" required min="1" step="any" value={payment.amount} onChange={e => setPayment({ ...payment, amount: e.target.value })} className={INPUT} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-brand-muted uppercase block">Payment Date</label>
                                        <input type="date" required value={payment.date} onChange={e => setPayment({ ...payment, date: e.target.value })} className={INPUT} />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="submit" className="text-xs font-bold bg-brand-emerald hover:bg-brand-emerald/80 text-brand-dark px-4 py-2 rounded-lg transition-colors">Trigger Waterfall Recovery</button>
                                    <button type="button" onClick={() => setShowPaymentForm(false)} className="text-xs bg-brand-border/40 hover:bg-brand-border/60 text-brand-muted px-4 py-2 rounded-lg">Cancel</button>
                                </div>
                            </form>
                        )}

                        {/* Originate loan form */}
                        {showAddLoan && (
                            <form onSubmit={handleAddLoan} className="bg-brand-dark/40 border border-brand-accent/30 p-4 rounded-lg space-y-4">
                                <div className="flex justify-between items-center border-b border-brand-border/40 pb-2">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-brand-accent">Originate New Capital Loan</h4>
                                    <span className="text-[10px] text-brand-muted">Checks Fund Liquidity</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-[10px] text-brand-muted uppercase block">Capital Source Pool</label>
                                        <select required value={newLoan.fund_id} onChange={e => setNewLoan({ ...newLoan, fund_id: e.target.value })} className={INPUT}>
                                            {funds.map(f => <option key={f.id} value={f.id}>{f.name} (Avail: {fmt(f.total_capital - f.allocated_capital)})</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-brand-muted uppercase block">Principal Amount (₹)</label>
                                        <input type="number" required min="1" value={newLoan.principal_disbursed} onChange={e => setNewLoan({ ...newLoan, principal_disbursed: e.target.value })} className={INPUT} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-brand-muted uppercase block">Interest Rate (% p.a.)</label>
                                        <input type="number" required min="0.1" step="any" value={newLoan.interest_rate_percentage} onChange={e => setNewLoan({ ...newLoan, interest_rate_percentage: e.target.value })} className={INPUT} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-brand-muted uppercase block">Interest Structure</label>
                                        <select value={newLoan.interest_type} onChange={e => setNewLoan({ ...newLoan, interest_type: e.target.value })} className={INPUT}>
                                            <option value="Simple">Simple Daily Accrual</option>
                                            <option value="Flat">Flat Daily Accrual</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-brand-muted uppercase block">Time Period</label>
                                        <select value={newLoan.interest_period} onChange={e => setNewLoan({ ...newLoan, interest_period: e.target.value })} className={INPUT}>
                                            <option value="Daily">Daily</option>
                                            <option value="Weekly">Weekly</option>
                                            <option value="Monthly">Monthly</option>
                                            <option value="Yearly">Yearly</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-brand-muted uppercase block">Issue Date</label>
                                        <input type="date" required value={newLoan.issue_date} onChange={e => setNewLoan({ ...newLoan, issue_date: e.target.value })} className={INPUT} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-brand-muted uppercase block">Maturity Date</label>
                                        <input type="date" required value={newLoan.maturity_due_date} onChange={e => setNewLoan({ ...newLoan, maturity_due_date: e.target.value })} className={INPUT} />
                                    </div>
                                </div>

                                {/* Penalty tier config in origination form */}
                                <div className="border border-brand-border/50 rounded-lg p-3 space-y-2 bg-brand-dark/20">
                                    <div className="flex justify-between items-center border-b border-brand-border/30 pb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">Penalty Tier Configuration (Post-Maturity)</span>
                                        <button type="button" onClick={() => setNewLoanPenaltyTiers([...newLoanPenaltyTiers, { start_day_overdue: '', end_day_overdue: '', penalty_amount_per_day: '0' }])}
                                            className="flex items-center gap-1 text-[10px] font-bold bg-brand-accent/15 hover:bg-brand-accent/30 text-brand-accent border border-brand-accent/30 px-2 py-0.5 rounded">
                                            <Plus className="h-3 w-3" /> Add Tier
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1 text-[9px] text-brand-muted uppercase font-bold px-1">
                                        <span>From Day</span><span>To Day (∞)</span><span>₹ / Day</span><span></span>
                                    </div>
                                    {newLoanPenaltyTiers.map((tier, idx) => (
                                        <div key={idx} className="grid grid-cols-4 gap-1 items-center">
                                            <input type="number" min="1" value={tier.start_day_overdue} onChange={e => { const u = [...newLoanPenaltyTiers]; u[idx] = { ...u[idx], start_day_overdue: e.target.value }; setNewLoanPenaltyTiers(u); }} className={INPUT_SM} />
                                            <input type="number" min="1" placeholder="∞" value={tier.end_day_overdue} onChange={e => { const u = [...newLoanPenaltyTiers]; u[idx] = { ...u[idx], end_day_overdue: e.target.value }; setNewLoanPenaltyTiers(u); }} className={INPUT_SM} />
                                            <input type="number" min="0" step="any" value={tier.penalty_amount_per_day} onChange={e => { const u = [...newLoanPenaltyTiers]; u[idx] = { ...u[idx], penalty_amount_per_day: e.target.value }; setNewLoanPenaltyTiers(u); }} className={INPUT_SM} />
                                            <button type="button" onClick={() => setNewLoanPenaltyTiers(newLoanPenaltyTiers.filter((_, i) => i !== idx))} className="text-brand-crimson hover:text-brand-crimson/70 flex justify-center"><X className="h-3.5 w-3.5" /></button>
                                        </div>
                                    ))}
                                    {newLoanPenaltyTiers.length === 0 && <p className="text-[10px] text-brand-muted italic">No tiers — defaults (₹100/₹250/₹500) will apply.</p>}
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="submit" className="text-xs font-bold bg-brand-accent hover:bg-brand-accent/80 text-brand-text px-4 py-2 rounded-lg transition-colors">Originate & Allocate</button>
                                    <button type="button" onClick={() => setShowAddLoan(false)} className="text-xs bg-brand-border/40 hover:bg-brand-border/60 text-brand-muted px-4 py-2 rounded-lg">Cancel</button>
                                </div>
                            </form>
                        )}

                        {/* Structural notes */}
                        <div className="bg-brand-slate border border-brand-border p-4 rounded-lg">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-muted flex items-center gap-1.5 mb-2">
                                <Info className="h-4 w-4 text-brand-accent" /> Structural Notes & Directives
                            </h3>
                            <p className="text-xs text-brand-text leading-relaxed whitespace-pre-line italic">
                                {dossier.internal_structural_notes || 'No structural directives provided. Default system configurations apply.'}
                            </p>
                        </div>

                        {/* Balance breakdown */}
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text mb-3">Live Outstanding Balance Breakdown</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-brand-dark/30 p-3 rounded-lg border border-brand-border/40">
                                    <span className="text-[9px] text-brand-muted uppercase block font-bold">Total Disbursed</span>
                                    <span className="text-base font-extrabold text-brand-text font-mono mt-1 block">{fmt(dossier.total_disbursed)}</span>
                                </div>
                                <div className="bg-brand-dark/30 p-3 rounded-lg border border-brand-border/40">
                                    <span className="text-[9px] text-brand-muted uppercase block font-bold text-brand-crimson">Principal Unrecovered</span>
                                    <span className="text-base font-extrabold text-brand-crimson font-mono mt-1 block">{fmt(dossier.loans.reduce((acc, l) => acc + parseFloat(l.principal_outstanding || 0), 0))}</span>
                                </div>
                                <div className="bg-brand-dark/30 p-3 rounded-lg border border-brand-border/40">
                                    <span className="text-[9px] text-brand-muted uppercase block font-bold text-brand-accent">Accrued Interest</span>
                                    <span className="text-base font-extrabold text-brand-accent font-mono mt-1 block">{fmt(dossier.loans.reduce((acc, l) => acc + parseFloat(l.interest_accrued || 0), 0))}</span>
                                </div>
                                <div className="bg-brand-dark/30 p-3 rounded-lg border border-brand-border/40">
                                    <span className="text-[9px] text-brand-muted uppercase block font-bold text-brand-amber">Accumulated Penalty</span>
                                    <span className="text-base font-extrabold text-brand-amber font-mono mt-1 block">{fmt(dossier.loans.reduce((acc, l) => acc + parseFloat(l.penalty_accumulated || 0), 0))}</span>
                                </div>
                            </div>
                        </div>

                        {/* ── LOANS LIST SECTION (CLASSIC DESIGN RECONSTRUCTED) ── */}
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text mb-3">Loan Accounts Allocation History</h3>
                            <div className="space-y-4">
                                {Array.isArray(dossier.loans) && dossier.loans.length > 0 ? (
                                    dossier.loans.map((loan) => (
                                        <div key={loan.id} className="border border-brand-border rounded-lg p-4 bg-brand-dark/10 space-y-3">
                                            <div className="flex justify-between items-center border-b border-brand-border/40 pb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold font-mono text-brand-text">Account L-{loan.id}</span>
                                                    <span className="text-[10px] text-brand-muted">({loan.fund?.name || 'Unknown Source Pool'})</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${loan.status === 'Settled' ? 'bg-brand-emerald/15 text-brand-emerald' : loan.status === 'Overdue' ? 'bg-brand-crimson/15 text-brand-crimson' : 'bg-brand-accent/15 text-brand-text'}`}>
                                                        {loan.status}
                                                    </span>
                                                    <button onClick={() => handleDeleteLoan(loan.id)} className="p-1 rounded bg-brand-dark hover:bg-brand-crimson/15 text-brand-muted hover:text-brand-crimson border border-brand-border/40" title="Delete Loan Account">
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono">
                                                <div><span className="text-brand-muted block text-[9px] uppercase">Principal</span>{fmt(loan.principal_disbursed)}</div>
                                                <div><span className="text-brand-muted block text-[9px] uppercase">Rate / Cycle</span>{loan.interest_rate_percentage}% ({loan.interest_period})</div>
                                                <div><span className="text-brand-muted block text-[9px] uppercase">Issued On</span>{loan.issue_date ? new Date(loan.issue_date).toLocaleDateString('en-IN') : '-'}</div>
                                                <div><span className="text-brand-muted block text-[9px] uppercase">Maturity Date</span>{loan.maturity_due_date ? new Date(loan.maturity_due_date).toLocaleDateString('en-IN') : '-'}</div>
                                            </div>

                                            {/* Penalty Tiers Editor Block inside Loan */}
                                            <div className="bg-brand-dark/40 border border-brand-border/50 rounded-lg p-2.5">
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <span className="text-[10px] font-bold text-brand-muted uppercase flex items-center gap-1"><Percent className="h-3 w-3" /> Active Penalty Tiers</span>
                                                    {editingPenaltyLoanId === loan.id ? (
                                                        <div className="flex gap-1.5">
                                                            <button onClick={() => handleSaveTiers(loan.id)} className="flex items-center gap-0.5 text-[9px] font-bold text-brand-emerald bg-brand-emerald/10 border border-brand-emerald/30 px-1.5 py-0.5 rounded"><Save className="h-2.5 w-2.5" /> Save</button>
                                                            <button onClick={() => setEditingPenaltyLoanId(null)} className="flex items-center gap-0.5 text-[9px] font-bold text-brand-muted bg-brand-border/30 px-1.5 py-0.5 rounded"><X className="h-2.5 w-2.5" /> Cancel</button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => startEditingTiers(loan)} className="flex items-center gap-0.5 text-[9px] font-bold text-brand-accent bg-brand-accent/10 border border-brand-accent/30 px-1.5 py-0.5 rounded"><Edit2 className="h-2.5 w-2.5" /> Modify Config</button>
                                                    )}
                                                </div>

                                                {editingPenaltyLoanId === loan.id ? (
                                                    <div className="space-y-1">
                                                        {editableTiers.map((t, tIdx) => (
                                                            <div key={tIdx} className="grid grid-cols-3 gap-1 items-center">
                                                                <input type="number" value={t.start_day_overdue} onChange={e => { const updated = [...editableTiers]; updated[tIdx].start_day_overdue = e.target.value; setEditableTiers(updated); }} className={INPUT_SM} placeholder="From" />
                                                                <input type="number" value={t.end_day_overdue} onChange={e => { const updated = [...editableTiers]; updated[tIdx].end_day_overdue = e.target.value; setEditableTiers(updated); }} className={INPUT_SM} placeholder="To (or blank)" />
                                                                <input type="number" value={t.penalty_amount_per_day} onChange={e => { const updated = [...editableTiers]; updated[tIdx].penalty_amount_per_day = e.target.value; setEditableTiers(updated); }} className={INPUT_SM} placeholder="₹ / Day" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px] text-brand-text/90 font-mono">
                                                        {Array.isArray(loan.penalty_tier_configs) && loan.penalty_tier_configs.length > 0 ? (
                                                            loan.penalty_tier_configs.sort((a,b) => a.start_day_overdue - b.start_day_overdue).map((t, idx) => (
                                                                <div key={idx} className="bg-brand-card px-2 py-1 rounded border border-brand-border/30">
                                                                    Day {t.start_day_overdue}{t.end_day_overdue ? `-${t.end_day_overdue}` : '+'}: <span className="font-bold text-brand-amber">{fmt(t.penalty_amount_per_day)}/d</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <span className="text-brand-muted italic col-span-3">System default parameters configured.</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-xs text-brand-muted italic p-3 text-center bg-brand-dark/20 border border-brand-border/40 rounded-lg">No history or loan exposures generated for this registry dossier.</div>
                                )}
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="bg-brand-card border border-brand-border rounded-xl shadow-xl p-8 text-center text-xs text-brand-muted italic h-[calc(100vh-14rem)] flex items-center justify-center">
                        Select a client directory account to audit active ledgers, execute waterfall distributions, or configure exposure parameters.
                    </div>
                )}
            </div>
        </div>
    );
}