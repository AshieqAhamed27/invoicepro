import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getUser();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const handleDownloadPDF = () => {
    html2pdf()
      .set({
        margin: 8,
        filename: `invoice-${invoice.invoiceNumber}.pdf`,
        html2canvas: { scale: 2 },
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
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <main className="container-custom py-6">

        {/* ACTION BAR */}
        <div className="flex flex-wrap gap-2 mb-6">

          {invoice.status !== 'paid' && (
            <button onClick={markAsPaid} className="btn btn-primary">
              Mark as Paid
            </button>
          )}

          <button onClick={handleDownloadPDF} className="btn btn-dark">
            Download PDF
          </button>

          <button onClick={deleteInvoice} className="btn bg-red-500 text-white">
            Delete
          </button>

        </div>

        {/* STATUS BADGE */}
        <div className="mb-4">
          <span className={`px-3 py-1 rounded-full text-sm
            ${invoice.status === 'paid'
              ? 'bg-green-500/20 text-green-400'
              : 'bg-yellow-500/20 text-yellow-400'}`}>
            {invoice.status === 'paid' ? 'Paid' : 'Pending'}
          </span>
        </div>

        {/* INVOICE */}
        <div
          ref={printRef}
          className="bg-white text-black rounded-2xl p-6 max-w-3xl mx-auto"
        >

          <h2 className="text-xl font-bold mb-4">
            {companyName}
          </h2>

          <div className="mb-4">
            <p className="text-gray-500">Client</p>
            <p>{invoice.clientName}</p>
          </div>

          {/* ITEMS */}
          <div className="mb-4 border rounded">
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