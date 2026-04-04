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
      console.error(err);
      alert('Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="max-w-3xl mx-auto p-6 bg-white mt-6 rounded shadow">

        <h1 className="text-xl font-bold mb-4">Create Invoice</h1>

        <form onSubmit={handleSubmit} className="space-y-4">

          <input name="clientName" placeholder="Client Name" onChange={handleChange} required className="w-full border p-2 rounded" />

          <input name="clientEmail" placeholder="Client Email" onChange={handleChange} required className="w-full border p-2 rounded" />

          <textarea name="serviceDescription" placeholder="Service Description" onChange={handleChange} required className="w-full border p-2 rounded" />

          <input name="amount" type="number" placeholder="Amount" onChange={handleChange} required className="w-full border p-2 rounded" />

          <input type="file" accept="image/*" onChange={handleLogoUpload} />

          <button className="bg-black text-white px-4 py-2 rounded">
            {loading ? "Creating..." : "Create Invoice"}
          </button>

        </form>

      </main>
    </div>
  );
}