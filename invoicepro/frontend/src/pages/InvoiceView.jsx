import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import { getSafeRemoteImageUrl } from '../utils/safeUrl';
import Navbar from '../components/Navbar';
import QRCode from 'react-qr-code';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

console.log("CHANGED FILE TEST");
console.log("CHANGED FILE TEST");
const formatCurrency = (amount, currency = 'INR') => {
  const symbol = currency === 'USD' ? '$' : 'Rs ';
  return `${symbol}${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2
  })}`;
};

const formatCurrencyPdf = (amount, currency = 'INR') => {
  const code = currency === 'USD' ? 'USD' : 'INR';
  return `${code} ${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2
  })}`;
};

const formatDate = (value) => {
  if (!value) return 'Not specified';

  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const loadImageForPdf = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve({ dataUrl: canvas.toDataURL('image/png'), format: 'PNG' });
    };
    img.onerror = reject;
    img.src = url;
  });

const isDatePastEndOfDay = (value) => {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  date.setHours(23, 59, 59, 999);
  return date < new Date();
};

const getProposalStatus = (invoice) => {
  const expired = invoice.validUntil
    && invoice.proposalStatus !== 'accepted'
    && invoice.proposalStatus !== 'expired'
    && isDatePastEndOfDay(invoice.validUntil);

  return expired ? 'expired' : (invoice.proposalStatus || 'draft');
};

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getUser();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [convertingProposal, setConvertingProposal] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const res = await api.get(`/invoices/${id}`);
      setInvoice(res.data.invoice);
    } catch {
      alert('Document not found');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const meta = useMemo(() => {
    if (!invoice) return null;

    const isProposal = invoice.documentType === 'proposal';
    const status = isProposal ? getProposalStatus(invoice) : invoice.status;

    return {
      isProposal,
      status,
      title: isProposal ? 'Proposal Detail' : 'Invoice Detail',
      headerLabel: isProposal ? 'Proposal Record' : 'Ledger Entry',
      typeLabel: isProposal ? 'Proposal' : 'Invoice',
      dateLabel: isProposal ? 'Valid Until' : 'Due Date'
    };
  }, [invoice]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Retrieving Ledger</p>
        </div>
      </div>
    );
  }

  if (!invoice || !meta) return null;

  const companyName = user?.companyName || user?.name || 'InvoicePro';
  const rawLogo = user?.logo?.trim();
  const logoUrl = getSafeRemoteImageUrl(rawLogo) || null;

  const items = invoice.items?.length > 0
    ? invoice.items
    : [{ name: invoice.serviceDescription || 'Service', price: invoice.amount }];
  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const total = Number(invoice.amount || 0);
  const tax = Math.max(0, total - subtotal);
  const finalUpi = invoice.upiId || user?.upiId || '';
  const publicDocumentUrl = `${window.location.origin}/public/invoice/${invoice._id}`;
  const displayDate = meta.isProposal ? invoice.validUntil : invoice.dueDate;
  const upiLink = !meta.isProposal && finalUpi
    ? `upi://pay?pa=${finalUpi}&pn=${encodeURIComponent(companyName)}&am=${invoice.amount}&cu=INR`
    : '';

  const statusClass = !meta.isProposal
    ? meta.status === 'paid'
      ? 'bg-emerald-400/5 text-emerald-400 border-emerald-400/10'
      : 'bg-yellow-400/5 text-yellow-500 border-yellow-400/10'
    : meta.status === 'accepted'
      ? 'bg-emerald-400/5 text-emerald-400 border-emerald-400/10'
      : meta.status === 'expired'
        ? 'bg-red-400/5 text-red-400 border-red-400/10'
        : 'bg-sky-400/5 text-sky-300 border-sky-400/10';

  const markAsPaid = async () => {
    try {
      await api.put(`/invoices/${invoice._id}/status`, {
        status: 'paid'
      });
      setInvoice((prev) => ({ ...prev, status: 'paid', paidAt: new Date().toISOString() }));
    } catch {
      alert('Failed to update status');
    }
  };

  const deleteInvoice = async () => {
    if (!window.confirm(`Delete this ${meta.typeLabel.toLowerCase()} permanently?`)) return;
    try {
      await api.delete(`/invoices/${invoice._id}`);
      navigate('/dashboard');
    } catch {
      alert('Delete failed');
    }
  };

  const convertProposal = async () => {
    try {
      setConvertingProposal(true);
      const res = await api.post(`/invoices/${invoice._id}/convert`);
      navigate(`/invoice/${res.data.invoice._id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to convert proposal.');
    } finally {
      setConvertingProposal(false);
    }
  };

  const downloadPdf = async () => {
    try {
      setDownloadingPdf(true);

      const doc = new jsPDF("p", "pt", "a4");

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 40;

      // ===== BACKGROUND =====
      doc.setFillColor(30, 30, 30);
      doc.rect(0, 0, pageWidth, 842, "F");

      // ===== HEADER STRIPE =====
      doc.setFillColor(255, 193, 7);
      doc.rect(0, 0, pageWidth, 80, "F");

      // ===== COMPANY =====
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(companyName, margin, 50);

      // ===== INVOICE TITLE =====
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text("INVOICE", pageWidth - margin, 120, { align: "right" });

      doc.setFontSize(10);
      doc.text(`Invoice No: #${invoice.invoiceNumber}`, pageWidth - margin, 140, { align: "right" });
      doc.text(`Date: ${formatDate(invoice.date)}`, pageWidth - margin, 155, { align: "right" });

      // ===== CLIENT =====
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 200);
      doc.text("INVOICE TO:", margin, 120);

      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text(invoice.clientName, margin, 140);
      doc.text(invoice.clientEmail || "", margin, 160);

      // ===== TABLE HEADER =====
      let startY = 200;

      doc.setFillColor(255, 193, 7);
      doc.rect(margin, startY, pageWidth - margin * 2, 25, "F");

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text("Description", margin + 10, startY + 17);
      doc.text("Price", pageWidth - 250, startY + 17);
      doc.text("Qty", pageWidth - 180, startY + 17);
      doc.text("Total", pageWidth - 100, startY + 17);

      // ===== ITEMS =====
      startY += 35;

      doc.setTextColor(255, 255, 255);

      items.forEach((item, i) => {
        const rowY = startY + i * 25;

        doc.text(item.name, margin + 10, rowY);
        doc.text(`₹${item.price}`, pageWidth - 250, rowY);
        doc.text(`${item.quantity || 1}`, pageWidth - 180, rowY);
        doc.text(`₹${item.price * (item.quantity || 1)}`, pageWidth - 100, rowY);
      });

      // ===== TOTAL BOX =====
      const totalY = startY + items.length * 25 + 40;

      doc.setFillColor(255, 193, 7);
      doc.rect(pageWidth - 220, totalY, 180, 60, "F");

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text("TOTAL", pageWidth - 210, totalY + 20);

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(`₹${invoice.amount}`, pageWidth - 60, totalY + 20, { align: "right" });

      // ===== FOOTER =====
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(10);
      doc.text("Thank you for your business", margin, 780);

      doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
    } catch (err) {
      alert("PDF failed");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const sharePublicLink = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${meta.typeLabel} ${invoice?.invoiceNumber || ''}`,
          text: `View ${meta.typeLabel.toLowerCase()} ${invoice?.invoiceNumber || ''}`,
          url: publicDocumentUrl
        });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicDocumentUrl);
        alert('Public link copied');
        return;
      }

      window.prompt('Copy this public link:', publicDocumentUrl);
    } catch {
      // User cancelled the share flow.
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="container-custom py-10 md:py-16">
        <div className="reveal mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="h-px w-8 bg-yellow-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400">{meta.headerLabel} • #{invoice.invoiceNumber}</p>
            </div>
            <h1 className="text-4xl font-black sm:text-5xl tracking-tight text-white mb-2">
              {meta.title}
            </h1>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusClass}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${meta.status === 'paid' || meta.status === 'accepted' ? 'bg-emerald-400' : meta.status === 'expired' ? 'bg-red-400' : 'bg-yellow-500 animate-pulse'}`} />
                {meta.status}
              </span>
              <p className="text-sm font-medium text-zinc-500">
                {meta.isProposal ? `Prepared for ${invoice.clientName}` : `Issued to ${invoice.clientName}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {!meta.isProposal && invoice.status !== 'paid' && (
              <button
                onClick={markAsPaid}
                className="btn btn-primary px-8 py-3 rounded-xl shadow-xl shadow-yellow-500/10 hover:scale-105 transition-all"
              >
                Mark as Paid
              </button>
            )}

            {meta.isProposal && invoice.proposalStatus === 'accepted' && !invoice.convertedToInvoiceId && (
              <button
                onClick={convertProposal}
                disabled={convertingProposal}
                className="btn btn-primary px-8 py-3 rounded-xl shadow-xl shadow-yellow-500/10 hover:scale-105 transition-all disabled:opacity-60"
              >
                {convertingProposal ? 'Converting...' : 'Convert to Invoice'}
              </button>
            )}

            <button
              onClick={deleteInvoice}
              className="px-8 py-3 rounded-xl bg-red-500/5 border border-red-500/10 text-red-500/60 font-black text-xs uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 transition-all"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <section className="reveal reveal-delay-1 surface p-10 md:p-16 border-white/5 bg-white text-black rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            <div id="invoice" className="bg-[#1f1f1f] text-white p-10 rounded-[2rem]">

              {/* HEADER */}
              <div className="flex justify-between mb-10">
                <div className="flex items-center gap-3">
                  {logoUrl && (
                    <img src={logoUrl} className="w-10 h-10 object-contain" />
                  )}
                  <h1 className="text-yellow-400 text-xl font-bold">{companyName}</h1>
                </div>

                <div className="text-right">
                  <h2 className="text-yellow-400 text-2xl font-bold">INVOICE</h2>
                  <p>#{invoice.invoiceNumber}</p>
                  <p>{formatDate(invoice.date)}</p>
                </div>
              </div>

              {/* CLIENT */}
              <div className="mb-6">
                <p className="text-yellow-400 text-sm font-semibold">Invoice To</p>
                <p className="font-bold text-lg">{invoice.clientName}</p>
                <p className="text-sm text-gray-400">{invoice.clientEmail}</p>
              </div>

              {/* TABLE HEADER */}
              <div className="grid grid-cols-4 bg-yellow-400 text-black p-3 font-bold rounded">
                <span>Description</span>
                <span>Price</span>
                <span>Qty</span>
                <span className="text-right">Total</span>
              </div>

              {/* ITEMS */}
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-4 p-3 border-b border-gray-700">
                  <span>{item.name}</span>
                  <span>₹{item.price}</span>
                  <span>{item.quantity || 1}</span>
                  <span className="text-right">₹{item.price * (item.quantity || 1)}</span>
                </div>
              ))}

              {/* TOTAL */}
              <div className="flex justify-end mt-8">
                <div className="bg-yellow-400 text-black p-4 rounded w-[220px]">
                  <p className="font-bold">Total</p>
                  <p className="text-xl font-bold">₹{invoice.amount}</p>
                </div>
              </div>

              {/* QR */}
              {upiLink && (
                <div className="mt-6 flex justify-center">
                  <QRCode value={upiLink} size={120} />
                </div>
              )}

              {/* FOOTER */}
              <p className="mt-10 text-center text-gray-400 text-sm">
                Thank you for your business
              </p>
            </div>
          </section>

          <aside className="reveal reveal-delay-2 space-y-6 lg:sticky lg:top-28 h-fit">
            <div className="surface p-8 border-white/10 bg-zinc-950 shadow-2xl rounded-[2.5rem]">
              <div className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-white/5 border border-white/10 mb-8">
                <p className="text-[10px] uppercase tracking-widest font-black text-zinc-500">Share Assets</p>
              </div>

              <div className="space-y-4 mb-8">
                <a
                  href={publicDocumentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group"
                >
                  <span className="text-xs font-bold text-zinc-400 group-hover:text-white">
                    Public {meta.typeLabel} Link
                  </span>
                  <svg className="h-4 w-4 text-zinc-600 group-hover:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>

                <button
                  onClick={downloadPdf}
                  disabled={downloadingPdf}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group"
                >
                  <span className="text-xs font-bold text-zinc-400 group-hover:text-white">
                    {downloadingPdf ? 'Preparing PDF...' : 'Download PDF'}
                  </span>
                  <svg className="h-4 w-4 text-zinc-600 group-hover:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </button>

                <button
                  onClick={sharePublicLink}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group"
                >
                  <span className="text-xs font-bold text-zinc-400 group-hover:text-white">Share Public Link</span>
                  <svg className="h-4 w-4 text-zinc-600 group-hover:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C9.886 14.511 11.41 15.2 13 15.2c3.92 0 7.1-3.18 7.1-7.1S16.92 1 13 1 5.9 4.18 5.9 8.1c0 1.59.689 3.114 1.858 4.316M1 23l7-7m0 0l4-4m-4 4l4 4" /></svg>
                </button>
              </div>

              {!meta.isProposal && invoice.status !== 'paid' && finalUpi && (
                <div className="p-6 rounded-3xl bg-black border border-white/5 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-4">Quick UPI Settlement</p>
                  <div className="flex justify-center mb-6 p-4 bg-white rounded-2xl">
                    <QRCode value={upiLink} size={140} />
                  </div>
                  <button
                    onClick={() => { window.location.href = upiLink; }}
                    className="w-full py-4 rounded-xl bg-yellow-400 text-black font-black text-xs uppercase tracking-widest hover:scale-105 transition-all"
                  >
                    Open Mobile App
                  </button>
                </div>
              )}

              {meta.isProposal && (
                <div className="p-6 rounded-3xl bg-black border border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-4">Proposal Flow</p>
                  <p className="text-sm font-bold text-zinc-400 leading-relaxed">
                    Share this link with the client, collect approval, then convert the accepted proposal into an invoice.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01]">
              <p className="text-[10px] font-bold text-zinc-500 leading-relaxed text-center uppercase tracking-widest">
                Secure Document Hash <br />
                <span className="text-black bg-white/10 px-1 mt-1 inline-block rounded">{invoice._id.slice(-8)}</span>
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
