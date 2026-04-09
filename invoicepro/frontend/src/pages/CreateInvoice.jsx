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

  // ✅ NEW: multiple items
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

  // ✅ item handlers
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
      alert("Please fill all required fields");
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
        alert("Invoice creation failed");
      }

    } catch (err) {
      if (err.response?.data?.limitReached) {
        setLimitReached(true);
      } else {
        alert(err.response?.data?.message || "Error creating invoice");
      }
    }

    setLoading(false);
  };

  // ✅ calculations
  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const cgst = Number(form.cgst) || 0;
  const sgst = Number(form.sgst) || 0;
  const tax = (subtotal * (cgst + sgst)) / 100;
  const total = subtotal + tax;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="w-full max-w-md mx-auto px-4 py-6 bg-white mt-6 rounded-xl shadow">

        <h1 className="text-xl font-bold mb-4">Create Invoice</h1>

        <form onSubmit={handleSubmit} className="space-y-4">

          <input name="clientName" value={form.clientName} onChange={handleChange} placeholder="Client Name" className="w-full border p-3 rounded-lg" />

          <input name="clientEmail" value={form.clientEmail} onChange={handleChange} placeholder="Client Email" className="w-full border p-3 rounded-lg" />

          <textarea name="serviceDescription" value={form.serviceDescription} onChange={handleChange} placeholder="Description" className="w-full border p-3 rounded-lg" />

          {/* ITEMS */}
          {items.map((item, index) => (
            <div key={index} className="flex gap-2">
              <input
                placeholder="Item"
                value={item.name}
                onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                className="w-full border p-2 rounded"
              />
              <input
                type="number"
                placeholder="Price"
                value={item.price}
                onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                className="w-24 border p-2 rounded"
              />
            </div>
          ))}

          <button type="button" onClick={addItem} className="text-blue-600">
            + Add Item
          </button>

          <input name="gst" placeholder="GST Number" onChange={handleChange} className="w-full border p-3 rounded-lg" />
          <input name="cgst" type="number" placeholder="CGST %" onChange={handleChange} className="w-full border p-3 rounded-lg" />
          <input name="sgst" type="number" placeholder="SGST %" onChange={handleChange} className="w-full border p-3 rounded-lg" />

          <div className="bg-gray-100 p-3 rounded-lg">
            <p>Subtotal: ₹{subtotal}</p>
            <p>Tax: ₹{tax}</p>
            <h3 className="font-bold">Total: ₹{total}</h3>
          </div>

          <button className="w-full bg-black text-white py-3 rounded-lg">
            {loading ? "Creating..." : "Create"}
          </button>

        </form>

        {limitReached && (
          <div className="mt-4 bg-red-100 p-4 rounded">
            <p className="text-red-700 mb-2">Free plan limit reached</p>
            <button onClick={() => navigate('/payment')} className="w-full bg-yellow-500 py-3 rounded-lg">
              Upgrade 🚀
            </button>
          </div>
        )}

      </main>
    </div>
  );
}