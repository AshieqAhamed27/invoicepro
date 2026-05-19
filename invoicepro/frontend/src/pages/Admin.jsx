import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import Navbar from '../components/Navbar';

const API_BASE_URL = api.defaults.baseURL || '';
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN');
const formatMoney = (amount) => `Rs ${Number(amount || 0).toLocaleString('en-IN')}`;
const formatPercent = (value) => `${Number(value || 0).toLocaleString('en-IN', {
  maximumFractionDigits: 1
})}%`;
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
const formatDateTime = (value) => {
  if (!value) return 'Not tested';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not tested';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};
const getProviderLabel = (provider) => {
  if (provider === 'anthropic') return 'Anthropic Claude';
  if (provider === 'openai') return 'OpenAI';
  if (provider === 'auto') return 'Auto failover';
  return 'Not selected';
};
const getAiStatusClass = (status) => {
  if (status === 'ready') return 'border-emerald-400/10 bg-emerald-400/5 text-emerald-400';
  if (status === 'fallback-ready') return 'border-sky-400/10 bg-sky-400/5 text-sky-300';
  return 'border-yellow-400/10 bg-yellow-400/5 text-yellow-400';
};
const getAiTestClass = (result) => {
  if (!result) return 'border-white/5 bg-white/[0.03] text-zinc-400';
  return result.passed
    ? 'border-emerald-400/10 bg-emerald-400/5 text-emerald-300'
    : 'border-yellow-400/10 bg-yellow-400/5 text-yellow-300';
};
const getPlanLabel = (plan) => {
  if (plan === 'monthly') return 'Pro Monthly';
  if (plan === 'yearly') return 'Pro Yearly';
  if (plan === 'founder90') return 'Founder 90';
  if (plan === 'pro') return 'Pro';
  return plan || 'Paid';
};
const getStatusLabel = (status) => String(status || 'paid').replaceAll('_', ' ');
const USER_GRAPH_WIDTH = 720;
const USER_GRAPH_HEIGHT = 220;
const USER_GRAPH_PADDING = 30;
const getUserGraphMax = (rows) => Math.max(
  1,
  ...rows.flatMap((row) => [
    Number(row.visitors || 0),
    Number(row.members || 0),
    Number(row.featureEvents || 0)
  ])
);
const buildUserGraphPoints = (rows, key, maxValue) => {
  if (!rows.length) return '';

  const usableWidth = USER_GRAPH_WIDTH - (USER_GRAPH_PADDING * 2);
  const usableHeight = USER_GRAPH_HEIGHT - (USER_GRAPH_PADDING * 2);

  return rows.map((row, index) => {
    const x = USER_GRAPH_PADDING + (rows.length === 1
      ? usableWidth / 2
      : (index / (rows.length - 1)) * usableWidth);
    const y = USER_GRAPH_PADDING + usableHeight - ((Number(row[key] || 0) / maxValue) * usableHeight);
    return `${x},${y}`;
  }).join(' ');
};

export default function Admin() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingError, setPricingError] = useState('');
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState('');
  const [aiTestLoading, setAiTestLoading] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null);
  const [aiTestError, setAiTestError] = useState('');
  const [revenue, setRevenue] = useState(null);
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [revenueError, setRevenueError] = useState('');
  const [productAnalytics, setProductAnalytics] = useState(null);
  const [productAnalyticsLoading, setProductAnalyticsLoading] = useState(true);
  const [productAnalyticsError, setProductAnalyticsError] = useState('');
  const [analyticsUpdatedAt, setAnalyticsUpdatedAt] = useState('');
  const [agencyBookings, setAgencyBookings] = useState([]);
  const [agencyLoading, setAgencyLoading] = useState(true);
  const [agencyError, setAgencyError] = useState('');

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

  const runAiSmokeTest = async () => {
    try {
      setAiTestLoading(true);
      setAiTestError('');
      const res = await api.post('/ai/support-chat', {
        page: '/admin',
        messages: [
          {
            role: 'user',
            content: 'Admin AI smoke test. Reply in one short sentence that ClientFlow AI provider is working.'
          }
        ]
      });
      const source = res.data?.source || 'fallback';
      const passed = source === 'anthropic' || source === 'openai';

      setAiTestResult({
        passed,
        source,
        checkedAt: new Date().toISOString(),
        answerPreview: String(res.data?.answer || '').slice(0, 180)
      });
    } catch (err) {
      console.log(err);
      setAiTestResult({
        passed: false,
        source: 'error',
        checkedAt: new Date().toISOString(),
        answerPreview: ''
      });
      setAiTestError(err?.friendlyMessage || err?.response?.data?.message || 'AI smoke test failed.');
    } finally {
      setAiTestLoading(false);
    }
  };

  const fetchRevenue = async () => {
    try {
      setRevenueLoading(true);
      setRevenueError('');
      const res = await api.get('/payment/admin/revenue');
      setRevenue(res.data || null);
    } catch (err) {
      console.log(err);
      setRevenueError('Could not load revenue dashboard.');
    } finally {
      setRevenueLoading(false);
    }
  };

  const fetchProductAnalytics = async ({ silent = false } = {}) => {
    try {
      if (!silent) setProductAnalyticsLoading(true);
      setProductAnalyticsError('');
      const res = await api.get('/product-analytics/admin/summary');
      setProductAnalytics(res.data || null);
      setAnalyticsUpdatedAt(res.data?.refreshedAt || new Date().toISOString());
    } catch (err) {
      console.log(err);
      setProductAnalyticsError('Could not load product analytics.');
    } finally {
      setProductAnalyticsLoading(false);
    }
  };

  const fetchAgencyBookings = async () => {
    try {
      setAgencyLoading(true);
      setAgencyError('');
      const res = await api.get('/agency/admin/bookings');
      setAgencyBookings(res.data?.bookings || []);
    } catch (err) {
      console.log(err);
      setAgencyError('Could not load agency setup bookings.');
    } finally {
      setAgencyLoading(false);
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

  const updateAgencyStatus = async (id, status) => {
    try {
      await api.put(`/agency/admin/bookings/${id}/status`, { status });
      fetchAgencyBookings();
    } catch (err) {
      console.log(err);
      alert(err?.response?.data?.message || 'Could not update setup status');
    }
  };

  const updateChecklistItem = async (bookingId, item) => {
    try {
      await api.put(`/agency/admin/bookings/${bookingId}/checklist/${item.key}`, {
        done: !item.done,
        notes: item.notes || ''
      });
      fetchAgencyBookings();
    } catch (err) {
      console.log(err);
      alert(err?.response?.data?.message || 'Could not update checklist item');
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchPricing();
    fetchHealthDetails();
    fetchRevenue();
    fetchProductAnalytics();
    fetchAgencyBookings();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchProductAnalytics({ silent: true });
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  const monthlyAmount = pricing?.plans?.monthly ?? null;
  const yearlyAmount = pricing?.plans?.yearly ?? null;
  const pricingReady = Number(monthlyAmount || 0) > 0 && Number(yearlyAmount || 0) > 0;
  const requiredChecks = health?.envSanity?.required || {};
  const paymentChecks = health?.envSanity?.payments || {};
  const aiChecks = health?.envSanity?.ai || {};
  const recurringChecks = health?.envSanity?.recurring || {};
  const requiredHealthy = Object.values(requiredChecks).length > 0 && Object.values(requiredChecks).every(Boolean);
  const paymentHealthy = paymentChecks.simulationEnabled || (paymentChecks.razorpayKeyId && paymentChecks.razorpayKeySecret);
  const envHealthy = requiredHealthy && Boolean(paymentHealthy);
  const aiReady = Boolean(aiChecks.ready);
  const aiStatusLabel = aiChecks.status === 'fallback-ready'
    ? 'Fallback Ready'
    : aiReady ? 'Ready' : 'Needs Key';
  const agencyRevenue = agencyBookings
    .filter((booking) => ['paid', 'in_progress', 'delivered'].includes(booking.status))
    .reduce((sum, booking) => sum + Number(booking.amount || 0), 0);
  const getAgencyStatusClass = (status) => {
    if (status === 'delivered') return 'border-emerald-400/10 bg-emerald-400/5 text-emerald-400';
    if (status === 'in_progress' || status === 'paid') return 'border-sky-400/10 bg-sky-400/5 text-sky-300';
    if (status === 'payment_pending') return 'border-yellow-400/10 bg-yellow-400/5 text-yellow-400';
    return 'border-red-400/10 bg-red-400/5 text-red-300';
  };
  const productTotals = productAnalytics?.totals || {};
  const registeredMembers = Number(productTotals.registeredMembers || 0);
  const uniqueVisitors = Number(productTotals.uniqueVisitors || 0);
  const paidMembers = Number(productTotals.paidMembers || 0);
  const signupRate = uniqueVisitors > 0 ? (registeredMembers / uniqueVisitors) * 100 : 0;
  const paidRate = registeredMembers > 0 ? (paidMembers / registeredMembers) * 100 : 0;
  const dailyActivity = productAnalytics?.dailyActivity || [];
  const userGraphMax = getUserGraphMax(dailyActivity);
  const latestDailyActivity = dailyActivity[dailyActivity.length - 1] || {};
  const userGraphLines = [
    { key: 'visitors', label: 'Unique viewers', color: '#38bdf8' },
    { key: 'members', label: 'Logged-in members', color: '#34d399' },
    { key: 'featureEvents', label: 'Feature actions', color: '#facc15' }
  ];
  const platformEarnings = revenue?.platformEarnings || {};
  const earningSources = platformEarnings.sources || {};
  const paidUsersList = revenue?.paidUsers || [];

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
          <div className="border-b border-white/5 bg-white/[0.01] p-5 sm:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Product Growth</p>
                <h2 className="text-2xl font-black tracking-tight text-white">Unique member and usage analytics</h2>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-500">
                  Counts unique/new people only. Repeated visits from the same visitor are ignored in the main numbers.
                </p>
              </div>
              <span className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${
                productAnalyticsError ? 'border-red-400/10 bg-red-400/5 text-red-400' : 'border-emerald-400/10 bg-emerald-400/5 text-emerald-400'
              }`}>
                {productAnalyticsError ? 'Unavailable' : 'Live Tracking'}
              </span>
            </div>
          </div>

          <div className="grid gap-6 p-5 sm:p-8 md:grid-cols-2 xl:grid-cols-6">
            {[
              { label: 'New Product Viewers', value: productTotals.newProductViewers ?? productTotals.uniqueVisitors, tone: 'text-sky-300' },
              { label: 'New Visitors 7d', value: productAnalytics?.last7Days?.newVisitors, tone: 'text-white' },
              { label: 'Users Who Used', value: productTotals.usersWhoUsedProduct, tone: 'text-emerald-300' },
              { label: 'Active Users 30d', value: productTotals.activeMembers30d, tone: 'text-emerald-300' },
              { label: 'Free Users', value: productTotals.freeAccessMembers, tone: 'text-yellow-300' },
              { label: 'Paid Users', value: productTotals.paidMembers, tone: 'text-emerald-300' }
            ].map((item) => (
              <div key={item.label} className="rounded-[2rem] border border-white/5 bg-black/10 p-5">
                <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-600">{item.label}</p>
                <p className={`text-3xl font-black tracking-tight ${item.tone}`}>
                  {productAnalyticsLoading ? '--' : formatNumber(item.value)}
                </p>
              </div>
            ))}
          </div>

          <div className="px-5 pb-5 sm:px-8 sm:pb-8">
            <div className="rounded-[2rem] border border-white/5 bg-black/10 p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Real-Time User Graph</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-white">14-day user activity</h3>
                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-500">
                    Auto-refreshes from live product analytics and keeps repeated users counted once per day.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-sky-400/10 bg-sky-400/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-sky-300">
                    Auto 30s
                  </span>
                  <span className="rounded-full border border-white/5 bg-white/[0.03] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    {formatDateTime(analyticsUpdatedAt || productAnalytics?.refreshedAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => fetchProductAnalytics()}
                    disabled={productAnalyticsLoading}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-200 transition hover:border-sky-400/30 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {productAnalyticsLoading ? 'Refreshing' : 'Refresh'}
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_240px]">
                <div className="min-w-0 overflow-hidden rounded-[1.5rem] border border-white/5 bg-white/[0.025] p-4">
                  {dailyActivity.length > 0 ? (
                    <>
                      <div className="overflow-x-auto">
                        <svg
                          viewBox={`0 0 ${USER_GRAPH_WIDTH} ${USER_GRAPH_HEIGHT}`}
                          className="h-64 min-w-[640px] w-full sm:min-w-0"
                          role="img"
                          aria-label="Fourteen day user activity graph"
                        >
                          {[0, 1, 2, 3].map((line) => {
                            const y = USER_GRAPH_PADDING + ((USER_GRAPH_HEIGHT - (USER_GRAPH_PADDING * 2)) / 3) * line;
                            return (
                              <line
                                key={line}
                                x1={USER_GRAPH_PADDING}
                                y1={y}
                                x2={USER_GRAPH_WIDTH - USER_GRAPH_PADDING}
                                y2={y}
                                stroke="rgba(255,255,255,0.08)"
                                strokeWidth="1"
                              />
                            );
                          })}

                          <text x="4" y={USER_GRAPH_PADDING + 4} fill="rgba(255,255,255,0.45)" fontSize="12" fontWeight="700">
                            {formatNumber(userGraphMax)}
                          </text>
                          <text x="12" y={USER_GRAPH_HEIGHT - USER_GRAPH_PADDING + 4} fill="rgba(255,255,255,0.45)" fontSize="12" fontWeight="700">
                            0
                          </text>

                          {userGraphLines.map((line) => (
                            <polyline
                              key={line.key}
                              points={buildUserGraphPoints(dailyActivity, line.key, userGraphMax)}
                              fill="none"
                              stroke={line.color}
                              strokeWidth="4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              opacity="0.95"
                            />
                          ))}

                          {dailyActivity.map((row, index) => {
                            const shouldShow = index === 0 || index === dailyActivity.length - 1 || index % 3 === 0;
                            if (!shouldShow) return null;
                            const x = USER_GRAPH_PADDING + (dailyActivity.length === 1
                              ? (USER_GRAPH_WIDTH - (USER_GRAPH_PADDING * 2)) / 2
                              : (index / (dailyActivity.length - 1)) * (USER_GRAPH_WIDTH - (USER_GRAPH_PADDING * 2)));
                            return (
                              <text
                                key={row.date}
                                x={x}
                                y={USER_GRAPH_HEIGHT - 6}
                                textAnchor={index === 0 ? 'start' : index === dailyActivity.length - 1 ? 'end' : 'middle'}
                                fill="rgba(255,255,255,0.45)"
                                fontSize="11"
                                fontWeight="700"
                              >
                                {row.label}
                              </text>
                            );
                          })}
                        </svg>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        {userGraphLines.map((line) => (
                          <div key={line.key} className="flex items-center gap-2 rounded-full border border-white/5 bg-black/20 px-3 py-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: line.color }} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{line.label}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex min-h-64 items-center justify-center rounded-2xl border border-white/5 bg-black/10 p-6 text-center">
                      <p className="text-sm font-semibold text-zinc-500">
                        {productAnalyticsLoading ? 'Loading live graph...' : 'No graph data yet.'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid gap-3">
                  {[
                    { label: 'Latest Viewers', value: latestDailyActivity.visitors, tone: 'text-sky-300' },
                    { label: 'Latest Members', value: latestDailyActivity.members, tone: 'text-emerald-300' },
                    { label: 'Latest Actions', value: latestDailyActivity.featureEvents, tone: 'text-yellow-300' },
                    { label: 'Latest Signups', value: latestDailyActivity.signups, tone: 'text-white' }
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{item.label}</p>
                      <p className={`mt-2 text-3xl font-black tracking-tight ${item.tone}`}>
                        {productAnalyticsLoading ? '--' : formatNumber(item.value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-5 pb-5 sm:px-8 sm:pb-8 lg:grid-cols-3">
            <div className="rounded-[2rem] border border-white/5 bg-black/10 p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Growth Funnel</p>
              <div className="mt-4 grid gap-3">
                {[
                  ['Visitor to member', formatPercent(signupRate)],
                  ['Member to paid', formatPercent(paidRate)],
                  ['Paid conversion', formatPercent(productTotals.paidConversionRate)]
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-500">{label}</span>
                    <span className="text-lg font-black text-white">{productAnalyticsLoading ? '--' : value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/5 bg-black/10 p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Access Mix</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                {[
                  ['Trial', productTotals.trialMembers],
                  ['Early', productTotals.earlyAccessMembers],
                  ['Paid', productTotals.paidMembers],
                  ['Admins', productTotals.adminMembers]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                    <p className="text-2xl font-black text-white">{productAnalyticsLoading ? '--' : formatNumber(value)}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-zinc-600">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/5 bg-black/10 p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">New In Last 7 Days</p>
              <p className="mt-4 text-4xl font-black text-white">
                {productAnalyticsLoading ? '--' : formatNumber(productAnalytics?.last7Days?.newVisitors)}
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
                {productAnalyticsLoading
                  ? 'Checking...'
                  : `${formatNumber(productAnalytics?.last7Days?.uniqueVisitors)} unique visitors active, repeated visits ignored`}
              </p>
            </div>
          </div>

          {!productAnalyticsLoading && (
            <div className="grid gap-6 border-t border-white/5 p-5 sm:p-8 lg:grid-cols-2">
              <div className="rounded-[2rem] border border-white/5 bg-black/10 p-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Top Pages</p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-500">
                  Shows where users spend attention, so you can improve the real conversion path.
                </p>
                <div className="mt-4 grid gap-3">
                  {(productAnalytics?.topPages || []).length > 0 ? productAnalytics.topPages.map((page) => (
                    <div key={page.path} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white">{page.title || page.path}</p>
                          <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-widest text-zinc-600">{page.path}</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-sky-400/10 bg-sky-400/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-sky-300">
                          {formatNumber(page.uniqueVisitors)} users
                        </span>
                      </div>
                    </div>
                  )) : (
                    <p className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-sm font-semibold text-zinc-500">
                      No page data yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/5 bg-black/10 p-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Feature Usage</p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-500">
                  Shows what users actually do after landing, not repeated page refreshes.
                </p>
                <div className="mt-4 grid gap-3">
                  {(productAnalytics?.topEvents || []).length > 0 ? productAnalytics.topEvents.map((event) => (
                    <div key={event.eventName} className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{event.eventName}</p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                          {formatNumber(event.users)} members / {formatNumber(event.visitors)} visitors
                        </p>
                      </div>
                      <span className="text-lg font-black text-emerald-300">{formatNumber(event.events)}</span>
                    </div>
                  )) : (
                    <p className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-sm font-semibold text-zinc-500">
                      No feature events yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {!productAnalyticsLoading && productAnalytics?.recentActivity?.length > 0 && (
            <div className="border-t border-white/5 p-5 sm:p-8">
              <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-zinc-600">Recent Unique Product Viewers</p>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {productAnalytics.recentActivity.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-white/5 bg-black/10 p-4">
                    <p className="truncate text-sm font-black text-white">{event.title || event.path || 'Product view'}</p>
                    <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-widest text-zinc-600">{event.path || '/'}</p>
                    <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-sky-300">{event.plan || 'visitor'}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">{formatDateTime(event.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {productAnalyticsError && (
            <div className="px-8 pb-8">
              <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-bold text-red-300">
                {productAnalyticsError}
              </div>
            </div>
          )}
        </section>

        <section className="reveal reveal-delay-1 mb-12 premium-panel overflow-hidden">
          <div className="border-b border-white/5 bg-white/[0.01] p-5 sm:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-emerald-300">Admin-only earnings</p>
                <h2 className="text-2xl font-black tracking-tight text-white">How much this product earned</h2>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-500">
                  Counts ClientFlow AI plan money and agency setup money. Users&apos; paid invoices are shown separately because that money belongs to their clients/business.
                </p>
              </div>
              <span className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${
                revenueError ? 'border-red-400/10 bg-red-400/5 text-red-400' : 'border-emerald-400/10 bg-emerald-400/5 text-emerald-400'
              }`}>
                {revenueError ? 'Unavailable' : 'Admin only'}
              </span>
            </div>
          </div>

          <div className="grid gap-6 p-5 sm:p-8 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Total Product Earned', value: formatMoney(platformEarnings.totalEarned), tone: 'text-emerald-300' },
              { label: 'Plan Earnings', value: formatMoney(platformEarnings.planRevenue), tone: 'text-white' },
              { label: 'Agency Setup Earned', value: formatMoney(platformEarnings.agencyRevenue), tone: 'text-yellow-300' },
              { label: 'MRR Estimate', value: formatMoney(revenue?.subscriptions?.mrr), tone: 'text-sky-300' }
            ].map((item) => (
              <div key={item.label} className="rounded-[2rem] border border-white/5 bg-black/10 p-6">
                <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-600">{item.label}</p>
                <p className={`text-3xl font-black tracking-tight ${item.tone}`}>{revenueLoading ? '--' : item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 px-5 pb-5 sm:px-8 sm:pb-8 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-white/5 bg-black/10 p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Earning Sources</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                {[
                  ['Subscriptions', formatMoney(earningSources.subscriptions?.collected)],
                  ['Manual Plans', formatMoney(earningSources.manualApprovals?.collected)],
                  ['Direct Checkout', formatMoney(earningSources.directCheckoutEstimate?.collected)],
                  ['Agency Setup', formatMoney(earningSources.agencySetup?.collected)]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                    <p className="text-xl font-black text-white">{revenueLoading ? '--' : value}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-zinc-600">{label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs font-semibold leading-relaxed text-zinc-500">
                {platformEarnings.note || 'Only admin accounts can load this API.'}
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/5 bg-black/10 p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">User Invoice Money</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                  <p className="text-2xl font-black text-white">{revenueLoading ? '--' : formatMoney(revenue?.invoices?.paidRevenue)}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-zinc-600">Paid by their clients</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                  <p className="text-2xl font-black text-yellow-300">{revenueLoading ? '--' : formatMoney(revenue?.invoices?.pendingRevenue)}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-zinc-600">Pending invoices</p>
                </div>
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-zinc-500">
                {revenueLoading ? 'Checking...' : `${revenue?.invoices?.paymentLinks || 0} payment links / ${revenue?.invoices?.paidInvoices || 0} paid invoices`}
              </p>
            </div>
          </div>

          <div className="border-t border-white/5 p-5 sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Paid Users</p>
                <h3 className="mt-2 text-xl font-black text-white">Who paid for the product</h3>
              </div>
              <span className="inline-flex rounded-full border border-emerald-400/10 bg-emerald-400/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                {revenueLoading ? '--' : `${paidUsersList.length} users`}
              </span>
            </div>

            {revenueLoading ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-36 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />
                ))}
              </div>
            ) : paidUsersList.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-white/5 bg-black/10 p-6 text-sm font-semibold text-zinc-500">
                No paid users yet. When someone buys Pro or an approved paid plan, their name will appear here.
              </div>
            ) : (
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {paidUsersList.map((user) => (
                  <div key={user.id || user.email} className="rounded-2xl border border-white/5 bg-black/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{user.name || 'Unnamed user'}</p>
                        <p className="mt-1 truncate text-xs font-bold text-zinc-500">{user.email || 'No email'}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-emerald-400/10 bg-emerald-400/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-300">
                        {getPlanLabel(user.plan)}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Amount</p>
                        <p className="mt-1 text-sm font-black text-emerald-300">{formatMoney(user.amount)}</p>
                      </div>
                      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Status</p>
                        <p className="mt-1 truncate text-sm font-black capitalize text-white">{getStatusLabel(user.subscriptionStatus)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                      <span>Paid: {formatDate(user.lastPaymentAt || user.planStartedAt)}</span>
                      <span>Expire: {formatDate(user.planExpiresAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!revenueLoading && revenue?.recentPaidInvoices?.length > 0 && (
            <div className="border-t border-white/5 p-5 sm:p-8">
              <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-zinc-600">Recent User Paid Invoices</p>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {revenue.recentPaidInvoices.map((invoice) => (
                  <div key={invoice._id} className="rounded-2xl border border-white/5 bg-black/10 p-4">
                    <p className="truncate text-sm font-black text-white">{invoice.clientName}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">{invoice.invoiceNumber}</p>
                    <p className="mt-3 text-lg font-black text-emerald-300">{formatMoney(invoice.amount)}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">{formatDate(invoice.paidAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {revenueError && (
            <div className="px-8 pb-8">
              <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-bold text-red-300">
                {revenueError}
              </div>
            </div>
          )}
        </section>

        <section className="reveal reveal-delay-1 mb-12 premium-panel overflow-hidden">
          <div className="border-b border-white/5 bg-white/[0.01] p-5 sm:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Agency Setup</p>
                <h2 className="text-2xl font-black tracking-tight text-white">Setup clients and delivery checklist</h2>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-500">
                  Track paid setup clients, complete each delivery step, and keep the service outcome visible.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex rounded-full border border-emerald-400/10 bg-emerald-400/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  {formatMoney(agencyRevenue)} collected
                </span>
                <span className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${
                  agencyError ? 'border-red-400/10 bg-red-400/5 text-red-400' : 'border-sky-400/10 bg-sky-400/5 text-sky-300'
                }`}>
                  {agencyError ? 'Unavailable' : `${agencyBookings.length} bookings`}
                </span>
              </div>
            </div>
          </div>

          {agencyError && (
            <div className="p-5 sm:p-8">
              <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-bold text-red-300">
                {agencyError}
              </div>
            </div>
          )}

          {agencyLoading ? (
            <div className="grid gap-5 p-5 sm:p-8 md:grid-cols-2">
              {[1, 2].map((item) => (
                <div key={item} className="h-72 animate-pulse rounded-[2rem] border border-white/5 bg-white/[0.03]" />
              ))}
            </div>
          ) : agencyBookings.length === 0 ? (
            <div className="p-5 sm:p-8">
              <div className="rounded-[2rem] border border-white/5 bg-black/10 p-8 text-center">
                <h3 className="text-xl font-black text-white">No agency setup clients yet</h3>
                <p className="mt-2 text-sm font-semibold text-zinc-500">When someone books from /agency, they will appear here.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 p-5 sm:p-8 xl:grid-cols-2">
              {agencyBookings.map((booking) => (
                <div key={booking._id} className="rounded-[2rem] border border-white/5 bg-black/10 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{booking.packageName}</p>
                      <h3 className="mt-2 text-2xl font-black text-white">{booking.customerName}</h3>
                      <p className="mt-1 break-all text-xs font-bold text-zinc-500">{booking.email} · {booking.whatsapp}</p>
                      <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-sky-300">
                        Workflow: {(booking.workflowType || 'freelancers').replaceAll('_', ' ')}
                      </p>
                    </div>
                    <span className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${getAgencyStatusClass(booking.status)}`}>
                      {booking.status?.replaceAll('_', ' ')}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Amount</p>
                      <p className="mt-2 text-xl font-black text-emerald-300">{formatMoney(booking.amount)}</p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Booked</p>
                      <p className="mt-2 text-sm font-black text-white">{formatDate(booking.createdAt)}</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Setup brief</p>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-300">
                      <span className="text-white">Skill:</span> {booking.skill}
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-300">
                      <span className="text-white">Problem:</span> {booking.problem}
                    </p>
                    {(booking.targetClient || booking.incomeGoal || booking.portfolioUrl) && (
                      <p className="mt-2 text-xs font-bold leading-relaxed text-zinc-500">
                        Target: {booking.targetClient || 'Not set'} · Goal: {booking.incomeGoal || 'Not set'} · Portfolio: {booking.portfolioUrl || 'Not set'}
                      </p>
                    )}
                  </div>

                  <div className="mt-5">
                    <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-600">Delivery checklist</p>
                    <div className="grid gap-2">
                      {(booking.deliveryChecklist || []).map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => updateChecklistItem(booking._id, item)}
                          className={`flex items-start justify-between gap-3 rounded-2xl border p-3 text-left transition ${
                            item.done
                              ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                              : 'border-white/8 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07]'
                          }`}
                        >
                          <span className="text-sm font-bold leading-relaxed">{item.label}</span>
                          <span className="shrink-0 text-[10px] font-black uppercase tracking-widest">
                            {item.done ? 'Done' : 'Mark'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {['in_progress', 'delivered', 'refunded'].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => updateAgencyStatus(booking._id, status)}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/10"
                      >
                        {status.replaceAll('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

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
          <div className="border-b border-white/5 bg-white/[0.01] p-5 sm:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">AI Provider Status</p>
                <h2 className="text-2xl font-black tracking-tight text-white">Admin AI diagnostics</h2>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-500">
                  Verify which backend AI provider is selected, whether keys are configured, and whether a live AI route returns provider output.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${getAiStatusClass(aiChecks.status)}`}>
                  {healthLoading ? 'Checking' : aiStatusLabel}
                </span>
                <button
                  type="button"
                  onClick={runAiSmokeTest}
                  disabled={aiTestLoading || healthLoading}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-200 transition hover:border-emerald-400/30 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {aiTestLoading ? 'Testing...' : 'Run AI Test'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-5 sm:p-8 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[2rem] border border-white/5 bg-black/10 p-6">
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-600">Selected Provider</p>
              <p className="text-2xl font-black tracking-tight text-white">
                {healthLoading ? '--' : getProviderLabel(aiChecks.provider)}
              </p>
              <p className="mt-2 text-xs font-bold text-zinc-500">
                Active: {healthLoading ? '--' : getProviderLabel(aiChecks.activeProvider || aiChecks.selectedProvider)}
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/5 bg-black/10 p-6">
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-600">Active Model</p>
              <p className="break-words text-xl font-black tracking-tight text-white">
                {healthLoading ? '--' : (aiChecks.activeModel || 'No provider ready')}
              </p>
              <p className="mt-2 text-xs font-bold text-zinc-500">
                Status: {healthLoading ? '--' : aiStatusLabel}
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/5 bg-black/10 p-6">
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-600">Key Readiness</p>
              <div className="space-y-2 text-xs font-bold text-zinc-400">
                <p>Anthropic: {aiChecks.anthropicKey ? 'Configured' : 'Missing'}</p>
                <p>OpenAI: {aiChecks.openAiKey ? 'Configured' : 'Missing'}</p>
                <p>Failover: {aiChecks.fallbackAvailable ? 'Available' : aiReady ? 'Not needed' : 'Unavailable'}</p>
              </div>
            </div>

            <div className={`rounded-[2rem] border p-6 ${getAiTestClass(aiTestResult)}`}>
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest opacity-80">Last AI Test</p>
              <p className="text-2xl font-black tracking-tight">
                {aiTestLoading ? 'Running' : aiTestResult ? (aiTestResult.passed ? 'Passed' : 'Fallback') : 'Not tested'}
              </p>
              <p className="mt-2 text-xs font-bold opacity-80">
                Source: {aiTestResult ? getProviderLabel(aiTestResult.source) : '--'}
              </p>
              <p className="mt-1 text-xs font-bold opacity-70">
                {formatDateTime(aiTestResult?.checkedAt)}
              </p>
            </div>
          </div>

          <div className="grid gap-6 px-5 pb-5 sm:px-8 sm:pb-8 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-white/5 bg-black/10 p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Recommended Action</p>
              <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-300">
                {healthLoading ? 'Checking backend AI environment...' : (aiChecks.action || 'Add an AI provider key in backend environment.')}
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/5 bg-black/10 p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Smoke Test Detail</p>
              <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-300">
                {aiTestError || aiTestResult?.answerPreview || 'Click Run AI Test after adding credits or redeploying the backend.'}
              </p>
            </div>
          </div>
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
                <p>AI: {aiReady ? getProviderLabel(aiChecks.activeProvider || aiChecks.selectedProvider) : 'Provider key missing'}</p>
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
