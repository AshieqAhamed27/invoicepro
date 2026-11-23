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
          // User spoke via microphone -> reply will be spoken aloud
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
        // Preferred fallback: British English (JARVIS / Paul Bettany feel), then US Natural, then default
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

  // Change voice handler with instant live preview
  const handleSelectVoice = async (voice) => {
    const uri = voice.voiceURI || voice.name;
    setSelectedVoiceURI(uri);
    localStorage.setItem('flow_agent_voice', uri);
    setShowVoicePicker(false);

    // Speak quick preview confirmation with the newly selected voice
    speakAloud(`Voice set to ${voice.name}. Ready for your command.`, uri);

    // Persist to user profile
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

    // Add user message to conversation thread
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
      // Send conversation history for multi-turn contextual continuity
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

      // 🔊 STRICT MODALITY RULE:
      // Speak aloud ONLY if the user initiated with voice (microphone).
      // If user typed (or clicked a chip), reply stays strictly text.
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

  // 🔒 100% USER PERMISSION: Create invoice ONLY after explicit user confirmation
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

  // Find currently active voice name for badge display
  const currentVoiceObj = availableVoices.find((v) => v.voiceURI === selectedVoiceURI || v.name === selectedVoiceURI);
  const currentVoiceLabel = currentVoiceObj
    ? currentVoiceObj.name.replace(/(Microsoft|Google|Apple)\s*/i, '').slice(0, 16)
    : 'Default Voice';

  return (
    <div className="w-full mb-6 sm:mb-8">
      {/* ─── DYNAMIC ISLAND COMMAND CAPSULE (World-Class Glassmorphism & Fully Responsive) ─── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.12] bg-gradient-to-b from-slate-900/95 via-slate-950/98 to-black p-3.5 sm:p-5 shadow-[0_16px_48px_rgba(0,0,0,0.65)] backdrop-blur-2xl transition-all duration-300 hover:border-cyan-500/30">
        
        {/* Ambient Specular Glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-44 w-96 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500/10 via-indigo-500/15 to-purple-500/10 blur-3xl" />

        {/* ─── TOP SECTION: Persona, Voice Selector & Controls ─── */}
        <div className="relative z-10 flex flex-col gap-3.5 lg:flex-row lg:items-center">
          
          {/* Persona Header & Audio Orb */}
          <div className="flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleListening}
                className="group relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/80 shadow-inner transition hover:scale-105 active:scale-95 focus:outline-none shrink-0"
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

                {/* Soundwave Spectrum */}
                <div className="relative z-10 flex items-center justify-center gap-1">
                  <span className={`w-1 rounded-full bg-cyan-400 transition-all ${isListening || isSpeaking ? 'h-5 animate-pulse' : 'h-3'}`} />
                  <span className={`w-1 rounded-full bg-blue-400 transition-all ${isListening || isSpeaking ? 'h-7 animate-pulse delay-75' : 'h-4'}`} />
                  <span className={`w-1 rounded-full bg-indigo-400 transition-all ${isListening || isSpeaking ? 'h-4 animate-pulse delay-150' : 'h-2'}`} />
                </div>
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black tracking-wider text-white uppercase">{agentName}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border transition ${
                    isListening
                      ? 'bg-red-500/20 text-red-300 border-red-500/30 animate-pulse'
                      : isSpeaking
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 animate-pulse'
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  }`}>
                    {isListening ? 'Listening' : isSpeaking ? 'Speaking' : 'Ready'}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] font-medium text-slate-400">Chief of Staff</p>
              </div>
            </div>

            {/* Quick Voice Picker Toggle Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowVoicePicker((p) => !p)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-slate-300 transition hover:border-cyan-400/40 hover:bg-white/[0.08] hover:text-white"
                title="Change assistant voice"
              >
                <span>🎙️</span>
                <span className="hidden xs:inline max-w-[90px] truncate">{currentVoiceLabel}</span>
                <span className="text-[10px] text-slate-400">▾</span>
              </button>

              {/* Voice Picker Dropdown Modal */}
              {showVoicePicker && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border border-white/15 bg-slate-950/98 p-3 shadow-2xl backdrop-blur-2xl z-50 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-xs font-black uppercase tracking-wider text-white">Select Voice</span>
                    <button
                      type="button"
                      onClick={() => setShowVoicePicker(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mt-2 max-h-56 overflow-y-auto space-y-1.5 pr-1 text-xs">
                    {availableVoices.length === 0 && (
                      <p className="p-2 text-slate-400 text-center">Loading browser voices...</p>
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
                                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 font-bold'
                                : 'text-slate-300 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <p className="truncate font-semibold">{voice.name}</p>
                              <p className="text-[10px] text-slate-400">{voice.lang}</p>
                            </div>
                            {isSelected && <span className="text-cyan-300 text-xs">✓</span>}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Natural Language Command Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendCommand(input, { isVoiceInput: false });
            }}
            className="flex flex-1 items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Speak or type: "Hi", "Bill Vikram ₹20k", "Who owes me?"`}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition focus:border-cyan-400/60 focus:bg-black/60 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>

            {/* Mic Toggle Button */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl border transition active:scale-95 ${
                  isListening
                    ? 'border-red-400 bg-red-500/20 text-red-400 shadow-lg shadow-red-500/20 animate-pulse'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:border-cyan-400/40 hover:text-cyan-300'
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

            {/* Send Action */}
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/25 transition hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
              aria-label="Send query"
              title="Send text (assistant will reply with text)"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
                </svg>
              )}
            </button>
          </form>
        </div>

        {/* ─── Quick Suggestion Chips (Horizontally Scrollable on Mobile) ─── */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 pt-2 border-t border-white/[0.06] text-xs whitespace-nowrap no-scrollbar">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 shrink-0">Commands:</span>
          <button
            type="button"
            onClick={() => handleSendCommand('Hi', { isVoiceInput: false })}
            className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-1 text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-500/10 hover:text-cyan-200 shrink-0"
          >
            👋 "Hi Flow"
          </button>
          <button
            type="button"
            onClick={() => handleSendCommand('Bill Vikram ₹20,000 for website design with 18% GST due in 7 days', { isVoiceInput: false })}
            className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-1 text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-500/10 hover:text-cyan-200 shrink-0"
          >
            📄 "Bill Vikram ₹20k"
          </button>
          <button
            type="button"
            onClick={() => handleSendCommand('Who owes me money?', { isVoiceInput: false })}
            className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-1 text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-500/10 hover:text-cyan-200 shrink-0"
          >
            ⏰ "Who owes me?"
          </button>
          <button
            type="button"
            onClick={() => handleSendCommand('How is my monthly revenue goal?', { isVoiceInput: false })}
            className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-1 text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-500/10 hover:text-cyan-200 shrink-0"
          >
            🎯 "Goal progress"
          </button>
        </div>
      </div>

      {/* ─── LIVE SCROLLABLE CONVERSATION STREAM (Claude / JARVIS Dialogue Box) ─── */}
      {conversation.length > 0 && (
        <div className="mt-3.5 rounded-3xl border border-white/[0.08] bg-slate-950/75 p-3.5 sm:p-5 shadow-2xl backdrop-blur-xl animate-fade-in">
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-white/[0.06] text-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                Conversation History ({conversation.length})
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                setConversation([]);
              }}
              className="rounded-lg px-2 py-0.5 text-[10px] font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white"
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
              scrollbarColor: 'rgba(255,255,255,0.2) transparent'
            }}
          >
            {conversation.map((msg, i) => (
              <div
                key={i}
                className={`flex items-start gap-2.5 sm:gap-3 rounded-2xl p-3 sm:p-3.5 text-xs sm:text-sm transition-all animate-fade-in ${
                  msg.role === 'user'
                    ? 'bg-white/[0.03] border border-white/5 ml-3 sm:ml-12 text-slate-200'
                    : 'bg-gradient-to-r from-cyan-950/40 via-slate-900/70 to-slate-950/90 border border-cyan-500/20 mr-3 sm:mr-12 text-white shadow-lg'
                }`}
              >
                <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[10px] sm:text-xs font-black">
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
                    className="shrink-0 rounded-lg p-1 text-xs text-slate-400 transition hover:bg-white/10 hover:text-cyan-300"
                    title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                    aria-label={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                  >
                    {isSpeaking ? '⏹️' : '🔊'}
                  </button>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 p-3 text-xs text-cyan-300 animate-pulse mr-4 sm:mr-16">
                <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-cyan-500/20 text-xs">⚡</span>
                <span className="font-semibold">{agentName} is thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-950/40 p-3.5 text-xs text-red-300">
          {errorMsg}
        </div>
      )}

      {/* ─── 🔒 100% USER PERMISSION DRAFT CARD (Responsive Mobile & Desktop) ─── */}
      {activeDraft && (
        <div className="mt-4 overflow-hidden rounded-3xl border border-cyan-500/40 bg-gradient-to-b from-slate-900/98 to-slate-950 p-4 sm:p-6 shadow-2xl backdrop-blur-2xl animate-fade-in">
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-0.5 text-xs font-black text-cyan-300">
                🔒 Ready for Your Approval
              </span>
              <h4 className="mt-2 text-lg sm:text-xl font-black text-white">
                Invoice Draft for {activeDraft.clientName || 'Client'}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setActiveDraft(null)}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white transition"
              title="Close draft"
            >
              ✕
            </button>
          </div>

          <div className="my-4 sm:my-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
            <div className="rounded-2xl border border-white/5 bg-black/40 p-3.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Client</span>
              <p className="mt-1 text-sm font-bold text-white truncate">{activeDraft.clientName || 'N/A'}</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-black/40 p-3.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Subtotal</span>
              <p className="mt-1 text-sm font-bold text-white truncate">{formatCurrency(activeDraft.totals?.subtotal || activeDraft.amount, activeDraft.currency)}</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-black/40 p-3.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">GST Rate</span>
              <p className="mt-1 text-sm font-bold text-emerald-400 truncate">
                {activeDraft.totals?.taxRate > 0 ? `${activeDraft.totals.taxRate}% (+${formatCurrency(activeDraft.totals.tax, activeDraft.currency)})` : '0%'}
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/30 p-3.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300">Total Due</span>
              <p className="mt-1 text-base font-black text-white truncate">
                {formatCurrency(activeDraft.totals?.total || activeDraft.amount, activeDraft.currency)}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-white/5">
            <p className="text-xs text-slate-400">
              🔒 Nothing is saved to your account until you approve.
            </p>
            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setActiveDraft(null)}
                className="w-full sm:w-auto rounded-2xl border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateInvoice}
                disabled={draftActionLoading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 px-6 py-2.5 text-xs font-black text-slate-950 shadow-xl shadow-emerald-500/25 transition hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {draftActionLoading ? 'Creating...' : '✅ Confirm & Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CREATED INVOICE SHARE CARD ─── */}
      {createdInvoice && (
        <div className="mt-4 rounded-3xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/50 to-slate-950 p-4 sm:p-5 shadow-xl animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-400">✅ Invoice Ready</p>
              <h5 className="mt-1 text-base sm:text-lg font-black text-white">
                #{createdInvoice.invoiceNumber} for {createdInvoice.clientName} ({formatCurrency(createdInvoice.amount, createdInvoice.currency)})
              </h5>
            </div>
            <div className="flex items-center gap-2.5 sm:gap-3">
              <a
                href={`/invoice/${createdInvoice._id}`}
                className="flex-1 sm:flex-initial text-center rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 transition"
              >
                View
              </a>
              <button
                type="button"
                onClick={() => shareWhatsApp(createdInvoice)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-2 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-300"
              >
                💬 Share on WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── OVERDUE AUDIT SUMMARY CARD ─── */}
      {activeOverdues?.length > 0 && !activeDraft && (
        <div className="mt-4 rounded-3xl border border-amber-500/30 bg-slate-950 p-4 sm:p-5 shadow-2xl animate-fade-in">
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
              <div key={inv._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3.5">
                <div>
                  <p className="text-sm font-bold text-white">{inv.clientName} (#{inv.invoiceNumber})</p>
                  <p className="text-xs text-red-400">{inv.daysOverdue} days past due • {formatCurrency(inv.amount, inv.currency)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => shareWhatsApp(inv)}
                  className="self-start sm:self-auto rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-3.5 py-1.5 text-xs font-black text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 transition"
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
