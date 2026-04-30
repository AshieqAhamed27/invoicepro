import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Check,
  CreditCard,
  FileText,
  Sparkles,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { features, plans, testimonials } from '../data/mockData';

const MotionLink = motion(Link);
const featureIcons = [FileText, CreditCard, Zap, BadgeCheck];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative isolate min-h-[92vh] overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.24),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(139,92,246,0.2),transparent_30%),linear-gradient(180deg,#0f172a_0%,#111827_48%,#0f172a_100%)]" />
        <div className="absolute inset-x-0 bottom-0 top-20 opacity-60">
          <HeroDashboardPreview />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/34 to-slate-950" />

        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 shadow-lg shadow-blue-950/40">
              <BarChart3 className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-bold tracking-tight">InvoicePro</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm font-medium text-slate-300 md:flex">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#testimonials" className="hover:text-white">Customers</a>
          </div>
          <MotionLink
            whileTap={{ scale: 0.95 }}
            to="/dashboard"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-black/20 outline-none transition hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            Open app
          </MotionLink>
        </nav>

        <div className="relative z-10 mx-auto flex min-h-[72vh] max-w-7xl flex-col justify-center px-4 pb-16 pt-16 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-cyan-100 backdrop-blur">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Premium billing OS for modern service teams
            </div>
            <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
              InvoicePro
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">
              Create invoices, manage clients, and collect payments from a Stripe-inspired dashboard built for fast-moving startups.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <MotionLink
                whileTap={{ scale: 0.95 }}
                to="/dashboard"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-blue-950/30 outline-none transition hover:from-blue-400 hover:to-violet-400 focus-visible:ring-2 focus-visible:ring-blue-300"
              >
                Launch dashboard
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </MotionLink>
              <MotionLink
                whileTap={{ scale: 0.95 }}
                to="/create-invoice"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.08] px-5 py-3 text-sm font-bold text-white backdrop-blur outline-none transition hover:bg-white/[0.13] focus-visible:ring-2 focus-visible:ring-blue-300"
              >
                Create invoice
              </MotionLink>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="features" className="border-b border-white/10 bg-slate-950 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-300">Features</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Everything needed to ship invoices with confidence.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ delay: index * 0.06 }}
                whileHover={{ y: -6 }}
                className="rounded-2xl border border-white/10 bg-slate-800 p-6 shadow-xl shadow-black/10"
              >
                <div className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-cyan-200">
                  {(() => {
                    const Icon = featureIcons[index];
                    return <Icon className="h-5 w-5" aria-hidden="true" />;
                  })()}
                </div>
                <h3 className="text-base font-bold text-white">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{feature.description}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="border-b border-white/10 bg-slate-900 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-violet-300">Pricing</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Plans that scale with your billing volume.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate-400">
              Start lean, then add automations, roles, and approval workflows as your business grows.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <motion.article
                key={plan.name}
                whileHover={{ y: -6 }}
                className={`rounded-2xl border p-6 shadow-xl shadow-black/10 ${
                  plan.highlighted
                    ? 'border-blue-400/40 bg-gradient-to-b from-blue-500/16 to-violet-500/10'
                    : 'border-white/10 bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  {plan.highlighted && (
                    <span className="rounded-full bg-cyan-300 px-2.5 py-1 text-xs font-black text-slate-950">
                      Popular
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm text-slate-400">{plan.description}</p>
                <div className="mt-7 flex items-end gap-1">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className="pb-1 text-sm text-slate-400">/mo</span>
                </div>
                <ul className="mt-7 space-y-3">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-3 text-sm font-medium text-slate-300">
                      <Check className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                      {perk}
                    </li>
                  ))}
                </ul>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="bg-slate-950 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <motion.figure
                key={testimonial.name}
                whileHover={{ y: -6 }}
                className="rounded-2xl border border-white/10 bg-slate-800 p-6 shadow-xl shadow-black/10"
              >
                <blockquote className="text-base leading-7 text-slate-200">"{testimonial.quote}"</blockquote>
                <figcaption className="mt-6">
                  <p className="font-bold text-white">{testimonial.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{testimonial.role}</p>
                </figcaption>
              </motion.figure>
            ))}
          </div>

          <footer className="mt-16 flex flex-col gap-4 border-t border-white/10 pt-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>InvoicePro. Modern invoice management for startup teams.</p>
            <div className="flex gap-5">
              <a href="#features" className="hover:text-white">Features</a>
              <a href="#pricing" className="hover:text-white">Pricing</a>
              <Link to="/dashboard" className="hover:text-white">Dashboard</Link>
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}

function HeroDashboardPreview() {
  const bars = [42, 60, 54, 78, 70, 88, 95];

  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.15 }}
      className="mx-auto h-full max-w-7xl px-4 sm:px-6 lg:px-8"
    >
      <div className="ml-auto mt-14 hidden max-w-3xl rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/40 backdrop-blur md:block">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-3 w-32 rounded-full bg-white/20" />
            <div className="mt-3 h-8 w-56 rounded-full bg-white/10" />
          </div>
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-400 to-violet-500" />
        </div>
        <div className="mt-7 grid grid-cols-3 gap-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
              <div className="h-3 w-16 rounded-full bg-white/20" />
              <div className="mt-4 h-7 w-24 rounded-full bg-white/10" />
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-5">
          <div className="flex h-44 items-end gap-3">
            {bars.map((bar, index) => (
              <motion.div
                key={index}
                initial={{ height: '20%' }}
                animate={{ height: `${bar}%` }}
                transition={{ duration: 0.7, delay: 0.2 + index * 0.07 }}
                className="flex-1 rounded-t-xl bg-gradient-to-t from-blue-500 to-cyan-300"
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
