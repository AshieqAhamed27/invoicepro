import React, { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { trackEvent } from '../utils/analytics';

const formatMoney = (amount) =>
  `Rs ${Number(amount || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0
  })}`;

const optionClass =
  'input bg-black/20 border-white/5 py-3 text-xs font-bold text-zinc-200';

export default function PriceSuggestionAgent({ context = {}, onApplyPrice }) {
  const itemNames = useMemo(
    () => (Array.isArray(context.items) ? context.items.map((item) => item?.name).filter(Boolean).join(', ') : ''),
    [context.items]
  );

  const [form, setForm] = useState({
    serviceName: '',
    clientType: 'small_business',
    complexity: 'standard',
    experienceLevel: 'intermediate',
    timeline: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (form.serviceName) return;

    const inferredService = itemNames || context.serviceDescription || '';
    if (inferredService) {
      setForm((prev) => ({
        ...prev,
        serviceName: inferredService
      }));
    }
  }, [context.serviceDescription, form.serviceName, itemNames]);

  const suggestion = result?.suggestion;
  const range = suggestion?.range;

  const runSuggestion = async () => {
    const serviceName = String(form.serviceName || itemNames || context.serviceDescription || '').trim();

    if (!serviceName) {
      setError('Enter the service name or add a line item first.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await api.post('/ai/price-suggestion', {
        context: {
          ...context,
          ...form,
          serviceName,
          currentTotal: context.total || context.subtotal || 0
        }
      });

      setResult(res.data);
      trackEvent('generate_price_suggestion', {
        source: res.data?.source || 'rules',
        current_total: Number(context.total || 0)
      });
    } catch (err) {
      setError(
        err.friendlyMessage ||
          err.response?.data?.message ||
          'Price suggestion failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const applyPrice = (price, label = suggestion?.serviceLabel || form.serviceName) => {
    if (!price || !onApplyPrice) return;

    onApplyPrice(Number(price), label);
    trackEvent('apply_price_suggestion', {
      value: Number(price),
      currency: 'INR',
      package_label: label
    });
  };

  return (
    <section className="premium-panel overflow-hidden">
      <div className="border-b border-white/10 bg-white/[0.02] p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-yellow-400/20 bg-yellow-400/10 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-yellow-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">
                AI Price Suggestion
              </p>
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-white">
              Get a realistic market range for your service.
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-500">
              Estimate a fair INR range, package options, and strategy tips before you quote the client.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <p className="ml-1 text-[10px] font-black uppercase tracking-widest text-zinc-600">Service</p>
              <input
                value={form.serviceName}
                onChange={(e) => setForm({ ...form, serviceName: e.target.value })}
                placeholder="Website design, logo design, SEO audit, consulting..."
                className="input bg-black/20 border-white/5 py-4"
              />
            </div>

            <div className="space-y-1.5">
              <p className="ml-1 text-[10px] font-black uppercase tracking-widest text-zinc-600">Client Type</p>
              <select
                value={form.clientType}
                onChange={(e) => setForm({ ...form, clientType: e.target.value })}
                className={optionClass}
              >
                <option value="individual">Individual</option>
                <option value="small_business">Small Business</option>
                <option value="startup">Startup</option>
                <option value="agency">Agency</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <p className="ml-1 text-[10px] font-black uppercase tracking-widest text-zinc-600">Complexity</p>
              <select
                value={form.complexity}
                onChange={(e) => setForm({ ...form, complexity: e.target.value })}
                className={optionClass}
              >
                <option value="simple">Simple</option>
                <option value="standard">Standard</option>
                <option value="advanced">Advanced</option>
                <option value="premium">Premium</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <p className="ml-1 text-[10px] font-black uppercase tracking-widest text-zinc-600">Your Level</p>
              <select
                value={form.experienceLevel}
                onChange={(e) => setForm({ ...form, experienceLevel: e.target.value })}
                className={optionClass}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="senior">Senior</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <p className="ml-1 text-[10px] font-black uppercase tracking-widest text-zinc-600">Timeline</p>
              <input
                value={form.timeline}
                onChange={(e) => setForm({ ...form, timeline: e.target.value })}
                placeholder="Normal, 1 week, urgent..."
                className="input bg-black/20 border-white/5 py-3"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={runSuggestion}
            disabled={loading}
            className="btn btn-primary mt-5 px-6 py-3 text-xs font-black uppercase tracking-widest disabled:opacity-60"
          >
            {loading ? 'Checking Market...' : 'Suggest Price Range'}
          </button>

          {error && (
            <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm font-bold text-red-300">
              {error}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          {range ? (
            <>
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                  Suggested Range
                </p>
                <p className="mt-3 text-sm font-black text-white">{suggestion.serviceLabel}</p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-white/[0.04] p-3">
                    <p className="text-sm font-black text-zinc-300">{formatMoney(range.low)}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase text-zinc-600">Low</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => applyPrice(range.recommended, suggestion.serviceLabel)}
                    className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-3 transition-all hover:bg-emerald-400 hover:text-black"
                  >
                    <p className="text-sm font-black text-emerald-200">{formatMoney(range.recommended)}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase text-emerald-300">Apply</p>
                  </button>
                  <div className="rounded-lg bg-white/[0.04] p-3">
                    <p className="text-sm font-black text-zinc-300">{formatMoney(range.high)}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase text-zinc-600">High</p>
                  </div>
                </div>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                  Source: {result.source === 'openai' ? 'OpenAI + ClientFlow AI rules' : 'ClientFlow AI rules'}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Packages</p>
                <div className="mt-3 space-y-2">
                  {suggestion.packageIdeas?.map((pkg) => (
                    <button
                      key={`${pkg.name}-${pkg.price}`}
                      type="button"
                      onClick={() => applyPrice(pkg.price, `${suggestion.serviceLabel} - ${pkg.name}`)}
                      className="w-full rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left transition-all hover:border-yellow-400/25 hover:bg-yellow-400/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-black text-white">{pkg.name}</p>
                        <p className="shrink-0 text-sm font-black text-yellow-300">{formatMoney(pkg.price)}</p>
                      </div>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-zinc-500">{pkg.positioning}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">Strategy Tips</p>
                <div className="mt-3 space-y-2">
                  {suggestion.strategyTips?.slice(0, 3).map((tip) => (
                    <p key={tip} className="text-xs font-semibold leading-relaxed text-zinc-300">
                      {tip}
                    </p>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">How to use</p>
              <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">
                Add your service name and choose complexity. The agent will suggest low, recommended, and premium pricing.
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
