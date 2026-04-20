import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';
import QRCode from 'react-qr-code';
import BrandLogo from '../components/BrandLogo';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const formatCurrency = (amount, currency) => {
  const symbol = currency && currency !== 'INR' ? '$' : '₹ ';
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
  const [paying, setPaying] = useState(false);

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

  const handlePayNow = async () => {
    try {
      setPaying(true);
      const isLoaded = await loadRazorpayScript();

      if (!isLoaded) {
        alert('Razorpay failed to load');
        return;
      }

      const orderRes = await api.post('/payment/public/order', {
        invoiceId: id
      });

      const { keyId, order, simulation } = orderRes.data;

      if (simulation) {
        setPaying(false);
        if (!window.confirm("SIMULATION: Pay this invoice?")) return;
        setPaying(true);

        await api.post('/payment/public/verify', {
          invoiceId: id,
          razorpay_order_id: order.id,
          razorpay_payment_id: 'pay_sim_' + Date.now(),
          razorpay_signature: 'sim_signature'
        });

        alert('Payment successful!');
        fetchInvoice();
        return;
      }

      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'InvoicePro',
        description: `Invoice ${invoice.invoiceNumber}`,
        order_id: order.id,
        prefill: {
          name: invoice.clientName,
          email: invoice.clientEmail
        },
        theme: { color: '#111827' },
        handler: async (response) => {
          try {
            await api.post('/payment/public/verify', {
              invoiceId: id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            alert('Payment successful!');
            fetchInvoice();
          } catch (err) {
            alert('Verification failed');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      alert(err.response?.data?.message || 'Payment failed to start');
    } finally {
      setPaying(false);
    }
  };

  const upiUri = invoice.status === 'pending' ? `upi://pay?pa=${invoice.user?.upiId || invoice.upiId}&pn=${encodeURIComponent(invoice.user?.companyName || 'Service Provider')}&am=${total.toFixed(2)}&tn=${encodeURIComponent('Invoice ' + invoice.invoiceNumber)}` : '';

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-10">
      <div className="reveal mx-auto max-w-4xl rounded-lg bg-white p-8 text-black shadow-2xl md:p-12 relative overflow-hidden">
        {invoice.status === 'paid' && (
          <div className="absolute top-12 right-[-40px] rotate-45 bg-green-500 text-white px-16 py-1 font-bold text-lg shadow-md uppercase tracking-widest z-10">
            Paid
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between gap-6 border-b border-gray-200 pb-8 mb-8">
          <div>
            <div className="mb-2">
               <BrandLogo showText={true} textColor="black" />
            </div>
            <p className="text-gray-400 mt-2 font-bold uppercase text-[10px] tracking-widest">
              Secured Checkout Portal
            </p>
          </div>

          <div className="text-left md:text-right">
            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Invoice Number</p>
            <p className="text-2xl font-bold text-gray-900">
              {invoice.invoiceNumber}
            </p>

            <div className="mt-4 space-y-1">
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-400 uppercase text-[10px] mr-2">Issued:</span>
                {formatDate(invoice.date)}
              </p>
              {invoice.dueDate && (
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-400 uppercase text-[10px] mr-2">Due:</span>
                  {formatDate(invoice.dueDate)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-10 mb-10">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-3">
              Bill To
            </p>
            <h2 className="text-xl font-bold text-gray-900 leading-tight">
              {invoice.clientName}
            </h2>
            <p className="text-gray-500 mt-1 first-letter:uppercase">
              {invoice.clientEmail}
            </p>
          </div>

          {invoice.user?.companyName && (
            <div className="md:text-right">
              <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-3">
                From
              </p>
              <h2 className="text-xl font-bold text-gray-900 leading-tight">
                {invoice.user.companyName}
              </h2>
              <p className="text-gray-500 mt-1">
                Professional Services
              </p>
            </div>
          )}
        </div>

        <div className="mb-10 overflow-hidden rounded-xl border border-gray-100 shadow-sm">
          <div className="grid grid-cols-[1fr_auto] bg-gray-50 px-6 py-4 font-bold text-gray-600 text-sm uppercase tracking-wider">
            <span>Description</span>
            <span className="text-right">Amount</span>
          </div>

          <div className="divide-y divide-gray-50">
            {items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_auto] px-6 py-5 items-center bg-white hover:bg-gray-50/50 transition-colors"
              >
                <div>
                  <p className="font-semibold text-gray-900">{item.name}</p>
                </div>
                <p className="text-right font-bold text-gray-900">
                  {formatCurrency(item.price, invoice.currency)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between gap-10">
          <div className="flex-1">
            {invoice.status === 'pending' && (
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-6">
                <div className="flex flex-col sm:flex-row gap-6 items-center">
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                    <QRCode value={upiUri} size={110} />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-sm font-bold text-gray-900 mb-1">Scan to pay instantly</p>
                    <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                      Use any UPI app like GPay, PhonePe or Paytm to scan and pay the total amount.
                    </p>
                    <button
                      onClick={handlePayNow}
                      disabled={paying}
                      className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 text-white rounded-lg font-bold text-sm shadow-lg hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                    >
                      {paying ? 'Processing...' : 'Pay with Razorpay'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {invoice.status === 'paid' && (
              <div className="rounded-xl bg-green-50 border border-green-100 p-6 flex items-center gap-4">
                <div className="h-10 w-10 bg-green-500 rounded-full flex items-center justify-center text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-green-800">Verified Payment</p>
                  <p className="text-sm text-green-600">This invoice was marked as paid on {formatDate(invoice.paidAt)}.</p>
                </div>
              </div>
            )}
          </div>

          <div className="w-full max-w-sm space-y-3">
            <div className="flex justify-between text-gray-500 text-sm font-medium">
              <span>Subtotal</span>
              <span className="text-gray-900">{formatCurrency(subtotal, invoice.currency)}</span>
            </div>

            {cgst > 0 && (
              <div className="flex justify-between text-gray-500 text-sm font-medium">
                <span>CGST ({cgst}%)</span>
                <span className="text-gray-900">{formatCurrency((subtotal * cgst) / 100, invoice.currency)}</span>
              </div>
            )}

            {sgst > 0 && (
              <div className="flex justify-between text-gray-500 text-sm font-medium">
                <span>SGST ({sgst}%)</span>
                <span className="text-gray-900">{formatCurrency((subtotal * sgst) / 100, invoice.currency)}</span>
              </div>
            )}

            <div className="border-t border-gray-200 pt-5 mt-5 flex justify-between items-baseline">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Total Amount</span>
              <div className="text-right">
                <span className="block text-4xl font-black text-gray-900">
                  {formatCurrency(total, invoice.currency)}
                </span>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter mt-1">Inclusive of all taxes</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-400">
            Thank you for your business. For any queries, please contact <span className="font-semibold text-gray-600">{invoice.user?.companyName || 'the provider'}</span>.
          </p>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-zinc-500 flex items-center justify-center gap-2">
          Powered by <span className="font-bold tracking-tight text-zinc-400 flex items-center gap-1">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L1 21h22L12 2zm0 3.45l8.1 14.1H3.9L12 5.45z" />
            </svg>
            InvoicePro
          </span>
        </p>
      </div>
    </div>
  );
}
