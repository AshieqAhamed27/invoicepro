import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../utils/api';
import { getFreeAccessState, getUser, hasProAccess, isLoggedIn, setPostLoginRedirect } from '../utils/auth';
import { COMPANY_NAME, COMPANY_SHORT_NAME, SUPPORT_EMAIL } from '../utils/company';
import { trackEvent } from '../utils/analytics';
import useDocumentMeta from '../utils/useDocumentMeta';

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

const planData = {
  free: {
    id: 'free',
    label: 'Free 30-Day Access',
    badge: '30 Days Free Trial',
    price: { INR: '₹0', USD: '$0' },
    period: 'Full access for 30 days',
    description: 'Experience the entire ClientFlow AI client-to-cash workspace completely free for 30 days. No credit card required.',
    features: [
      '30 days of full software access',
      'AI Proposal Writer & Deal Rooms',
      'GST Invoice Generator with Razorpay link creation',
      'Client Finder & Outbound Autopilot',
      'Money GPS & Profit Tracker',
      'No auto-debit or hidden fees'
    ],
    ctaText: 'Start 30-Day Free Trial',
    checkoutType: 'free'
  },
  monthly: {
    id: 'monthly',
    label: 'Pro Monthly Subscription',
    badge: 'Most Flexible',
    price: { INR: '₹499', USD: '$9' },
    period: 'per month',
    description: 'Full Pro access billed month-to-month. Perfect for active freelancers and consultants who want maximum flexibility.',
    features: [
      'Unlimited GST Invoices & Payment Links',
      'AI Client Coach & Sales Agent',
      'Automated Payment Reminders',
      'Client Deal Closure Rooms & Workrooms',
      'Money GPS & Growth Plan',
      'Cancel anytime from your account'
    ],
    ctaText: 'Pay & Subscribe Now',
    checkoutType: 'subscription'
  },
  yearly: {
    id: 'yearly',
    label: 'Pro Annual Plan',
    badge: 'Best Value (Save 17%)',
    price: { INR: '₹4,999', USD: '$89' },
    period: 'per year',
    description: 'Get a full year of stable client-to-cash workflow at a discounted annual rate. Ideal for established freelancers and agencies.',
    features: [
      'Everything included in Pro Monthly for 12 months',
      'Save over ₹980 compared to monthly billing',
      'Priority Support via Email & WhatsApp',
      'Dedicated Workroom templates',
      'Early access to new AI feature releases'
    ],
    ctaText: 'Pay Annual Subscription',
    checkoutType: 'subscription'
  },
  founder90: {
    id: 'founder90',
    label: 'Founder 90-Day Offer',
    badge: 'Special Early Access',
    price: { INR: '₹999', USD: '$19' },
    period: 'one-time payment (90 days access)',
    description: 'Exclusive 90-day access for early adopters. Enjoy 3 full months of full workspace capabilities with a single low payment.',
    features: [
      'Full Pro workspace access for 90 days',
      'One-time payment — NO recurring subscription',
      'Includes all AI tools, invoice generator & payment tracking',
      'Great for testing the workflow on live projects'
    ],
    ctaText: 'Claim Founder Offer',
    checkoutType: 'one_time'
  }
};

const getSafeMarket = (value) => (String(value || '').toLowerCase() === 'global' ? 'global' : 'india');

