import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertTriangle, Calendar, RefreshCw, X } from 'lucide-react';
import { API_BASE } from '../config';
import { authFetch } from '../utils/authFetch';

const TYPE_PILL = {
  borrower: 'pill-violet',
  loan: 'pill-pending',
  transaction: 'pill-active',
};

export default function TrashBin({ onActionTriggered }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { const res = await authFetch(`${API_BASE}/trash`); setItems(await res.json()); }
    catch { /* silent */ }
    finally { setLoading(false); }
  };

  const flash = (text, type) => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4500);
  };

  const handleRestore = async (type, id) => {
    try {
      const res = await authFetch(`${API_BASE}/trash/restore/${type}/${id}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) { flash(data.message || 'Restored.', 'success'); load(); if (onActionTriggered) onActionTriggered(); }
      else flash(data.error || 'Restore failed.', 'error');
    } catch { flash('Connection error.', 'error'); }
  };

  const handlePurge = async (type, id) => {
    if (!confirm('Permanently delete this item? This cannot be undone.')) return;
    try {
      const res = await authFetch(`${API_BASE}/trash/purge-now/${type}/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) { flash(data.message || 'Purged.', 'success'); load(); if (onActionTriggered) onActionTriggered(); }
      else flash(data.error || 'Purge failed.', 'error');
    } catch { flash('Connection error.', 'error'); }
  };

  return (
    <div className="card-obsidian p-5 h-[calc(100vh-9rem)] flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-brand-border mb-4">
        <div>
          <h2 className="text-[14px] font-semibold text-brand-text flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-brand-crimson/60" /> Trash Bin
          </h2>
          <p className="text-[11px] text-brand-muted mt-0.5">Records auto-purge after 30 days</p>
        </div>
        <button onClick={load} className="btn-ghost px-3 py-1.5 flex items-center gap-1.5 text-[11px]">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div className={`flex items-center justify-between rounded-lg px-4 py-2.5 text-[11px] font-medium border mb-3 ${feedback.type === 'success'
            ? 'bg-brand-emerald/8 border-brand-emerald/20 text-brand-emerald'
            : 'bg-brand-crimson/8 border-brand-crimson/20 text-brand-crimson'
          }`}>
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto pr-0.5">
        {loading ? (
          <div className="flex h-48 items-center justify-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-brand-accent/30 border-t-brand-accent animate-spin" />
            <span className="text-[11px] text-brand-muted">Loading trash items…</span>
          </div>
        ) : items.length > 0 ? (
          <div className="rounded-xl border border-brand-border overflow-hidden divide-y divide-brand-border/30">
            {items.map(item => {
              const urgent = item.days_remaining <= 5;
              return (
                <div key={`${item.type}-${item.id}`}
                  className="table-row-obsidian px-5 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={TYPE_PILL[item.type] || 'pill-violet'}>{item.type}</span>
                      <span className="text-[13px] font-semibold text-brand-text">{item.label}</span>
                    </div>
                    <div className="text-[10px] text-brand-muted font-mono">{item.sub_label}</div>
                    <div className="text-[10px] text-brand-muted flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {new Date(item.deleted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-end">
                    {/* Days remaining badge */}
                    <span className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${urgent
                        ? 'bg-brand-crimson/10 text-brand-crimson border-brand-crimson/20'
                        : 'bg-brand-amber/8  text-brand-amber  border-brand-amber/15'
                      }`}>
                      <AlertTriangle className={`h-3 w-3 ${urgent ? 'animate-pulse' : ''}`} />
                      {item.days_remaining}d left
                    </span>

                    <div className="flex gap-1.5">
                      <button onClick={() => handleRestore(item.type, item.id)}
                        className="flex items-center gap-1 text-[10px] font-medium text-brand-emerald bg-brand-emerald/8 hover:bg-brand-emerald/14 border border-brand-emerald/18 px-3 py-1.5 rounded-lg transition-premium">
                        <RotateCcw className="h-3 w-3" /> Restore
                      </button>
                      <button onClick={() => handlePurge(item.type, item.id)}
                        className="flex items-center gap-1 text-[10px] font-medium text-brand-crimson bg-brand-crimson/8 hover:bg-brand-crimson/14 border border-brand-crimson/18 px-3 py-1.5 rounded-lg transition-premium">
                        <Trash2 className="h-3 w-3" /> Purge
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand-surface border border-brand-border flex items-center justify-center">
              <Trash2 className="h-5 w-5 text-brand-muted/30" />
            </div>
            <p className="text-[12px] text-brand-muted">Trash bin is empty</p>
            <p className="text-[10px] text-brand-muted/50">Deleted records appear here for 30 days</p>
          </div>
        )}
      </div>
    </div>
  );
}
