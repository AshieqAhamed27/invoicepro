import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { getPlanLabel, getUser, hasProAccess } from '../utils/auth';
import { COMPANY_SHORT_NAME, SUPPORT_EMAIL } from '../utils/company';
import { trackEvent } from '../utils/analytics';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const planDetails = {
  monthly: {
    amount: 499,
    currency: "INR",
    label: "Pro Monthly",
    note: "Daily money actions, client coach, proposals, Client Workroom, and payment collection.",
    duration: "Billed every 30 days",
    amountSource: "fallback"
  },
  yearly: {
    amount: 4999,
    currency: "INR",
    label: "Pro Annual",
    note: "Best value for freelancers building stable income, repeat clients, and long-term cashflow.",
    duration: "Billed every 365 days",
    amountSource: "fallback"
  },
  founder90: {
    amount: 999,
    currency: "INR",
    label: "Founder 90 Days",
    note: "Early-user offer: 90 days of the full client-to-cashflow workspace.",
    duration: "Valid for 90 days",
    amountSource: "fallback",
    checkoutType: "one_time"
  }
};

const globalPlanDetails = {
  monthly: {
    ...planDetails.monthly,
    amount: 9,
    currency: "USD",
    amountSource: "fallback"
  },
  yearly: {
    ...planDetails.yearly,
    amount: 89,
    currency: "USD",
    amountSource: "fallback"
  },
  founder90: {
    ...planDetails.founder90,
    amount: 19,
    currency: "USD",
    amountSource: "fallback",
    checkoutType: "one_time"
  }
};

const getSafePlan = (value) => (planDetails[value] ? value : 'monthly');
const getSafeMarket = (value) => (String(value || '').toLowerCase() === 'global' ? 'global' : 'india');

const getMarketFromSearch = (search = '') => {
  try {
    const value = new URLSearchParams(search).get('market');
    return value ? getSafeMarket(value) : '';
  } catch {
    return '';
  }
};

const detectBillingMarket = () => {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const locale = navigator.language || '';
    if (timeZone === 'Asia/Kolkata' || timeZone === 'Asia/Calcutta' || locale.toLowerCase().endsWith('-in')) {
      return 'india';
    }
  } catch {}

  return 'global';
};

const getFallbackPlanDetails = (market) => (getSafeMarket(market) === 'global' ? globalPlanDetails : planDetails);

const getInitialBillingMarket = () => {
  if (typeof window === 'undefined') return 'india';
  return getMarketFromSearch(window.location.search) ||
    getSafeMarket(localStorage.getItem('billingMarket') || detectBillingMarket());
};

const formatMoney = (amount, currency = 'INR') => {
  const numeric = Number(amount || 0);
  if (currency === 'INR') return `Rs ${numeric.toLocaleString('en-IN')}`;
  if (currency === 'USD') return `$${numeric.toLocaleString('en-US')}`;
  return `${currency} ${numeric.toLocaleString('en-US')}`;
};

const getDurationLabel = (durationDays = 30, checkoutType = 'subscription') => {
  const days = Number(durationDays || 30);
  if (checkoutType === 'one_time') return `Valid for ${days} days`;
  if (days === 365) return "Billed every 365 days";
  if (days === 90) return "Valid for 90 days";
  if (days === 7) return "Valid for 7 days";
  return "Billed every 30 days";
};

const mapPlansById = (plans = [], fallbackPlans = planDetails) =>
  plans.reduce((acc, plan) => {
    if (plan?.id) {
      acc[plan.id] = {
        ...fallbackPlans[plan.id],
        amount: Number(plan.amount || 0),
        currency: plan.currency || fallbackPlans[plan.id]?.currency || "INR",
        label: plan.label || plan.id,
        duration: getDurationLabel(plan.durationDays, plan.checkoutType || fallbackPlans[plan.id]?.checkoutType || "subscription"),
        amountSource: plan.amountSource || "backend",
        checkoutType: plan.checkoutType || fallbackPlans[plan.id]?.checkoutType || "subscription",
        subscriptionReady: Boolean(plan.subscriptionReady),
        warning: plan.warning || "",
        market: plan.market || "india"
      };
    }
    return acc;
  }, {});

