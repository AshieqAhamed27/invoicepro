import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import Navbar from '../components/Navbar';
import html2pdf from 'html2pdf.js';

const formatCurrency = (amount, currency) => {
  const symbol = currency === 'INR' ? '₹' : '$';
  return `${symbol}${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

const STATUS_STYLES = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'DRAFT' },
  sent: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'SENT' },
  paid: { bg: 'bg-green-100', text: 'text-green-700', label: 'PAID' },
};

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getUser();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef();

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const res = await api.get(`/invoices/${id}`);
      setInvoice(res.data.invoice);
    } catch {
      setError('Invoice not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
  const element = printRef.current;

  const opt = {
    margin: 10,
    filename: `${invoice.invoiceNumber}-${invoice.clientName}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save();
};

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-50">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-ink-200 border-t-amber-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-ink-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <p className="text-red-500 mb-4">{error || 'Invoice not found.'}</p>
          <Link to="/dashboard" className="text-amber-600 font-semibold hover:underline">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const status = STATUS_STYLES[invoice.status] || STATUS_STYLES.draft;
  const companyName = user?.companyName || user?.name || 'Your Company';

  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Top actions */}
        <div className="flex items-center justify-between mb-6 no-print">
          <div className="flex items-center gap-2 text-sm text-ink-400">
            <Link to="/dashboard" className="hover:text-ink-700">Dashboard</Link>
            <span>/</span>
            <span className="text-ink-700 font-mono font-medium">{invoice.invoiceNumber}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/create-invoice"
              className="text-sm border border-ink-200 text-ink-700 px-4 py-2 rounded-lg hover:bg-ink-100 transition-colors"
            >
              New Invoice
            </Link>
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-ink-900 font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {downloading ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        </div>

        {/* Invoice Document */}
        <div ref={printRef} className="bg-white text-black p-6 max-w-2xl mx-auto">
          {/* Header */}
          <div className="bg-ink-900 px-8 py-8 flex items-start justify-between">
            <div>
              <h1 className="font-display font-bold text-2xl text-white">{companyName}</h1>
              <p className="text-ink-400 text-sm mt-1">{user?.email}</p>
            </div>
            <div className="text-right">
              <p className="text-ink-500 text-xs uppercase tracking-widest mb-1">Invoice</p>
              <p className="font-mono font-bold text-amber-400 text-xl">{invoice.invoiceNumber}</p>
              <span className={`inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full ${status.bg} ${status.text}`}>
                {status.label}
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="px-8 py-8">
            {/* Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
              <div>
                <p className="text-xs font-bold text-ink-400 uppercase tracking-widest mb-2">Bill To</p>
                <p className="font-semibold text-ink-900 text-lg">{invoice.clientName}</p>
                <p className="text-ink-500 text-sm">{invoice.clientEmail}</p>
              </div>
              <div className="sm:text-right space-y-3">
                <div>
                  <p className="text-xs font-bold text-ink-400 uppercase tracking-widest mb-0.5">Invoice Date</p>
                  <p className="text-ink-800 font-medium">{formatDate(invoice.date)}</p>
                </div>
                {invoice.dueDate && (
                  <div>
                    <p className="text-xs font-bold text-ink-400 uppercase tracking-widest mb-0.5">Due Date</p>
                    <p className="text-ink-800 font-medium">{formatDate(invoice.dueDate)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Service Table */}
            <div className="rounded-xl overflow-hidden border border-ink-100 mb-8">
              <div className="bg-ink-50 px-6 py-3 grid grid-cols-3 text-xs font-bold text-ink-400 uppercase tracking-widest">
                <span className="col-span-2">Description</span>
                <span className="text-right">Amount</span>
              </div>
              <div className="px-6 py-5 grid grid-cols-3 items-start border-t border-ink-50">
                <div className="col-span-2">
                  <p className="text-ink-900 font-medium leading-relaxed">{invoice.serviceDescription}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-ink-900 text-lg">{formatCurrency(invoice.amount, invoice.currency)}</p>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-end mb-8">
              <div className="bg-ink-900 rounded-xl px-8 py-4 text-right">
                <p className="text-ink-400 text-xs uppercase tracking-widest mb-1">Total Due</p>
                <p className="font-mono font-bold text-amber-400 text-2xl">{formatCurrency(invoice.amount, invoice.currency)}</p>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="border-t border-ink-100 pt-6">
                <p className="text-xs font-bold text-ink-400 uppercase tracking-widest mb-2">Notes</p>
                <p className="text-ink-600 text-sm leading-relaxed whitespace-pre-line">{invoice.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-ink-100 mt-8 pt-6 text-center">
              <p className="text-ink-300 text-xs">Generated with <span className="font-semibold text-amber-500">InvoicePro</span> · Thank you for your business!</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
