import React, { useState } from 'react';
import api from '../utils/api';

const formatMoney = (amount) =>
  `Rs ${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const defaultPrompts = {
  builder: [
    'Create invoice for Rahul rahul@example.com for website design Rs 12000 with 18% GST due in 7 days',
    'Calculate total for logo design Rs 5000 and landing page Rs 15000 with 18% GST'
  ],
  dashboard: [
    'Show my pending, paid, and overdue invoices',
    'Which invoice should I follow up first?'
  ]
};

export default function AIBillingAgent({
  mode = 'dashboard',
  context = {},
  onApplyDraft,
  applyDraftLabel = 'Apply Draft'
}) {
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const prompts = defaultPrompts[mode] || defaultPrompts.dashboard;
  const hasDraft = Boolean(result?.draft);
  const draft = result?.draft || null;
  const totals = result?.totals || draft?.totals;
  const statusSummary = result?.statusSummary;

  const runAgent = async (nextMessage = message) => {
    const cleanMessage = String(nextMessage || '').trim();
    if (!cleanMessage) {
      setError('Type what you want the AI agent to do.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMessage(cleanMessage);
      const res = await api.post('/ai/agent', {
        message: cleanMessage,
        context,
        mode
      });
      setResult(res.data);
    } catch (err) {
      setError(
        err.friendlyMessage ||
          err.response?.data?.message ||
          'AI agent could not respond. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="premium-panel overflow-hidden">
      <div className="border-b border-white/10 bg-white/[0.02] p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                AI Billing Agent
              </p>
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-white">
              Create, calculate, and track invoices with AI.
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-500">
              Ask for an invoice draft, GST total, pending status, paid invoices, or overdue follow-ups.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Example: Create invoice for Acme acme@email.com for website redesign Rs 25000 with 18% GST due in 7 days"
            className="input min-h-[130px] resize-none bg-black/20 py-4"
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => runAgent()}
              disabled={loading}
              className="btn btn-primary px-6 py-3 text-xs font-black uppercase tracking-widest disabled:opacity-60"
            >
              {loading ? 'Thinking...' : 'Ask Agent'}
            </button>
            {hasDraft && onApplyDraft && (
              <button
                type="button"
                onClick={() => onApplyDraft(draft)}
                className="btn btn-secondary px-6 py-3 text-xs font-black uppercase tracking-widest"
              >
                {applyDraftLabel}
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => runAgent(prompt)}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-400 transition-all hover:border-emerald-400/30 hover:text-emerald-300"
              >
                {prompt}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm font-bold text-red-300">
              {error}
            </div>
          )}

          {result?.reply && (
            <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
              <p className="text-sm font-semibold leading-relaxed text-emerald-100">{result.reply}</p>
              <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-emerald-400/70">
                Source: {result.source === 'openai' ? 'OpenAI + ClientFlow AI rules' : 'ClientFlow AI rules'}
              </p>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          {statusSummary && (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Payment Status</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-white/[0.04] p-3">
                  <p className="text-xl font-black text-yellow-300">{statusSummary.pending}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase text-zinc-500">Pending</p>
                </div>
                <div className="rounded-lg bg-white/[0.04] p-3">
                  <p className="text-xl font-black text-emerald-300">{statusSummary.paid}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase text-zinc-500">Paid</p>
                </div>
                <div className="rounded-lg bg-white/[0.04] p-3">
                  <p className="text-xl font-black text-red-300">{statusSummary.overdue}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase text-zinc-500">Overdue</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm font-semibold text-zinc-400">
                <p>Pending value: <span className="text-white">{formatMoney(statusSummary.pendingAmount)}</span></p>
                <p>Overdue value: <span className="text-red-300">{formatMoney(statusSummary.overdueAmount)}</span></p>
              </div>
            </div>
          )}

          {totals && (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Total Calculation</p>
              <div className="mt-4 space-y-2 text-sm font-semibold text-zinc-400">
                <p className="flex justify-between gap-4">
                  <span>Subtotal</span>
                  <span className="text-white">{formatMoney(totals.subtotal)}</span>
                </p>
                <p className="flex justify-between gap-4">
                  <span>Tax ({Number(totals.taxRate || 0)}%)</span>
                  <span className="text-white">{formatMoney(totals.tax)}</span>
                </p>
                <p className="flex justify-between gap-4 border-t border-white/10 pt-3 text-base">
                  <span>Total</span>
                  <span className="font-black text-emerald-300">{formatMoney(totals.total)}</span>
                </p>
              </div>
            </div>
          )}

          {draft && (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Draft Preview</p>
              <div className="mt-4 space-y-2 text-sm font-semibold text-zinc-300">
                <p>{draft.clientName || 'Client name missing'}</p>
                <p className="break-all text-zinc-500">{draft.clientEmail || 'Client email missing'}</p>
                <div className="space-y-1 pt-2">
                  {draft.items?.slice(0, 4).map((item, index) => (
                    <p key={`${item.name}-${index}`} className="flex justify-between gap-3">
                      <span className="truncate">{item.name}</span>
                      <span>{formatMoney(item.price)}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {result?.suggestions?.length > 0 && (
            <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">Agent Checks</p>
              <div className="mt-3 space-y-2">
                {result.suggestions.map((suggestion) => (
                  <p key={suggestion} className="text-xs font-semibold leading-relaxed text-zinc-300">
                    {suggestion}
                  </p>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
