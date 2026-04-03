import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import Navbar from '../components/Navbar';
import html2pdf from 'html2pdf.js/dist/html2pdf.min.js';

const formatCurrency = (amount, currency) => {
  const symbol = currency === 'INR' ? '₹' : '$';
  return `${symbol}${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2
  })}`;
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

  const handleDownloadPDF = () => {
    const element = printRef.current;

    if (!element) {
      alert('PDF error');
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
        Loading...
      </div>
    );
  }

  if (!invoice) return null;

  const companyName = user?.companyName || user?.name || 'InvoicePro';

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

        {/* INVOICE */}
        <div
          ref={printRef}
          className="bg-white text-black p-6 rounded shadow"
          style={{ fontFamily: 'Arial' }}
        >

          {/* HEADER */}
          <div className="border-b pb-4 mb-6">

            <div className="flex justify-between items-center">

              {/* LEFT */}
              <div>
                <h1 className="text-2xl font-bold">
                  {companyName}
                </h1>

                <p className="text-sm text-gray-500">
                  https://www.invoicepro.com
                </p>

                <p className="text-sm text-gray-400">
                  Professional Invoice Generator
                </p>
              </div>

              {/* RIGHT */}
              <div className="text-right">
                <p className="text-sm text-gray-400">INVOICE</p>
                <p className="font-bold text-xl">
                  {invoice.invoiceNumber}
                </p>
              </div>

            </div>

            {/* CENTER LOGO */}
            <div className="flex justify-center mt-4">
              <img
                src={
                  invoice?.logo ||
                  "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                }
                alt="logo"
                className="h-12 object-contain"
              />
            </div>

          </div>

          {/* CLIENT */}
          <div className="mb-4">
            <p><strong>Bill To:</strong></p>
            <p>{invoice.clientName}</p>
            <p>{invoice.clientEmail}</p>
          </div>

          {/* DATE */}
          <div className="mb-4">
            <p><strong>Date:</strong> {formatDate(invoice.date)}</p>
            {invoice.dueDate && (
              <p><strong>Due:</strong> {formatDate(invoice.dueDate)}</p>
            )}
          </div>

          {/* TABLE */}
          <div className="border rounded-lg overflow-hidden mb-6">

            <div className="bg-gray-100 px-4 py-2 flex justify-between font-semibold">
              <span>Description</span>
              <span>Amount</span>
            </div>

            <div className="px-4 py-3 flex justify-between">
              <div>
                <p className="font-medium">{invoice.serviceDescription}</p>
                <p className="text-xs text-gray-400">
                  This invoice includes service delivery, support, and completion as agreed.
                </p>
              </div>

              <span className="font-bold">
                {formatCurrency(invoice.amount, invoice.currency)}
              </span>
            </div>

          </div>

          {/* TOTAL */}
          <div className="text-right mt-6">
            <p className="text-gray-500">Total</p>
            <h2 className="text-xl font-bold text-green-600">
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

          {/* FOOTER */}
          <div className="mt-8 text-center text-xs text-gray-400">
            Thank you for your business 🙏
          </div>

        </div>
      </main>
    </div>
  );
}