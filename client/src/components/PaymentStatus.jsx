import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';
import { Calendar, ShieldAlert, CheckCircle, AlertTriangle, Search, Phone, RefreshCw } from 'lucide-react';

export default function PaymentStatus() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPaymentStatus();
  }, []);

  const fetchPaymentStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/borrowers/payment-status`);
      const payload = await res.json();
      setData(payload);
    } catch (e) {
      console.error('Error fetching repayment health status:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const filteredData = data.filter(row => 
    row.borrower_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    row.fund_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-brand-card border border-brand-border rounded-xl shadow-xl p-6 h-[calc(100vh-14rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-brand-border/60 pb-4 mb-6 gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-brand-text">Borrower running payment status</h2>
          <p className="text-xs text-brand-muted mt-1">
            Tracking repayment health sorted by priority date-wise (nearest deadline at top).
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-brand-muted" />
            <input 
              type="text" 
              placeholder="Search clients..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 bg-brand-dark/50 border border-brand-border/60 rounded-lg pl-9 pr-4 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-accent font-sans"
            />
          </div>
          <button
            onClick={fetchPaymentStatus}
            className="flex items-center gap-1.5 text-xs bg-brand-dark hover:bg-brand-dark/70 text-brand-text border border-brand-border px-3 py-2 rounded-lg transition-colors shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-xs text-brand-muted animate-pulse">
            Calculating historical accruals and repayment schedule...
          </div>
        ) : filteredData.length > 0 ? (
          <div className="border border-brand-border rounded-xl overflow-hidden bg-brand-slate/5 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-brand-slate/80 text-[10px] uppercase font-bold text-brand-muted border-b border-brand-border/60 tracking-wider font-mono">
                  <th className="p-4">Borrower & Loan Account</th>
                  <th className="p-4">Fund Pool</th>
                  <th className="p-4 text-right">Principal Disbursed</th>
                  <th className="p-4 text-right">Total Outstanding</th>
                  <th className="p-4">Interest Configuration</th>
                  <th className="p-4">Maturity Deadline</th>
                  <th className="p-4">Overdue DPD</th>
                  <th className="p-4">Health Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40 text-xs text-brand-text">
                {filteredData.map((row) => (
                  <tr key={row.loan_id} className="hover:bg-brand-slate/20 transition-premium">
                    <td className="p-4">
                      <div className="font-semibold text-brand-text">{row.borrower_name}</div>
                      <div className="text-[10px] text-brand-muted font-mono flex items-center gap-1 mt-0.5">
                        <span>L-{row.loan_id}</span>
                        <span>·</span>
                        <Phone className="h-2.5 w-2.5 inline" /> {row.borrower_phone}
                      </div>
                    </td>
                    <td className="p-4 text-brand-muted font-semibold">{row.fund_name}</td>
                    <td className="p-4 text-right font-mono font-medium">{formatCurrency(row.principal_disbursed)}</td>
                    <td className="p-4 text-right font-mono font-bold text-brand-accent">
                      {formatCurrency(row.total_outstanding)}
                      <div className="text-[9px] text-brand-muted font-normal mt-0.5">
                        P: {formatCurrency(row.remaining_principal)} · I: {formatCurrency(row.remaining_interest)} · Pen: {formatCurrency(row.remaining_penalty)}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-brand-text">{row.interest_rate}% p.a.</span>
                      <span className="text-[9px] bg-brand-dark border border-brand-border px-1.5 py-0.5 rounded ml-2 font-mono text-brand-muted uppercase">
                        {row.interest_period}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-medium">
                      {new Date(row.maturity_due_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                      {row.days_until_due > 0 && (
                        <div className="text-[9px] text-brand-emerald mt-0.5">
                          Due in {row.days_until_due} days
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-mono">
                      {row.dpd > 0 ? (
                        <span className="text-brand-crimson font-extrabold">{row.dpd} DPD</span>
                      ) : (
                        <span className="text-brand-muted">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        {row.health_status === 'Healthy' && (
                          <>
                            <CheckCircle className="h-4 w-4 text-brand-emerald" />
                            <span className="text-brand-emerald font-semibold uppercase text-[10px]">Healthy</span>
                          </>
                        )}
                        {row.health_status === 'Warning' && (
                          <>
                            <AlertTriangle className="h-4 w-4 text-brand-amber" />
                            <span className="text-brand-amber font-semibold uppercase text-[10px]">Warning</span>
                          </>
                        )}
                        {row.health_status === 'Critical' && (
                          <>
                            <ShieldAlert className="h-4 w-4 text-brand-amber animate-pulse" />
                            <span className="text-brand-amber font-extrabold uppercase text-[10px]">Critical</span>
                          </>
                        )}
                        {row.health_status === 'Overdue' && (
                          <>
                            <ShieldAlert className="h-4 w-4 text-brand-crimson animate-bounce" />
                            <span className="text-brand-crimson font-extrabold uppercase text-[10px]">Overdue</span>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-brand-muted border border-dashed border-brand-border/60 rounded-xl bg-brand-slate/5">
            <Calendar className="h-10 w-10 text-brand-border/80 mb-2" />
            <p className="text-sm">No active loan accounts to track.</p>
          </div>
        )}
      </div>
    </div>
  );
}
