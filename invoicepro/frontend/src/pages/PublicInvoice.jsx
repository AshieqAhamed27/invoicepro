import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';
import QRCode from 'react-qr-code';
import BrandLogo from '../components/BrandLogo';
import { getSafeRemoteImageUrl } from '../utils/safeUrl';
import { COMPANY_NAME, COMPANY_SHORT_NAME, COMPANY_LOGO } from '../utils/company';
import { trackEvent } from '../utils/analytics';

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
  const symbol = currency && currency !== 'INR' ? `${currency} ` : 'Rs ';
  return `${symbol}${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2
  })}`;
};

const formatDate = (value) => {
  if (!value) return '--';

  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const isDatePastEndOfDay = (value) => {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  date.setHours(23, 59, 59, 999);
  return date < new Date();
};

const firstText = (...values) => {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }

  return '';
};

const legacyBrandNames = new Set([
  'invoicepro',
  'invoice pro',
  'invoicepro billing technologies'
]);

const normalizeName = (value = '') =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const getCleanBusinessName = (value, personalName = '') => {
  const text = String(value || '').trim();
  const normalized = normalizeName(text);

  if (!text) return '';
  if (legacyBrandNames.has(normalized)) return '';
  if (personalName && normalized === normalizeName(personalName)) return '';

  return text;
};

