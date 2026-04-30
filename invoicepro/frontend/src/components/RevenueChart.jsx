import { motion } from 'framer-motion';
import { revenueData } from '../data/mockData';
import Skeleton from './ui/Skeleton';

const width = 720;
const height = 260;
const padding = 28;

const buildPath = (data) => {
  const max = Math.max(...data.map((point) => point.value));
  const min = Math.min(...data.map((point) => point.value));
  const range = Math.max(max - min, 1);
  const points = data.map((point, index) => {
    const x = padding + (index * (width - padding * 2)) / (data.length - 1);
    const y = height - padding - ((point.value - min) / range) * (height - padding * 2);
    return { ...point, x, y };
  });

  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const area = `${line} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return { points, line, area };
};

export default function RevenueChart({ loading }) {
  const { points, line, area } = buildPath(revenueData);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-800 p-5 shadow-xl shadow-black/15">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="mt-6 flex h-64 items-end gap-3">
          {[42, 64, 54, 78, 70, 94].map((bar, index) => (
            <Skeleton key={index} className="flex-1 rounded-t-2xl" style={{ height: `${bar}%` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.section
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="rounded-2xl border border-white/10 bg-slate-800 p-5 shadow-xl shadow-black/15"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Revenue trend</h2>
          <p className="mt-1 text-sm text-slate-400">Net collections over the last six months</p>
        </div>
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-200">
          +18.4% this month
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/45 p-3">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Revenue line chart" className="h-64 w-full">
          <defs>
            <linearGradient id="chartLine" x1="0%" x2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="chartArea" x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((lineIndex) => (
            <line
              key={lineIndex}
              x1={padding}
              x2={width - padding}
              y1={padding + lineIndex * 62}
              y2={padding + lineIndex * 62}
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="8 8"
            />
          ))}
          <motion.path
            d={area}
            fill="url(#chartArea)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.25 }}
          />
          <motion.path
            d={line}
            fill="none"
            stroke="url(#chartLine)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.25, ease: 'easeOut' }}
          />
          {points.map((point, index) => (
            <motion.g
              key={point.label}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45 + index * 0.08 }}
            >
              <circle cx={point.x} cy={point.y} r="7" fill="#0f172a" stroke="#7dd3fc" strokeWidth="4" />
              <text x={point.x} y={height - 5} textAnchor="middle" className="fill-slate-400 text-[12px] font-semibold">
                {point.label}
              </text>
            </motion.g>
          ))}
        </svg>
      </div>
    </motion.section>
  );
}
