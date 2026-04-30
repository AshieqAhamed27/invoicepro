import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import Navbar from '../components/Navbar';

const API_BASE_URL = api.defaults.baseURL || '';
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

export default function Admin() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingError, setPricingError] = useState('');
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState('');

  const getScreenshotUrl = (request) => {
    return request.screenshotUrl
      ? `${API_ORIGIN}${request.screenshotUrl}`
      : `${API_ORIGIN}/api/payment/requests/${request._id}/screenshot`;
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/payment/requests');
      setRequests(res.data || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPricing = async () => {
    try {
      setPricingLoading(true);
      setPricingError('');
      const res = await api.get('/payment/plans');

      const plans = (res.data?.plans || []).reduce((acc, plan) => {
        if (plan?.id) {
          acc[plan.id] = Number(plan.amount || 0);
        }
        return acc;
      }, {});

      setPricing({
        pricingVersion: res.data?.pricingVersion || 'unknown',
        plans
      });
    } catch (err) {
      console.log(err);
      setPricingError('Could not load live backend pricing.');
    } finally {
      setPricingLoading(false);
    }
  };

  const fetchHealthDetails = async () => {
    try {
      setHealthLoading(true);
      setHealthError('');
      const res = await api.get('/health/details');
      setHealth(res.data || null);
    } catch (err) {
      console.log(err);
      setHealthError('Could not load backend runtime diagnostics.');
    } finally {
      setHealthLoading(false);
    }
  };

  const approve = async (id) => {
    try {
      await api.put(`/payment/approve/${id}`);
      alert('Plan upgraded successfully');
      fetchRequests();
    } catch (err) {
      console.log(err);
      alert('Error approving');
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchPricing();
    fetchHealthDetails();
  }, []);

  const monthlyAmount = pricing?.plans?.monthly ?? null;
  const yearlyAmount = pricing?.plans?.yearly ?? null;
  const pricingReady = Number(monthlyAmount || 0) > 0 && Number(yearlyAmount || 0) > 0;
  const requiredChecks = health?.envSanity?.required || {};
  const paymentChecks = health?.envSanity?.payments || {};
  const recurringChecks = health?.envSanity?.recurring || {};
  const requiredHealthy = Object.values(requiredChecks).length > 0 && Object.values(requiredChecks).every(Boolean);
  const paymentHealthy = paymentChecks.simulationEnabled || (paymentChecks.razorpayKeyId && paymentChecks.razorpayKeySecret);
  const envHealthy = requiredHealthy && Boolean(paymentHealthy);

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10 md:py-16">
        <div className="reveal mb-12">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-px w-8 bg-red-500" />
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Security & Permissions</p>
          </div>
          <h1 className="text-4xl font-black sm:text-5xl tracking-tight text-white mb-4">
            Payment Audit
          </h1>
          <p className="max-w-2xl text-lg text-zinc-500 font-medium leading-relaxed">
            Verify manual payment evidence and confirm live checkout pricing.
          </p>
        </div>

        <section className="reveal reveal-delay-1 mb-12 premium-panel overflow-hidden">
          <div className="border-b border-white/5 p-5 sm:p-8 bg-white/[0.01] flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">Live Checkout Pricing</p>
              <h2 className="text-2xl font-black text-white tracking-tight">Backend payment diagnostics</h2>
            </div>

            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${pricingError
              ? 'bg-red-400/5 text-red-400 border-red-400/10'
              : pricingReady
                ? 'bg-emerald-400/5 text-emerald-400 border-emerald-400/10'
                : 'bg-yellow-400/5 text-yellow-500 border-yellow-400/10'
              }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${pricingError
                ? 'bg-red-400'
                : pricingReady
                  ? 'bg-emerald-400'
                  : 'bg-yellow-500 animate-pulse'
                }`} />
              {pricingError ? 'Unavailable' : pricingReady ? 'Pricing Loaded' : 'Needs Pricing'}
            </span>
          </div>

          <div className="grid gap-6 p-5 sm:p-8 md:grid-cols-3">
            <div className="rounded-[2rem] border border-white/5 bg-black/10 p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-3">Monthly Plan</p>
              <p className="text-4xl font-black text-white tracking-tighter">
                {pricingLoading ? '--' : `Rs ${monthlyAmount ?? 'N/A'}`}
              </p>
              <p className="mt-2 text-xs font-bold text-zinc-500">
                Source: backend / Razorpay plan
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/5 bg-black/10 p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-3">Annual Plan</p>
              <p className="text-4xl font-black text-white tracking-tighter">
                {pricingLoading ? '--' : `Rs ${yearlyAmount ?? 'N/A'}`}
              </p>
              <p className="mt-2 text-xs font-bold text-zinc-500">
                Source: backend / Razorpay plan
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/5 bg-black/10 p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-3">Backend Target</p>
              <p className="text-sm font-black text-white break-all leading-relaxed">
                {API_BASE_URL || 'Not configured'}
              </p>
              <p className="mt-3 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                Version: {pricing?.pricingVersion || 'unknown'}
              </p>
            </div>
          </div>

          {pricingError && (
            <div className="px-8 pb-8">
              <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-bold text-red-300">
                {pricingError}
              </div>
            </div>
          )}
        </section>

        <section className="reveal reveal-delay-2 mb-12 premium-panel overflow-hidden">
          <div className="border-b border-white/5 p-5 sm:p-8 bg-white/[0.01] flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">Runtime Diagnostics</p>
              <h2 className="text-2xl font-black text-white tracking-tight">Live backend health details</h2>
            </div>

            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${healthError
              ? 'bg-red-400/5 text-red-400 border-red-400/10'
              : envHealthy
                ? 'bg-emerald-400/5 text-emerald-400 border-emerald-400/10'
                : 'bg-yellow-400/5 text-yellow-500 border-yellow-400/10'
              }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${healthError
                ? 'bg-red-400'
                : envHealthy
                  ? 'bg-emerald-400'
                  : 'bg-yellow-500 animate-pulse'
                }`} />
              {healthError ? 'Unavailable' : envHealthy ? 'Env Ready' : 'Needs Review'}
            </span>
          </div>

          <div className="grid gap-6 p-5 sm:p-8 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[2rem] border border-white/5 bg-black/10 p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-3">Startup Entrypoint</p>
              <p className="text-2xl font-black text-white tracking-tight break-words">
                {healthLoading ? '--' : (health?.startup?.entrypoint || 'unknown')}
              </p>
              <p className="mt-2 text-xs font-bold text-zinc-500">
                Port: {health?.startup?.port || '--'}
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/5 bg-black/10 p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-3">Database State</p>
              <p className="text-2xl font-black text-white tracking-tight">
                {healthLoading ? '--' : (health?.database?.state || 'unknown')}
              </p>
              <p className="mt-2 text-xs font-bold text-zinc-500">
                Uptime: {health?.startup?.uptimeSeconds ?? '--'}s
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/5 bg-black/10 p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-3">Pricing Version</p>
              <p className="text-2xl font-black text-white tracking-tight break-words">
                {healthLoading ? '--' : (health?.pricingVersion || 'unknown')}
              </p>
              <p className="mt-2 text-xs font-bold text-zinc-500">
                Node: {health?.startup?.nodeVersion || '--'}
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/5 bg-black/10 p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-3">Env Sanity</p>
              <div className="space-y-2 text-xs font-bold text-zinc-400">
                <p>Required: {requiredHealthy ? 'OK' : 'Check'}</p>
                <p>Payments: {paymentChecks.simulationEnabled ? 'Simulation' : paymentHealthy ? 'Keys ready' : 'Check keys'}</p>
                <p>Recurring: {recurringChecks.cronSecret ? 'Cron ready' : 'Cron secret missing'}</p>
                <p>CORS origins: {health?.envSanity?.cors?.allowedOriginCount ?? '--'}</p>
              </div>
            </div>
          </div>

          {healthError && (
            <div className="px-8 pb-8">
              <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-bold text-red-300">
                {healthError}
              </div>
            </div>
          )}
        </section>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-96 rounded-[2.5rem] bg-white/5 border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="premium-panel p-8 text-center sm:p-12 lg:p-20">
            <div className="h-20 w-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/5 text-zinc-700">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h2 className="text-2xl font-black text-white mb-2">No Pending Actions</h2>
            <p className="text-zinc-500 font-medium">All upgrade requests have been processed.</p>
          </div>
        ) : (
          <div className="reveal reveal-delay-2 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {requests.map((req) => (
              <div
                key={req._id}
                className="group premium-panel overflow-hidden transition-all hover:scale-[1.02] hover:border-white/10 shadow-2xl"
              >
                <div className="border-b border-white/5 p-8 bg-white/[0.01]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">Requested Logic</p>
                      <h2 className="text-2xl font-black text-white capitalize tracking-tighter italic">
                        {req.plan} Pro
                      </h2>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${req.status === 'pending' ? 'bg-yellow-400/5 text-yellow-500 border-yellow-400/10' : 'bg-emerald-400/5 text-emerald-400 border-emerald-400/10'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${req.status === 'pending' ? 'bg-yellow-500 animate-pulse' : 'bg-emerald-400'}`} />
                      {req.status}
                    </span>
                  </div>
                </div>

                <div className="p-8">
                  <div className="relative mb-8 aspect-video rounded-2xl border border-white/5 overflow-hidden group/img">
                    <img
                      src={getScreenshotUrl(req)}
                      alt="Payment screenshot"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center p-4">
                      <a
                        href={getScreenshotUrl(req)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-2 bg-white text-black rounded-xl text-xs font-black uppercase tracking-widest"
                      >
                        View Full Resolution
                      </a>
                    </div>
                  </div>

                  {req.status === 'pending' && (
                    <button
                      onClick={() => approve(req._id)}
                      className="btn btn-primary w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-yellow-500/10 hover:shadow-yellow-500/20 active:scale-95 transition-all"
                    >
                      Authorize Upgrade
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
