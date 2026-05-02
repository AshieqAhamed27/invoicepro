import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import { COMPANY_SHORT_NAME } from '../utils/company';
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
    note: "Unlimited invoices, AI revenue coach, payment links, and recurring billing.",
    duration: "Billed every 30 days",
    amountSource: "fallback"
  },
  yearly: {
    amount: 4999,
    currency: "INR",
    label: "Pro Annual",
    note: "Best value with AI revenue coaching for repeat-billing businesses.",
    duration: "Billed every 365 days",
    amountSource: "fallback"
  },
  founder90: {
    amount: 999,
    currency: "INR",
    label: "Founder 90 Days",
    note: "Early-user offer: 90 days of Pro access with one-time Razorpay payment.",
    duration: "Valid for 90 days",
    amountSource: "fallback",
    checkoutType: "one_time"
  }
};

const getSafePlan = (value) => (planDetails[value] ? value : 'monthly');

const getDurationLabel = (durationDays = 30) => {
  const days = Number(durationDays || 30);
  if (days === 365) return "Billed every 365 days";
  if (days === 90) return "Valid for 90 days";
  if (days === 7) return "Valid for 7 days";
  return "Billed every 30 days";
};

const mapPlansById = (plans = []) =>
  plans.reduce((acc, plan) => {
    if (plan?.id) {
      acc[plan.id] = {
        ...planDetails[plan.id],
        amount: Number(plan.amount || 0),
        currency: plan.currency || "INR",
        label: plan.label || plan.id,
        duration: getDurationLabel(plan.durationDays),
        amountSource: plan.amountSource || "backend",
        checkoutType: plan.checkoutType || planDetails[plan.id]?.checkoutType || "subscription",
        subscriptionReady: Boolean(plan.subscriptionReady),
        warning: plan.warning || ""
      };
    }
    return acc;
  }, {});

