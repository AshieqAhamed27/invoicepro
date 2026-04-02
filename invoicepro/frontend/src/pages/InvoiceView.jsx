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
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
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

  // ✅ FINAL PDF FUNCTION
  const handleDownloadPDF = () => {
    setDownloading(true);

    const element = printRef.current;

    const opt = {
      margin: 10,
      filename: `${invoice.invoiceNumber}-${invoice.clientName}.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 3, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(() => setDownloading(false));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <p>{error}</p>
      </div>
    );
  }

  const companyName = user?.companyName || user?.name || 'Your Company';

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="max-w-3xl mx-auto p-4">
        {/* BUTTON */}
        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="mb-4 bg-black text-white px-4 py-2 rounded"
        >
          {downloading ? 'Generating...' : 'Download PDF'}
        </button>

        {/* INVOICE */}
        <div
          ref={printRef}
          className="bg-white text-black p-6 rounded shadow"
          style={{ fontFamily: 'Arial' }}
        >
          {/* HEADER */}
          <div className="flex justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold">{companyName}</h1>
              <p>{user?.email}</p>
            </div>

            <div className="text-right">
              <p className="text-sm">Invoice</p>
              <p className="font-bold">{invoice.invoiceNumber}</p>
            </div>
          </div>

          {/* CLIENT */}
          <div className="mb-4">
            <p><strong>Bill To:</strong></p>
            <p>{invoice.clientName}</p>
            <p>{invoice.clientEmail}</p>
          </div>

          {/* DATES */}
          <div className="mb-4">
            <p><strong>Date:</strong> {formatDate(invoice.date)}</p>
            {invoice.dueDate && (
              <p><strong>Due:</strong> {formatDate(invoice.dueDate)}</p>
            )}
          </div>

          {/* SERVICE */}
          <div className="mb-4">
            <p><strong>Description:</strong></p>
            <p>{invoice.serviceDescription}</p>
          </div>

          {/* TOTAL */}
          <div className="text-right mt-6">
            <h2 className="text-xl font-bold">
              {formatCurrency(invoice.amount, invoice.currency)}
            </h2>
          </div>

          {/* NOTES */}
          {invoice.notes && (
            <div className="mt-6">
              <p><strong>Notes:</strong></p>
              <p>{invoice.notes}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}