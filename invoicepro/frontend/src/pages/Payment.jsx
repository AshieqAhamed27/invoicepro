import React, { useState } from 'react';
import Navbar from '../components/Navbar';

export default function Payment() {
  const [paid, setPaid] = useState(false);

  const handleConfirm = () => {
    // ✅ Simulate upgrade
    const user = JSON.parse(localStorage.getItem('user'));

    const updatedUser = {
      ...user,
      plan: 'pro'
    };

    localStorage.setItem('user', JSON.stringify(updatedUser));

    alert("🎉 Payment verified! You are now PRO");

    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <div className="max-w-xl mx-auto mt-10 bg-white p-6 rounded-xl shadow">

        <h1 className="text-xl font-bold mb-4 text-center">
          Upgrade to Pro 💰
        </h1>

        <p className="text-center text-gray-500 mb-6">
          Pay ₹99 via UPI
        </p>

        {/* QR CODE */}
        <div className="flex justify-center mb-6">
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=yourupi@upi&pn=InvoicePro&am=99"
            alt="UPI QR"
          />
        </div>

        {/* UPI ID */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-500">UPI ID</p>
          <p className="font-bold text-lg">yourupi@upi</p>
        </div>

        {/* INSTRUCTION */}
        <p className="text-sm text-gray-500 text-center mb-6">
          After payment, click confirm below
        </p>

        {/* BUTTON */}
        <button
          onClick={handleConfirm}
          className="w-full bg-black text-white py-3 rounded-lg"
        >
          I Have Paid ✅
        </button>

      </div>
    </div>
  );
}