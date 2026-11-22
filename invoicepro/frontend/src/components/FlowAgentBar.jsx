import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { formatCurrency } from '../utils/auth';
import { getWhatsAppShareUrl } from '../utils/whatsapp';

export default function FlowAgentBar({ user, onInvoiceCreated, onGoalUpdated }) {
  const agentName = user?.agentConfig?.name || 'Flow';
  const voiceEnabled = user?.agentConfig?.voiceEnabled !== false;

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [agentResponse, setAgentResponse] = useState(null);
  const [draftActionLoading, setDraftActionLoading] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript.trim()) {
          setInput(transcript);
          handleSendCommand(transcript);
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const speakAloud = (text) => {
    if (!voiceEnabled || !window.speechSynthesis || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-IN';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {}
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setErrorMsg('Voice input is not supported in this browser. You can type commands below.');
      return;
    }
    setErrorMsg('');
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch {
        recognitionRef.current.stop();
      }
    }
  };

  const handleSendCommand = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    setLoading(true);
    setErrorMsg('');
    setCreatedInvoice(null);

    try {
      const res = await api.post('/ai/agent', { message: query });
      setAgentResponse(res.data);
      if (res.data?.reply) {
        speakAloud(res.data.reply);
      }
      if (res.data?.goalData && onGoalUpdated) {
        onGoalUpdated(res.data.goalData);
      }
      setInput('');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Unable to reach assistant. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ 100% USER PERMISSION: Create invoice only after explicit confirmation
  const handleConfirmCreateInvoice = async () => {
    const draft = agentResponse?.draft;
    if (!draft) return;

    setDraftActionLoading(true);
    try {
      const payload = {
        documentType: draft.documentType || 'invoice',
        clientName: draft.clientName || 'Client',
        clientEmail: draft.clientEmail || '',
        clientPhone: draft.clientPhone || '',
        currency: draft.currency || 'INR',
        amount: draft.amount || 0,
        cgst: draft.cgst || 0,
        sgst: draft.sgst || 0,
        items: Array.isArray(draft.items) && draft.items.length > 0 ? draft.items : [
          { name: draft.serviceDescription || 'Professional Service', price: draft.amount || 0 }
        ],
        dueDate: draft.dueDate || null,
        notes: draft.notes || `Created via ${agentName} AI Agent`
      };

      const res = await api.post('/invoices', payload);
      const newInv = res.data?.invoice;
      setCreatedInvoice(newInv);
      setAgentResponse((prev) => ({
        ...prev,
        draft: null,
        reply: `✅ Confirmed! Invoice #${newInv?.invoiceNumber || ''} created for ${newInv?.clientName || 'client'}. Ready to share!`
      }));
      speakAloud(`Invoice created successfully! Ready to share on WhatsApp.`);
      if (onInvoiceCreated) onInvoiceCreated(newInv);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to create invoice.');
    } finally {
      setDraftActionLoading(false);
    }
  };

  const shareWhatsApp = (inv) => {
    if (!inv?._id) return;
    const publicUrl = `${window.location.origin}/public/invoice/${inv._id}`;
    const amountStr = inv.currency === 'INR' ? `₹${Number(inv.amount || 0).toLocaleString('en-IN')}` : `${inv.currency} ${inv.amount}`;
    const msg = `Hi ${inv.clientName || 'there'}! Here is your invoice #${inv.invoiceNumber} for ${amountStr}. You can view and complete payment directly here:\n${publicUrl}\n\nThank you!`;
    const url = getWhatsAppShareUrl(msg, inv.clientPhone || '');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full mb-6">
      {/* Top Command Bar */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/90 p-3 shadow-xl backdrop-blur-xl sm:p-4">
        <div className="flex items-center gap-3">
          {/* Glowing Assistant Badge */}
          <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600/30 to-indigo-600/30 px-3 py-2 border border-blue-500/20">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${isListening ? 'bg-red-400 opacity-75' : 'bg-emerald-400 opacity-75'}`} />
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${isListening ? 'bg-red-500' : 'bg-emerald-500'}`} />
            </span>
            <span className="text-xs font-black tracking-wide text-blue-200">
              {agentName}
            </span>
          </div>

          {/* Text/Voice Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendCommand();
            }}
            className="flex flex-1 items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask ${agentName}: "Bill Vikram ₹20k" or "Who owes me?"`}
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2.5 text-sm text-white placeholder-slate-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />

            {/* Voice Mic Button */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
                  isListening
                    ? 'border-red-400 bg-red-500/20 text-red-400 animate-pulse'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
                title={isListening ? 'Stop listening' : 'Speak to assistant'}
                aria-label="Voice input"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
                  <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a4.5 4.5 0 0 0 9 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6 6 0 0 1-5.25 5.955V20.25h2.25a.75.75 0 0 1 0 1.5h-6a.75.75 0 0 1 0-1.5h2.25v-2.045A6 6 0 0 1 6 12.75v-1.5a.75.75 0 0 1 .75-.75Z" />
                </svg>
              </button>
            )}

            {/* Send Button */}
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md transition hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
              aria-label="Send command"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
                </svg>
              )}
            </button>
          </form>
        </div>

        {/* Suggestion Chips */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] font-semibold text-slate-400">Quick shortcuts:</span>
          <button
            type="button"
            onClick={() => handleSendCommand('Bill Vikram ₹15,000 for website design with 18% GST due in 7 days')}
            className="rounded-lg border border-white/5 bg-white/5 px-2.5 py-1 text-slate-300 transition hover:border-blue-400/40 hover:bg-blue-600/10 hover:text-white"
          >
            📄 Draft invoice for ₹15k
          </button>
          <button
            type="button"
            onClick={() => handleSendCommand('Who owes me money? Check overdue invoices')}
            className="rounded-lg border border-white/5 bg-white/5 px-2.5 py-1 text-slate-300 transition hover:border-blue-400/40 hover:bg-blue-600/10 hover:text-white"
          >
            ⏰ Check overdue bills
          </button>
          <button
            type="button"
            onClick={() => handleSendCommand('How is my monthly revenue goal?')}
            className="rounded-lg border border-white/5 bg-white/5 px-2.5 py-1 text-slate-300 transition hover:border-blue-400/40 hover:bg-blue-600/10 hover:text-white"
          >
            🎯 Goal status
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-2 rounded-xl border border-red-500/20 bg-red-950/40 p-3 text-xs text-red-300">
          {errorMsg}
        </div>
      )}

      {/* ✅ 100% USER PERMISSION DRAFT CONFIRMATION CARD */}
      {agentResponse?.draft && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-blue-500/30 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-xl animate-fade-in">
          <div className="flex items-start justify-between border-b border-white/10 pb-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-bold text-blue-300">
                ⚡ {agentName} prepared this draft for your review
              </span>
              <h4 className="mt-1.5 text-lg font-black text-white">
                Invoice Draft for {agentResponse.draft.clientName || 'Client'}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setAgentResponse((p) => ({ ...p, draft: null }))}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="my-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div className="rounded-xl border border-white/5 bg-slate-950/50 p-3">
              <span className="text-slate-400">Client</span>
              <p className="mt-1 font-bold text-white truncate">{agentResponse.draft.clientName || 'N/A'}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-slate-950/50 p-3">
              <span className="text-slate-400">Subtotal</span>
              <p className="mt-1 font-bold text-white">{formatCurrency(agentResponse.totals?.subtotal || agentResponse.draft.amount, agentResponse.draft.currency)}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-slate-950/50 p-3">
              <span className="text-slate-400">GST (CGST+SGST)</span>
              <p className="mt-1 font-bold text-emerald-400">
                {agentResponse.totals?.taxRate > 0 ? `${agentResponse.totals.taxRate}% (${formatCurrency(agentResponse.totals.tax, agentResponse.draft.currency)})` : 'None'}
              </p>
            </div>
            <div className="rounded-xl border border-blue-500/20 bg-blue-950/30 p-3">
              <span className="text-blue-300 font-semibold">Total Payable</span>
              <p className="mt-1 text-sm font-black text-white">
                {formatCurrency(agentResponse.totals?.total || agentResponse.draft.amount, agentResponse.draft.currency)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-xs text-slate-400">
              🔒 Nothing is saved until you click confirm.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAgentResponse((p) => ({ ...p, draft: null }))}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateInvoice}
                disabled={draftActionLoading}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 text-xs font-black text-slate-950 shadow-lg transition hover:scale-105 disabled:opacity-50"
              >
                {draftActionLoading ? 'Creating...' : '✅ Confirm & Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS CARD AFTER CONFIRMATION */}
      {createdInvoice && (
        <div className="mt-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-4 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-emerald-300">✅ Invoice #{createdInvoice.invoiceNumber} created successfully!</p>
              <p className="text-sm font-black text-white">{createdInvoice.clientName} • {formatCurrency(createdInvoice.amount, createdInvoice.currency)}</p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`/invoice/${createdInvoice._id}`}
                className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/5"
              >
                View
              </a>
              <button
                type="button"
                onClick={() => shareWhatsApp(createdInvoice)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-black text-slate-950 shadow hover:bg-emerald-400"
              >
                💬 Share on WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERDUE AUDIT CARD */}
      {agentResponse?.overdueInvoices?.length > 0 && !agentResponse?.draft && (
        <div className="mt-3 rounded-2xl border border-amber-500/30 bg-slate-900/95 p-4 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="text-xs font-bold text-amber-300">
              ⚠️ {agentResponse.overdueInvoices.length} Overdue Payment{agentResponse.overdueInvoices.length > 1 ? 's' : ''} Identified
            </span>
            <button
              type="button"
              onClick={() => setAgentResponse((p) => ({ ...p, overdueInvoices: null }))}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {agentResponse.overdueInvoices.map((inv) => (
              <div key={inv._id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-slate-950/60 p-3">
                <div>
                  <p className="text-xs font-bold text-white">{inv.clientName} ({inv.invoiceNumber})</p>
                  <p className="text-[11px] text-red-400">{inv.daysOverdue} day{inv.daysOverdue > 1 ? 's' : ''} overdue • {formatCurrency(inv.amount, inv.currency)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => shareWhatsApp(inv)}
                  className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-bold text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 transition"
                >
                  💬 Send Reminder
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
