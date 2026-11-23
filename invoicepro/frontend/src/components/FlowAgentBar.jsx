import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { formatCurrency } from '../utils/auth';
import { getWhatsAppShareUrl } from '../utils/whatsapp';

const SUPPORTED_LANGUAGES = [
  {
    id: 'en',
    name: 'English',
    flag: '🇬🇧',
    badge: 'Standard',
    subtext: 'Global JARVIS persona',
    speechLang: 'en-IN',
    previewText: 'Language set to English. Ready for your command.',
    placeholder: 'Speak or type: e.g. "Hi", "Bill Vikram ₹20k", "Who owes me?"',
    chips: [
      { label: '👋 "Hi Flow"', cmd: 'Hi' },
      { label: '📄 "Bill Vikram ₹20k"', cmd: 'Bill Vikram ₹20,000 for website design with 18% GST due in 7 days' },
      { label: '⏰ "Who owes me?"', cmd: 'Who owes me money?' },
      { label: '🎯 "Goal progress"', cmd: 'How is my monthly revenue goal?' }
    ]
  },
  {
    id: 'tanglish',
    name: 'Tanglish',
    flag: '🇮🇳',
    badge: 'தமிழ் + Eng',
    subtext: 'Tamil written in English',
    speechLang: 'en-IN',
    previewText: 'Language set to Tanglish! Vanakkam nanba, innaiku yaaru ku bill ready pannanum?',
    placeholder: 'Tanglish-la sollunga: "Vanakkam", "Vikram ku ₹20k bill podu", "Yaaru kaasu tharanum?"',
    chips: [
      { label: '👋 "Vanakkam Flow"', cmd: 'Vanakkam Flow' },
      { label: '📄 "Vikram ku ₹20k bill podu"', cmd: 'Vikram ku ₹20,000 website design-ku 18% GST oda invoice podu' },
      { label: '⏰ "Yaaru kaasu tharanum?"', cmd: 'Yaaru kaasu tharanum? Overdue bills evlo?' },
      { label: '🎯 "Goal status enna?"', cmd: 'Monthly revenue goal status enna?' }
    ]
  },
  {
    id: 'ta',
    name: 'தமிழ் (Tamil)',
    flag: '🇮🇳',
    badge: 'தமிழ்',
    subtext: 'தூய தமிழ் வடிவம்',
    speechLang: 'ta-IN',
    previewText: 'மொழி தமிழுக்கு மாற்றப்பட்டது. வணக்கம்! இன்று என்ன செய்ய வேண்டும்?',
    placeholder: 'தமிழில் பேசுங்கள்: "வணக்கம்", "விக்ரமுக்கு பில் போடு", "பாக்கி பணம் எவ்வளவு?"',
    chips: [
      { label: '👋 "வணக்கம் Flow"', cmd: 'வணக்கம் Flow' },
      { label: '📄 "விக்ரமுக்கு ₹20k பில்"', cmd: 'விக்ரமுக்கு ₹20,000 வலைத்தள வடிவமைப்புக்காக 18% GST உடன் ரசீது உருவாக்கு' },
      { label: '⏰ "பாக்கி பணம் எவ்வளவு?"', cmd: 'யாருடைய பணம் பாக்கி உள்ளது?' },
      { label: '🎯 "இலக்கு நிலை என்ன?"', cmd: 'எனது மாத வருவாய் இலக்கு நிலை என்ன?' }
    ]
  },
  {
    id: 'hi',
    name: 'हिंदी (Hindi)',
    flag: '🇮🇳',
    badge: 'हिंदी',
    speechLang: 'hi-IN',
    previewText: 'भाषा हिंदी चुनी गई है। नमस्ते! आज क्या काम करना है?',
    placeholder: 'हिंदी में बोलें या लिखें: "नमस्ते", "Vikram ko bill banao", "Kiska baki hai?"',
    chips: [
      { label: '👋 "नमस्ते Flow"', cmd: 'नमस्ते Flow' },
      { label: '📄 "Vikram ko ₹20k bill"', cmd: 'Vikram ko ₹20,000 website design ke liye 18% GST ke sath bill banao' },
      { label: '⏰ "Kiska baki hai?"', cmd: 'Kiska payment baki hai? Overdue invoices dikhao' },
      { label: '🎯 "Goal status kya hai?"', cmd: 'Mera monthly revenue goal status kya hai?' }
    ]
  }
];

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

  // Curated Multi-Language State
  const [selectedLangId, setSelectedLangId] = useState(
    () => localStorage.getItem('flow_agent_lang') || 'en'
  );
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);

  const recognitionRef = useRef(null);
  const chatScrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const langPickerRef = useRef(null);

  const activeLang = SUPPORTED_LANGUAGES.find((l) => l.id === selectedLangId) || SUPPORTED_LANGUAGES[0];

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

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (langPickerRef.current && !langPickerRef.current.contains(e.target)) {
        setShowLangPicker(false);
      }
    };
    if (showLangPicker) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showLangPicker]);

  // 2. Initialize Web Speech Recognition with dynamic language
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = activeLang.speechLang || 'en-IN';

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
  }, [activeLang.speechLang]);

  // 3. Smooth Chat Auto-Scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [conversation, loading]);

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    setIsSpeaking(false);
  };

  // Natural speech playback adapted to language
  const speakAloud = (text, langId = activeLang.id) => {
    if (!voiceEnabled || !window.speechSynthesis || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = availableVoices.length > 0 ? availableVoices : (window.speechSynthesis.getVoices() || []);

      let chosenVoice = null;
      if (langId === 'ta') {
        chosenVoice = voices.find((v) => v.lang === 'ta-IN' || v.lang.startsWith('ta')) ||
                      voices.find((v) => v.lang === 'en-IN');
        utterance.lang = chosenVoice ? chosenVoice.lang : 'ta-IN';
      } else if (langId === 'hi') {
        chosenVoice = voices.find((v) => v.lang === 'hi-IN' || v.lang.startsWith('hi')) ||
                      voices.find((v) => v.lang === 'en-IN');
        utterance.lang = chosenVoice ? chosenVoice.lang : 'hi-IN';
      } else if (langId === 'tanglish') {
        // Indian English voice speaks Tanglish authentically!
        chosenVoice = voices.find((v) => v.lang === 'en-IN') ||
                      voices.find((v) => /india|hindi|tamil/i.test(v.name)) ||
                      voices.find((v) => v.lang.startsWith('en')) ||
                      voices[0];
        utterance.lang = chosenVoice ? chosenVoice.lang : 'en-IN';
      } else {
        // Clean single English voice (UK / US natural)
        chosenVoice =
          voices.find((v) => /google uk english male|george|daniel|ryan|oliver/i.test(v.name)) ||
          voices.find((v) => v.lang === 'en-GB') ||
          voices.find((v) => /guy|david|natural|samantha/i.test(v.name)) ||
          voices.find((v) => v.lang.startsWith('en')) ||
          voices[0];
        utterance.lang = chosenVoice ? chosenVoice.lang : 'en-US';
      }

      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }

      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  };

  const handleSelectLanguage = (lang) => {
    setSelectedLangId(lang.id);
    localStorage.setItem('flow_agent_lang', lang.id);
    setShowLangPicker(false);

    if (recognitionRef.current) {
      recognitionRef.current.lang = lang.speechLang;
    }

    // Play pleasant voice preview in chosen language
    speakAloud(lang.previewText, lang.id);

    try {
      api.put('/auth/profile', {
        agentConfig: {
          ...user?.agentConfig,
          languageMode: lang.id
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
        history: historyPayload,
        languageMode: activeLang.id
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

      if (data.reply && isVoiceInput) {
        speakAloud(data.reply, activeLang.id);
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

      const successReply = activeLang.id === 'tanglish'
        ? `Invoice #${newInv?.invoiceNumber || ''} (${newInv?.clientName || 'client'}) create panniten! WhatsApp la share panna ready.`
        : activeLang.id === 'ta'
          ? `ரசீது #${newInv?.invoiceNumber || ''} வெற்றிகரமாக உருவாக்கப்பட்டது! பகிர தயாராக உள்ளது.`
          : `Confirmed! Invoice #${newInv?.invoiceNumber || ''} for ${newInv?.clientName || 'client'} has been generated. Ready to share!`;

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

  return (
    <div className="w-full mb-6 sm:mb-8">
      {/* ─── DYNAMIC COMMAND CAPSULE (World-Class Clean Alignment) ─── */}
      <div className="relative rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl p-4 sm:p-5 shadow-lg dark:shadow-[0_16px_48px_rgba(0,0,0,0.65)] transition-all">
        
        {/* ─── 1. TOP HEADER ROW: Assistant Identity, Live Status & Multi-Language Dropdown ─── */}
        <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-white/[0.08]">
          
          {/* Left: Living Orb + Name + Status */}
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

          {/* Right: Curated Multi-Language Selector (Clean & Uncluttered) */}
          <div className="relative shrink-0" ref={langPickerRef}>
            <button
              type="button"
              onClick={() => setShowLangPicker((p) => !p)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-2.5 sm:px-3 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition hover:border-indigo-400 dark:hover:border-cyan-400/50 hover:bg-slate-100 dark:hover:bg-white/[0.08]"
              title="Select language (English, Tanglish, Tamil, Hindi)"
            >
              <span>{activeLang.flag}</span>
              <span className="font-bold">{activeLang.name}</span>
              <span className="text-[9px] text-slate-400">▼</span>
            </button>

            {/* Language Selector Popover */}
            {showLangPicker && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-950 p-3 shadow-2xl z-50 animate-fade-in">
                <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-slate-100 dark:border-white/10">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                    Select Language
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowLangPicker(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-1 text-xs">
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const isSelected = selectedLangId === lang.id;
                    return (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => handleSelectLanguage(lang)}
                        className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left transition ${
                          isSelected
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-cyan-500/20 dark:text-cyan-200 border border-indigo-200 dark:border-cyan-400/40 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{lang.flag}</span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold">{lang.name}</span>
                              <span className="rounded-md bg-slate-200/60 dark:bg-white/10 px-1.5 py-0.2 text-[9px] font-semibold text-slate-600 dark:text-slate-300">
                                {lang.badge}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{lang.subtext}</p>
                          </div>
                        </div>
                        {isSelected && <span className="text-indigo-600 dark:text-cyan-300 font-black text-sm">✓</span>}
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
          <span className="pl-3 pr-1 text-indigo-500 dark:text-cyan-400 shrink-0 text-sm">
            ✨
          </span>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={activeLang.placeholder}
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
                    : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-cyan-300 hover:bg-slate-200/60 dark:hover:bg-white/10'
                }`}
                title={isListening ? 'Listening... tap to stop' : `Speak in ${activeLang.name}`}
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
              title="Send text"
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

        {/* ─── 3. QUICK COMMAND SUGGESTION CHIPS (Adapts to Active Language) ─── */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 shrink-0">
            Commands:
          </span>
          {activeLang.chips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendCommand(chip.cmd, { isVoiceInput: false })}
              className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-100/70 dark:bg-white/[0.03] px-3 py-1 font-medium text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:border-cyan-400/40 dark:hover:bg-cyan-500/10 hover:text-indigo-700 dark:hover:text-cyan-200 transition shrink-0 whitespace-nowrap"
            >
              {chip.label}
            </button>
          ))}
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
                className={`flex items-start gap-3 rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm transition-all animate-fade-in ${
                  msg.role === 'user'
                    ? 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 ml-3 sm:ml-12 shadow-sm'
                    : 'bg-slate-900 dark:bg-slate-900 border border-slate-800 dark:border-slate-700 mr-3 sm:mr-12 shadow-lg'
                }`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                  msg.role === 'user'
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                    : 'bg-indigo-600 text-white'
                }`}>
                  {msg.role === 'user' ? (msg.isVoice ? '🎤' : 'You') : '⚡'}
                </span>

                <div className="flex-1 min-w-0">
                  <p className={`leading-relaxed break-words font-medium text-xs sm:text-sm ${
                    msg.role === 'user'
                      ? 'text-slate-900 dark:text-slate-100'
                      : 'text-white'
                  }`}>
                    {msg.text}
                  </p>
                </div>

                {msg.role === 'assistant' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (isSpeaking) {
                        stopSpeaking();
                      } else {
                        speakAloud(msg.text, activeLang.id);
                      }
                    }}
                    className="shrink-0 rounded-xl p-2 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 transition active:scale-95"
                    title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                    aria-label={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                  >
                    {isSpeaking ? '⏹️' : '🔊'}
                  </button>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2.5 rounded-2xl bg-slate-900 border border-slate-800 p-3.5 text-xs text-white animate-pulse mr-4 sm:mr-16 shadow-md">
                <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-indigo-600 text-white text-xs">⚡</span>
                <span className="font-semibold text-white">{agentName} is thinking...</span>
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
