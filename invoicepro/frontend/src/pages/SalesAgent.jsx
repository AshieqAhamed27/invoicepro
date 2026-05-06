import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import useDocumentMeta from '../utils/useDocumentMeta';
import { trackEvent } from '../utils/analytics';

const actionTone = {
  High: 'border-red-400/20 bg-red-400/10 text-red-200',
  Medium: 'border-yellow-400/20 bg-yellow-400/10 text-yellow-200',
  Start: 'border-sky-400/20 bg-sky-400/10 text-sky-200',
  Normal: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
};

const formatMoney = (amount) =>
  Number(amount || 0) > 0 ? `Rs ${Number(amount || 0).toLocaleString('en-IN')}` : 'No value';

const formatDate = (value) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const SkeletonBlock = () => (
  <div className="grid gap-5">
    <div className="h-40 animate-pulse rounded-[2rem] bg-white/5" />
    <div className="grid gap-4 md:grid-cols-2">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="h-36 animate-pulse rounded-[1.5rem] bg-white/5" />
      ))}
    </div>
  </div>
);

export default function SalesAgent() {
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  useDocumentMeta(
    'AI SDR & Sales Automation Agent | ClientFlow AI',
    'Use ClientFlow AI to decide who to message today, what proposal to follow up, and which unpaid invoice to collect.'
  );

  const loadAgent = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/ai/sales-agent');
      setAgent(res.data?.agent || null);
      trackEvent('open_sales_agent', { source: res.data?.source || 'unknown' });
    } catch (err) {
      setError(err?.friendlyMessage || err?.response?.data?.message || 'Sales agent could not load.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgent();
  }, []);

  const copyText = async (label, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 1800);
      trackEvent('copy_sales_agent_script', { label });
    } catch {
      window.prompt('Copy this message:', text);
    }
  };

  const forecast = agent?.forecast || {};

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10 md:py-16">
        <section className="reveal mb-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200">
                AI SDR & Sales Automation Agent
              </span>
            </div>
            <h1 className="max-w-4xl text-4xl font-black leading-none tracking-tight text-white sm:text-5xl lg:text-6xl">
              Know who to contact, what to say, and what money to collect today.
            </h1>
            <p className="mt-5 max-w-3xl text-base font-medium leading-relaxed text-zinc-500 sm:text-lg">
              The agent reads your leads, proposals, and invoices, then creates a daily sales action list. It prepares messages, but the user approves every send.
            </p>
          </div>

          <div className="rounded-3xl border border-white/8 bg-black/20 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Next Best Move</p>
            <p className="mt-3 text-xl font-black leading-tight text-white">
              {agent?.nextBestMove?.title || 'Build your first sales action list'}
            </p>
            <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-500">
              {agent?.nextBestMove?.detail || 'Save leads and create proposals/invoices so the agent can rank your next action.'}
            </p>
          </div>
        </section>

        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold leading-relaxed text-zinc-400">
              {agent?.summary || 'Loading your sales pipeline...'}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={loadAgent}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10"
            >
              Refresh Agent
            </button>
            <Link
              to="/client-finder"
              className="rounded-xl bg-yellow-300 px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-black hover:bg-yellow-200"
            >
              Find Clients
            </Link>
          </div>
        </div>

        {loading ? (
          <SkeletonBlock />
        ) : error ? (
          <div className="premium-panel p-8 text-center">
            <p className="text-sm font-bold text-red-300">{error}</p>
            <button
              type="button"
              onClick={loadAgent}
              className="mt-5 rounded-xl border border-white/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-white/10"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {(agent?.scoreCards || []).map((card) => (
                <div key={card.label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{card.label}</p>
                  <p className="mt-2 text-3xl font-black text-white">{card.value}</p>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-500">{card.note}</p>
                </div>
              ))}
            </section>

            <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="premium-panel p-5 sm:p-8">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Today</p>
                    <h2 className="mt-2 text-2xl font-black text-white">Sales Action Plan</h2>
                  </div>
                  <Link
                    to="/leads"
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10"
                  >
                    Open Pipeline
                  </Link>
                </div>

                <div className="grid gap-4">
                  {(agent?.dailyActions || []).map((action, index) => (
                    <article key={`${action.type}-${index}`} className="rounded-[1.5rem] border border-white/8 bg-black/20 p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-sm font-black text-black">
                              {index + 1}
                            </span>
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${actionTone[action.priority] || actionTone.Normal}`}>
                              {action.priority}
                            </span>
                            <span className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-200">
                              {action.value}
                            </span>
                          </div>
                          <h3 className="mt-4 text-xl font-black leading-tight text-white">{action.title}</h3>
                          <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-500">{action.detail}</p>
                        </div>

                        <div className="grid shrink-0 gap-3 sm:grid-cols-2 lg:w-48 lg:grid-cols-1">
                          <Link
                            to={action.path || '/dashboard'}
                            className="rounded-xl bg-white px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-black hover:bg-yellow-200"
                          >
                            {action.cta || 'Open'}
                          </Link>
                          <button
                            type="button"
                            onClick={() => copyText(action.title, action.message)}
                            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10"
                          >
                            {copied === action.title ? 'Copied' : 'Copy Message'}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <aside className="space-y-5">
                <div className="premium-panel p-5 sm:p-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Sales Forecast</p>
                  <div className="mt-5 grid gap-3">
                    {[
                      ['Pipeline', formatMoney(forecast.pipelineValue)],
                      ['Open proposals', formatMoney(forecast.openProposalValue)],
                      ['Accepted proposals', formatMoney(forecast.acceptedProposalValue)],
                      ['Pending invoices', formatMoney(forecast.pendingInvoiceValue)]
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{label}</p>
                        <p className="text-right text-sm font-black text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-400/10 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Focus</p>
                    <p className="mt-2 text-sm font-bold leading-relaxed text-white">{forecast.closeFocus}</p>
                  </div>
                </div>

                <div className="premium-panel p-5 sm:p-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Automation Rules</p>
                  <div className="mt-5 grid gap-3">
                    {(agent?.rules || []).map((rule) => (
                      <div key={rule} className="flex gap-3 rounded-2xl border border-white/8 bg-black/20 p-4">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
                        <p className="text-xs font-semibold leading-relaxed text-zinc-400">{rule}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </section>

            <section className="premium-panel p-5 sm:p-8">
              <div className="mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">Message Library</p>
                <h2 className="mt-2 text-2xl font-black text-white">Copy-ready sales scripts</h2>
                <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-500">
                  These are prepared from your current leads, proposals, and invoices. Edit before sending.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {(agent?.scripts || []).map((script) => (
                  <article key={script.label} className="rounded-2xl border border-white/8 bg-black/20 p-5">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-black text-white">{script.label}</h3>
                        <p className="mt-1 text-xs font-medium text-zinc-500">{script.useCase}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText(script.label, script.text)}
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white/10 hover:text-white"
                      >
                        {copied === script.label ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap break-words rounded-xl bg-white/[0.03] p-4 text-sm font-medium leading-relaxed text-zinc-400">{script.text}</pre>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-3">
              <div className="premium-panel p-5 sm:p-8">
                <h2 className="text-xl font-black text-white">Lead Queue</h2>
                <div className="mt-5 grid gap-3">
                  {(agent?.leadQueue || []).length ? agent.leadQueue.map((lead) => (
                    <div key={lead.id || lead.name} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-black text-white">{lead.name}</p>
                        <span className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-2 py-1 text-[10px] font-black text-emerald-300">
                          {lead.score}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs font-medium leading-relaxed text-zinc-500">{lead.reason}</p>
                      <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                        Follow-up: {formatDate(lead.nextFollowUpAt)}
                      </p>
                    </div>
                  )) : (
                    <p className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm font-medium text-zinc-500">No saved leads yet.</p>
                  )}
                </div>
              </div>

              <div className="premium-panel p-5 sm:p-8">
                <h2 className="text-xl font-black text-white">Proposal Queue</h2>
                <div className="mt-5 grid gap-3">
                  {(agent?.proposalQueue || []).length ? agent.proposalQueue.map((proposal) => (
                    <div key={proposal.id || proposal.invoiceNumber} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <p className="truncate text-sm font-black text-white">{proposal.clientName || 'Client proposal'}</p>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-yellow-300">{formatMoney(proposal.amount)}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{proposal.status}</span>
                      </div>
                      <p className="mt-2 text-xs font-medium text-zinc-500">Valid: {formatDate(proposal.validUntil)}</p>
                    </div>
                  )) : (
                    <p className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm font-medium text-zinc-500">No open proposals yet.</p>
                  )}
                </div>
              </div>

              <div className="premium-panel p-5 sm:p-8">
                <h2 className="text-xl font-black text-white">Collection Queue</h2>
                <div className="mt-5 grid gap-3">
                  {(agent?.collectionQueue || []).length ? agent.collectionQueue.map((invoice) => (
                    <div key={invoice.id || invoice.invoiceNumber} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-black text-white">{invoice.clientName}</p>
                        <span className="text-xs font-black text-yellow-300">{formatMoney(invoice.amount)}</span>
                      </div>
                      <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-500">{invoice.reason}</p>
                      <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-zinc-600">{invoice.automationLabel}</p>
                    </div>
                  )) : (
                    <p className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm font-medium text-zinc-500">No pending collections.</p>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
