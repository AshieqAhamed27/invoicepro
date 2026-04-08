import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Navbar from '../components/Navbar';

export default function CreateInvoice() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    clientName: '',
    clientEmail: '',
    serviceDescription: '',
    amount: '',
  });

  const [loading, setLoading] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  // ✅ FIXED handleChange
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ FRONTEND VALIDATION (IMPORTANT)
    if (!form.clientName || !form.clientEmail || !form.amount) {
      alert("Please fill all required fields");
      return;
    }

    console.log("FORM DATA:", form); // 🔥 DEBUG

    setLoading(true);

    try {
      const res = await api.post('/invoices', form);

      if (res.data && res.data.invoice && res.data.invoice._id) {
        navigate(`/invoice/${res.data.invoice._id}`);
      } else {
        alert("Invoice creation failed");
      }

    } catch (err) {
      console.log("ERROR:", err);

      if (err.response && err.response.data && err.response.data.limitReached) {
        setLimitReached(true);
      } else {
        alert(
          (err.response && err.response.data && err.response.data.message) ||
          "Error creating invoice"
        );
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="w-full max-w-md mx-auto px-4 py-6 bg-white mt-6 rounded-xl shadow">

        <h1 className="text-xl font-bold mb-4">Create Invoice</h1>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* CLIENT NAME */}
          <input
            name="clientName"
            value={form.clientName}
            onChange={handleChange}
            placeholder="Client Name"
            required
            className="w-full border p-3 rounded-lg"
          />

          {/* EMAIL */}
          <input
            name="clientEmail"
            value={form.clientEmail}
            onChange={handleChange}
            placeholder="Client Email"
            required
            className="w-full border p-3 rounded-lg"
          />

          {/* DESCRIPTION */}
          <textarea
            name="serviceDescription"
            value={form.serviceDescription}
            onChange={handleChange}
            placeholder="Description"
            className="w-full border p-3 rounded-lg"
          />

          {/* AMOUNT */}
          <input
            name="amount"
            type="number"
            value={form.amount}
            onChange={handleChange}
            placeholder="Amount"
            required
            className="w-full border p-3 rounded-lg"
          />

          {/* BUTTON */}
          <button className="w-full bg-black text-white py-3 rounded-lg">
            {loading ? "Creating..." : "Create"}
          </button>

        </form>

        {/* LIMIT MESSAGE */}
        {limitReached && (
          <div className="mt-4 bg-red-100 p-4 rounded">
            <p className="text-red-700 mb-2">
              Free plan limit reached (2 invoices)
            </p>

            <button
              onClick={() => navigate('/payment')}
              className="w-full bg-yellow-500 py-3 rounded-lg"
            >
              Upgrade 🚀
            </button>
          </div>
        )}

      </main>
    </div>
  );
}