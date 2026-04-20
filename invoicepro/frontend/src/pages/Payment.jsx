import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { getUser } from '../utils/auth';

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

export default function Payment() {
  const [plan, setPlan] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const user = getUser() || {};

  useEffect(() => {
    const selectedPlan = localStorage.getItem("plan") || "monthly";
    setPlan(selectedPlan);
  }, []);

  const planDetails = {
    monthly: {
      amount: 99,
      label: "Monthly Plan",
      note: "Flexible billing for steady client work.",
      duration: "30 days"
    },
    yearly: {
      amount: 999,
      label: "Yearly Plan",
      note: "Best value for year-round invoicing.",
      duration: "365 days"
    }
  };

  const current = planDetails[plan];

  const handleRazorpayPayment = async () => {
    try {
      setLoading(true);

      const isLoaded = await loadRazorpayScript();

      if (!isLoaded) {
        alert('Razorpay checkout failed to load. Please check your internet connection.');
        return;
      }

      const orderRes = await api.post('/payment/razorpay/order', {
        plan
      });

      const { keyId, order, simulation } = orderRes.data;

      // 🔥 SIMULATION BYPASS
      if (simulation) {
        setLoading(false);
        const confirmSim = window.confirm("SIMULATION MODE: Proceed with a test payment?");
        if (!confirmSim) return;

        setLoading(true);
        const verifyRes = await api.post('/payment/razorpay/verify', {
          plan,
          razorpay_order_id: order.id,
          razorpay_payment_id: 'pay_sim_' + Date.now(),
          razorpay_signature: 'sim_signature'
        });

        if (verifyRes.data.user) {
          const existingUser = getUser() || {};
          localStorage.setItem('user', JSON.stringify({
            ...existingUser,
            ...verifyRes.data.user
          }));
        }

        alert('Simulation successful. Your plan is active.');
        window.location.href = '/dashboard';
        return;
      }

      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'InvoicePro',
        description: current.label,
        order_id: order.id,
        prefill: {
          name: user.name || '',
          email: user.email || ''
        },
        notes: {
          plan
        },
        theme: {
          color: '#FACC15',
          backdrop_color: '#050505'
        },
        modal: {
          confirm_close: true
        },
        handler: async (response) => {
          try {
            const verifyRes = await api.post('/payment/razorpay/verify', {
              plan,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            localStorage.setItem("userPlan", plan);

            if (verifyRes.data.user) {
              const existingUser = getUser() || {};
              localStorage.setItem('user', JSON.stringify({
                ...existingUser,
                ...verifyRes.data.user
              }));
            }

            alert('Payment successful. Your plan is active.');
            window.location.href = '/dashboard';
          } catch (err) {
            alert(err.response?.data?.message || 'Payment verification failed');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      alert(err.response?.data?.message || 'Payment could not be started');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="container-custom grid gap-8 py-10 lg:grid-cols-[1fr_420px] lg:py-14">
        <section className="reveal">
          <p className="mb-2 text-sm font-semibold text-yellow-300">Upgrade</p>
          <h1 className="mb-4 text-3xl font-semibold sm:text-4xl">
            Pay securely with Razorpay
          </h1>

          <p className="mb-8 max-w-2xl text-zinc-400">
            Upgrade instantly with cards, UPI, netbanking, wallets, and other Razorpay-supported payment methods.
          </p>

          <div className="surface mb-6 overflow-hidden">
            <div className="border-b border-white/10 p-5">
              <p className="text-sm text-zinc-500">Selected plan</p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">
                    {current.label}
                  </h2>
                  <p className="mt-1 text-zinc-400">{current.note}</p>
                </div>
                <p className="text-3xl font-bold text-yellow-200">
                  Rs. {current.amount}
                </p>
              </div>
            </div>

            <div className="grid gap-0 divide-y divide-white/10 text-sm text-zinc-300 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <p className="p-5">Razorpay secure checkout</p>
              <p className="p-5">Instant activation after payment</p>
              <p className="p-5">{current.duration} access</p>
            </div>
          </div>
        </section>

        <section className="reveal reveal-delay-1 surface h-fit p-5">
          <p className="mb-2 text-sm font-semibold text-yellow-300">
            Checkout
          </p>

          <h2 className="mb-2 text-2xl font-semibold">
            {current.label}
          </h2>

          <p className="mb-6 text-zinc-400">
            Complete payment in Razorpay Checkout. Your plan activates only after the server verifies Razorpay’s signature.
          </p>

          <div className="mb-6 grid gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Amount</span>
              <span className="font-semibold text-emerald-300">Rs. {current.amount}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Gateway</span>
              <span className="font-semibold text-white">Razorpay</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Plan</span>
              <span className="font-semibold text-white">{current.duration}</span>
            </div>
          </div>

          <button
            onClick={handleRazorpayPayment}
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? 'Starting Checkout...' : `Pay Rs. ${current.amount}`}
          </button>

          <p className="mt-4 text-center text-xs text-zinc-500">
            Powered by Razorpay Standard Checkout.
          </p>
        </section>
      </main>
    </div>
  );
}
