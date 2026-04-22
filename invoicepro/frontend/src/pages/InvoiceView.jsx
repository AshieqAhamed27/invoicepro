import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import Navbar from '../components/Navbar';
import QRCode from 'react-qr-code';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const logoUrl = rawLogo && !rawLogo.includes('localhost')
    ? rawLogo
    : rawLogo
      ? rawLogo
        .replace('http://localhost:7070', 'https://invoicepro-527e.onrender.com')
        .replace('http://localhost:37857', 'https://invoicepro-527e.onrender.com')
      : null;

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

      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      const contentWidth = pageWidth - margin * 2;
      const memoTitle = meta.isProposal ? 'SCOPE NOTES' : 'INTERNAL MEMO';
      const sideTitle = meta.isProposal ? 'APPROVAL STATUS' : 'PAYMENT ROUTE';
      const sideValue = meta.isProposal ? meta.status.toUpperCase() : (finalUpi || 'Not provided');
      const issueDate = formatDate(invoice.date || invoice.createdAt || Date.now());
      const secondaryDate = formatDate(displayDate);

      let logoImage = null;
      if (logoUrl) {
        try {
          logoImage = await loadImageForPdf(logoUrl);
        } catch {
          logoImage = null;
        }
      }

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 120, 'F');

      doc.setTextColor(255, 255, 255);
      let companyNameX = margin;
      if (logoImage) {
        doc.addImage(logoImage.dataUrl, logoImage.format, margin, 26, 28, 28);
        companyNameX = margin + 38;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text(companyName, companyNameX, 42);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(user?.address || 'Tamil Nadu, India', companyNameX, 60);
      doc.text(user?.email || '', companyNameX, 74);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(meta.typeLabel.toUpperCase(), pageWidth - margin, 30, { align: 'right' });
      doc.setFontSize(18);
      doc.text(`#${invoice.invoiceNumber}`, pageWidth - margin, 52, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Issued: ${issueDate}`, pageWidth - margin, 70, { align: 'right' });
      doc.text(`${meta.dateLabel}: ${secondaryDate}`, pageWidth - margin, 84, { align: 'right' });

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(meta.isProposal ? 'PREPARED FOR' : 'BILLED TO', margin, 150);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(16);
      doc.text(invoice.clientName || '-', margin, 170);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(invoice.clientEmail || '-', margin, 188);

      const badgeX = pageWidth - margin - 110;
      const badgeY = 145;
      doc.setFillColor(meta.status === 'paid' || meta.status === 'accepted' ? 220 : meta.status === 'expired' ? 254 : 224, meta.status === 'paid' || meta.status === 'accepted' ? 252 : meta.status === 'expired' ? 226 : 242, meta.status === 'paid' || meta.status === 'accepted' ? 231 : meta.status === 'expired' ? 226 : 254);
      doc.roundedRect(badgeX, badgeY, 110, 24, 10, 10, 'F');
      doc.setTextColor(meta.status === 'paid' || meta.status === 'accepted' ? 22 : meta.status === 'expired' ? 153 : 12, meta.status === 'paid' || meta.status === 'accepted' ? 101 : meta.status === 'expired' ? 27 : 74, meta.status === 'paid' || meta.status === 'accepted' ? 52 : meta.status === 'expired' ? 42 : 110);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(meta.status.toUpperCase(), badgeX + 55, badgeY + 16, { align: 'center' });

      autoTable(doc, {
        startY: 212,
        margin: { left: margin, right: margin },
        head: [['Description', 'Amount']],
        body: items.map((item, index) => [
          `${index + 1}. ${item.name || meta.typeLabel}`,
          formatCurrencyPdf(item.price, invoice.currency)
        ]),
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: 10, textColor: [15, 23, 42], cellPadding: 9 },
        headStyles: { fillColor: [248, 250, 252], textColor: [100, 116, 139], fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'right' } }
      });

      const tableBottom = doc.lastAutoTable?.finalY || 212;
      const finalY = tableBottom + 18;

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(memoTitle, margin, finalY);
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const memoLines = doc.splitTextToSize(invoice.serviceDescription || 'No description provided.', contentWidth * 0.56);
      doc.text(memoLines, margin, finalY + 16);

      const summaryWidth = 215;
      const summaryX = pageWidth - margin - summaryWidth;
      const summaryY = finalY;
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(summaryX, summaryY - 12, summaryWidth, 95, 8, 8, 'FD');
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Subtotal', summaryX + 12, summaryY + 10);
      doc.text(formatCurrencyPdf(subtotal, invoice.currency), summaryX + summaryWidth - 12, summaryY + 10, { align: 'right' });
      if (tax > 0) {
        doc.text('Tax', summaryX + 12, summaryY + 28);
        doc.text(formatCurrencyPdf(tax, invoice.currency), summaryX + summaryWidth - 12, summaryY + 28, { align: 'right' });
      }
      doc.setDrawColor(203, 213, 225);
      doc.line(summaryX + 10, summaryY + 42, summaryX + summaryWidth - 10, summaryY + 42);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('TOTAL', summaryX + 12, summaryY + 58);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(15);
      doc.text(formatCurrencyPdf(invoice.amount, invoice.currency), summaryX + summaryWidth - 12, summaryY + 62, { align: 'right' });

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(sideTitle, margin, Math.min(pageHeight - 54, finalY + 74));
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(sideValue, margin, Math.min(pageHeight - 38, finalY + 90));

      doc.save(`${invoice.invoiceNumber || meta.typeLabel.toLowerCase()}.pdf`);
    } catch {
      alert('Failed to download PDF');
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
            {!meta.isProposal && invoice.status === 'paid' && (
              <div className="absolute top-10 right-10 border-4 border-emerald-500 text-emerald-500 font-black text-4xl px-6 py-2 rotate-12 opacity-80 rounded-xl">
                PAID
              </div>
            )}

            {meta.isProposal && meta.status === 'accepted' && (
              <div className="absolute top-10 right-10 border-4 border-emerald-500 text-emerald-500 font-black text-3xl px-6 py-2 rotate-12 opacity-80 rounded-xl">
                ACCEPTED
              </div>
            )}

            <div className="flex flex-col md:flex-row justify-between gap-10 mb-20">
              <div>
                <div className="mb-4 flex items-center gap-4">
                  {logoUrl && (
                    <div className="h-14 w-14 rounded-xl border border-gray-200 bg-white p-2">
                      <img
                        src={logoUrl}
                        alt={`${companyName} logo`}
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <h2 className="text-3xl font-black tracking-tighter">{companyName}</h2>
                </div>
                <div className="space-y-1 text-sm text-gray-500 font-medium">
                  <p>{user?.address || 'Tamil Nadu, India'}</p>
                  <p>{user?.email}</p>
                </div>
              </div>

              <div className="text-left md:text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                  {meta.isProposal ? 'Prepared For' : 'Billed To'}
                </p>
                <h3 className="text-xl font-bold mb-1">{invoice.clientName}</h3>
                <p className="text-sm text-gray-500 font-medium">{invoice.clientEmail}</p>
                {displayDate && (
                  <p className="mt-4 text-xs uppercase tracking-widest text-gray-400 font-black">
                    {meta.dateLabel}: <span className="text-gray-600">{formatDate(displayDate)}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="overflow-x-auto mb-10">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Description</th>
                    <th className="py-4 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="py-6 font-bold text-gray-800">{item.name}</td>
                      <td className="py-6 text-right font-black text-gray-900">{formatCurrency(item.price, invoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-end">
              <div className="w-full max-w-[260px] space-y-3">
                <div className="flex justify-between text-sm font-medium text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal, invoice.currency)}</span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between text-sm font-medium text-gray-500">
                    <span>Tax</span>
                    <span>{formatCurrency(tax, invoice.currency)}</span>
                  </div>
                )}
                <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
                  <span className="font-black text-gray-400 uppercase text-[10px] tracking-widest">
                    {meta.isProposal ? 'Proposal Total' : 'Total Amount'}
                  </span>
                  <span className="text-3xl font-black text-gray-900 tracking-tighter">{formatCurrency(invoice.amount, invoice.currency)}</span>
                </div>
              </div>
            </div>

            <div className="mt-20 pt-10 border-t border-gray-100 grid md:grid-cols-2 gap-10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">
                  {meta.isProposal ? 'Scope Notes' : 'Internal Memo'}
                </p>
                <p className="text-sm text-gray-500 leading-relaxed font-medium italic">
                  {invoice.serviceDescription || 'No description provided.'}
                </p>
              </div>
              <div className="flex flex-col md:items-end">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">
                  {meta.isProposal ? 'Approval Status' : 'Payment Route'}
                </p>
                <p className="text-lg font-black text-gray-900">
                  {meta.isProposal ? meta.status.toUpperCase() : (finalUpi || 'Not provided')}
                </p>
                {meta.isProposal && invoice.convertedToInvoiceId && (
                  <Link
                    to={`/invoice/${invoice.convertedToInvoiceId}`}
                    className="mt-4 text-xs font-black uppercase tracking-widest text-yellow-600"
                  >
                    Open Converted Invoice
                  </Link>
                )}
              </div>
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