export default function PlanCheckout() {
  const { planId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();
  const user = loggedIn ? getUser() : null;
  const isPro = hasProAccess(user);

  const selectedPlanId = planData[planId] ? planId : 'monthly';
  const plan = planData[selectedPlanId];

  const [market, setMarket] = useState(() => {
    const queryMarket = new URLSearchParams(location.search).get('market');
    return getSafeMarket(queryMarket || localStorage.getItem('billingMarket'));
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useDocumentMeta({
    title: `${plan.label} Checkout | ${COMPANY_NAME}`,
    description: plan.description,
    path: `/checkout/${selectedPlanId}`
  });

  const currencyKey = market === 'global' ? 'USD' : 'INR';
  const priceDisplay = plan.price[currencyKey];

  const handleCheckout = async () => {
    setError('');
    setSuccess('');

    if (!loggedIn) {
      const redirectPath = `/checkout/${selectedPlanId}?market=${market}`;
      setPostLoginRedirect(redirectPath);
      navigate('/signup');
      return;
    }

    if (plan.id === 'free') {
      try {
        setLoading(true);
        trackEvent('start_free_trial', { plan: 'free' });
        setSuccess('30-Day Free Trial Active! Redirecting to workspace...');
        setTimeout(() => {
          navigate('/client-flow');
        }, 1500);
      } catch (err) {
        setError('Unable to activate free trial. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      trackEvent('begin_checkout', {
        plan: selectedPlanId,
        market,
        currency: currencyKey
      });

      const endpoint = plan.checkoutType === 'one_time' 
        ? '/payment/razorpay/order' 
        : '/payment/razorpay/subscription';

      const res = await api.post(endpoint, {
        plan: selectedPlanId,
        market
      });

      const { keyId, order, subscription, simulation } = res.data || {};
      const orderOrSubId = order?.id || subscription?.id;

      if (!orderOrSubId && !simulation) {
        throw new Error('Could not initiate checkout with payment server.');
      }

      if (simulation) {
        setSuccess('Payment Simulation Verified! Activating plan...');
        setTimeout(() => {
          window.location.href = '/client-flow';
        }, 1200);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      const razorpayOptions = {
        key: keyId,
        name: COMPANY_SHORT_NAME,
        description: plan.label,
        order_id: order?.id,
        subscription_id: subscription?.id,
        amount: order?.amount,
        currency: order?.currency || (currencyKey === 'USD' ? 'USD' : 'INR'),
        prefill: {
          name: user?.name || '',
          email: user?.email || ''
        },
        handler: async (response) => {
          try {
            const verifyEndpoint = plan.checkoutType === 'one_time'
              ? '/payment/razorpay/verify'
              : '/payment/razorpay/subscription/verify';

            const verifyRes = await api.post(verifyEndpoint, {
              plan: selectedPlanId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyRes.data?.user) {
              localStorage.setItem('user', JSON.stringify(verifyRes.data.user));
            }

            setSuccess('Payment verified successfully! Welcome to Pro!');
            trackEvent('purchase_success', { plan: selectedPlanId, market });
            setTimeout(() => {
              window.location.href = '/client-flow';
            }, 1500);
          } catch (vErr) {
            setError(vErr?.response?.data?.message || 'Payment verification failed. Please contact support.');
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(razorpayOptions);
      rzp.open();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to initialize payment.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-yellow-500 selection:text-black">
      <Navbar />

      <main className="container mx-auto px-4 py-12 max-w-4xl flex-grow">
        {/* Navigation back link */}
        <div className="mb-6">
          <Link 
            to="/payments" 
            className="inline-flex items-center text-sm text-slate-400 hover:text-yellow-400 transition-colors"
          >
            ← Back to All Plans
          </Link>
        </div>

        {/* Currency Switcher */}
        <div className="flex justify-between items-center mb-8 bg-slate-900/60 p-4 rounded-xl border border-slate-800 backdrop-blur">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Billing Region</span>
            <p className="text-sm text-slate-200">{market === 'india' ? '🇮🇳 India (INR)' : '🌐 International (USD)'}</p>
          </div>
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => {
                setMarket('india');
                localStorage.setItem('billingMarket', 'india');
              }}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                market === 'india' ? 'bg-yellow-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              INR (₹)
            </button>
            <button
              onClick={() => {
                setMarket('global');
                localStorage.setItem('billingMarket', 'global');
              }}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                market === 'global' ? 'bg-yellow-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              USD ($)
            </button>
          </div>
        </div>

        {/* Selected Plan Details Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl backdrop-blur relative overflow-hidden">
          {/* Subtle Background Glow */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-slate-800">
            <div>
              <span className="inline-block px-3 py-1 text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-full mb-2">
                {plan.badge}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{plan.label}</h1>
              <p className="text-slate-400 text-sm mt-1">{plan.description}</p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-3xl sm:text-4xl font-black text-yellow-400">{priceDisplay}</div>
              <div className="text-xs text-slate-400 mt-1">{plan.period}</div>
            </div>
          </div>

          {/* Plan Features */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">What's Included:</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {plan.features.map((feat, idx) => (
                <li key={idx} className="flex items-start text-sm text-slate-300">
                  <span className="text-emerald-400 font-bold mr-2">✓</span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Feedback & Alerts */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-300 text-sm">
              🚨 {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-900/30 border border-emerald-500/50 rounded-xl text-emerald-300 text-sm">
              ✅ {success}
            </div>
          )}

          {/* Action Button */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full py-4 px-6 bg-gradient-to-r from-yellow-500 to-amber-400 hover:from-yellow-400 hover:to-amber-300 text-slate-950 font-bold text-lg rounded-xl shadow-lg shadow-yellow-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <span>{plan.ctaText}</span>
              )}
            </button>
            <p className="text-center text-xs text-slate-500">
              🔒 256-Bit Encrypted Payment. Supported via Razorpay, UPI, Cards & NetBanking.
            </p>
          </div>
        </div>

        {/* Support & Contact */}
        <div className="mt-8 text-center text-xs text-slate-400">
          Questions about this plan? Need custom invoice help? Contact us at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-yellow-400 hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
