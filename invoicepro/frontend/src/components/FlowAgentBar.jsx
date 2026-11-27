import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { formatCurrency } from '../utils/auth';
import { getWhatsAppShareUrl } from '../utils/whatsapp';

const AGENT_CONFIG = {
  id: 'en',
  name: 'English',
  speechLang: 'en-IN',
  placeholder: 'Ask Flow or speak: "Bill Vikram ₹20k", "Who owes me?", "Find clients"...',
  chips: [
    { label: '📄 Bill Vikram ₹20k', cmd: 'Bill Vikram ₹20,000 for website design with 18% GST due in 7 days' },
    { label: '⏰ Who owes me?', cmd: 'Who owes me money? Highlight overdue accounts' },
    { label: '👥 Find first client', cmd: 'How to get my first client? Open client radar' },
    { label: '🎯 Goal progress', cmd: 'How is my monthly revenue goal progress?' }
  ]
};

// Pure Web Audio synthesized sound feedback (zero latency, zero MP3 assets)
const playAudioChime = (type = 'listen') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'listen') {
      // Soft high-tech ping
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(840, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.26);
    } else if (type === 'affirm') {
      // Metallic affirmative authorization chime
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(660, now + 0.08);
      osc.frequency.setValueAtTime(880, now + 0.16);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch {}
};

