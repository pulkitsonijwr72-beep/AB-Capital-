import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, Landmark, TrendingUp,
  Activity, Trash2, Settings, Clock, Play, RefreshCw,
  Zap, LogOut, Calendar, ChevronRight
} from 'lucide-react';
import { API_BASE } from './config';
import LiquidityDashboard from './components/LiquidityDashboard';
import BorrowerRegistry from './components/BorrowerRegistry';
import FundRegistry from './components/FundRegistry';
import TrashBin from './components/TrashBin';
import PaymentStatus from './components/PaymentStatus';
import { useClock } from './context/ClockContext';
import { useAuth } from './context/AuthContext';
import { authFetch } from './utils/authFetch';

// ── Sidebar navigation definition (exact order specified) ─────────────────
const NAV = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'borrowers', label: 'Borrower Registry', Icon: Users },
  { id: 'funds', label: 'Fund Registry', Icon: Landmark },
  { id: 'liquidity', label: 'Liquidity Dashboard', Icon: TrendingUp },
  { id: 'payment-status', label: 'Payment Status', Icon: Activity },
  { id: 'trash', label: 'Trash Bin', Icon: Trash2 },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

const PAGE_TITLE = {
  dashboard: { h: 'Liquidity Flow & Accruals', sub: 'Daily ledger snapshot' },
  borrowers: { h: 'Borrower Registry', sub: 'Client dossiers & active loans' },
  funds: { h: 'Capital Source Pools', sub: 'Reserve deployment & performance' },
  liquidity: { h: 'Liquidity Dashboard', sub: 'Portfolio AUM & accrual metrics' },
  'payment-status': { h: 'Repayment Health', sub: 'Sorted by nearest deadline' },
  trash: { h: 'Trash Bin', sub: '30-day soft-delete recovery window' },
  settings: { h: 'Settings', sub: 'System configuration' },
};

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [funds, setFunds] = useState([]);
  const { user, logout } = useAuth();

  const {
    systemState, selectedDate, setSelectedDate, stats,
    isAdvancingTime, timeSimulationLogs, setTimeSimulationLogs,
    advanceSystemClock, resetToAutoSync, triggerRefresh
  } = useClock();

  const [targetSystemDate, setTargetSystemDate] = useState('');

  useEffect(() => { fetchFunds(); }, [systemState]);
  useEffect(() => {
    if (systemState?.system_date)
      setTargetSystemDate(new Date(systemState.system_date).toISOString().split('T')[0]);
  }, [systemState]);
  useEffect(() => {
    if (systemState?.system_date)
      setSelectedDate(new Date(systemState.system_date).toISOString().split('T')[0]);
  }, [systemState, setSelectedDate]);

  const fetchFunds = async () => {
    try { const res = await authFetch(`${API_BASE}/funds`); setFunds(await res.json()); }
    catch { /* silent */ }
  };

  const handleAdvance = async (e) => {
    e.preventDefault();
    if (!targetSystemDate) return;
    const res = await advanceSystemClock(targetSystemDate);
    if (res && !res.success) alert(res.error);
  };

  const handleSync = async () => {
    const res = await resetToAutoSync();
    if (res && !res.success) alert(res.error);
  };

  const triggerGlobalRefresh = () => { triggerRefresh(); fetchFunds(); };

  const navigate = (id) => { setCurrentView(id); setTimeSimulationLogs(null); };

  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'U';
  const pg = PAGE_TITLE[currentView] || PAGE_TITLE.dashboard;

  return (
    <div className="flex h-screen w-screen bg-brand-dark overflow-hidden font-sans antialiased">

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside className="w-[240px] shrink-0 flex flex-col border-r border-brand-border bg-brand-slate relative overflow-hidden">

        {/* Ambient violet glow top-left */}
        <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-brand-glow/10 blur-3xl pointer-events-none" />

        {/* Brand mark */}
        <div className="px-5 pt-6 pb-5 border-b border-brand-border relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-accent to-brand-gold-dim flex items-center justify-center font-black text-[13px] text-brand-dark shadow-glow-gold shrink-0">
              AB
            </div>
            <div>
              <p className="text-[13px] font-semibold text-brand-text tracking-tight leading-tight">AB Capital</p>
              <p className="text-[9px] text-brand-muted uppercase tracking-widest mt-0.5">Institutional Ledger</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto relative z-10">
          <p className="text-[9px] text-brand-muted uppercase tracking-widest px-2 pb-2 font-medium">Navigation</p>
          {NAV.map(({ id, label, Icon }) => {
            const active = currentView === id;
            return (
              <button
                key={id}
                onClick={() => navigate(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-premium group ${active ? 'nav-active text-brand-accent' : 'nav-item text-brand-muted'
                  }`}
              >
                <Icon
                  className={`h-[16px] w-[16px] shrink-0 transition-premium ${active ? 'text-brand-accent' : 'text-brand-muted/60 group-hover:text-brand-violet'
                    }`}
                  strokeWidth={active ? 2 : 1.5}
                />
                <span className={`text-[12.5px] font-medium tracking-tight truncate ${active ? 'text-brand-accent font-semibold' : ''}`}>
                  {label}
                </span>
                {active && <ChevronRight className="h-3 w-3 ml-auto shrink-0 text-brand-accent/60" />}
              </button>
            );
          })}
        </nav>

        {/* Bottom: Clock + User ──────────────────────────────────────────── */}
        <div className="px-3 pb-4 space-y-3 border-t border-brand-border pt-3 relative z-10">

          {/* Ledger Clock widget */}
          <div className="card-obsidian p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-brand-accent/70" />
                <span className="text-[9px] text-brand-muted uppercase tracking-widest font-medium">Ledger Clock</span>
              </div>
              {systemState && (
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${systemState.is_manual_override
                    ? 'bg-brand-amber/10 text-brand-amber border border-brand-amber/20'
                    : 'bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20'
                  }`}>
                  {systemState.is_manual_override ? 'Manual' : 'Live'}
                </span>
              )}
            </div>

            <p className="text-[11px] font-semibold text-brand-text font-mono leading-tight">
              {systemState?.system_date
                ? new Date(systemState.system_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'}
            </p>

            {systemState?.is_manual_override && (
              <button onClick={handleSync} disabled={isAdvancingTime}
                className="btn-ghost w-full py-1.5 text-[10px] flex items-center justify-center gap-1.5 disabled:opacity-40">
                <RefreshCw className="h-3 w-3" /> Sync to Today
              </button>
            )}

            <form onSubmit={handleAdvance} className="space-y-1.5 pt-2 border-t border-brand-border">
              <label className="text-[9px] text-brand-muted uppercase tracking-wider block">Advance to</label>
              <input
                type="date" required
                min={systemState?.system_date ? new Date(systemState.system_date).toISOString().split('T')[0] : ''}
                value={targetSystemDate}
                onChange={e => setTargetSystemDate(e.target.value)}
                className="input-obsidian w-full text-[11px] px-2.5 py-1.5 font-mono"
              />
              <button type="submit" disabled={isAdvancingTime}
                className="btn-gold w-full py-1.5 flex items-center justify-center gap-1.5 disabled:opacity-40">
                <Play className="h-2.5 w-2.5 fill-current" />
                {isAdvancingTime ? 'Running…' : 'Advance Date'}
              </button>
            </form>
          </div>

          {/* User card */}
          {user && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-brand-border hover:border-brand-accent/20 transition-premium group cursor-default">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-accent/25 to-brand-violet/20 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-brand-accent">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-brand-text truncate leading-tight">{user.name}</p>
                <p className="text-[9px] text-brand-muted truncate">{user.email}</p>
              </div>
              <button onClick={logout} title="Sign out"
                className="p-1.5 rounded-lg text-brand-muted hover:text-brand-crimson hover:bg-brand-crimson/10 transition-premium opacity-0 group-hover:opacity-100">
                <LogOut className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden bg-brand-dark">

        {/* Top header bar */}
        <header className="h-16 shrink-0 border-b border-brand-border flex items-center justify-between px-7 bg-brand-slate/40">
          <div>
            <h1 className="text-[11px] text-brand-muted font-medium uppercase tracking-widest leading-none">
              AB Capital &nbsp;·&nbsp; Institutional Ledger & Asset-Tracking Platform
            </h1>
            <h2 className="text-[14px] font-semibold text-brand-text tracking-tight mt-0.5 leading-tight">{pg.h}</h2>
          </div>

          {/* Right — Virtual date + Filter picker */}
          <div className="flex items-center gap-3">
            {/* System virtual date badge */}
            {systemState?.system_date && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-brand-border bg-brand-surface/50">
                <Clock className="h-3 w-3 text-brand-accent/60 shrink-0" />
                <span className="text-[10px] text-brand-muted uppercase tracking-wider">System</span>
                <span className="text-[11px] text-brand-text font-mono font-medium">
                  {new Date(systemState.system_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            )}

            {/* Filter date picker — max-width + ml-auto keeps calendar popup inward */}
            <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg border border-brand-border bg-brand-surface/50 max-w-[190px]">
              <Calendar className="h-3 w-3 text-brand-accent shrink-0" />
              <span className="text-[10px] text-brand-muted uppercase tracking-wider whitespace-nowrap">Filter</span>
              <input
                type="date"
                value={selectedDate || (systemState?.system_date ? new Date(systemState.system_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent text-[11px] text-brand-text font-mono focus:outline-none w-[95px] cursor-pointer"
              />
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto px-7 py-6">

          {/* Time advancement notice */}
          {timeSimulationLogs && (
            <div className="mb-5 card-obsidian border-l-2 border-brand-accent p-4 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-brand-accent/5 to-transparent rounded-[12px] pointer-events-none" />
              <div className="flex items-start justify-between gap-4 relative z-10">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-brand-accent uppercase tracking-wider mb-1">
                    <Zap className="h-3.5 w-3.5 fill-current" /> Clock Advanced
                  </div>
                  <p className="text-[12px] text-brand-muted leading-relaxed">
                    System date set to{' '}
                    <span className="text-brand-text font-semibold">
                      {new Date(timeSimulationLogs.system_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>.{' '}
                    <span className="text-brand-accent">{timeSimulationLogs.accruals_logged_count}</span> accrual entries generated.
                  </p>
                  {timeSimulationLogs.accruals?.length > 0 && (
                    <div className="mt-2 max-h-20 overflow-y-auto bg-brand-dark/60 border border-brand-border rounded-lg p-2 text-[10px] font-mono text-brand-muted space-y-0.5">
                      {timeSimulationLogs.accruals.map((a, i) => (
                        <div key={i} className="flex justify-between gap-4">
                          <span>[{new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}] {a.borrowerName} · L-{a.loan_id} · {a.active_tier_label}</span>
                          <span className="text-brand-crimson shrink-0">+{a.penalty_accrued ? `₹${a.penalty_accrued}` : '₹0'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => setTimeSimulationLogs(null)}
                  className="text-[10px] text-brand-muted hover:text-brand-text uppercase tracking-wider shrink-0 transition-premium">
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* View routing — all views also handle 'liquidity' as dashboard alias */}
          {(currentView === 'dashboard' || currentView === 'liquidity') && (
            <LiquidityDashboard stats={stats} selectedDate={selectedDate} systemState={systemState} />
          )}
          {currentView === 'borrowers' && <BorrowerRegistry systemState={systemState} onActionTriggered={triggerGlobalRefresh} />}
          {currentView === 'payment-status' && <PaymentStatus />}
          {currentView === 'funds' && <FundRegistry funds={funds} onActionTriggered={triggerGlobalRefresh} />}
          {currentView === 'trash' && <TrashBin onActionTriggered={triggerGlobalRefresh} />}
          {currentView === 'settings' && (
            <div className="card-obsidian p-8 flex flex-col items-center justify-center min-h-[320px] gap-3">
              <Settings className="h-8 w-8 text-brand-muted/30" />
              <p className="text-sm text-brand-muted">Settings panel — coming soon.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
