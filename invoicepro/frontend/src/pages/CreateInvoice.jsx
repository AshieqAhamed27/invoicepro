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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post('/invoices', form);
      navigate(`/invoice/${res.data.invoice._id}`);
    } catch (err) {
      if (err.response && err.response.data.limitReached) {
        setLimitReached(true);
      } else {
        alert("Error");
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

          <input
            placeholder="Client Name"
            onChange={(e) => setForm({ ...form, clientName: e.target.value })}
            className="w-full border p-3 rounded-lg"
          />

          <input
            placeholder="Client Email"
            onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
            className="w-full border p-3 rounded-lg"
          />

          <textarea
            placeholder="Description"
            onChange={(e) => setForm({ ...form, serviceDescription: e.target.value })}
            className="w-full border p-3 rounded-lg"
          />

          <input
            type="number"
            placeholder="Amount"
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="w-full border p-3 rounded-lg"
          />

          <button className="w-full bg-black text-white py-3 rounded-lg">
            {loading ? "Creating..." : "Create"}
          </button>

        </form>

        {limitReached && (
          <button
            onClick={() => navigate('/payment')}
            className="mt-4 w-full bg-yellow-500 py-3 rounded-lg"
          >
            Upgrade 🚀
          </button>
        )}

      </main>
    </div>
  );
}