export default function FlowAgentBar({
  user,
  onInvoiceCreated,
  onGoalUpdated,
  onHighlightOverdue,
  onNavigate
}) {
  const agentName = user?.agentConfig?.name || 'Flow';
  const voiceEnabled = user?.agentConfig?.voiceEnabled !== false;

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  // Active HUD Telemetry State (Zero Chatbot History container)
  const [activeTelemetry, setActiveTelemetry] = useState(null);
  const [activeDraft, setActiveDraft] = useState(null);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [draftActionLoading, setDraftActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const memoryKey = user?._id ? `cf_flow_memory_${user._id}` : 'cf_flow_memory';

  // Conversational Multi-Turn Memory (Scoped to active user)
  const [chatMemory, setChatMemory] = useState(() => {
    try {
      const stored = sessionStorage.getItem(memoryKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(memoryKey);
      setChatMemory(stored ? JSON.parse(stored) : []);
    } catch {
      setChatMemory([]);
    }
  }, [user?._id]);

  const [availableVoices, setAvailableVoices] = useState([]);

  const recognitionRef = useRef(null);
  const executeCommandRef = useRef(null);
  const errorTimerRef = useRef(null);

  // 1. Detect & Load System Voices
  useEffect(() => {
    const loadVoices = () => {
      if (!window.speechSynthesis) return;
      const allVoices = window.speechSynthesis.getVoices() || [];
      if (allVoices.length > 0) {
        setAvailableVoices(allVoices);
      }
    };

    loadVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // 2. Initialize Web Speech Recognition (English)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = AGENT_CONFIG.speechLang;

      recognition.onstart = () => {
        setIsListening(true);
        playAudioChime('listen');
      };
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript.trim()) {
          setInput(transcript);
          executeCommandRef.current?.(transcript, { isVoiceInput: true });
        }
      };

      recognitionRef.current = recognition;
    }
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    setIsSpeaking(false);
  };

  // Natural English speech playback
  const speakAloud = (text) => {
    if (!voiceEnabled || !window.speechSynthesis || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = availableVoices.length > 0 ? availableVoices : (window.speechSynthesis.getVoices() || []);

      const chosenVoice =
        voices.find((v) => /google uk english male|george|daniel|ryan|oliver/i.test(v.name)) ||
        voices.find((v) => v.lang === 'en-GB') ||
        voices.find((v) => /guy|david|natural|samantha/i.test(v.name)) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];

      utterance.lang = chosenVoice ? chosenVoice.lang : 'en-US';
      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }

      utterance.rate = 1.02;
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
    stopSpeaking();
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          setIsListening(false);
        }
      }
    }
  };

  // ─── 4. EXECUTE COMMAND & DRIVE THE SCREEN ───
  const handleExecuteCommand = async (textToRun, { isVoiceInput = false } = {}) => {
    const query = (textToRun || input).trim();
    if (!query) return;

    stopSpeaking();
    setInput('');
    setLoading(true);
    setErrorMsg('');
    setCreatedInvoice(null);

    try {
      let res;
      try {
        res = await api.post('/ai/agent', {
          message: query,
          languageMode: 'en',
          history: chatMemory.slice(-8)
        });
      } catch (firstErr) {
        // Instant single retry only on actual network drops or cold boot
        if (!firstErr.response && (firstErr.code === 'ERR_NETWORK' || firstErr.message?.includes('Network Error'))) {
          await new Promise((r) => setTimeout(r, 400));
          res = await api.post('/ai/agent', {
            message: query,
            languageMode: 'en',
            history: chatMemory.slice(-8)
          });
        } else {
          throw firstErr;
        }
      }
      const data = res.data;

      // Update multi-turn conversational memory
      const updatedMemory = [
        ...chatMemory.slice(-7),
        { role: 'user', content: query },
        { role: 'assistant', content: data.reply || '' }
      ];
      setChatMemory(updatedMemory);
      try {
        sessionStorage.setItem(memoryKey, JSON.stringify(updatedMemory));
      } catch {}

      const telemetryResult = {
        query,
        reply: data.reply || 'Command processed.',
        isVoice: isVoiceInput,
        action: data.action || null,
        draft: data.draft || null,
        totals: data.totals || null,
        timestamp: new Date()
      };

      setActiveTelemetry(telemetryResult);

      // A. Screen Manipulation: Highlight Overdue Invoices in Ledger
      if (data.action?.type === 'HIGHLIGHT_OVERDUE' && onHighlightOverdue) {
        onHighlightOverdue(data.action.overdueIds || []);
      }

      // B. Screen Manipulation: Navigate to Workspace Tool (e.g. AI Proposal Writer, Client Finder)
      if (data.action?.type === 'NAVIGATE' && data.action.path) {
        const targetPath = data.action.path;
        setTimeout(() => {
          if (typeof onNavigate === 'function') {
            try {
              onNavigate(targetPath);
            } catch {
              window.location.href = targetPath;
            }
          } else {
            window.location.href = targetPath;
          }
        }, 350);
      }

      // C. Screen Manipulation: Stage Invoice Draft for Explicit Approval
      if (data.draft) {
        setActiveDraft({ ...data.draft, totals: data.totals });
      } else {
        setActiveDraft(null);
      }

      // D. Screen Manipulation: Update Revenue Goal
      if (data.goalData && onGoalUpdated) {
        onGoalUpdated(data.goalData);
      }

      // E. Strict Modality: Speak back aloud ONLY if spoken via microphone
      if (isVoiceInput && data.reply) {
        speakAloud(data.reply);
      }
    } catch (err) {
      const serverMsg = err.response?.data?.message;
      const friendlyNotice = serverMsg || '⚡ Flow is reconnecting to workspace neural services. Please try your command again in a moment.';
      setErrorMsg(friendlyNotice);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => setErrorMsg(''), 6000);
    } finally {
      setLoading(false);
    }
  };

  executeCommandRef.current = handleExecuteCommand;

  // ─── 5. 100% USER PERMISSION: CONFIRM & CREATE INVOICE ───
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
        notes: activeDraft.notes || `Authorized via ${agentName} JARVIS Controller`
      };

      const res = await api.post('/invoices', payload);
      const newInv = res.data?.invoice;
      playAudioChime('affirm');

      setCreatedInvoice(newInv);
      setActiveDraft(null);

      const successReply = `Confirmed. Invoice #${newInv?.invoiceNumber || ''} for ${newInv?.clientName || 'client'} has been recorded. Direct link ready.`;

      setActiveTelemetry({
        query: 'Invoice Authorization',
        reply: successReply,
        isVoice: false,
        action: { type: 'INVOICE_CREATED', invoice: newInv },
        timestamp: new Date()
      });

      if (onInvoiceCreated) onInvoiceCreated(newInv);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to authorize invoice creation.');
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

  const scrollToLedger = () => {
    const el = document.getElementById('cash-recovery-center');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="w-full mb-6 sm:mb-8">
      {/* ─── JARVIS UNIFIED OPERATING HUD (Single Cohesive Capsule) ─── */}
      <div className="relative rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 backdrop-blur-xl shadow-lg dark:shadow-[0_16px_56px_rgba(6,182,212,0.14)] transition-all overflow-hidden">
        
        {/* ─── Primary Controls Section (Header, Input, Quick Chips) ─── */}
        <div className="p-4 sm:p-5">
          {/* 1. HUD HEADER: Identity & Arc Reactor Status */}
          <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800/80">
            
            {/* Left: Living Arc Reactor Orb + System Callout */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleListening}
                className={`group relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl border transition-all hover:scale-105 active:scale-95 focus:outline-none shrink-0 ${
                  isListening
                    ? 'border-red-400 bg-rose-50 text-red-500 shadow-lg shadow-red-500/30 animate-pulse'
                    : isSpeaking
                      ? 'border-cyan-400 bg-indigo-50 text-cyan-400 shadow-lg shadow-cyan-500/30 animate-pulse'
                      : loading
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-400 shadow-lg shadow-indigo-500/30'
                        : 'border-slate-200 dark:border-cyan-500/30 bg-slate-100 dark:bg-cyan-950/20 text-indigo-600 dark:text-cyan-400'
                }`}
                title={isListening ? 'Listening... Tap to stop' : `Voice Command (${agentName})`}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className={`w-1 rounded-full bg-current transition-all ${isListening || isSpeaking ? 'h-5 animate-pulse' : 'h-3'}`} />
                  <span className={`w-1 rounded-full bg-current transition-all ${isListening || isSpeaking ? 'h-7 animate-pulse delay-75' : 'h-4'}`} />
                  <span className={`w-1 rounded-full bg-current transition-all ${isListening || isSpeaking ? 'h-4 animate-pulse delay-150' : 'h-2'}`} />
                </div>
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-black tracking-wider text-slate-900 dark:text-white uppercase leading-none">
                    {agentName} <span className="text-[10px] text-indigo-600 dark:text-cyan-400 font-mono font-bold">v2.5</span>
                  </h3>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border transition ${
                    isListening
                      ? 'bg-rose-50 text-red-600 dark:text-red-300 border-red-500/30 animate-pulse'
                      : isSpeaking
                        ? 'bg-indigo-50 text-cyan-600 dark:text-cyan-300 border-cyan-500/30 animate-pulse'
                        : loading
                          ? 'bg-indigo-50 text-indigo-600 dark:text-indigo-300 border-indigo-500/30 animate-pulse'
                          : 'bg-emerald-50 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                  }`}>
                    {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : loading ? 'Executing...' : 'Online'}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] font-mono font-medium text-slate-500 dark:text-cyan-400/80 mt-0.5">
                  AI WORKSPACE CO-PILOT
                </p>
              </div>
            </div>
          </div>

          {/* 2. COMMAND INPUT CAPSULE (Integrated Mic + Action Runner) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleExecuteCommand(input, { isVoiceInput: false });
            }}
            className="mt-3.5 flex items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-white p-1.5 focus-within:border-indigo-500 dark:focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-indigo-500/15 dark:focus-within:ring-cyan-500/25 transition shadow-inner"
          >
            <span className="pl-3 pr-1 text-indigo-500 dark:text-cyan-400 shrink-0 text-sm">
              ⚡
            </span>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={AGENT_CONFIG.placeholder}
              className="flex-1 bg-transparent px-2.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
            />

            <div className="flex items-center gap-1 shrink-0">
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition active:scale-95 ${
                    isListening
                      ? 'bg-red-500 text-white shadow-md shadow-red-500/30 animate-pulse'
                      : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-cyan-300 hover:bg-slate-200/60 dark:hover:bg-slate-100'
                  }`}
                  title={isListening ? 'Listening... tap to stop' : 'Speak a command'}
                  aria-label="Toggle voice"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
                    <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a4.5 4.5 0 0 0 9 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6 6 0 0 1-5.25 5.955V20.25h2.25a.75.75 0 0 1 0 1.5h-6a.75.75 0 0 1 0-1.5h2.25v-2.045A6 6 0 0 1 6 12.75v-1.5a.75.75 0 0 1 .75-.75Z" />
                  </svg>
                </button>
              )}

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-cyan-500 dark:to-indigo-600 text-white shadow-md shadow-indigo-500/20 dark:shadow-cyan-500/25 transition hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
                aria-label="Execute command"
                title="Execute"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
                  </svg>
                )}
              </button>
            </div>
          </form>

          {/* 3. QUICK COMMAND TRIGGERS */}
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-cyan-500/70 shrink-0 font-mono">
              COMMANDS:
            </span>
            {AGENT_CONFIG.chips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleExecuteCommand(chip.cmd, { isVoiceInput: false })}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/40 px-3 py-1 font-medium text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:border-indigo-200 dark:hover:bg-indigo-50 hover:text-indigo-700 dark:hover:text-cyan-200 transition shrink-0 whitespace-nowrap"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Inline Error Notice */}
          {errorMsg && (
            <div className="mt-3 rounded-2xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="text-sm">⚡</span>
                <span>{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg('')}
                className="text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-indigo-700 p-1 text-xs transition"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* ─── 4. INTEGRATED JARVIS MISSION READOUT (Seamlessly docked inside HUD) ─── */}
        {activeTelemetry && (
          <div className="border-t border-slate-200 bg-slate-50 p-4 sm:p-5 text-slate-900 animate-fade-in relative overflow-hidden">
            {/* Subtle Cyber Grid Glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-100/60 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                <span className="text-[10px] sm:text-[11px] font-black font-mono uppercase tracking-widest text-indigo-700">
                  FLOW ASSISTANT // {activeTelemetry.isVoice ? 'VOICE COMMAND' : 'CONSOLE COMMAND'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isSpeaking) {
                      stopSpeaking();
                    } else {
                      speakAloud(activeTelemetry.reply);
                    }
                  }}
                  className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-indigo-700 bg-white border border-slate-200 hover:bg-slate-100 transition flex items-center gap-1.5"
                  title={isSpeaking ? 'Mute voice' : 'Play audio'}
                >
                  <span>{isSpeaking ? '⏹️' : '🔊'}</span>
                  <span>{isSpeaking ? 'Mute' : 'Audio'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    stopSpeaking();
                    setActiveTelemetry(null);
                  }}
                  className="rounded-lg px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-indigo-700 transition hover:bg-slate-100"
                  title="Dismiss readout"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Guaranteed High-Contrast Pure White Text Readout */}
            <div className="py-1">
              <p className="text-sm sm:text-base font-medium text-slate-900 leading-relaxed tracking-wide">
                {activeTelemetry.reply}
              </p>
            </div>

            {/* Interactive Screen Action Banner: Highlight Overdue */}
            {activeTelemetry.action?.type === 'HIGHLIGHT_OVERDUE' && (
              <div className="mt-3.5 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
                  <span>⚡</span>
                  <span>LEDGER ILLUMINATED ({activeTelemetry.action.count || 'Accounts'} Overdue)</span>
                </div>
                <button
                  type="button"
                  onClick={scrollToLedger}
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-1.5 transition shadow-md active:scale-95"
                >
                  View in Ledger ↓
                </button>
              </div>
            )}

            {/* Interactive Screen Action Banner: Workspace Navigation */}
            {activeTelemetry.action?.type === 'NAVIGATE' && (
              <div className="mt-3.5 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                  <span>🚀</span>
                  <span>NAVIGATING TO {activeTelemetry.action.label || 'RADAR'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate(activeTelemetry.action.path)}
                  className="rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs px-4 py-1.5 transition shadow-md active:scale-95"
                >
                  Launch Now →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── 5. 🔒 100% USER PERMISSION HOLOGRAPHIC DRAFT CARD ─── */}
      {activeDraft && (
        <div className="mt-4 overflow-hidden rounded-3xl border border-indigo-300 dark:border-cyan-500/40 bg-white dark:bg-gradient-to-b dark:from-slate-900/98 dark:to-slate-950 p-4 sm:p-6 shadow-2xl backdrop-blur-2xl animate-fade-in">
          <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-200 pb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 dark:border-indigo-200 bg-indigo-50 dark:bg-indigo-50 px-3 py-0.5 text-xs font-black text-indigo-700 dark:text-cyan-300">
                🔒 Ready for Your Authorization
              </span>
              <h4 className="mt-2 text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Invoice Draft for {activeDraft.clientName || 'Client'}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setActiveDraft(null)}
              className="rounded-full border border-slate-200 dark:border-slate-200 bg-slate-50 dark:bg-slate-100 p-2 text-slate-600 hover:text-slate-600 dark:hover:text-indigo-700 transition"
              title="Close draft"
            >
              ✕
            </button>
          </div>

          <div className="my-4 sm:my-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-200 bg-slate-50 dark:bg-slate-50 p-3.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">Client</span>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white truncate">{activeDraft.clientName || 'N/A'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-200 bg-slate-50 dark:bg-slate-50 p-3.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">Subtotal</span>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white truncate">
                {formatCurrency(activeDraft.totals?.subtotal || activeDraft.amount, activeDraft.currency)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-200 bg-slate-50 dark:bg-slate-50 p-3.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">GST Rate</span>
              <p className="mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate">
                {activeDraft.totals?.taxRate > 0
                  ? `${activeDraft.totals.taxRate}% (+${formatCurrency(activeDraft.totals.tax, activeDraft.currency)})`
                  : '0%'}
              </p>
            </div>
            <div className="rounded-2xl border border-indigo-200 dark:border-cyan-500/30 bg-indigo-50/50 dark:bg-cyan-950/30 p-3.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-cyan-300">Total Due</span>
              <p className="mt-1 text-base font-black text-slate-900 dark:text-white truncate">
                {formatCurrency(activeDraft.totals?.total || activeDraft.amount, activeDraft.currency)}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-200">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              🔒 100% Permission Safe: Nothing is added to your database until you click confirm.
            </p>
            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setActiveDraft(null)}
                className="w-full sm:w-auto rounded-2xl border border-slate-200 dark:border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-100 transition"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateInvoice}
                disabled={draftActionLoading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-900 px-6 py-2.5 text-xs font-black shadow-lg shadow-emerald-500/25 transition hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {draftActionLoading ? 'Authorizing...' : '✅ Confirm & Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 6. CREATED INVOICE SHARE CARD ─── */}
      {createdInvoice && (
        <div className="mt-4 rounded-3xl border border-emerald-500/30 bg-white dark:bg-gradient-to-r dark:from-emerald-950/50 dark:to-slate-950 p-4 sm:p-5 shadow-xl animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-400 text-xl border border-emerald-500/30">
                ✓
              </span>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Invoice Created & Logged to Ledger
                </span>
                <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  #{createdInvoice.invoiceNumber || 'INV'} • {createdInvoice.clientName || 'Client'} ({formatCurrency(createdInvoice.amount, createdInvoice.currency)})
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => shareWhatsApp(createdInvoice)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs px-4 py-2 transition shadow-md active:scale-95"
              >
                <span>📱</span>
                <span>Send WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/public/invoice/${createdInvoice._id}`;
                  navigator.clipboard.writeText(url);
                  alert('Public invoice link copied to clipboard!');
                }}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-200 bg-slate-100 dark:bg-slate-100 hover:bg-slate-200 dark:hover:bg-slate-100 text-slate-700 dark:text-white font-bold text-xs px-3.5 py-2 transition"
              >
                <span>📋</span>
                <span>Copy Link</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
