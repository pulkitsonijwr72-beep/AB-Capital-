import React, { useState, useEffect } from 'react';
import {
  Landmark, Plus, ArrowLeft, RefreshCw,
  AlertTriangle, CheckCircle, ShieldAlert, Clock, Phone
} from 'lucide-react';
import { API_BASE } from '../config';
import { authFetch } from '../utils/authFetch';

const fmt = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

// ── Countdown badge — emoji + colour based on urgency ──────────────────────
function CountdownBadge({ row }) {
  const { dpd, days_until_due, countdown_label, health_status } = row;

  if (dpd > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/25">
        🚨 {countdown_label}
      </span>
    );
  }
  if (days_until_due === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/25">
        🔴 Due Today
      </span>
    );
  }
  if (days_until_due === 1) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-amber/15 text-brand-amber border border-brand-amber/25">
        🚨 Due Tomorrow
      </span>
    );
  }
  if (health_status === 'Critical') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-amber/15 text-brand-amber border border-brand-amber/25">
        ⚠️ {countdown_label}
      </span>
    );
  }
  if (health_status === 'Warning') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-amber/10 text-brand-amber border border-brand-amber/20">
        ⏳ {countdown_label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20">
      ✅ {countdown_label}
    </span>
  );
}

// ── Health status icon ──────────────────────────────────────────────────────
function HealthIcon({ status }) {
  if (status === 'Overdue') return <ShieldAlert className="h-3.5 w-3.5 text-brand-crimson" />;
  if (status === 'Critical') return <ShieldAlert className="h-3.5 w-3.5 text-brand-amber animate-pulse" />;
  if (status === 'Warning') return <AlertTriangle className="h-3.5 w-3.5 text-brand-amber" />;
  return <CheckCircle className="h-3.5 w-3.5 text-brand-emerald" />;
}

