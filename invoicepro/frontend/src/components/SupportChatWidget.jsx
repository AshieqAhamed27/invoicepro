import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';
import {
  PRODUCT_NAME,
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY
} from '../utils/company';

const hiddenRoutePrefixes = ['/public/invoice', '/p/invoice'];

const fallbackAnswer = `I can help with ${PRODUCT_NAME}, freelancing, pricing, invoices, client workflow, payments, and getting started.

Ask your question in simple words and I will explain it step by step. For direct support, email ${SUPPORT_EMAIL} or call ${SUPPORT_PHONE_DISPLAY}.`;

const defaultQuickQuestions = [
  'Explain this product clearly',
  'How should I start?',
  'How do I get clients?',
  'How do I collect payment?',
  'What should I say to clients?',
  'Why should I pay for Pro?'
];

const routeGuides = [
  {
    match: (pathname) => pathname.startsWith('/client-flow'),
    label: 'Workflow Guide',
    starter: `You are on the Client Flow page. I can help you choose the next action: find a lead, qualify, write a proposal, organize delivery proof, create an invoice, or collect payment.`,
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
    starter: `You are viewing payment and plan options. I can explain what Pro unlocks and when it makes sense to pay for ${PRODUCT_NAME}.`,
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
    starter: 'You are creating an invoice. I can help with invoice fields, pricing, due dates, tax, payment links, and follow-up wording.',
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
    starter: `Welcome to ${PRODUCT_NAME}. I can explain the product, help you choose a first workflow, and show how client finding, proposals, invoices, and payments connect.`,
    questions: defaultQuickQuestions
  }
];

const getRouteGuide = (pathname) =>
  routeGuides.find((guide) => guide.match(pathname)) || {
    label: 'Friendly AI Guide',
    starter: `Hi, I am your ${PRODUCT_NAME} guide. Ask me anything about freelancing, getting clients, proposals, invoices, payments, pricing, or how to use this product. I will explain it clearly.`,
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
  const messagesEndRef = useRef(null);

  const hiddenOnCurrentRoute = hiddenRoutePrefixes.some((prefix) => pathname.startsWith(prefix));

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

  if (hiddenOnCurrentRoute) return null;

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
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    askAssistant(input);
  };

  return (
    <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-4 z-40 print:hidden sm:left-5">
      {isOpen && (
        <section
          className="mb-4 flex h-[min(720px,calc(100vh-6rem))] w-[calc(100vw-2rem)] max-w-[430px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 text-white shadow-2xl shadow-black/35 backdrop-blur-xl"
          aria-label={`${PRODUCT_NAME} AI assistant`}
        >
          <div className="shrink-0 flex items-start justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-blue-600/25 to-purple-600/20 p-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-200">{routeGuide.label}</p>
              <h2 className="mt-1 text-base font-black">{PRODUCT_NAME} Assistant</h2>
              <p className="mt-1 text-xs text-slate-300">Ask product, freelancing, client, invoice, and payment questions.</p>
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
                <p
                  className={`max-w-[92%] whitespace-pre-line break-words rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'rounded-br-md bg-blue-500 text-white'
                      : 'rounded-bl-md border border-white/10 bg-white/[0.07] text-slate-100'
                  }`}
                >
                  {message.content}
                </p>
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
                placeholder="Ask your doubt..."
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
        className="group flex items-center gap-2 rounded-full border border-white/10 bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-xl shadow-black/25 transition hover:-translate-y-1 hover:border-blue-300/40 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-expanded={isOpen}
        aria-label={`${isOpen ? 'Close' : 'Open'} ${PRODUCT_NAME} AI assistant`}
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition group-hover:scale-105">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 0 0-1.032-.211 50.89 50.89 0 0 0-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 0 0 2.433 3.982l-3.498 2.187a.75.75 0 0 1-1.135-.636v-4.28a49.54 49.54 0 0 1-.387-.052C2.99 15.846 1.75 14.162 1.75 12.328V6.374c0-1.834 1.24-3.518 3.163-3.716Z" />
            <path d="M15.75 7.5c1.376 0 2.739.057 4.086.17 1.67.138 2.914 1.54 2.914 3.207v3.346c0 1.668-1.244 3.07-2.914 3.209-.36.03-.72.057-1.083.08v3.838a.75.75 0 0 1-1.154.633l-5.002-3.201a45.697 45.697 0 0 1-1.922-.093c-1.67-.14-2.914-1.54-2.914-3.209v-3.346c0-1.668 1.244-3.07 2.914-3.207A49.138 49.138 0 0 1 15.75 7.5Z" />
          </svg>
        </span>
        <span>Ask AI</span>
      </button>
    </div>
  );
}
