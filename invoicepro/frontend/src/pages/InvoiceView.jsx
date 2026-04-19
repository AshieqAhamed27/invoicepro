import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import Navbar from '../components/Navbar';
import QRCode from 'react-qr-code';

const formatCurrency = (amount, currency) => {
  const symbol = currency && currency !== 'INR' ? '$' : 'Rs. ';
  return `${symbol}${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2
  })}`;
};

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getUser();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const printRef = useRef();

  useEffect(() => {
    fetchInvoice();
  }, []);

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

  // ✅ MARK AS PAID
  const markAsPaid = async () => {
    try {
      await api.put(`/invoices/${invoice._id}/status`, {
        status: 'paid'
      });

      setInvoice(prev => ({ ...prev, status: 'paid' }));
    } catch {
      alert('Failed to update');
    }
  };

  // ✅ DELETE
  const deleteInvoice = async () => {
    if (!window.confirm("Delete this invoice?")) return;

    try {
      await api.delete(`/invoices/${invoice._id}`);
      alert("Deleted successfully");
      navigate('/dashboard');
    } catch {
      alert("Delete failed");
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      const module = await import('html2pdf.js/dist/html2pdf.min.js');
      const html2pdf = module.default || module;

      await html2pdf()
        .set({
          margin: 8,
          filename: `invoice-${invoice.invoiceNumber}.pdf`,
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4' }
        })
        .from(printRef.current)
        .save();
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        Loading invoice...
      </div>
    );
  }

  if (!invoice) return null;

  const companyName = user?.companyName || user?.name || 'InvoicePro';

  const items =
    invoice.items?.length > 0
      ? invoice.items
      : [{ name: invoice.serviceDescription || 'Service', price: invoice.amount }];

  const total = items.reduce((s, i) => s + Number(i.price || 0), 0);

  const finalUpi = invoice.upiId || user?.upiId || '';

  const upiLink =
    finalUpi &&
    `upi://pay?pa=${finalUpi}&pn=${encodeURIComponent(companyName)}&am=${total}&cu=INR`;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="container-custom py-8">

        <div className="reveal mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold text-yellow-300">Invoice</p>
            <h1 className="text-3xl font-semibold">
              {invoice.invoiceNumber}
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            {invoice.status !== 'paid' && (
              <button onClick={markAsPaid} className="btn btn-primary">
                Mark as Paid
              </button>
            )}

            <button onClick={handleDownloadPDF} disabled={downloading} className="btn btn-secondary">
              {downloading ? 'Preparing PDF...' : 'Download PDF'}
            </button>

            <button onClick={deleteInvoice} className="btn btn-danger">
              Delete
            </button>
          </div>

        </div>

        {/* STATUS BADGE */}
        <div className="mb-4">
          <span className={`badge ${invoice.status === 'paid' ? 'badge-green' : 'badge-yellow'}`}>
            {invoice.status === 'paid' ? 'Paid' : 'Pending'}
          </span>
        </div>

        {/* INVOICE */}
        <div
          ref={printRef}
          className="reveal reveal-delay-1 mx-auto max-w-3xl rounded-lg bg-white p-6 text-black shadow-2xl"
        >

          <h2 className="text-xl font-bold mb-4">
            {companyName}
          </h2>

          <div className="mb-4">
            <p className="text-gray-500">Client</p>
            <p>{invoice.clientName}</p>
          </div>

          {/* ITEMS */}
          <div className="mb-4 overflow-hidden rounded-lg border">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between p-3 border-b">
                <span>{item.name}</span>
                <span>{formatCurrency(item.price)}</span>
              </div>
            ))}
          </div>

          {/* TOTAL */}
          <div className="flex justify-between font-bold text-lg mb-6">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>

          {/* PAYMENT */}
          {invoice.status !== 'paid' && finalUpi && (
            <div className="text-center border-t pt-6">

              <h3 className="mb-3">Pay via UPI</h3>

              <QRCode value={upiLink} size={140} />

              <button
                onClick={() => (window.location.href = upiLink)}
                className="btn btn-primary mt-4"
              >
                Pay Now
              </button>

            </div>
          )}

        </div>

      </main>
    </div>
  );
}
