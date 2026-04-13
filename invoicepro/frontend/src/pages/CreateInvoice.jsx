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
    gst: '',
    cgst: '',
    sgst: '',
    upiId: '',
    dueDate: ''
  });

  const [items, setItems] = useState([
    { name: '', price: '' }
  ]);

  const [loading, setLoading] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        name: '',
        price: ''
      }
    ]);
  };

  const removeItem = (index) => {
    if (items.length === 1) {
      alert('At least one item is required');
      return;
    }

    setItems((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  const subtotal = items.reduce(
    (sum, item) =>
      sum + Number(item.price || 0),
    0
  );

  const cgst = Number(form.cgst) || 0;
  const sgst = Number(form.sgst) || 0;

  const tax =
    (subtotal * (cgst + sgst)) / 100;

  const total = subtotal + tax;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.clientName ||
      !form.clientEmail ||
      subtotal <= 0
    ) {
      alert(
        'Please fill all required fields'
      );
      return;
    }

    setLoading(true);

    try {
      const res = await api.post(
        '/invoices',
        {
          ...form,
          items,
          amount: total
        }
      );

      if (
        res.data?.invoice?._id
      ) {
        navigate(
          `/invoice/${res.data.invoice._id}`
        );
      } else {
        alert(
          'Invoice creation failed'
        );
      }

    } catch (err) {
      console.error(
        'CREATE INVOICE ERROR:',
        err.response?.data || err
      );

      if (
        err.response?.data
          ?.limitReached
      ) {
        setLimitReached(true);
      } else {
        alert(
          err.response?.data
            ?.message ||
            'Error creating invoice'
        );
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
      <Navbar />

      <main className="w-full max-w-2xl mx-auto px-4 py-8">

        <div className="bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-2xl shadow-xl p-6 md:p-8">

          <h1 className="text-2xl font-bold mb-6">
            Create Invoice
          </h1>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            <input
              name="clientName"
              value={form.clientName}
              onChange={handleChange}
              placeholder="Client Name"
              className="w-full bg-gray-800 border border-gray-700 p-3 rounded-lg outline-none"
            />

            <input
              name="clientEmail"
              value={form.clientEmail}
              onChange={handleChange}
              placeholder="Client Email"
              className="w-full bg-gray-800 border border-gray-700 p-3 rounded-lg outline-none"
            />

            <textarea
              name="serviceDescription"
              value={
                form.serviceDescription
              }
              onChange={handleChange}
              placeholder="Description"
              className="w-full bg-gray-800 border border-gray-700 p-3 rounded-lg outline-none"
            />

            {/* ITEMS */}
            <div>
              <h2 className="font-semibold mb-3">
                Items
              </h2>

              <div className="space-y-3">
                {items.map(
                  (item, index) => (
                    <div
                      key={index}
                      className="flex gap-2"
                    >
                      <input
                        placeholder="Item Name"
                        value={item.name}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            'name',
                            e.target.value
                          )
                        }
                        className="w-full bg-gray-800 border border-gray-700 p-3 rounded-lg"
                      />

                      <input
                        type="number"
                        placeholder="Price"
                        value={item.price}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            'price',
                            e.target.value
                          )
                        }
                        className="w-32 bg-gray-800 border border-gray-700 p-3 rounded-lg"
                      />

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          removeItem(index);
                        }}
                        className="px-3 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                      >
                        ✕
                      </button>
                    </div>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={addItem}
                className="mt-3 text-blue-400 hover:underline"
              >
                + Add Item
              </button>
            </div>

            {/* DUE DATE */}
            <input
              type="date"
              name="dueDate"
              value={form.dueDate}
              onChange={handleChange}
              className="w-full bg-gray-800 border border-gray-700 p-3 rounded-lg"
            />

            <input
              name="gst"
              value={form.gst}
              onChange={handleChange}
              placeholder="GST Number (optional)"
              className="w-full bg-gray-800 border border-gray-700 p-3 rounded-lg"
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                name="cgst"
                type="number"
                value={form.cgst}
                onChange={handleChange}
                placeholder="CGST %"
                className="w-full bg-gray-800 border border-gray-700 p-3 rounded-lg"
              />

              <input
                name="sgst"
                type="number"
                value={form.sgst}
                onChange={handleChange}
                placeholder="SGST %"
                className="w-full bg-gray-800 border border-gray-700 p-3 rounded-lg"
              />
            </div>

            <input
              name="upiId"
              value={form.upiId}
              onChange={handleChange}
              placeholder="Your UPI ID (for QR payment)"
              className="w-full bg-gray-800 border border-gray-700 p-3 rounded-lg"
            />

            {/* TOTAL */}
            <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl">
              <p>
                Subtotal: ₹
                {subtotal.toLocaleString(
                  'en-IN'
                )}
              </p>

              <p>
                Tax: ₹
                {tax.toLocaleString(
                  'en-IN'
                )}
              </p>

              <h3 className="font-bold text-lg text-green-400 mt-2">
                Total: ₹
                {total.toLocaleString(
                  'en-IN'
                )}
              </h3>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-3 rounded-xl font-semibold disabled:opacity-50"
            >
              {loading
                ? 'Creating...'
                : 'Create Invoice'}
            </button>

          </form>

          {limitReached && (
            <div className="mt-5 bg-red-500/20 border border-red-500 p-4 rounded-xl">
              <p className="mb-3 text-red-300">
                Free plan limit reached
              </p>

              <button
                onClick={() =>
                  navigate('/payment')
                }
                className="w-full bg-yellow-500 text-black py-3 rounded-lg font-semibold"
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