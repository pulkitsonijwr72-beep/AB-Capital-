import React, { useState, useEffect } from 'react';
import { 
  Landmark, 
  Plus, 
  Percent, 
  DollarSign, 
  Wallet, 
  ShieldCheck 
} from 'lucide-react';
import { API_BASE } from '../config';

export default function FundRegistry({ funds: initialFunds, onActionTriggered }) {
  const [funds, setFunds] = useState(initialFunds || []);
  const [showAddFund, setShowAddFund] = useState(false);
  const [newFund, setNewFund] = useState({
    name: '',
    total_capital: ''
  });
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (initialFunds) {
      setFunds(initialFunds);
    } else {
      fetchFunds();
    }
  }, [initialFunds]);

  const fetchFunds = async () => {
    try {
      const res = await fetch(`${API_BASE}/funds`);
      const data = await res.json();
      setFunds(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddFund = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/funds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFund.name,
          total_capital: parseFloat(newFund.total_capital)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setNewFund({ name: '', total_capital: '' });
        setShowAddFund(false);
        fetchFunds();
        if (onActionTriggered) onActionTriggered();
        triggerMessage('Capital fund source registered successfully!', 'success');
      } else {
        triggerMessage(data.error || 'Failed to create fund.', 'error');
      }
    } catch (e) {
      triggerMessage('Server connection error.', 'error');
    }
  };

  const triggerMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Messages */}
      {message.text && (
        <div className={`p-4 rounded-lg border text-xs font-medium flex items-center justify-between shadow-md ${message.type === 'success' ? 'bg-brand-emerald/10 border-brand-emerald/30 text-brand-emerald' : 'bg-brand-crimson/10 border-brand-crimson/30 text-brand-crimson'}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage({ text: '', type: '' })} className="font-bold underline text-[10px] uppercase">Dismiss</button>
        </div>
      )}

      {/* Header controls */}
      <div className="flex justify-between items-center pb-4 border-b border-brand-border/60">
        <div>
          <h2 className="text-lg font-bold text-brand-text">Capital Source Pools</h2>
          <p className="text-xs text-brand-muted mt-0.5">Aggregate performance metrics and deployment rates of originating funds.</p>
        </div>
        <button 
          onClick={() => setShowAddFund(!showAddFund)}
          className="flex items-center gap-1.5 text-xs font-bold bg-brand-accent/20 hover:bg-brand-accent/40 text-brand-text border border-brand-accent/40 px-3 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" /> Register Capital Pool
        </button>
      </div>

      {/* Register Fund Form (Collapsible) */}
      {showAddFund && (
        <form onSubmit={handleAddFund} className="bg-brand-card border border-brand-accent/30 p-5 rounded-xl space-y-4 max-w-xl shadow-xl">
          <div className="border-b border-brand-border/40 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-accent">Register Capital Source Pool</h3>
            <p className="text-[10px] text-brand-muted mt-0.5">Define new capital reserve channels to fuel credit disbursement.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-brand-muted uppercase block">Fund Name</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Alpha Capital Reserve"
                value={newFund.name}
                onChange={e => setNewFund({...newFund, name: e.target.value})}
                className="w-full bg-brand-dark/50 border border-brand-border text-xs px-2.5 py-2 rounded-lg text-brand-text focus:outline-none focus:border-brand-accent mt-1" 
              />
            </div>
            <div>
              <label className="text-[10px] text-brand-muted uppercase block">Total Capital Capacity (₹)</label>
              <input 
                type="number" 
                required
                min="100000"
                placeholder="e.g. 50000000"
                value={newFund.total_capital}
                onChange={e => setNewFund({...newFund, total_capital: e.target.value})}
                className="w-full bg-brand-dark/50 border border-brand-border text-xs px-2.5 py-2 rounded-lg text-brand-text focus:outline-none focus:border-brand-accent mt-1" 
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="submit" className="text-xs font-bold bg-brand-accent hover:bg-brand-accent/80 text-brand-text px-4 py-2 rounded-lg transition-colors">
              Establish Reserves
            </button>
            <button type="button" onClick={() => setShowAddFund(false)} className="text-xs bg-brand-border/40 hover:bg-brand-border/60 text-brand-muted px-4 py-2 rounded-lg">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Pools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {funds.length > 0 ? (
          funds.map((fund) => {
            const liquidCapital = Math.max(0, fund.total_capital - fund.allocated_capital);
            
            return (
              <div key={fund.id} className="bg-brand-card border border-brand-border rounded-xl p-6 shadow-xl space-y-5 flex flex-col justify-between hover:border-brand-accent/40 transition-premium">
                {/* Header */}
                <div>
                  <div className="flex justify-between items-start">
                    <div className="bg-brand-dark border border-brand-border p-2.5 rounded-lg">
                      <Landmark className="h-5 w-5 text-brand-accent" />
                    </div>
                    <span className="text-[9px] bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20 px-2 py-0.5 rounded-md font-mono font-bold uppercase">
                      Active
                    </span>
                  </div>
                  
                  <h3 className="text-sm font-bold text-brand-text mt-3.5 leading-tight">{fund.name}</h3>
                  <span className="text-[10px] text-brand-muted font-mono block mt-1">POOL ID: #PL-00{fund.id}</span>
                </div>

                {/* Capacity breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] text-brand-muted">
                    <span>Capital Capacity</span>
                    <span className="font-bold text-brand-text font-mono">{formatCurrency(fund.total_capital)}</span>
                  </div>
                  
                  <div className="flex justify-between text-[11px] text-brand-muted">
                    <span>Deployed Capital</span>
                    <span className="font-semibold text-brand-text font-mono">{formatCurrency(fund.allocated_capital)}</span>
                  </div>

                  {/* Progress utilization */}
                  <div className="pt-1.5">
                    <div className="flex justify-between items-center text-[10px] text-brand-muted mb-1 font-mono">
                      <span>Deployment Rate</span>
                      <span className="font-bold text-brand-accent">{fund.deployment_rate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-brand-dark/60 h-2 rounded-full overflow-hidden border border-brand-border/40">
                      <div 
                        className="bg-brand-accent h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, fund.deployment_rate)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Performance stats */}
                <div className="border-t border-brand-border/50 pt-4 mt-1 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] text-brand-muted uppercase block tracking-wider">Liquid Available</span>
                    <span className="text-xs font-bold text-brand-text font-mono mt-0.5 block">{formatCurrency(liquidCapital)}</span>
                  </div>
                  <div className="text-right border-l border-brand-border/50 pl-4">
                    <span className="text-[9px] text-brand-muted uppercase block tracking-wider">Revenue Recovered</span>
                    <span className="text-xs font-bold text-brand-emerald font-mono mt-0.5 block">+{formatCurrency(fund.cumulative_revenue)}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-3 bg-brand-card border border-brand-border rounded-xl p-10 text-center text-brand-muted italic">
            No capital source pools registered.
          </div>
        )}
      </div>
    </div>
  );
}
