import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';

const formatCurrency = (amount, currency) => {
  const symbol = currency && currency !== 'INR' ? '$' : 'Rs. ';
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

export default function PublicInvoice() {
  const { id } = useParams();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const res = await api.get(`/invoices/public/${id}`);
      setInvoice(res.data.invoice);
    } catch (err) {
      console.error(err);
      alert('Invoice not found');
    } finally {
      setLoading(false);
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

  const items =
    invoice.items?.length > 0
      ? invoice.items
      : [
          {
            name: invoice.serviceDescription || 'Service',
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
    <div className="min-h-screen bg-[#050505] px-4 py-10">
      <div className="reveal mx-auto max-w-4xl rounded-lg bg-white p-8 text-black shadow-2xl md:p-12">

        <div className="flex flex-col md:flex-row justify-between gap-6 border-b border-gray-200 pb-8 mb-8">

          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              InvoicePro
            </h1>

            <p className="text-gray-500 mt-2">
              Professional Invoice
            </p>
          </div>

          <div className="text-left md:text-right">
            <p className="text-sm text-gray-500">Invoice Number</p>
            <p className="text-2xl font-bold">
              {invoice.invoiceNumber}
            </p>

            <p className="text-sm text-gray-500 mt-3">
              Date: {formatDate(invoice.date)}
            </p>

            {invoice.dueDate && (
              <p className="text-sm text-gray-500">
                Due: {formatDate(invoice.dueDate)}
              </p>
            )}
          </div>

        </div>

        <div className="mb-10">
          <p className="text-sm uppercase tracking-wide text-gray-400 mb-2">
            Bill To
          </p>

          <h2 className="text-xl font-semibold">
            {invoice.clientName}
          </h2>

          <p className="text-gray-600">
            {invoice.clientEmail}
          </p>
        </div>

        <div className="mb-10 overflow-hidden rounded-lg border border-gray-200">

          <div className="grid grid-cols-2 bg-gray-100 px-6 py-4 font-semibold text-gray-700">
            <span>Description</span>
            <span className="text-right">Amount</span>
          </div>

          {items.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-2 px-6 py-4 border-t border-gray-100"
            >
              <p>{item.name}</p>

              <p className="text-right font-semibold">
                {formatCurrency(item.price, invoice.currency)}
              </p>
            </div>
          ))}

        </div>

        <div className="flex justify-end">
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

      </div>
    </div>
  );
}
