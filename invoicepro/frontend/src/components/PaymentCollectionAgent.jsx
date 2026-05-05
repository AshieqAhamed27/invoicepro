import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { openWhatsAppShare } from '../utils/whatsapp';
import { trackEvent } from '../utils/analytics';

const formatMoney = (amount) =>
  `Rs ${Number(amount || 0).toLocaleString('en-IN')}`;

const formatDate = (value) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const toDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const scoreClass = (score) => {
  if (score >= 75) return 'text-red-300 bg-red-400/10 border-red-400/20';
  if (score >= 45) return 'text-yellow-300 bg-yellow-400/10 border-yellow-400/20';
  return 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20';
};

const clientScoreClass = (score) => {
  if (score >= 78) return 'text-emerald-300';
  if (score >= 55) return 'text-yellow-300';
  return 'text-red-300';
};

export default function PaymentCollectionAgent({ insights, onPromiseSaved }) {
  const [automationOn, setAutomationOn] = useState(() => {
    try {
      return localStorage.getItem('invoicepro_reminder_agent_enabled') !== '0';
    } catch {
      return true;
    }
  });
  const [promiseTarget, setPromiseTarget] = useState(null);
  const [promiseDate, setPromiseDate] = useState('');
  const [promiseNote, setPromiseNote] = useState('');
  const [savingPromise, setSavingPromise] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('invoicepro_reminder_agent_enabled', automationOn ? '1' : '0');
    } catch { }
  }, [automationOn]);

  if (!insights) return null;

  const collectionPlan = insights.collectionPlan || [];
  const clientScores = insights.clientPaymentScores || [];
  const opportunity = insights.revenueOpportunity || {};
  const promiseStats = insights.promiseStats || {};
  const reminderAutomation = insights.reminderAutomation || {};
  const topTarget = collectionPlan[0] || null;
  const autoQueue = collectionPlan.filter((target) => target.shouldSendToday || target.automationStatus === 'send_now');
  const scheduledQueue = collectionPlan.filter((target) => target.automationStatus === 'scheduled' || target.automationStatus === 'monitoring');
  const nextAutoTarget = autoQueue[0] || reminderAutomation.nextTarget || topTarget;

  const openPromiseEditor = (target) => {
    setPromiseTarget(target);
    setPromiseDate(toDateInput(target.paymentPromise?.promisedDate));
    setPromiseNote(target.paymentPromise?.note || '');
  };

  const closePromiseEditor = () => {
    setPromiseTarget(null);
    setPromiseDate('');
    setPromiseNote('');
  };

  const savePromise = async () => {
    if (!promiseTarget) return;
    if (!promiseDate) {
      alert('Choose a promise date.');
      return;
    }

    try {
      setSavingPromise(true);
      await api.patch(`/invoices/${promiseTarget.id}/payment-promise`, {
        promisedDate: promiseDate,
        note: promiseNote
      });

      trackEvent('set_payment_promise', {
        invoice_id: promiseTarget.id,
        value: Number(promiseTarget.amount || 0),
        currency: 'INR'
      });

      closePromiseEditor();
      onPromiseSaved?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not save promise-to-pay.');
    } finally {
      setSavingPromise(false);
    }
  };

  const clearPromise = async () => {
    if (!promiseTarget) return;

    try {
      setSavingPromise(true);
      await api.patch(`/invoices/${promiseTarget.id}/payment-promise`, {
        promisedDate: '',
        note: ''
      });

      trackEvent('clear_payment_promise', {
        invoice_id: promiseTarget.id
      });

      closePromiseEditor();
      onPromiseSaved?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not clear promise-to-pay.');
    } finally {
      setSavingPromise(false);
    }
  };

  const sendFollowUp = (target, tone = '') => {
    const message = target.messageVariants?.[tone] || target.followUpMessage;
    if (!message) return;

    openWhatsAppShare(message);
    trackEvent('share_ai_collection_message', {
      invoice_id: target.id,
      tone: tone || target.tone,
      priority_score: target.priorityScore,
      value: Number(target.amount || 0),
      currency: 'INR'
    });
  };

  const copyAutomationQueue = async () => {
    const queue = autoQueue.length ? autoQueue : (nextAutoTarget ? [nextAutoTarget] : []);
    if (!queue.length) return;

    const text = queue
      .map((target, index) => {
        const message = target.messageVariants?.[target.tone] || target.followUpMessage;
        return [
          `${index + 1}. ${target.clientName} - ${target.invoiceNumber} - ${formatMoney(target.amount)}`,
          `Reason: ${target.automationReason || target.reason}`,
          `Message: ${message}`
        ].join('\n');
      })
      .join('\n\n---\n\n');

    try {
      await navigator.clipboard.writeText(text);
      trackEvent('copy_ai_reminder_queue', { count: queue.length });
      alert('AI reminder queue copied.');
    } catch {
      window.prompt('Copy reminder queue:', text);
    }
  };

  return (
    <section className="reveal reveal-delay-1 mb-12 overflow-hidden rounded-[2rem] border border-emerald-400/15 bg-emerald-400/[0.035] shadow-2xl shadow-black/20">
      <div className="border-b border-white/10 p-5 sm:p-8 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                AI Payment Collection Agent
              </p>
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Get paid faster with follow-up intelligence.
            </h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
              ClientFlow AI ranks unpaid invoices, suggests the right WhatsApp tone, tracks promises to pay, and scores client payment behavior.
            </p>
          </div>

          {topTarget && (
            <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 lg:min-w-[260px]">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-300">Top Target</p>
              <p className="mt-2 text-lg font-black text-white">{topTarget.clientName}</p>
              <p className="mt-1 text-xs font-bold text-red-100/80">{topTarget.reason}</p>
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Recoverable This Week', value: formatMoney(opportunity.recoverableThisWeek), tone: 'text-emerald-300' },
            { label: 'Promises Due Now', value: promiseStats.dueNow || 0, tone: 'text-yellow-300' },
            { label: 'Active Promises', value: promiseStats.active || 0, tone: 'text-white' },
            { label: 'Overdue Amount', value: formatMoney(opportunity.overdueAmount), tone: 'text-red-300' }
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/8 bg-black/20 p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{item.label}</p>
              <p className={`mt-3 text-2xl font-black ${item.tone}`}>{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${automationOn ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                  AI Reminder Automation
                </p>
                <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  WhatsApp-assisted
                </span>
              </div>

              <h3 className="mt-3 text-2xl font-black text-white">
                {automationOn ? `${autoQueue.length} reminder${autoQueue.length === 1 ? '' : 's'} ready today` : 'Reminder automation is paused'}
              </h3>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-zinc-400">
                {automationOn
                  ? 'The agent checks due dates, overdue invoices, payment promises, and invoice value to prepare the right follow-up automatically. WhatsApp still needs one click to send.'
                  : 'Turn it on to let ClientFlow AI prepare your daily follow-up queue automatically.'}
              </p>

              {nextAutoTarget && automationOn && (
                <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Next Reminder</p>
                  <p className="mt-2 text-sm font-black text-white">
                    {nextAutoTarget.clientName} / {nextAutoTarget.invoiceNumber} / {formatMoney(nextAutoTarget.amount)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-emerald-100/80">
                    {nextAutoTarget.automationLabel || nextAutoTarget.reason} / Best time: {nextAutoTarget.automationBestTime || '10:00 AM'}
                  </p>
                </div>
              )}
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto lg:min-w-[420px] lg:grid-cols-1 xl:grid-cols-3">
              <button
                type="button"
                onClick={() => setAutomationOn((value) => !value)}
                className={`rounded-xl border px-4 py-3 text-[10px] font-black uppercase tracking-widest transition ${
                  automationOn
                    ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15'
                    : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'
                }`}
              >
                {automationOn ? 'Agent On' : 'Turn On'}
              </button>

              <button
                type="button"
                disabled={!automationOn || !nextAutoTarget}
                onClick={() => sendFollowUp(nextAutoTarget, nextAutoTarget?.tone === 'final' ? 'final' : nextAutoTarget?.tone)}
                className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-yellow-300 transition hover:bg-yellow-400/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send Next
              </button>

              <button
                type="button"
                disabled={!automationOn || (!autoQueue.length && !nextAutoTarget)}
                onClick={copyAutomationQueue}
                className="rounded-xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-sky-300 transition hover:bg-sky-400/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Copy Queue
              </button>
            </div>
          </div>

          {automationOn && (
            <div className="mt-5 grid gap-3 text-[10px] font-black uppercase tracking-widest text-zinc-600 sm:grid-cols-3">
              <p className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                Ready now: <span className="text-white">{autoQueue.length}</span>
              </p>
              <p className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                Scheduled: <span className="text-white">{scheduledQueue.length}</span>
              </p>
              <p className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                Queue value: <span className="text-white">{formatMoney(reminderAutomation.queuedAmount || 0)}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)] lg:p-10">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h3 className="text-xl font-black text-white">Collection Priority</h3>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-zinc-600">Ranked by risk, due date, amount, and promises</p>
            </div>
          </div>

          {collectionPlan.length ? (
            collectionPlan.map((target) => (
              <div key={target.id} className="rounded-2xl border border-white/8 bg-black/20 p-4 sm:p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${scoreClass(target.priorityScore)}`}>
                        Score {target.priorityScore}
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        {target.suggestedAction}
                      </span>
                      {target.promiseStatus && (
                        <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sky-300">
                          Promise {target.promiseStatus.replace('_', ' ')}
                        </span>
                      )}
                    </div>

                    <p className="mt-3 text-lg font-black text-white">{target.clientName}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-widest text-zinc-600">
                      {target.invoiceNumber} / {formatMoney(target.amount)} / {target.reason}
                    </p>
                    {target.paymentPromise?.promisedDate && (
                      <p className="mt-2 text-xs font-semibold text-sky-200">
                        Promised for {formatDate(target.paymentPromise.promisedDate)}
                        {target.paymentPromise.note ? ` - ${target.paymentPromise.note}` : ''}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[360px]">
                    <button
                      type="button"
                      onClick={() => sendFollowUp(target, 'polite')}
                      className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-400/15"
                    >
                      Polite WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => sendFollowUp(target, target.tone === 'final' ? 'final' : 'firm')}
                      className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-yellow-300 transition hover:bg-yellow-400/15"
                    >
                      {target.tone === 'final' ? 'Final WhatsApp' : 'Firm WhatsApp'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openPromiseEditor(target)}
                      className="rounded-xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-sky-300 transition hover:bg-sky-400/15 sm:col-span-2"
                    >
                      Set Promise To Pay
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-white/8 bg-black/20 p-8 text-center">
              <p className="text-sm font-bold text-emerald-300">No unpaid invoices need follow-up right now.</p>
              <p className="mt-2 text-xs font-semibold text-zinc-500">Create invoices with due dates to unlock collection priority.</p>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/8 bg-black/20 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Client Payment Scores</p>
            <div className="mt-4 space-y-3">
              {clientScores.length ? (
                clientScores.map((client) => (
                  <div key={client.clientEmail || client.clientName} className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{client.clientName}</p>
                        <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-widest text-zinc-600">{client.label}</p>
                      </div>
                      <p className={`text-2xl font-black ${clientScoreClass(client.score)}`}>{client.score}</p>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                      <span>{client.paidInvoices} paid</span>
                      <span>{client.pendingInvoices} pending</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm font-semibold text-zinc-500">Client scores appear after invoices are created.</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {promiseTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#0b1120] p-6 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">Promise To Pay</p>
            <h3 className="mt-3 text-2xl font-black text-white">{promiseTarget.clientName}</h3>
            <p className="mt-1 text-sm font-bold text-zinc-500">
              {promiseTarget.invoiceNumber} / {formatMoney(promiseTarget.amount)}
            </p>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Promised Date</span>
                <input
                  type="date"
                  value={promiseDate}
                  onChange={(event) => setPromiseDate(event.target.value)}
                  className="input bg-black/30"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Note</span>
                <textarea
                  value={promiseNote}
                  onChange={(event) => setPromiseNote(event.target.value)}
                  rows={3}
                  maxLength={240}
                  placeholder="Example: Client said payment will be done after bank approval."
                  className="input min-h-[96px] resize-none bg-black/30"
                />
              </label>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={savePromise}
                disabled={savingPromise}
                className="btn btn-primary px-5 py-3 text-xs font-black uppercase tracking-widest sm:col-span-1"
              >
                {savingPromise ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={clearPromise}
                disabled={savingPromise}
                className="btn btn-secondary px-5 py-3 text-xs font-black uppercase tracking-widest"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={closePromiseEditor}
                disabled={savingPromise}
                className="btn btn-dark px-5 py-3 text-xs font-black uppercase tracking-widest"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
