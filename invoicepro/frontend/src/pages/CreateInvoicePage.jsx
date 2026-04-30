import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, Minus, Plus, Send, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import SuccessModal from '../components/SuccessModal';
import MotionButton from '../components/ui/MotionButton';
import PageTransition from '../components/ui/PageTransition';
import { clients } from '../data/mockData';
import { formatRs } from '../utils/currency';

const createItem = () => ({
  id: crypto.randomUUID(),
  description: '',
  quantity: 1,
  rate: 250
});

export default function CreateInvoicePage() {
  const [clientId, setClientId] = useState(clients[0].id);
  const [invoiceNumber, setInvoiceNumber] = useState('INV-2049');
  const [dueDate, setDueDate] = useState('2026-05-15');
  const [notes, setNotes] = useState('Payment is due within 15 days. Thank you for your business.');
  const [taxRate, setTaxRate] = useState(8.5);
  const [items, setItems] = useState([
    { id: crypto.randomUUID(), description: 'Product design sprint', quantity: 1, rate: 3200 },
    { id: crypto.randomUUID(), description: 'Frontend implementation', quantity: 2, rate: 1450 }
  ]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const selectedClient = clients.find((client) => client.id === clientId) || clients[0];

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      return sum + quantity * rate;
    }, 0);
    const tax = subtotal * ((Number(taxRate) || 0) / 100);
    const total = subtotal + tax;

    return { subtotal, tax, total };
  }, [items, taxRate]);

  const updateItem = (id, field, value) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const addItem = () => {
    setItems((current) => [...current, createItem()]);
  };

  const removeItem = (id) => {
    setItems((current) => (current.length === 1 ? current : current.filter((item) => item.id !== id)));
  };

  const validate = () => {
    const nextErrors = {};

    if (!clientId) nextErrors.clientId = 'Select a client.';
    if (!invoiceNumber.trim()) nextErrors.invoiceNumber = 'Invoice number is required.';
    if (!dueDate) nextErrors.dueDate = 'Due date is required.';
    if (!items.length) nextErrors.items = 'Add at least one item.';

    items.forEach((item, index) => {
      if (!item.description.trim()) nextErrors[`description-${item.id}`] = `Item ${index + 1} needs a description.`;
      if (Number(item.quantity) <= 0) nextErrors[`quantity-${item.id}`] = 'Quantity must be greater than 0.';
      if (Number(item.rate) <= 0) nextErrors[`rate-${item.id}`] = 'Rate must be greater than 0.';
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submitInvoice = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 850));
    setSubmitting(false);
    setSuccessOpen(true);
  };

  return (
    <PageTransition className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-300">Invoice builder</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Create a new invoice</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Add client details, line items, tax, and send a payment-ready invoice.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-300">
          <CalendarDays className="h-4 w-4 text-cyan-300" aria-hidden="true" />
          Due {dueDate || 'not set'}
        </div>
      </div>

      <form onSubmit={submitInvoice} className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="space-y-6 rounded-3xl border border-white/10 bg-slate-800 p-5 shadow-2xl shadow-black/20 sm:p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Client" error={errors.clientId}>
              <select
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                className="field"
                aria-invalid={Boolean(errors.clientId)}
              >
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Invoice number" error={errors.invoiceNumber}>
              <input
                value={invoiceNumber}
                onChange={(event) => setInvoiceNumber(event.target.value)}
                className="field"
                aria-invalid={Boolean(errors.invoiceNumber)}
              />
            </Field>

            <Field label="Due date" error={errors.dueDate}>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="field"
                aria-invalid={Boolean(errors.dueDate)}
              />
            </Field>
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Items</h3>
                {errors.items && <p className="mt-1 text-sm text-rose-300">{errors.items}</p>}
              </div>
              <MotionButton type="button" variant="secondary" onClick={addItem}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add item
              </MotionButton>
            </div>

            <div className="hidden grid-cols-[1fr_120px_140px_130px_44px] gap-3 px-1 pb-3 text-xs font-bold uppercase tracking-wide text-slate-500 lg:grid">
              <span>Description</span>
              <span>Qty</span>
              <span>Rate</span>
              <span className="text-right">Amount</span>
              <span />
            </div>

            <AnimatePresence initial={false}>
              {items.map((item) => {
                const amount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                    transition={{ duration: 0.22 }}
                    className="mb-3 grid gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-3 lg:grid-cols-[1fr_120px_140px_130px_44px] lg:items-start"
                  >
                    <Field label="Description" hideLabelOnDesktop error={errors[`description-${item.id}`]}>
                      <input
                        value={item.description}
                        onChange={(event) => updateItem(item.id, 'description', event.target.value)}
                        className="field"
                        placeholder="Service or product"
                        aria-invalid={Boolean(errors[`description-${item.id}`])}
                      />
                    </Field>

                    <Field label="Qty" hideLabelOnDesktop error={errors[`quantity-${item.id}`]}>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity}
                        onChange={(event) => updateItem(item.id, 'quantity', event.target.value)}
                        className="field"
                        aria-invalid={Boolean(errors[`quantity-${item.id}`])}
                      />
                    </Field>

                    <Field label="Rate" hideLabelOnDesktop error={errors[`rate-${item.id}`]}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(event) => updateItem(item.id, 'rate', event.target.value)}
                        className="field"
                        aria-invalid={Boolean(errors[`rate-${item.id}`])}
                      />
                    </Field>

                    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-right text-sm font-bold text-white">
                      <span className="mb-1 block text-left text-xs font-semibold text-slate-500 lg:hidden">Amount</span>
                      {formatRs(amount)}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                      aria-label="Remove item"
                      title="Remove item"
                      className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 outline-none transition hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200 focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="field min-h-28 resize-y"
            />
          </Field>
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-slate-800 p-6 shadow-2xl shadow-black/20">
            <h3 className="text-lg font-bold text-white">Client</h3>
            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <p className="font-bold text-white">{selectedClient.company}</p>
              <p className="mt-1 text-sm text-slate-400">{selectedClient.email}</p>
              <span className="mt-4 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-200">
                {selectedClient.health}
              </span>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-800 p-6 shadow-2xl shadow-black/20">
            <h3 className="text-lg font-bold text-white">Total</h3>
            <div className="mt-5 space-y-4">
              <SummaryRow label="Subtotal" value={formatRs(totals.subtotal)} />
              <div className="flex items-center justify-between gap-4">
                <label htmlFor="taxRate" className="text-sm font-medium text-slate-400">
                  Tax
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Decrease tax"
                    title="Decrease tax"
                    onClick={() => setTaxRate((value) => Math.max(0, Number(value) - 0.5))}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.05] text-slate-300 outline-none hover:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-blue-300"
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <input
                    id="taxRate"
                    type="number"
                    min="0"
                    step="0.5"
                    value={taxRate}
                    onChange={(event) => setTaxRate(event.target.value)}
                    className="h-9 w-20 rounded-lg border border-white/10 bg-slate-900 px-2 text-right text-sm font-bold text-white outline-none focus:border-blue-300/60 focus:ring-4 focus:ring-blue-500/10"
                  />
                  <span className="text-sm text-slate-400">%</span>
                </div>
              </div>
              <SummaryRow label="Tax amount" value={formatRs(totals.tax)} />
              <div className="h-px bg-white/10" />
              <SummaryRow label="Amount due" value={formatRs(totals.total)} large />
            </div>

            <MotionButton type="submit" className="mt-6 w-full" disabled={submitting}>
              <Send className="h-4 w-4" aria-hidden="true" />
              {submitting ? 'Sending invoice...' : 'Send invoice'}
            </MotionButton>
          </section>
        </aside>
      </form>

      <SuccessModal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        total={formatRs(totals.total)}
      />
    </PageTransition>
  );
}

function Field({ label, children, error, hideLabelOnDesktop = false }) {
  return (
    <label className="block">
      <span className={`mb-2 block text-sm font-semibold text-slate-300 ${hideLabelOnDesktop ? 'lg:sr-only' : ''}`}>
        {label}
      </span>
      {children}
      {error && <span className="mt-2 block text-xs font-semibold text-rose-300">{error}</span>}
    </label>
  );
}

function SummaryRow({ label, value, large }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={`${large ? 'text-base font-bold text-white' : 'text-sm font-medium text-slate-400'}`}>
        {label}
      </span>
      <span className={`${large ? 'text-3xl font-black text-white' : 'text-sm font-bold text-slate-200'}`}>
        {value}
      </span>
    </div>
  );
}
