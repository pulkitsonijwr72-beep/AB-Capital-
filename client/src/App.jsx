import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Landmark, 
  Calendar, 
  Clock, 
  Play, 
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { API_BASE } from './config';
import LiquidityDashboard from './components/LiquidityDashboard';
import BorrowerRegistry from './components/BorrowerRegistry';
import FundRegistry from './components/FundRegistry';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [systemState, setSystemState] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [stats, setStats] = useState(null);
  const [funds, setFunds] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Time advancement controller state
  const [targetSystemDate, setTargetSystemDate] = useState('');
  const [timeSimulationLogs, setTimeSimulationLogs] = useState(null);
  const [isAdvancingTime, setIsAdvancingTime] = useState(false);

  useEffect(() => {
    fetchSystemState();
    fetchFunds();
  }, [refreshTrigger]);

  useEffect(() => {
    if (selectedDate) {
      fetchDashboardStats(selectedDate);
    }
  }, [selectedDate, refreshTrigger]);

  const fetchSystemState = async () => {
    try {
      const res = await fetch(`${API_BASE}/system`);
      const data = await res.json();
      setSystemState(data);
      
      // Initialize selectedDate to current virtual system date if not set
      const systemDateStr = new Date(data.system_date).toISOString().split('T')[0];
      if (!selectedDate) {
        setSelectedDate(systemDateStr);
      }
      setTargetSystemDate(systemDateStr);
    } catch (e) {
      console.error('Error fetching system state:', e);
    }
  };

  const fetchDashboardStats = async (dateStr) => {
    try {
      const res = await fetch(`${API_BASE}/system/dashboard?date=${dateStr}`);
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  };

  const fetchFunds = async () => {
    try {
      const res = await fetch(`${API_BASE}/funds`);
      const data = await res.json();
      setFunds(data);
    } catch (e) {
      console.error('Error fetching funds:', e);
    }
  };

  const handleAdvanceSystemClock = async (e) => {
    e.preventDefault();
    if (!targetSystemDate) return;
    
    setIsAdvancingTime(true);
    setTimeSimulationLogs(null);
    
    try {
      const res = await fetch(`${API_BASE}/system`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_date: targetSystemDate })
      });
      const data = await res.json();
      if (res.ok) {
        setRefreshTrigger(prev => prev + 1);
        setSelectedDate(targetSystemDate); // automatically focus statistics on advanced date
        setTimeSimulationLogs(data);
      } else {
        alert(data.error || 'Failed to advance ledger clock.');
      }
    } catch (e) {
      console.error(e);
      alert('Error connecting to Server.');
    } finally {
      setIsAdvancingTime(false);
    }
  };

  const triggerGlobalRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="flex h-screen bg-brand-dark overflow-hidden font-sans">
      
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-80 bg-brand-slate border-r border-brand-border flex flex-col justify-between shrink-0">
        <div>
          {/* Logo Brand Panel */}
          <div className="p-6 border-b border-brand-border/60">
            <div className="flex items-center gap-2">
              <div className="bg-brand-accent p-2 rounded-lg text-brand-dark font-extrabold text-sm tracking-wider font-mono shadow-md">
                AB
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-brand-text leading-none tracking-tight">AB Capital</h1>
                <span className="text-[9px] uppercase tracking-wider text-brand-muted font-bold block mt-1">Finance and Funding Firm</span>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5">
            <button
              onClick={() => { setCurrentView('dashboard'); setTimeSimulationLogs(null); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-semibold transition-premium ${currentView === 'dashboard' ? 'bg-brand-card border border-brand-border text-brand-text shadow-lg' : 'text-brand-muted hover:text-brand-text hover:bg-brand-card/35'}`}
            >
              <div className="flex items-center gap-2.5">
                <TrendingUp className={`h-4 w-4 ${currentView === 'dashboard' ? 'text-brand-accent' : ''}`} />
                <span>Liquidity & Accruals</span>
              </div>
              <ChevronRight className="h-3 w-3 opacity-60" />
            </button>

            <button
              onClick={() => { setCurrentView('borrowers'); setTimeSimulationLogs(null); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-semibold transition-premium ${currentView === 'borrowers' ? 'bg-brand-card border border-brand-border text-brand-text shadow-lg' : 'text-brand-muted hover:text-brand-text hover:bg-brand-card/35'}`}
            >
              <div className="flex items-center gap-2.5">
                <Users className={`h-4 w-4 ${currentView === 'borrowers' ? 'text-brand-accent' : ''}`} />
                <span>Borrowers & Dossiers</span>
              </div>
              <ChevronRight className="h-3 w-3 opacity-60" />
            </button>

            <button
              onClick={() => { setCurrentView('funds'); setTimeSimulationLogs(null); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-semibold transition-premium ${currentView === 'funds' ? 'bg-brand-card border border-brand-border text-brand-text shadow-lg' : 'text-brand-muted hover:text-brand-text hover:bg-brand-card/35'}`}
            >
              <div className="flex items-center gap-2.5">
                <Landmark className={`h-4 w-4 ${currentView === 'funds' ? 'text-brand-accent' : ''}`} />
                <span>Capital Source Pools</span>
              </div>
              <ChevronRight className="h-3 w-3 opacity-60" />
            </button>
          </nav>
        </div>

        {/* TIME ADVANCEMENT CONTROLLER WIDGET */}
        <div className="p-4 border-t border-brand-border/60 bg-brand-dark/20 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="text-brand-accent h-4 w-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text">Ledger Clock System</h3>
          </div>
          
          <div className="bg-brand-card border border-brand-border/70 p-3.5 rounded-lg space-y-3">
            <div className="text-[10px] text-brand-muted uppercase">Current System Date</div>
            <div className="text-sm font-extrabold text-brand-text font-mono">
              {systemState?.system_date 
                ? new Date(systemState.system_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                : 'Connecting...'
              }
            </div>

            <form onSubmit={handleAdvanceSystemClock} className="space-y-2 pt-2 border-t border-brand-border/40">
              <label className="text-[9px] text-brand-muted uppercase block">Fast-Forward To Date</label>
              <input 
                type="date"
                required
                min={systemState?.system_date ? new Date(systemState.system_date).toISOString().split('T')[0] : ''}
                value={targetSystemDate}
                onChange={e => setTargetSystemDate(e.target.value)}
                className="w-full bg-brand-dark border border-brand-border text-xs px-2 py-1.5 rounded text-brand-text font-mono focus:outline-none focus:border-brand-accent"
              />
              <button 
                type="submit"
                disabled={isAdvancingTime}
                className="w-full text-[10px] uppercase font-bold bg-brand-accent hover:bg-brand-accent/80 text-brand-dark py-1.5 rounded-md flex items-center justify-center gap-1 transition-colors shadow-md disabled:opacity-50"
              >
                <Play className="h-3 w-3 fill-current" /> {isAdvancingTime ? 'Simulating...' : 'Advance System Date'}
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN CONTAINER */}
      <main className="flex-1 flex flex-col overflow-hidden bg-brand-slate/40">
        
        {/* HEADER BAR */}
        <header className="h-20 bg-brand-card border-b border-brand-border flex items-center justify-between px-8 shrink-0">
          <div>
            <h2 className="text-base font-extrabold text-brand-text tracking-wide uppercase">
              {currentView === 'dashboard' && 'Liquidity Flow & Accruals'}
              {currentView === 'borrowers' && 'Borrower Registry & Recipient Dossier'}
              {currentView === 'funds' && 'Originating Capital Reserve Pools'}
            </h2>
            <span className="text-[10px] text-brand-muted font-mono uppercase block mt-0.5">Private Bookkeeping Console</span>
          </div>

          {/* Master Date Picker */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-brand-muted uppercase flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-brand-accent" /> Ledger Filter Date:
            </span>
            <input 
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-brand-dark border border-brand-border text-xs px-3 py-1.5 rounded-lg text-brand-text font-mono focus:outline-none focus:border-brand-accent shadow-sm"
            />
          </div>
        </header>

        {/* VIEW CONTENTS PORTPORTAL */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {/* Time simulation notification drawer */}
          {timeSimulationLogs && (
            <div className="mb-6 bg-brand-accent/10 border border-brand-accent/30 p-4 rounded-xl shadow-lg relative overflow-hidden">
              <div className="flex items-center gap-2 text-brand-accent text-xs font-extrabold uppercase mb-2">
                <Zap className="h-4 w-4 fill-current" /> Time Advancement Complete
              </div>
              <p className="text-xs text-brand-text leading-relaxed">
                Ledger system clock successfully advanced to <span className="font-bold text-brand-accent">{new Date(timeSimulationLogs.system_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>.
                Generated <span className="font-bold text-brand-accent">{timeSimulationLogs.accruals_logged_count}</span> daily audit entries.
              </p>
              {timeSimulationLogs.accruals && timeSimulationLogs.accruals.length > 0 && (
                <div className="mt-3 max-h-28 overflow-y-auto bg-brand-dark/50 border border-brand-border/40 p-2.5 rounded-lg text-[10px] font-mono text-brand-muted space-y-1">
                  {timeSimulationLogs.accruals.map((a, i) => (
                    <div key={i} className="flex justify-between">
                      <span>[{new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}] {a.borrowerName} (Loan #{a.loan_id}) &bull; {a.active_tier_label}</span>
                      <span className="text-brand-crimson font-bold">+{a.penalty_accrued ? `₹${a.penalty_accrued}` : '₹0'}</span>
                    </div>
                  ))}
                </div>
              )}
              <button 
                onClick={() => setTimeSimulationLogs(null)}
                className="absolute right-4 top-4 text-xs font-bold text-brand-muted hover:text-brand-text uppercase underline"
              >
                Clear Notice
              </button>
            </div>
          )}

          {currentView === 'dashboard' && (
            <LiquidityDashboard 
              stats={stats} 
              selectedDate={selectedDate}
              systemState={systemState}
            />
          )}

          {currentView === 'borrowers' && (
            <BorrowerRegistry 
              systemState={systemState}
              onActionTriggered={triggerGlobalRefresh}
            />
          )}

          {currentView === 'funds' && (
            <FundRegistry 
              funds={funds}
              onActionTriggered={triggerGlobalRefresh}
            />
          )}
        </div>
      </main>
    </div>
  );
}
