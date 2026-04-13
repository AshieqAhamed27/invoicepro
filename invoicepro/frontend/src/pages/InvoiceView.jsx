import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import Navbar from '../components/Navbar';
import html2pdf from 'html2pdf.js/dist/html2pdf.min.js';
import QRCode from 'react-qr-code';

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
    if (id) {
      fetchInvoice();
    }
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

  const markAsPaid = async () => {
    try {
      await api.put(
        `/invoices/${invoice._id}/status`,
        {
          status: 'paid'
        }
      );

      alert('Invoice marked as paid');

      setInvoice((prev) => ({
        ...prev,
        status: 'paid'
      }));

    } catch {
      alert('Failed to update');
    }
  };

  const handleDownloadPDF = () => {
    const element = printRef.current;

    const opt = {
      margin: 8,
      filename: `invoice-${invoice.invoiceNumber}.pdf`,
      image: {
        type: 'jpeg',
        quality: 1
      },
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

    const totalAmount = formatCurrency(
      total,
      invoice.currency
    );

    const message = `Hi ${invoice.clientName}, this is a reminder for invoice ${invoice.invoiceNumber} of ${totalAmount}, due on ${dueDate}. Kindly complete the payment.`;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      '_blank'
    );
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
    user?.companyName ||
    user?.name ||
    'InvoicePro';

  const items =
    invoice.items?.length > 0
      ? invoice.items
      : [
          {
            name:
              invoice.serviceDescription ||
              'Service',
            price: invoice.amount
          }
        ];

  const subtotal = items.reduce(
    (sum, item) =>
      sum + Number(item.price || 0),
    0
  );

  const cgst = Number(invoice.cgst || 0);
  const sgst = Number(invoice.sgst || 0);

  const total =
    subtotal +
    (subtotal * (cgst + sgst)) / 100;

  const upiLink =
    invoice.upiId &&
    `upi://pay?pa=${invoice.upiId}&pn=${encodeURIComponent(
      companyName
    )}&am=${total}&cu=INR&tn=${encodeURIComponent(
      invoice.invoiceNumber
    )}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-8">

        <div className="flex flex-col sm:flex-row justify-end gap-3 mb-6">

          {invoice.status !== 'paid' && (
            <button
              onClick={markAsPaid}
              className="bg-green-500 hover:bg-green-400 text-black px-6 py-3 rounded-xl font-semibold"
            >
              Mark as Paid
            </button>
          )}

          <button
            onClick={handleCopyShareLink}
            className="bg-blue-500 hover:bg-blue-400 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Copy Share Link
          </button>

          <button
            onClick={handleWhatsAppReminder}
            className="bg-green-700 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-semibold"
          >
            WhatsApp Reminder
          </button>

          <button
            onClick={handleDownloadPDF}
            className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 rounded-xl font-semibold"
          >
            Download PDF
          </button>

        </div>

        {/* Keep the rest of your existing invoice UI exactly same */}
      </main>
    </div>
  );
}