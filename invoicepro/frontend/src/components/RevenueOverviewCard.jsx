import React, { useEffect, useState } from 'react';
import api from '../utils/api';

/**
 * RevenueOverviewCard
 * Displays live sales, collected revenue, overdue balances,
 * lead conversion metrics, and 6-month trend from `/api/dashboard/summary`.
 */
export default function RevenueOverviewCard() {
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboard = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.get(`/dashboard/summary?period=${period}`);
        if (isMounted) setData(res.data);
      } catch (err) {
        if (isMounted) setError(err.response?.data?.message || 'Failed to load dashboard metrics');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDashboard();
    return () => {
      isMounted = false;
    };
  }, [period]);

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl text-slate-100 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>📊</span> Business Revenue Overview
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Real-time revenue, conversion rates, and cash collections</p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs">
          {['week', 'month', 'quarter', 'year'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg font-medium capitalize transition ${
                period === p ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex items-center justify-center text-sm text-slate-400">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent mr-2"></div>
          Loading financial data...
        </div>
      ) : error ? (
        <div className="my-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800/80">
              <span className="text-xs text-slate-400 font-medium">Total Invoiced</span>
              <div className="text-2xl font-black text-white mt-1">
                {formatINR(data?.revenue?.total)}
              </div>
              <span className="text-[11px] text-slate-500">{data?.invoices?.total || 0} invoices created</span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <span className="text-xs text-emerald-400 font-medium">Collected Cash</span>
              <div className="text-2xl font-black text-emerald-300 mt-1">
                {formatINR(data?.revenue?.paid)}
              </div>
              <span className="text-[11px] text-emerald-500/80">{data?.invoices?.paid || 0} paid in full</span>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <span className="text-xs text-amber-400 font-medium">Pending Recovery</span>
              <div className="text-2xl font-black text-amber-300 mt-1">
                {formatINR(data?.revenue?.pending)}
              </div>
              <span className="text-[11px] text-amber-500/80">{data?.invoices?.pending || 0} invoices awaiting client</span>
            </div>

            <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20">
              <span className="text-xs text-rose-400 font-medium">Overdue at Risk</span>
              <div className="text-2xl font-black text-rose-400 mt-1">
                {formatINR(data?.revenue?.overdue)}
              </div>
              <span className="text-[11px] text-rose-500/80">{data?.revenue?.overdueCount || 0} overdue invoices</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800/60 lg:col-span-2">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">6-Month Cash Trend</h3>
              <div className="space-y-2">
                {data?.monthlyTrend?.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-xs">
                    <span className="w-16 text-slate-400 font-mono text-[11px]">{m.month}</span>
                    <div className="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (m.paid / (Math.max(m.invoiced, m.paid) || 1)) * 100)}%`
                        }}
                      />
                    </div>
                    <span className="text-slate-300 font-mono text-[11px] w-24 text-right">
                      {formatINR(m.paid)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800/60 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Pipeline Win Rate</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-indigo-400">
                    {Math.round((data?.leads?.winRate || 0) * 100)}%
                  </span>
                  <span className="text-xs text-slate-400">conversion rate</span>
                </div>
                <div className="mt-4 space-y-1.5 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Won Deals:</span>
                    <span className="text-white font-medium">{data?.leads?.won || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pipeline In Progress:</span>
                    <span className="text-white font-medium">{data?.leads?.inProgress || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Deal Volume Won:</span>
                    <span className="text-emerald-400 font-medium">{formatINR(data?.leads?.totalBudgetWon)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex justify-between">
                <span>Avg. Payment Cycle:</span>
                <span className="text-slate-300 font-medium">{data?.avgPaymentDays || 0} days</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
