import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import useDocumentMeta from '../utils/useDocumentMeta';

const STORAGE_KEY = 'clientflow_profit_tracker_state';

const defaultTools = [
  { id: 'chatgpt', name: 'ChatGPT or AI assistant', monthlyCost: 1999, allocation: 25 },
  { id: 'design', name: 'Canva, design, or assets', monthlyCost: 499, allocation: 20 },
  { id: 'hosting', name: 'Hosting, domain, or cloud', monthlyCost: 799, allocation: 15 },
  { id: 'automation', name: 'Automation or productivity tools', monthlyCost: 399, allocation: 20 }
];

const defaultState = {
  projectName: 'Website redesign project',
  clientRevenue: 25000,
  expectedHours: 40,
  actualHours: 52,
  targetHourlyIncome: 500,
  collaboratorCost: 5000,
  paymentFeePercent: 2.5,
  otherExpenses: 1200,
  tools: defaultTools
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value) =>
  `Rs ${Math.round(toNumber(value)).toLocaleString('en-IN')}`;

const formatPercent = (value) =>
  `${Number(toNumber(value)).toFixed(1).replace('.0', '')}%`;

const buildRecommendation = ({ margin, effectiveHourlyIncome, targetHourlyIncome, hourOverrunPercent }) => {
  if (margin < 15) {
    return {
      tone: 'red',
      title: 'Profit is too thin',
      text: 'Raise the price, reduce tool usage, reduce extra revisions, or collect an advance before starting similar work.'
    };
  }

  if (hourOverrunPercent > 25) {
    return {
      tone: 'yellow',
      title: 'Hours are leaking profit',
      text: 'The project is still profitable, but your time is costing more than expected. Add clearer scope and revision limits next time.'
    };
  }

  if (effectiveHourlyIncome < targetHourlyIncome) {
    return {
      tone: 'yellow',
      title: 'Income target not reached',
      text: 'Your project made money, but your hourly income is below target. Increase package price or reduce delivery time.'
    };
  }

  return {
    tone: 'emerald',
    title: 'Healthy project profit',
    text: 'This project is financially healthy. Save this pricing pattern and use it as a reference for your next proposal.'
  };
};

const toneClasses = {
  emerald: 'border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-100',
  yellow: 'border-yellow-300/25 bg-yellow-300/[0.08] text-yellow-100',
  red: 'border-red-300/25 bg-red-300/[0.08] text-red-100'
};

