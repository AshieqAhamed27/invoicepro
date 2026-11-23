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

  // Voice Selection States
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(
    () => localStorage.getItem('flow_agent_voice') || user?.agentConfig?.voiceName || ''
  );
  const [showVoicePicker, setShowVoicePicker] = useState(false);

  const recognitionRef = useRef(null);
  const chatScrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const voicePickerRef = useRef(null);

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

  // Close voice picker when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (voicePickerRef.current && !voicePickerRef.current.contains(e.target)) {
        setShowVoicePicker(false);
      }
    };
    if (showVoicePicker) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showVoicePicker]);

  // 2. Initialize Web Speech Recognition
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
          handleSendCommand(transcript, { isVoiceInput: true });
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // 3. Smooth Chat Auto-Scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [conversation, loading]);

  // Stop active speech synthesis
  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    setIsSpeaking(false);
  };

  // Natural text-to-speech reply with selected voice
  const speakAloud = (text, customVoiceURI = null) => {
    if (!voiceEnabled || !window.speechSynthesis || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);

      const voices = availableVoices.length > 0 ? availableVoices : (window.speechSynthesis.getVoices() || []);
      const targetURI = customVoiceURI || selectedVoiceURI;

      let chosenVoice = null;
      if (targetURI) {
        chosenVoice = voices.find((v) => v.voiceURI === targetURI || v.name === targetURI);
      }
      if (!chosenVoice) {
        chosenVoice =
          voices.find((v) => /google uk english male|george|daniel|ryan|oliver/i.test(v.name)) ||
          voices.find((v) => v.lang === 'en-GB') ||
          voices.find((v) => /guy|david|natural|samantha|karen/i.test(v.name)) ||
          voices.find((v) => v.lang.startsWith('en')) ||
          voices[0];
      }

      if (chosenVoice) {
        utterance.voice = chosenVoice;
        utterance.lang = chosenVoice.lang;
      }

      utterance.rate = 1.0;
      utterance.pitch = chosenVoice && /male/i.test(chosenVoice.name) ? 0.95 : 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  };

  const handleSelectVoice = async (voice) => {
    const uri = voice.voiceURI || voice.name;
    setSelectedVoiceURI(uri);
    localStorage.setItem('flow_agent_voice', uri);
    setShowVoicePicker(false);

    speakAloud(`Voice updated. Ready for your command.`, uri);

    try {
      await api.put('/auth/profile', {
        agentConfig: {
          ...user?.agentConfig,
          voiceName: uri
        }
      });
    } catch {}
  };

  const toggleListening = () => {
    stopSpeaking();

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

  const handleSendCommand = async (textToSend, { isVoiceInput = false } = {}) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    stopSpeaking();

    const userMsg = {
      role: 'user',
      text: query,
      time: new Date(),
      isVoice: isVoiceInput
    };

    setConversation((prev) => [...prev.slice(-30), userMsg]);
    setInput('');
    setLoading(true);
    setErrorMsg('');
    setCreatedInvoice(null);

    try {
      const historyPayload = conversation.slice(-6).map((c) => ({
        role: c.role,
        text: c.text
      }));

      const res = await api.post('/ai/agent', {
        message: query,
        history: historyPayload
      });
      const data = res.data;

      const assistantMsg = {
        role: 'assistant',
        text: data.reply || `I'm on it.`,
        draft: data.draft || null,
        totals: data.totals || null,
        overdueInvoices: data.overdueInvoices || null,
        time: new Date()
      };

      setConversation((prev) => [...prev.slice(-30), assistantMsg]);

      if (data.draft) {
        setActiveDraft({ ...data.draft, totals: data.totals });
      } else {
        setActiveDraft(null);
      }

      if (data.overdueInvoices && data.overdueInvoices.length > 0) {
        setActiveOverdues(data.overdueInvoices);
      }

      // Speak aloud only when user used voice input
      if (data.reply && isVoiceInput) {
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

  // Find active voice label
  const currentVoiceObj = availableVoices.find((v) => v.voiceURI === selectedVoiceURI || v.name === selectedVoiceURI);
  const currentVoiceLabel = currentVoiceObj
    ? currentVoiceObj.name.replace(/(Microsoft|Google|Apple)\s*/i, '').slice(0, 18)
    : 'Default Voice';

  return (
    <div className="w-full mb-6 sm:mb-8">
      {/* ─── DYNAMIC COMMAND CAPSULE (World-Class Clean Alignment) ─── */}
      <div className="relative rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl p-4 sm:p-5 shadow-lg dark:shadow-[0_16px_48px_rgba(0,0,0,0.65)] transition-all">
        
        {/* ─── 1. TOP HEADER ROW: Assistant Identity, Live Status & Voice Picker ─── */}
        <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-white/[0.08]">
          
          {/* Left: Orb + Name + Status */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleListening}
              className={`group relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl border transition hover:scale-105 active:scale-95 focus:outline-none shrink-0 ${
                isListening
                  ? 'border-red-400 bg-red-500/10 text-red-500 shadow-md shadow-red-500/20'
                  : isSpeaking
                    ? 'border-cyan-400 bg-cyan-500/10 text-cyan-500 shadow-md shadow-cyan-500/20'
                    : 'border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-900 text-indigo-600 dark:text-cyan-400'
              }`}
              title={isListening ? 'Listening... Tap to stop' : `Talk to ${agentName}`}
            >
              {/* Soundwave Visualizer */}
              <div className="flex items-center justify-center gap-1">
                <span className={`w-1 rounded-full bg-current transition-all ${isListening || isSpeaking ? 'h-5 animate-pulse' : 'h-3'}`} />
                <span className={`w-1 rounded-full bg-current transition-all ${isListening || isSpeaking ? 'h-7 animate-pulse delay-75' : 'h-4'}`} />
                <span className={`w-1 rounded-full bg-current transition-all ${isListening || isSpeaking ? 'h-4 animate-pulse delay-150' : 'h-2'}`} />
              </div>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black tracking-wide text-slate-900 dark:text-white uppercase leading-none">
                  {agentName}
                </h3>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border transition ${
                  isListening
                    ? 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30 animate-pulse'
                    : isSpeaking
                      ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/30 animate-pulse'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                }`}>
                  {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Ready'}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                AI Chief of Staff
              </p>
            </div>
          </div>

          {/* Right: Voice Selector Dropdown (Cleanly Placed at Top Right) */}
          <div className="relative shrink-0" ref={voicePickerRef}>
            <button
              type="button"
              onClick={() => setShowVoicePicker((p) => !p)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-2.5 sm:px-3 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition hover:border-indigo-400 dark:hover:border-cyan-400/50 hover:bg-slate-100 dark:hover:bg-white/[0.08]"
              title="Change assistant voice"
            >
              <span>🎙️</span>
              <span className="hidden sm:inline max-w-[120px] truncate">{currentVoiceLabel}</span>
              <span className="text-[9px] text-slate-400">▼</span>
            </button>

            {/* Voice Dropdown Popover */}
            {showVoicePicker && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-950 p-3 shadow-2xl z-50 animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                    Assistant Voice
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowVoicePicker(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-2 max-h-56 overflow-y-auto space-y-1 pr-1 text-xs">
                  {availableVoices.length === 0 && (
                    <p className="p-3 text-slate-400 text-center">Loading browser voices...</p>
                  )}
                  {availableVoices
                    .filter((v) => v.lang.startsWith('en'))
                    .concat(availableVoices.filter((v) => !v.lang.startsWith('en')).slice(0, 5))
                    .map((voice) => {
                      const isSelected = selectedVoiceURI === voice.voiceURI || selectedVoiceURI === voice.name;
                      return (
                        <button
                          key={voice.voiceURI || voice.name}
                          type="button"
                          onClick={() => handleSelectVoice(voice)}
                          className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                            isSelected
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-cyan-500/20 dark:text-cyan-200 border border-indigo-200 dark:border-cyan-400/40 font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <p className="truncate font-semibold">{voice.name}</p>
                            <p className="text-[10px] text-slate-400">{voice.lang}</p>
                          </div>
                          {isSelected && <span className="text-indigo-600 dark:text-cyan-300 font-black text-xs">✓</span>}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── 2. UNIFIED COMMAND CAPSULE (Input + Mic + Send Integrated) ─── */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendCommand(input, { isVoiceInput: false });
          }}
          className="mt-3.5 flex items-center rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 p-1.5 focus-within:border-indigo-500 dark:focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-indigo-500/15 dark:focus-within:ring-cyan-500/20 transition shadow-inner"
        >
          {/* Sparkle Icon */}
          <span className="pl-3 pr-1 text-indigo-500 dark:text-cyan-400 shrink-0 text-sm">
            ✨
          </span>

          {/* Text Input Field */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Speak or type: e.g. "Hi", "Bill Vikram ₹20k", "Who owes me?"`}
            className="flex-1 bg-transparent px-2.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
          />

          {/* Integrated Actions Cluster */}
          <div className="flex items-center gap-1 shrink-0">
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition active:scale-95 ${
                  isListening
                    ? 'bg-red-500 text-white shadow-md shadow-red-500/30 animate-pulse'
                    : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-cyan-300 hover:bg-slate-200/60 dark:hover:bg-white/10'
                }`}
                title={isListening ? 'Listening... tap to stop' : 'Speak to Flow (assistant speaks reply back)'}
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
              aria-label="Send query"
              title="Send text (assistant will reply with text)"
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

        {/* ─── 3. QUICK COMMAND SUGGESTION CHIPS ─── */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 shrink-0">
            Commands:
          </span>
          <button
            type="button"
            onClick={() => handleSendCommand('Hi', { isVoiceInput: false })}
            className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-100/70 dark:bg-white/[0.03] px-3 py-1 font-medium text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:border-cyan-400/40 dark:hover:bg-cyan-500/10 hover:text-indigo-700 dark:hover:text-cyan-200 transition shrink-0 whitespace-nowrap"
          >
            👋 "Hi Flow"
          </button>
          <button
            type="button"
            onClick={() => handleSendCommand('Bill Vikram ₹20,000 for website design with 18% GST due in 7 days', { isVoiceInput: false })}
            className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-100/70 dark:bg-white/[0.03] px-3 py-1 font-medium text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:border-cyan-400/40 dark:hover:bg-cyan-500/10 hover:text-indigo-700 dark:hover:text-cyan-200 transition shrink-0 whitespace-nowrap"
          >
            📄 "Bill Vikram ₹20k"
          </button>
          <button
            type="button"
            onClick={() => handleSendCommand('Who owes me money?', { isVoiceInput: false })}
            className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-100/70 dark:bg-white/[0.03] px-3 py-1 font-medium text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:border-cyan-400/40 dark:hover:bg-cyan-500/10 hover:text-indigo-700 dark:hover:text-cyan-200 transition shrink-0 whitespace-nowrap"
          >
            ⏰ "Who owes me?"
          </button>
          <button
            type="button"
            onClick={() => handleSendCommand('How is my monthly revenue goal?', { isVoiceInput: false })}
            className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-100/70 dark:bg-white/[0.03] px-3 py-1 font-medium text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:border-cyan-400/40 dark:hover:bg-cyan-500/10 hover:text-indigo-700 dark:hover:text-cyan-200 transition shrink-0 whitespace-nowrap"
          >
            🎯 "Goal progress"
          </button>
        </div>
      </div>

      {/* ─── LIVE SCROLLABLE CONVERSATION STREAM ─── */}
      {conversation.length > 0 && (
        <div className="mt-3.5 rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white/95 dark:bg-slate-950/75 p-3.5 sm:p-5 shadow-xl backdrop-blur-xl animate-fade-in">
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100 dark:border-white/[0.06] text-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Conversation History ({conversation.length})
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                setConversation([]);
              }}
              className="rounded-lg px-2 py-0.5 text-[10px] font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-white transition hover:bg-slate-100 dark:hover:bg-white/5"
              title="Clear chat history"
            >
              Clear Chat
            </button>
          </div>

          {/* Smooth Scrollable Container */}
          <div
            ref={chatScrollRef}
            className="max-h-64 sm:max-h-80 overflow-y-auto space-y-3 pr-1.5 scroll-smooth overscroll-contain"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(150,150,150,0.3) transparent'
            }}
          >
            {conversation.map((msg, i) => (
              <div
                key={i}
                className={`flex items-start gap-2.5 sm:gap-3 rounded-2xl p-3 sm:p-3.5 text-xs sm:text-sm transition-all animate-fade-in ${
                  msg.role === 'user'
                    ? 'bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 ml-3 sm:ml-12 text-slate-800 dark:text-slate-200'
                    : 'bg-indigo-50/70 dark:bg-gradient-to-r dark:from-cyan-950/40 dark:via-slate-900/70 dark:to-slate-950/90 border border-indigo-200/80 dark:border-cyan-500/20 mr-3 sm:mr-12 text-slate-900 dark:text-white shadow-sm'
                }`}
              >
                <span className={`flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-xl text-[10px] sm:text-xs font-black ${
                  msg.role === 'user'
                    ? 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white'
                    : 'bg-indigo-600 text-white dark:bg-cyan-500/20 dark:text-cyan-300'
                }`}>
                  {msg.role === 'user' ? (msg.isVoice ? '🎤' : 'You') : '⚡'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="leading-relaxed break-words">{msg.text}</p>
                </div>
                {msg.role === 'assistant' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (isSpeaking) {
                        stopSpeaking();
                      } else {
                        speakAloud(msg.text);
                      }
                    }}
                    className="shrink-0 rounded-lg p-1 text-xs text-slate-400 hover:text-indigo-600 dark:hover:text-cyan-300 transition"
                    title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                    aria-label={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                  >
                    {isSpeaking ? '⏹️' : '🔊'}
                  </button>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2.5 rounded-2xl bg-indigo-50/70 dark:bg-cyan-950/30 border border-indigo-200 dark:border-cyan-500/20 p-3 text-xs text-indigo-700 dark:text-cyan-300 animate-pulse mr-4 sm:mr-16">
                <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-indigo-600 text-white dark:bg-cyan-500/20 text-xs">⚡</span>
                <span className="font-semibold">{agentName} is thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-50 dark:bg-red-950/40 p-3.5 text-xs text-red-600 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      {/* ─── 🔒 100% USER PERMISSION DRAFT CARD ─── */}
      {activeDraft && (
        <div className="mt-4 overflow-hidden rounded-3xl border border-indigo-300 dark:border-cyan-500/40 bg-white dark:bg-gradient-to-b dark:from-slate-900/98 dark:to-slate-950 p-4 sm:p-6 shadow-2xl backdrop-blur-2xl animate-fade-in">
          <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/10 pb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 dark:border-cyan-400/30 bg-indigo-50 dark:bg-cyan-400/10 px-3 py-0.5 text-xs font-black text-indigo-700 dark:text-cyan-300">
                🔒 Ready for Your Approval
              </span>
              <h4 className="mt-2 text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Invoice Draft for {activeDraft.clientName || 'Client'}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setActiveDraft(null)}
              className="rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
              title="Close draft"
            >
              ✕
            </button>
          </div>

          <div className="my-4 sm:my-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
            <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/40 p-3.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Client</span>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white truncate">{activeDraft.clientName || 'N/A'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/40 p-3.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Subtotal</span>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white truncate">{formatCurrency(activeDraft.totals?.subtotal || activeDraft.amount, activeDraft.currency)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/40 p-3.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">GST Rate</span>
              <p className="mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate">
                {activeDraft.totals?.taxRate > 0 ? `${activeDraft.totals.taxRate}% (+${formatCurrency(activeDraft.totals.tax, activeDraft.currency)})` : '0%'}
              </p>
            </div>
            <div className="rounded-2xl border border-indigo-200 dark:border-cyan-500/30 bg-indigo-50/50 dark:bg-cyan-950/30 p-3.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-cyan-300">Total Due</span>
              <p className="mt-1 text-base font-black text-slate-900 dark:text-white truncate">
                {formatCurrency(activeDraft.totals?.total || activeDraft.amount, activeDraft.currency)}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              🔒 Nothing is saved to your account until you approve.
            </p>
            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setActiveDraft(null)}
                className="w-full sm:w-auto rounded-2xl border border-slate-200 dark:border-white/10 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateInvoice}
                disabled={draftActionLoading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-2.5 text-xs font-black shadow-lg shadow-emerald-500/25 transition hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {draftActionLoading ? 'Creating...' : '✅ Confirm & Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CREATED INVOICE SHARE CARD ─── */}
      {createdInvoice && (
        <div className="mt-4 rounded-3xl border border-emerald-500/30 bg-white dark:bg-gradient-to-r dark:from-emerald-950/50 dark:to-slate-950 p-4 sm:p-5 shadow-xl animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">✅ Invoice Ready</p>
              <h5 className="mt-1 text-base sm:text-lg font-black text-slate-900 dark:text-white">
                #{createdInvoice.invoiceNumber} for {createdInvoice.clientName} ({formatCurrency(createdInvoice.amount, createdInvoice.currency)})
              </h5>
            </div>
            <div className="flex items-center gap-2.5 sm:gap-3">
              <a
                href={`/invoice/${createdInvoice._id}`}
                className="flex-1 sm:flex-initial text-center rounded-xl border border-slate-200 dark:border-white/10 px-4 py-2 text-xs font-bold text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition"
              >
                View
              </a>
              <button
                type="button"
                onClick={() => shareWhatsApp(createdInvoice)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-white px-5 py-2 text-xs font-black shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600"
              >
                💬 Share on WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── OVERDUE AUDIT SUMMARY CARD ─── */}
      {activeOverdues?.length > 0 && !activeDraft && (
        <div className="mt-4 rounded-3xl border border-amber-300 dark:border-amber-500/30 bg-white dark:bg-slate-950 p-4 sm:p-5 shadow-xl animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
            <span className="text-xs font-black tracking-wider text-amber-600 dark:text-amber-300 uppercase">
              ⚠️ {activeOverdues.length} Unpaid Overdue Invoice{activeOverdues.length > 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={() => setActiveOverdues(null)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {activeOverdues.map((inv) => (
              <div key={inv._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] p-3.5">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{inv.clientName} (#{inv.invoiceNumber})</p>
                  <p className="text-xs text-red-500 dark:text-red-400">{inv.daysOverdue} days past due • {formatCurrency(inv.amount, inv.currency)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => shareWhatsApp(inv)}
                  className="self-start sm:self-auto rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/20 px-3.5 py-1.5 text-xs font-black text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500 hover:text-white transition"
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
