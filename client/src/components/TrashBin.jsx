import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertTriangle, Calendar, RefreshCw } from 'lucide-react';
import { API_BASE } from '../config';

export default function TrashBin({ onActionTriggered }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    fetchTrashItems();
  }, []);

  const fetchTrashItems = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/trash`);
      const data = await res.json();
      setItems(data);
    } catch (e) {
      console.error('Error fetching trash items:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (type, id) => {
    try {
      const res = await fetch(`${API_BASE}/trash/restore/${type}/${id}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback(data.message || 'Item restored successfully!', 'success');
        fetchTrashItems();
        if (onActionTriggered) onActionTriggered();
      } else {
        showFeedback(data.error || 'Failed to restore item.', 'error');
      }
    } catch (e) {
      showFeedback('Server communication error.', 'error');
    }
  };

  const handlePurge = async (type, id) => {
    if (!confirm('Are you absolutely sure you want to permanently delete this item? This action is irreversible.')) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/trash/purge-now/${type}/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback(data.message || 'Item permanently purged.', 'success');
        fetchTrashItems();
        if (onActionTriggered) onActionTriggered();
      } else {
        showFeedback(data.error || 'Failed to purge item.', 'error');
      }
    } catch (e) {
      showFeedback('Server communication error.', 'error');
    }
  };

  const showFeedback = (text, type) => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 5000);
  };

  return (
    <div className="bg-brand-card border border-brand-border rounded-xl shadow-xl p-6 h-[calc(100vh-14rem)] flex flex-col">
      <div className="flex justify-between items-center border-b border-brand-border/60 pb-4 mb-6">
        <div>
          <h2 className="text-lg font-extrabold text-brand-text">Trash Bin (30-Day Recovery)</h2>
          <p className="text-xs text-brand-muted mt-1">
            Entities are soft-deleted for 30 days. After 30 days, they are permanently purged from the ledger system automatically.
          </p>
        </div>
        <button
          onClick={fetchTrashItems}
          className="flex items-center gap-1.5 text-xs bg-brand-dark hover:bg-brand-dark/70 text-brand-text border border-brand-border px-3 py-1.5 rounded-lg transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Bin
        </button>
      </div>

      {actionMessage && (
        <div className={`mb-4 p-3.5 rounded-lg border text-xs font-medium flex justify-between items-center ${
          actionMessage.type === 'success' 
            ? 'bg-brand-emerald/10 border-brand-emerald/30 text-brand-emerald' 
            : 'bg-brand-crimson/10 border-brand-crimson/30 text-brand-crimson'
        }`}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="underline text-[10px] uppercase font-bold">Dismiss</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-xs text-brand-muted animate-pulse">
            Loading soft-deleted registry entries...
          </div>
        ) : items.length > 0 ? (
          <div className="border border-brand-border rounded-xl overflow-hidden bg-brand-slate/10 divide-y divide-brand-border/60">
            {items.map((item) => (
              <div 
                key={`${item.type}-${item.id}`} 
                className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-brand-slate/20 transition-premium"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded border ${
                      item.type === 'borrower' 
                        ? 'bg-brand-accent/10 text-brand-accent border-brand-accent/30' 
                        : item.type === 'loan'
                        ? 'bg-brand-amber/10 text-brand-amber border-brand-amber/30'
                        : 'bg-brand-emerald/10 text-brand-emerald border-brand-emerald/30'
                    }`}>
                      {item.type}
                    </span>
                    <span className="text-sm font-semibold text-brand-text">{item.label}</span>
                  </div>
                  <div className="text-xs text-brand-muted font-mono">{item.sub_label}</div>
                  <div className="text-[10px] text-brand-muted flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Soft-deleted on:{' '}
                    <span className="font-mono text-brand-text">
                      {new Date(item.deleted_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-stretch md:self-auto justify-between md:justify-end">
                  {/* Days remaining count badge */}
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className={`h-4 w-4 ${item.days_remaining <= 5 ? 'text-brand-crimson animate-pulse' : 'text-brand-amber'}`} />
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      item.days_remaining <= 5 
                        ? 'bg-brand-crimson/15 text-brand-crimson border-brand-crimson/30 font-extrabold' 
                        : 'bg-brand-amber/15 text-brand-amber border-brand-amber/30'
                    }`}>
                      {item.days_remaining} Days Left
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRestore(item.type, item.id)}
                      className="flex items-center gap-1 text-xs bg-brand-emerald/10 hover:bg-brand-emerald/20 text-brand-emerald border border-brand-emerald/30 px-3 py-1.5 rounded-lg transition-colors font-medium"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Restore Data
                    </button>
                    <button
                      onClick={() => handlePurge(item.type, item.id)}
                      className="flex items-center gap-1 text-xs bg-brand-crimson/10 hover:bg-brand-crimson/20 text-brand-crimson border border-brand-crimson/30 px-3 py-1.5 rounded-lg transition-colors font-medium"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Purge Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-brand-muted border border-dashed border-brand-border/60 rounded-xl bg-brand-slate/5">
            <Trash2 className="h-10 w-10 text-brand-border/80 mb-2" />
            <p className="text-sm">Trash Bin is empty.</p>
          </div>
        )}
      </div>
    </div>
  );
}
