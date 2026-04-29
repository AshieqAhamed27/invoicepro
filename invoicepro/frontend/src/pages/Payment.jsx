import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../utils/api';

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
    label: "Pro Monthly",
    note: "Unlimited invoices, payment links, and recurring billing.",
    duration: "Billed every 30 days"
  },
  yearly: {
    amount: 4999,
    label: "Pro Annual",
    note: "Best value for agencies and repeat-billing businesses.",
    duration: "Billed every 365 days"
  }
};

const getSafePlan = (value) => (planDetails[value] ? value : 'monthly');

const mapPlansById = (plans = []) =>
  plans.reduce((acc, plan) => {
    if (plan?.id) {
      acc[plan.id] = {
        ...planDetails[plan.id],
        amount: Number(plan.amount || 0),
        label: plan.label || plan.id,
        duration: Number(plan.durationDays || 0) === 365 ? "Billed every 365 days" : "Billed every 30 days"
      };
    }
    return acc;
  }, {});

export default function Payment() {
  const [plan, setPlan] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [serverPlanDetails, setServerPlanDetails] = useState(planDetails);
  const [pricingWarning, setPricingWarning] = useState('');

  useEffect(() => {
    const selectedPlan = getSafePlan(localStorage.getItem("plan") || "monthly");
    localStorage.setItem("plan", selectedPlan);
    setPlan(selectedPlan);
  }, []);

  useEffect(() => {
    const loadPricing = async () => {
      try {
        const res = await api.get('/payment/plans');
        const nextPlans = mapPlansById(res.data?.plans || []);

        if (nextPlans.monthly?.amount && nextPlans.yearly?.amount) {
          if (
            nextPlans.monthly.amount !== planDetails.monthly.amount ||
            nextPlans.yearly.amount !== planDetails.yearly.amount
          ) {
            setPricingWarning(
              `Backend checkout is still serving old pricing: monthly Rs ${nextPlans.monthly.amount}, yearly Rs ${nextPlans.yearly.amount}. Redeploy the backend before accepting payments.`
            );
            return;
          }

          setServerPlanDetails((prev) => ({
            ...prev,
            ...nextPlans
          }));
        }

        setPricingWarning('');
      } catch {
        setPricingWarning('Could not verify live checkout pricing from the backend. Please retry before taking payments.');
      }
    };

    loadPricing();
  }, []);

  const current = serverPlanDetails[getSafePlan(plan)] || planDetails[getSafePlan(plan)];

  const handleRazorpayPayment = async () => {
    let checkoutOpened = false;
    const selectedPlan = getSafePlan(plan);
    setPlan(selectedPlan);
    localStorage.setItem("plan", selectedPlan);

    try {
      setLoading(true);

      const orderRes = await api.post('/payment/razorpay/order', {
        plan: selectedPlan
      });

      const keyId = orderRes.data?.keyId;
      const order = orderRes.data?.order;
      const simulation = Boolean(orderRes.data?.simulation);
      const serverPlan = orderRes.data?.plan;

      if (!order?.id) {
        throw new Error("Invalid order response");
      }

      if (
        serverPlan?.id === selectedPlan &&
        Number(serverPlan.amount || 0) !== Number(planDetails[selectedPlan].amount)
      ) {
        throw new Error(
          `Checkout amount mismatch detected. Server returned Rs ${serverPlan.amount} for the ${selectedPlan} plan. Redeploy the backend first.`
        );
      }

      if (simulation) {
        const verifyRes = await api.post('/payment/razorpay/verify', {
          plan: selectedPlan,
          razorpay_order_id: order.id,
          razorpay_payment_id: `pay_sim_${Date.now()}`,
          razorpay_signature: 'sim_signature'
        });

        if (verifyRes.data?.user) {
          localStorage.setItem('user', JSON.stringify(verifyRes.data.user));
        }

        alert("Payment successful");
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
        amount: order.amount,
        currency: order.currency,
        name: "InvoicePro",
        description: "Subscription Payment",
        order_id: order.id,
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

            alert("Payment successful");
            window.location.href = "/dashboard";
          } catch (verifyErr) {
            const verifyMessage = verifyErr?.response?.data?.message || "Payment verification failed";
            alert(verifyMessage);
            setLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      checkoutOpened = true;
      rzp.open();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Payment failed";
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

      <main className="container-custom py-10 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_400px]">
          <section className="reveal">
            <div className="flex items-center gap-2 mb-4">
               <span className="h-px w-8 bg-yellow-400" />
               <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Secure Checkout</p>
            </div>
            <h1 className="text-4xl font-bold sm:text-5xl lg:text-7xl tracking-tight text-white mb-6 leading-none">
              Upgrade to <br /> <span className="text-zinc-600">Pro.</span>
            </h1>

            <p className="max-w-xl text-lg text-zinc-500 font-medium leading-relaxed mb-10">
              Pay securely with Razorpay and unlock unlimited invoices, payment links,
              and recurring billing for your business.
            </p>

            <div className="premium-panel p-8 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-5 text-white pointer-events-none group-hover:opacity-10 transition-opacity">
                  <svg className="h-20 w-20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" /></svg>
               </div>

               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 pb-10 border-b border-white/5">
                  <div>
                    <h2 className="text-2xl font-black text-white italic mb-1">{current.label}</h2>
                    <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest">{current.note}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-4xl font-black text-white tracking-tight">Rs {current.amount}</p>
                    <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest mt-1">Total Due Now</p>
                  </div>
               </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[10px] font-black uppercase tracking-widest text-zinc-500">
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
                     <p className="group-hover:text-white transition-colors">{current.duration}</p>
                  </div>
                </div>
            </div>
          </section>

          <aside className="reveal reveal-delay-1 h-fit">
            <div className="premium-panel p-10">
               <div className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-white/5 border border-white/10 mb-8">
                 <p className="text-[10px] uppercase tracking-widest font-black text-zinc-500">Checkout Terminal</p>
               </div>

                <div className="space-y-6 mb-10">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-zinc-600 uppercase tracking-widest">Plan Price</span>
                    <span className="text-white">Rs {current.amount}.00</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-zinc-600 uppercase tracking-widest">Payment Processing</span>
                    <span className="text-emerald-400 italic">Included</span>
                  </div>
                  <div className="pt-6 border-t border-white/5 flex flex-col items-end">
                    <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.2em] mb-2">Total Due Today</p>
                    <p className="text-5xl font-black text-white tracking-tight">Rs {current.amount}</p>
                    <p className="text-xs font-bold text-zinc-500 mt-2">inclusive of all taxes</p>
                  </div>
               </div>

               <button
                 onClick={handleRazorpayPayment}
                 disabled={loading || Boolean(pricingWarning)}
                 className="btn btn-primary w-full py-5 text-lg shadow-xl shadow-black/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all"
               >
                 {loading ? 'Starting Payment...' : 'Pay Securely'}
               </button>

               {pricingWarning && (
                 <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-bold text-red-300">
                   {pricingWarning}
                 </div>
               )}

               <div className="mt-8 flex items-center justify-center gap-4 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                  <img src="https://cdn.razorpay.com/static/assets/badgetext.png" alt="Razorpay Secure" className="h-6" />
               </div>
            </div>

             <div className="mt-8 p-8 rounded-[2rem] border border-white/5 bg-white/[0.01]">
                <p className="text-[10px] font-bold text-zinc-600 leading-relaxed uppercase tracking-widest text-center">
                  Your Pro access starts immediately after successful payment.
                </p>
             </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
