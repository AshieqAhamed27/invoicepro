import React from 'react';
import Navbar from '../components/Navbar';

export default function Payment() {

  const handleConfirm = () => {
    const user = JSON.parse(localStorage.getItem('user'));

    const updatedUser = {
      ...user,
      plan: 'pro'
    };

    localStorage.setItem('user', JSON.stringify(updatedUser));

    alert("🎉 Payment successful! You are now PRO");

    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <div className="max-w-lg mx-auto mt-10 bg-white p-8 rounded-xl shadow">

        <h1 className="text-2xl font-bold text-center mb-2">
          Upgrade to Pro 🚀
        </h1>

        <p className="text-center text-gray-500 mb-6">
          Unlimited invoices • Premium features
        </p>

        {/* PRICE */}
        <div className="text-center mb-6">
          <span className="text-3xl font-bold">₹99</span>
          <p className="text-sm text-gray-400">One-time payment</p>
        </div>

        {/* QR */}
        <div className="flex justify-center mb-6">
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=upi://pay?pa=ashieqahamed4@okicic&pn=InvoicePro&am=99"
            alt="UPI QR"
          />
        </div>

        {/* UPI ID */}
        <div className="text-center mb-4">
          <p className="text-gray-500 text-sm">Pay using UPI</p>
          <p className="font-bold text-lg">ashieqahamed4@okicici</p>
        </div>

        <p className="text-center text-xs text-gray-400 mb-6">
          After completing payment, click confirm below
        </p>

        <button
          onClick={handleConfirm}
          className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800"
        >
          I Have Paid ✅
        </button>

      </div>
    </div>
  );
}