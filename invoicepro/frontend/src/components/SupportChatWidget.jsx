import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';
import {
  PRODUCT_NAME,
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY
} from '../utils/company';

const hiddenRoutePrefixes = ['/public/invoice', '/p/invoice'];

const fallbackAnswer = `I'm with you. The coach is slow right now, but do this first: tell me the exact thing you are trying to finish.

Example: "help me get clients", "explain this page", "fix payment setup", or "what should I do next". I will guide you step by step. For direct support, email ${SUPPORT_EMAIL} or call ${SUPPORT_PHONE_DISPLAY}.`;

const defaultQuickQuestions = [
  'Explain this product clearly',
  'How should I start?',
  'How do I get clients?',
  'How do I collect payment?',
  'What should I say to clients?',
  'Why should I pay for Pro?'
];

const languageModes = [
  {
    id: 'auto',
    label: 'All languages',
    speechLang: 'en-IN',
    voiceLang: 'auto'
  },
  {
    id: 'english',
    label: 'English',
    speechLang: 'en-IN',
    voiceLang: 'en-IN'
  },
  {
    id: 'hindi',
    label: 'Hindi',
    speechLang: 'hi-IN',
    voiceLang: 'hi-IN'
  },
  {
    id: 'hinglish',
    label: 'Hindi + English',
    speechLang: 'hi-IN',
    voiceLang: 'hi-IN'
  },
  {
    id: 'tamil',
    label: 'Tamil',
    speechLang: 'ta-IN',
    voiceLang: 'ta-IN'
  },
  {
    id: 'tanglish',
    label: 'Tamil + English',
    speechLang: 'en-IN',
    voiceLang: 'en-IN'
  },
  {
    id: 'telugu',
    label: 'Telugu',
    speechLang: 'te-IN',
    voiceLang: 'te-IN'
  },
  {
    id: 'kannada',
    label: 'Kannada',
    speechLang: 'kn-IN',
    voiceLang: 'kn-IN'
  },
  {
    id: 'malayalam',
    label: 'Malayalam',
    speechLang: 'ml-IN',
    voiceLang: 'ml-IN'
  },
  {
    id: 'bengali',
    label: 'Bengali',
    speechLang: 'bn-IN',
    voiceLang: 'bn-IN'
  },
  {
    id: 'marathi',
    label: 'Marathi',
    speechLang: 'mr-IN',
    voiceLang: 'mr-IN'
  },
  {
    id: 'gujarati',
    label: 'Gujarati',
    speechLang: 'gu-IN',
    voiceLang: 'gu-IN'
  },
  {
    id: 'punjabi',
    label: 'Punjabi',
    speechLang: 'pa-IN',
    voiceLang: 'pa-IN'
  },
  {
    id: 'urdu',
    label: 'Urdu',
    speechLang: 'ur-IN',
    voiceLang: 'ur-IN'
  },
  {
    id: 'arabic',
    label: 'Arabic',
    speechLang: 'ar-SA',
    voiceLang: 'ar-SA'
  },
  {
    id: 'french',
    label: 'French',
    speechLang: 'fr-FR',
    voiceLang: 'fr-FR'
  },
  {
    id: 'spanish',
    label: 'Spanish',
    speechLang: 'es-ES',
    voiceLang: 'es-ES'
  },
  {
    id: 'german',
    label: 'German',
    speechLang: 'de-DE',
    voiceLang: 'de-DE'
  },
  {
    id: 'portuguese',
    label: 'Portuguese',
    speechLang: 'pt-BR',
    voiceLang: 'pt-BR'
  },
  {
    id: 'indonesian',
    label: 'Indonesian',
    speechLang: 'id-ID',
    voiceLang: 'id-ID'
  },
  {
    id: 'malay',
    label: 'Malay',
    speechLang: 'ms-MY',
    voiceLang: 'ms-MY'
  },
  {
    id: 'chinese',
    label: 'Chinese',
    speechLang: 'zh-CN',
    voiceLang: 'zh-CN'
  },
  {
    id: 'japanese',
    label: 'Japanese',
    speechLang: 'ja-JP',
    voiceLang: 'ja-JP'
  },
  {
    id: 'korean',
    label: 'Korean',
    speechLang: 'ko-KR',
    voiceLang: 'ko-KR'
  }
];

