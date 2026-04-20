import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import Navbar from '../components/Navbar';
import QRCode from 'react-qr-code';

const formatCurrency = (amount) => {
  return `₹ ${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2
  })}`;
};

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getUser();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

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
          <section className="reveal reveal-delay-1 surface p-10 md:p-16 border-white/5 bg-white text-black rounded-[2.5rem] shadow-2xl relative overflow-hidden">
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
                     href={`${window.location.origin}/p/invoice/${invoice._id}`}
                     target="_blank"
                     className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group"
                   >
                     <span className="text-xs font-bold text-zinc-400 group-hover:text-white">Public Portal Link</span>
                     <svg className="h-4 w-4 text-zinc-600 group-hover:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                   </a>
                   
                   <button 
                     onClick={() => window.print()}
                     className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group"
                   >
                     <span className="text-xs font-bold text-zinc-400 group-hover:text-white">Download PDF (Print)</span>
                     <svg className="h-4 w-4 text-zinc-600 group-hover:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
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