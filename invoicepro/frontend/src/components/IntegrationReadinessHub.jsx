import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const statusCopy = {
  active: {
    label: 'Active',
    className: 'border-emerald-200 bg-emerald-300/[0.08] text-emerald-700'
  },
  connected: {
    label: 'Connected',
    className: 'border-emerald-200 bg-emerald-300/[0.08] text-emerald-700'
  },
  'demo-mode': {
    label: 'Demo Mode',
    className: 'border-sky-200 bg-sky-300/[0.08] text-sky-700'
  },
  'needs-setup': {
    label: 'Needs Setup',
    className: 'border-amber-200 bg-yellow-300/[0.08] text-amber-700'
  },
  'missing-key': {
    label: 'Missing Key',
    className: 'border-rose-200 bg-red-300/[0.07] text-rose-700'
  },
  optional: {
    label: 'Optional',
    className: 'border-slate-200 bg-slate-50 text-slate-700'
  }
};

const getStatusMeta = (status) => statusCopy[status] || statusCopy['missing-key'];

const buildFallbackReadiness = (health) => {
  const env = health?.envSanity || {};
  const ai = env.ai || {};
  const payments = env.payments || {};
  const razorpayReady = Boolean(payments.razorpayKeyId && payments.razorpayKeySecret);
  const aiReady = Boolean(ai.ready || ai.activeProvider || ai.openAiKey || ai.anthropicKey);
  const selectedProvider = ai.selectedProvider || ai.provider || 'openai';
  const anthropicSelected = selectedProvider === 'anthropic';
  const openAiSelected = selectedProvider === 'openai';

  const integrations = [
    {
      id: 'anthropic',
      group: 'AI',
      name: 'Anthropic',
      status: ai.activeProvider === 'anthropic'
        ? 'active'
        : ai.anthropicKey
          ? 'connected'
          : anthropicSelected
            ? 'missing-key'
            : 'optional',
      ready: Boolean(ai.anthropicKey),
      live: Boolean(ai.anthropicKey),
      detail: ai.anthropicKey
        ? `Configured with ${ai.anthropicModel || 'configured model'}.`
        : anthropicSelected
          ? 'Anthropic is selected but ANTHROPIC_API_KEY is missing.'
          : 'Optional Claude provider. Add it only when you want Claude or failover.',
      action: anthropicSelected && !ai.anthropicKey
        ? 'Add AI_PROVIDER, ANTHROPIC_API_KEY, and ANTHROPIC_MODEL in backend environment.'
        : 'No action needed unless you want Claude as an AI provider.',
      env: ['AI_PROVIDER', 'ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL']
    },
    {
      id: 'openai',
      group: 'AI',
      name: 'OpenAI',
      status: ai.activeProvider === 'openai'
        ? 'active'
        : ai.openAiKey
          ? 'connected'
          : openAiSelected
            ? 'missing-key'
            : 'optional',
      ready: Boolean(ai.openAiKey),
      live: Boolean(ai.openAiKey),
      detail: ai.openAiKey
        ? `Configured with ${ai.openAiModel || 'configured model'}.`
        : openAiSelected
          ? 'OpenAI is selected but OPENAI_API_KEY is missing.'
          : 'Optional OpenAI provider. Add it only when you want OpenAI or failover.',
      action: openAiSelected && !ai.openAiKey
        ? 'Add OPENAI_API_KEY and OPENAI_MODEL in backend environment.'
        : 'No action needed unless you want OpenAI as an AI provider.',
      env: ['AI_PROVIDER', 'OPENAI_API_KEY', 'OPENAI_MODEL']
    },
    {
      id: 'razorpay',
      group: 'Payments',
      name: 'Razorpay',
      status: payments.simulationEnabled ? 'demo-mode' : razorpayReady ? 'connected' : 'missing-key',
      ready: razorpayReady || Boolean(payments.simulationEnabled),
      live: razorpayReady && !payments.simulationEnabled,
      detail: payments.simulationEnabled ? 'Payment simulation is enabled.' : 'Razorpay checkout requires keys, webhook secret, and plan IDs.',
      action: 'Add Razorpay env values before real sales.',
      env: ['PAYMENT_SIMULATION', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET']
    },
    {
      id: 'stripe',
      group: 'Billing API',
      name: 'Stripe',
      status: 'optional',
      ready: false,
      live: false,
      detail: 'Optional for now. Razorpay can handle current checkout; Stripe is only needed for future global card billing.',
      action: 'Add Stripe env values only when global card billing is selected.',
      env: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']
    },
    {
      id: 'aws',
      group: 'Cloud',
      name: 'AWS',
      status: 'optional',
      ready: false,
      live: false,
      detail: 'Optional until AWS storage, deployment, or automation is added.',
      action: 'Add scoped AWS credentials only for a chosen workflow.',
      env: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION']
    },
    {
      id: 'azure',
      group: 'Cloud',
      name: 'Azure',
      status: 'optional',
      ready: false,
      live: false,
      detail: 'Optional until Microsoft cloud workflows are added.',
      action: 'Add Azure credentials only for a chosen workflow.',
      env: ['AZURE_CLIENT_ID', 'AZURE_TENANT_ID', 'AZURE_CLIENT_SECRET']
    },
    {
      id: 'gcp',
      group: 'Cloud',
      name: 'GCP',
      status: 'optional',
      ready: false,
      live: false,
      detail: 'Optional until Google Cloud workflows are added.',
      action: 'Add GCP service account values only for a chosen workflow.',
      env: ['GOOGLE_APPLICATION_CREDENTIALS', 'GCP_PROJECT_ID']
    }
  ];

  const readyCount = integrations.filter((item) => item.ready).length;
  const liveCount = integrations.filter((item) => item.live).length;

  return {
    score: Math.round((readyCount / integrations.length) * 100),
    currentProductScore: Math.round(([aiReady, razorpayReady || Boolean(payments.simulationEnabled)].filter(Boolean).length / 2) * 100),
    readyCount,
    liveCount,
    total: integrations.length,
    note: 'Fallback readiness uses legacy health fields and never exposes secret values.',
    integrations
  };
};

export default function IntegrationReadinessHub({ health = null, compact = false }) {
  const [remoteHealth, setRemoteHealth] = useState(null);
  const [loading, setLoading] = useState(!health);
  const [error, setError] = useState('');

  useEffect(() => {
    if (health) {
      setLoading(false);
      return undefined;
    }

    let active = true;

    const loadReadiness = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get('/health/launch-readiness');
        if (active) setRemoteHealth(res.data || null);
      } catch (err) {
        if (active) setError(err?.friendlyMessage || 'Integration readiness could not be checked right now.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadReadiness();

    return () => {
      active = false;
    };
  }, [health]);

  const sourceHealth = health || remoteHealth;
  const readiness = sourceHealth?.integrationReadiness || buildFallbackReadiness(sourceHealth);
  const integrations = readiness.integrations || [];
  const grouped = useMemo(() => integrations.reduce((acc, integration) => {
    const group = integration.group || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(integration);
    return acc;
  }, {}), [integrations]);
  const nextActions = integrations
    .filter((integration) => !integration.live && !['optional', 'connected'].includes(integration.status))
    .slice(0, 3);

  return (
    <section className={`reveal reveal-delay-1 mb-12 rounded-[2rem] border border-indigo-200 bg-cyan-300/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8 ${compact ? '' : 'lg:p-10'}`}>
      <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(260px,0.35fr)] lg:items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-700">Integration readiness hub</p>
          <h2 className={`${compact ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'} mt-3 font-black tracking-tight text-slate-900`}>
            Show which real systems are connected before users trust the workflow.
          </h2>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-relaxed text-slate-600 sm:text-base">
            This checks backend configuration for AI providers, payments, billing APIs, and cloud providers. It does not show secret values and it does not pretend optional integrations are live.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Current product score</p>
          <p className="mt-2 text-5xl font-black text-slate-900">{loading ? '--' : `${readiness.currentProductScore ?? readiness.score}%`}</p>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-600">
            {error || `${readiness.readyCount || 0}/${readiness.total || integrations.length} providers configured, ${readiness.liveCount || 0} live.`}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ['AI providers', grouped.AI?.length || 0, 'OpenAI and Anthropic status'],
          ['Payment systems', grouped.Payments?.length || 0, 'Razorpay live or demo state'],
          ['Cloud and billing', (grouped.Cloud?.length || 0) + (grouped['Billing API']?.length || 0), 'AWS, Azure, GCP, Stripe readiness']
        ].map(([label, value, detail]) => (
          <div key={label} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700">{label}</p>
            <p className="mt-2 text-4xl font-black text-slate-900">{loading ? '--' : value}</p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">{detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {integrations.map((integration) => {
            const status = getStatusMeta(integration.status);

            return (
              <article key={integration.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">{integration.group}</p>
                    <h3 className="mt-2 text-xl font-black text-slate-900">{integration.name}</h3>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${status.className}`}>
                    {status.label}
                  </span>
                </div>

                <p className="mt-4 text-sm font-semibold leading-relaxed text-slate-600">{integration.detail}</p>
                <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-500">{integration.action}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(integration.env || []).slice(0, 4).map((item) => (
                    <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-slate-600">
                      {item}
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        <aside className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-700">Next setup actions</p>
          <h3 className="mt-3 text-2xl font-black text-slate-900">Keep real and demo clearly separated.</h3>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
            Users can start with the current workflow. Real money, global billing, and cloud automation should only be advertised as live after the matching provider is configured.
          </p>

          <div className="mt-5 grid gap-3">
            {(nextActions.length ? nextActions : integrations.slice(0, 3)).map((integration) => {
              const status = getStatusMeta(integration.status);

              return (
                <div key={integration.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-black text-slate-900">{integration.name}</p>
                    <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-600">{integration.action}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link
              to="/launch"
              className="rounded-2xl bg-cyan-300 px-5 py-4 text-center text-xs font-black uppercase tracking-widest text-slate-950 transition hover:bg-cyan-200 active:scale-95"
            >
              Launch Center
            </Link>
            <Link
              to="/settings"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-center text-xs font-black uppercase tracking-widest text-slate-900 transition hover:bg-slate-50 active:scale-95"
            >
              Settings
            </Link>
          </div>

          <p className="mt-4 text-xs font-semibold leading-relaxed text-slate-500">
            {readiness.note || 'Only readiness booleans are shown. Secret values stay in the backend environment.'}
          </p>
        </aside>
      </div>
    </section>
  );
}
