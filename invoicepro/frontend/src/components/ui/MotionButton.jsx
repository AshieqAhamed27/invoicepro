import { motion } from 'framer-motion';

const variants = {
  primary:
    'bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-lg shadow-blue-950/30 hover:from-blue-400 hover:to-violet-400',
  secondary:
    'border border-white/10 bg-white/[0.06] text-slate-100 hover:bg-white/[0.1]',
  ghost:
    'text-slate-300 hover:bg-white/[0.08] hover:text-white',
  danger:
    'border border-rose-400/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15'
};

export default function MotionButton({
  children,
  className = '',
  variant = 'primary',
  type = 'button',
  ...props
}) {
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 420, damping: 24 }}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-55 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