export default function ProfitTracker() {
  const [state, setState] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return stored ? { ...defaultState, ...stored, tools: stored.tools?.length ? stored.tools : defaultTools } : defaultState;
    } catch {
      return defaultState;
    }
  });

  useDocumentMeta({
    title: 'Profit Tracker | ClientFlow AI',
    description: 'Track project profit after AI tools, software subscriptions, payment fees, collaborator costs, and delivery hours.'
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { }
  }, [state]);

  const numbers = useMemo(() => {
    const toolCost = state.tools.reduce((total, tool) => {
      const monthlyCost = toNumber(tool.monthlyCost);
      const allocation = Math.min(100, Math.max(0, toNumber(tool.allocation)));
      return total + (monthlyCost * allocation) / 100;
    }, 0);
    const revenue = toNumber(state.clientRevenue);
    const paymentFees = (revenue * toNumber(state.paymentFeePercent)) / 100;
    const totalCosts = toolCost + paymentFees + toNumber(state.collaboratorCost) + toNumber(state.otherExpenses);
    const netProfit = revenue - totalCosts;
    const margin = revenue ? (netProfit / revenue) * 100 : 0;
    const actualHours = Math.max(1, toNumber(state.actualHours));
    const expectedHours = Math.max(1, toNumber(state.expectedHours));
    const effectiveHourlyIncome = netProfit / actualHours;
    const minimumPriceForTarget = totalCosts + (toNumber(state.targetHourlyIncome) * actualHours);
    const hourOverrunPercent = ((actualHours - expectedHours) / expectedHours) * 100;

    return {
      toolCost,
      revenue,
      paymentFees,
      totalCosts,
      netProfit,
      margin,
      actualHours,
      effectiveHourlyIncome,
      minimumPriceForTarget,
      hourOverrunPercent
    };
  }, [state]);

  const recommendation = buildRecommendation({
    margin: numbers.margin,
    effectiveHourlyIncome: numbers.effectiveHourlyIncome,
    targetHourlyIncome: toNumber(state.targetHourlyIncome),
    hourOverrunPercent: numbers.hourOverrunPercent
  });

  const updateField = (field, value) => {
    setState((prev) => ({ ...prev, [field]: value }));
  };

  const updateTool = (id, field, value) => {
    setState((prev) => ({
      ...prev,
      tools: prev.tools.map((tool) => (tool.id === id ? { ...tool, [field]: value } : tool))
    }));
  };

  const addTool = () => {
    setState((prev) => ({
      ...prev,
      tools: [
        ...prev.tools,
        {
          id: `tool-${Date.now()}`,
          name: 'New tool',
          monthlyCost: 0,
          allocation: 10
        }
      ]
    }));
  };

  const removeTool = (id) => {
    setState((prev) => ({
      ...prev,
      tools: prev.tools.filter((tool) => tool.id !== id)
    }));
  };

  const resetExample = () => setState(defaultState);

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10 md:py-16">
        <section className="mb-10 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.55fr)] lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">
                Profit and AI tool cost control
              </span>
            </div>
            <h1 className="max-w-4xl text-4xl font-black leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Know if a project is actually profitable.
            </h1>
            <p className="mt-5 max-w-3xl text-base font-semibold leading-relaxed text-zinc-400 sm:text-lg">
              ClientFlow AI now checks revenue, AI tools, software subscriptions, payment fees, team cost, and delivery hours so freelancers do not work hard and still lose money.
            </p>
            <div className="mt-5 max-w-3xl rounded-2xl border border-yellow-300/20 bg-yellow-300/[0.08] px-4 py-3">
              <p className="text-sm font-bold leading-relaxed text-yellow-100">
                Example values are added only to help you understand this tool. Edit them with your real project values to see actual profit.
              </p>
            </div>
          </div>

          <div className={`rounded-[1.5rem] border p-5 ${toneClasses[recommendation.tone]}`}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">AI Profit Signal</p>
            <h2 className="mt-3 text-2xl font-black text-white">{recommendation.title}</h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-300">{recommendation.text}</p>
          </div>
        </section>

        <section className="mb-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['Net profit', formatCurrency(numbers.netProfit), numbers.netProfit >= 0 ? 'After all costs' : 'Project is losing money'],
            ['Profit margin', formatPercent(numbers.margin), 'Healthy target: 30% or more'],
            ['Hourly income', formatCurrency(numbers.effectiveHourlyIncome), `Target: ${formatCurrency(state.targetHourlyIncome)}`],
            ['Minimum next price', formatCurrency(numbers.minimumPriceForTarget), 'Price needed to hit target income']
          ].map(([label, value, detail]) => (
            <article key={label} className="rounded-[1.5rem] border border-white/8 bg-white/[0.04] p-5 shadow-xl shadow-black/10 transition hover:-translate-y-1 hover:border-white/15">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
              <p className="mt-3 text-3xl font-black tracking-tight text-white">{value}</p>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-500">{detail}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
          <div className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-5 shadow-2xl shadow-black/20 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Project numbers</p>
                <h2 className="mt-2 text-2xl font-black text-white">Enter the real project cost</h2>
              </div>
              <button
                type="button"
                onClick={resetExample}
                className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-white/10"
              >
                Reset example
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Project name</span>
                <input
                  value={state.projectName}
                  onChange={(event) => updateField('projectName', event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-yellow-300/50"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ['clientRevenue', 'Client revenue', 'number'],
                  ['expectedHours', 'Expected hours', 'number'],
                  ['actualHours', 'Actual hours', 'number'],
                  ['targetHourlyIncome', 'Target hourly income', 'number'],
                  ['collaboratorCost', 'Freelancer/team cost', 'number'],
                  ['paymentFeePercent', 'Payment fee %', 'number'],
                  ['otherExpenses', 'Other expenses', 'number']
                ].map(([field, label, type]) => (
                  <label key={field} className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-500">{label}</span>
                    <input
                      type={type}
                      min="0"
                      value={state[field]}
                      onChange={(event) => updateField(field, event.target.value)}
                      className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-yellow-300/50"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-5 shadow-2xl shadow-black/20 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">AI and software spend</p>
                <h2 className="mt-2 text-2xl font-black text-white">Allocate tool costs to this project</h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-500">
                  Add the tools you paid for and estimate how much of each tool was used for this project.
                </p>
              </div>
              <button
                type="button"
                onClick={addTool}
                className="rounded-xl border border-sky-300/20 bg-sky-300/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-sky-100 transition hover:bg-sky-300/15"
              >
                Add tool
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              {state.tools.map((tool) => {
                const allocated = (toNumber(tool.monthlyCost) * Math.min(100, Math.max(0, toNumber(tool.allocation)))) / 100;

                return (
                  <article key={tool.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_120px_110px_auto] lg:items-end">
                      <label className="grid gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Tool</span>
                        <input
                          value={tool.name}
                          onChange={(event) => updateTool(tool.id, 'name', event.target.value)}
                          className="min-w-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-semibold text-white outline-none transition focus:border-sky-300/50"
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Monthly Rs</span>
                        <input
                          type="number"
                          min="0"
                          value={tool.monthlyCost}
                          onChange={(event) => updateTool(tool.id, 'monthlyCost', event.target.value)}
                          className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-semibold text-white outline-none transition focus:border-sky-300/50"
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Used %</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={tool.allocation}
                          onChange={(event) => updateTool(tool.id, 'allocation', event.target.value)}
                          className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-semibold text-white outline-none transition focus:border-sky-300/50"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => removeTool(tool.id)}
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition hover:border-red-300/30 hover:bg-red-300/10 hover:text-red-100"
                      >
                        Remove
                      </button>
                    </div>
                    <p className="mt-3 text-xs font-semibold text-zinc-500">
                      Allocated to this project: <span className="font-black text-white">{formatCurrency(allocated)}</span>
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-3">
          <article className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5 lg:col-span-2">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-purple-300">Cost breakdown</p>
            <div className="mt-5 grid gap-3">
              {[
                ['AI and software tools', numbers.toolCost],
                ['Payment processing fee', numbers.paymentFees],
                ['Freelancer or team cost', state.collaboratorCost],
                ['Other expenses', state.otherExpenses],
                ['Total project cost', numbers.totalCosts]
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col gap-1 rounded-2xl border border-white/8 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-bold text-zinc-300">{label}</span>
                  <span className="text-lg font-black text-white">{formatCurrency(value)}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[1.5rem] border border-yellow-300/20 bg-yellow-300/[0.06] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-200">What this solves</p>
            <h2 className="mt-3 text-2xl font-black text-white">Freelancers stop guessing profit.</h2>
            <ul className="mt-5 space-y-3 text-sm font-semibold leading-relaxed text-zinc-300">
              <li>Shows if the price is too low before repeating the same mistake.</li>
              <li>Connects AI tool cost to actual project profit.</li>
              <li>Protects freelancers from working many hours for weak income.</li>
              <li>Gives a better minimum price for the next proposal.</li>
            </ul>
          </article>
        </section>
      </main>
    </div>
  );
}