// ── Drill-down view — payment status for a single pool ─────────────────────
function PoolDrillDown({ fund, onBack }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await authFetch(`${API_BASE}/funds/${fund.id}/payment-status`);
        const data = await res.json();
        if (!cancelled) {
          if (res.ok) setRows(data.rows || []);
          else setError(data.error || 'Failed to load payment status.');
        }
      } catch {
        if (!cancelled) setError('Server connection error.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [fund.id]);

  const liquid = Math.max(0, fund.total_capital - fund.allocated_capital);
  const deployRate = fund.total_capital > 0 ? (fund.allocated_capital / fund.total_capital) * 100 : 0;

  return (
    <div className="space-y-6">

      {/* Back button + pool header */}
      <div className="flex items-center gap-4 pb-4 border-b border-brand-border/60">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-brand-muted hover:text-brand-text bg-brand-card border border-brand-border hover:border-brand-accent/40 px-3 py-2 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to All Pools
        </button>
        <div>
          <h2 className="text-lg font-extrabold text-brand-text leading-tight">{fund.name}</h2>
          <span className="text-[10px] text-brand-muted font-mono">POOL ID: #PL-00{fund.id} &bull; Running Payment Status</span>
        </div>
      </div>

      {/* Pool aggregate stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-brand-card border border-brand-border rounded-lg p-4">
          <span className="text-[10px] text-brand-muted uppercase tracking-wider block">Total Capacity</span>
          <span className="text-base font-bold text-brand-text mt-1 block font-mono">{fmt(fund.total_capital)}</span>
        </div>
        <div className="bg-brand-card border border-brand-border rounded-lg p-4">
          <span className="text-[10px] text-brand-muted uppercase tracking-wider block">Deployed Capital</span>
          <span className="text-base font-bold text-brand-accent mt-1 block font-mono">{fmt(fund.allocated_capital)}</span>
        </div>
        <div className="bg-brand-card border border-brand-border rounded-lg p-4">
          <span className="text-[10px] text-brand-muted uppercase tracking-wider block">Liquid Available</span>
          <span className="text-base font-bold text-brand-emerald mt-1 block font-mono">{fmt(liquid)}</span>
        </div>
        <div className="bg-brand-card border border-brand-border rounded-lg p-4">
          <span className="text-[10px] text-brand-muted uppercase tracking-wider block">Deployment Rate</span>
          <span className="text-base font-bold text-brand-amber mt-1 block font-mono">{deployRate.toFixed(1)}%</span>
          <div className="w-full bg-brand-dark/60 h-1.5 rounded-full mt-2 border border-brand-border/40">
            <div className="bg-brand-accent h-full rounded-full" style={{ width: `${Math.min(100, deployRate)}%` }} />
          </div>
        </div>
      </div>

      {/* Drill-down grid */}
      <div className="bg-brand-card border border-brand-border rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-brand-border/60">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text">
              Active Loan Repayment Schedule
            </h3>
            <p className="text-[10px] text-brand-muted mt-0.5">
              Sorted by priority date — nearest collection deadline first (ASC)
            </p>
          </div>
          <span className="text-[9px] font-bold bg-brand-accent/15 text-brand-accent border border-brand-accent/25 px-2 py-0.5 rounded-md font-mono uppercase">
            {rows.length} active loan{rows.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-brand-muted">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-xs">Loading repayment schedule...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-xs text-brand-crimson">{error}</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-14 space-y-2">
            <CheckCircle className="h-8 w-8 text-brand-emerald mx-auto" />
            <p className="text-sm text-brand-muted">No active loans linked to this pool.</p>
            <p className="text-[10px] text-brand-muted/60">Originate a loan against this fund from the Borrowers section.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[820px]">
              <thead>
                <tr className="bg-brand-slate/60 text-[10px] uppercase tracking-wider text-brand-muted border-b border-brand-border/60 font-mono">
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-4 py-3">Borrower</th>
                  <th className="px-4 py-3 text-right">Outstanding Principal</th>
                  <th className="px-4 py-3 text-right">Accrued Interest</th>
                  <th className="px-4 py-3 text-right">Penalty</th>
                  <th className="px-4 py-3 text-right">Total Due</th>
                  <th className="px-4 py-3">Maturity</th>
                  <th className="px-4 py-3">Countdown</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {rows.map((row, idx) => (
                  <tr
                    key={row.loan_id}
                    className="hover:bg-brand-slate/30 transition-colors"
                  >
                    {/* Priority rank */}
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-extrabold font-mono w-6 h-6 flex items-center justify-center rounded-full ${idx === 0 ? 'bg-brand-crimson/20 text-brand-crimson' :
                        idx === 1 ? 'bg-brand-amber/15 text-brand-amber' :
                          'bg-brand-border/40 text-brand-muted'
                        }`}>
                        {idx + 1}
                      </span>
                    </td>

                    {/* Borrower */}
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-brand-text">{row.borrower_name}</div>
                      <div className="text-[9px] text-brand-muted font-mono flex items-center gap-1 mt-0.5">
                        L-{row.loan_id}
                        &nbsp;·&nbsp;
                        <Phone className="h-2.5 w-2.5 inline" /> {row.borrower_phone}
                      </div>
                      <div className="text-[9px] text-brand-muted mt-0.5">
                        {row.interest_rate}% p.a. &bull; {row.interest_type} &bull; {row.interest_period}
                      </div>
                    </td>

                    {/* Outstanding principal */}
                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-brand-text">
                      {fmt(row.remaining_principal)}
                    </td>

                    {/* Accrued interest */}
                    <td className="px-4 py-3.5 text-right font-mono text-brand-amber font-semibold">
                      {fmt(row.remaining_interest)}
                    </td>

                    {/* Penalty */}
                    <td className="px-4 py-3.5 text-right font-mono text-brand-crimson font-semibold">
                      {fmt(row.remaining_penalty)}
                    </td>

                    {/* Total */}
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-brand-accent">
                      {fmt(row.total_outstanding)}
                    </td>

                    {/* Maturity */}
                    <td className="px-4 py-3.5 font-mono text-brand-muted text-[11px]">
                      {new Date(row.maturity_due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>

                    {/* Countdown badge */}
                    <td className="px-4 py-3.5">
                      <CountdownBadge row={row} />
                    </td>

                    {/* Health status */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <HealthIcon status={row.health_status} />
                        <span className={`text-[10px] font-bold uppercase ${row.health_status === 'Overdue' ? 'text-brand-crimson' :
                          row.health_status === 'Critical' ? 'text-brand-amber' :
                            row.health_status === 'Warning' ? 'text-brand-amber' :
                              'text-brand-emerald'
                          }`}>
                          {row.health_status}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main FundRegistry component ─────────────────────────────────────────────
export default function FundRegistry({ funds: initialFunds, onActionTriggered }) {
  const [funds, setFunds] = useState(initialFunds || []);
  const [showAddFund, setShowAddFund] = useState(false);
  const [newFund, setNewFund] = useState({ name: '', total_capital: '' });
  const [message, setMessage] = useState({ text: '', type: '' });

  // null  = list view  |  object = drill-down for that fund
  const [selectedFund, setSelectedFund] = useState(null);

  useEffect(() => {
    if (initialFunds) setFunds(initialFunds);
    else fetchFunds();
  }, [initialFunds]);

  const fetchFunds = async () => {
    try {
      const res = await authFetch(`${API_BASE}/funds`);
      setFunds(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleAddFund = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch(`${API_BASE}/funds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFund.name, total_capital: parseFloat(newFund.total_capital) })
      });
      const data = await res.json();
      if (res.ok) {
        setNewFund({ name: '', total_capital: '' });
        setShowAddFund(false);
        fetchFunds();
        if (onActionTriggered) onActionTriggered();
        flash('Capital fund source registered successfully!', 'success');
      } else {
        flash(data.error || 'Failed to create fund.', 'error');
      }
    } catch { flash('Server connection error.', 'error'); }
  };

  const flash = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  // ── Drill-down view ────────────────────────────────────────────────────────
  if (selectedFund) {
    return <PoolDrillDown fund={selectedFund} onBack={() => setSelectedFund(null)} />;
  }

  // ── List / overview ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {message.text && (
        <div className={`p-4 rounded-lg border text-xs font-medium flex items-center justify-between shadow-md ${message.type === 'success'
          ? 'bg-brand-emerald/10 border-brand-emerald/30 text-brand-emerald'
          : 'bg-brand-crimson/10 border-brand-crimson/30 text-brand-crimson'
          }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage({ text: '', type: '' })} className="font-bold underline text-[10px] uppercase">Dismiss</button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-brand-border/60">
        <div>
          <h2 className="text-lg font-bold text-brand-text">Capital Source Pools</h2>
          <p className="text-xs text-brand-muted mt-0.5">
            Aggregate performance metrics and deployment rates of originating funds.
            <span className="ml-2 text-brand-accent/70">Click any pool card to view its running repayment status.</span>
          </p>
        </div>
        <button
          onClick={() => setShowAddFund(!showAddFund)}
          className="flex items-center gap-1.5 text-xs font-bold bg-brand-accent/20 hover:bg-brand-accent/40 text-brand-text border border-brand-accent/40 px-3 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" /> Register Capital Pool
        </button>
      </div>

      {/* Register form */}
      {showAddFund && (
        <form onSubmit={handleAddFund} className="bg-brand-card border border-brand-accent/30 p-5 rounded-xl space-y-4 max-w-xl shadow-xl">
          <div className="border-b border-brand-border/40 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-accent">Register Capital Source Pool</h3>
            <p className="text-[10px] text-brand-muted mt-0.5">Define new capital reserve channels to fuel credit disbursement.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-brand-muted uppercase block">Fund Name</label>
              <input type="text" required value={newFund.name} onChange={e => setNewFund({ ...newFund, name: e.target.value })}
                className="w-full bg-brand-dark/50 border border-brand-border text-xs px-2.5 py-2 rounded-lg text-brand-text focus:outline-none focus:border-brand-accent mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-brand-muted uppercase block">Total Capital Capacity (₹)</label>
              <input type="number" required min="100000" value={newFund.total_capital} onChange={e => setNewFund({ ...newFund, total_capital: e.target.value })}
                className="w-full bg-brand-dark/50 border border-brand-border text-xs px-2.5 py-2 rounded-lg text-brand-text focus:outline-none focus:border-brand-accent mt-1" />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="submit" className="text-xs font-bold bg-brand-accent hover:bg-brand-accent/80 text-brand-text px-4 py-2 rounded-lg transition-colors">Establish Reserves</button>
            <button type="button" onClick={() => setShowAddFund(false)} className="text-xs bg-brand-border/40 hover:bg-brand-border/60 text-brand-muted px-4 py-2 rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      {/* Pool cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {funds.length > 0 ? funds.map((fund) => {
          const liquid = Math.max(0, fund.total_capital - fund.allocated_capital);
          return (
            <div
              key={fund.id}
              onClick={() => setSelectedFund(fund)}
              className="bg-brand-card border border-brand-border rounded-xl p-6 shadow-xl space-y-5 flex flex-col justify-between cursor-pointer hover:border-brand-accent/40 hover:shadow-2xl transition-premium group"
            >
              {/* Card header */}
              <div>
                <div className="flex justify-between items-start">
                  <div className="bg-brand-dark border border-brand-border p-2.5 rounded-lg group-hover:border-brand-accent/30 transition-colors">
                    <Landmark className="h-5 w-5 text-brand-accent" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20 px-2 py-0.5 rounded-md font-mono font-bold uppercase">
                      Active
                    </span>
                    <span className="text-[9px] text-brand-accent/60 group-hover:text-brand-accent font-semibold transition-colors">
                      View Details →
                    </span>
                  </div>
                </div>
                <h3 className="text-sm font-bold text-brand-text mt-3.5 leading-tight">{fund.name}</h3>
                <span className="text-[10px] text-brand-muted font-mono block mt-1">POOL ID: #PL-00{fund.id}</span>
              </div>

              {/* Capacity breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] text-brand-muted">
                  <span>Capital Capacity</span>
                  <span className="font-bold text-brand-text font-mono">{fmt(fund.total_capital)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-brand-muted">
                  <span>Deployed Capital</span>
                  <span className="font-semibold text-brand-text font-mono">{fmt(fund.allocated_capital)}</span>
                </div>
                <div className="pt-1.5">
                  <div className="flex justify-between items-center text-[10px] text-brand-muted mb-1 font-mono">
                    <span>Deployment Rate</span>
                    <span className="font-bold text-brand-accent">{fund.deployment_rate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-brand-dark/60 h-2 rounded-full overflow-hidden border border-brand-border/40">
                    <div
                      className="bg-brand-accent h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, fund.deployment_rate)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Performance stats */}
              <div className="border-t border-brand-border/50 pt-4 mt-1 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] text-brand-muted uppercase block tracking-wider">Liquid Available</span>
                  <span className="text-xs font-bold text-brand-text font-mono mt-0.5 block">{fmt(liquid)}</span>
                </div>
                <div className="text-right border-l border-brand-border/50 pl-4">
                  <span className="text-[9px] text-brand-muted uppercase block tracking-wider">Revenue Recovered</span>
                  <span className="text-xs font-bold text-brand-emerald font-mono mt-0.5 block">+{fmt(fund.cumulative_revenue)}</span>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-3 bg-brand-card border border-brand-border rounded-xl p-10 text-center text-brand-muted italic">
            No capital source pools registered.
          </div>
        )}
      </div>
    </div>
  );
}
