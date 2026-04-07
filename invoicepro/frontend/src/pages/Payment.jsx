import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../utils/api';

export default function Payment() {

  const [file, setFile] = useState(null);

  useEffect(() => {
    alert("⚠️ Use mobile for QR payment");
  }, []);

  const handleConfirm = async () => {

    if (!file) {
      alert("Upload payment screenshot first");
      return;
    }

    const confirmPayment = window.confirm("Did you complete payment?");

    if (!confirmPayment) return;

    try {
      const formData = new FormData();
      formData.append('screenshot', file);

      await api.post('/payment/request', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert("✅ Request sent with screenshot!");

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

        <h1 className="text-2xl font-bold text-center mb-4">
          Upgrade to Pro 🚀
        </h1>

        <div className="flex justify-center mb-6">
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=upi://pay?pa=ashieqahamed4@okicici&pn=InvoicePro&am=99.00&cu=INR"
            alt="QR"
          />
        </div>

        {/* FILE UPLOAD */}
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="mb-4"
        />

        <button
          onClick={handleConfirm}
          className="w-full bg-black text-white py-3 rounded"
        >
          Submit Payment Proof ✅
        </button>

      </div>
    </div>
  );
}