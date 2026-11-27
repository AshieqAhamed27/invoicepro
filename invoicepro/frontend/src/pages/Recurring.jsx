import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';

const formatMoney = (amount, currency) => {
  const num = Number(amount || 0);
  if (currency === 'USD') return `USD ${num.toLocaleString('en-US')}`;
  return `Rs ${num.toLocaleString('en-IN')}`;
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
    <div className="premium-page min-h-screen text-slate-900">
      <Navbar />

      <main className="container-custom py-8 sm:py-10 md:py-16">
        <section className="reveal mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 mb-5">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Automation Layer</span>
            </div>
            <h1 className="text-4xl font-bold sm:text-5xl lg:text-6xl tracking-tight text-slate-900 leading-none">
              Recurring Invoices
            </h1>
            <p className="mt-4 text-base sm:text-xl text-slate-600 font-medium max-w-2xl">
              Bill retainers automatically. Each cycle creates a fresh invoice link for your client to pay.
            </p>
          </div>
        </section>

        <section className="reveal reveal-delay-1 premium-panel overflow-hidden">
          <div className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Schedules</h2>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">
                Automated retainers & recurring invoice cycles
              </p>
            </div>
            <Link
              to="/create-invoice?recurring=true"
              className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider px-4 py-2.5 transition shadow-sm active:scale-95 inline-flex items-center gap-2 self-start md:self-auto"
            >
              <span>+</span>
              <span>New Recurring Schedule</span>
            </Link>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-5 sm:p-10 space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 w-full bg-slate-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : schedules.length === 0 ? (
              <div className="m-5 rounded-[2rem] border-2 border-dashed border-slate-200 p-8 text-center sm:m-10 sm:p-16">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-600">No recurring schedules yet</p>
                <p className="text-[10px] font-medium mt-2 text-slate-500">
                  Bill retainers automatically on a weekly, monthly, or yearly schedule.
                </p>
                <Link
                  to="/create-invoice?recurring=true"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-white/20 text-slate-900 font-bold text-xs px-4 py-2 transition"
                >
                  + Create Your First Schedule
                </Link>
              </div>
            ) : (
              <table className="premium-table w-full text-left min-w-[900px]">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50">
                    <th className="px-10 py-5">Client</th>
                    <th className="px-10 py-5">Amount</th>
                    <th className="px-10 py-5">Frequency</th>
                    <th className="px-10 py-5">Next Run</th>
                    <th className="px-10 py-5">Status</th>
                    <th className="px-10 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {schedules.map((schedule) => (
                    <tr key={schedule._id} className="group hover:bg-slate-50 transition-colors">
                      <td className="px-10 py-6">
                        <p className="font-black text-slate-900 text-base leading-none mb-2">{schedule.template?.clientName}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">
                          {schedule.template?.clientEmail}
                        </p>
                      </td>

                      <td className="px-10 py-6">
                        <p className="text-lg font-black text-slate-900 tracking-tight">
                          {formatMoney(schedule.template?.amount, schedule.template?.currency)}
                        </p>
                      </td>

                      <td className="px-10 py-6">
                        <p className="text-sm font-bold text-slate-600">{frequencyLabel(schedule)}</p>
                      </td>

                      <td className="px-10 py-6">
                        <p className="text-sm font-bold text-slate-600">{formatDate(schedule.nextRunAt)}</p>
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

