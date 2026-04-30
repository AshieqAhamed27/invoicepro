import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import Skeleton from './ui/Skeleton';

export default function StatCard({ label, value, delta, icon: Icon, tone = 'blue', loading }) {
  const positive = !String(delta).startsWith('-');
  const tones = {
    blue: 'from-blue-500/18 to-cyan-400/8 text-cyan-200',
    violet: 'from-violet-500/18 to-blue-500/8 text-violet-200',
    emerald: 'from-emerald-500/18 to-cyan-500/8 text-emerald-200',
    amber: 'from-amber-500/18 to-orange-400/8 text-amber-200'
  };

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="rounded-2xl border border-white/10 bg-slate-800 p-5 shadow-xl shadow-black/15"
    >
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-36" />
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${tones[tone]}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                positive
                  ? 'bg-emerald-400/10 text-emerald-200'
                  : 'bg-rose-400/10 text-rose-200'
              }`}
            >
              {positive ? (
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {delta}
            </span>
          </div>
          <p className="mt-5 text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white">{value}</p>
        </>
      )}
    </motion.article>
  );
}