export default function Payment() {
  const [plan, setPlan] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [serverPlanDetails, setServerPlanDetails] = useState(planDetails);
  const [pricingWarning, setPricingWarning] = useState('');
  const [pricingBlocked, setPricingBlocked] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);

  useEffect(() => {
    const selectedPlan = getSafePlan(localStorage.getItem("plan") || "monthly");
    localStorage.setItem("plan", selectedPlan);
    setPlan(selectedPlan);
  }, []);

  useEffect(() => {
    const loadPricing = async () => {
      try {
        setPricingLoading(true);
        setPricingBlocked(false);
        const res = await api.get('/payment/plans');
        const nextPlans = mapPlansById(res.data?.plans || []);

        if (nextPlans.monthly?.amount && nextPlans.yearly?.amount) {
          setServerPlanDetails((prev) => ({
            ...prev,
            ...nextPlans
          }));
          setPricingWarning((res.data?.warnings || []).join(' '));
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
  }, []);

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const res = await api.get('/payment/subscription/status');
        setSubscriptionStatus(res.data?.subscription || null);
        if (res.data?.user) {
          localStorage.setItem('user', JSON.stringify(res.data.user));
        }
      } catch {
        setSubscriptionStatus(null);
      }
    };

    loadSubscription();
  }, []);

  const current = serverPlanDetails[getSafePlan(plan)] || planDetails[getSafePlan(plan)];
  const selectPlan = (nextPlan) => {
    const safePlan = getSafePlan(nextPlan);
    localStorage.setItem("plan", safePlan);
    setPlan(safePlan);
    trackEvent('select_subscription_plan', {
      plan: safePlan,
      value: Number(serverPlanDetails[safePlan]?.amount || planDetails[safePlan].amount),
      currency: 'INR'
    });
  };

  const handleTrialStart = async () => {
    try {
      setTrialLoading(true);
      const res = await api.post('/payment/trial/start');

      if (res.data?.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }

      trackEvent('start_trial', {
        value: 0,
        currency: 'INR'
      });
      alert(res.data?.message || '7-day Pro trial activated');
      window.location.href = '/dashboard';
    } catch (err) {
      alert(err?.response?.data?.message || 'Unable to activate trial');
    } finally {
      setTrialLoading(false);
    }
  };

  const handleOneTimePayment = async (selectedPlan) => {
    let checkoutOpened = false;

    try {
      setLoading(true);
      trackEvent('begin_checkout', {
        plan: selectedPlan,
        value: Number(current.amount || 0),
        currency: current.currency || 'INR',
        checkout_type: 'one_time'
      });

      const orderRes = await api.post('/payment/razorpay/order', {
        plan: selectedPlan
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
            duration: getDurationLabel(serverPlan.durationDays)
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

    if ((serverPlanDetails[selectedPlan] || planDetails[selectedPlan])?.checkoutType === 'one_time') {
      await handleOneTimePayment(selectedPlan);
      return;
    }

    try {
      setLoading(true);
      trackEvent('begin_checkout', {
        plan: selectedPlan,
        value: Number(current.amount || 0),
        currency: current.currency || 'INR'
      });

      const subscriptionRes = await api.post('/payment/razorpay/subscription', {
        plan: selectedPlan
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
            duration: getDurationLabel(serverPlan.durationDays)
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

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10 md:py-16 xl:py-20">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-12">
          <section className="reveal">
            <div className="flex items-center gap-2 mb-4">
               <span className="h-px w-8 bg-yellow-400" />
               <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Secure Checkout</p>
            </div>
            <h1 className="text-4xl font-bold sm:text-5xl xl:text-7xl tracking-tight text-white mb-6 leading-none">
              Upgrade to <br /> <span className="text-zinc-600">Pro.</span>
            </h1>

            <p className="max-w-xl text-base sm:text-lg text-zinc-500 font-medium leading-relaxed mb-8 sm:mb-10">
              Start a real Razorpay subscription and unlock unlimited invoices, AI collection prompts,
              payment links, and recurring billing for your business.
            </p>

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
                     <p className="mt-2 text-2xl font-black text-white">Rs {details.amount}</p>
                     <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                       {details.duration}
                     </p>
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
                      {pricingLoading ? 'Checking...' : `Rs ${current.amount}`}
                    </p>
                    <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest mt-1">Subscription Price</p>
                  </div>
               </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  <div className="flex items-center gap-4 group/item">
                     <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                     <p className="group-hover:text-white transition-colors">Unlimited Invoices</p>
                  </div>
                  <div className="flex items-center gap-4 group/item">
                     <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                     <p className="group-hover:text-white transition-colors">Recurring Billing</p>
                  </div>
                  <div className="flex items-center gap-4 group/item">
                     <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                     <p className="group-hover:text-white transition-colors">Secure Razorpay Checkout</p>
                  </div>
                  <div className="flex items-center gap-4 group/item">
                     <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                     <p className="group-hover:text-white transition-colors">AI Revenue Coach</p>
                  </div>
                  <div className="flex items-center gap-4 group/item">
                     <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                     <p className="group-hover:text-white transition-colors">Reminder Copy Assistant</p>
                  </div>
                  <div className="flex items-center gap-4 group/item">
                     <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                     <p className="group-hover:text-white transition-colors">{current.duration}</p>
                  </div>
                </div>
            </div>
          </section>

          <aside className="reveal reveal-delay-1 h-fit">
            <div className="premium-panel p-5 sm:p-8 xl:p-10">
               <div className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-white/5 border border-white/10 mb-8">
                 <p className="text-[10px] uppercase tracking-widest font-black text-zinc-500">Checkout Terminal</p>
               </div>

                <div className="space-y-6 mb-10">
                  <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center text-sm font-bold">
                    <span className="text-zinc-600 uppercase tracking-widest">
                      {current.checkoutType === 'one_time' ? 'One-Time Plan' : 'Recurring Plan'}
                    </span>
                    <span className="text-white">{pricingLoading ? 'Checking...' : `Rs ${current.amount}.00`}</span>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center text-sm font-bold">
                    <span className="text-zinc-600 uppercase tracking-widest">Payment Processing</span>
                    <span className="text-emerald-400 italic">Included</span>
                  </div>
                  <div className="pt-6 border-t border-white/5 flex flex-col items-end">
                    <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.2em] mb-2">Plan Amount</p>
                    <p className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                      {pricingLoading ? '--' : `Rs ${current.amount}`}
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
                 </div>
               )}

               <button
                 onClick={handleRazorpayPayment}
                 disabled={loading || pricingLoading || pricingBlocked}
                 className="btn btn-primary w-full py-5 text-lg shadow-xl shadow-black/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all"
               >
                 {pricingLoading
                   ? 'Verifying Price...'
                   : loading
                     ? 'Starting Checkout...'
                     : current.checkoutType === 'one_time'
                       ? 'Pay Once and Activate'
                       : 'Start Subscription'}
               </button>

               <button
                 type="button"
                 onClick={handleTrialStart}
                 disabled={trialLoading || loading}
                 className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm font-black text-white transition-all hover:bg-white/[0.06] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
               >
                 {trialLoading ? 'Activating Trial...' : 'Start 7-Day Free Trial'}
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

               <div className="mt-8 flex items-center justify-center gap-4 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                  <img src="https://cdn.razorpay.com/static/assets/badgetext.png" alt="Razorpay Secure" className="h-6" />
               </div>
            </div>

             <div className="mt-8 p-8 rounded-[2rem] border border-white/5 bg-white/[0.01]">
                <p className="text-[10px] font-bold text-zinc-600 leading-relaxed uppercase tracking-widest text-center">
                  Use the 7-day trial for free setup calls, the founder offer for early users, or monthly billing for repeat subscribers.
                </p>
             </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
