import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import Navbar from '../components/Navbar';
import html2pdf from 'html2pdf.js/dist/html2pdf.min.js';

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
  const user = getUser();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
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
      alert('Invoice not found');
    } finally {
      setLoading(false);
    }
  };

  // ✅ PDF FUNCTION
  const handleDownloadPDF = () => {
    const element = printRef.current;

    if (!element) {
      alert("PDF error: content not found");
      return;
    }

    const opt = {
      margin: 10,
      filename: `invoice-${invoice.invoiceNumber}.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <p>Loading...</p>
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
          className="mb-4 bg-black hover:bg-gray-800 text-white px-5 py-2 rounded-lg"
        >
          Download PDF
        </button>

        {/* INVOICEgit add . */}
        <div
          ref={printRef}
          className="bg-white text-black p-8 rounded-xl shadow-lg border"
          style={{ fontFamily: 'Arial' }}
        >

          {/* HEADER */}
          <div className="flex justify-between items-center border-b pb-4 mb-6">

            <div>
              {/* ✅ LOGO */}
              {invoice.logo && (
                <img src={invoice.logo} alt="logo" className="h-12 mb-2" />
              )}

              <h1 className="text-2xl font-bold text-gray-800">
                {companyName}
              </h1>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>

            <div className="text-right">
              <p className="text-xs text-gray-400">INVOICE</p>
              <p className="font-bold text-lg">{invoice.invoiceNumber}</p>
            </div>

          </div>

          {/* CLIENT */}
          <div className="mb-6">
            <p className="text-sm text-gray-500">Bill To</p>
            <p className="font-semibold text-gray-800">{invoice.clientName}</p>
            <p className="text-gray-600">{invoice.clientEmail}</p>
          </div>

          {/* DATES */}
          <div className="mb-6">
            <p><strong>Date:</strong> {formatDate(invoice.date)}</p>
            {invoice.dueDate && (
              <p><strong>Due:</strong> {formatDate(invoice.dueDate)}</p>
            )}
          </div>

          {/* TABLE */}
          <div className="border rounded-lg overflow-hidden mb-6">

            <div className="bg-gray-100 px-4 py-2 flex justify-between text-sm font-semibold">
              <span>Description</span>
              <span>Amount</span>
            </div>

            <div className="px-4 py-3 flex justify-between">
              <span>{invoice.serviceDescription}</span>
              <span className="font-bold">
                {formatCurrency(invoice.amount, invoice.currency)}
              </span>
            </div>

          </div>

          {/* TOTAL */}
          <div className="text-right mb-6">
            <p className="text-gray-500 text-sm">Total</p>
            <h2 className="text-2xl font-bold text-green-600">
              {formatCurrency(invoice.amount, invoice.currency)}
            </h2>
          </div>

          {/* NOTES */}
          {invoice.notes && (
            <div className="border-t pt-4">
              <p className="text-sm text-gray-500">Notes</p>
              <p>{invoice.notes}</p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}