const assistantStyles = `
  @keyframes cf-guide-bob {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }

  @keyframes cf-guide-wave {
    0%, 100% { transform: rotate(-16deg); }
    50% { transform: rotate(18deg); }
  }

  @keyframes cf-guide-blink {
    0%, 88%, 100% { transform: scaleY(1); }
    92%, 96% { transform: scaleY(0.12); }
  }

  @keyframes cf-guide-glow {
    0%, 100% { opacity: 0.55; transform: scale(1); }
    50% { opacity: 0.9; transform: scale(1.08); }
  }

  @keyframes cf-guide-talk {
    0%, 100% { transform: translateX(-50%) scaleY(1); }
    50% { transform: translateX(-50%) scaleY(2.35); }
  }

  @keyframes cf-guide-listen {
    0%, 100% { opacity: 0.35; transform: scale(1); }
    50% { opacity: 0.85; transform: scale(1.14); }
  }
`;

const getLanguageMode = (mode) =>
  languageModes.find((item) => item.id === mode) || languageModes[0];

const cleanTranscript = (value) =>
  String(value || '').replace(/\s+/g, ' ').trim();

const getSpeechRecognition = () => {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

const isSpeechSynthesisSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

const detectSpeechLanguage = (text) => {
  const value = String(text || '');
  const scriptChecks = [
    { pattern: /[\u0B80-\u0BFF]/, language: 'ta-IN' },
    { pattern: /[\u0900-\u097F]/, language: 'hi-IN' },
    { pattern: /[\u0C00-\u0C7F]/, language: 'te-IN' },
    { pattern: /[\u0C80-\u0CFF]/, language: 'kn-IN' },
    { pattern: /[\u0D00-\u0D7F]/, language: 'ml-IN' },
    { pattern: /[\u0980-\u09FF]/, language: 'bn-IN' },
    { pattern: /[\u0A80-\u0AFF]/, language: 'gu-IN' },
    { pattern: /[\u0A00-\u0A7F]/, language: 'pa-IN' },
    { pattern: /[\u0600-\u06FF]/, language: 'ur-IN' },
    { pattern: /[\u4E00-\u9FFF]/, language: 'zh-CN' },
    { pattern: /[\u3040-\u30FF]/, language: 'ja-JP' },
    { pattern: /[\uAC00-\uD7AF]/, language: 'ko-KR' }
  ];

  return scriptChecks.find((check) => check.pattern.test(value))?.language || 'en-IN';
};

const GuideAvatar = ({ compact = false, mode = 'idle' }) => {
  const sizeClass = compact ? 'h-10 w-10' : 'h-14 w-14';
  const isListening = mode === 'listening';
  const isSpeaking = mode === 'speaking';

  return (
    <div
      className={`${sizeClass} relative shrink-0`}
      aria-hidden="true"
      style={{ animation: 'cf-guide-bob 2.8s ease-in-out infinite' }}
    >
      {isListening && (
        <span
          className="absolute -inset-1 rounded-full border border-emerald-300/60"
          style={{ animation: 'cf-guide-listen 1.25s ease-in-out infinite' }}
        />
      )}
      <span
        className={`absolute inset-0 rounded-full blur-md ${isListening ? 'bg-emerald-300/35' : isSpeaking ? 'bg-purple-300/35' : 'bg-blue-400/30'}`}
        style={{ animation: 'cf-guide-glow 2.4s ease-in-out infinite' }}
      />
      <div className="absolute inset-0 rounded-full border border-white/15 bg-gradient-to-b from-slate-800 to-slate-950 shadow-xl shadow-blue-950/30" />
      <div className="absolute left-1/2 top-[17%] h-[43%] w-[46%] -translate-x-1/2 rounded-full bg-[#f2c7a5] shadow-inner shadow-white/15">
        <div className="absolute left-0 top-[-6%] h-[35%] w-full rounded-t-full bg-slate-900" />
        <span
          className="absolute left-[28%] top-[45%] h-[8%] w-[10%] rounded-full bg-slate-950"
          style={{ animation: 'cf-guide-blink 4.6s ease-in-out infinite' }}
        />
        <span
          className="absolute right-[28%] top-[45%] h-[8%] w-[10%] rounded-full bg-slate-950"
          style={{ animation: 'cf-guide-blink 4.6s ease-in-out infinite' }}
        />
        <span
          className="absolute left-1/2 top-[66%] h-[5%] w-[24%] -translate-x-1/2 rounded-full bg-rose-500/80"
          style={isSpeaking ? { animation: 'cf-guide-talk 0.32s ease-in-out infinite' } : undefined}
        />
      </div>
      <div className="absolute bottom-[15%] left-1/2 h-[28%] w-[58%] -translate-x-1/2 rounded-t-full bg-gradient-to-r from-blue-500 to-purple-500" />
      <div
        className="absolute right-[4%] top-[36%] h-[26%] w-[14%] origin-bottom rounded-full bg-[#f2c7a5]"
        style={{ animation: 'cf-guide-wave 1.7s ease-in-out infinite' }}
      />
      <span className="absolute bottom-[17%] right-[18%] h-2 w-2 rounded-full bg-emerald-300 shadow-lg shadow-emerald-400/50" />
    </div>
  );
};

const routeGuides = [
  {
    match: (pathname) => pathname.startsWith('/client-flow'),
    label: 'Workflow Guide',
    starter: 'Good, you are in the Client Flow area. Start with one real lead or client. I can guide the next move: find, qualify, propose, deliver, invoice, or follow up for payment.',
    questions: [
      'What should I do next?',
      'Make my 7-day plan',
      'What is my bottleneck?',
      'Explain this workflow',
      'Help me get my first client',
      'How do I collect payment?'
    ]
  },
  {
    match: (pathname) => pathname.startsWith('/payment'),
    label: 'Plan Guide',
    starter: `You are checking plans. Honest rule: use free for simple invoices, use Pro only if you need client workflow, follow-ups, proposals, and payment tracking.`,
    questions: [
      'Should I upgrade to Pro?',
      'What does Pro unlock?',
      'Can I start free?',
      'How does payment tracking work?',
      'How can this save time?',
      'What if I need support?'
    ]
  },
  {
    match: (pathname) => pathname.startsWith('/create-invoice'),
    label: 'Invoice Guide',
    starter: 'You are creating an invoice. Do not overthink it: add client, service, amount, due date, and payment details. I can help you fill it cleanly.',
    questions: [
      'What should I put on an invoice?',
      'Help me price this work',
      'What due date should I use?',
      'How do payment links work?',
      'Write a payment message',
      'Explain GST fields'
    ]
  },
  {
    match: (pathname) => pathname === '/' || pathname.startsWith('/freelancers') || pathname.startsWith('/developers') || pathname.startsWith('/designers') || pathname.startsWith('/agencies') || pathname.startsWith('/consultants'),
    label: 'Product Guide',
    starter: `Welcome. Think of ${PRODUCT_NAME} as a coach for freelance work: get a lead, send a proposal, invoice, and follow up. Ask me what you want to finish first.`,
    questions: defaultQuickQuestions
  }
];

const getRouteGuide = (pathname) =>
  routeGuides.find((guide) => guide.match(pathname)) || {
    label: 'Friendly AI Guide',
    starter: `Hi, I am your ${PRODUCT_NAME} coach. Tell me what you are trying to do, and I will give you the next clear step.`,
    questions: defaultQuickQuestions
  };

const createAssistantMessage = (content) => ({
  role: 'assistant',
  content
});

export default function SupportChatWidget() {
  const { pathname } = useLocation();
  const routeGuide = getRouteGuide(pathname);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([createAssistantMessage(routeGuide.starter)]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [languageMode, setLanguageMode] = useState('auto');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoicePaused, setIsVoicePaused] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const lastSpokenMessageRef = useRef('');

  const hiddenOnCurrentRoute = hiddenRoutePrefixes.some((prefix) => pathname.startsWith(prefix));
  const selectedLanguage = getLanguageMode(languageMode);
  const avatarMode = isListening ? 'listening' : isSpeaking ? 'speaking' : 'idle';
  const voiceHasActiveSpeech = isSpeaking || isVoicePaused;

  const getSpeechLangForText = (text) => {
    if (selectedLanguage.voiceLang === 'auto') {
      return detectSpeechLanguage(text);
    }

    return selectedLanguage.voiceLang;
  };

  const pickVoice = (language) => {
    if (!isSpeechSynthesisSupported()) return null;

    const voices = window.speechSynthesis.getVoices();
    const languagePrefix = String(language || 'en-IN').split('-')[0];

    return (
      voices.find((voice) => voice.lang === language) ||
      voices.find((voice) => voice.lang?.toLowerCase().startsWith(`${languagePrefix}-`)) ||
      null
    );
  };

  const speakAssistant = (text) => {
    const cleanText = String(text || '').trim();
    if (!cleanText || !isSpeechSynthesisSupported()) return;

    window.speechSynthesis.cancel();
    setIsVoicePaused(false);

    const speechLang = getSpeechLangForText(cleanText);
    const utterance = new window.SpeechSynthesisUtterance(cleanText);
    const voice = pickVoice(speechLang);

    utterance.lang = speechLang;
    utterance.rate = 0.96;
    utterance.pitch = 1.08;
    utterance.volume = 1;
    if (voice) utterance.voice = voice;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsVoicePaused(false);
      setVoiceStatus('Speaking...');
    };
    utterance.onpause = () => {
      setIsSpeaking(false);
      setIsVoicePaused(true);
      setVoiceStatus('Voice paused');
    };
    utterance.onresume = () => {
      setIsSpeaking(true);
      setIsVoicePaused(false);
      setVoiceStatus('Speaking...');
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsVoicePaused(false);
      setVoiceStatus('');
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsVoicePaused(false);
      setVoiceStatus('');
    };

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    setMessages((current) => {
      if (current.length > 1) return current;
      return [createAssistantMessage(routeGuide.starter)];
    });
  }, [routeGuide.starter]);

  useEffect(() => {
    const openAssistant = (event) => {
      const question = String(event.detail?.question || '').trim();
      setIsOpen(true);

      if (question) {
        window.setTimeout(() => askAssistant(question), 0);
      }
    };

    window.addEventListener('clientflow:open-assistant', openAssistant);
    return () => window.removeEventListener('clientflow:open-assistant', openAssistant);
  }, [loading, messages, pathname]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isOpen]);

  useEffect(() => {
    if (!isSpeechSynthesisSupported()) return undefined;

    const warmVoices = () => {
      window.speechSynthesis.getVoices();
    };

    warmVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', warmVoices);

    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', warmVoices);
    };
  }, []);

  useEffect(() => {
    if (!voiceEnabled || !isOpen || loading) return;

    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || latestMessage.role !== 'assistant' || messages.length <= 1) return;

    const messageKey = `${messages.length}:${latestMessage.content}`;
    if (lastSpokenMessageRef.current === messageKey) return;

    lastSpokenMessageRef.current = messageKey;
    speakAssistant(latestMessage.content);
  }, [messages, voiceEnabled, isOpen, loading, languageMode]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort?.();
      if (isSpeechSynthesisSupported()) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stopVoice = () => {
    if (!isSpeechSynthesisSupported()) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsVoicePaused(false);
    setVoiceStatus('');
  };

  const pauseOrResumeVoice = () => {
    if (!isSpeechSynthesisSupported()) return;

    if (isVoicePaused || window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsSpeaking(true);
      setIsVoicePaused(false);
      setVoiceStatus('Speaking...');
      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setIsSpeaking(false);
      setIsVoicePaused(true);
      setVoiceStatus('Voice paused');
    }
  };

  const handleLanguageChange = (mode) => {
    stopVoice();
    setLanguageMode(mode);
    setVoiceStatus('');
  };

  const handleEditMessage = (messageIndex) => {
    const message = messages[messageIndex];
    if (!message || message.role !== 'user' || loading) return;

    stopVoice();
    setInput(message.content);
    setMessages((current) => current.slice(0, messageIndex));
    setError('');
    setVoiceStatus('Editing message. Update it and send again.');
  };

  const askAssistant = async(question) => {
    const cleanQuestion = String(question || '').trim();
    if (!cleanQuestion || loading) return;

    const userMessage = { role: 'user', content: cleanQuestion };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/ai/support-chat', {
        page: pathname,
        languageMode,
        languageLabel: selectedLanguage.label,
        voiceMode: voiceEnabled ? 'voice' : 'text',
        messages: nextMessages
          .filter((message) => message.content)
          .slice(-8)
      });

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: res.data?.answer || fallbackAnswer
        }
      ]);
    } catch {
      setError('Assistant is slow right now. Showing a safe answer.');
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: fallbackAnswer
        }
      ]);
    } finally {
      setLoading(false);
      if (!voiceEnabled) {
        setVoiceStatus('');
      }
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    askAssistant(input);
  };

  const startVoiceInput = () => {
    const SpeechRecognition = getSpeechRecognition();

    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser. You can still type in Tamil, English, Tanglish, or any language.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop?.();
      return;
    }

    if (isSpeechSynthesisSupported()) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsVoicePaused(false);
    }

    let heardTranscript = '';
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = selectedLanguage.id === 'auto'
      ? window.navigator?.language || selectedLanguage.speechLang
      : selectedLanguage.speechLang;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceStatus('Listening...');
      setError('');
    };

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index]?.[0]?.transcript || '';
        if (event.results[index].isFinal) {
          finalText += `${transcript} `;
        } else {
          interimText += transcript;
        }
      }

      heardTranscript = cleanTranscript(finalText || interimText || heardTranscript);
      if (heardTranscript) {
        setInput(heardTranscript);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setVoiceStatus('');
      setError('I could not hear clearly. Please try again or type your question.');
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;

      const question = cleanTranscript(heardTranscript);
      if (question) {
        setVoiceStatus('Thinking...');
        askAssistant(question);
      } else {
        setVoiceStatus('');
      }
    };

    recognition.start();
  };

  const toggleVoiceReply = () => {
    if (!isSpeechSynthesisSupported()) {
      setError('Voice reply is not supported in this browser. Text chat still works.');
      return;
    }

    if (voiceEnabled) {
      stopVoice();
      setVoiceEnabled(false);
      return;
    }

    setVoiceEnabled(true);
    const latestAssistantMessage = [...messages].reverse().find((message) => message.role === 'assistant');
    if (latestAssistantMessage) {
      window.setTimeout(() => speakAssistant(latestAssistantMessage.content), 0);
    }
  };

  if (hiddenOnCurrentRoute) return null;

  return (
    <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-4 z-40 print:hidden sm:left-5">
      <style>{assistantStyles}</style>
      {isOpen && (
        <section
          className="mb-4 flex h-[min(720px,calc(100vh-6rem))] w-[calc(100vw-2rem)] max-w-[430px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 text-white shadow-2xl shadow-black/35 backdrop-blur-xl"
          aria-label={`${PRODUCT_NAME} coach`}
        >
          <div className="shrink-0 flex items-start justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-blue-600/25 to-purple-600/20 p-4">
            <div className="flex min-w-0 gap-3">
              <GuideAvatar mode={avatarMode} />
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-200">{routeGuide.label}</p>
                <h2 className="mt-1 text-base font-black">{PRODUCT_NAME} Coach</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">Speak or type in any language. Choose a speech language when using the mic.</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor="coach-language-mode">Coach language</label>
                  <select
                    id="coach-language-mode"
                    value={languageMode}
                    onChange={(event) => handleLanguageChange(event.target.value)}
                    className="h-8 rounded-lg border border-white/10 bg-slate-900 px-2 text-[11px] font-bold text-slate-100 outline-none transition focus:border-blue-300/50 focus:ring-2 focus:ring-blue-400/30"
                  >
                    {languageModes.map((mode) => (
                      <option key={mode.id} value={mode.id}>{mode.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={startVoiceInput}
                    disabled={loading}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2 text-[11px] font-black transition focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50 ${
                      isListening
                        ? 'border-emerald-300/60 bg-emerald-400/15 text-emerald-100'
                        : 'border-white/10 bg-white/5 text-slate-100 hover:border-blue-300/40 hover:bg-blue-500/10'
                    }`}
                    aria-label={isListening ? 'Stop listening' : 'Start voice question'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" />
                      <path d="M5 11a1 1 0 1 1 2 0 5 5 0 0 0 10 0 1 1 0 1 1 2 0 7.002 7.002 0 0 1-6 6.93V20h3a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h3v-2.07A7.002 7.002 0 0 1 5 11Z" />
                    </svg>
                    <span>{isListening ? 'Listening' : 'Speak'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={toggleVoiceReply}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2 text-[11px] font-black transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                      voiceEnabled
                        ? 'border-purple-300/50 bg-purple-400/15 text-purple-100'
                        : 'border-white/10 bg-white/5 text-slate-100 hover:border-blue-300/40 hover:bg-blue-500/10'
                    }`}
                    aria-pressed={voiceEnabled}
                    aria-label={voiceEnabled ? 'Turn voice reply off' : 'Turn voice reply on'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M13.5 4.06a1 1 0 0 1 1.5.86v14.16a1 1 0 0 1-1.5.86L8.7 17H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3.7l4.8-2.94Z" />
                      <path d="M17.1 8.64a1 1 0 0 1 1.4.2 5.34 5.34 0 0 1 0 6.32 1 1 0 1 1-1.6-1.2 3.34 3.34 0 0 0 0-3.92 1 1 0 0 1 .2-1.4Z" />
                      <path d="M19.55 5.94a1 1 0 0 1 1.41.09 9.2 9.2 0 0 1 0 11.94 1 1 0 1 1-1.5-1.32 7.2 7.2 0 0 0 0-9.3 1 1 0 0 1 .09-1.41Z" />
                    </svg>
                    <span>{voiceEnabled ? 'Voice on' : 'Voice off'}</span>
                  </button>
                  {voiceHasActiveSpeech && (
                    <>
                      <button
                        type="button"
                        onClick={pauseOrResumeVoice}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 text-[11px] font-black text-slate-100 transition hover:border-blue-300/40 hover:bg-blue-500/10 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        aria-label={isVoicePaused ? 'Resume voice reply' : 'Pause voice reply'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          {isVoicePaused ? (
                            <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l10.5-6.86a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14Z" />
                          ) : (
                            <path d="M7 5a2 2 0 0 1 2 2v10a2 2 0 1 1-4 0V7a2 2 0 0 1 2-2Zm10 0a2 2 0 0 1 2 2v10a2 2 0 1 1-4 0V7a2 2 0 0 1 2-2Z" />
                          )}
                        </svg>
                        <span>{isVoicePaused ? 'Resume' : 'Pause'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopVoice}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 text-[11px] font-black text-slate-100 transition hover:border-rose-300/40 hover:bg-rose-500/10 focus:outline-none focus:ring-2 focus:ring-rose-300"
                        aria-label="Stop voice reply"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
                        </svg>
                        <span>Stop</span>
                      </button>
                    </>
                  )}
                </div>
                {voiceStatus && (
                  <p className="mt-2 text-[11px] font-bold text-blue-100">{voiceStatus}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="Close AI assistant"
            >
              <span aria-hidden="true">x</span>
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 pr-3">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex max-w-[92%] flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <p
                    className={`whitespace-pre-line break-words rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      message.role === 'user'
                        ? 'rounded-br-md bg-blue-500 text-white'
                        : 'rounded-bl-md border border-white/10 bg-white/[0.07] text-slate-100'
                    }`}
                  >
                    {message.content}
                  </p>
                  {message.role === 'user' && (
                    <button
                      type="button"
                      onClick={() => handleEditMessage(index)}
                      disabled={loading}
                      className="mt-1 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-blue-100/80 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Edit message"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.07] px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-blue-300"></span>
                    <span className="h-2 w-2 animate-pulse rounded-full bg-purple-300 [animation-delay:120ms]"></span>
                    <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300 [animation-delay:240ms]"></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="shrink-0 border-t border-white/10 p-3">
            {messages.length <= 1 && (
              <div className="mb-3 grid max-h-28 grid-cols-2 gap-2 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => askAssistant(`I am on ${pathname}. Explain this page and tell me the next 3 steps.`)}
                  className="rounded-xl border border-blue-300/20 bg-blue-500/10 px-3 py-2 text-left text-[11px] font-bold text-blue-100 transition hover:-translate-y-0.5 hover:border-blue-300/40 hover:bg-blue-500/15 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  Guide this page
                </button>
                {routeGuide.questions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => askAssistant(question)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-[11px] font-bold text-slate-200 transition hover:-translate-y-0.5 hover:border-blue-300/40 hover:bg-blue-500/10 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <p className="mb-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <label className="sr-only" htmlFor="support-chat-question">Ask a question</label>
              <textarea
                id="support-chat-question"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSubmit(event);
                  }
                }}
                rows={1}
                maxLength={500}
                placeholder="Ask in any language..."
                className="max-h-28 min-h-[44px] flex-1 resize-none overflow-y-auto rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-300/50 focus:ring-2 focus:ring-blue-400/30"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-950/30 transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                aria-label="Send question"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
                </svg>
              </button>
            </form>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="group flex items-center gap-3 rounded-full border border-white/10 bg-slate-950 px-3 py-2.5 text-sm font-black text-white shadow-xl shadow-black/25 transition hover:-translate-y-1 hover:border-blue-300/40 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 sm:px-4"
        aria-expanded={isOpen}
        aria-label={`${isOpen ? 'Close' : 'Open'} ${PRODUCT_NAME} coach`}
      >
        <GuideAvatar compact mode={avatarMode} />
        <span className="leading-tight">
          <span className="block text-left">AI Coach</span>
          <span className="hidden text-left text-[10px] font-bold text-slate-400 sm:block">Talk to me</span>
        </span>
      </button>
    </div>
  );
}
