import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import MotionButton from './ui/MotionButton';

export default function SuccessModal({ open, onClose, total }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="invoice-success-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 36, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900 p-7 text-center shadow-2xl shadow-black/40"
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {[...Array(18)].map((_, index) => (
                <motion.span
                  key={index}
                  className="absolute h-2 w-2 rounded-full bg-gradient-to-br from-cyan-300 to-violet-400"
                  initial={{
                    x: 190,
                    y: 120,
                    opacity: 0,
                    scale: 0.5
                  }}
                  animate={{
                    x: 24 + ((index * 47) % 360),
                    y: 20 + ((index * 31) % 220),
                    opacity: [0, 1, 0],
                    scale: [0.5, 1, 0.8]
                  }}
                  transition={{ duration: 1.2, delay: index * 0.025, ease: 'easeOut' }}
                />
              ))}
            </div>

            <motion.div
              className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-emerald-300 to-cyan-300 text-slate-950 shadow-lg shadow-emerald-950/30"
              initial={{ scale: 0.4, rotate: -18 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 16, delay: 0.1 }}
            >
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.24 }}>
                <Check className="h-10 w-10" aria-hidden="true" />
              </motion.div>
            </motion.div>

            <h2 id="invoice-success-title" className="mt-6 text-2xl font-bold text-white">
              Invoice sent
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-400">
              Your client received a payment-ready invoice for {total}. A reminder sequence is ready if it becomes overdue.
            </p>
            <MotionButton className="mt-7 w-full" onClick={onClose}>
              Back to editor
            </MotionButton>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
