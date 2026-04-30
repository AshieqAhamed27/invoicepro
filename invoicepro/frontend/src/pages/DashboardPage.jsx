import { useEffect, useState } from 'react';
import {
  Banknote,
  CreditCard,
  DollarSign,
  Link as LinkIcon,
  Plus,
  ReceiptText,
  Send,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { activity } from '../data/mockData';
import InvoiceTable from '../components/InvoiceTable';
import RevenueChart from '../components/RevenueChart';
import StatCard from '../components/StatCard';
import MotionButton from '../components/ui/MotionButton';
import PageTransition from '../components/ui/PageTransition';
import Skeleton from '../components/ui/Skeleton';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [paymentLinkSent, setPaymentLinkSent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 850);
    return () => window.clearTimeout(timer);
  }, []);

  const actions = [
    {
      label: 'Create Invoice',
      icon: Plus,
      onClick: () => navigate('/create-invoice'),
      variant: 'primary'
    },
    {
      label: 'Add Client',
      icon: Users,
      onClick: () => navigate('/clients'),
      variant: 'secondary'
    },
    {
      label: paymentLinkSent ? 'Payment Link Sent' : 'Send Payment Link',
      icon: paymentLinkSent ? Send : LinkIcon,
      onClick: () => setPaymentLinkSent(true),
      variant: 'secondary'
    }
  ];

  return (
    <PageTransition className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-cyan-300">April cash flow</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                $54,320 collected with 91% on-time payments.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Your billing pipeline is healthy. Three high-value invoices are pending this week.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <MotionButton key={action.label} variant={action.variant} onClick={action.onClick}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {action.label}
                  </MotionButton>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-800 p-6 shadow-2xl shadow-black/20">
          <p className="text-sm font-semibold text-slate-300">Collection health</p>
          <div className="mt-5 flex items-end gap-3">
            <span className="text-5xl font-black tracking-tight text-white">94</span>
            <span className="pb-2 text-sm font-bold text-emerald-300">Excellent</span>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400" />
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            Faster reminders and shorter due windows are keeping receivables tight.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Revenue" value="$54.3k" delta="+18.4%" icon={DollarSign} tone="blue" loading={loading} />
        <StatCard label="Pending" value="$18.4k" delta="+5.2%" icon={ReceiptText} tone="amber" loading={loading} />
        <StatCard label="Paid" value="$41.7k" delta="+22.1%" icon={Banknote} tone="emerald" loading={loading} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <RevenueChart loading={loading} />

        <aside className="rounded-2xl border border-white/10 bg-slate-800 p-5 shadow-xl shadow-black/15">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Activity</h2>
              <p className="mt-1 text-sm text-slate-400">Latest workspace events</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-400/10 text-violet-200">
              <CreditCard className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {loading
              ? [1, 2, 3].map((item) => <Skeleton key={item} className="h-16 w-full" />)
              : activity.map((event, index) => (
                  <div key={event.title} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="h-3 w-3 rounded-full bg-cyan-300" />
                      {index !== activity.length - 1 && <span className="mt-2 h-full w-px bg-white/10" />}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-semibold text-white">{event.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{event.meta}</p>
                      <p className="mt-1 text-xs text-slate-500">{event.time}</p>
                    </div>
                  </div>
                ))}
          </div>
        </aside>
      </section>

      <InvoiceTable loading={loading} />
    </PageTransition>
  );
}