const getPricingNotice = ({ warnings = [], readinessWarning = '', market = 'india' }) => {
  const warningText = warnings.filter(Boolean).join(' ');
  const hasRazorpayPlanFetchWarning = /Could not fetch live Razorpay plan amount|Razorpay plan amount is missing/i.test(warningText);

  if (hasRazorpayPlanFetchWarning) {
    return [
      `Owner setup notice: live Razorpay ${market === 'global' ? 'USD' : 'INR'} plan price could not be verified, so this page is using the configured fallback price.`,
      'Before real sales, check that the Razorpay plan ID is correct and uses the same test/live mode as your Razorpay keys.',
      readinessWarning
    ].filter(Boolean).join(' ');
  }

  return [warningText, readinessWarning].filter(Boolean).join(' ');
};

const proValueItems = [
  'Money GPS: one best revenue action each day',
  'AI Client Coach: find, talk, close, and collect',
  'Proposal Writer and Deal Room for better conversion',
  'Client Workroom for scope, delivery proof, collaborators, and payment',
  'Unlimited INR and international invoices',
  'Payment tracking, UPI/Razorpay links, and cashflow control'
];

const directClientValueItems = [
  ['No bidding credits', 'Pay for a workflow you control, not for every proposal attempt.'],
  ['No marketplace commission promise', 'ClientFlow AI earns from Pro plans and setup help, not by taking a large seller cut from each project.'],
  ['Own your client system', 'Keep direct leads, proposal records, project proof, invoices, and follow-ups in your workspace.'],
  ['Useful before marketplace scale', 'You can earn with Pro and setup services before building a full client marketplace.']
];

const checkoutValueCards = [
  ['Find and follow up', 'Keep leads, next messages, and daily money actions visible.'],
  ['Sell and deliver', 'Use proposals, deal room, workroom, files, proof, and client notes.'],
  ['Invoice and collect', 'Create invoices, track payment status, and prepare follow-up messages.']
];

