import { motion } from 'framer-motion';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  LayoutDashboard,
  Settings,
  Users
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const menuItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Invoices', path: '/invoices', icon: FileText },
  { label: 'Clients', path: '/clients', icon: Users },
  { label: 'Payments', path: '/payments', icon: CreditCard },
  { label: 'Settings', path: '/settings', icon: Settings }
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onClose }) {
  const location = useLocation();

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <motion.aside
        animate={{ width: collapsed ? 92 : 280 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/10 bg-slate-950/92 shadow-2xl shadow-black/30 backdrop-blur-2xl lg:sticky lg:top-0 lg:h-screen ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex h-20 items-center gap-3 px-5">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            onClick={onClose}
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 shadow-lg shadow-blue-950/40">
              <BarChart3 className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-base font-bold tracking-tight text-white">InvoicePro</p>
                <p className="text-xs font-medium text-slate-400">Finance workspace</p>
              </div>
            )}
          </Link>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-4" aria-label="Main navigation">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                onClick={onClose}
                className={`group relative flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-blue-300 ${
                  active
                    ? 'bg-white text-slate-950 shadow-lg shadow-blue-950/20'
                    : 'text-slate-400 hover:bg-white/[0.07] hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-white"
                    transition={{ type: 'spring', stiffness: 430, damping: 34 }}
                  />
                )}
                <Icon
                  className={`relative z-10 h-5 w-5 ${active ? 'text-blue-600' : 'text-current'}`}
                  aria-hidden="true"
                />
                {!collapsed && <span className="relative z-10">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className={`rounded-2xl border border-white/10 bg-white/[0.05] p-3 ${collapsed ? 'hidden' : ''}`}>
            <p className="text-xs font-semibold text-slate-300">Growth plan</p>
            <div className="mt-3 h-2 rounded-full bg-white/10">
              <div className="h-2 w-3/4 rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" />
            </div>
            <p className="mt-3 text-xs text-slate-500">74% of monthly invoice volume used</p>
          </div>

          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="mt-4 hidden h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-slate-300 outline-none transition hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-blue-300 lg:flex"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Collapse
              </>
            )}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
