import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import Navbar from '../components/Navbar';
import html2pdf from 'html2pdf.js/dist/html2pdf.min.js';

const formatCurrency = (amount, currency) => {
  const symbol = currency === 'INR' ? '₹' : '$';
  return `${symbol}${Number(amount || 0).toLocaleString('en-IN', {
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
    if (id) fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const res = await api.get(`/invoices/${id}`);
      setInvoice(res.data.invoice);
    } catch (err) {
      console.error(err);
      alert('Invoice not found');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    const element = printRef.current;

    const opt = {
      margin: 8,
      filename: `invoice-${invoice.invoiceNumber}.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      }
    };

    html2pdf().set(opt).from(element).save();
  };

  const handleWhatsAppReminder = () => {
    const dueDate = invoice.dueDate
      ? formatDate(invoice.dueDate)
      : 'soon';

    const totalAmount = formatCurrency(total, invoice.currency);

    const message = `Hi ${invoice.clientName}, this is a friendly reminder for invoice ${invoice.invoiceNumber} of ${totalAmount}, due on ${dueDate}. Kindly complete the payment. Thank you.`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');
  };

  const handleCopyShareLink = async () => {
    const link = `${window.location.origin}/public/invoice/${invoice._id}`;

    try {
      await navigator.clipboard.writeText(link);
      alert('Invoice link copied!');
    } catch {
      alert('Failed to copy link');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white flex justify-center items-center">
        Loading invoice...
      </div>
    );
  }

  if (!invoice) return null;

  const companyName =
    user?.companyName || user?.name || 'InvoicePro';

  const items =
    invoice.items?.length > 0
      ? invoice.items
      : [
          {
            name:
              invoice.serviceDescription || 'Service',
            price: invoice.amount
          }
        ];

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.price || 0),
    0
  );

  const cgst = Number(invoice.cgst || 0);
  const sgst = Number(invoice.sgst || 0);

  const total = subtotal + (subtotal * (cgst + sgst)) / 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-8">

        {/* ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 mb-6">

          <button
            onClick={handleCopyShareLink}
            className="bg-blue-500 hover:bg-blue-400 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition"
          >
            Copy Share Link
          </button>

          <button
            onClick={handleWhatsAppReminder}
            className="bg-green-500 hover:bg-green-400 text-black px-6 py-3 rounded-xl font-semibold shadow-lg transition"
          >
            WhatsApp Reminder
          </button>

          <button
            onClick={handleDownloadPDF}
            className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 rounded-xl font-semibold shadow-lg transition"
          >
            Download PDF
          </button>

        </div>

        {/* INVOICE PAPER */}
        <div
          ref={printRef}
          className="bg-white text-black rounded-2xl shadow-2xl p-8 md:p-12"
        >

          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between gap-6 border-b border-gray-200 pb-8 mb-8">

            <div>
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={
                    invoice.logo ||
                    'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
                  }
                  alt="logo"
                  className="w-14 h-14 object-contain"
                />

                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {companyName}
                  </h1>

                  <p className="text-sm text-gray-500">
                    Professional Invoice
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-500">
                Generated with InvoicePro
              </p>
            </div>

            <div className="text-left md:text-right">
              <p className="text-sm text-gray-500 mb-1">
                Invoice Number
              </p>

              <p className="text-2xl font-bold text-gray-900 mb-4">
                {invoice.invoiceNumber}
              </p>

              <p className="text-sm text-gray-500">
                Date: {formatDate(invoice.date)}
              </p>

              {invoice.dueDate && (
                <p className="text-sm text-gray-500">
                  Due: {formatDate(invoice.dueDate)}
                </p>
              )}
            </div>

          </div>

          {/* BILL TO */}
          <div className="mb-10">
            <p className="text-sm uppercase tracking-wide text-gray-400 mb-2">
              Bill To
            </p>

            <h2 className="text-xl font-semibold text-gray-900">
              {invoice.clientName}
            </h2>

            <p className="text-gray-600">
              {invoice.clientEmail}
            </p>

            {invoice.gst && (
              <p className="text-sm text-gray-500 mt-2">
                GST: {invoice.gst}
              </p>
            )}
          </div>

          {/* ITEMS */}
          <div className="overflow-hidden border border-gray-200 rounded-2xl mb-10">

            <div className="grid grid-cols-2 bg-gray-100 px-6 py-4 font-semibold text-gray-700">
              <span>Description</span>
              <span className="text-right">Amount</span>
            </div>

            {items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-2 px-6 py-4 border-t border-gray-100"
              >
                <p className="font-medium text-gray-800">
                  {item.name}
                </p>

                <p className="text-right font-semibold">
                  {formatCurrency(item.price, invoice.currency)}
                </p>
              </div>
            ))}

          </div>

          {/* TOTAL */}
          <div className="flex justify-end mb-10">
            <div className="w-full max-w-sm space-y-3">

              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal, invoice.currency)}</span>
              </div>

              {cgst > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>CGST ({cgst}%)</span>
                  <span>{formatCurrency((subtotal * cgst) / 100, invoice.currency)}</span>
                </div>
              )}

              {sgst > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>SGST ({sgst}%)</span>
                  <span>{formatCurrency((subtotal * sgst) / 100, invoice.currency)}</span>
                </div>
              )}

              <div className="border-t pt-4 flex justify-between text-2xl font-bold">
                <span>Total</span>
                <span className="text-green-600">
                  {formatCurrency(total, invoice.currency)}
                </span>
              </div>

            </div>
          </div>

          {/* NOTES */}
          {invoice.notes && (
            <div className="border-t border-gray-200 pt-6">
              <p className="text-sm uppercase text-gray-400 mb-2">
                Notes
              </p>

              <p className="text-gray-700 leading-relaxed">
                {invoice.notes}
              </p>
            </div>
          )}

          {/* FOOTER */}
          <div className="mt-12 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-400 text-sm">
              Thank you for your business 🙏
            </p>
          </div>

        </div>

      </main>
    </div>
  );
}