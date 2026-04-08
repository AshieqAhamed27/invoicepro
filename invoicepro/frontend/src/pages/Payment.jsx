import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../utils/api';

export default function Payment() {
  const [file, setFile] = useState(null);

  useEffect(() => {
    alert("Use mobile for payment");
  }, []);

  const handleConfirm = async () => {
    if (!file) return alert("Upload screenshot");

    const formData = new FormData();
    formData.append('screenshot', file);

    await api.post('/payment/request', formData);

    alert("Request sent");
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <div className="w-full max-w-md mx-auto mt-6 px-4 bg-white p-6 rounded-xl shadow">

        <h1 className="text-xl font-bold text-center mb-4">
          Upgrade to Pro 🚀
        </h1>

        <div className="flex justify-center mb-6">
          <img
            className="w-48"
            src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=upi://pay?pa=ashieqahamed4@okicici&pn=InvoicePro&am=99&cu=INR"
          />
        </div>

        <input type="file" onChange={(e) => setFile(e.target.files[0])} />

        <button
          onClick={handleConfirm}
          className="w-full bg-black text-white py-3 mt-4 rounded-lg"
        >
          Submit Payment
        </button>

      </div>
    </div>
  );
}