export default function Payment() {
  const location = useLocation();
  const [plan, setPlan] = useState('monthly');
  const [market, setMarket] = useState(getInitialBillingMarket);
  const [loading, setLoading] = useState(false);
  const [earlyAccessLoading, setEarlyAccessLoading] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [serverPlanDetails, setServerPlanDetails] = useState(() => getFallbackPlanDetails(getInitialBillingMarket()));
  const [pricingWarning, setPricingWarning] = useState('');
  const [pricingBlocked, setPricingBlocked] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [earlyAccessStatus, setEarlyAccessStatus] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [accountUser, setAccountUser] = useState(() => getUser() || {});
  const earlyIntent = new URLSearchParams(location.search).get('early') === '1';

  useEffect(() => {
    const selectedPlan = getSafePlan(localStorage.getItem("plan") || "monthly");
    const selectedMarket = getMarketFromSearch(location.search) ||
      getSafeMarket(localStorage.getItem('billingMarket') || detectBillingMarket());
    localStorage.setItem("plan", selectedPlan);
    localStorage.setItem('billingMarket', selectedMarket);
    setPlan(selectedPlan);
    setMarket(selectedMarket);
  }, [location.search]);

  useEffect(() => {
    const loadPricing = async () => {
      try {
        const fallbackPlans = getFallbackPlanDetails(market);
        setPricingLoading(true);
        setPricingBlocked(false);
        setServerPlanDetails(fallbackPlans);
        const res = await api.get(`/payment/plans?market=${market}`);
        const nextPlans = mapPlansById(res.data?.plans || [], fallbackPlans);

        if (nextPlans.monthly?.amount && nextPlans.yearly?.amount) {
          setServerPlanDetails((prev) => ({
            ...prev,
            ...nextPlans
          }));
          const missingRecurring = Object.values(nextPlans)
            .filter((item) => item.checkoutType !== 'one_time' && !item.subscriptionReady)
            .map((item) => item.label);
          const readinessWarning = missingRecurring.length
            ? `${missingRecurring.join(', ')} checkout needs Razorpay ${market === 'global' ? 'USD' : 'INR'} subscription plan IDs before recurring billing can start.`
            : '';
          setPricingWarning(getPricingNotice({
            warnings: res.data?.warnings || [],
            readinessWarning,
            market
          }));
        } else {
          setPricingWarning('Backend did not return both monthly and yearly checkout prices.');
          setPricingBlocked(true);
        }
      } catch {
        setPricingWarning('Could not verify live checkout pricing from the backend. Please retry before taking payments.');
        setPricingBlocked(true);
      } finally {
        setPricingLoading(false);
      }
    };

    loadPricing();
  }, [market]);

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const res = await api.get('/payment/subscription/status');
        setSubscriptionStatus(res.data?.subscription || null);
        if (res.data?.user) {
          localStorage.setItem('user', JSON.stringify(res.data.user));
          setAccountUser(res.data.user);
        }
      } catch {
        setSubscriptionStatus(null);
      }
    };

    loadSubscription();
  }, []);

  useEffect(() => {
    const loadEarlyAccessStatus = async () => {
      try {
        const res = await api.get('/payment/early-access/status');
        setEarlyAccessStatus(res.data || null);
        if (res.data?.user) {
          localStorage.setItem('user', JSON.stringify(res.data.user));
          setAccountUser(res.data.user);
        }
      } catch {
        setEarlyAccessStatus(null);
      }
    };

    loadEarlyAccessStatus();
  }, []);

  const fallbackPlanDetails = getFallbackPlanDetails(market);
  const alternateMarket = market === 'global' ? 'india' : 'global';
  const alternatePlanDetails = getFallbackPlanDetails(alternateMarket);
  const current = serverPlanDetails[getSafePlan(plan)] || fallbackPlanDetails[getSafePlan(plan)];
  const currentPlanReady = current.checkoutType === 'one_time' || current.subscriptionReady;
  const checkoutDisabled = loading || pricingLoading || pricingBlocked || !currentPlanReady;
  const earlyAccessAlreadyUsed = Boolean(accountUser?.earlyAccessUsedAt);
  const earlyAccessClosed = earlyAccessStatus?.enabled === false || Number(earlyAccessStatus?.seatsRemaining || 0) <= 0;
  const activePlanLabel = getPlanLabel(accountUser);
  const earlyAccessDisabled = earlyAccessLoading || loading || hasProAccess(accountUser) || earlyAccessAlreadyUsed || earlyAccessClosed;
  const earlyAccessButtonLabel = hasProAccess(accountUser)
    ? `${activePlanLabel} Active`
    : earlyAccessAlreadyUsed
      ? 'Early Access Already Used'
      : earlyAccessClosed
        ? 'Early Access Seats Filled'
        : earlyAccessLoading
          ? 'Activating Early Access...'
          : `Activate ${earlyAccessStatus?.days || 30}-Day Free Access`;
  const selectPlan = (nextPlan) => {
    const safePlan = getSafePlan(nextPlan);
    localStorage.setItem("plan", safePlan);
    setPlan(safePlan);
    trackEvent('select_subscription_plan', {
      plan: safePlan,
      market,
      value: Number(serverPlanDetails[safePlan]?.amount || fallbackPlanDetails[safePlan].amount),
      currency: serverPlanDetails[safePlan]?.currency || fallbackPlanDetails[safePlan].currency || 'INR'
    });
  };

  const selectMarket = (nextMarket) => {
    const safeMarket = getSafeMarket(nextMarket);
    localStorage.setItem('billingMarket', safeMarket);
    setMarket(safeMarket);
    setServerPlanDetails(getFallbackPlanDetails(safeMarket));
    trackEvent('select_billing_market', { market: safeMarket });
  };

  const handleEarlyAccessStart = async () => {
    if (earlyAccessDisabled) return;

    try {
      setEarlyAccessLoading(true);
      const res = await api.post('/payment/early-access/start');

      if (res.data?.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setAccountUser(res.data.user);
      }

      trackEvent('start_early_access', {
        value: 0,
        currency: 'INR'
      });
      alert(res.data?.message || 'Early access activated');
      window.location.href = '/client-flow';
    } catch (err) {
      alert(err?.response?.data?.message || 'Unable to activate early access');
    } finally {
      setEarlyAccessLoading(false);
    }
  };

  const handleOneTimePayment = async (selectedPlan) => {
    let checkoutOpened = false;

    try {
      setLoading(true);
      trackEvent('begin_checkout', {
        plan: selectedPlan,
        market,
        value: Number(current.amount || 0),
        currency: current.currency || 'INR',
        checkout_type: 'one_time'
      });

      const orderRes = await api.post('/payment/razorpay/order', {
        plan: selectedPlan,
        market
      });

      const keyId = orderRes.data?.keyId;
      const order = orderRes.data?.order;
      const simulation = Boolean(orderRes.data?.simulation);
      const serverPlan = orderRes.data?.plan;

      if (!order?.id) {
        throw new Error('Invalid order response');
      }

      if (serverPlan?.id) {
        setServerPlanDetails((prev) => ({
          ...prev,
          [serverPlan.id]: {
            ...prev[serverPlan.id],
            ...serverPlan,
            duration: getDurationLabel(serverPlan.durationDays, serverPlan.checkoutType)
          }
        }));
      }

      if (simulation) {
        const verifyRes = await api.post('/payment/razorpay/verify', {
          plan: selectedPlan,
          razorpay_order_id: order.id,
          razorpay_payment_id: `pay_sim_${Date.now()}`,
          razorpay_signature: 'simulation'
        });

        if (verifyRes.data?.user) {
          localStorage.setItem('user', JSON.stringify(verifyRes.data.user));
        }

        alert('Founder offer activated');
        window.location.href = '/dashboard';
        return;
      }

      const isLoaded = await loadRazorpayScript();

      if (!isLoaded) {
        alert('Razorpay failed to load');
        return;
      }

      const options = {
        key: keyId,
        name: COMPANY_SHORT_NAME,
        description: serverPlan?.label || current.label,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency || current.currency || 'INR',
        prefill: {
          name: getUser()?.name || '',
          email: getUser()?.email || ''
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
          }
        },
        handler: async function(response) {
          try {
            const verifyRes = await api.post('/payment/razorpay/verify', {
              plan: selectedPlan,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyRes.data?.user) {
              localStorage.setItem('user', JSON.stringify(verifyRes.data.user));
            }

            trackEvent('purchase', {
              transaction_id: response.razorpay_payment_id,
              plan: selectedPlan,
              market,
              value: Number(serverPlan?.amount || current.amount || 0),
              currency: serverPlan?.currency || current.currency || 'INR',
              checkout_type: 'one_time'
            });

            alert('Founder offer activated');
            window.location.href = '/dashboard';
          } catch (verifyErr) {
            alert(verifyErr?.response?.data?.message || 'Payment verification failed');
            setLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      checkoutOpened = true;
      rzp.open();
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Payment failed');
    } finally {
      if (!checkoutOpened) {
        setLoading(false);
      }
    }
  };

  const handleRazorpayPayment = async () => {
    let checkoutOpened = false;
    const selectedPlan = getSafePlan(plan);
    setPlan(selectedPlan);
    localStorage.setItem("plan", selectedPlan);

    if (current.checkoutType === 'one_time') {
      await handleOneTimePayment(selectedPlan);
      return;
    }

    try {
      setLoading(true);
      trackEvent('begin_checkout', {
        plan: selectedPlan,
        market,
        value: Number(current.amount || 0),
        currency: current.currency || 'INR'
      });

      const subscriptionRes = await api.post('/payment/razorpay/subscription', {
        plan: selectedPlan,
        market
      });

      const keyId = subscriptionRes.data?.keyId;
      const subscription = subscriptionRes.data?.subscription;
      const simulation = Boolean(subscriptionRes.data?.simulation);
      const serverPlan = subscriptionRes.data?.plan;

      if (!subscription?.id) {
        throw new Error("Invalid subscription response");
      }

      if (serverPlan?.id) {
        setServerPlanDetails((prev) => ({
          ...prev,
          [serverPlan.id]: {
            ...prev[serverPlan.id],
            ...serverPlan,
            duration: getDurationLabel(serverPlan.durationDays, serverPlan.checkoutType)
          }
        }));
      }

      if (simulation) {
        if (subscriptionRes.data?.user) {
          localStorage.setItem('user', JSON.stringify(subscriptionRes.data.user));
        }

        alert("Subscription active");
        trackEvent('purchase', {
          transaction_id: subscription.id,
          plan: selectedPlan,
          market,
          value: Number(serverPlan?.amount || current.amount || 0),
          currency: serverPlan?.currency || current.currency || 'INR'
        });
        window.location.href = "/dashboard";
        return;
      }

      const isLoaded = await loadRazorpayScript();

      if (!isLoaded) {
        alert("Razorpay failed to load");
        return;
      }

      const options = {
        key: keyId,
        name: COMPANY_SHORT_NAME,
        description: `${serverPlan?.label || 'Pro'} Subscription`,
        subscription_id: subscription.id,
        prefill: {
          name: getUser()?.name || '',
          email: getUser()?.email || ''
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
          }
        },
        handler: async function(response) {
          try {
            const verifyRes = await api.post('/payment/razorpay/subscription/verify', {
              plan: selectedPlan,
              razorpay_subscription_id: response.razorpay_subscription_id || subscription.id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyRes.data?.user) {
              localStorage.setItem('user', JSON.stringify(verifyRes.data.user));
            }

            alert("Subscription active");
            trackEvent('purchase', {
              transaction_id: response.razorpay_payment_id,
              plan: selectedPlan,
              market,
              value: Number(serverPlan?.amount || current.amount || 0),
              currency: serverPlan?.currency || current.currency || 'INR'
            });
            window.location.href = "/dashboard";
          } catch (verifyErr) {
            const verifyMessage = verifyErr?.response?.data?.message || "Subscription verification failed";
            alert(verifyMessage);
            setLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      checkoutOpened = true;
      rzp.open();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Subscription failed";
      alert(msg);
    } finally {
      if (!checkoutOpened) {
        setLoading(false);
      }
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Cancel this subscription at the end of the current billing cycle?')) return;

    try {
      setCancelLoading(true);
      const res = await api.post('/payment/razorpay/subscription/cancel', {
        cancelAtCycleEnd: true
      });

      if (res.data?.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }

      setSubscriptionStatus(res.data?.subscription || subscriptionStatus);
      trackEvent('cancel_subscription_requested', {
        plan: subscriptionStatus?.plan || plan
      });
      alert(res.data?.message || 'Subscription cancellation requested.');
    } catch (err) {
      alert(err?.response?.data?.message || 'Unable to cancel subscription');
    } finally {
      setCancelLoading(false);
    }
  };

  const canCancelSubscription = subscriptionStatus?.providerSubscriptionId &&
    !['cancelled', 'cancel_scheduled', 'completed', 'expired'].includes(String(subscriptionStatus.status || '').toLowerCase());

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10 md:py-16 xl:py-20">
        <div className="grid gap-8">
          <section className="reveal">
            <div className="flex items-center gap-2 mb-4">
               <span className="h-px w-8 bg-yellow-400" />
               <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Secure Checkout</p>
            </div>
            <h1 className="text-4xl font-bold sm:text-5xl xl:text-7xl tracking-tight text-white mb-6 leading-none">
              Buy ClientFlow AI Pro <br /> <span className="text-zinc-600">for your freelance workflow.</span>
            </h1>

            <p className="max-w-xl text-base sm:text-lg text-zinc-500 font-medium leading-relaxed mb-8 sm:mb-10">
              Pro unlocks the full lead-to-payment system: find clients, send proposals, manage delivery, create invoices, and follow up pending money.
            </p>

            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              {[
                ['india', 'India billing', 'INR checkout with cards, UPI, and Razorpay subscriptions.', planDetails.monthly],
                ['global', 'International billing', 'USD checkout for customers outside India using supported global cards.', globalPlanDetails.monthly]
              ].map(([id, title, text, price]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectMarket(id)}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    market === id
                      ? 'border-cyan-300/40 bg-cyan-300/10 text-white'
                      : 'border-white/10 bg-black/20 text-zinc-400 hover:border-white/20 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-widest">{title}</p>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                      {formatMoney(price.amount, price.currency)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-500">{text}</p>
                </button>
              ))}
            </div>

            <div className="mb-6 rounded-[1.75rem] border border-yellow-300/25 bg-yellow-300/[0.08] p-5 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-200">You are buying</p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    {current.label} for {pricingLoading ? 'live price check' : formatMoney(current.amount, current.currency)}
                  </h2>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-300">
                    Choose the billing market, pick a plan, complete Razorpay checkout, and Pro access opens in your workspace.
                  </p>
                  {market === 'global' && (
                    <p className="mt-3 text-xs font-bold leading-relaxed text-cyan-100/80">
                      International checkout needs international payments enabled on your Razorpay account. USD recurring subscriptions also need USD plan IDs in Render.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleRazorpayPayment}
                  disabled={checkoutDisabled}
                  className="rounded-2xl bg-yellow-400 px-6 py-4 text-sm font-black uppercase tracking-widest text-black shadow-xl shadow-yellow-950/20 transition-all hover:-translate-y-0.5 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pricingLoading ? 'Checking Price' : loading ? 'Opening Checkout' : currentPlanReady ? 'Buy Now' : 'Setup Required'}
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {checkoutValueCards.map(([title, text]) => (
                  <div key={title} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <p className="text-sm font-black text-white">{title}</p>
                    <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-500">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6 rounded-[1.75rem] border border-cyan-300/20 bg-cyan-300/[0.06] p-5 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                    Why this is different
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    Pro is a direct-client business system, not another freelance marketplace.
                  </h2>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-400">
                    Upwork and Fiverr monetize marketplace transactions. ClientFlow AI should monetize the operating system freelancers use to win, manage, and collect from their own clients.
                  </p>
                </div>
                <div className="shrink-0 rounded-2xl border border-white/10 bg-black/25 px-5 py-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Main revenue model</p>
                  <p className="mt-2 text-xl font-black text-white">Pro + Setup</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {directClientValueItems.map(([title, text]) => (
                  <div key={title} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <p className="text-sm font-black text-white">{title}</p>
                    <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-500">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={`mb-6 rounded-[1.75rem] border p-5 sm:p-6 ${
              earlyIntent
                ? 'border-emerald-300/35 bg-emerald-300/[0.1]'
                : 'border-emerald-300/20 bg-emerald-300/[0.06]'
            }`}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">
                    Early-user free access
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    First {earlyAccessStatus?.seatLimit || 50} freelancers get {earlyAccessStatus?.days || 30} days of Pro free.
                  </h2>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-emerald-50/70">
                    No card needed. Use the full workflow, then share honest feedback so ClientFlow AI can improve for real freelancers.
                  </p>
                </div>
                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={handleEarlyAccessStart}
                    disabled={earlyAccessDisabled}
                    className={`w-full rounded-2xl px-5 py-4 text-sm font-black uppercase tracking-widest transition-all lg:w-auto ${
                      earlyAccessDisabled
                        ? 'cursor-not-allowed border border-white/10 bg-white/[0.04] text-zinc-500'
                        : 'bg-emerald-300 text-slate-950 hover:-translate-y-0.5 hover:bg-emerald-200 active:scale-95'
                    }`}
                  >
                    {earlyAccessButtonLabel}
                  </button>
                  {earlyAccessStatus && (
                    <p className="mt-3 text-center text-[10px] font-black uppercase tracking-widest text-emerald-100/60">
                      {Math.max(0, Number(earlyAccessStatus.seatsRemaining || 0))} seats left
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="premium-panel p-5 sm:p-8 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-5 text-white pointer-events-none group-hover:opacity-10 transition-opacity">
                  <svg className="h-20 w-20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" /></svg>
               </div>

               <div className="mb-8 grid gap-3 sm:grid-cols-2">
                 {Object.entries(serverPlanDetails).map(([id, details]) => (
                   <button
                     key={id}
                     type="button"
                     onClick={() => selectPlan(id)}
                     className={`rounded-xl border p-4 text-left transition-all ${
                       plan === id
                         ? 'border-yellow-400/40 bg-yellow-400/10 text-white'
                         : 'border-white/10 bg-black/20 text-zinc-400 hover:border-white/20 hover:bg-white/5 hover:text-white'
                     }`}
                   >
                     <p className="text-[10px] font-black uppercase tracking-widest">{details.label}</p>
                     <p className="mt-2 text-2xl font-black text-white">{formatMoney(details.amount, details.currency)}</p>
                     <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                       {details.duration}
                     </p>
                     <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-cyan-200/80">
                       {alternateMarket === 'global' ? 'USD option' : 'INR option'}: {formatMoney(alternatePlanDetails[id]?.amount || 0, alternatePlanDetails[id]?.currency || 'USD')}
                     </p>
                     {details.checkoutType !== 'one_time' && !details.subscriptionReady && (
                       <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-yellow-300">
                         Plan ID needed
                       </p>
                     )}
                   </button>
                 ))}
               </div>

               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 sm:mb-10 pb-8 sm:pb-10 border-b border-white/5">
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl font-black text-white italic mb-1">{current.label}</h2>
                    <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest leading-relaxed">{current.note}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      {pricingLoading ? 'Checking...' : formatMoney(current.amount, current.currency)}
                    </p>
                    <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest mt-1">Subscription Price</p>
                  </div>
               </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  {proValueItems.map((item) => (
                    <div key={item} className="flex items-center gap-4 group/item">
                       <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                       <p className="group-hover:text-white transition-colors">{item}</p>
                    </div>
                  ))}
                </div>
            </div>
          </section>

          <aside className="reveal reveal-delay-1 h-fit">
            <div className="premium-panel p-5 sm:p-8 xl:p-10">
               <div className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-white/5 border border-white/10 mb-8">
                 <p className="text-[10px] uppercase tracking-widest font-black text-zinc-500">Payment Summary</p>
               </div>

                <div className="space-y-6 mb-10">
                  <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center text-sm font-bold">
                    <span className="text-zinc-600 uppercase tracking-widest">
                      {current.checkoutType === 'one_time' ? 'One-Time Plan' : 'Recurring Plan'}
                    </span>
                    <span className="text-white">{pricingLoading ? 'Checking...' : formatMoney(current.amount, current.currency)}</span>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center text-sm font-bold">
                    <span className="text-zinc-600 uppercase tracking-widest">Payment Processing</span>
                    <span className="text-emerald-400 italic">{market === 'global' ? 'Global card' : 'Included'}</span>
                  </div>
                  <div className="pt-6 border-t border-white/5 flex flex-col items-end">
                    <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.2em] mb-2">Plan Amount</p>
                    <p className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                      {pricingLoading ? '--' : formatMoney(current.amount, current.currency)}
                    </p>
                    <p className="text-xs font-bold text-zinc-500 mt-2">{current.duration}</p>
                  </div>
               </div>

               {subscriptionStatus && (
                 <div className="mb-6 rounded-2xl border border-emerald-400/15 bg-emerald-400/10 p-4">
                   <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Current Subscription</p>
                   <p className="mt-2 text-sm font-bold text-white">
                     {subscriptionStatus.plan} / {subscriptionStatus.status}
                   </p>
                   {subscriptionStatus.currentEnd && (
                     <p className="mt-2 text-xs font-bold text-emerald-100/80">
                       Current access until {new Date(subscriptionStatus.currentEnd).toLocaleDateString('en-IN')}
                     </p>
                   )}
                 </div>
               )}

               <button
                 onClick={handleRazorpayPayment}
                 disabled={checkoutDisabled}
                 className="btn btn-primary w-full py-5 text-lg shadow-xl shadow-black/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all"
               >
                 {pricingLoading
                   ? 'Verifying Price...'
                   : loading
                     ? 'Starting Checkout...'
                     : !currentPlanReady
                       ? 'Checkout Setup Needed'
                       : current.checkoutType === 'one_time'
                         ? `Pay ${market === 'global' ? 'Internationally' : 'Once'} with Razorpay`
                         : market === 'global'
                           ? 'Buy Pro with Global Card'
                           : 'Buy Pro with Razorpay'}
               </button>

               <button
                 type="button"
                 onClick={handleEarlyAccessStart}
                 disabled={earlyAccessDisabled}
                 className={`mt-3 w-full rounded-2xl border border-white/10 px-5 py-4 text-sm font-black text-white transition-all ${
                   earlyAccessDisabled
                     ? 'cursor-not-allowed bg-white/[0.02] opacity-60'
                     : 'bg-white/[0.03] hover:bg-white/[0.06] active:scale-[0.98]'
                 }`}
               >
                 {earlyAccessButtonLabel}
               </button>

               {pricingWarning && (
                 <div className={`mt-4 rounded-2xl border p-4 text-sm font-bold ${
                   pricingBlocked
                     ? 'border-red-400/20 bg-red-400/10 text-red-300'
                     : 'border-yellow-400/20 bg-yellow-400/10 text-yellow-200'
                 }`}>
                   {pricingWarning}
                 </div>
               )}

               <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                 <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Billing Support</p>
                 <p className="mt-2 text-xs font-bold leading-relaxed text-zinc-500">
                   Cancel from here when a Razorpay subscription is active. Refunds are reviewed by support and processed through Razorpay when approved.
                 </p>
                 <div className="mt-4 grid gap-3">
                   {canCancelSubscription && (
                     <button
                       type="button"
                       onClick={handleCancelSubscription}
                       disabled={cancelLoading}
                       className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-300 transition hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                     >
                       {cancelLoading ? 'Cancelling...' : 'Cancel Renewal'}
                     </button>
                   )}
                   <a
                     href={`mailto:${SUPPORT_EMAIL}?subject=ClientFlow AI refund or billing support`}
                     className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-white/[0.06]"
                   >
                     Request Refund Support
                   </a>
                 </div>
               </div>

               <div className="mt-8 flex items-center justify-center gap-4 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                  <img src="https://cdn.razorpay.com/static/assets/badgetext.png" alt="Razorpay Secure" className="h-6" />
               </div>
            </div>

             <div className="mt-8 p-8 rounded-[2rem] border border-white/5 bg-white/[0.01]">
                <p className="text-[10px] font-bold text-zinc-600 leading-relaxed uppercase tracking-widest text-center">
                  Use early access to test the full workflow, the founder offer for 90-day paid access, or monthly billing for repeat subscribers.
                </p>
             </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
