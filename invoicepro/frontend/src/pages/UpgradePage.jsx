import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, CreditCard, Crown, Loader2, ShieldCheck } from 'lucide-react';
import api from '../utils/api';
import { formatRs } from '../utils/currency';
import MotionButton from '../components/ui/MotionButton';
import PageTransition from '../components/ui/PageTransition';

const planDefaults = {
  monthly: {
    amount: 499,
    label: 'Pro Monthly',
    duration: '30 days',
    note: 'Best for freelancers and solo service businesses.'
  },
  yearly: {
    amount: 4999,
    label: 'Pro Annual',
    duration: '365 days',
    note: 'Best value for agencies and repeat-billing teams.'
  }
};

const perks = [
  'Unlimited invoices and proposals',
  'Razorpay payment links',
  'Recurring billing workflows',
  'Client payment tracking'
];

const getSafePlan = (value) => (planDefaults[value] ? value : 'monthly');

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function UpgradePage() {
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [plans, setPlans] = useState(planDefaults);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [hasToken, setHasToken] = useState(() => Boolean(localStorage.getItem('token')));

  useEffect(() => {
    const savedPlan = getSafePlan(localStorage.getItem('plan') || 'monthly');
    setSelectedPlan(savedPlan);
    setHasToken(Boolean(localStorage.getItem('token')));
  }, []);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const res = await api.get('/payment/plans');
        const nextPlans = (res.data?.plans || []).reduce((acc, plan) => {
          if (!plan?.id || !planDefaults[plan.id]) return acc;

          acc[plan.id] = {
            ...planDefaults[plan.id],
            amount: Number(plan.amount || planDefaults[plan.id].amount),
            label: plan.label || planDefaults[plan.id].label,
            duration: Number(plan.durationDays) === 365 ? '365 days' : '30 days'
          };
          return acc;
        }, {});

        setPlans((current) => ({ ...current, ...nextPlans }));
      } catch {
        setNotice({
          type: 'warning',
          text: 'Could not reach backend pricing yet. Checkout will retry when you pay.'
        });
      }
    };

    loadPlans();
  }, []);

  const currentPlan = plans[getSafePlan(selectedPlan)];
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const handlePlanChange = (plan) => {
    const safePlan = getSafePlan(plan);
    localStorage.setItem('plan', safePlan);
    setSelectedPlan(safePlan);
    setNotice(null);
  };

  const handlePayment = async () => {
    const plan = getSafePlan(selectedPlan);
    setSelectedPlan(plan);
    localStorage.setItem('plan', plan);

    if (!localStorage.getItem('token')) {
      setHasToken(false);
      setNotice({
        type: 'error',
        text: 'Login first, then upgrade. Razorpay needs your account token so Pro access can be applied after payment.'
      });
      return;
    }

    let checkoutOpened = false;

    try {
      setLoading(true);
      setNotice(null);

      const orderRes = await api.post('/payment/razorpay/order', { plan });
      const { keyId, order, simulation } = orderRes.data || {};

      if (!order?.id) {
        throw new Error('Backend did not return a Razorpay order id.');
      }

      if (simulation) {
        const verifyRes = await api.post('/payment/razorpay/verify', {
          plan,
          razorpay_order_id: order.id,
          razorpay_payment_id: `pay_sim_${Date.now()}`,
          razorpay_signature: 'sim_signature'
        });

        if (verifyRes.data?.user) {
          localStorage.setItem('user', JSON.stringify(verifyRes.data.user));
        }

        setNotice({
          type: 'success',
          text: 'Pro upgrade completed in simulation mode.'
        });
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay checkout script did not load. Check internet access or browser blocking.');
      }

      if (!keyId) {
        throw new Error('Razorpay key id is missing from the backend response.');
      }

      const rzp = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'InvoicePro',
        description: currentPlan.label,
        order_id: order.id,
        prefill: {
          name: user.name || '',
          email: user.email || ''
        },
        theme: {
          color: '#2563eb'
        },
        modal: {
          ondismiss: () => setLoading(false)
        },
        handler: async (response) => {
          try {
            const verifyRes = await api.post('/payment/razorpay/verify', {
              plan,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyRes.data?.user) {
              localStorage.setItem('user', JSON.stringify(verifyRes.data.user));
            }

            setNotice({
              type: 'success',
              text: 'Payment verified. Pro access is now active.'
            });
          } catch (err) {
            setNotice({
              type: 'error',
              text: err?.response?.data?.message || 'Payment verification failed.'
            });
          } finally {
            setLoading(false);
          }
        }
      });

      rzp.on('payment.failed', (response) => {
        setNotice({
          type: 'error',
          text: response?.error?.description || response?.error?.reason || 'Razorpay payment failed.'
        });
        setLoading(false);
      });

      checkoutOpened = true;
      rzp.open();
    } catch (err) {
      const status = err?.response?.status;
      const serverMessage = err?.response?.data?.message;

      setNotice({
        type: 'error',
        text:
          status === 401
            ? 'Login first, then upgrade. Your session token is missing or expired.'
            : serverMessage || err?.message || 'Payment failed.'
      });
    } finally {
      if (!checkoutOpened) {
        setLoading(false);
      }
    }
  };

  return (
    <PageTransition className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="rounded-3xl border border-white/10 bg-slate-800 p-6 shadow-2xl shadow-black/20">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-lg shadow-blue-950/30">
              <Crown className="h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-cyan-300">Upgrade Pro</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Unlock Razorpay payments and unlimited billing.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Choose a plan, open Razorpay Checkout, and Pro access is applied after payment verification.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {Object.entries(plans).map(([id, plan]) => {
              const active = selectedPlan === id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handlePlanChange(id)}
                  className={`rounded-2xl border p-5 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-blue-300 ${
                    active
                      ? 'border-blue-300/60 bg-blue-500/12 shadow-lg shadow-blue-950/20'
                      : 'border-white/10 bg-slate-900/45 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-bold text-white">{plan.label}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{plan.note}</p>
                    </div>
                    {active && <Check className="h-5 w-5 text-cyan-300" aria-hidden="true" />}
                  </div>
                  <p className="mt-6 text-4xl font-black tracking-tight text-white">{formatRs(plan.amount)}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Access for {plan.duration}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {perks.map((perk) => (
              <div key={perk} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/45 p-4">
                <Check className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-200">{perk}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-3xl border border-white/10 bg-slate-800 p-6 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-300">Checkout summary</p>
              <h3 className="mt-2 text-2xl font-black text-white">{currentPlan.label}</h3>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-200">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
          </div>

          <div className="mt-7 space-y-4">
            <SummaryRow label="Plan price" value={formatRs(currentPlan.amount)} />
            <SummaryRow label="Currency" value="INR" />
            <SummaryRow label="Processor" value="Razorpay" />
            <div className="h-px bg-white/10" />
            <SummaryRow label="Total due today" value={formatRs(currentPlan.amount)} large />
          </div>

          <MotionButton className="mt-7 w-full" disabled={loading} onClick={handlePayment}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <CreditCard className="h-4 w-4" aria-hidden="true" />
            )}
            {loading ? 'Opening Razorpay...' : 'Pay with Razorpay'}
          </MotionButton>

          {!hasToken && (
            <Notice
              type="warning"
              text="You are not logged in. The checkout page is ready, but Pro activation needs a valid user token."
            />
          )}

          {notice && <Notice type={notice.type} text={notice.text} />}

          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/45 p-4">
            <p className="text-xs leading-5 text-slate-400">
              If Razorpay still does not open, confirm the backend has `RAZORPAY_KEY_ID`,
              `RAZORPAY_KEY_SECRET`, and `FRONTEND_URL` configured. For local testing, use
              `PAYMENT_SIMULATION=true`.
            </p>
          </div>
        </aside>
      </section>
    </PageTransition>
  );
}

function SummaryRow({ label, value, large }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={`${large ? 'font-bold text-white' : 'text-sm font-medium text-slate-400'}`}>
        {label}
      </span>
      <span className={`${large ? 'text-3xl font-black text-white' : 'text-sm font-bold text-slate-200'}`}>
        {value}
      </span>
    </div>
  );
}

function Notice({ type, text }) {
  const styles = {
    success: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100',
    warning: 'border-amber-300/20 bg-amber-300/10 text-amber-100',
    error: 'border-rose-400/20 bg-rose-400/10 text-rose-100'
  };

  return (
    <div className={`mt-4 flex gap-3 rounded-2xl border p-4 text-sm font-semibold leading-6 ${styles[type] || styles.warning}`}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>{text}</p>
    </div>
  );
}
