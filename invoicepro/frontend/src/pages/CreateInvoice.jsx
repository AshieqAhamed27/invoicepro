import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import Navbar from '../components/Navbar';

const today = new Date().toISOString().split('T')[0];

export default function CreateInvoice() {
  const navigate = useNavigate();
  const user = getUser();

  const [form, setForm] = useState({
    clientName: '',
    clientEmail: '',
    serviceDescription: '',
    amount: '',
    currency: 'INR',
    date: today,
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
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post('/invoices', {
        ...form,
        logo,
      });

      navigate(`/invoice/${res.data.invoice._id}`);
    } catch {
      alert('Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const previewAmount = form.amount
    ? `${form.currency === 'INR' ? '₹' : '$'}${Number(form.amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
      })}`
    : '—';

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="max-w-4xl mx-auto p-6">

        <h1 className="text-2xl font-bold mb-6">Create Invoice</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* FORM */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow space-y-4">

            <form onSubmit={handleSubmit} className="space-y-4">

              <input
                name="clientName"
                placeholder="Client Name"
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-4 py-2"
              />

              <input
                name="clientEmail"
                placeholder="Client Email"
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-4 py-2"
              />

              <textarea
                name="serviceDescription"
                placeholder="Service Description"
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-4 py-2"
              />

              <input
                name="amount"
                type="number"
                placeholder="Amount"
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-4 py-2"
              />

              {/* LOGO */}
              <div>
                <label className="text-sm text-gray-600">Upload Logo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="w-full mt-1"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800"
              >
                {loading ? 'Creating...' : 'Create Invoice'}
              </button>

            </form>
          </div>

          {/* PREVIEW */}
          <div className="bg-white p-6 rounded-xl shadow">

            {logo && (
              <div className="flex justify-center mb-4">
                <img src={logo} alt="logo" className="h-16" />
              </div>
            )}

            <h3 className="font-bold mb-3">Preview</h3>

            <p>{form.clientName || 'Client Name'}</p>
            <p className="text-sm text-gray-500">
              {form.clientEmail || 'Email'}
            </p>

            <p className="mt-3">
              {form.serviceDescription || 'Service Description'}
            </p>

            <h2 className="text-xl font-bold mt-4">
              {previewAmount}
            </h2>

          </div>

        </div>
      </main>
    </div>
  );
}