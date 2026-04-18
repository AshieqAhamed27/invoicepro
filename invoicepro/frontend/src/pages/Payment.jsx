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

  // ✅ PLAN CONFIG
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

      // Save plan locally (temporary)
      localStorage.setItem("userPlan", plan);

      alert('Payment request sent');
      window.location.href = '/dashboard';

    } catch (err) {
      alert('Payment request failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
      <Navbar />

      <main className="w-full max-w-md mx-auto px-4 py-8">

        <div className="bg-gray-900/80 border border-gray-700 rounded-2xl shadow-xl p-6">

          <h1 className="text-2xl font-bold text-center mb-2">
            Upgrade to Pro 🚀
          </h1>

          <p className="text-center text-gray-400 mb-4">
            {current.label}
          </p>

          {/* PRICE */}
          <div className="text-center mb-6">
            <span className="text-3xl font-bold text-yellow-400">
              ₹{current.amount}
            </span>
          </div>

          {/* QR */}
          <div className="flex justify-center mb-6">
            <div className="bg-white p-4 rounded-2xl">
              <img
                alt="UPI QR"
                className="w-52 h-52"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`}
              />
            </div>
          </div>

          {/* DETAILS */}
          <div className="bg-gray-800 p-4 rounded-xl mb-6 text-sm">
            <p className="text-gray-400">UPI ID</p>
            <p className="font-semibold">
              ashieqahamed4@okicici
            </p>

            <p className="text-gray-400 mt-3">Amount</p>
            <p className="text-green-400 font-semibold">
              ₹{current.amount}
            </p>
          </div>

          {/* FILE */}
          <div className="mb-4">
            <label className="text-sm text-gray-300 block mb-2">
              Upload Payment Screenshot
            </label>

            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full bg-gray-800 p-3 rounded-lg text-sm"
            />
          </div>

          {/* BUTTON */}
          <button
            onClick={handleConfirm}
            className="w-full bg-yellow-500 text-black py-3 rounded-xl font-semibold"
          >
            Submit Payment
          </button>

        </div>

      </main>
    </div>
  );
}