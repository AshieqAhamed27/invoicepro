import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Navbar from '../components/Navbar';

const formatCurrency = (amount) =>
  `Rs. ${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

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

  const user = getUser() || {};

  useEffect(() => {
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

  const addItem = () => {
    setItems([...items, { name: '', price: '' }]);
  };

  const removeItem = (i) => {
    if (items.length === 1) {
      alert('At least one item required');
      return;
    }
    setItems(items.filter((_, idx) => idx !== i));
  };

  const subtotal = items.reduce((s, i) => s + Number(i.price || 0), 0);
  const taxRate = (+form.cgst || 0) + (+form.sgst || 0);
  const tax = (subtotal * taxRate) / 100;
  const total = subtotal + tax;

  const filledItems = items.filter((item) => item.name.trim() || Number(item.price || 0) > 0);
  const itemSummary = filledItems
    .map((item) => item.name.trim())
    .filter(Boolean)
    .join(', ');

  const smartDescription = itemSummary
    ? `Professional services delivered for ${form.clientName || 'the client'}: ${itemSummary}. Includes preparation, execution, review, and final handover.`
    : `Professional services delivered for ${form.clientName || 'the client'}, including planning, execution, review, and final handover.`;

  const suggestedDueDate = (() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 10);
  })();

  const aiSuggestions = [
    !form.clientName && 'Add the client name so the invoice feels personal and complete.',
    !form.clientEmail && 'Add the client email before creating the invoice.',
    !form.serviceDescription && 'Use a clearer service description to reduce payment questions.',
    !form.dueDate && 'Add a due date so AI reminders can track payment risk.',
    !form.upiId && 'Add a UPI ID to make payment frictionless.',
    subtotal <= 0 && 'Add at least one priced item before sending.',
    taxRate > 28 && 'Tax rate looks unusually high. Double-check CGST and SGST.',
    total > 0 && total < 500 && 'Small invoice detected. Consider adding details so the value is clear.',
    total >= 5000 && 'High-value invoice detected. A short note about deliverables can help clients approve faster.'
  ].filter(Boolean);

  const applySmartDescription = () => {
    setForm((prev) => ({
      ...prev,
      serviceDescription: smartDescription
    }));
  };

  const applySmartDueDate = () => {
    setForm((prev) => ({
      ...prev,
      dueDate: suggestedDueDate
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.clientName || !form.clientEmail || subtotal <= 0) {
      alert('Fill required fields');
      return;
    }

    const finalUpi = form.upiId || user?.upiId;

    if (!finalUpi) {
      alert("Please add UPI ID in Settings or here");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/invoices', {
        ...form,
        upiId: finalUpi,
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
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10">
        <div className="reveal mb-8">
          <p className="mb-2 text-sm font-semibold text-yellow-300">New invoice</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">
            Create Invoice
          </h1>
          <p className="mt-2 max-w-2xl text-zinc-400">
            Add client details, itemize the work, and collect payment through your UPI ID.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="reveal reveal-delay-1 surface overflow-hidden">
            <section className="border-b border-white/10 p-5">
              <div className="mb-4">
                <h2 className="text-lg">Client Details</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Who should receive this invoice?
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  name="clientName"
                  value={form.clientName}
                  onChange={handleChange}
                  placeholder="Client name"
                  className="input"
                />

                <input
                  name="clientEmail"
                  type="email"
                  value={form.clientEmail}
                  onChange={handleChange}
                  placeholder="Client email"
                  className="input"
                />
              </div>
            </section>

            <section className="border-b border-white/10 p-5">
              <div className="mb-4">
                <h2 className="text-lg">Service</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Keep it short and clear for the client.
                </p>
              </div>

              <textarea
                name="serviceDescription"
                value={form.serviceDescription}
                onChange={handleChange}
                placeholder="Describe the work delivered..."
                rows="4"
                className="input resize-y"
              />
            </section>

            <section className="border-b border-white/10 p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg">Items</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Add each billable line with its price.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addItem}
                  className="btn btn-secondary w-full sm:w-auto"
                >
                  Add Item
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, i) => (
                  <div key={i} className="grid gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-[1fr_140px_auto]">
                    <input
                      placeholder="Item or service"
                      value={item.name}
                      onChange={(e) =>
                        handleItemChange(i, 'name', e.target.value)
                      }
                      className="input"
                    />

                    <input
                      type="number"
                      min="0"
                      placeholder="Amount"
                      value={item.price}
                      onChange={(e) =>
                        handleItemChange(i, 'price', e.target.value)
                      }
                      className="input"
                    />

                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="btn btn-dark px-3"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="p-5">
              <div className="mb-4">
                <h2 className="text-lg">Payment and Tax</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Use saved business details or update them for this invoice.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
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
                  placeholder="GST number"
                  className="input"
                />

                <input
                  name="cgst"
                  type="number"
                  min="0"
                  value={form.cgst}
                  onChange={handleChange}
                  placeholder="CGST %"
                  className="input"
                />

                <input
                  name="sgst"
                  type="number"
                  min="0"
                  value={form.sgst}
                  onChange={handleChange}
                  placeholder="SGST %"
                  className="input"
                />
              </div>
            </section>
          </div>

          <aside className="reveal reveal-delay-2 h-fit rounded-lg border border-white/10 bg-zinc-950/85 p-5 shadow-xl shadow-black/20 lg:sticky lg:top-24">
            <p className="text-sm font-semibold text-zinc-400">Summary</p>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Subtotal</span>
                <span className="font-semibold text-white">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Tax ({taxRate}%)</span>
                <span className="font-semibold text-white">{formatCurrency(tax)}</span>
              </div>
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-end justify-between">
                  <span className="text-zinc-400">Total</span>
                  <span className="text-2xl font-bold text-emerald-300">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-yellow-300/20 bg-yellow-300/10 p-4">
              <p className="mb-2 text-sm font-semibold text-yellow-100">
                AI Invoice Coach
              </p>
              <p className="mb-4 text-sm text-yellow-100/75">
                Smart checks before you send.
              </p>

              <div className="mb-4 grid gap-2">
                {(aiSuggestions.length ? aiSuggestions : ['Looks ready. Clear details, payment info, and amount are in place.']).slice(0, 4).map((suggestion) => (
                  <p key={suggestion} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-200">
                    {suggestion}
                  </p>
                ))}
              </div>

              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={applySmartDescription}
                  className="btn btn-secondary w-full"
                >
                  Write Description
                </button>

                {!form.dueDate && (
                  <button
                    type="button"
                    onClick={applySmartDueDate}
                    className="btn btn-secondary w-full"
                  >
                    Set 7-Day Due Date
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary mt-6 w-full"
            >
              {loading ? 'Creating...' : 'Create Invoice'}
            </button>

            {limitReached && (
              <div className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 p-4">
                <p className="mb-3 text-sm text-red-200">
                  Free invoice limit reached.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/payment')}
                  className="btn btn-primary w-full"
                >
                  Upgrade
                </button>
              </div>
            )}
          </aside>
        </form>
      </main>
    </div>
  );
}
