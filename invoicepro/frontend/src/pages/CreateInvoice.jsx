import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import { getUser } from '../utils/auth';
import { trackEvent } from '../utils/analytics';

const currencyOptions = [
  { code: 'INR', symbol: '₹', label: 'INR (₹) - Indian Rupee' },
  { code: 'USD', symbol: '$', label: 'USD ($) - US Dollar' },
  { code: 'EUR', symbol: '€', label: 'EUR (€) - Euro' },
  { code: 'GBP', symbol: '£', label: 'GBP (£) - British Pound' },
  { code: 'AED', symbol: 'AED', label: 'AED - UAE Dirham' },
  { code: 'SGD', symbol: 'S$', label: 'SGD - Singapore Dollar' }
];

export default function CreateInvoice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = getUser() || {};

  // Form State
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [upiId, setUpiId] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [items, setItems] = useState([{ name: '', price: '' }]);
  const [notes, setNotes] = useState('');

  // Optional Tax State
  const [showTax, setShowTax] = useState(false);
  const [gstRate, setGstRate] = useState('');

  // AI Prompt State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [copied, setCopied] = useState(false);

  // Initialize with user profile settings
  useEffect(() => {
    if (user.upiId) {
      setUpiId(user.upiId);
    }
  }, []);

  // Handle Quick Date Selection
  const setQuickDueDays = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDueDate(d.toISOString().slice(0, 10));
  };

  // Add / Remove Item
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const addItem = () => {
    setItems([...items, { name: '', price: '' }]);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculate Subtotal & Total
  const subtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const taxPercent = showTax ? (Number(gstRate) || 0) : 0;
  const taxAmount = (subtotal * taxPercent) / 100;
  const total = subtotal + taxAmount;

  // AI Auto-Fill Function
  const handleAiAutoFill = async (e) => {
    e?.preventDefault();
    if (!aiPrompt.trim()) {
      alert('Please enter a brief description (e.g. Website design for Rahul, ₹15,000, due in 7 days)');
      return;
    }

    try {
      setAiLoading(true);
      const res = await api.post('/ai/quick-invoice', { text: aiPrompt });
      const draft = res.data?.draft;

      if (draft) {
        if (draft.clientName) setClientName(draft.clientName);
        if (draft.clientEmail) setClientEmail(draft.clientEmail);
        if (draft.dueDate) setDueDate(draft.dueDate.slice(0, 10));
        if (draft.upiId) setUpiId(draft.upiId);
        if (draft.notes) setNotes(draft.notes);

        if (Array.isArray(draft.items) && draft.items.length > 0) {
          setItems(draft.items.map(item => ({
            name: item.name || '',
            price: item.price !== undefined ? String(item.price) : ''
          })));
        }

        if (draft.cgst || draft.sgst) {
          setShowTax(true);
          setGstRate(String((Number(draft.cgst || 0) + Number(draft.sgst || 0))));
        }

        trackEvent('ai_quick_invoice_autofill', { textLength: aiPrompt.length });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Could not auto-fill. Please enter details manually.');
    } finally {
      setAiLoading(false);
    }
  };

  // Submit Invoice
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!clientName.trim()) {
      alert('Please enter the client name.');
      return;
    }

    if (subtotal <= 0) {
      alert('Please add at least one item with a valid price.');
      return;
    }

    if (currency === 'INR' && !upiId.trim()) {
      alert('Please enter your UPI ID so your client can pay directly to your account.');
      return;
    }

    try {
      setSubmitting(true);
      const halfTax = taxPercent > 0 ? taxPercent / 2 : 0;

      const payload = {
        documentType: 'invoice',
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim() || undefined,
        currency,
        upiId: currency === 'INR' ? upiId.trim() : '',
        dueDate,
        items: items.map(item => ({
          name: item.name.trim() || 'Service',
          price: Number(item.price) || 0
        })),
        amount: total,
        cgst: halfTax,
        sgst: halfTax,
        notes: notes.trim()
      };

      const res = await api.post('/invoices', payload);
      const inv = res.data?.invoice;
      setCreatedInvoice(inv);
      trackEvent('create_invoice_success', { amount: total, currency });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create invoice. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const publicPayUrl = createdInvoice
    ? `${window.location.origin}/public/invoice/${createdInvoice._id}`
    : '';

  const copyPayLink = () => {
    if (!publicPayUrl) return;
    navigator.clipboard.writeText(publicPayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getWhatsAppShareUrl = () => {
    const text = `Hi ${clientName},\n\nHere is your invoice #${createdInvoice?.invoiceNumber || ''} for ${currency} ${total.toLocaleString('en-IN')}.\n\nYou can view and pay it securely here:\n${publicPayUrl}\n\nThank you!`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 pt-8 sm:pt-12">
        {/* SUCCESS CARD (Shown immediately when invoice is created - NO CONFUSING REDIRECT) */}
        {createdInvoice ? (
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-emerald-100 text-center animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-5 text-2xl font-black">
              ✓
            </div>

            <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-wider rounded-full mb-3 border border-emerald-200">
              Invoice #{createdInvoice.invoiceNumber} Ready!
            </span>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
              Invoice Created Successfully
            </h1>

            <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
              Total <strong className="text-slate-900 font-bold">{currency} {total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> for <strong className="text-slate-900 font-bold">{clientName}</strong>. Your client can scan the UPI QR code or pay via bank transfer.
            </p>

            {/* Link Box */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-6 flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                readOnly
                value={publicPayUrl}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 font-mono select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={copyPayLink}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-black transition-all shrink-0 active:scale-95"
              >
                {copied ? '✓ Copied!' : 'Copy Link'}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <a
                href={getWhatsAppShareUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                </svg>
                Share on WhatsApp
              </a>

              <a
                href={publicPayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                Open Client Pay Page ↗
              </a>
            </div>

            <button
              type="button"
              onClick={() => {
                setCreatedInvoice(null);
                setClientName('');
                setClientEmail('');
                setItems([{ name: '', price: '' }]);
                setAiPrompt('');
              }}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 uppercase tracking-widest"
            >
              + Create Another Invoice
            </button>
          </div>
        ) : (
          /* MAIN FORM */
          <div className="space-y-6">
            {/* Title */}
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Create Invoice</h1>
              <p className="text-sm text-slate-500 mt-1">
                Clients scan your UPI QR to pay directly into your bank account. Zero platform cut.
              </p>
            </div>

            {/* AI AUTO-FILL BOX */}
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-200/80 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">✨</span>
                <h3 className="text-sm font-bold text-slate-900">Let AI Write the Invoice (Optional)</h3>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                Just type what you did in simple words. AI will automatically fill in client name, price, and dates for you!
              </p>
              <form onSubmit={handleAiAutoFill} className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Website design for Rahul, ₹15,000, due in 7 days"
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                />
                <button
                  type="submit"
                  disabled={aiLoading}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shrink-0 active:scale-95 disabled:opacity-50"
                >
                  {aiLoading ? 'Auto-Filling...' : '🪄 Auto-Fill'}
                </button>
              </form>
            </div>

            {/* FORM CARD */}
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
              {/* Section 1: Client Details */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">1. Client Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Client Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="e.g. Rahul Sharma or Tech Corp"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Client Email or Phone (Optional)
                    </label>
                    <input
                      type="text"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="e.g. rahul@example.com or 9876543210"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Items / Services Billed */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">2. Service & Pricing</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    + Add Another Item
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="flex gap-2 sm:gap-3 items-center">
                      <input
                        type="text"
                        required
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        placeholder="Service name (e.g. Social Media Management, Logo Design)"
                        className="flex-1 min-w-0 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900 font-medium"
                      />
                      <div className="w-36 sm:w-44 flex rounded-xl border border-slate-300 bg-slate-50 focus-within:ring-2 focus-within:ring-slate-900 focus-within:bg-white overflow-hidden shrink-0">
                        <span className="px-3 py-2.5 bg-slate-100 border-r border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0 min-w-[44px]">
                          {currency === 'INR' ? '₹' : currency}
                        </span>
                        <input
                          type="number"
                          required
                          min="0"
                          step="any"
                          value={item.price}
                          onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                          placeholder="0"
                          className="w-full bg-transparent px-3 py-2.5 text-sm text-slate-900 focus:outline-none font-bold"
                        />
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-slate-400 hover:text-rose-500 p-2 text-lg leading-none shrink-0"
                          title="Remove item"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Payment & Due Date */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">3. Payout & Due Date</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {/* Your UPI ID */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Your UPI ID for Collection <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required={currency === 'INR'}
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-bold focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900 font-mono"
                    />
                    <p className="text-[11px] text-emerald-600 font-medium mt-1">
                      ✓ Clients scan the invoice QR to pay directly into this UPI ID.
                    </p>
                  </div>

                  {/* Currency */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-bold focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900 cursor-pointer shadow-sm transition"
                    >
                      {currencyOptions.map((opt) => (
                        <option key={opt.code} value={opt.code} className="text-slate-900 bg-white">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Due Date & Quick Buttons */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Payment Due Date</label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                    <input
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full sm:w-auto bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900 font-bold"
                    />
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setQuickDueDays(0)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all text-center"
                      >
                        Due Today
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickDueDays(7)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all text-center"
                      >
                        In 7 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickDueDays(15)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all text-center"
                      >
                        In 15 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickDueDays(30)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all text-center"
                      >
                        In 30 Days
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional Section: Tax & Notes */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowTax(!showTax)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
                  >
                    <span>{showTax ? '▼' : '▶'}</span>
                    <span>{showTax ? 'Hide GST / Tax' : '+ Add GST / Tax (Optional)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNotes(notes ? '' : 'Payment via UPI or Bank Transfer. Thank you for your business!')}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    {notes ? 'Clear Notes' : '+ Add Notes (Optional)'}
                  </button>
                </div>

                {showTax && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 max-w-xs">
                    <label className="block text-xs font-bold text-slate-700 mb-1">GST Rate (%)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={gstRate}
                        onChange={(e) => setGstRate(e.target.value)}
                        placeholder="18"
                        className="w-24 bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none"
                      />
                      <span className="text-xs text-slate-500 font-medium">% (splits into CGST + SGST)</span>
                    </div>
                  </div>
                )}

                {notes !== '' && (
                  <div className="mt-4">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Notes / Bank Details</label>
                    <textarea
                      rows="2"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Bank: HDFC, A/C: 1234567890, IFSC: HDFC0001234"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                )}
              </div>

              {/* Total & Submit Button */}
              <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">Total Amount</p>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900">
                    {currency === 'INR' ? '₹' : currency} {total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  {taxAmount > 0 && (
                    <p className="text-[11px] text-slate-500">Includes {taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} GST</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-black text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'Generating Invoice...' : 'Generate Invoice & Get Pay Link 🚀'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
