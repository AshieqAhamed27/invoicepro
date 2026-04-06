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
    currency: 'INR',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: '',
  });

  const [logo, setLogo] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ FIX ADDED
  const [limitReached, setLimitReached] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogo(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setLimitReached(false);

    try {
      const res = await api.post('/invoices', {
        ...form,
        logo,
      });

      const newInvoice = res.data.invoice;

      if (!newInvoice || !newInvoice._id) {
        alert("Invoice creation failed");
        return;
      }

      navigate(`/invoice/${newInvoice._id}`);
    } catch (err) {

      console.log("FULL ERROR:", err);

      // ✅ LIMIT REACHED
      if (
        err.response &&
        err.response.data &&
        err.response.data.limitReached
      ) {
        setLimitReached(true);
        setLoading(false);
        return;
      }

      // ✅ SESSION EXPIRED
      if (err.response && err.response.status === 401) {
        alert("Session expired. Please login again.");
        setLoading(false);
        return;
      }

      // ❌ OTHER ERROR
      setError("Failed to create invoice");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="max-w-3xl mx-auto p-6 bg-white mt-6 rounded shadow">

        <h1 className="text-xl font-bold mb-4">Create Invoice</h1>

        <form onSubmit={handleSubmit} className="space-y-4">

          <input
            name="clientName"
            placeholder="Client Name"
            onChange={handleChange}
            required
            className="w-full border p-2 rounded"
          />

          <input
            name="clientEmail"
            placeholder="Client Email"
            onChange={handleChange}
            required
            className="w-full border p-2 rounded"
          />

          <textarea
            name="serviceDescription"
            placeholder="Service Description"
            onChange={handleChange}
            required
            className="w-full border p-2 rounded"
          />

          <input
            name="amount"
            type="number"
            placeholder="Amount"
            onChange={handleChange}
            required
            className="w-full border p-2 rounded"
          />

          <input type="file" accept="image/*" onChange={handleLogoUpload} />

          <button className="bg-black text-white px-4 py-2 rounded w-full">
            {loading ? "Creating..." : "Create Invoice"}
          </button>

        </form>

        {/* ❌ ERROR MESSAGE */}
        {error && (
          <p className="text-red-500 mt-4">{error}</p>
        )}

        {/* 🚀 LIMIT REACHED UI */}
        {limitReached && (
          <div className="bg-red-100 text-red-700 p-4 rounded mt-4">
            <p>Free limit reached (2 invoices)</p>

            <button
              onClick={() => navigate('/payment')}
              className="mt-2 bg-black text-white px-4 py-2 rounded"
            >
              Upgrade to Pro 🚀
            </button>
          </div>
        )}

      </main>
    </div>
  );
}