export default function PublicInvoice() {
  const { id } = useParams();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const res = await api.get(`/invoices/public/${id}`);
      setInvoice(res.data.invoice);
    } catch (err) {
      console.error(err);
      alert('Document not found');
    } finally {
      setLoading(false);
    }
  };

  const invoiceMeta = useMemo(() => {
    if (!invoice) return null;

    const isProposal = invoice.documentType === 'proposal';
    const proposalExpired = isProposal
      && invoice.proposalStatus !== 'accepted'
      && invoice.proposalStatus !== 'expired'
      && invoice.validUntil
      && isDatePastEndOfDay(invoice.validUntil);

    return {
      isProposal,
      status: isProposal
        ? (proposalExpired ? 'expired' : (invoice.proposalStatus || 'draft'))
        : invoice.status === 'pending' && isDatePastEndOfDay(invoice.dueDate)
          ? 'overdue'
          : invoice.status,
      title: isProposal ? 'Proposal' : 'Invoice',
      idLabel: isProposal ? 'Proposal Number' : 'Invoice Number',
      dateLabel: isProposal ? 'Valid Until' : 'Due',
      headerNote: isProposal ? 'Review and approval portal' : 'Secured checkout portal'
    };
  }, [invoice]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07090d] text-white">
        Loading document...
      </div>
    );
  }

  if (!invoice || !invoiceMeta) return null;

  const items =
    invoice.items?.length > 0
      ? invoice.items
      : [
        {
          name: invoice.serviceDescription || 'Service',
          price: invoice.amount
        }
      ];

  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const cgst = Number(invoice.cgst || 0);
  const sgst = Number(invoice.sgst || 0);
  const total = subtotal + (subtotal * (cgst + sgst)) / 100;
  const documentDate = invoiceMeta.isProposal ? invoice.validUntil : invoice.dueDate;
  const razorpayPaymentUrl = firstText(invoice.paymentLink?.shortUrl);

  const handlePayNow = async () => {
    if (razorpayPaymentUrl) {
      trackEvent('begin_invoice_payment', {
        method: 'razorpay_payment_link',
        value: total,
        currency: invoice.currency || 'INR'
      });
      window.location.href = razorpayPaymentUrl;
      return;
    }

    try {
      setPaying(true);
      trackEvent('begin_invoice_payment', {
        method: 'razorpay',
        value: total,
        currency: invoice.currency || 'INR'
      });
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
        if (!window.confirm('SIMULATION: Pay this invoice?')) return;
        setPaying(true);

        await api.post('/payment/public/verify', {
          invoiceId: id,
          razorpay_order_id: order.id,
          razorpay_payment_id: `pay_sim_${Date.now()}`,
          razorpay_signature: 'sim_signature'
        });

        alert('Payment successful!');
        trackEvent('invoice_payment_success', {
          method: 'simulation',
          value: total,
          currency: invoice.currency || 'INR'
        });
        fetchInvoice();
        return;
      }

      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: COMPANY_SHORT_NAME,
        description: `Invoice ${invoice.invoiceNumber}`,
        order_id: order.id,
        prefill: {
          name: invoice.clientName,
          email: invoice.clientEmail
        },
        theme: { color: '#FACC15' },
        modal: {
          ondismiss: function() {
            setPaying(false);
          }
        },
        retry: { enabled: false },
        handler: async (response) => {
          try {
            await api.post('/payment/public/verify', {
              invoiceId: id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            alert('Payment successful!');
            trackEvent('invoice_payment_success', {
              method: 'razorpay',
              value: total,
              currency: invoice.currency || 'INR'
            });
            fetchInvoice();
          } catch {
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

  const handleAcceptProposal = async () => {
    try {
      setAccepting(true);
      await api.post(`/invoices/public/${id}/accept`);
      await fetchInvoice();
      trackEvent('accept_proposal', {
        value: total,
        currency: invoice.currency || 'INR'
      });
      alert('Proposal accepted successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept proposal.');
    } finally {
      setAccepting(false);
    }
  };

  const business = invoice.businessSnapshot || {};
  const snapshotName = firstText(business.name);
  const personalName = firstText(invoice.user?.name);
  const businessSnapshotName = getCleanBusinessName(snapshotName, personalName);
  const companyName = firstText(
    businessSnapshotName,
    getCleanBusinessName(invoice.user?.companyName, personalName),
    COMPANY_NAME
  );
  const companyAddress = firstText(business.address, invoice.user?.address, 'Tamil Nadu, India');
  const companyLogo = firstText(business.logo, invoice.user?.logo, COMPANY_LOGO);
  const companyUpi = firstText(invoice.upiId, business.upiId, invoice.user?.upiId);

  const upiUri = !invoiceMeta.isProposal && invoice.status === 'pending' && companyUpi
    ? `upi://pay?pa=${companyUpi}&pn=${encodeURIComponent(companyName)}&am=${total.toFixed(2)}&tn=${encodeURIComponent(`Invoice ${invoice.invoiceNumber}`)}`
    : '';
  const paymentQrValue = razorpayPaymentUrl || upiUri || window.location.href;

  const badgeContent = invoiceMeta.isProposal
    ? invoiceMeta.status === 'accepted'
      ? { label: 'Accepted', className: 'bg-emerald-500' }
      : invoiceMeta.status === 'expired'
        ? { label: 'Expired', className: 'bg-red-500' }
        : { label: 'Proposal', className: 'bg-sky-500' }
    : invoice.status === 'paid'
      ? { label: 'Paid', className: 'bg-green-500' }
      : invoiceMeta.status === 'overdue'
        ? { label: 'Overdue', className: 'bg-red-500' }
        : null;

  const safeCompanyLogoUrl = getSafeRemoteImageUrl(companyLogo);

  return (
    <div className="premium-page min-h-screen px-3 py-5 sm:px-4 sm:py-10">
      <div className="reveal mx-auto max-w-4xl rounded-lg bg-white p-5 text-black shadow-2xl sm:p-8 md:p-12 relative overflow-hidden">
        {badgeContent && (
          <div className={`absolute top-6 right-[-46px] rotate-45 ${badgeContent.className} text-white px-12 py-1 text-xs font-bold shadow-md uppercase tracking-widest z-10 sm:top-12 sm:right-[-40px] sm:px-16 sm:text-lg`}>
            {badgeContent.label}
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between gap-6 border-b border-gray-200 pb-8 mb-8">
          <div>
            <div className="mb-2 flex min-w-0 items-center gap-3">
              {safeCompanyLogoUrl ? (
                <div className="h-12 w-12 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
                  <img src={safeCompanyLogoUrl} alt={`${companyName} logo`} className="h-full w-full object-contain" />
                </div>
              ) : (
                <BrandLogo showText={false} textColor="black" />
              )}
              <div className="min-w-0">
                <p className="break-words text-lg font-black leading-none text-slate-950 sm:text-xl">{companyName}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Powered by {COMPANY_SHORT_NAME}</p>
              </div>
            </div>
            <p className="text-slate-500 mt-2 font-bold uppercase text-[10px] tracking-widest">
              {invoiceMeta.headerNote}
            </p>
          </div>

          <div className="text-left md:text-right">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{invoiceMeta.idLabel}</p>
            <p className="break-words text-xl font-bold text-slate-950 sm:text-2xl">
              {invoice.invoiceNumber}
            </p>

            <div className="mt-4 space-y-1">
              <p className="text-sm text-gray-500">
                  <span className="font-semibold text-slate-500 uppercase text-[10px] mr-2">Issued:</span>
                {formatDate(invoice.date)}
              </p>
              {documentDate && (
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-slate-500 uppercase text-[10px] mr-2">{invoiceMeta.dateLabel}:</span>
                  {formatDate(documentDate)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-10 mb-10">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-3">
              {invoiceMeta.isProposal ? 'Prepared For' : 'Bill To'}
            </p>
            <h2 className="text-xl font-bold text-slate-950 leading-tight">
              {invoice.clientName}
            </h2>
            <p className="text-gray-500 mt-1 first-letter:uppercase">
              {invoice.clientEmail}
            </p>
          </div>

          {companyName && (
            <div className="md:text-right">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-3">
                From
              </p>
              <h2 className="text-xl font-bold text-slate-950 leading-tight">
                {companyName}
              </h2>
              <p className="text-gray-500 mt-1">
                {invoiceMeta.isProposal ? 'Service Proposal' : 'Professional Services'}
              </p>
              <p className="text-gray-500 mt-1 text-sm">
                {companyAddress}
              </p>
            </div>
          )}
        </div>

        <div className="mb-10 overflow-hidden rounded-xl border border-gray-100 shadow-sm">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 bg-slate-950 px-4 py-4 font-bold text-white text-xs uppercase tracking-wider sm:px-6 sm:text-sm">
            <span>Description</span>
            <span className="text-right">Amount</span>
          </div>

          <div className="divide-y divide-gray-50">
            {items.map((item, index) => (
              <div
                key={index}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 bg-white px-4 py-5 transition-colors hover:bg-slate-50 sm:px-6"
              >
                <div className="min-w-0">
                  <p className="break-words font-semibold text-slate-950">{item.name}</p>
                </div>
                <p className="text-right font-bold text-slate-950 whitespace-nowrap">
                  {formatCurrency(item.price, invoice.currency)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between gap-10">
          <div className="flex-1">
            {!invoiceMeta.isProposal && invoice.status === 'pending' && (
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-6">
                <div className="flex flex-col sm:flex-row gap-6 items-center">
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                    <QRCode value={paymentQrValue} size={96} />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-sm font-bold text-gray-900 mb-1">
                      {razorpayPaymentUrl ? 'Scan to pay with Razorpay' : 'Scan to pay instantly'}
                    </p>
                    <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                      {razorpayPaymentUrl
                        ? 'Use this secure Razorpay hosted link to pay by card, UPI, netbanking, or supported international methods.'
                        : 'Use any UPI app like GPay, PhonePe, or Paytm to scan and pay the total amount.'}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handlePayNow}
                        disabled={paying}
                        className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-slate-950 text-white rounded-lg font-black text-sm shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest"
                      >
                        {paying ? 'Opening...' : razorpayPaymentUrl ? 'Pay Securely' : 'Razorpay Secure'}
                      </button>
                      {upiUri && (
                        <button
                          onClick={() => {
                            trackEvent('begin_invoice_payment', {
                              method: 'upi_app',
                              value: total,
                              currency: invoice.currency || 'INR'
                            });
                            window.location.href = upiUri;
                          }}
                          className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-emerald-500 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-emerald-600 transition-all active:scale-95 uppercase tracking-widest md:hidden"
                        >
                          Pay via UPI App
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!invoiceMeta.isProposal && invoice.status === 'paid' && (
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

            {invoiceMeta.isProposal && invoiceMeta.status !== 'accepted' && invoiceMeta.status !== 'expired' && (
              <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-6">
                <p className="text-sm font-bold text-sky-900 mb-1">Ready for approval</p>
                <p className="text-xs text-sky-700 leading-relaxed mb-4">
                  Review the scope and total, then accept this proposal to move forward.
                </p>
                <button
                  onClick={handleAcceptProposal}
                  disabled={accepting}
                  className="px-8 py-3 bg-slate-950 text-white rounded-lg font-black text-sm shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest"
                >
                  {accepting ? 'Accepting...' : 'Accept Proposal'}
                </button>
              </div>
            )}

            {invoiceMeta.isProposal && invoiceMeta.status === 'accepted' && (
              <div className="rounded-xl bg-green-50 border border-green-100 p-6">
                <p className="font-bold text-green-800">Proposal accepted</p>
                <p className="text-sm text-green-600 mt-1">
                  This proposal was approved on {formatDate(invoice.proposalAcceptedAt)}.
                </p>

                {invoice.convertedToInvoiceId && (
                  <a
                    href={`/public/invoice/${invoice.convertedToInvoiceId}`}
                    className="mt-4 inline-flex px-6 py-3 rounded-lg bg-slate-950 text-white text-xs font-black uppercase tracking-widest"
                  >
                    Open Invoice
                  </a>
                )}
              </div>
            )}

            {invoiceMeta.isProposal && invoiceMeta.status === 'expired' && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-6">
                <p className="font-bold text-red-800">Proposal expired</p>
                <p className="text-sm text-red-600 mt-1">
                  This proposal is no longer valid. Please contact {companyName || 'the provider'} for an updated version.
                </p>
              </div>
            )}
          </div>

          <div className="w-full max-w-sm space-y-3">
            <div className="flex justify-between text-gray-500 text-sm font-medium">
              <span>Subtotal</span>
                <span className="text-slate-950">{formatCurrency(subtotal, invoice.currency)}</span>
            </div>

            {cgst > 0 && (
              <div className="flex justify-between text-gray-500 text-sm font-medium">
                <span>CGST ({cgst}%)</span>
                <span className="text-slate-950">{formatCurrency((subtotal * cgst) / 100, invoice.currency)}</span>
              </div>
            )}

            {sgst > 0 && (
              <div className="flex justify-between text-gray-500 text-sm font-medium">
                <span>SGST ({sgst}%)</span>
                <span className="text-slate-950">{formatCurrency((subtotal * sgst) / 100, invoice.currency)}</span>
              </div>
            )}

            <div className="border-t border-gray-200 pt-5 mt-5 flex justify-between items-baseline">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                {invoiceMeta.isProposal ? 'Proposal Total' : 'Total Amount'}
              </span>
              <div className="text-right">
                <span className="block text-4xl font-black text-slate-950">
                  {formatCurrency(total, invoice.currency)}
                </span>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter mt-1">Inclusive of all taxes</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-400">
            Thank you for your business. For any queries, please contact <span className="font-semibold text-gray-600">{companyName || 'the provider'}</span>.
          </p>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-zinc-500 flex items-center justify-center gap-2">
          Powered by <span className="font-bold tracking-tight text-zinc-400 flex items-center gap-1">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L1 21h22L12 2zm0 3.45l8.1 14.1H3.9L12 5.45z" />
            </svg>
            {COMPANY_SHORT_NAME}
          </span>
        </p>
      </div>
    </div>
  );
}
