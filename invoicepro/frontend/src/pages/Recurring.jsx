import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../utils/api';

const formatMoney = (amount, currency) => {
  const num = Number(amount || 0);
  if (currency === 'USD') return `$${num.toLocaleString('en-US')}`;
  return `₹${num.toLocaleString('en-IN')}`;
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
};

const frequencyLabel = (schedule) => {
  const interval = Number(schedule.interval || 1);
  if (schedule.frequency === 'weekly') {
    return interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
  }

  const dom = Number(schedule.dayOfMonth || 0);
  if (interval === 1 && dom) return `Monthly (day ${dom})`;
  if (dom) return `Every ${interval} months (day ${dom})`;
  return interval === 1 ? 'Monthly' : `Every ${interval} months`;
};

export default function Recurring() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  const fetchSchedules = async () => {
    try {
      const res = await api.get('/invoices/recurring');
      setSchedules(res.data.schedules || []);
    } catch (err) {
      alert('Failed to load recurring invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const toggleStatus = async (schedule) => {
    try {
      setActionId(schedule._id);
      const nextStatus = schedule.status === 'active' ? 'paused' : 'active';
      await api.patch(`/invoices/recurring/${schedule._id}`, { status: nextStatus });
      await fetchSchedules();
    } catch (err) {
      alert('Failed to update schedule.');
    } finally {
      setActionId(null);
    }
  };

  const runNow = async (schedule) => {
    try {
      setActionId(schedule._id);
      await api.post(`/invoices/recurring/${schedule._id}/run-now`);
      alert('Invoice generated.');
      await fetchSchedules();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to generate invoice.';
      alert(message);
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="container-custom py-10 md:py-16">
        <section className="reveal mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-5">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Automation Layer</span>
            </div>
            <h1 className="text-4xl font-black sm:text-6xl tracking-tighter text-white leading-none">
              Recurring Invoices
            </h1>
            <p className="mt-4 text-xl text-zinc-500 font-medium max-w-2xl">
              Bill retainers automatically. Each cycle creates a fresh invoice link for your client to pay.
            </p>
          </div>
        </section>

        <section className="reveal reveal-delay-1 surface overflow-hidden border-white/5 bg-zinc-950/40 backdrop-blur-xl rounded-[3rem] shadow-2xl">
          <div className="px-10 py-8 border-b border-white/5 bg-white/[0.01] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-white italic">Schedules</h2>
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-1">
                Create schedules from the Invoice Creation page
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-10 space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 w-full bg-white/5 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : schedules.length === 0 ? (
              <div className="p-16 text-center border-2 border-dashed border-white/5 rounded-[2rem] m-10">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">No recurring schedules yet</p>
                <p className="text-[10px] font-medium mt-2 text-zinc-600">
                  Turn on Recurring Invoice while issuing an invoice to create one.
                </p>
              </div>
            ) : (
              <table className="w-full text-left min-w-[900px]">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-widest text-zinc-700 bg-white/[0.005]">
                    <th className="px-10 py-5">Client</th>
                    <th className="px-10 py-5">Amount</th>
                    <th className="px-10 py-5">Frequency</th>
                    <th className="px-10 py-5">Next Run</th>
                    <th className="px-10 py-5">Status</th>
                    <th className="px-10 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {schedules.map((schedule) => (
                    <tr key={schedule._id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-10 py-6">
                        <p className="font-black text-white text-base leading-none mb-2">{schedule.template?.clientName}</p>
                        <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-[0.1em]">
                          {schedule.template?.clientEmail}
                        </p>
                      </td>

                      <td className="px-10 py-6">
                        <p className="text-lg font-black text-white italic tracking-tighter">
                          {formatMoney(schedule.template?.amount, schedule.template?.currency)}
                        </p>
                      </td>

                      <td className="px-10 py-6">
                        <p className="text-sm font-bold text-zinc-400">{frequencyLabel(schedule)}</p>
                      </td>

                      <td className="px-10 py-6">
                        <p className="text-sm font-bold text-zinc-400">{formatDate(schedule.nextRunAt)}</p>
                      </td>

                      <td className="px-10 py-6">
                        <span
                          className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                            schedule.status === 'active'
                              ? 'bg-emerald-400/5 text-emerald-400 border-emerald-400/10'
                              : 'bg-yellow-400/5 text-yellow-500 border-yellow-400/10'
                          }`}
                        >
                          {schedule.status}
                        </span>
                      </td>

                      <td className="px-10 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={actionId === schedule._id}
                            onClick={() => runNow(schedule)}
                            className="btn btn-secondary px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                          >
                            Run Now
                          </button>
                          <button
                            type="button"
                            disabled={actionId === schedule._id}
                            onClick={() => toggleStatus(schedule)}
                            className="btn btn-dark px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                          >
                            {schedule.status === 'active' ? 'Pause' : 'Resume'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

