import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import { getUser } from '../utils/auth';

const formatCurrency = (amount) =>
  `₹ ${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

export default function CreateInvoice() {
  const navigate = useNavigate();

  const today = new Date();

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
  const [recurring, setRecurring] = useState({
    enabled: false,
    frequency: 'monthly',
    interval: 1,
    dayOfMonth: today.getDate(),
    sendEmail: true
  });

  const user = getUser() || {};

  const [clients, setClients] = useState([]);

  useEffect(() => {
    fetchClients();
    if (user) {
      setForm(prev => ({
        ...prev,
        gst: user.gstNumber || '',
        upiId: user.upiId || ''
      }));
    }
  }, []);

  const fetchClients = async () => {
    try {
      const res = await api.get('/clients');
      setClients(res.data);
    } catch (err) {
      console.log('Failed to load clients');
    }
  };

  const selectClient = (client) => {
    setForm(prev => ({
      ...prev,
      clientName: client.name,
      clientEmail: client.email,
      gst: client.gst || prev.gst
    }));
  };

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
    ? `Professional services delivered: ${itemSummary}. Includes preparation, execution, and final review.`
    : `Professional services including planning and final review.`;

  const suggestedDueDate = (() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 10);
  })();

  const aiSuggestions = [
    !form.clientName && 'Enter client name',
    !form.clientEmail && 'Enter client email',
    !form.dueDate && 'Due date missing',
    !form.upiId && 'UPI ID missing',
    subtotal <= 0 && 'Add billable work'
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
        amount: total,
        recurring
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

      <main className="container-custom py-10 md:py-16">
        <div className="reveal mb-12">
          <div className="flex items-center gap-2 mb-4">
             <span className="h-px w-8 bg-yellow-400" />
             <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Invoice Builder</p>
          </div>
          <h1 className="text-4xl font-black sm:text-5xl tracking-tight text-white mb-4">
            New Invoice
          </h1>
          <p className="max-w-2xl text-lg text-zinc-500 font-medium">
            Create a professional invoice, add payment details, and send it in minutes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-10 lg:grid-cols-[1fr_380px]">
          <div className="reveal reveal-delay-1 space-y-8">
            {/* Section: Client */}
            <section className="surface p-8 border-white/5 bg-zinc-950/40 backdrop-blur-xl rounded-[2.5rem] relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 text-white pointer-events-none group-hover:opacity-10 transition-opacity">
                 <svg className="h-24 w-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
              </div>

              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white leading-none mb-1">Client Details</h2>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    Who are you billing?
                  </p>
                </div>

                {clients.length > 0 && (
                  <select
                    className="rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-[10px] font-black tracking-widest uppercase text-yellow-300 outline-none focus:border-yellow-300/50 cursor-pointer"
                    onChange={(e) => {
                      const c = clients.find(client => client._id === e.target.value);
                      if (c) selectClient(c);
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Saved Clients</option>
                    {clients.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Client Name</p>
                    <input
                      name="clientName"
                      value={form.clientName}
                      onChange={handleChange}
                      placeholder="e.g. John Doe"
                      className="input py-4 bg-black/20 border-white/5 focus:bg-black/60"
                    />
                </div>

                <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Client Email</p>
                    <input
                      name="clientEmail"
                      type="email"
                      value={form.clientEmail}
                      onChange={handleChange}
                      placeholder="e.g. john@example.com"
                      className="input py-4 bg-black/20 border-white/5 focus:bg-black/60"
                    />
                </div>
              </div>
            </section>

            {/* Section: Service */}
            <section className="surface p-8 border-white/5 bg-zinc-950/40 backdrop-blur-xl rounded-[2.5rem]">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-white leading-none mb-1">Invoice Summary</h2>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  Add a short description of the work delivered
                </p>
              </div>

              <textarea
                name="serviceDescription"
                value={form.serviceDescription}
                onChange={handleChange}
                placeholder="Briefly describe the value delivered..."
                rows="3"
                className="input resize-none py-4 bg-black/20 border-white/5 focus:bg-black/60 min-h-[120px]"
              />
            </section>

            {/* Section: Items */}
            <section className="surface p-8 border-white/5 bg-zinc-950/40 backdrop-blur-xl rounded-[2.5rem]">
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white leading-none mb-1">Line Items</h2>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    Break down your billables
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addItem}
                  className="btn btn-secondary px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  Add Row
                </button>
              </div>

              <div className="space-y-4">
                {items.map((item, i) => (
                  <div key={i} className="group/item grid gap-3 p-4 rounded-2xl border border-white/5 bg-black/10 transition-all hover:bg-black/20 md:grid-cols-[1fr_200px_50px]">
                    <div className="space-y-1.5">
                       <p className="text-[10px] font-black uppercase tracking-widest text-zinc-700 md:hidden">Service Description</p>
                       <input
                         placeholder="Consulting, Design, etc."
                         value={item.name}
                         onChange={(e) => handleItemChange(i, 'name', e.target.value)}
                         className="input bg-transparent border-transparent px-0 focus:ring-0 text-white font-medium placeholder:text-zinc-700"
                       />
                    </div>

                    <div className="space-y-1.5 relative">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-700 md:hidden">Amount</p>
                        <div className="flex items-center">
                            <span className="text-zinc-600 font-bold mr-2">₹</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="0.00"
                              value={item.price}
                              onChange={(e) => handleItemChange(i, 'price', e.target.value)}
                              className="input bg-transparent border-transparent px-0 focus:ring-0 text-white font-black text-lg placeholder:text-zinc-700"
                            />
                        </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-400/5 text-red-500/20 hover:text-red-400 hover:bg-red-400/10 transition-all self-center ml-auto"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Section: Tax & Date */}
            <section className="surface p-8 border-white/5 bg-zinc-950/40 backdrop-blur-xl rounded-[2.5rem]">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-white leading-none mb-1">Payment Details</h2>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  Dates, Tax & Payments
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Due Date</p>
                    <input
                      type="date"
                      name="dueDate"
                      value={form.dueDate}
                      onChange={handleChange}
                      className="input py-4 bg-black/20 border-white/5"
                    />
                </div>

                <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">UPI ID for Collection</p>
                    <input
                      name="upiId"
                      value={form.upiId}
                      onChange={handleChange}
                      placeholder="e.g. success@upi"
                      className="input py-4 bg-black/20 border-white/5"
                    />
                </div>

                <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">GST Identification</p>
                    <input
                      name="gst"
                      value={form.gst}
                      onChange={handleChange}
                      placeholder="Optional GSTIN"
                      className="input py-4 bg-black/20 border-white/5"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">CGST %</p>
                        <input
                          name="cgst"
                          type="number"
                          value={form.cgst}
                          onChange={handleChange}
                          placeholder="0"
                          className="input py-4 bg-black/20 border-white/5"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">SGST %</p>
                        <input
                          name="sgst"
                          type="number"
                          value={form.sgst}
                          onChange={handleChange}
                          placeholder="0"
                          className="input py-4 bg-black/20 border-white/5"
                        />
                    </div>
                </div>
              </div>
            </section>
          </div>

          {/* SIDEBAR */}
          <aside className="reveal reveal-delay-2 space-y-6 lg:sticky lg:top-28 h-fit">
            <div className="surface p-8 border-white/10 bg-zinc-950 shadow-2xl rounded-[2.5rem]">
               <div className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-white/5 border border-white/10 mb-6">
                 <p className="text-[10px] uppercase tracking-widest font-black text-zinc-500">Invoice Total</p>
               </div>

               <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 font-bold text-sm uppercase tracking-tighter">Gross</span>
                    <span className="font-bold text-white text-lg">{formatCurrency(subtotal)}</span>
                  </div>
                  {tax > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 font-bold text-sm uppercase tracking-tighter">Tax ({taxRate}%)</span>
                      <span className="font-bold text-white text-lg">{formatCurrency(tax)}</span>
                    </div>
                  )}
                  <div className="pt-6 border-t border-white/5 flex flex-col items-end">
                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-2 text-right w-full">Final Total</span>
                    <span className="text-5xl font-black text-emerald-400 tracking-tighter">{formatCurrency(total)}</span>
                  </div>
               </div>

               <div className="rounded-[2rem] border border-yellow-400/20 bg-yellow-400/5 p-6 mb-8 group/coach">
                  <div className="flex items-center gap-2 mb-4">
                     <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
                     <p className="text-[10px] font-black text-yellow-300 uppercase tracking-widest">Quick Checks</p>
                  </div>

                  <div className="space-y-2 mb-6">
                    {aiSuggestions.length > 0 ? aiSuggestions.slice(0, 3).map((s, i) => (
                      <p key={i} className="text-xs font-bold text-zinc-400 flex items-center gap-2">
                        <span className="h-1 w-1 bg-yellow-400/40 rounded-full" /> {s}
                      </p>
                    )) : (
                      <p className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        Optimized for success.
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <button
                      type="button"
                      onClick={applySmartDescription}
                      className="w-full py-3 rounded-xl border border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white/10 transition-all"
                    >
                      Generate Summary
                    </button>
                    {!form.dueDate && (
                      <button
                        type="button"
                        onClick={applySmartDueDate}
                        className="w-full py-3 rounded-xl border border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white/10 transition-all"
                      >
                        Set 7-Day Due Date
                      </button>
                    )}
                  </div>
               </div>

               <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 mb-8">
                 <div className="flex items-start justify-between gap-4">
                   <div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Recurring Invoice</p>
                     <p className="text-xs font-bold text-zinc-600 leading-relaxed">
                       Auto-generate this invoice on a schedule for retainers and subscriptions.
                     </p>
                   </div>

                   <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                     <input
                       type="checkbox"
                       checked={recurring.enabled}
                       onChange={(e) => setRecurring((prev) => ({ ...prev, enabled: e.target.checked }))}
                       className="h-5 w-5 accent-yellow-400"
                     />
                     <span className="text-[10px] font-black uppercase tracking-widest text-yellow-300">
                       {recurring.enabled ? 'On' : 'Off'}
                     </span>
                   </label>
                 </div>

                 {recurring.enabled && (
                   <div className="mt-6 grid gap-4">
                     <div className="grid gap-4 sm:grid-cols-2">
                       <div className="space-y-1.5">
                         <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Frequency</p>
                         <select
                           value={recurring.frequency}
                           onChange={(e) => {
                             const nextFrequency = e.target.value;
                             setRecurring((prev) => ({
                               ...prev,
                               frequency: nextFrequency,
                               dayOfMonth: nextFrequency === 'monthly'
                                 ? (prev.dayOfMonth || today.getDate())
                                 : null
                             }));
                           }}
                           className="input py-4 bg-black/20 border-white/5 cursor-pointer"
                         >
                           <option value="monthly">Monthly</option>
                           <option value="weekly">Weekly</option>
                         </select>
                       </div>

                       <div className="space-y-1.5">
                         <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Interval</p>
                         <input
                           type="number"
                           min="1"
                           max="24"
                           value={recurring.interval}
                           onChange={(e) => setRecurring((prev) => ({ ...prev, interval: e.target.value }))}
                           className="input py-4 bg-black/20 border-white/5"
                         />
                       </div>
                     </div>

                     {recurring.frequency === 'monthly' && (
                       <div className="space-y-1.5">
                         <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Day of Month</p>
                         <input
                           type="number"
                           min="1"
                           max="31"
                           value={recurring.dayOfMonth ?? ''}
                           onChange={(e) =>
                             setRecurring((prev) => ({
                               ...prev,
                               dayOfMonth: Number(e.target.value || today.getDate())
                             }))
                           }
                           className="input py-4 bg-black/20 border-white/5"
                         />
                       </div>
                     )}

                     <label className="flex items-center gap-3 cursor-pointer select-none">
                       <input
                         type="checkbox"
                         checked={recurring.sendEmail}
                         onChange={(e) => setRecurring((prev) => ({ ...prev, sendEmail: e.target.checked }))}
                         className="h-4 w-4 accent-yellow-400"
                       />
                       <span className="text-xs font-bold text-zinc-500">
                         Email the client automatically each cycle
                       </span>
                     </label>
                   </div>
                 )}
               </div>

               <button
                 type="submit"
                 disabled={loading}
                 className="w-full py-5 rounded-2xl bg-yellow-400 text-black font-black text-lg shadow-xl shadow-yellow-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
               >
                 {loading ? 'Creating...' : 'Create Invoice'}
               </button>

               {limitReached && (
                 <div className="mt-6 p-6 rounded-2xl bg-red-400/10 border border-red-400/20">
                    <p className="text-sm font-bold text-red-400 mb-4 text-center">Free plan limit reached.</p>
                    <button
                      type="button"
                      onClick={() => navigate('/payment')}
                      className="w-full py-3 rounded-xl bg-red-400 text-white font-black text-xs uppercase"
                    >
                      Upgrade Plan
                    </button>
                 </div>
               )}
            </div>
          </aside>
        </form>
      </main>
    </div>
  );
}
