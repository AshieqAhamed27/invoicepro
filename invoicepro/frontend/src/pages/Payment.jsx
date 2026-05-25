import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { getFreeAccessState, getPlanLabel, getUser, hasProAccess, isFreeFullAccessEnabled } from '../utils/auth';
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
    note: "Full Pro workflow with monthly billing for active freelancers who want flexibility.",
    duration: "Billed every 30 days",
    amountSource: "fallback"
  },
  yearly: {
    amount: 4999,
    currency: "INR",
    label: "Pro Annual",
    note: "Same full Pro workflow as Monthly, paid once for a full year of stable client work.",
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

const planFeatureDetails = {
  monthly: {
    title: 'Monthly includes',
    fit: 'Best when you are actively testing or using ClientFlow AI month by month.',
    features: [
      'AI Client Coach for what to do next with leads, proposals, delivery, and payments',
      'Client Finder, Sales Agent, and Outbound Autopilot for finding and following up with prospects',
      'Proposal Writer, Deal Room, and Client Workroom for closing and managing client work',
      'Invoices, payment links, payment follow-up, Money GPS, Growth Plan, and Profit Tracker'
    ]
  },
  yearly: {
    title: 'Yearly includes',
    fit: 'Best when you want the same workflow for a full year with better long-term value.',
    features: [
      'Everything included in Pro Monthly for 12 months',
      'Better value than paying monthly for the whole year',
      'Useful for repeat clients, retainers, long projects, and stable income tracking',
      'Keeps the same client-to-payment system active without monthly decision pressure'
    ]
  },
  founder90: {
    title: 'Founder access includes',
    fit: 'Best when you want a short paid test before monthly or yearly.',
    features: [
      'Full workflow access for 90 days',
      'One-time checkout instead of recurring billing',
      'Enough time to test the workflow with real client work'
    ]
  }
};

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

const setupPaymentOptions = [
  {
    id: 'agency-starter',
    packageId: 'starter',
    workflowType: 'freelancers',
    label: 'Agency Starter Setup',
    badge: 'Freelancer setup',
    amount: { india: 999, global: 19 },
    currency: { india: 'INR', global: 'USD' },
    detail: 'For freelancers starting from zero: one offer, profile checklist, invoice/payment workflow, and proposal template.',
    cta: 'Pay Starter Setup',
    defaultSkill: 'Freelancer service setup',
    tone: 'yellow'
  },
  {
    id: 'agency-growth',
    packageId: 'growth',
    workflowType: 'freelancers',
    label: 'Agency Growth Setup',
    badge: 'Recommended setup',
    amount: { india: 2999, global: 59 },
    currency: { india: 'INR', global: 'USD' },
    detail: 'For freelancers ready to get clients: lead plan, outreach messages, pricing, proposal flow, and workspace handover.',
    cta: 'Pay Growth Setup',
    defaultSkill: 'Freelancer growth setup',
    recommended: true,
    tone: 'yellow'
  },
  {
    id: 'agency-managed',
    packageId: 'managed',
    workflowType: 'agencies',
    label: 'Managed Growth Setup',
    badge: 'Monthly support',
    amount: { india: 4999, global: 99 },
    currency: { india: 'INR', global: 'USD' },
    detail: 'For ongoing weekly business support with client actions, proposal review, payment checks, and monthly growth report.',
    cta: 'Pay Managed Setup',
    defaultSkill: 'Managed freelancer growth setup',
    tone: 'yellow'
  },
  {
    id: 'enterprise-team-setup',
    packageId: 'enterprise_team',
    workflowType: 'enterprise',
    label: 'Enterprise Team Setup',
    badge: 'Team setup payment',
    amount: { india: 4999, global: 99 },
    currency: { india: 'INR', global: 'USD' },
    detail: 'For agencies and small companies that need organization workspace, roles, security settings, audit/export habits, and first team workrooms configured.',
    cta: 'Pay Enterprise Setup',
    defaultSkill: 'Enterprise team workflow setup',
    tone: 'emerald'
  }
];

const getSafeSetupService = (value) => {
  const service = String(value || '').toLowerCase();
  if (service === 'agency') return 'agency-growth';
  if (service === 'enterprise') return 'enterprise-team-setup';
  return setupPaymentOptions.some((option) => option.id === service) ? service : 'agency-growth';
};

export default function Payment() {
  const location = useLocation();
  const [plan, setPlan] = useState('monthly');
  const [market, setMarket] = useState(getInitialBillingMarket);
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [earlyAccessLoading, setEarlyAccessLoading] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [serverPlanDetails, setServerPlanDetails] = useState(() => getFallbackPlanDetails(getInitialBillingMarket()));
  const [pricingWarning, setPricingWarning] = useState('');
  const [pricingBlocked, setPricingBlocked] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [earlyAccessStatus, setEarlyAccessStatus] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [accountUser, setAccountUser] = useState(() => getUser() || {});
  const [setupServiceId, setSetupServiceId] = useState(() => {
    if (typeof window === 'undefined') return 'agency-growth';
    return getSafeSetupService(new URLSearchParams(window.location.search).get('service'));
  });
  const [setupForm, setSetupForm] = useState(() => {
    const user = getUser() || {};
    return {
      customerName: user.name || '',
      email: user.email || '',
      whatsapp: '',
      skill: '',
      problem: '',
      targetClient: '',
      incomeGoal: ''
    };
  });
  const [setupError, setSetupError] = useState('');
  const [setupSuccess, setSetupSuccess] = useState('');
  const earlyIntent = new URLSearchParams(location.search).get('early') === '1';
  const selectedSetupOption = setupPaymentOptions.find((option) => option.id === setupServiceId) || setupPaymentOptions[1];

  useEffect(() => {
    const selectedPlan = getSafePlan(localStorage.getItem("plan") || "monthly");
    const selectedMarket = getMarketFromSearch(location.search) ||
      getSafeMarket(localStorage.getItem('billingMarket') || detectBillingMarket());
    const selectedService = getSafeSetupService(new URLSearchParams(location.search).get('service'));
    localStorage.setItem("plan", selectedPlan);
    localStorage.setItem('billingMarket', selectedMarket);
    setPlan(selectedPlan);
    setMarket(selectedMarket);
    setSetupServiceId(selectedService);
  }, [location.search]);

  useEffect(() => {
    setSetupForm((current) => ({
      ...current,
      customerName: current.customerName || accountUser?.name || '',
      email: current.email || accountUser?.email || ''
    }));
  }, [accountUser?.email, accountUser?.name]);

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
  const freeFullAccessEnabled = isFreeFullAccessEnabled();
  const freeAccessState = getFreeAccessState(accountUser);
  const freeAccessActive = Boolean(freeFullAccessEnabled && freeAccessState.active);
  const alternateMarket = market === 'global' ? 'india' : 'global';
  const alternatePlanDetails = getFallbackPlanDetails(alternateMarket);
  const current = serverPlanDetails[getSafePlan(plan)] || fallbackPlanDetails[getSafePlan(plan)];
  const currentPlanReady = current.checkoutType === 'one_time' || current.subscriptionReady;
  const checkoutDisabled = freeAccessActive ? false : loading || pricingLoading || pricingBlocked || !currentPlanReady;
  const earlyAccessAlreadyUsed = Boolean(accountUser?.earlyAccessUsedAt);
  const earlyAccessClosed = earlyAccessStatus?.enabled === false || Number(earlyAccessStatus?.seatsRemaining || 0) <= 0;
  const activePlanLabel = getPlanLabel(accountUser);
  const earlyAccessDisabled = freeAccessActive || earlyAccessLoading || loading || hasProAccess(accountUser) || earlyAccessAlreadyUsed || earlyAccessClosed;
  const earlyAccessButtonLabel = freeAccessActive
    ? `${freeAccessState.daysLeft || 30} Days Left`
    : hasProAccess(accountUser)
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

  const selectSetupService = (serviceId) => {
    const safeService = getSafeSetupService(serviceId);
    setSetupServiceId(safeService);
    setSetupError('');
    setSetupSuccess('');
    trackEvent('select_setup_service', {
      service: safeService,
      market
    });
  };

  const updateSetupForm = (event) => {
    const { name, value } = event.target;
    setSetupForm((current) => ({
      ...current,
      [name]: value
    }));
  };

  const confirmSetupSimulationPayment = async(booking, order) => {
    const verifyRes = await api.post(`/agency/bookings/${booking._id}/verify`, {
      razorpay_order_id: order.id
    });

    setSetupSuccess(`Payment received for ${verifyRes.data?.booking?.packageName || selectedSetupOption.label}. We will contact you on WhatsApp/email for setup.`);
    setSetupLoading(false);
  };

  const handleSetupPayment = async(event) => {
    event.preventDefault();
    setSetupError('');
    setSetupSuccess('');

    const name = setupForm.customerName.trim();
    const email = setupForm.email.trim();
    const whatsapp = setupForm.whatsapp.trim();
    const problem = setupForm.problem.trim();

    if (!name || !email || !whatsapp || !problem) {
      setSetupError('Name, email, WhatsApp, and setup problem are required before payment.');
      return;
    }

    try {
      setSetupLoading(true);
      trackEvent('begin_setup_checkout', {
        service: selectedSetupOption.id,
        package_id: selectedSetupOption.packageId,
        market,
        value: Number(selectedSetupOption.amount[market] || 0),
        currency: selectedSetupOption.currency[market] || 'INR'
      });

      const bookingRes = await api.post('/agency/bookings', {
        packageId: selectedSetupOption.packageId,
        market,
        workflowType: selectedSetupOption.workflowType,
        customerName: name,
        email,
        whatsapp,
        skill: setupForm.skill.trim() || selectedSetupOption.defaultSkill,
        problem,
        targetClient: setupForm.targetClient.trim(),
        incomeGoal: setupForm.incomeGoal.trim(),
        preferredPlatform: selectedSetupOption.workflowType === 'enterprise' ? 'Team rollout' : 'LinkedIn',
        source: 'payment_page'
      });

      const booking = bookingRes.data?.booking;
      if (!booking?._id) {
        throw new Error('Setup booking was not created. Please try again.');
      }

      const orderRes = await api.post(`/agency/bookings/${booking._id}/order`);
      const { keyId, order, simulation } = orderRes.data || {};
      if (!order?.id) {
        throw new Error('Setup payment order was not created. Please contact support.');
      }

      if (simulation) {
        await confirmSetupSimulationPayment(booking, order);
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error('Razorpay checkout failed to load. Please retry.');
      }

      const checkout = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency || selectedSetupOption.currency[market] || 'INR',
        name: COMPANY_SHORT_NAME,
        description: selectedSetupOption.label,
        order_id: order.id,
        prefill: {
          name,
          email,
          contact: whatsapp.replace(/\D/g, '')
        },
        notes: {
          agencySetupId: booking._id,
          packageId: selectedSetupOption.packageId,
          setupService: selectedSetupOption.id
        },
        modal: {
          ondismiss: () => {
            setSetupLoading(false);
          }
        },
        handler: async(response) => {
          try {
            const verifyRes = await api.post(`/agency/bookings/${booking._id}/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            setSetupSuccess(`Payment received for ${verifyRes.data?.booking?.packageName || selectedSetupOption.label}. We will contact you on WhatsApp/email for setup.`);
            trackEvent('setup_payment_success', {
              service: selectedSetupOption.id,
              package_id: selectedSetupOption.packageId,
              market,
              value: Number(booking.amount || selectedSetupOption.amount[market] || 0),
              currency: booking.currency || selectedSetupOption.currency[market] || 'INR'
            });
          } catch (verifyErr) {
            setSetupError(verifyErr?.response?.data?.message || 'Payment verification failed. Please contact support.');
          } finally {
            setSetupLoading(false);
          }
        }
      });

      checkout.open();
    } catch (err) {
      setSetupError(err?.response?.data?.message || err?.message || 'Unable to create setup payment.');
      setSetupLoading(false);
    }
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

    if (freeAccessActive) {
      trackEvent('open_free_full_access_from_payment', {
        plan: selectedPlan,
        market
      });
      window.location.href = '/client-flow';
      return;
    }

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
              ClientFlow AI is free now <br /> <span className="text-zinc-600">for your freelance workflow.</span>
            </h1>

            <p className="max-w-xl text-base sm:text-lg text-zinc-500 font-medium leading-relaxed mb-8 sm:mb-10">
              All logged-in users currently get the full lead-to-payment system: find clients, send proposals, manage delivery, create invoices, and follow up pending money.
            </p>

            {freeAccessActive && (
              <div className="mb-6 rounded-[1.75rem] border border-emerald-300/25 bg-emerald-300/[0.08] p-5 sm:p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">30-day free access is active</p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  You have {freeAccessState.daysLeft || 30} day{(freeAccessState.daysLeft || 30) === 1 ? '' : 's'} left.
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-300">
                  Use the full software workflow during this window. Paid Agency Setup and Enterprise Team Setup are still available if a user wants hands-on setup help.
                </p>
                <Link to="/client-flow" className="mt-5 inline-flex rounded-2xl bg-emerald-300 px-6 py-3 text-sm font-black uppercase tracking-widest text-slate-950 transition hover:bg-emerald-200">
                  Open Free Workspace
                </Link>
              </div>
            )}

            <div className="mb-6 rounded-[1.75rem] border border-yellow-300/20 bg-yellow-300/[0.06] p-5 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Freelance workflow payment only</p>
              <h2 className="mt-2 text-2xl font-black text-white">
                This page is only for software access.
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-400">
                New users get 30 days of free software access. Agency Setup and Enterprise Team Setup have their own separate payment pages.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link to="/payments/agency-setup" className="rounded-2xl border border-yellow-300/20 bg-yellow-300/10 px-5 py-3 text-center text-[10px] font-black uppercase tracking-widest text-yellow-100 transition hover:bg-yellow-300/15">
                  Agency Setup Payment
                </Link>
                <Link to="/payments/enterprise" className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-5 py-3 text-center text-[10px] font-black uppercase tracking-widest text-emerald-100 transition hover:bg-emerald-300/15">
                  Enterprise Setup Payment
                </Link>
              </div>
            </div>

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
                    Free software access lasts 30 days. After that, users can choose a paid software checkout plan without changing the product workflow.
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
                  {freeAccessActive ? 'Open Free Workspace' : pricingLoading ? 'Checking Price' : loading ? 'Opening Checkout' : currentPlanReady ? 'Buy Now' : 'Setup Required'}
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
                    Full software access is open for 30 days after signup.
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
                       {freeAccessActive ? 'Free trial active' : details.duration}
                     </p>
                     {planFeatureDetails[id] && (
                       <div className="mt-4 rounded-xl border border-white/8 bg-black/20 p-3">
                         <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                           {planFeatureDetails[id].title}
                         </p>
                         <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-400">
                           {planFeatureDetails[id].fit}
                         </p>
                         <div className="mt-3 grid gap-2">
                           {planFeatureDetails[id].features.slice(0, 3).map((feature) => (
                             <p key={feature} className="text-[11px] font-semibold leading-relaxed text-zinc-500">
                               {feature}
                             </p>
                           ))}
                         </div>
                       </div>
                     )}
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
                      {freeAccessActive ? 'Rs 0 / $0' : pricingLoading ? 'Checking...' : formatMoney(current.amount, current.currency)}
                    </p>
                    <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest mt-1">
                      {freeAccessActive ? 'Current software price' : 'Subscription Price'}
                    </p>
                  </div>
               </div>

               {planFeatureDetails[getSafePlan(plan)] && (
                 <div className="mb-8 rounded-[1.5rem] border border-yellow-300/15 bg-yellow-300/[0.05] p-5">
                   <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">
                     {planFeatureDetails[getSafePlan(plan)].title}
                   </p>
                   <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-300">
                     {planFeatureDetails[getSafePlan(plan)].fit}
                   </p>
                   <div className="mt-4 grid gap-3">
                     {planFeatureDetails[getSafePlan(plan)].features.map((feature) => (
                       <p key={feature} className="text-xs font-semibold leading-relaxed text-zinc-500">
                         {feature}
                       </p>
                     ))}
                   </div>
                 </div>
               )}

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
                    <span className="text-white">{freeAccessActive ? 'Free now' : pricingLoading ? 'Checking...' : formatMoney(current.amount, current.currency)}</span>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center text-sm font-bold">
                    <span className="text-zinc-600 uppercase tracking-widest">Payment Processing</span>
                    <span className="text-emerald-400 italic">{market === 'global' ? 'Global card' : 'Included'}</span>
                  </div>
                  <div className="pt-6 border-t border-white/5 flex flex-col items-end">
                    <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.2em] mb-2">Plan Amount</p>
                    <p className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                      {freeAccessActive ? 'Free' : pricingLoading ? '--' : formatMoney(current.amount, current.currency)}
                    </p>
                    <p className="text-xs font-bold text-zinc-500 mt-2">{freeAccessActive ? `${freeAccessState.daysLeft || 30} days left` : current.duration}</p>
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
                   : freeAccessActive
                     ? 'Open Free Workspace'
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
