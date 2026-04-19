import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../utils/api';

export default function Payment() {
  const [file, setFile] = useState(null);
  const [plan, setPlan] = useState('monthly');

  useEffect(() => {
    const selectedPlan = localStorage.getItem("plan") || "monthly";
    setPlan(selectedPlan);
  }, []);

  const planDetails = {
    monthly: {
      amount: 99,
      label: "Monthly Plan",
      note: "Flexible billing for steady client work."
    },
    yearly: {
      amount: 999,
      label: "Yearly Plan",
      note: "Best value for year-round invoicing."
    }
  };

  const current = planDetails[plan];
  const upiLink = `upi://pay?pa=ashieqahamed4@okicici&pn=InvoicePro&am=${current.amount}&cu=INR`;

  const handleConfirm = async () => {
    if (!file) {
      alert('Upload screenshot');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('screenshot', file);
      formData.append('plan', plan);

      await api.post('/payment/request', formData);

      localStorage.setItem("userPlan", plan);

      alert('Payment submitted successfully');
      window.location.href = '/dashboard';
    } catch {
      alert('Payment failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="container-custom grid gap-8 py-10 lg:grid-cols-[1fr_420px] lg:py-14">
        <section>
          <p className="mb-2 text-sm font-semibold text-yellow-300">Upgrade</p>
          <h1 className="mb-4 text-3xl font-semibold sm:text-4xl">
            Complete your upgrade
          </h1>

          <p className="mb-8 max-w-2xl text-zinc-400">
            Unlock unlimited invoices, payment tracking, and premium features after your UPI payment is approved.
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
              <p className="p-5">Secure payment via UPI</p>
              <p className="p-5">Activation after approval</p>
              <p className="p-5">No hidden charges</p>
            </div>
          </div>
        </section>

        <section className="surface h-fit p-5">
          <p className="mb-4 text-sm font-semibold text-zinc-400">
            Scan and Pay
          </p>

          <div className="mb-6 flex justify-center">
            <div className="rounded-lg bg-white p-4">
              <img
                alt="UPI QR"
                className="h-52 w-52"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`}
              />
            </div>
          </div>

          <div className="mb-6 grid gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm">
            <div>
              <p className="text-zinc-500">UPI ID</p>
              <p className="mt-1 font-semibold text-white">
                ashieqahamed4@okicici
              </p>
            </div>

            <div>
              <p className="text-zinc-500">Amount</p>
              <p className="mt-1 font-semibold text-emerald-300">
                Rs. {current.amount}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm text-zinc-400">
              Upload payment screenshot
            </label>

            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="input"
            />
          </div>

          <button
            onClick={handleConfirm}
            className="btn btn-primary w-full"
          >
            Submit Payment
          </button>
        </section>
      </main>
    </div>
  );
}
