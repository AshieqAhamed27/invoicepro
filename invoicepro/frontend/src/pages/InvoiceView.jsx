import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import Navbar from '../components/Navbar';
import QRCode from 'react-qr-code';

const formatCurrency = (amount, currency) => {
  const symbol = currency && currency !== 'INR' ? '$' : '₹';
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
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

      <main className="container-custom py-8">

        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-yellow-400">Invoice</p>
            <h1 className="text-3xl font-semibold">
              {invoice.invoiceNumber}
            </h1>
          </div>

          <div className="flex gap-2 flex-wrap">
            {invoice.status !== 'paid' && (
              <button onClick={markAsPaid} className="btn btn-primary">
                Mark as Paid
              </button>
            )}

            <button onClick={deleteInvoice} className="btn btn-dark">
              Delete
            </button>
          </div>
        </div>

        {/* STATUS */}
        <div className="mb-4">
          <span className={`badge ${invoice.status === 'paid'
              ? 'badge-green'
              : 'badge-yellow'
            }`}>
            {invoice.status === 'paid' ? 'Paid' : 'Pending'}
          </span>
        </div>

        {/* INVOICE CARD */}
        <div
          ref={printRef}
          className="mx-auto max-w-3xl bg-white text-black p-6 rounded-xl"
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
                onClick={() => window.location.href = upiLink}
                className="btn btn-primary mt-4"
              >
                Pay via UPI
              </button>

            </div>
          )}

        </div>

      </main>
    </div>
  );
}