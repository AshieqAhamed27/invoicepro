import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

  const [logo, setLogo] = useState(null); // ✅ NEW
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [limitReached, setLimitReached] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ✅ LOGO UPLOAD FUNCTION
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
    setError('');
    setLimitReached(false);
    setLoading(true);

    try {
      const res = await api.post('/invoices', {
        ...form,
        logo // ✅ send logo
      });

      navigate(`/invoice/${res.data.invoice._id}`);
    } catch (err) {
      if (err.response?.data?.limitReached) {
        setLimitReached(true);
      } else {
        setError(err.response?.data?.message || 'Failed to create invoice.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      await api.put('/auth/upgrade');
      const updatedUser = { ...user, plan: 'pro' };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setLimitReached(false);
      alert('🎉 Upgraded to Pro!');
      window.location.reload();
    } catch {
      setError('Upgrade failed. Try again.');
    }
  };

  const previewAmount = form.amount
    ? `${form.currency === 'INR' ? '₹' : '$'}${Number(form.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    : '—';

  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">

        <h1 className="text-2xl font-bold mb-6">Create Invoice</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* FORM */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl space-y-4">

              <input name="clientName" placeholder="Client Name" onChange={handleChange} required />
              <input name="clientEmail" placeholder="Client Email" onChange={handleChange} required />
              <textarea name="serviceDescription" placeholder="Service" onChange={handleChange} required />
              <input name="amount" type="number" placeholder="Amount" onChange={handleChange} required />

              {/* ✅ LOGO INPUT */}
              <div>
                <label>Upload Logo</label>
                <input type="file" accept="image/*" onChange={handleLogoUpload} />
              </div>

              <button type="submit" className="bg-black text-white px-4 py-2 rounded">
                {loading ? 'Creating...' : 'Create Invoice'}
              </button>
            </form>
          </div>

          {/* PREVIEW */}
          <div className="bg-white p-6 rounded-xl">

            {/* ✅ SHOW LOGO */}
            {logo && (
              <div className="flex justify-center mb-4">
                <img src={logo} alt="Logo" className="h-16 object-contain" />
              </div>
            )}

            <h3 className="font-bold mb-2">Preview</h3>

            <p>{form.clientName || 'Client Name'}</p>
            <p>{form.clientEmail || 'Email'}</p>
            <p>{form.serviceDescription || 'Service'}</p>

            <h2 className="text-xl font-bold mt-4">{previewAmount}</h2>

          </div>

        </div>
      </main>
    </div>
  );
}