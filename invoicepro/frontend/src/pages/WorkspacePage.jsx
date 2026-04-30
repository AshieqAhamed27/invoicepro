import { motion } from 'framer-motion';
import { CreditCard, FileText, Settings, Users } from 'lucide-react';
import InvoiceTable from '../components/InvoiceTable';
import PageTransition from '../components/ui/PageTransition';
import { clients } from '../data/mockData';

const pageMeta = {
  invoices: {
    title: 'Invoices',
    eyebrow: 'Billing records',
    description: 'Review invoice status, client balances, and due dates across your workspace.',
    icon: FileText
  },
  clients: {
    title: 'Clients',
    eyebrow: 'Client directory',
    description: 'Manage client health, contacts, and active billing relationships.',
    icon: Users
  },
  payments: {
    title: 'Payments',
    eyebrow: 'Payment operations',
    description: 'Monitor captured payments, pending links, and payout-ready revenue.',
    icon: CreditCard
  },
  settings: {
    title: 'Settings',
    eyebrow: 'Workspace control',
    description: 'Tune branding, tax defaults, reminders, team access, and billing preferences.',
    icon: Settings
  }
};

export default function WorkspacePage({ type }) {
  const meta = pageMeta[type] || pageMeta.invoices;
  const Icon = meta.icon;

  return (
    <PageTransition className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-slate-800 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-cyan-300">{meta.eyebrow}</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">{meta.title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{meta.description}</p>
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-cyan-200">
            <Icon className="h-7 w-7" aria-hidden="true" />
          </div>
        </div>
      </section>

      {type === 'invoices' && <InvoiceTable />}

      {type === 'clients' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {clients.map((client, index) => (
            <motion.article
              key={client.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -6 }}
              className="rounded-2xl border border-white/10 bg-slate-800 p-5 shadow-xl shadow-black/15"
            >
              <p className="text-lg font-bold text-white">{client.company}</p>
              <p className="mt-2 text-sm text-slate-400">{client.email}</p>
              <span className="mt-5 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-xs font-bold text-cyan-100">
                {client.health}
              </span>
            </motion.article>
          ))}
        </div>
      )}

      {(type === 'payments' || type === 'settings') && (
        <div className="grid gap-4 md:grid-cols-3">
          {['Automation', 'Security', 'Branding'].map((item, index) => (
            <motion.article
              key={item}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              whileHover={{ y: -6 }}
              className="rounded-2xl border border-white/10 bg-slate-800 p-6 shadow-xl shadow-black/15"
            >
              <p className="text-base font-bold text-white">{item}</p>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Configure {item.toLowerCase()} defaults with clean controls and audit-ready states.
              </p>
            </motion.article>
          ))}
        </div>
      )}
    </PageTransition>
  );
}
