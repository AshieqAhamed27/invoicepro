import React, { useEffect, useMemo, useState } from 'react';

const setupOptions = {
  businessType: ['Freelancer', 'Agency', 'Consultant', 'Developer', 'Designer'],
  targetClient: ['Local businesses', 'Startups', 'Ecommerce stores', 'Coaches', 'Agencies'],
  paymentMethod: ['Razorpay + UPI', 'UPI only', 'Manual bank transfer', 'International clients'],
  workflow: [
    { id: 'business-autopilot', label: 'Automate my day' },
    { id: 'find-clients', label: 'Find clients' },
    { id: 'write-proposal', label: 'Write proposal' },
    { id: 'collect-payment', label: 'Collect payment' }
  ]
};

const defaultSetup = {
  businessType: 'Freelancer',
  service: 'Website, design, or business service package',
  targetClient: 'Local businesses',
  paymentMethod: 'Razorpay + UPI',
  workflow: 'business-autopilot',
  monthlyTarget: 50000
};

const loadSavedSetup = () => {
  try {
    return {
      ...defaultSetup,
      ...(JSON.parse(localStorage.getItem('clientflow_setup_profile') || '{}'))
    };
  } catch {
    return defaultSetup;
  }
};

export const getSavedSetupProfile = () => loadSavedSetup();

export default function ClientSetupWizard({
  onApplySetup,
  onOpenAutopilot,
  selectedWorkflowId,
  stats = {}
}) {
  const [setup, setSetup] = useState(loadSavedSetup);
  const [saved, setSaved] = useState(() => {
    try {
      return localStorage.getItem('clientflow_setup_completed') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setSetup((prev) => ({
      ...prev,
      workflow: selectedWorkflowId || prev.workflow
    }));
  }, [selectedWorkflowId]);

  const readiness = useMemo(() => {
    const checks = [
      Boolean(setup.businessType),
      Boolean(setup.service?.trim()),
      Boolean(setup.targetClient),
      Boolean(setup.paymentMethod),
      Boolean(setup.workflow),
      saved,
      Number(stats.total || 0) > 0 || Number(stats.paymentLinks || 0) > 0
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [saved, setup, stats.paymentLinks, stats.total]);

  const updateField = (field, value) => {
    setSetup((prev) => ({
      ...prev,
      [field]: field === 'monthlyTarget' ? Number(value || 0) : value
    }));
  };

  const saveSetup = () => {
    const normalized = {
      ...setup,
      service: setup.service.trim() || defaultSetup.service,
      monthlyTarget: Math.max(1000, Number(setup.monthlyTarget || defaultSetup.monthlyTarget))
    };

    try {
      localStorage.setItem('clientflow_setup_profile', JSON.stringify(normalized));
      localStorage.setItem('clientflow_setup_completed', '1');
      localStorage.setItem('clientflow_selected_workflow', normalized.workflow);
      if (normalized.workflow === 'business-autopilot') {
        localStorage.setItem('clientflow_autopilot_enabled', '1');
      }
    } catch {
      // The wizard still works as a local guide when storage is unavailable.
    }

    setSetup(normalized);
    setSaved(true);
    onApplySetup?.(normalized);
  };

  return (
    <section className="reveal reveal-delay-1 mb-12 rounded-[2rem] border border-sky-300/20 bg-sky-300/[0.045] p-5 shadow-2xl shadow-black/20 sm:p-8 lg:p-10">
      <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(260px,0.35fr)] lg:items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">First-time setup wizard</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Turn a new account into a working business flow.
          </h2>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
            Save the user&apos;s business type, offer, target client, payment method, and default workflow so ClientFlow AI can open the right next step without confusion.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Workspace readiness</p>
          <p className="mt-2 text-5xl font-black text-white">{readiness}%</p>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-500">
            {saved ? 'Setup profile saved.' : 'Save setup to personalize the dashboard.'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <label className="grid gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Business</span>
          <select
            value={setup.businessType}
            onChange={(event) => updateField('businessType', event.target.value)}
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none focus:border-sky-300/50"
          >
            {setupOptions.businessType.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>

        <label className="grid gap-2 lg:col-span-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Main service</span>
          <input
            type="text"
            value={setup.service}
            onChange={(event) => updateField('service', event.target.value)}
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-zinc-700 focus:border-sky-300/50"
            placeholder="Example: website redesign package"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Target client</span>
          <select
            value={setup.targetClient}
            onChange={(event) => updateField('targetClient', event.target.value)}
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none focus:border-sky-300/50"
          >
            {setupOptions.targetClient.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Monthly target</span>
          <input
            type="number"
            min="1000"
            step="1000"
            value={setup.monthlyTarget}
            onChange={(event) => updateField('monthlyTarget', event.target.value)}
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none focus:border-sky-300/50"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
        <label className="grid gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Payment path</span>
          <select
            value={setup.paymentMethod}
            onChange={(event) => updateField('paymentMethod', event.target.value)}
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none focus:border-sky-300/50"
          >
            {setupOptions.paymentMethod.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Default workflow</span>
          <select
            value={setup.workflow}
            onChange={(event) => updateField('workflow', event.target.value)}
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none focus:border-sky-300/50"
          >
            {setupOptions.workflow.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2 lg:flex">
          <button
            type="button"
            onClick={saveSetup}
            className="rounded-2xl bg-sky-300 px-5 py-4 text-xs font-black uppercase tracking-widest text-slate-950 transition hover:bg-sky-200 active:scale-95"
          >
            {saved ? 'Update Setup' : 'Save Setup'}
          </button>
          <button
            type="button"
            onClick={onOpenAutopilot}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white/[0.08] active:scale-95"
          >
            Open Autopilot
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {[
          ['Profile', `${setup.businessType} selling ${setup.service}`],
          ['Market', `${setup.targetClient} with ${setup.paymentMethod}`],
          ['Next path', setupOptions.workflow.find((item) => item.id === setup.workflow)?.label || 'Autopilot']
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">{label}</p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-300">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
