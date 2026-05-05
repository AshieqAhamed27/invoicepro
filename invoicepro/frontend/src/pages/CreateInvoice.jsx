import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import { getUser } from '../utils/auth';
import AIBillingAgent from '../components/AIBillingAgent';
import PriceSuggestionAgent from '../components/PriceSuggestionAgent';
import { trackEvent } from '../utils/analytics';

const formatCurrency = (amount) =>
  `Rs ${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const normalizeDraftDate = (value) => {
  if (!value) return '';

  if (/^\d{4}-\d{2}-\d{2}/.test(String(value))) {
    return String(value).slice(0, 10);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 10);
};

export default function CreateInvoice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const today = new Date();
  const requestedType = searchParams.get('type') === 'proposal' ? 'proposal' : 'invoice';
  const [documentType, setDocumentType] = useState(requestedType);

  const [form, setForm] = useState({
    clientName: '',
    clientEmail: '',
    serviceDescription: '',
    gst: '',
    cgst: '',
    sgst: '',
    upiId: '',
    dueDate: '',
    validUntil: ''
  });

  const [items, setItems] = useState([{ name: '', price: '' }]);
  const [loading, setLoading] = useState(false);
  const [aiWriting, setAiWriting] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [sourceLeadId, setSourceLeadId] = useState('');
  const [recurring, setRecurring] = useState({
    enabled: false,
    frequency: 'monthly',
    interval: 1,
    dayOfMonth: today.getDate(),
    sendEmail: true
  });

  const user = getUser() || {};
  const isPro = user.plan && user.plan !== 'free';

  const [clients, setClients] = useState([]);
  const isProposal = documentType === 'proposal';
  const dateFieldName = isProposal ? 'validUntil' : 'dueDate';
  const dateFieldValue = isProposal ? form.validUntil : form.dueDate;

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

  useEffect(() => {
    setDocumentType(requestedType);
  }, [requestedType]);

  useEffect(() => {
    if (documentType === 'proposal') {
      setRecurring(prev => ({
        ...prev,
        enabled: false
      }));
    }
  }, [documentType]);

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
    ? isProposal
      ? `Proposed scope of work: ${itemSummary}. Includes delivery, review, and approval checkpoints.`
      : `Professional services delivered: ${itemSummary}. Includes preparation, execution, and final review.`
    : isProposal
      ? `Proposed professional services including delivery plan and approval checkpoints.`
      : `Professional services including planning and final review.`;

  const suggestedDueDate = (() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 10);
  })();

  const aiSuggestions = [
    !form.clientName && 'Enter client name',
    !form.clientEmail && 'Enter client email',
    !dateFieldValue && (isProposal ? 'Proposal validity missing' : 'Due date missing'),
    !isProposal && !form.upiId && 'UPI ID missing',
    subtotal <= 0 && 'Add billable work'
  ].filter(Boolean);

  const applySmartDescription = async () => {
    try {
      setAiWriting(true);
      const res = await api.post('/ai/draft', {
        type: isProposal ? 'proposal-summary' : 'invoice-summary',
        context: {
          clientName: form.clientName,
          clientEmail: form.clientEmail,
          serviceDescription: form.serviceDescription,
          items,
          cgst: form.cgst,
          sgst: form.sgst,
          taxRate,
          dueDate: isProposal ? '' : form.dueDate,
          validUntil: isProposal ? form.validUntil : '',
          documentType,
          variantSeed: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          amount: total
        }
      });

      setForm((prev) => ({
        ...prev,
        serviceDescription: res.data?.text || smartDescription
      }));
    } catch {
      setForm((prev) => ({
        ...prev,
        serviceDescription: smartDescription
      }));
    } finally {
      setAiWriting(false);
    }
  };

  const applySmartDueDate = () => {
    setForm((prev) => ({
      ...prev,
      [dateFieldName]: suggestedDueDate
    }));
  };

  const applyAiDraft = (draft) => {
    if (!draft) return;

    const nextDocumentType = draft.documentType === 'proposal' ? 'proposal' : 'invoice';
    setSourceLeadId(draft.sourceLeadId || '');
    const nextItems = Array.isArray(draft.items)
      ? draft.items
          .map((item) => ({
            name: String(item?.name || '').trim(),
            price: item?.price === undefined || item?.price === null ? '' : String(item.price)
          }))
          .filter((item) => item.name || Number(item.price || 0) > 0)
      : [];

    setDocumentType(nextDocumentType);
    setForm((prev) => ({
      ...prev,
      clientName: draft.clientName || prev.clientName,
      clientEmail: draft.clientEmail || prev.clientEmail,
      serviceDescription: draft.serviceDescription || prev.serviceDescription,
      cgst: draft.cgst ?? prev.cgst,
      sgst: draft.sgst ?? prev.sgst,
      upiId: nextDocumentType === 'invoice' ? (draft.upiId || prev.upiId) : '',
      dueDate: nextDocumentType === 'invoice' ? normalizeDraftDate(draft.dueDate) : '',
      validUntil: nextDocumentType === 'proposal' ? normalizeDraftDate(draft.validUntil) : ''
    }));

    if (nextItems.length) {
      setItems(nextItems);
    }

    if (nextDocumentType === 'proposal') {
      setRecurring((prev) => ({
        ...prev,
        enabled: false
      }));
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const applySuggestedPrice = (price, label = 'Professional service package') => {
    const cleanPrice = Number(price || 0);
    if (!cleanPrice) return;

    setItems([
      {
        name: label,
        price: String(cleanPrice)
      }
    ]);

    if (!form.serviceDescription) {
      setForm((prev) => ({
        ...prev,
        serviceDescription: isProposal
          ? `Proposed scope for ${label}. Includes delivery, review, and handover support.`
          : `Professional services for ${label}. Includes delivery, review, and handover support.`
      }));
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    try {
      const storedDraft = localStorage.getItem('invoicepro_ai_invoice_draft');
      if (!storedDraft) return;

      localStorage.removeItem('invoicepro_ai_invoice_draft');
      applyAiDraft(JSON.parse(storedDraft));
    } catch { }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.clientName || !form.clientEmail || subtotal <= 0) {
      alert('Fill required fields');
      return;
    }

    const finalUpi = isProposal ? '' : (form.upiId || user?.upiId);

    if (!isProposal && !finalUpi) {
      alert("Please add UPI ID in Settings or here");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/invoices', {
        ...form,
        documentType,
        upiId: finalUpi,
        sourceLeadId,
        items,
        amount: total,
        recurring: isProposal ? { enabled: false } : recurring
      });

      trackEvent(isProposal ? 'create_proposal' : 'create_invoice', {
        value: total,
        currency: 'INR',
        item_count: items.length,
        recurring_enabled: Boolean(!isProposal && recurring.enabled)
      });
      navigate(`/invoice/${res.data.invoice._id}`);
    } catch (err) {
      if (err.response?.data?.limitReached) {
        setLimitReached(true);
      } else if (err.response?.data?.upgradeRequired) {
        alert(err.response.data.message || 'This is a Pro feature.');
        navigate('/payment');
      } else {
        alert('Error creating invoice');
      }
    }

    setLoading(false);
  };

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10 md:py-16">
        <div className="reveal mb-12">
          <div className="flex items-center gap-2 mb-4">
             <span className="h-px w-8 bg-yellow-400" />
             <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Billing Builder</p>
          </div>
          <h1 className="text-4xl font-bold sm:text-5xl tracking-tight text-white mb-4">
            {isProposal ? 'New Proposal' : 'New Invoice'}
          </h1>
          <p className="max-w-2xl text-base sm:text-lg text-zinc-500 font-medium">
            {isProposal
              ? 'Create a client-ready proposal, collect approval online, and convert it into an invoice later.'
              : 'Create a professional invoice, add payment details, and send it in minutes.'}
          </p>

          <div className="mt-8 grid w-full grid-cols-1 gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-1 sm:inline-grid sm:w-auto sm:grid-cols-2">
            {[
              { id: 'invoice', label: 'Invoice', note: 'Collect payment now' },
              { id: 'proposal', label: 'Proposal', note: 'Get approval first' }
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setDocumentType(option.id)}
                className={`rounded-lg px-5 py-3 text-left transition-all ${documentType === option.id
                  ? 'bg-white text-zinc-950'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                  }`}
              >
                <p className="text-[10px] font-black uppercase tracking-widest">{option.label}</p>
                <p className="mt-1 text-xs font-bold">{option.note}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="reveal reveal-delay-1 mb-8">
          <AIBillingAgent
            mode="builder"
            context={{
              documentType,
              form,
              items,
              cgst: form.cgst,
              sgst: form.sgst,
              subtotal,
              tax,
              total
            }}
            onApplyDraft={applyAiDraft}
          />
        </div>

        <div className="reveal reveal-delay-2 mb-8">
          <PriceSuggestionAgent
            context={{
              documentType,
              serviceDescription: form.serviceDescription,
              items,
              subtotal,
              tax,
              total,
              clientName: form.clientName,
              clientEmail: form.clientEmail
            }}
            onApplyPrice={applySuggestedPrice}
          />
        </div>

        <form onSubmit={handleSubmit} className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-10">
          <div className="reveal reveal-delay-1 space-y-8">
            {/* Section: Client */}
            <section className="premium-panel p-5 sm:p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 text-white pointer-events-none group-hover:opacity-10 transition-opacity">
                 <svg className="h-24 w-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
              </div>

              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white leading-none mb-1">Client Details</h2>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    {isProposal ? 'Who is reviewing this proposal?' : 'Who are you billing?'}
                  </p>
                </div>

                {clients.length > 0 && (
                  <select
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-[10px] font-black tracking-widest uppercase text-yellow-300 outline-none focus:border-yellow-300/50 cursor-pointer sm:w-auto"
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
            <section className="premium-panel p-5 sm:p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-white leading-none mb-1">
                  {isProposal ? 'Proposal Summary' : 'Invoice Summary'}
                </h2>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  {isProposal ? 'Explain the work you are proposing' : 'Add a short description of the work delivered'}
                </p>
              </div>

              <textarea
                name="serviceDescription"
                value={form.serviceDescription}
                onChange={handleChange}
                placeholder={isProposal ? 'Briefly describe the scope you are proposing...' : 'Briefly describe the value delivered...'}
                rows="3"
                className="input resize-none py-4 bg-black/20 border-white/5 focus:bg-black/60 min-h-[120px]"
              />
            </section>

            {/* Section: Items */}
            <section className="premium-panel p-5 sm:p-8">
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
                  <div key={i} className="group/item grid gap-3 p-4 rounded-2xl border border-white/5 bg-black/10 transition-all hover:bg-black/20 lg:grid-cols-[minmax(0,1fr)_200px_50px]">
                    <div className="space-y-1.5">
                       <p className="text-[10px] font-black uppercase tracking-widest text-zinc-700 lg:hidden">Service Description</p>
                       <input
                         placeholder="Consulting, Design, etc."
                         value={item.name}
                         onChange={(e) => handleItemChange(i, 'name', e.target.value)}
                         className="input bg-transparent border-transparent px-0 focus:ring-0 text-white font-medium placeholder:text-zinc-700"
                       />
                    </div>

                    <div className="space-y-1.5 relative">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-700 lg:hidden">Amount</p>
                        <div className="flex items-center">
                            <span className="text-zinc-500 font-bold mr-2">Rs</span>
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
            <section className="premium-panel p-5 sm:p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-white leading-none mb-1">
                  {isProposal ? 'Proposal Details' : 'Payment Details'}
                </h2>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  {isProposal ? 'Validity and commercial terms' : 'Dates, tax, and payments'}
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">
                      {isProposal ? 'Valid Until' : 'Due Date'}
                    </p>
                    <input
                      type="date"
                      name={dateFieldName}
                      value={dateFieldValue}
                      onChange={handleChange}
                      className="input py-4 bg-black/20 border-white/5"
                    />
                </div>

                {!isProposal && (
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
                )}

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
          <aside className="reveal reveal-delay-2 space-y-6 xl:sticky xl:top-28 h-fit">
            <div className="premium-panel p-5 sm:p-8">
               <div className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-white/5 border border-white/10 mb-6">
                 <p className="text-[10px] uppercase tracking-widest font-black text-zinc-500">
                   {isProposal ? 'Proposal Total' : 'Invoice Total'}
                 </p>
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
                    <span className="text-3xl sm:text-5xl font-black text-emerald-400 tracking-tighter break-words text-right">{formatCurrency(total)}</span>
                  </div>
               </div>

               <div className="rounded-[2rem] border border-yellow-400/20 bg-yellow-400/5 p-5 sm:p-6 mb-8 group/coach">
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
                      disabled={aiWriting}
                      className="w-full py-3 rounded-xl border border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white/10 transition-all"
                    >
                      {aiWriting ? 'Writing...' : 'AI Generate Summary'}
                    </button>
                    {!dateFieldValue && (
                      <button
                        type="button"
                        onClick={applySmartDueDate}
                        className="w-full py-3 rounded-xl border border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white/10 transition-all"
                      >
                        {isProposal ? 'Set 7-Day Validity' : 'Set 7-Day Due Date'}
                      </button>
                    )}
                  </div>
               </div>

               {!isProposal && (
               <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-5 sm:p-6 mb-8">
                 <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
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
                       onChange={(e) => {
                         if (!isPro && e.target.checked) {
                           navigate('/payment');
                           return;
                         }
                         setRecurring((prev) => ({ ...prev, enabled: e.target.checked }));
                       }}
                       className="h-5 w-5 accent-yellow-400"
                     />
                     <span className="text-[10px] font-black uppercase tracking-widest text-yellow-300">
                       {isPro ? (recurring.enabled ? 'On' : 'Off') : 'Pro'}
                     </span>
                   </label>
                 </div>

                 {!isPro && (
                   <button
                     type="button"
                     onClick={() => navigate('/payment')}
                     className="mt-5 w-full rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-yellow-300 transition-all hover:bg-yellow-400 hover:text-black"
                   >
                     Upgrade to automate recurring invoices
                   </button>
                 )}

                 {isPro && recurring.enabled && (
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
               )}

               <button
                 type="submit"
                 disabled={loading}
                 className="btn btn-primary w-full py-5 text-lg shadow-xl shadow-black/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all"
               >
                 {loading ? 'Creating...' : isProposal ? 'Create Proposal' : 'Create Invoice'}
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
