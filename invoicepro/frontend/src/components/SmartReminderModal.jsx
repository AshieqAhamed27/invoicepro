import React, { useState } from 'react';
import api from '../utils/api';

/**
 * SmartReminderModal
 * Automated/manual overdue payment reminder modal.
 * Triggers escalating reminders (3d, 7d, 14d, 30d overdue) with direct Razorpay payment links.
 */
export default function SmartReminderModal({ isOpen, onClose, invoice, onSuccess }) {
  const [type, setType] = useState('overdue_7d');
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState(null);

  if (!isOpen || !invoice) return null;

  const handleSendReminder = async () => {
    setIsSending(true);
    setStatus(null);
    try {
      const payload = {
        invoiceId: invoice._id,
        type,
        message: customMessage.trim() || undefined
      };

      const res = await api.post('/reminders/send-manual', payload);
      setStatus({ type: 'success', text: 'Payment reminder dispatched successfully!' });
      if (onSuccess) onSuccess(res.data);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setStatus({ type: 'error', text: err.response?.data?.message || 'Failed to dispatch reminder.' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Payment Chaser
            </span>
            <h3 className="text-lg font-bold mt-1 text-white">Invoice #{invoice.invoiceNumber || '---'}</h3>
            <p className="text-xs text-slate-400">
              Client: {invoice.clientName} • Amount: {invoice.currency || 'INR'} {Number(invoice.amount || 0).toLocaleString('en-IN')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {status && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm ${
              status.type === 'error'
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}
          >
            {status.text}
          </div>
        )}

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Reminder Schedule Stage</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="due_soon_3d">Friendly: Due in 3 days</option>
              <option value="due_today">Direct: Due Today</option>
              <option value="overdue_3d">Gentle Nudge: 3 Days Overdue</option>
              <option value="overdue_7d">Professional: 7 Days Overdue</option>
              <option value="overdue_14d">Firm Demand: 14 Days Overdue</option>
              <option value="overdue_30d">Final Notice: 30 Days Overdue</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Custom Note / Message Override <span className="text-slate-500">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Leave blank to use the smart automated template with payment links..."
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="py-2 px-3.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSendReminder}
              disabled={isSending}
              className="py-2 px-5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              {isSending ? 'Dispatching...' : '🔔 Send Payment Reminder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
