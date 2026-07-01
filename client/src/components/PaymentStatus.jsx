import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';
import { authFetch } from '../utils/authFetch';
import { Search, RefreshCw, ShieldAlert, CheckCircle, AlertTriangle, Phone, Activity } from 'lucide-react';

const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const HEALTH_CONFIG = {
  Healthy: { pill: 'pill-active', Icon: CheckCircle, animate: '' },
  Warning: { pill: 'pill-warning', Icon: AlertTriangle, animate: '' },
  Critical: { pill: 'pill-warning', Icon: ShieldAlert, animate: 'animate-pulse' },
  Overdue: { pill: 'pill-overdue', Icon: ShieldAlert, animate: 'animate-bounce' },
};

export default function PaymentStatus() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/borrowers/payment-status`);
      setData(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const filtered = data.filter(r =>
    r.borrower_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.fund_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="card-obsidian p-5 h-[calc(100vh-9rem)] flex flex-col">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-brand-border mb-4">
        <div>
          <h2 className="text-[14px] font-semibold text-brand-text flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-accent/60" /> Repayment Health
          </h2>
          <p className="text-[11px] text-brand-muted mt-0.5">Sorted by nearest maturity deadline · Priority ASC</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-brand-muted" />
            <input
              type="text"
              placeholder="Search borrowers or funds…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-obsidian w-full sm:w-52 text-[11px] pl-9 pr-3 py-2"
            />
          </div>
          <button onClick={load}
            className="btn-ghost p-2 flex items-center justify-center" title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto pr-0.5">
        {loading ? (
          <div className="flex h-48 items-center justify-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-brand-accent/30 border-t-brand-accent animate-spin" />
            <span className="text-[11px] text-brand-muted">Calculating repayment schedules…</span>
          </div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-brand-border">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="bg-brand-surface/80 text-[9px] text-brand-muted uppercase tracking-wider border-b border-brand-border">
                  {['Borrower / Loan', 'Fund Pool', 'Principal', 'Total Outstanding', 'Interest Config', 'Maturity', 'DPD', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/30">
                {filtered.map(row => {
                  const cfg = HEALTH_CONFIG[row.health_status] || HEALTH_CONFIG.Healthy;
                  const HIcon = cfg.Icon;
                  return (
                    <tr key={row.loan_id} className="table-row-obsidian text-[11px]">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-brand-text">{row.borrower_name}</div>
                        <div className="text-[10px] text-brand-muted font-mono flex items-center gap-1 mt-0.5">
                          L-{row.loan_id} · <Phone className="h-2.5 w-2.5 inline" /> {row.borrower_phone}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-brand-muted font-medium">{row.fund_name}</td>
                      <td className="px-4 py-3.5 font-mono text-brand-text">{fmt(row.principal_disbursed)}</td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-brand-accent font-mono">{fmt(row.total_outstanding)}</div>
                        <div className="text-[9px] text-brand-muted font-mono mt-0.5">
                          P:{fmt(row.remaining_principal)} · I:{fmt(row.remaining_interest)} · Pen:{fmt(row.remaining_penalty)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-brand-text">{row.interest_rate}% p.a.</span>
                        <span className="ml-1.5 text-[9px] bg-brand-surface border border-brand-border px-1.5 py-0.5 rounded font-mono text-brand-muted uppercase">
                          {row.interest_period}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-brand-muted">
                        {new Date(row.maturity_due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {row.days_until_due > 0 && (
                          <div className="text-[9px] text-brand-emerald mt-0.5">Due in {row.days_until_due}d</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {row.dpd > 0
                          ? <span className="font-bold text-brand-crimson font-mono">{row.dpd} DPD</span>
                          : <span className="text-brand-muted">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`${cfg.pill} inline-flex items-center gap-1`}>
                          <HIcon className={`h-2.5 w-2.5 ${cfg.animate}`} />
                          {row.health_status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand-surface border border-brand-border flex items-center justify-center">
              <Activity className="h-5 w-5 text-brand-muted/30" />
            </div>
            <p className="text-[12px] text-brand-muted">No active loans to track</p>
          </div>
        )}
      </div>
    </div>
  );
}
