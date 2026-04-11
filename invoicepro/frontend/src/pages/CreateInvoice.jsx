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
    gst: '',
    cgst: '',
    sgst: ''
  });

  const [items, setItems] = useState([{ name: '', price: '' }]);

  const [loading, setLoading] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const addItem = () => {
    setItems([...items, { name: '', price: '' }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.clientName || !form.clientEmail) {
      alert('Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/invoices', {
        ...form,
        items,
        amount: total
      });

      if (res.data?.invoice?._id) {
        navigate(`/invoice/${res.data.invoice._id}`);
      } else {
        alert('Invoice creation failed');
      }

    } catch (err) {
      if (err.response?.data?.limitReached) {
        setLimitReached(true);
      } else {
        alert(err.response?.data?.message || 'Error creating invoice');
      }
    }

    setLoading(false);
  };

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.price || 0),
    0
  );

  const cgst = Number(form.cgst) || 0;
  const sgst = Number(form.sgst) || 0;
  const tax = (subtotal * (cgst + sgst)) / 100;
  const total = subtotal + tax;

  const inputStyle =
    'w-full border border-gray-700 bg-gray-800 text-white p-3 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500';

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
      <Navbar />

      <main className="w-full max-w-2xl mx-auto px-4 py-6">

        <div className="bg-gray-900/80 backdrop-blur-md border border-gray-700 mt-6 rounded-2xl shadow-xl p-6">

          <h1 className="text-2xl font-bold mb-6">
            Create Invoice
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* CLIENT DETAILS */}
            <input
              name="clientName"
              value={form.clientName}
              onChange={handleChange}
              placeholder="Client Name"
              className={inputStyle}
            />

            <input
              name="clientEmail"
              value={form.clientEmail}
              onChange={handleChange}
              placeholder="Client Email"
              className={inputStyle}
            />

            <textarea
              name="serviceDescription"
              value={form.serviceDescription}
              onChange={handleChange}
              placeholder="Description"
              rows="3"
              className={inputStyle}
            />

            {/* ITEMS */}
            <div>
              <p className="font-semibold mb-2 text-gray-300">
                Invoice Items
              </p>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row gap-3"
                  >
                    <input
                      placeholder="Item Name"
                      value={item.name}
                      onChange={(e) =>
                        handleItemChange(index, 'name', e.target.value)
                      }
                      className={inputStyle}
                    />

                    <input
                      type="number"
                      placeholder="Price"
                      value={item.price}
                      onChange={(e) =>
                        handleItemChange(index, 'price', e.target.value)
                      }
                      className="sm:w-40 border border-gray-700 bg-gray-800 text-white p-3 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addItem}
                className="mt-3 text-yellow-400 hover:text-yellow-300 font-medium"
              >
                + Add Item
              </button>
            </div>

            {/* TAX */}
            <input
              name="gst"
              value={form.gst}
              onChange={handleChange}
              placeholder="GST Number"
              className={inputStyle}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                name="cgst"
                type="number"
                value={form.cgst}
                onChange={handleChange}
                placeholder="CGST %"
                className={inputStyle}
              />

              <input
                name="sgst"
                type="number"
                value={form.sgst}
                onChange={handleChange}
                placeholder="SGST %"
                className={inputStyle}
              />
            </div>

            {/* TOTAL */}
            <div className="bg-gray-800/70 border border-gray-700 rounded-xl p-4">
              <p className="text-gray-300">Subtotal: ₹{subtotal}</p>
              <p className="text-gray-300">Tax: ₹{tax}</p>
              <h3 className="text-xl font-bold text-green-400 mt-2">
                Total: ₹{total}
              </h3>
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-3 rounded-lg font-semibold transition"
            >
              {loading ? 'Creating...' : 'Create Invoice'}
            </button>

          </form>

          {/* LIMIT */}
          {limitReached && (
            <div className="mt-6 bg-red-500/10 border border-red-500 p-4 rounded-xl">
              <p className="text-red-400 mb-3">
                Free plan limit reached
              </p>

              <button
                onClick={() => navigate('/payment')}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-3 rounded-lg font-semibold"
              >
                Upgrade 🚀
              </button>
            </div>
          )}

        </div>

      </main>
    </div>
  );
}