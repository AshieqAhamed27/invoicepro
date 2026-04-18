import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Navbar from '../components/Navbar';

export default function CreateInvoice() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    clientName: '',
    clientEmail: '',
    serviceDescription: '',
    gst: '',
    cgst: '',
    sgst: '',
    upiId: '',
    dueDate: ''
  });

  const [items, setItems] = useState([{ name: '', price: '' }]);
  const [loading, setLoading] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      setForm(prev => ({
        ...prev,
        gst: user.gstNumber || '',
        upiId: user.upiId || ''
      }));
    }
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleItemChange = (i, field, value) => {
    const updated = [...items];
    updated[i][field] = value;
    setItems(updated);
  };

  const addItem = () => setItems([...items, { name: '', price: '' }]);

  const removeItem = (i) => {
    if (items.length === 1) return alert('At least one item required');
    setItems(items.filter((_, idx) => idx !== i));
  };

  const subtotal = items.reduce((s, i) => s + Number(i.price || 0), 0);
  const tax = (subtotal * ((+form.cgst || 0) + (+form.sgst || 0))) / 100;
  const total = subtotal + tax;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.clientName || !form.clientEmail || subtotal <= 0) {
      alert('Fill required fields');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/invoices', {
        ...form,
        items,
        amount: total
      });

      navigate(`/invoice/${res.data.invoice._id}`);
    } catch (err) {
      if (err.response?.data?.limitReached) {
        setLimitReached(true);
      } else {
        alert('Error creating invoice');
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <main className="container-custom py-10 max-w-3xl">

        <h1 className="text-3xl font-semibold mb-8">
          Create Invoice
        </h1>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* CLIENT */}
          <div className="card">
            <h2 className="mb-4">Client Details</h2>

            <div className="space-y-3">
              <input
                name="clientName"
                value={form.clientName}
                onChange={handleChange}
                placeholder="Client Name"
                className="input"
              />

              <input
                name="clientEmail"
                value={form.clientEmail}
                onChange={handleChange}
                placeholder="Client Email"
                className="input"
              />
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="card">
            <h2 className="mb-4">Service</h2>

            <textarea
              name="serviceDescription"
              value={form.serviceDescription}
              onChange={handleChange}
              placeholder="Describe service..."
              className="input"
            />
          </div>

          {/* ITEMS */}
          <div className="card">
            <h2 className="mb-4">Items</h2>

            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2">

                  <input
                    placeholder="Item"
                    value={item.name}
                    onChange={(e) =>
                      handleItemChange(i, 'name', e.target.value)
                    }
                    className="input flex-1"
                  />

                  <input
                    type="number"
                    placeholder="₹"
                    value={item.price}
                    onChange={(e) =>
                      handleItemChange(i, 'price', e.target.value)
                    }
                    className="input w-24"
                  />

                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="btn btn-dark"
                  >
                    ✕
                  </button>

                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addItem}
              className="mt-4 text-blue-400 text-sm"
            >
              + Add Item
            </button>
          </div>

          {/* PAYMENT */}
          <div className="card">
            <h2 className="mb-4">Payment & Tax</h2>

            <div className="grid sm:grid-cols-2 gap-3">

              <input
                type="date"
                name="dueDate"
                value={form.dueDate}
                onChange={handleChange}
                className="input"
              />

              <input
                name="upiId"
                value={form.upiId}
                onChange={handleChange}
                placeholder="UPI ID"
                className="input"
              />

              <input
                name="gst"
                value={form.gst}
                onChange={handleChange}
                placeholder="GST"
                className="input"
              />

              <input
                name="cgst"
                type="number"
                value={form.cgst}
                onChange={handleChange}
                placeholder="CGST %"
                className="input"
              />

              <input
                name="sgst"
                type="number"
                value={form.sgst}
                onChange={handleChange}
                placeholder="SGST %"
                className="input"
              />

            </div>
          </div>

          {/* TOTAL */}
          <div className="card">
            <p className="text-sm text-gray-400">Summary</p>

            <div className="mt-2 space-y-1 text-sm">
              <p>Subtotal: ₹{subtotal}</p>
              <p>Tax: ₹{tax}</p>
              <p className="text-green-400 font-semibold text-lg">
                Total: ₹{total}
              </p>
            </div>
          </div>

          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? 'Creating...' : 'Create Invoice'}
          </button>

        </form>

        {/* LIMIT */}
        {limitReached && (
          <div className="mt-6 card border-red-500">
            <p className="text-red-400 mb-3">
              Free limit reached
            </p>
            <button
              onClick={() => navigate('/payment')}
              className="btn btn-primary w-full"
            >
              Upgrade 🚀
            </button>
          </div>
        )}

      </main>
    </div>
  );
}