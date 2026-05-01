import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import { getSafeRemoteImageUrl } from '../utils/safeUrl';
import Navbar from '../components/Navbar';
import BrandLogo from '../components/BrandLogo';
import { COMPANY_NAME, COMPANY_SHORT_NAME, COMPANY_LOGO } from '../utils/company';
import QRCode from 'react-qr-code';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatCurrency = (amount, currency = 'INR') => {
  const symbol = currency === 'USD' ? 'USD ' : 'Rs ';
  return `${symbol}${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2
  })}`;
};

const formatCurrencyPdf = (amount, currency = 'INR') => {
  const code = currency === 'USD' ? 'USD' : 'Rs';
  return `${code} ${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2
  })}`;
};

const getQuantity = (item) => Number(item.quantity || 1);

const getLineTotal = (item) => Number(item.price || 0) * getQuantity(item);

const toTitleCase = (value = '') =>
  String(value)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

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

const firstText = (...values) => {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }

  return '';
};

const getBrandInitials = (name = COMPANY_SHORT_NAME) => {
  const words = String(name || COMPANY_SHORT_NAME)
    .replace(/[^a-z0-9\s]/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return 'IP';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
};

const drawPdfBrandMark = async (doc, { x, y, size, logoUrl, initials, dark, gold, line }) => {
  let renderedLogo = false;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...line);
  doc.roundedRect(x, y, size, size, 8, 8, 'FD');

  if (logoUrl) {
    try {
      const logo = await loadImageForPdf(logoUrl);
      doc.addImage(logo.dataUrl, logo.format, x + 6, y + 6, size - 12, size - 12);
      renderedLogo = true;
    } catch {
      renderedLogo = false;
    }
  }

  if (!renderedLogo) {
    doc.setFillColor(...gold);
    doc.roundedRect(x + 8, y + 8, size - 16, size - 16, 6, 6, 'F');
    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(initials, x + size / 2, y + size / 2 + 5, { align: 'center' });
  }
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
      <div className="flex min-h-screen items-center justify-center bg-[#07090d] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Retrieving Ledger</p>
        </div>
      </div>
    );
  }

  if (!invoice || !meta) return null;

  const business = invoice.businessSnapshot || {};
  const invoiceProfile = invoice.user && typeof invoice.user === 'object' ? invoice.user : {};
  const profile = { ...(user || {}), ...invoiceProfile };
  const snapshotName = firstText(business.name);
  const companyName = firstText(
    profile.companyName,
    snapshotName !== COMPANY_SHORT_NAME && snapshotName !== COMPANY_NAME ? snapshotName : '',
    profile.name,
    snapshotName,
    COMPANY_NAME
  );
  const businessEmail = firstText(profile.email, business.email);
  const businessAddress = firstText(profile.address, business.address);
  const businessGst = firstText(invoice.gst, profile.gstNumber, business.gstNumber);
  const businessUpi = firstText(profile.upiId, business.upiId);
  const rawLogo = firstText(profile.logo, business.logo, COMPANY_LOGO);
  const logoUrl = getSafeRemoteImageUrl(rawLogo) || null;
  const brandInitials = getBrandInitials(companyName);

  const items = invoice.items?.length > 0
    ? invoice.items
    : [{ name: invoice.serviceDescription || 'Service', price: invoice.amount }];
  const subtotal = items.reduce((sum, item) => sum + getLineTotal(item), 0);
  const total = Number(invoice.amount || 0);
  const tax = Math.max(0, total - subtotal);
  const finalUpi = invoice.upiId || businessUpi || '';
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

      const doc = new jsPDF('p', 'pt', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 44;
      const dark = [15, 23, 42];
      const muted = [100, 116, 139];
      const gold = [217, 177, 99];
      const line = [226, 232, 240];
      const title = meta.typeLabel.toUpperCase();

      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      doc.setFillColor(...dark);
      doc.roundedRect(margin, 32, pageWidth - margin * 2, 126, 8, 8, 'F');

      await drawPdfBrandMark(doc, {
        x: margin + 24,
        y: 54,
        size: 38,
        logoUrl,
        initials: brandInitials,
        dark,
        gold,
        line
      });

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      const brandTextX = margin + 74;
      const companyNameLines = doc.splitTextToSize(companyName, 245).slice(0, 2);
      doc.text(companyNameLines, brandTextX, 70);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(203, 213, 225);
      doc.text(
        meta.isProposal ? 'Service proposal prepared for review' : 'Professional invoice prepared for payment',
        brandTextX,
        90 + Math.max(0, companyNameLines.length - 1) * 14
      );

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(26);
      doc.setTextColor(255, 255, 255);
      doc.text(title, pageWidth - margin - 24, 74, { align: 'right' });
      doc.setFontSize(10);
      doc.setTextColor(226, 232, 240);
      doc.text(`#${invoice.invoiceNumber}`, pageWidth - margin - 24, 96, { align: 'right' });

      doc.setFillColor(...gold);
      doc.roundedRect(pageWidth - margin - 118, 112, 94, 24, 6, 6, 'F');
      doc.setTextColor(...dark);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(toTitleCase(meta.status), pageWidth - margin - 71, 127, { align: 'center' });

      const infoY = 192;
      doc.setTextColor(...muted);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(meta.isProposal ? 'PREPARED FOR' : 'BILL TO', margin, infoY);
      doc.text('FROM', pageWidth / 2 + 10, infoY);

      doc.setTextColor(...dark);
      doc.setFontSize(13);
      doc.text(invoice.clientName || 'Client', margin, infoY + 22);
      doc.text(companyName, pageWidth / 2 + 10, infoY + 22);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...muted);
      doc.text(invoice.clientEmail || 'No email supplied', margin, infoY + 40);
      doc.text(businessEmail || `${COMPANY_SHORT_NAME} workspace`, pageWidth / 2 + 10, infoY + 40);
      if (businessAddress) {
        doc.text(businessAddress, pageWidth / 2 + 10, infoY + 58, { maxWidth: 210 });
      }
      if (businessGst) {
        doc.text(`GSTIN: ${businessGst}`, pageWidth / 2 + 10, businessAddress ? infoY + 84 : infoY + 58);
      }

      doc.setDrawColor(...line);
      doc.line(margin, 278, pageWidth - margin, 278);

      doc.setTextColor(...muted);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('ISSUED', margin, 308);
      doc.text(meta.dateLabel.toUpperCase(), margin + 150, 308);
      doc.text('PUBLIC LINK', margin + 310, 308);

      doc.setTextColor(...dark);
      doc.setFontSize(10);
      doc.text(formatDate(invoice.date), margin, 326);
      doc.text(formatDate(displayDate), margin + 150, 326);
      doc.setTextColor(37, 99, 235);
      doc.text(publicDocumentUrl, margin + 310, 326, { maxWidth: pageWidth - margin * 2 - 310 });

      if (!meta.isProposal && finalUpi) {
        doc.setTextColor(...muted);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('UPI COLLECTION ID', margin, 352);
        doc.setTextColor(...dark);
        doc.setFontSize(10);
        doc.text(finalUpi, margin + 118, 352);
      }

      const tableBody = items.map((item) => [
        item.name || invoice.serviceDescription || 'Service',
        formatCurrencyPdf(item.price, invoice.currency),
        String(getQuantity(item)),
        formatCurrencyPdf(getLineTotal(item), invoice.currency)
      ]);

      autoTable(doc, {
        startY: 370,
        head: [['Description', 'Rate', 'Qty', 'Line total']],
        body: tableBody,
        theme: 'plain',
        margin: { left: margin, right: margin },
        styles: {
          font: 'helvetica',
          fontSize: 10,
          cellPadding: { top: 10, right: 8, bottom: 10, left: 8 },
          textColor: dark
        },
        headStyles: {
          fillColor: dark,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'center' },
          3: { halign: 'right', fontStyle: 'bold' }
        },
        didDrawCell: (data) => {
          if (data.section === 'body') {
            doc.setDrawColor(...line);
            doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
          }
        }
      });

      const finalY = doc.lastAutoTable?.finalY || 430;
      const totalsX = pageWidth - margin - 210;
      const totalsY = Math.min(finalY + 28, pageHeight - 190);

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...line);
      doc.roundedRect(totalsX, totalsY, 210, tax > 0 ? 118 : 92, 8, 8, 'FD');

      doc.setTextColor(...muted);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Subtotal', totalsX + 18, totalsY + 28);
      doc.text(formatCurrencyPdf(subtotal, invoice.currency), totalsX + 192, totalsY + 28, { align: 'right' });

      if (tax > 0) {
        doc.text('Tax', totalsX + 18, totalsY + 54);
        doc.text(formatCurrencyPdf(tax, invoice.currency), totalsX + 192, totalsY + 54, { align: 'right' });
      }

      doc.setDrawColor(...line);
      doc.line(totalsX + 18, totalsY + (tax > 0 ? 72 : 48), totalsX + 192, totalsY + (tax > 0 ? 72 : 48));
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...dark);
      doc.setFontSize(12);
      doc.text('Total', totalsX + 18, totalsY + (tax > 0 ? 96 : 72));
      doc.text(formatCurrencyPdf(total, invoice.currency), totalsX + 192, totalsY + (tax > 0 ? 96 : 72), { align: 'right' });

      if (invoice.notes) {
        const notesY = Math.min(totalsY, pageHeight - 175);
        doc.setTextColor(...muted);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('NOTES', margin, notesY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(invoice.notes, margin, notesY + 18, { maxWidth: totalsX - margin - 22 });
      }

      const noteY = Math.max(totalsY + (tax > 0 ? 148 : 122), pageHeight - 86);
      doc.setDrawColor(...line);
      doc.line(margin, noteY - 24, pageWidth - margin, noteY - 24);
      doc.setTextColor(...muted);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(meta.isProposal ? 'Thank you for reviewing this proposal.' : 'Thank you for your business.', margin, noteY);
      doc.text(`Generated by ${COMPANY_SHORT_NAME} on ${formatDate(new Date().toISOString())}`, pageWidth - margin, noteY, { align: 'right' });

      doc.save(`${meta.typeLabel.toLowerCase()}-${invoice.invoiceNumber}.pdf`);
    } catch (err) {
      alert('PDF failed');
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
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10 md:py-16">
        <div className="reveal mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-px w-8 bg-yellow-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400">{meta.headerLabel} / #{invoice.invoiceNumber}</p>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-3 sm:text-5xl">
              {meta.typeLabel} for {invoice.clientName}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusClass}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${meta.status === 'paid' || meta.status === 'accepted' ? 'bg-emerald-400' : meta.status === 'expired' ? 'bg-red-400' : 'bg-yellow-500 animate-pulse'}`} />
                {meta.status}
              </span>
              <p className="text-sm font-medium text-zinc-500">Branded as {companyName}</p>
              <p className="text-sm font-black text-white">{formatCurrency(total, invoice.currency)}</p>
            </div>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:w-auto sm:grid-cols-2 lg:flex lg:flex-wrap">
            <button
              type="button"
              onClick={downloadPdf}
              disabled={downloadingPdf}
              className="btn btn-secondary px-6 py-3"
            >
              {downloadingPdf ? 'Preparing PDF...' : 'Download PDF'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-secondary px-6 py-3"
            >
              Print
            </button>
            <button
              type="button"
              onClick={sharePublicLink}
              className="btn btn-dark px-6 py-3"
            >
              Share
            </button>
            {!meta.isProposal && invoice.status !== 'paid' && (
              <button
                onClick={markAsPaid}
                className="btn btn-primary px-8 py-3 shadow-xl shadow-black/20 hover:-translate-y-0.5 transition-all"
              >
                Mark as Paid
              </button>
            )}

            {meta.isProposal && invoice.proposalStatus === 'accepted' && !invoice.convertedToInvoiceId && (
              <button
                onClick={convertProposal}
                disabled={convertingProposal}
                className="btn btn-primary px-8 py-3 shadow-xl shadow-black/20 hover:-translate-y-0.5 transition-all disabled:opacity-60"
              >
                {convertingProposal ? 'Converting...' : 'Convert to Invoice'}
              </button>
            )}

            <button
              onClick={deleteInvoice}
              className="rounded-xl border border-red-500/10 bg-red-500/5 px-6 py-3 text-xs font-black uppercase tracking-widest text-red-500/60 transition-all hover:bg-red-500/10 hover:text-red-500 sm:px-8"
            >
              Delete
            </button>
          </div>
        </div>

        <section className="reveal reveal-delay-1 mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: meta.isProposal ? 'Proposal Total' : 'Amount Due', value: formatCurrency(total, invoice.currency) },
            { label: 'Issued', value: formatDate(invoice.date) },
            { label: meta.dateLabel, value: formatDate(displayDate) },
            { label: 'Brand', value: companyName }
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">{item.label}</p>
              <p className="mt-2 truncate text-sm font-black text-white">{item.value}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-10">
          <section className="reveal reveal-delay-1 premium-panel p-3 md:p-6 relative overflow-hidden">
            <div id="invoice" className="invoice-document overflow-hidden rounded-lg bg-white text-slate-950 shadow-2xl">
              <div className="bg-slate-950 px-6 py-7 text-white md:px-10">
                <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      {logoUrl ? (
                        <img src={logoUrl} alt={`${companyName} logo`} className="h-14 w-14 rounded-lg bg-white object-contain p-1.5 shadow-lg" />
                      ) : (
                        companyName === COMPANY_SHORT_NAME || companyName === COMPANY_NAME
                          ? <BrandLogo showText={false} />
                          : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white text-sm font-black text-slate-950 shadow-lg">
                              {brandInitials}
                            </div>
                          )
                      )}
                      <div>
                        <p className="break-words text-xl font-black leading-none text-white sm:text-2xl">{companyName}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          {meta.isProposal ? 'Service proposal' : 'Professional invoice'}
                        </p>
                        {businessAddress && (
                          <p className="mt-2 max-w-md text-xs font-medium leading-relaxed text-slate-500">{businessAddress}</p>
                        )}
                      </div>
                    </div>

                    {invoice.serviceDescription && (
                      <p className="mt-6 max-w-2xl text-sm font-medium leading-relaxed text-slate-300">
                        {invoice.serviceDescription}
                      </p>
                    )}
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{meta.typeLabel}</p>
                    <h2 className="mt-2 break-words text-3xl font-black tracking-tight text-white sm:text-4xl">#{invoice.invoiceNumber}</h2>
                    <span className={`mt-4 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusClass}`}>
                      {toTitleCase(meta.status)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-0 border-b border-slate-200 md:grid-cols-3">
                <div className="border-b border-slate-200 p-6 md:border-b-0 md:border-r md:p-8">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    {meta.isProposal ? 'Prepared For' : 'Bill To'}
                  </p>
                  <h3 className="mt-3 text-xl font-black text-slate-950">{invoice.clientName}</h3>
                  <p className="mt-1 break-words text-sm font-medium text-slate-500">{invoice.clientEmail}</p>
                </div>

                <div className="border-b border-slate-200 p-6 md:border-b-0 md:border-r md:p-8">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">From</p>
                  <h3 className="mt-3 text-xl font-black text-slate-950">{companyName}</h3>
                  <p className="mt-1 text-sm font-medium text-slate-500">{businessEmail || `${COMPANY_SHORT_NAME} workspace`}</p>
                  {businessAddress && (
                    <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">{businessAddress}</p>
                  )}
                  {businessGst && (
                    <p className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                      GSTIN {businessGst}
                    </p>
                  )}
                </div>

                <div className="p-6 md:p-8">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Timeline</p>
                  <div className="mt-3 grid gap-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold text-slate-500">Issued</span>
                      <span className="text-right text-sm font-black text-slate-950">{formatDate(invoice.date)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold text-slate-500">{meta.dateLabel}</span>
                      <span className="text-right text-sm font-black text-slate-950">{formatDate(displayDate)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8">
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <div className="hidden grid-cols-[1fr_120px_70px_130px] bg-slate-100 px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 md:grid">
                    <span>Description</span>
                    <span className="text-right">Rate</span>
                    <span className="text-center">Qty</span>
                    <span className="text-right">Total</span>
                  </div>

                  <div className="divide-y divide-slate-200">
                    {items.map((item, i) => (
                      <div key={`${item.name}-${i}`} className="grid gap-3 px-5 py-5 md:grid-cols-[1fr_120px_70px_130px] md:items-center">
                        <div>
                          <p className="font-black text-slate-950">{item.name || invoice.serviceDescription || 'Service'}</p>
                          <p className="mt-1 text-xs font-medium text-slate-500">Line item {i + 1}</p>
                        </div>
                        <p className="flex justify-between text-sm font-semibold text-slate-600 md:block md:text-right">
                          <span className="md:hidden">Rate</span>
                          {formatCurrency(item.price, invoice.currency)}
                        </p>
                        <p className="flex justify-between text-sm font-semibold text-slate-600 md:block md:text-center">
                          <span className="md:hidden">Qty</span>
                          {getQuantity(item)}
                        </p>
                        <p className="flex justify-between text-base font-black text-slate-950 md:block md:text-right">
                          <span className="md:hidden">Total</span>
                          {formatCurrency(getLineTotal(item), invoice.currency)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      {meta.isProposal ? 'Approval Note' : 'Payment Note'}
                    </p>
                    <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
                      {meta.isProposal
                        ? 'Please review the scope, amount, and validity before approving this proposal.'
                        : finalUpi
                          ? 'Use the public link or UPI QR to complete payment. Keep the invoice number for reference.'
                          : 'Use the public link to review this invoice and complete payment through the available checkout option.'}
                    </p>

                    {invoice.notes && (
                      <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Notes</p>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{invoice.notes}</p>
                      </div>
                    )}

                    {upiLink && (
                      <div className="mt-5 inline-flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4">
                        <QRCode value={upiLink} size={88} />
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-slate-400">UPI Ready</p>
                          <p className="mt-1 max-w-[14rem] break-words text-sm font-bold text-slate-700">{finalUpi}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg bg-slate-950 p-5 text-white">
                    <div className="space-y-3">
                      <div className="flex justify-between gap-4 text-sm">
                        <span className="text-slate-400">Subtotal</span>
                        <span className="font-bold text-white">{formatCurrency(subtotal, invoice.currency)}</span>
                      </div>
                      {tax > 0 && (
                        <div className="flex justify-between gap-4 text-sm">
                          <span className="text-slate-400">Tax</span>
                          <span className="font-bold text-white">{formatCurrency(tax, invoice.currency)}</span>
                        </div>
                      )}
                      <div className="border-t border-white/10 pt-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                          {meta.isProposal ? 'Proposal Total' : 'Amount Due'}
                        </p>
                        <p className="mt-2 break-words text-2xl font-black tracking-tight text-white sm:text-3xl">{formatCurrency(total, invoice.currency)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-5 text-xs font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                  <span className="break-all">Public link: {publicDocumentUrl}</span>
                  <span>Generated with {COMPANY_SHORT_NAME}</span>
                </div>
              </div>
            </div>
          </section>

          <aside className="reveal reveal-delay-2 space-y-6 xl:sticky xl:top-28 h-fit">
            <div className="premium-panel p-5 sm:p-8">
              <div className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-white/5 border border-white/10 mb-8">
                <p className="text-[10px] uppercase tracking-widest font-black text-zinc-500">Client Delivery</p>
              </div>

              <div className="mb-6 rounded-lg border border-yellow-400/15 bg-yellow-400/5 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-300">PDF Export</p>
                <p className="mt-2 text-sm font-bold leading-relaxed text-zinc-300">
                  Downloads a branded one-page PDF with your logo, company name, GST, payment details, notes, and totals.
                </p>
                <p className="mt-3 break-all rounded-lg bg-black/30 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  {meta.typeLabel.toLowerCase()}-{invoice.invoiceNumber}.pdf
                </p>
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
