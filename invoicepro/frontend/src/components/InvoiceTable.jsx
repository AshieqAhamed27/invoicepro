import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { invoices } from '../data/mockData';
import { formatRs } from '../utils/currency';
import Skeleton from './ui/Skeleton';

const statusStyles = {
  Paid: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  Pending: 'border-amber-300/20 bg-amber-300/10 text-amber-100',
  Overdue: 'border-rose-400/20 bg-rose-400/10 text-rose-200'
};

export default function InvoiceTable({ loading }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-800 shadow-xl shadow-black/15">
      <div className="flex flex-col gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Recent invoices</h2>
          <p className="mt-1 text-sm text-slate-400">Live status tracking for your latest billing activity</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-semibold text-slate-200 outline-none transition hover:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-blue-300"
        >
          View all
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-4 p-5">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-3 p-5 md:hidden">
            {invoices.map((invoice, index) => (
              <motion.article
                key={invoice.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border border-white/10 bg-slate-900/45 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-white">{invoice.id}</p>
                    <p className="mt-1 text-sm font-medium text-slate-300">{invoice.client}</p>
                  </div>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyles[invoice.status]}`}>
                    {invoice.status}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Due</p>
                    <p className="mt-1 text-slate-300">{invoice.dueDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</p>
                    <p className="mt-1 font-bold text-white">{formatRs(invoice.amount)}</p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-4 font-semibold">Invoice</th>
                <th className="px-5 py-4 font-semibold">Client</th>
                <th className="px-5 py-4 font-semibold">Due</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {invoices.map((invoice, index) => (
                <motion.tr
                  key={invoice.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group transition hover:bg-white/[0.04]"
                >
                  <td className="px-5 py-4">
                    <p className="font-semibold text-white">{invoice.id}</p>
                    <p className="mt-1 text-xs text-slate-500">{invoice.issueDate}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-200">{invoice.client}</p>
                    <p className="mt-1 text-xs text-slate-500">{invoice.email}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-400">{invoice.dueDate}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyles[invoice.status]}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-bold text-white">{formatRs(invoice.amount)}</td>
                </motion.tr>
              ))}
            </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
