import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../utils/api';

export default function Payment() {

  const handleConfirm = async () => {

    useEffect(() => {
      const isMobile = /iPhone|Android/i.test(navigator.userAgent);

      if (!isMobile) {
        alert("⚠️ Please use mobile to scan QR or complete UPI payment.");
      }
    }, []);

    const confirmPayment = window.confirm(
      "Only click this AFTER completing payment of ₹99.\n\nDid you pay?"
    );

    if (!confirmPayment) return;

    try {
      await api.post('/payment/request');

      alert("✅ Request sent! We will verify and upgrade you soon.");

      window.location.href = '/dashboard';

    } catch (err) {
      console.log(err);
      alert("Error sending request");
    }
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

        {/* ✅ QR WITH CORRECT ₹99 AUTO FILL */}
        <div className="flex justify-center mb-6">
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=upi://pay?pa=ashieqahamed4@okicici&pn=InvoicePro&am=99.00&cu=INR"
            alt="UPI QR"
          />
          <p className="text-center text-sm text-orange-600 bg-orange-100 p-3 rounded mb-4">
            ⚠️ QR scan works only on mobile devices.
            Please open this page on your phone or scan using another device.
          </p>
        </div>

        {/* ✅ UPI BUTTON (MOBILE ONLY) */}
        <a
          href="upi://pay?pa=ashieqahamed4@okicici&pn=InvoicePro&am=99.00&cu=INR"
          className="block text-center bg-green-600 text-white py-3 rounded-lg mb-4 hover:bg-green-700"
        >
          Pay ₹99 via UPI 📱
        </a>

        {/* UPI ID */}
        <div className="text-center mb-4">
          <p className="text-gray-500 text-sm">Pay using UPI</p>
          <p className="font-bold text-lg">ashieqahamed4@okicici</p>
        </div>

        {/* NOTE */}
        <p className="text-center text-xs text-gray-400 mb-6">
          If amount is not auto-filled, please enter ₹99 manually
        </p>

        {/* CONFIRM BUTTON */}
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