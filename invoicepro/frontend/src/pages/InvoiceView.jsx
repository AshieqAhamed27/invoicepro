import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import Navbar from '../components/Navbar';
import QRCode from 'react-qr-code';
import html2pdf from 'html2pdf.js';

const formatCurrency = (amount) => {
  return `₹ ${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2
  })}`;
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getUser();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const invoiceContentRef = useRef(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const res = await api.get(`/invoices/${id}`);
      setInvoice(res.data.invoice);
    } catch {
      alert('Invoice not found');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async () => {
    try {
      await api.put(`/invoices/${invoice._id}/status`, {
        status: 'paid'
      });
      setInvoice(prev => ({ ...prev, status: 'paid' }));
    } catch {
      alert('Failed to update status');
    }
  };

  const deleteInvoice = async () => {
    if (!window.confirm("Delete this invoice permanently?")) return;
    try {
      await api.delete(`/invoices/${invoice._id}`);
      navigate('/dashboard');
    } catch {
      alert("Delete failed");
    }
  };

  const publicInvoiceUrl = invoice ? `${window.location.origin}/public/invoice/${invoice._id}` : '';

  const downloadPdf = async () => {
    if (!invoiceContentRef.current) {
      return;
    }

    const invoiceDate = new Date(invoice.date || invoice.createdAt || Date.now()).toLocaleDateString('en-IN');
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'Not specified';
    const taxAmount = Math.max(0, tax);
    const isPaid = invoice.status === 'paid';
    const paidText = isPaid && invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString('en-IN') : '';

    const itemRows = items
      .map((item, idx) => `
        <tr>
          <td style="padding:12px 14px;border-bottom:1px solid #eef2f7;color:#0f172a;font-size:13px;">
            ${idx + 1}. ${escapeHtml(item.name || 'Service')}
          </td>
          <td style="padding:12px 14px;border-bottom:1px solid #eef2f7;color:#0f172a;font-size:13px;text-align:right;font-weight:700;">
            ${escapeHtml(formatCurrency(item.price))}
          </td>
        </tr>
      `)
      .join('');

    const pdfNode = document.createElement('div');
    pdfNode.style.position = 'fixed';
    pdfNode.style.left = '0';
    pdfNode.style.top = '0';
    pdfNode.style.zIndex = '-1';
    pdfNode.style.width = '794px';
    pdfNode.style.background = '#ffffff';
    pdfNode.style.color = '#0f172a';
    pdfNode.style.fontFamily = "'Inter', 'Segoe UI', Roboto, Arial, sans-serif";
    pdfNode.style.padding = '28px';
    pdfNode.innerHTML = `
      <div style="border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;padding:24px 28px;display:flex;justify-content:space-between;gap:18px;">
          <div>
            <div style="font-size:24px;font-weight:800;letter-spacing:0.3px;">${escapeHtml(companyName)}</div>
            <div style="font-size:12px;opacity:0.85;margin-top:6px;">${escapeHtml(user?.address || 'Mumbai, India')}</div>
            <div style="font-size:12px;opacity:0.85;margin-top:2px;">${escapeHtml(user?.email || '')}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px;letter-spacing:1.4px;text-transform:uppercase;opacity:0.8;">Invoice</div>
            <div style="font-size:22px;font-weight:800;margin-top:6px;">#${escapeHtml(invoice.invoiceNumber)}</div>
            <div style="font-size:12px;opacity:0.85;margin-top:8px;">Issued: ${escapeHtml(invoiceDate)}</div>
            <div style="font-size:12px;opacity:0.85;margin-top:2px;">Due: ${escapeHtml(dueDate)}</div>
          </div>
        </div>

        <div style="padding:24px 28px 8px;display:flex;justify-content:space-between;gap:20px;">
          <div>
            <div style="font-size:11px;color:#64748b;letter-spacing:1.2px;text-transform:uppercase;font-weight:700;">Billed To</div>
            <div style="font-size:19px;font-weight:700;margin-top:6px;color:#0f172a;">${escapeHtml(invoice.clientName)}</div>
            <div style="font-size:13px;color:#475569;margin-top:3px;">${escapeHtml(invoice.clientEmail)}</div>
          </div>
          <div style="text-align:right;">
            <div style="display:inline-block;padding:7px 14px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;background:${isPaid ? '#dcfce7' : '#fef9c3'};color:${isPaid ? '#166534' : '#854d0e'};">
              ${escapeHtml(invoice.status)}
            </div>
            ${isPaid ? `<div style="font-size:12px;color:#475569;margin-top:8px;">Paid on ${escapeHtml(paidText)}</div>` : ''}
          </div>
        </div>

        <div style="padding:0 28px 0;">
          <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:12px 14px;text-align:left;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#64748b;">Description</th>
                <th style="padding:12px 14px;text-align:right;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#64748b;">Amount</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:24px;padding:20px 28px 24px;">
          <div style="max-width:58%;">
            <div style="font-size:11px;color:#64748b;letter-spacing:1px;text-transform:uppercase;font-weight:700;">Internal Memo</div>
            <div style="font-size:13px;color:#334155;margin-top:7px;line-height:1.6;">${escapeHtml(invoice.serviceDescription || 'No description provided.')}</div>
            <div style="font-size:11px;color:#64748b;letter-spacing:1px;text-transform:uppercase;font-weight:700;margin-top:14px;">Payment Route</div>
            <div style="font-size:13px;color:#0f172a;margin-top:6px;font-weight:600;">${escapeHtml(finalUpi || 'Not provided')}</div>
          </div>
          <div style="min-width:220px;border:1px solid #e2e8f0;border-radius:14px;padding:14px 16px;background:#f8fafc;">
            <div style="display:flex;justify-content:space-between;font-size:13px;color:#475569;margin-bottom:9px;">
              <span>Subtotal</span><span>${escapeHtml(formatCurrency(subtotal))}</span>
            </div>
            ${taxAmount > 0 ? `
              <div style="display:flex;justify-content:space-between;font-size:13px;color:#475569;margin-bottom:9px;">
                <span>Tax</span><span>${escapeHtml(formatCurrency(taxAmount))}</span>
              </div>
            ` : ''}
            <div style="border-top:1px solid #cbd5e1;padding-top:10px;display:flex;justify-content:space-between;align-items:flex-end;">
              <span style="font-size:11px;color:#64748b;letter-spacing:1px;text-transform:uppercase;font-weight:700;">Total</span>
              <span style="font-size:24px;font-weight:800;color:#0f172a;">${escapeHtml(formatCurrency(invoice.amount))}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(pdfNode);

    try {
      setDownloadingPdf(true);
      await html2pdf()
        .set({
          margin: [0.25, 0.25, 0.25, 0.25],
          filename: `${invoice.invoiceNumber || 'invoice'}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        })
        .from(pdfNode)
        .save();
    } catch (err) {
      alert('Failed to download PDF');
    } finally {
      if (pdfNode.parentNode) {
        pdfNode.parentNode.removeChild(pdfNode);
      }
      setDownloadingPdf(false);
    }
  };

  const sharePublicLink = async () => {
    if (!publicInvoiceUrl) {
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Invoice ${invoice?.invoiceNumber || ''}`,
          text: `View invoice ${invoice?.invoiceNumber || ''}`,
          url: publicInvoiceUrl
        });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicInvoiceUrl);
        alert('Public link copied');
        return;
      }

      window.prompt('Copy this public link:', publicInvoiceUrl);
    } catch {
      // User cancelled share or clipboard is blocked.
    }
  };

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

  if (!invoice) return null;

  const companyName = user?.companyName || user?.name || 'InvoicePro';
  const items = invoice.items?.length > 0 ? invoice.items : [{ name: 'Service', price: invoice.amount }];
  const subtotal = items.reduce((s, i) => s + Number(i.price || 0), 0);
  const tax = invoice.amount - subtotal;
  const finalUpi = invoice.upiId || user?.upiId || '';

  const upiLink = finalUpi && `upi://pay?pa=${finalUpi}&pn=${encodeURIComponent(companyName)}&am=${invoice.amount}&cu=INR`;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="container-custom py-10 md:py-16">
        {/* ACTION HEADER */}
        <div className="reveal mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
               <span className="h-px w-8 bg-yellow-400" />
               <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Ledger Entry • #{invoice.invoiceNumber}</p>
            </div>
            <h1 className="text-4xl font-black sm:text-5xl tracking-tight text-white mb-2">
              Invoice Detail
            </h1>
            <div className="flex items-center gap-3">
               <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${invoice.status === 'paid' ? 'bg-emerald-400/5 text-emerald-400 border-emerald-400/10' : 'bg-yellow-400/5 text-yellow-500 border-yellow-400/10'}`}>
                 <span className={`h-1.5 w-1.5 rounded-full ${invoice.status === 'paid' ? 'bg-emerald-400' : 'bg-yellow-500 animate-pulse'}`} />
                 {invoice.status}
               </span>
               <p className="text-sm font-medium text-zinc-500">Issued to {invoice.clientName}</p>
            </div>
          </div>

          <div className="flex gap-3">
            {invoice.status !== 'paid' && (
              <button 
                onClick={markAsPaid} 
                className="btn btn-primary px-8 py-3 rounded-xl shadow-xl shadow-yellow-500/10 hover:scale-105 transition-all"
              >
                Mark as Paid
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
          {/* RECEIPT PREVIEW */}
          <section ref={invoiceContentRef} className="reveal reveal-delay-1 surface p-10 md:p-16 border-white/5 bg-white text-black rounded-[2.5rem] shadow-2xl relative overflow-hidden">
             {invoice.status === 'paid' && (
                <div className="absolute top-10 right-10 border-4 border-emerald-500 text-emerald-500 font-black text-4xl px-6 py-2 rotate-12 opacity-80 rounded-xl">
                  PAID
                </div>
             )}

             <div className="flex flex-col md:flex-row justify-between gap-10 mb-20">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter mb-4">{companyName}</h2>
                  <div className="space-y-1 text-sm text-gray-500 font-medium">
                    <p>{user?.address || 'Mumbai, India'}</p>
                    <p>{user?.email}</p>
                  </div>
                </div>

                <div className="text-left md:text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Billed To</p>
                  <h3 className="text-xl font-bold mb-1">{invoice.clientName}</h3>
                  <p className="text-sm text-gray-500 font-medium">{invoice.clientEmail}</p>
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
                      {items.map((item, i) => (
                        <tr key={i}>
                           <td className="py-6 font-bold text-gray-800">{item.name}</td>
                           <td className="py-6 text-right font-black text-gray-900">{formatCurrency(item.price)}</td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>

             <div className="flex flex-col items-end">
                <div className="w-full max-w-[240px] space-y-3">
                   <div className="flex justify-between text-sm font-medium text-gray-500">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                   </div>
                   {tax > 0 && (
                     <div className="flex justify-between text-sm font-medium text-gray-500">
                        <span>Tax</span>
                        <span>{formatCurrency(tax)}</span>
                     </div>
                   )}
                   <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
                      <span className="font-black text-gray-400 uppercase text-[10px] tracking-widest">Total Amount</span>
                      <span className="text-3xl font-black text-gray-900 tracking-tighter">{formatCurrency(invoice.amount)}</span>
                   </div>
                </div>
             </div>

             <div className="mt-20 pt-10 border-t border-gray-100 grid md:grid-cols-2 gap-10">
                <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Internal Memo</p>
                   <p className="text-sm text-gray-500 leading-relaxed font-medium italic">
                     {invoice.serviceDescription || 'No description provided.'}
                   </p>
                </div>
                <div className="flex flex-col md:items-end">
                   <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Payment Route</p>
                   <p className="text-lg font-black text-gray-900">{finalUpi}</p>
                </div>
             </div>
          </section>

          {/* SIDEBAR TOOLS */}
          <aside className="reveal reveal-delay-2 space-y-6 lg:sticky lg:top-28 h-fit">
             <div className="surface p-8 border-white/10 bg-zinc-950 shadow-2xl rounded-[2.5rem]">
                <div className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-white/5 border border-white/10 mb-8">
                  <p className="text-[10px] uppercase tracking-widest font-black text-zinc-500">Share Assets</p>
                </div>

                <div className="space-y-4 mb-8">
                   <a 
                     href={publicInvoiceUrl}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group"
                   >
                     <span className="text-xs font-bold text-zinc-400 group-hover:text-white">Public Portal Link</span>
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

                {invoice.status !== 'paid' && finalUpi && (
                  <div className="p-6 rounded-3xl bg-black border border-white/5 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-4">Quick UPI Settlement</p>
                    <div className="flex justify-center mb-6 p-4 bg-white rounded-2xl">
                       <QRCode value={upiLink} size={140} />
                    </div>
                    <button 
                      onClick={() => window.location.href = upiLink}
                      className="w-full py-4 rounded-xl bg-yellow-400 text-black font-black text-xs uppercase tracking-widest hover:scale-105 transition-all"
                    >
                      Open Mobile App
                    </button>
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