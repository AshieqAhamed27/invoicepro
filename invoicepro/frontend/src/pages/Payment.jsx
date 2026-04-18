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
      label: "Monthly Plan"
    },
    yearly: {
      amount: 999,
      label: "Yearly Plan"
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
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-16 grid md:grid-cols-2 gap-10">

        {/* LEFT SIDE */}
        <div>

          <h1 className="text-3xl font-semibold mb-4">
            Complete your upgrade
          </h1>

          <p className="text-gray-400 mb-8">
            Unlock unlimited invoices, payment tracking, and premium features.
          </p>

          <div className="card mb-6">

            <p className="text-sm text-gray-400 mb-2">
              Selected Plan
            </p>

            <h2 className="text-xl font-semibold">
              {current.label}
            </h2>

            <p className="text-yellow-400 text-2xl font-bold mt-2">
              ₹{current.amount}
            </p>

          </div>

          {/* TRUST */}
          <div className="text-sm text-gray-500 space-y-2">
            <p>✔ Secure payment via UPI</p>
            <p>✔ Instant activation after approval</p>
            <p>✔ No hidden charges</p>
          </div>

        </div>

        {/* RIGHT SIDE */}
        <div className="card">

          <p className="text-sm text-gray-400 mb-4">
            Scan & Pay
          </p>

          {/* QR */}
          <div className="flex justify-center mb-6 relative">
            <div className="absolute inset-0 bg-yellow-500 blur-2xl opacity-10"></div>

            <div className="relative bg-white p-4 rounded-2xl">
              <img
                alt="UPI QR"
                className="w-52 h-52"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`}
              />
            </div>
          </div>

          {/* DETAILS */}
          <div className="mb-6 text-sm">
            <p className="text-gray-400">UPI ID</p>
            <p className="font-semibold mb-3">
              ashieqahamed4@okicici
            </p>

            <p className="text-gray-400">Amount</p>
            <p className="text-green-400 font-semibold">
              ₹{current.amount}
            </p>
          </div>

          {/* FILE */}
          <div className="mb-4">
            <label className="text-sm text-gray-400 mb-2 block">
              Upload payment screenshot
            </label>

            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="input"
            />
          </div>

          {/* BUTTON */}
          <button
            onClick={handleConfirm}
            className="btn btn-primary w-full"
          >
            Submit Payment
          </button>

        </div>

      </main>
    </div>
  );
}