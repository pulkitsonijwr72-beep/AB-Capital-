import React from 'react';
import { 
  TrendingUp, 
  ArrowDownRight, 
  ArrowUpRight, 
  ShieldAlert, 
  CheckCircle, 
  DollarSign, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';

export default function LiquidityDashboard({ stats, selectedDate, systemState }) {
  if (!stats) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-brand-muted animate-pulse">Loading Ledger Statistics...</div>
      </div>
    );
  }

  const { liquidity_flow, inflow_split, asset_yield, audit_feed, recent_transactions, overall_portfolio } = stats;

  // Format currency helpers
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Setup data for Charts
  const chartData = [
    { name: 'Principal', value: inflow_split.principal, color: '#10b981' },
    { name: 'Interest', value: inflow_split.interest, color: '#f59e0b' },
    { name: 'Penalty', value: inflow_split.penalty, color: '#ef4444' }
  ].filter(d => d.value > 0);

  const yieldData = [
    { name: 'Interest Accrued', amount: asset_yield.interest_accrued },
    { name: 'Penalty Accrued', amount: asset_yield.penalty_accrued }
  ];

  return (
    <div className="space-y-6">
      {/* Overview Stat Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-brand-card border border-brand-border p-4 rounded-lg shadow-lg">
          <div className="text-brand-muted text-xs uppercase tracking-wider">Total Portfolio AUM</div>
          <div className="text-2xl font-bold text-brand-text mt-1">{formatCurrency(overall_portfolio.total_aum)}</div>
          <div className="text-brand-muted text-xs mt-2 flex justify-between">
            <span>Principal: {formatCurrency(overall_portfolio.outstanding_principal)}</span>
            <span>Active: {overall_portfolio.active_count}</span>
          </div>
        </div>
        <div className="bg-brand-card border border-brand-border p-4 rounded-lg shadow-lg">
          <div className="text-brand-muted text-xs uppercase tracking-wider">Outstanding Interest</div>
          <div className="text-2xl font-bold text-brand-amber mt-1">{formatCurrency(overall_portfolio.outstanding_interest)}</div>
          <div className="text-brand-muted text-xs mt-2">Accrued, unpaid paper yields</div>
        </div>
        <div className="bg-brand-card border border-brand-border p-4 rounded-lg shadow-lg">
          <div className="text-brand-muted text-xs uppercase tracking-wider">Accumulated Penalty</div>
          <div className="text-2xl font-bold text-brand-crimson mt-1">{formatCurrency(overall_portfolio.outstanding_penalty)}</div>
          <div className="text-brand-muted text-xs mt-2">From overdue configurations</div>
        </div>
        <div className="bg-brand-card border border-brand-border p-4 rounded-lg shadow-lg">
          <div className="text-brand-muted text-xs uppercase tracking-wider">System Virtual Date</div>
          <div className="text-2xl font-bold text-brand-accent mt-1">
            {systemState?.system_date ? new Date(systemState.system_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
          </div>
          <div className="text-brand-muted text-xs mt-2">LEDGER SYSTEM CLOCK</div>
        </div>
      </div>

      {/* CORE METRIC CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Daily Liquidity Flow */}
        <div className="bg-brand-card border border-brand-border p-6 rounded-xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-brand-text font-semibold text-sm uppercase tracking-wide">Daily Liquidity Flow</h3>
              <TrendingUp className="text-brand-accent h-5 w-5" />
            </div>
            <p className="text-xs text-brand-muted mt-1">Cash flow events recorded on selected calendar day.</p>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-brand-dark/40 p-3 rounded-lg border border-brand-border/40">
                <span className="text-[10px] text-brand-muted uppercase block">Total Disbursed (Out)</span>
                <span className="text-md font-bold text-brand-crimson flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-4 w-4" />
                  {formatCurrency(liquidity_flow.cash_out)}
                </span>
              </div>
              <div className="bg-brand-dark/40 p-3 rounded-lg border border-brand-border/40">
                <span className="text-[10px] text-brand-muted uppercase block">Recovered (In)</span>
                <span className="text-md font-bold text-brand-emerald flex items-center gap-1 mt-1">
                  <ArrowDownRight className="h-4 w-4" />
                  {formatCurrency(liquidity_flow.cash_in)}
                </span>
              </div>
            </div>
          </div>
          <div className="border-t border-brand-border/60 pt-4 mt-6">
            <div className="flex justify-between items-center">
              <span className="text-xs text-brand-muted">Net Daily Inflow</span>
              <span className={`text-lg font-bold ${liquidity_flow.net_flow >= 0 ? 'text-brand-emerald' : 'text-brand-crimson'}`}>
                {liquidity_flow.net_flow >= 0 ? '+' : ''}{formatCurrency(liquidity_flow.net_flow)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Inflow Recovery Split */}
        <div className="bg-brand-card border border-brand-border p-6 rounded-xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-brand-text font-semibold text-sm uppercase tracking-wide">Inflow Recovery Split</h3>
              <DollarSign className="text-brand-emerald h-5 w-5" />
            </div>
            <p className="text-xs text-brand-muted mt-1">Waterfallen split of cash recovered today.</p>

            <div className="h-28 mt-4 flex items-center justify-center">
              {chartData.length > 0 ? (
                <div className="w-full flex items-center gap-4">
                  <div className="w-1/2 h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          innerRadius={25}
                          outerRadius={45}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-brand-emerald inline-block"></span>Principal</span>
                      <span className="font-semibold">{formatCurrency(inflow_split.principal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-brand-amber inline-block"></span>Interest</span>
                      <span className="font-semibold">{formatCurrency(inflow_split.interest)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-brand-crimson inline-block"></span>Penalty</span>
                      <span className="font-semibold">{formatCurrency(inflow_split.penalty)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-brand-muted italic py-6">No cash recovery logged on this day</div>
              )}
            </div>
          </div>
          <div className="border-t border-brand-border/60 pt-4 mt-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-brand-muted">Total Recovered</span>
              <span className="font-bold text-brand-emerald text-lg">{formatCurrency(inflow_split.total)}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Daily Asset Yield Growth */}
        <div className="bg-brand-card border border-brand-border p-6 rounded-xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-brand-text font-semibold text-sm uppercase tracking-wide">Daily Asset Yield Growth</h3>
              <TrendingUp className="text-brand-amber h-5 w-5" />
            </div>
            <p className="text-xs text-brand-muted mt-1">Automatic paper gains (accrued interest + penalties) generated today.</p>

            <div className="h-28 mt-4">
              {asset_yield.total_accrued > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yieldData} layout="vertical" margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                    <XAxis type="number" stroke="#94a3b8" fontSize={9} />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={9} width={75} />
                    <Tooltip cursor={{fill: '#0f172a'}} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: 10 }} />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                      <Cell fill="#f59e0b" />
                      <Cell fill="#ef4444" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-brand-muted italic text-center py-10">No daily yield accrued (Active/Overdue loans ledger is settled or empty)</div>
              )}
            </div>
          </div>
          <div className="border-t border-brand-border/60 pt-4 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-brand-muted">Combined Paper Growth</span>
              <span className="text-lg font-bold text-brand-amber">{formatCurrency(asset_yield.total_accrued)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MIDNIGHT AUDIT FEED & RECENT TRANSACTIONS LEDGER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Midnight Audit Feed (1/3 Width) */}
        <div className="bg-brand-card border border-brand-border p-5 rounded-xl shadow-xl flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-brand-border/60">
            <div className="flex items-center gap-2">
              <Clock className="text-brand-amber h-4 w-4" />
              <h3 className="text-brand-text font-semibold text-sm uppercase tracking-wider">Midnight Audit Feed</h3>
            </div>
            <span className="text-[10px] bg-brand-dark border border-brand-border px-2 py-0.5 rounded text-brand-muted font-mono">12:00 AM Logs</span>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-80 space-y-3 mt-4 pr-1">
            {audit_feed.length > 0 ? (
              audit_feed.map((log) => {
                const hasPenalty = log.penalty_accrued > 0;
                return (
                  <div key={log.id} className="text-xs bg-brand-dark/30 border border-brand-border/40 p-3 rounded-lg leading-relaxed">
                    <div className="flex justify-between items-center text-[10px] text-brand-muted mb-1 font-mono">
                      <span>Loan #{log.loan_id}</span>
                      <span className={`px-1.5 py-0.5 rounded font-bold ${log.active_tier_label.includes('Tier') ? 'bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/25' : 'bg-brand-accent/15 text-brand-accent border border-brand-accent/25'}`}>
                        {log.active_tier_label}
                      </span>
                    </div>
                    <div className="text-brand-text">
                      Automated daily check on <span className="font-semibold">{log.borrower_name}</span>.
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-brand-border/30 text-[10px] text-brand-muted font-mono">
                      <div>Int Accrued: <span className="text-brand-amber">+{formatCurrency(log.interest_accrued)}</span></div>
                      <div>Penalty: <span className="text-brand-crimson">+{formatCurrency(log.penalty_accrued)}</span></div>
                    </div>
                    <div className="text-[10px] text-brand-muted mt-1.5 font-mono">
                      Snapshot Bal: <span className="text-brand-text font-bold">{formatCurrency(log.total_outstanding_snapshot)}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-brand-muted italic text-center py-10">
                No automated background runs occurred on this day.
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions Ledger (2/3 Width) */}
        <div className="lg:col-span-2 bg-brand-card border border-brand-border p-5 rounded-xl shadow-xl flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-brand-border/60">
            <h3 className="text-brand-text font-semibold text-sm uppercase tracking-wider">Recent Transactions Ledger</h3>
            <span className="text-[10px] bg-brand-emerald/15 text-brand-emerald border border-brand-emerald/30 px-2 py-0.5 rounded font-mono font-bold">Payments Received Today</span>
          </div>

          <div className="flex-1 overflow-x-auto mt-4">
            <table className="w-full text-xs text-left text-brand-text">
              <thead>
                <tr className="border-b border-brand-border text-brand-muted uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-2">Tx ID</th>
                  <th className="py-3 px-3">Borrower</th>
                  <th className="py-3 px-3">Fund Source</th>
                  <th className="py-3 px-3 text-right">Received</th>
                  <th className="py-3 px-3 text-right text-brand-crimson">Penalty Paid</th>
                  <th className="py-3 px-3 text-right text-brand-amber">Interest Paid</th>
                  <th className="py-3 px-3 text-right text-brand-emerald">Principal Reduced</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40 font-mono">
                {recent_transactions.length > 0 ? (
                  recent_transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-brand-slate/40 transition-colors">
                      <td className="py-3.5 px-2">#TX-{tx.id}</td>
                      <td className="py-3.5 px-3 font-sans font-medium text-brand-text">{tx.borrower_name}</td>
                      <td className="py-3.5 px-3 font-sans text-brand-muted">{tx.fund_name}</td>
                      <td className="py-3.5 px-3 text-right font-bold text-brand-emerald">{formatCurrency(tx.total_amount_received)}</td>
                      <td className="py-3.5 px-3 text-right text-brand-crimson">-{formatCurrency(tx.allocated_to_penalty)}</td>
                      <td className="py-3.5 px-3 text-right text-brand-amber">-{formatCurrency(tx.allocated_to_interest)}</td>
                      <td className="py-3.5 px-3 text-right text-brand-emerald">-{formatCurrency(tx.allocated_to_principal)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="py-10 text-center text-brand-muted italic font-sans">
                      No repayments logged on this day. Use the Borrower Dossier view to post partial repayments.
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
