import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Clock, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area } from 'recharts';

const fmt = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

// ── Recharts custom tooltip ──────────────────────────────────────────────────
function ObsidianTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#141417', border: '1px solid #232326', borderRadius: 8, padding: '8px 12px', fontSize: 11 }}>
      {label && <p style={{ color: '#71717A', marginBottom: 4 }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill || p.stroke || '#E6C17A', fontWeight: 600, fontFamily: 'monospace' }}>
          {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

// ── Arc Liquidity Speedometer ────────────────────────────────────────────────
function ArcGauge({ pct = 0, label, color = '#E6C17A' }) {
  const r = 40, cx = 52, cy = 52;
  const circum = Math.PI * r; // half-circle
  const arc = circum * Math.min(pct / 100, 1);
  return (
    <svg viewBox="0 0 104 60" className="w-full h-auto max-w-[140px] mx-auto">
      {/* Track */}
      <path d={`M12,52 A${r},${r} 0 0,1 92,52`} fill="none" stroke="#232326" strokeWidth="7" strokeLinecap="round" />
      {/* Fill */}
      <path d={`M12,52 A${r},${r} 0 0,1 92,52`} fill="none" stroke={color} strokeWidth="7"
        strokeLinecap="round" strokeDasharray={`${arc} ${circum}`}
        style={{ filter: `drop-shadow(0 0 5px ${color}88)` }} />
      <text x={cx} y={cy - 4} textAnchor="middle" fill={color} fontSize="12" fontWeight="700" fontFamily="monospace">
        {pct.toFixed(0)}%
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#71717A" fontSize="7.5" fontFamily="sans-serif" letterSpacing="0.08em" textTransform="uppercase">
        {label}
      </text>
    </svg>
  );
}

export default function LiquidityDashboard({ stats, selectedDate, systemState }) {
  if (!stats) {
    return (
      <div className="flex h-80 items-center justify-center gap-3">
        <div className="w-6 h-6 rounded-full border-2 border-brand-accent/30 border-t-brand-accent animate-spin" />
        <span className="text-sm text-brand-muted">Loading ledger statistics…</span>
      </div>
    );
  }

  const { liquidity_flow, inflow_split, asset_yield, audit_feed, recent_transactions, overall_portfolio } = stats;

  const pieData = [
    { name: 'Principal', value: inflow_split.principal, color: '#4ADE80' },
    { name: 'Interest', value: inflow_split.interest, color: '#E6C17A' },
    { name: 'Penalty', value: inflow_split.penalty, color: '#F87171' },
  ].filter(d => d.value > 0);

  const barData = [
    { name: 'Interest', amount: asset_yield.interest_accrued },
    { name: 'Penalty', amount: asset_yield.penalty_accrued },
  ];

  // Deployment health %
  const totalCapacity = overall_portfolio.outstanding_principal + 1;
  const deployedPct = Math.min(100, (overall_portfolio.outstanding_principal / totalCapacity) * 100);

  return (
    <div className="space-y-5">

      {/* ── Stat ribbon (4 metric cards) ──────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Total Portfolio Value */}
        <div className="card-obsidian p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-accent/5 rounded-full blur-2xl pointer-events-none" />
          <p className="metric-sub uppercase tracking-wider mb-2">Total Portfolio AUM</p>
          <p className="metric-hero text-gold-gradient">{fmt(overall_portfolio.total_aum)}</p>
          <div className="mt-3 flex items-center gap-3 text-[11px] text-brand-muted">
            <span>Principal: {fmt(overall_portfolio.outstanding_principal)}</span>
            <span className="pill-violet">{overall_portfolio.active_count} Active</span>
          </div>
        </div>

        {/* Liquidity Health Score — arc gauge */}
        <div className="card-obsidian p-4 flex flex-col items-center justify-center">
          <p className="metric-sub uppercase tracking-wider mb-2 self-start">Liquidity Health</p>
          <ArcGauge pct={100 - Math.min(100, (overall_portfolio.outstanding_penalty / (overall_portfolio.total_aum || 1)) * 100)} label="Score" color="#E6C17A" />
        </div>

        {/* Active Borrowers / Interest */}
        <div className="card-obsidian p-5 relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-brand-violet/5 rounded-full blur-2xl pointer-events-none" />
          <p className="metric-sub uppercase tracking-wider mb-2">Outstanding Interest</p>
          <p className="metric-hero text-brand-amber">{fmt(overall_portfolio.outstanding_interest)}</p>
          <p className="text-[11px] text-brand-muted mt-3">Accrued unpaid paper yields</p>
        </div>

        {/* Available Fund Capacity */}
        <div className="card-obsidian p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-brand-emerald/5 rounded-full blur-2xl pointer-events-none" />
          <p className="metric-sub uppercase tracking-wider mb-2">Accumulated Penalty</p>
          <p className="metric-hero text-brand-crimson">{fmt(overall_portfolio.outstanding_penalty)}</p>
          <p className="text-[11px] text-brand-muted mt-3">From overdue configurations</p>
        </div>
      </div>

      {/* ── 3 metric cards row ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Daily Liquidity Flow */}
        <div className="card-obsidian p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[12px] font-semibold text-brand-text tracking-tight">Daily Liquidity Flow</h3>
              <Activity className="h-4 w-4 text-brand-accent/50" />
            </div>
            <p className="text-[11px] text-brand-muted mb-4">Cash flow on selected date</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-brand-crimson/5 border border-brand-crimson/12 rounded-lg p-3">
                <span className="metric-sub uppercase block mb-1">Disbursed Out</span>
                <span className="text-[13px] font-semibold text-brand-crimson flex items-center gap-1">
                  <ArrowUpRight className="h-3.5 w-3.5" />{fmt(liquidity_flow.cash_out)}
                </span>
              </div>
              <div className="bg-brand-emerald/5 border border-brand-emerald/12 rounded-lg p-3">
                <span className="metric-sub uppercase block mb-1">Recovered In</span>
                <span className="text-[13px] font-semibold text-brand-emerald flex items-center gap-1">
                  <ArrowDownRight className="h-3.5 w-3.5" />{fmt(liquidity_flow.cash_in)}
                </span>
              </div>
            </div>
          </div>
          <div className="border-t border-brand-border mt-4 pt-3.5 flex justify-between items-center">
            <span className="text-[11px] text-brand-muted">Net Daily Inflow</span>
            <span className={`text-[15px] font-semibold font-mono ${liquidity_flow.net_flow >= 0 ? 'text-brand-emerald' : 'text-brand-crimson'}`}>
              {liquidity_flow.net_flow >= 0 ? '+' : ''}{fmt(liquidity_flow.net_flow)}
            </span>
          </div>
        </div>

        {/* Inflow Recovery Split — donut */}
        <div className="card-obsidian p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[12px] font-semibold text-brand-text tracking-tight">Inflow Recovery Split</h3>
              <DollarSign className="h-4 w-4 text-brand-emerald/50" />
            </div>
            <p className="text-[11px] text-brand-muted mb-3">Waterfall allocation today</p>

            <div className="h-28 flex items-center justify-center">
              {pieData.length > 0 ? (
                <div className="w-full flex items-center gap-3">
                  <div className="w-[45%] h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} innerRadius={26} outerRadius={44} paddingAngle={3} dataKey="value" strokeWidth={0}>
                          {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-1.5 text-[11px]">
                    {pieData.map((d) => (
                      <div key={d.name} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-brand-muted">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                          {d.name}
                        </span>
                        <span className="font-mono font-semibold text-brand-text">{fmt(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-brand-muted italic">No recovery on this day</p>
              )}
            </div>
          </div>
          <div className="border-t border-brand-border mt-4 pt-3.5 flex justify-between items-center">
            <span className="text-[11px] text-brand-muted">Total Recovered</span>
            <span className="text-[15px] font-semibold text-brand-emerald font-mono">{fmt(inflow_split.total)}</span>
          </div>
        </div>

        {/* Daily Asset Yield — bar chart */}
        <div className="card-obsidian p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[12px] font-semibold text-brand-text tracking-tight">Daily Asset Yield</h3>
              <TrendingUp className="h-4 w-4 text-brand-accent/50" />
            </div>
            <p className="text-[11px] text-brand-muted mb-3">Paper gains accrued today</p>

            <div className="h-28">
              {asset_yield.total_accrued > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ left: -10, right: 8, top: 4, bottom: 4 }}>
                    <XAxis type="number" stroke="rgba(113,113,122,0.4)" fontSize={8} tickLine={false} />
                    <YAxis type="category" dataKey="name" stroke="rgba(113,113,122,0.4)" fontSize={9} width={52} tickLine={false} />
                    <Tooltip content={<ObsidianTooltip />} cursor={{ fill: 'rgba(230,193,122,0.04)' }} />
                    <Bar dataKey="amount" radius={[0, 5, 5, 0]}>
                      <Cell fill="#E6C17A" />
                      <Cell fill="#F87171" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-[11px] text-brand-muted italic">No yield accrued yet</p>
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-brand-border mt-4 pt-3.5 flex justify-between items-center">
            <span className="text-[11px] text-brand-muted">Combined Paper Growth</span>
            <span className="text-[15px] font-semibold text-brand-accent font-mono">{fmt(asset_yield.total_accrued)}</span>
          </div>
        </div>
      </div>

      {/* ── Audit feed + Transactions ledger ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Midnight Audit Feed */}
        <div className="card-obsidian p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-brand-border mb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-brand-amber/70" />
              <h3 className="text-[12px] font-semibold text-brand-text">Midnight Audit Feed</h3>
            </div>
            <span className="text-[9px] bg-brand-surface border border-brand-border px-2 py-0.5 rounded-lg text-brand-muted font-mono uppercase">12:00 AM</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 max-h-72 pr-0.5">
            {audit_feed.length > 0 ? audit_feed.map((log) => {
              const isOverdue = log.active_tier_label.includes('Tier') || log.active_tier_label.includes('Overdue');
              return (
                <div key={log.id} className="bg-brand-surface/60 rounded-lg p-3 text-[11px] space-y-1.5 border border-brand-border/40">
                  <div className="flex items-center justify-between">
                    <span className="text-brand-muted font-mono text-[10px]">L-{log.loan_id}</span>
                    <span className={isOverdue ? 'pill-overdue' : 'pill-active'}>{log.active_tier_label}</span>
                  </div>
                  <p className="text-brand-text">Daily accrual — <span className="font-semibold">{log.borrower_name}</span></p>
                  <div className="flex gap-4 text-[10px] font-mono pt-1 border-t border-brand-border">
                    <span className="text-brand-accent">Int: +{fmt(log.interest_accrued)}</span>
                    <span className="text-brand-crimson">Pen: +{fmt(log.penalty_accrued)}</span>
                  </div>
                </div>
              );
            }) : (
              <div className="flex h-32 items-center justify-center text-[11px] text-brand-muted italic">
                No accruals on this day
              </div>
            )}
          </div>
        </div>

        {/* Asset-Tracking Ledger Table */}
        <div className="lg:col-span-2 card-obsidian p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-brand-border mb-3">
            <h3 className="text-[12px] font-semibold text-brand-text">Asset-Tracking Ledger</h3>
            <span className="pill-active">Payments Today</span>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full min-w-[560px] text-[11px]">
              <thead>
                <tr className="text-[9px] text-brand-muted uppercase tracking-wider border-b border-brand-border">
                  <th className="pb-2.5 pr-3 text-left font-medium">Tx ID</th>
                  <th className="pb-2.5 pr-3 text-left font-medium">Borrower</th>
                  <th className="pb-2.5 pr-3 text-left font-medium">Fund</th>
                  <th className="pb-2.5 pr-3 text-right font-medium">Received</th>
                  <th className="pb-2.5 pr-3 text-right font-medium">Penalty</th>
                  <th className="pb-2.5 pr-3 text-right font-medium">Interest</th>
                  <th className="pb-2.5 text-right font-medium">Principal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/30">
                {recent_transactions.length > 0 ? recent_transactions.map((tx) => (
                  <tr key={tx.id} className="table-row-obsidian">
                    <td className="py-3 pr-3 font-mono text-brand-muted">#{tx.id}</td>
                    <td className="py-3 pr-3 font-semibold text-brand-text">{tx.borrower_name}</td>
                    <td className="py-3 pr-3 text-brand-muted">{tx.fund_name}</td>
                    <td className="py-3 pr-3 text-right font-mono font-semibold text-brand-emerald">{fmt(tx.total_amount_received)}</td>
                    <td className="py-3 pr-3 text-right font-mono text-brand-crimson">-{fmt(tx.allocated_to_penalty)}</td>
                    <td className="py-3 pr-3 text-right font-mono text-brand-accent">-{fmt(tx.allocated_to_interest)}</td>
                    <td className="py-3 text-right font-mono text-brand-emerald">-{fmt(tx.allocated_to_principal)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="7" className="py-10 text-center text-brand-muted italic text-[11px]">
                      No repayments on this date
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
