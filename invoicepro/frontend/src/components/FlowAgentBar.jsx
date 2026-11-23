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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [activeDraft, setActiveDraft] = useState(null);
  const [activeOverdues, setActiveOverdues] = useState(null);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [draftActionLoading, setDraftActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Initialize Web Speech API for hands-free voice
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

  // Natural text-to-speech reply
  const speakAloud = (text) => {
    if (!voiceEnabled || !window.speechSynthesis || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-IN';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
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
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        recognitionRef.current.start();
      } catch {
        recognitionRef.current.stop();
      }
    }
  };

  const handleSendCommand = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    // Add user message to conversation thread
    const userMsg = { role: 'user', text: query, time: new Date() };
    setConversation((prev) => [...prev.slice(-6), userMsg]);
    setInput('');
    setLoading(true);
    setErrorMsg('');
    setCreatedInvoice(null);

    try {
      const res = await api.post('/ai/agent', { message: query });
      const data = res.data;

      const assistantMsg = {
        role: 'assistant',
        text: data.reply || `I'm on it.`,
        draft: data.draft || null,
        totals: data.totals || null,
        overdueInvoices: data.overdueInvoices || null,
        time: new Date()
      };

      setConversation((prev) => [...prev.slice(-6), assistantMsg]);

      if (data.draft) {
        setActiveDraft({ ...data.draft, totals: data.totals });
      } else {
        setActiveDraft(null);
      }

      if (data.overdueInvoices && data.overdueInvoices.length > 0) {
        setActiveOverdues(data.overdueInvoices);
      }

      if (data.reply) {
        speakAloud(data.reply);
      }

      if (data.goalData && onGoalUpdated) {
        onGoalUpdated(data.goalData);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Unable to connect to assistant.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ 100% USER PERMISSION: Create invoice ONLY after explicit user confirmation
  const handleConfirmCreateInvoice = async () => {
    if (!activeDraft) return;

    setDraftActionLoading(true);
    try {
      const payload = {
        documentType: activeDraft.documentType || 'invoice',
        clientName: activeDraft.clientName || 'Client',
        clientEmail: activeDraft.clientEmail || '',
        clientPhone: activeDraft.clientPhone || '',
        currency: activeDraft.currency || 'INR',
        amount: activeDraft.totals?.total || activeDraft.amount || 0,
        cgst: activeDraft.totals?.cgst || activeDraft.cgst || 0,
        sgst: activeDraft.totals?.sgst || activeDraft.sgst || 0,
        items: Array.isArray(activeDraft.items) && activeDraft.items.length > 0 ? activeDraft.items : [
          { name: activeDraft.serviceDescription || 'Professional Service', price: activeDraft.amount || 0 }
        ],
        dueDate: activeDraft.dueDate || null,
        notes: activeDraft.notes || `Created via ${agentName} AI Co-Pilot`
      };

      const res = await api.post('/invoices', payload);
      const newInv = res.data?.invoice;
      setCreatedInvoice(newInv);
      setActiveDraft(null);

      const successReply = `Confirmed! Invoice #${newInv?.invoiceNumber || ''} for ${newInv?.clientName || 'client'} has been generated. Ready to share!`;
      setConversation((prev) => [
        ...prev,
        { role: 'assistant', text: successReply, isSuccess: true, time: new Date() }
      ]);
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
    const msg = `Hi ${inv.clientName || 'there'}! Here is your invoice #${inv.invoiceNumber} for ${amountStr}. You can view and pay directly via UPI / Card here:\n${publicUrl}\n\nThank you!`;
    const url = getWhatsAppShareUrl(msg, inv.clientPhone || '');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full mb-8">
      {/* ─── DYNAMIC ISLAND COMMAND CAPSULE (World-Class Glassmorphism) ─── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.12] bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-black/95 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all duration-300 hover:border-cyan-500/30">
        
        {/* Subtle Ambient Specular Glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-40 w-80 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500/10 via-indigo-500/15 to-purple-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          
          {/* JARVIS Living Core Audio Orb */}
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={toggleListening}
              className="group relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/80 shadow-inner transition hover:scale-105 focus:outline-none"
              title={isListening ? 'Listening... Tap to stop' : `Talk to ${agentName}`}
            >
              {/* Outer Breathing Rings */}
              <span
                className={`absolute inset-0 rounded-2xl transition-all duration-700 ${
                  isListening
                    ? 'animate-ping bg-red-500/30 ring-2 ring-red-400'
                    : isSpeaking
                      ? 'animate-pulse bg-cyan-500/25 ring-2 ring-cyan-400'
                      : 'bg-indigo-500/15 group-hover:bg-indigo-500/25'
                }`}
              />

              {/* Dynamic Soundwave Spectrum Visualizer */}
              <div className="relative z-10 flex items-center justify-center gap-1">
                <span className={`w-1 rounded-full bg-cyan-400 transition-all ${isListening || isSpeaking ? 'h-5 animate-pulse' : 'h-3'}`} />
                <span className={`w-1 rounded-full bg-blue-400 transition-all ${isListening || isSpeaking ? 'h-7 animate-pulse delay-75' : 'h-4'}`} />
                <span className={`w-1 rounded-full bg-indigo-400 transition-all ${isListening || isSpeaking ? 'h-4 animate-pulse delay-150' : 'h-2'}`} />
              </div>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wider text-white uppercase">{agentName}</span>
                <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-cyan-300 border border-cyan-400/20">
                  {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Ready'}
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400">Your AI Chief of Staff</p>
            </div>
          </div>

          {/* Natural Language Command Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendCommand();
            }}
            className="flex flex-1 items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Speak or type: e.g. "Hi", "Bill Vikram ₹20,000", "Who owes me?"`}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-cyan-400/60 focus:bg-black/60 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>

            {/* Mic Toggle Button */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition ${
                  isListening
                    ? 'border-red-400 bg-red-500/20 text-red-400 shadow-lg shadow-red-500/20 animate-pulse'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:border-cyan-400/40 hover:text-cyan-300'
                }`}
                title="Toggle voice mic"
                aria-label="Toggle voice"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
                  <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a4.5 4.5 0 0 0 9 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6 6 0 0 1-5.25 5.955V20.25h2.25a.75.75 0 0 1 0 1.5h-6a.75.75 0 0 1 0-1.5h2.25v-2.045A6 6 0 0 1 6 12.75v-1.5a.75.75 0 0 1 .75-.75Z" />
                </svg>
              </button>
            )}

            {/* Send Action */}
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/25 transition hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
              aria-label="Send query"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
                </svg>
              )}
            </button>
          </form>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.06] text-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Quick Commands:</span>
          <button
            type="button"
            onClick={() => handleSendCommand('Hi')}
            className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-1 text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-500/10 hover:text-cyan-200"
          >
            👋 "Hi Flow"
          </button>
          <button
            type="button"
            onClick={() => handleSendCommand('Bill Vikram ₹20,000 for website design with 18% GST due in 7 days')}
            className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-1 text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-500/10 hover:text-cyan-200"
          >
            📄 "Bill Vikram ₹20k"
          </button>
          <button
            type="button"
            onClick={() => handleSendCommand('Who owes me money?')}
            className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-1 text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-500/10 hover:text-cyan-200"
          >
            ⏰ "Who owes me?"
          </button>
          <button
            type="button"
            onClick={() => handleSendCommand('How is my monthly revenue goal?')}
            className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-1 text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-500/10 hover:text-cyan-200"
          >
            🎯 "Goal progress"
          </button>
        </div>
      </div>

      {/* ─── LIVE CONVERSATION STREAM (Claude / JARVIS Style Dialogue) ─── */}
      {conversation.length > 0 && (
        <div className="mt-3 space-y-2.5">
          {conversation.slice(-3).map((msg, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 rounded-2xl p-3.5 text-sm transition-all animate-fade-in ${
                msg.role === 'user'
                  ? 'bg-white/[0.03] border border-white/5 ml-8 text-slate-200'
                  : 'bg-gradient-to-r from-cyan-950/30 via-slate-900/60 to-slate-950/80 border border-cyan-500/20 mr-8 text-white shadow-lg'
              }`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xs font-black">
                {msg.role === 'user' ? 'You' : '⚡'}
              </span>
              <div className="flex-1">
                <p className="leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {errorMsg && (
        <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-950/40 p-3.5 text-xs text-red-300">
          {errorMsg}
        </div>
      )}

      {/* ─── 🔒 100% USER PERMISSION DRAFT CARD ─── */}
      {activeDraft && (
        <div className="mt-4 overflow-hidden rounded-3xl border border-cyan-500/40 bg-gradient-to-b from-slate-900/98 to-slate-950 p-6 shadow-2xl backdrop-blur-2xl animate-fade-in">
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-0.5 text-xs font-black text-cyan-300">
                🔒 Ready for Your Approval
              </span>
              <h4 className="mt-2 text-xl font-black text-white">
                Invoice Draft for {activeDraft.clientName || 'Client'}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setActiveDraft(null)}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white transition"
            >
              ✕
            </button>
          </div>

          <div className="my-5 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div className="rounded-2xl border border-white/5 bg-black/40 p-3.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Client</span>
              <p className="mt-1 text-sm font-bold text-white truncate">{activeDraft.clientName || 'N/A'}</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-black/40 p-3.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Subtotal</span>
              <p className="mt-1 text-sm font-bold text-white">{formatCurrency(activeDraft.totals?.subtotal || activeDraft.amount, activeDraft.currency)}</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-black/40 p-3.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">GST Rate</span>
              <p className="mt-1 text-sm font-bold text-emerald-400">
                {activeDraft.totals?.taxRate > 0 ? `${activeDraft.totals.taxRate}% (+${formatCurrency(activeDraft.totals.tax, activeDraft.currency)})` : '0%'}
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/30 p-3.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300">Total Due</span>
              <p className="mt-1 text-base font-black text-white">
                {formatCurrency(activeDraft.totals?.total || activeDraft.amount, activeDraft.currency)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/5">
            <p className="text-xs text-slate-400">
              🔒 Nothing is saved to your account until you approve.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveDraft(null)}
                className="rounded-2xl border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateInvoice}
                disabled={draftActionLoading}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 px-6 py-2.5 text-xs font-black text-slate-950 shadow-xl shadow-emerald-500/25 transition hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {draftActionLoading ? 'Creating...' : '✅ Confirm & Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CREATED INVOICE SHARE CARD ─── */}
      {createdInvoice && (
        <div className="mt-4 rounded-3xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/50 to-slate-950 p-5 shadow-xl animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-400">✅ Invoice Ready</p>
              <h5 className="mt-1 text-lg font-black text-white">
                #{createdInvoice.invoiceNumber} for {createdInvoice.clientName} ({formatCurrency(createdInvoice.amount, createdInvoice.currency)})
              </h5>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={`/invoice/${createdInvoice._id}`}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 transition"
              >
                View
              </a>
              <button
                type="button"
                onClick={() => shareWhatsApp(createdInvoice)}
                className="flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-300"
              >
                💬 Share on WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── OVERDUE AUDIT SUMMARY CARD ─── */}
      {activeOverdues?.length > 0 && !activeDraft && (
        <div className="mt-4 rounded-3xl border border-amber-500/30 bg-slate-950 p-5 shadow-2xl animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="text-xs font-black tracking-wider text-amber-300 uppercase">
              ⚠️ {activeOverdues.length} Unpaid Overdue Invoice{activeOverdues.length > 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={() => setActiveOverdues(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {activeOverdues.map((inv) => (
              <div key={inv._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3.5">
                <div>
                  <p className="text-sm font-bold text-white">{inv.clientName} (#{inv.invoiceNumber})</p>
                  <p className="text-xs text-red-400">{inv.daysOverdue} days past due • {formatCurrency(inv.amount, inv.currency)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => shareWhatsApp(inv)}
                  className="rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-3.5 py-1.5 text-xs font-black text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 transition"
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
