import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import { getSafeRemoteImageUrl } from '../utils/safeUrl';
import { openWhatsAppShare } from '../utils/whatsapp';
import Navbar from '../components/Navbar';
import BrandLogo from '../components/BrandLogo';
import LoadingScreen from '../components/LoadingScreen';
import { COMPANY_NAME, COMPANY_SHORT_NAME, COMPANY_LOGO } from '../utils/company';
import { trackEvent } from '../utils/analytics';
import QRCode from 'react-qr-code';

const formatCurrency = (amount, currency = 'INR') => {
  const symbol = currency === 'INR' ? 'Rs ' : `${currency} `;
  return `${symbol}${Number(amount || 0).toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', {
    minimumFractionDigits: 2
  })}`;
};

const formatCurrencyPdf = (amount, currency = 'INR') => {
  const code = currency === 'INR' ? 'Rs' : currency;
  return `${code} ${Number(amount || 0).toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', {
    minimumFractionDigits: 2
  })}`;
};

const getQuantity = (item) => Number(item.quantity || 1);

const getLineTotal = (item) => Number(item.price || 0) * getQuantity(item);

const toTitleCase = (value = '') =>
  String(value)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getPaymentEventLabel = (type = '') => ({
  'payment_link.created': 'Payment Link Created',
  'payment_link.paid': 'Razorpay Link Paid',
  'payment.captured': 'Payment Captured',
  'order.paid': 'Order Paid'
}[type] || toTitleCase(type || 'Payment Event'));

