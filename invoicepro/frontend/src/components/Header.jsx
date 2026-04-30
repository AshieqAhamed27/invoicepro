import { Bell, Menu, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MotionButton from './ui/MotionButton';

export default function Header({ onMenuClick }) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-900/70 backdrop-blur-2xl">
      <div className="flex min-h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={onMenuClick}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-slate-200 outline-none transition hover:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-blue-300 lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-400">Good morning, Ashieq</p>
            <h1 className="truncate text-xl font-bold tracking-tight text-white sm:text-2xl">
              Billing command center
            </h1>
          </div>
        </div>

        <div className="hidden min-w-0 flex-1 justify-center px-8 md:flex">
          <label className="relative w-full max-w-md">
            <span className="sr-only">Search invoices and clients</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.05] pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-300/60 focus:ring-4 focus:ring-blue-500/10"
              placeholder="Search invoices, clients, payments"
            />
          </label>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <MotionButton
            className="hidden sm:inline-flex"
            onClick={() => navigate('/create-invoice')}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create Invoice
          </MotionButton>

          <button
            type="button"
            aria-label="View notifications"
            title="Notifications"
            className="relative grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-slate-300 outline-none transition hover:bg-white/[0.09] hover:text-white focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-cyan-300" />
          </button>

          <button
            type="button"
            aria-label="Open profile menu"
            title="Profile"
            className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-slate-100 to-blue-100 text-sm font-black text-slate-950 shadow-lg shadow-black/20 outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            AQ
          </button>
        </div>
      </div>
    </header>
  );
}
