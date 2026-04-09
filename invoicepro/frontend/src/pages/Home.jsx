import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center text-center px-6">

      {/* TITLE */}
      <h1 className="text-3xl md:text-5xl font-bold mb-4">
        Create Professional Invoices in Seconds
      </h1>

      {/* SUBTITLE */}
      <p className="text-gray-600 mb-6 max-w-md">
        Free, fast, and easy invoice generator for freelancers & small businesses
      </p>

      {/* BUTTONS */}
      <div className="flex gap-4 mb-10">
        <button
          onClick={() => navigate('/create-invoice')}
          className="bg-black text-white px-6 py-3 rounded-lg"
        >
          Create Invoice
        </button>

        <button
          onClick={() => navigate('/login')}
          className="border px-6 py-3 rounded-lg"
        >
          Login
        </button>
      </div>

      {/* PREVIEW */}
      <div className="bg-white p-6 rounded-xl shadow w-full max-w-md">
        <h2 className="font-bold mb-2">Sample Invoice</h2>
        <p>Client: John</p>
        <p>Service: Website Design</p>
        <p className="font-bold text-green-600">₹1500</p>
      </div>

    </div>
  );
}