const formatDate = (value) => {
  if (!value) return 'Not specified';

  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const formatDateTime = (value) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';

  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
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

  if (!words.length) return 'CF';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
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
  const [creatingPaymentLink, setCreatingPaymentLink] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showDemandModal, setShowDemandModal] = useState(false);
  const [demandCopied, setDemandCopied] = useState(false);
  const [downloadingDemandPdf, setDownloadingDemandPdf] = useState(false);

  const togglePaidStatus = async () => {
    if (!invoice) return;
    try {
      setUpdatingStatus(true);
      const nextStatus = invoice.status === 'paid' ? 'pending' : 'paid';
      const res = await api.put(`/invoices/${invoice._id}/status`, { status: nextStatus });
      setInvoice(res.data?.invoice || { ...invoice, status: nextStatus, paidAt: nextStatus === 'paid' ? new Date() : null });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update invoice status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getDemandNoticeText = () => {
    return [
      'FORMAL DEMAND FOR PAYMENT',
      '(Notice Prior to Legal Escalation & MSME Samadhaan Filing)',
      '',
      `Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      `To: ${invoice.clientName} (${invoice.clientEmail || 'Client'})`,
      `From: ${companyName}`,
      `Invoice Number: #${invoice.invoiceNumber}`,
      `Original Due Date: ${formatDate(displayDate)}`,
      `Total Outstanding Amount: ${formatCurrency(total, invoice.currency)}`,
      '',
      `Dear ${invoice.clientName},`,
      '',
      `This is a formal and final demand for payment regarding the overdue balance on Invoice #${invoice.invoiceNumber} for services completed and delivered.`,
      '',
      `Despite previous reminders, the outstanding amount of ${formatCurrency(total, invoice.currency)} remains unpaid past the agreed due date of ${formatDate(displayDate)}.`,
      '',
      'Please take notice that under Section 73 of the Indian Contract Act, 1872 and the Micro, Small and Medium Enterprises Development Act (Delayed Payments), continued non-payment constitutes a breach of contract with liability for interest.',
      '',
      'You are hereby granted a final cure period of 7 business days from receipt of this notice to settle the full balance directly via the link below:',
      '',
      `Payment Link: ${publicDocumentUrl}`,
      finalUpi ? `Direct UPI ID: ${finalUpi}` : '',
      '',
      'Failure to settle the outstanding balance within 7 business days will result in formal recovery escalation, including:',
      '1. Official complaint filing on the Government MSME Samadhaan Portal.',
      '2. Issuance of formal statutory legal proceedings for commercial recovery.',
      '3. Reporting of default to commercial credit registries.',
      '',
      'Please treat this matter with urgency and settle the pending balance promptly to avoid escalation.',
      '',
      'Sincerely,',
      companyName,
      '',
      '---',
      'Disclaimer: This is a formal demand for payment generated by the creditor using ClientFlow AI software. ClientFlow AI is a technology platform and does not provide legal representation.'
    ].filter(Boolean).join('\n');
  };

  const copyDemandNotice = () => {
    navigator.clipboard.writeText(getDemandNoticeText());
    setDemandCopied(true);
    setTimeout(() => setDemandCopied(false), 2500);
  };

  const downloadDemandNoticePdf = async () => {
    try {
      setDownloadingDemandPdf(true);
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'pt', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 44;

      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F');

      doc.setFillColor(225, 29, 72);
      doc.rect(margin, 36, pageWidth - margin * 2, 6, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text('FORMAL DEMAND FOR PAYMENT', margin, 68);

      doc.setFontSize(10);
      doc.setTextColor(225, 29, 72);
      doc.text('NOTICE PRIOR TO STATUTORY LEGAL RECOVERY & MSME SAMADHAAN FILING', margin, 86);

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 100, pageWidth - margin, 100);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, margin, 122);
      doc.text(`Invoice Reference: #${invoice.invoiceNumber}`, margin, 138);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('TO (Debtor):', margin, 168);
      doc.setFont('helvetica', 'normal');
      doc.text(`${invoice.clientName} (${invoice.clientEmail || 'No email'})`, margin + 80, 168);

      doc.setFont('helvetica', 'bold');
      doc.text('FROM (Creditor):', margin, 186);
      doc.setFont('helvetica', 'normal');
      doc.text(`${companyName}`, margin + 104, 186);

      doc.setFont('helvetica', 'bold');
      doc.text('OUTSTANDING:', margin, 204);
      doc.setTextColor(225, 29, 72);
      doc.text(`${formatCurrency(total, invoice.currency)} (Due since: ${formatDate(displayDate)})`, margin + 98, 204);

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 220, pageWidth - margin, 220);

      const noticeBody = [
        `This is a formal and final demand for payment regarding the overdue balance on Invoice #${invoice.invoiceNumber} for agreed services completed and delivered.`,
        `Despite multiple payment reminders, the outstanding amount of ${formatCurrency(total, invoice.currency)} remains unpaid past the agreed due date of ${formatDate(displayDate)}.`,
        'Under Section 73 of the Indian Contract Act, 1872 and the MSME Development Act (Delayed Payments to Micro & Small Enterprises), continued failure to settle commercial debts constitutes a breach of contract with liability for interest.',
        'You are hereby granted a final cure period of 7 business days from the date of this notice to clear the full balance directly via the payment link or direct bank rails.',
        'Failure to clear the balance within 7 business days will result in immediate formal recovery proceedings, including: (1) Filing an official dispute on the Government MSME Samadhaan Portal, (2) Initiating statutory legal proceedings for commercial recovery, and (3) Reporting commercial default.',
        `Direct Settlement Link: ${publicDocumentUrl}`
      ];

      let curY = 246;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);

      noticeBody.forEach((paragraph) => {
        const lines = doc.splitTextToSize(paragraph, pageWidth - margin * 2);
        doc.text(lines, margin, curY);
        curY += lines.length * 15 + 10;
      });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`Authorized Signatory: ${companyName}`, margin, curY + 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Disclaimer: This is a formal demand for payment generated by the creditor using ClientFlow AI software. ClientFlow AI is a technology platform and does not provide legal advice or legal representation.', margin, doc.internal.pageSize.getHeight() - 40, { maxWidth: pageWidth - margin * 2 });

      doc.save(`Legal-Demand-Notice-Inv-${invoice.invoiceNumber}.pdf`);
    } catch {
      alert('Failed to generate notice PDF.');
    } finally {
      setDownloadingDemandPdf(false);
    }
  };

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
    const status = isProposal
      ? getProposalStatus(invoice)
      : invoice.status === 'pending' && isDatePastEndOfDay(invoice.dueDate)
        ? 'overdue'
        : invoice.status;

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
      <LoadingScreen
        fullScreen={true}
        message="Retrieving Invoice Ledger"
        subtext="Verifying digital signature, line items & payment status..."
      />
    );
  }

  if (!invoice || !meta) return null;

  const business = invoice.businessSnapshot || {};
  const invoiceProfile = invoice.user && typeof invoice.user === 'object' ? invoice.user : {};
  const profile = { ...(user || {}), ...invoiceProfile };
  const snapshotName = firstText(business.name);
  const personalName = firstText(profile.name);
  const businessSnapshotName = getCleanBusinessName(snapshotName, personalName);
  const companyName = firstText(
    getCleanBusinessName(profile.companyName, personalName),
    businessSnapshotName,
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
  const primaryProductName = firstText(
    items[0]?.name,
    invoice.serviceDescription,
    meta.isProposal ? 'Service proposal' : 'Professional service'
  );
  const subtotal = items.reduce((sum, item) => sum + getLineTotal(item), 0);
  const total = Number(invoice.amount || 0);
  const tax = Math.max(0, total - subtotal);
  const tdsRate = Number(invoice.tdsPercent || 0);
  const tdsAmount = (subtotal * tdsRate) / 100;
  const netReceivable = total - tdsAmount;
  const finalUpi = invoice.currency === 'INR' ? (invoice.upiId || businessUpi || '') : '';
  const isInternationalInvoice = !meta.isProposal && invoice.currency !== 'INR';
  const publicDocumentUrl = `${window.location.origin}/public/invoice/${invoice._id}`;
  const razorpayPaymentUrl = '';
  const paymentShareUrl = publicDocumentUrl;
  const hasRazorpayPaymentLink = false;
  const paymentTimeline = [
    ...(invoice.paymentEvents || []),
    ...(invoice.status === 'paid' && invoice.paidAt && !(invoice.paymentEvents || []).some((event) => String(event.type || '').includes('paid') || String(event.status || '') === 'paid')
      ? [{
        type: 'payment.captured',
        status: 'paid',
        amount: total,
        currency: invoice.currency,
        occurredAt: invoice.paidAt,
        providerPaymentId: invoice.paymentLink?.paymentId || '',
        message: 'Payment marked paid after verification.'
      }]
      : [])
  ].sort((a, b) => new Date(b.occurredAt || 0) - new Date(a.occurredAt || 0));
  const displayDate = meta.isProposal ? invoice.validUntil : invoice.dueDate;
  const upiLink = !meta.isProposal && invoice.currency === 'INR' && finalUpi
    ? `upi://pay?pa=${finalUpi}&pn=${encodeURIComponent(companyName)}&am=${invoice.amount}&cu=INR`
    : '';
  const canCollectPayment = !meta.isProposal && meta.status !== 'paid';
  const publicActionLabel = meta.isProposal
    ? 'Open Proposal'
    : canCollectPayment
      ? 'Open Pay Page'
      : 'Open Receipt';
  const publicQrLabel = meta.isProposal
    ? 'Proposal QR'
    : canCollectPayment
      ? 'Direct UPI QR'
      : 'Receipt QR';
  const paymentRouteLabel = isInternationalInvoice
    ? 'International Direct'
    : 'Direct UPI & Bank';
  const paymentRouteDetail = isInternationalInvoice
    ? 'This invoice is configured for direct transfer to your international account (Wise, PayPal, or Bank Wire).'
    : 'Clients pay directly into your personal UPI ID / Bank account with 0% platform fee and instant settlement.';

  const statusClass = !meta.isProposal
    ? meta.status === 'paid'
      ? 'bg-emerald-400/5 text-emerald-400 border-emerald-400/10'
      : meta.status === 'overdue'
        ? 'bg-red-400/5 text-red-400 border-red-400/10'
        : 'bg-yellow-400/5 text-yellow-500 border-yellow-400/10'
    : meta.status === 'accepted'
      ? 'bg-emerald-400/5 text-emerald-400 border-emerald-400/10'
      : meta.status === 'expired'
        ? 'bg-red-400/5 text-red-400 border-red-400/10'
        : 'bg-sky-400/5 text-sky-300 border-sky-400/10';

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

  const getQrDataUrl = (svgElement) => {
    if (!svgElement) return Promise.resolve(null);
    return new Promise((resolve) => {
      try {
        const xml = new XMLSerializer().serializeToString(svgElement);
        const svg64 = btoa(unescape(encodeURIComponent(xml)));
        const image64 = 'data:image/svg+xml;base64,' + svg64;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 240;
          canvas.height = 240;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 240, 240);
          ctx.drawImage(img, 0, 0, 240, 240);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(null);
        img.src = image64;
      } catch {
        resolve(null);
      }
    });
  };

  const downloadPdf = async () => {
    try {
      setDownloadingPdf(true);

      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]);
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

      const rightHeaderX = pageWidth - margin - 24;
      const productNameLines = doc.splitTextToSize(primaryProductName, 180).slice(0, 2);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('PRODUCT / SERVICE', rightHeaderX, 58, { align: 'right' });
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text(productNameLines, rightHeaderX, 78, { align: 'right' });
      doc.setFontSize(10);
      doc.setTextColor(226, 232, 240);
      doc.text(`${title} #${invoice.invoiceNumber}`, rightHeaderX, 116, { align: 'right' });

      doc.setFillColor(...gold);
      doc.roundedRect(pageWidth - margin - 118, 128, 94, 24, 6, 6, 'F');
      doc.setTextColor(...dark);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(toTitleCase(meta.status), pageWidth - margin - 71, 143, { align: 'center' });

      const infoY = 192;
      doc.setTextColor(...muted);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(meta.isProposal ? 'CLIENT / PREPARED FOR' : 'CLIENT / BILL TO', margin, infoY);
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

      // Draw UPI Payment QR onto PDF
      const qrSvg = document.getElementById('pdf-qr-source') || document.querySelector('.invoice-document svg');
      if (qrSvg) {
        try {
          const qrDataUrl = await getQrDataUrl(qrSvg);
          if (qrDataUrl) {
            const qrBoxY = Math.min(totalsY, pageHeight - 170);
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(...line);
            doc.roundedRect(margin, qrBoxY, 195, 76, 6, 6, 'FD');
            doc.addImage(qrDataUrl, 'PNG', margin + 6, qrBoxY + 6, 64, 64);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...dark);
            doc.text('Scan to Pay via UPI', margin + 78, qrBoxY + 22);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...muted);
            doc.text('GPay, PhonePe, Paytm', margin + 78, qrBoxY + 36);
            if (finalUpi) {
              doc.text(`UPI: ${finalUpi}`, margin + 78, qrBoxY + 50, { maxWidth: 110 });
            }
          }
        } catch (e) {
          console.warn('QR in PDF skipped:', e);
        }
      }

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
      trackEvent('download_invoice_pdf', {
        document_type: meta.typeLabel.toLowerCase(),
        invoice_status: meta.status,
        value: total,
        currency: invoice.currency || 'INR'
      });
    } catch (err) {
      alert('PDF failed');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const createPaymentLink = async ({ openAfterCreate = false } = {}) => {
    if (!canCollectPayment) return null;

    if (razorpayPaymentUrl) {
      if (openAfterCreate) {
        window.open(razorpayPaymentUrl, '_blank', 'noopener,noreferrer');
      }

      return razorpayPaymentUrl;
    }

    try {
      setCreatingPaymentLink(true);
      const res = await api.post(`/payment/invoices/${invoice._id}/payment-link`);
      const nextInvoice = res.data?.invoice || invoice;
      const nextUrl = res.data?.paymentLink?.shortUrl || nextInvoice.paymentLink?.shortUrl || '';
      setInvoice(nextInvoice);

      trackEvent('create_invoice_payment_link', {
        location: 'invoice_view',
        value: total,
        currency: invoice.currency || 'INR',
        simulation: Boolean(res.data?.simulation)
      });

      if (openAfterCreate && nextUrl) {
        window.open(nextUrl, '_blank', 'noopener,noreferrer');
      }

      return nextUrl;
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create Razorpay payment link.');
      return null;
    } finally {
      setCreatingPaymentLink(false);
    }
  };

  const sharePublicLink = async () => {
    const shareUrl = meta.isProposal ? publicDocumentUrl : paymentShareUrl;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${meta.typeLabel} ${invoice?.invoiceNumber || ''}`,
          text: `View ${meta.typeLabel.toLowerCase()} ${invoice?.invoiceNumber || ''}`,
          url: shareUrl
        });
        trackEvent('share_invoice_link', {
          method: 'native_share',
          document_type: meta.typeLabel.toLowerCase()
        });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        trackEvent('share_invoice_link', {
          method: 'clipboard',
          document_type: meta.typeLabel.toLowerCase()
        });
        alert('Link copied');
        return;
      }

      window.prompt('Copy this link:', shareUrl);
    } catch {
      // User cancelled the share flow.
    }
  };

  const shareWhatsAppReminder = () => {
    const message = [
      `Hi ${invoice.clientName},`,
      `This is a quick reminder for ${meta.typeLabel.toLowerCase()} ${invoice.invoiceNumber} of ${formatCurrency(total, invoice.currency)}.`,
      `${meta.dateLabel}: ${formatDate(displayDate)}.`,
      `You can view${meta.isProposal ? '' : ' and pay'} here: ${meta.isProposal ? publicDocumentUrl : paymentShareUrl}`,
      'Thank you.'
    ].join('\n\n');

    openWhatsAppShare(message);
    trackEvent('share_whatsapp_reminder', {
      location: 'invoice_view',
      document_type: meta.typeLabel.toLowerCase(),
      invoice_status: meta.status,
      value: total,
      currency: invoice.currency || 'INR'
    });
  };

  return (
    <div className="premium-page min-h-screen">
      <Navbar />

      <main className="container-custom pb-28 pt-8 sm:py-10 md:py-16">
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
                <span className={`h-1.5 w-1.5 rounded-full ${meta.status === 'paid' || meta.status === 'accepted' ? 'bg-emerald-400' : meta.status === 'expired' || meta.status === 'overdue' ? 'bg-red-400' : 'bg-yellow-500 animate-pulse'}`} />
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
            {!meta.isProposal && (
              <button
                type="button"
                onClick={togglePaidStatus}
                disabled={updatingStatus}
                className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 ${
                  invoice.status === 'paid'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {updatingStatus
                  ? 'Updating...'
                  : invoice.status === 'paid'
                  ? '✓ Paid (Click to Reopen)'
                  : '✓ Mark as Paid'}
              </button>
            )}
            {!meta.isProposal && invoice.status !== 'paid' && (
              <button
                type="button"
                onClick={shareWhatsAppReminder}
                className="rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-6 py-3 text-xs font-black uppercase tracking-widest text-emerald-300 transition-all hover:bg-emerald-400/15 hover:text-emerald-200"
              >
                WhatsApp Reminder
              </button>
            )}
            {!meta.isProposal && invoice.status !== 'paid' && (
              <button
                type="button"
                onClick={() => setShowDemandModal(true)}
                className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-5 py-3 text-xs font-black uppercase tracking-widest text-rose-300 transition-all hover:bg-rose-500/20 hover:text-rose-200"
              >
                ⚖️ Legal Notice
              </button>
            )}
            {!meta.isProposal && invoice.status !== 'paid' && (
              <a
                href={publicDocumentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary px-8 py-3 shadow-xl shadow-black/20 hover:-translate-y-0.5 transition-all inline-flex items-center gap-2"
              >
                <span>View Public Pay Page</span>
                <span className="text-xs">↗</span>
              </a>
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
              <p className="mt-2 break-words text-sm font-black text-white">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="reveal reveal-delay-1 mb-10 rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/10 sm:p-6 print:hidden">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_150px] md:items-center">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-400">
                Client Payment
              </p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-white sm:text-2xl">
                {canCollectPayment ? 'Pay now link and QR code' : meta.isProposal ? 'Client review link and QR code' : 'Receipt link and QR code'}
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-400">
                {canCollectPayment
                  ? 'Share this link with your client or scan the QR on mobile to open the secure payment page.'
                  : meta.isProposal
                    ? 'Share this public proposal link with your client for review and approval.'
                    : 'This invoice is already paid. Use the public link to view or share the receipt.'}
              </p>

              {canCollectPayment && (
                <div className={`mt-4 rounded-2xl border p-4 ${
                  isInternationalInvoice
                    ? 'border-sky-300/20 bg-sky-300/[0.06]'
                    : 'border-emerald-300/20 bg-emerald-300/[0.06]'
                }`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${
                        isInternationalInvoice ? 'text-sky-200' : 'text-emerald-200'
                      }`}>
                        {paymentRouteLabel}
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-zinc-400">
                        {paymentRouteDetail}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                      {invoice.currency || 'INR'}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap">
                <a
                  href={publicDocumentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary justify-center px-6 py-3 text-center"
                >
                  {publicActionLabel}
                </a>

                <button
                  type="button"
                  onClick={sharePublicLink}
                  className="btn btn-secondary justify-center px-6 py-3"
                >
                  Share Link
                </button>

                {canCollectPayment && (
                  <button
                    type="button"
                    onClick={shareWhatsAppReminder}
                    className="rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-6 py-3 text-xs font-black uppercase tracking-widest text-emerald-300 transition-all hover:bg-emerald-400/15 hover:text-emerald-200"
                  >
                    WhatsApp Reminder
                  </button>
                )}
              </div>
            </div>

            <div className="mx-auto w-full max-w-[150px] rounded-2xl border border-white/10 bg-white p-3 text-center shadow-xl shadow-black/20 md:ml-auto md:mr-0">
              <QRCode value={meta.isProposal ? publicDocumentUrl : paymentShareUrl} size={124} className="h-auto w-full" />
              <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                {publicQrLabel}
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-8">
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
                      <div className="min-w-0">
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

                  <div className="text-left md:max-w-xs md:text-right">
                    <div className="mb-5 rounded-lg border border-white/10 bg-white/[0.06] p-4 shadow-xl shadow-black/10 md:ml-auto">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Product / Service</p>
                      <p className="mt-2 break-words text-lg font-black leading-tight text-white sm:text-xl">{primaryProductName}</p>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{meta.typeLabel}</p>
                    <h2 className="mt-2 break-words text-3xl font-black tracking-tight text-white sm:text-4xl">#{invoice.invoiceNumber}</h2>
                    <span className={`mt-4 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusClass}`}>
                      {toTitleCase(meta.status)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-0 border-b border-slate-200 md:grid-cols-3">
                <div className="border-b border-slate-200 bg-slate-50 p-6 md:border-b-0 md:border-r md:p-8">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    {meta.isProposal ? 'Client / Prepared For' : 'Client / Bill To'}
                  </p>
                  <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{invoice.clientName}</h3>
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

                <div className="mt-8 grid gap-6">
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
                      <div className="mt-5 flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:inline-flex sm:flex-row sm:items-center">
                        <QRCode id="pdf-qr-source" value={upiLink} size={88} />
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
                          <span className="text-slate-400">GST Tax</span>
                          <span className="font-bold text-white">{formatCurrency(tax, invoice.currency)}</span>
                        </div>
                      )}
                      {tdsAmount > 0 && (
                        <div className="flex justify-between gap-4 text-sm text-yellow-300">
                          <span>TDS Deducted ({tdsRate}%)</span>
                          <span className="font-bold">-{formatCurrency(tdsAmount, invoice.currency)}</span>
                        </div>
                      )}
                      <div className="border-t border-white/10 pt-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                          {meta.isProposal ? 'Proposal Total' : tdsAmount > 0 ? 'Net Bank Deposit' : 'Amount Due'}
                        </p>
                        <p className="mt-2 break-words text-2xl font-black tracking-tight text-white sm:text-3xl">
                          {formatCurrency(tdsAmount > 0 ? netReceivable : total, invoice.currency)}
                        </p>
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

          <aside className="reveal reveal-delay-2 h-fit space-y-6">
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

                {canCollectPayment && (
                  <a
                    href={publicDocumentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-2xl bg-emerald-400/10 border border-emerald-400/15 hover:bg-emerald-400/15 transition-all group"
                  >
                    <span className="text-xs font-bold text-emerald-300 group-hover:text-emerald-200">
                      Open Client Pay Page
                    </span>
                    <svg className="h-4 w-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                )}

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
                  <span className="text-xs font-bold text-zinc-400 group-hover:text-white">
                    {canCollectPayment && hasRazorpayPaymentLink ? 'Share Payment Link' : 'Share Public Link'}
                  </span>
                  <svg className="h-4 w-4 text-zinc-600 group-hover:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C9.886 14.511 11.41 15.2 13 15.2c3.92 0 7.1-3.18 7.1-7.1S16.92 1 13 1 5.9 4.18 5.9 8.1c0 1.59.689 3.114 1.858 4.316M1 23l7-7m0 0l4-4m-4 4l4 4" /></svg>
                </button>

              </div>

              <div className="mb-8 rounded-3xl border border-white/5 bg-black/20 p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Payment History</p>
                {paymentTimeline.length ? (
                  <div className="mt-5 space-y-4">
                    {paymentTimeline.slice(0, 5).map((event, index) => (
                      <div key={`${event.type}-${event.occurredAt}-${index}`} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-black text-white">{getPaymentEventLabel(event.type)}</p>
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                              {formatDateTime(event.occurredAt)}
                            </p>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${
                            String(event.status || '').toLowerCase() === 'paid'
                              ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                              : 'border-yellow-400/20 bg-yellow-400/10 text-yellow-300'
                          }`}>
                            {event.status || 'tracked'}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-black text-white">
                          {formatCurrency(event.amount || total, event.currency || invoice.currency)}
                        </p>
                        {event.providerPaymentId && (
                          <p className="mt-2 break-all text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                            Payment ID: {event.providerPaymentId}
                          </p>
                        )}
                        {event.message && (
                          <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-500">{event.message}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-500">
                    No Razorpay activity yet. Create a payment link to start tracking the collection flow.
                  </p>
                )}
              </div>

              {!meta.isProposal && invoice.status !== 'paid' && finalUpi && (
                <div className="p-6 rounded-3xl bg-black border border-white/5 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-4">Quick UPI Settlement</p>
                  <div className="flex justify-center mb-6 p-4 bg-white rounded-2xl">
                    <QRCode value={upiLink} size={140} />
                  </div>
                  <button
                    onClick={() => {
                      trackEvent('begin_invoice_payment', {
                        method: 'upi_app',
                        location: 'invoice_view',
                        value: total,
                        currency: invoice.currency || 'INR'
                      });
                      window.location.href = upiLink;
                    }}
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

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-zinc-950/95 p-3 shadow-2xl shadow-black/40 backdrop-blur md:hidden print:hidden">
        <div className="mx-auto grid max-w-md grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
          <a
            href={publicDocumentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-yellow-400 px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-black"
          >
            {canCollectPayment ? 'Pay Page' : 'Open Link'}
          </a>

          <button
            type="button"
            onClick={shareWhatsAppReminder}
            className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-300"
          >
            WA
          </button>
          <button
            type="button"
            onClick={downloadPdf}
            disabled={downloadingPdf}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-60"
          >
            PDF
          </button>
        </div>
      </div>

      {/* FORMAL LEGAL DEMAND NOTICE MODAL */}
      {showDemandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-left my-8">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⚖️</span>
                <div>
                  <h3 className="text-base font-black text-white">Formal Demand for Payment Notice</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Pre-action recovery notice under Indian Contract Act & MSME Samadhaan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDemandModal(false)}
                className="text-slate-400 hover:text-white p-1 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Send this formal demand notice when a client delays or stops responding. It establishes legal proof of debt and gives a strict 7-day cure period before statutory escalation.
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-[11px] text-slate-300 max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
              {getDemandNoticeText()}
            </div>

            <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <span>🛡️ Safe legal template engine</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={copyDemandNotice}
                  className="flex-1 sm:flex-initial px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                >
                  {demandCopied ? '✓ Copied Notice' : 'Copy Notice Text'}
                </button>
                <button
                  type="button"
                  onClick={downloadDemandNoticePdf}
                  disabled={downloadingDemandPdf}
                  className="flex-1 sm:flex-initial px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {downloadingDemandPdf ? 'Preparing...' : 'Download Notice PDF 📄'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
