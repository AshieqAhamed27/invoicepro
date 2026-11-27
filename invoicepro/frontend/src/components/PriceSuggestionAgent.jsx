import React, { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { trackEvent } from '../utils/analytics';

const formatMoney = (amount) =>
  `Rs ${Number(amount || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0
  })}`;

const optionClass =
  'input bg-white border-slate-300 py-3 text-xs font-semibold text-slate-900';

const getAiSourceLabel = (source) => {
  if (source === 'anthropic') return 'Anthropic Claude + ClientFlow AI rules';
  if (source === 'openai') return 'OpenAI + ClientFlow AI rules';
  return 'ClientFlow AI rules';
};

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
      <div className="border-b border-slate-200 bg-slate-50 p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-yellow-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                AI Price Suggestion
              </p>
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900">
              Get a realistic market range for your service.
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-600">
              Estimate a fair INR range, package options, and strategy tips before you quote the client.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:p-6">
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <p className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Service</p>
              <input
                value={form.serviceName}
                onChange={(e) => setForm({ ...form, serviceName: e.target.value })}
                placeholder="Website design, logo design, SEO audit, consulting..."
                className="input bg-slate-50 border-slate-200 py-4"
              />
            </div>

            <div className="space-y-1.5">
              <p className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-800">Client Type</p>
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
              <p className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-800">Complexity</p>
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
              <p className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-800">Your Level</p>
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
              <p className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Timeline</p>
              <input
                value={form.timeline}
                onChange={(e) => setForm({ ...form, timeline: e.target.value })}
                placeholder="Normal, 1 week, urgent..."
                className="input bg-slate-50 border-slate-200 py-3"
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
            <div className="mt-5 rounded-xl border border-rose-200 bg-red-400/5 p-4 text-sm font-bold text-rose-700">
              {error}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          {range ? (
            <>
              <div className="rounded-xl border border-emerald-200 bg-emerald-400/5 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                  Suggested Range
                </p>
                <p className="mt-3 text-sm font-black text-slate-900">{suggestion.serviceLabel}</p>
                <div className="mt-4 grid gap-2 text-center sm:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="break-words text-sm font-black text-slate-700">{formatMoney(range.low)}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase text-slate-500">Low</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => applyPrice(range.recommended, suggestion.serviceLabel)}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 transition-all hover:bg-emerald-400 hover:text-black"
                  >
                    <p className="break-words text-sm font-black text-emerald-700">{formatMoney(range.recommended)}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase text-emerald-700">Apply</p>
                  </button>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="break-words text-sm font-black text-slate-700">{formatMoney(range.high)}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase text-slate-500">High</p>
                  </div>
                </div>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Source: {getAiSourceLabel(result.source)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Packages</p>
                <div className="mt-3 space-y-2">
                  {suggestion.packageIdeas?.map((pkg) => (
                    <button
                      key={`${pkg.name}-${pkg.price}`}
                      type="button"
                      onClick={() => applyPrice(pkg.price, `${suggestion.serviceLabel} - ${pkg.name}`)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition-all hover:border-amber-200 hover:bg-amber-50"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                        <p className="text-sm font-black text-slate-900">{pkg.name}</p>
                        <p className="shrink-0 text-sm font-black text-amber-700">{formatMoney(pkg.price)}</p>
                      </div>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">{pkg.positioning}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-yellow-400/5 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Strategy Tips</p>
                <div className="mt-3 space-y-2">
                  {suggestion.strategyTips?.slice(0, 3).map((tip) => (
                    <p key={tip} className="text-xs font-semibold leading-relaxed text-slate-700">
                      {tip}
                    </p>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">How to use</p>
              <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
                Add your service name and choose complexity. The agent will suggest low, recommended, and premium pricing.
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
