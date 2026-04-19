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
    if (id) fetchInvoice();
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

  const markAsPaid = async () => {
    try {
      await api.put(`/invoices/${invoice._id}/status`, {
        status: 'paid'
      });

      setInvoice(prev => ({ ...prev, status: 'paid' }));
      alert('Invoice marked as paid');
    } catch {
      alert('Failed to update');
    }
  };

  const handleDownloadPDF = () => {
    html2pdf()
      .set({
        margin: 8,
        filename: `invoice-${invoice.invoiceNumber}.pdf`,
        html2canvas: { scale: 2, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4' }
      })
      .from(printRef.current)
      .save();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading invoice...
      </div>
    );
  }

  if (!invoice) return null;

  const companyName = user?.companyName || user?.name || 'InvoicePro';
  const companyLogo =
    user?.logo ||
    invoice.logo ||
    'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

  const items =
    invoice.items?.length > 0
      ? invoice.items
      : [{ name: invoice.serviceDescription || 'Service', price: invoice.amount }];

  const subtotal = items.reduce((s, i) => s + Number(i.price || 0), 0);
  const total = subtotal;

  // ✅ FIXED: fallback UPI logic
  const finalUpi = invoice.upiId || user?.upiId || '';

  const upiLink =
    finalUpi &&
    `upi://pay?pa=${finalUpi}&pn=${encodeURIComponent(companyName)}&am=${total}&cu=INR`;

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <main className="container-custom py-6 sm:py-10">

        {/* ACTION BAR */}
        <div className="flex flex-col sm:flex-row gap-2 mb-6">

          {invoice.status !== 'paid' && (
            <button onClick={markAsPaid} className="btn btn-primary w-full sm:w-auto">
              Mark as Paid
            </button>
          )}

          <button onClick={handleDownloadPDF} className="btn btn-dark w-full sm:w-auto">
            Download PDF
          </button>

        </div>

        {/* INVOICE */}
        <div
          ref={printRef}
          className="bg-white text-black rounded-2xl p-4 sm:p-6 md:p-8 max-w-3xl mx-auto"
        >

          {/* HEADER */}
          <div className="flex justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">{companyName}</h2>
            </div>
            <img src={companyLogo} className="w-12 h-12" />
          </div>

          {/* CLIENT */}
          <div className="mb-6">
            <p className="text-gray-500 text-sm">Bill To</p>
            <h3 className="font-semibold">{invoice.clientName}</h3>
          </div>

          {/* ITEMS */}
          <div className="mb-6 border rounded">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between p-3 border-b">
                <span>{item.name}</span>
                <span>{formatCurrency(item.price)}</span>
              </div>
            ))}
          </div>

          {/* TOTAL */}
          <div className="flex justify-between text-lg font-bold mb-6">
            <span>Total</span>
            <span className="text-green-600">
              {formatCurrency(total)}
            </span>
          </div>

          {/* PAYMENT */}
          {finalUpi ? (
            <div className="text-center border-t pt-6">

              <h3 className="font-semibold mb-3">Pay via UPI</h3>

              <div className="flex justify-center mb-4">
                <QRCode value={upiLink} size={140} />
              </div>

              <button
                onClick={() => (window.location.href = upiLink)}
                className="btn btn-primary w-full sm:w-auto"
              >
                Pay Now
              </button>

            </div>
          ) : (
            <p className="text-red-500 text-center mt-4 text-sm">
              No UPI ID found. Add in Settings.
            </p>
          )}

        </div>

      </main>
    </div>
  );
}