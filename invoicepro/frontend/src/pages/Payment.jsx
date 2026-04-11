import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../utils/api';

export default function Payment() {
  const [file, setFile] = useState(null);

  useEffect(() => {
    alert('Use mobile for payment');
  }, []);

  const handleConfirm = async () => {
    if (!file) {
      alert('Upload screenshot');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('screenshot', file);

      await api.post('/payment/request', formData);

      alert('Request sent');
      window.location.href = '/dashboard';
    } catch (err) {
      alert('Payment request failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
      <Navbar />

      <main className="w-full max-w-md mx-auto px-4 py-8">

        <div className="bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-2xl shadow-xl p-6">

          <h1 className="text-2xl font-bold text-center mb-2">
            Upgrade to Pro 🚀
          </h1>

          <p className="text-gray-400 text-center mb-6">
            Scan QR and upload payment screenshot
          </p>

          {/* QR */}
          <div className="flex justify-center mb-6">
            <div className="bg-white p-4 rounded-2xl shadow-lg">
              <img
                className="w-52 h-52 object-contain"
                alt="UPI QR"
                src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=upi://pay?pa=ashieqahamed4@okicici&pn=InvoicePro&am=99&cu=INR"
              />
            </div>
          </div>

          {/* UPI DETAILS */}
          <div className="bg-gray-800/70 border border-gray-700 rounded-xl p-4 mb-6 text-sm">
            <p className="text-gray-400 mb-1">UPI ID</p>
            <p className="font-semibold text-white">
              ashieqahamed4@okicici
            </p>

            <p className="text-gray-400 mt-3 mb-1">Amount</p>
            <p className="font-semibold text-green-400">
              ₹99
            </p>
          </div>

          {/* FILE */}
          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-2">
              Upload Payment Screenshot
            </label>

            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full border border-gray-700 bg-gray-800 text-white p-3 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-yellow-500 file:text-black"
            />
          </div>

          {/* BUTTON */}
          <button
            onClick={handleConfirm}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-3 rounded-lg font-semibold transition"
          >
            Submit Payment
          </button>

        </div>

      </main>
    </div>
  );
}