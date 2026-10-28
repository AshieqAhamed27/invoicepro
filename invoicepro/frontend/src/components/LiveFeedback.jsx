import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { getUser, isLoggedIn } from '../utils/auth';
import { GOOGLE_REVIEW_URL, TRUSTPILOT_REVIEW_URL, SUPPORT_WHATSAPP_PHONE } from '../utils/company';

const RATING_LABELS = {
  1: '🙁 Not satisfied / Needs work',
  2: '😐 Could be better',
  3: '🙂 Good / Average',
  4: '👍 Very good experience',
  5: '🌟 Loved it! Highly recommend'
};

const LiveFeedback = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState('Review');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [postedToGoogle, setPostedToGoogle] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, loading, success, error

  useEffect(() => {
    const user = getUser();
    if (user) {
      if (user.name) setName(user.name);
      if (user.email) setEmail(user.email);
    }

    const handleOpenModal = () => setIsOpen(true);
    window.addEventListener('open-review-modal', handleOpenModal);
    return () => window.removeEventListener('open-review-modal', handleOpenModal);
  }, []);

  const handleOpenGoogle = () => {
    setPostedToGoogle(true);
    window.open(GOOGLE_REVIEW_URL, '_blank', 'noopener,noreferrer');
  };

  const handleWhatsAppHelp = () => {
    const text = encodeURIComponent(`Hi Ashieq, I am using ClientFlow AI and wanted to share feedback or get help: ${message.slice(0, 100)}`);
    window.open(`https://wa.me/${SUPPORT_WHATSAPP_PHONE}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus('loading');
    try {
      await api.post('/feedback', {
        rating,
        category,
        message,
        name,
        email,
        postedToGoogle
      });
      setStatus('success');
    } catch (error) {
      console.error('Feedback submission failed:', error);
      setStatus('error');
    }
  };

  const activeRating = hoverRating || rating;

  return (
    <div className="fixed top-1/2 right-0 z-50 -translate-y-1/2 flex items-center">
      {/* Side Tab Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex flex-col items-center gap-2 bg-[#0d091b]/95 backdrop-blur-md border border-r-0 border-yellow-500/30 hover:border-yellow-400 hover:bg-yellow-500/10 text-yellow-400 hover:text-yellow-300 py-4 px-2.5 rounded-l-2xl shadow-2xl shadow-black/80 transition-all duration-300"
          title="Rate ClientFlow AI & Share Feedback"
        >
          <span className="text-base transition-transform group-hover:scale-125">⭐</span>
          <span 
            className="text-[11px] font-black tracking-widest uppercase transition-transform group-hover:-translate-x-0.5" 
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Reviews & Feedback
          </span>
        </button>
      )}

      {/* Feedback Modal / Popover */}
      {isOpen && (
        <div className="bg-[#0b0816]/98 backdrop-blur-xl border border-r-0 border-white/15 rounded-l-3xl shadow-2xl shadow-black/90 w-[350px] sm:w-[380px] max-h-[92vh] overflow-y-auto flex flex-col animate-in slide-in-from-right-8 fade-in duration-300">
          <div className="bg-white/[0.04] px-5 py-4 flex justify-between items-center border-b border-white/10">
            <div>
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <span className="text-yellow-400">⭐</span> Rate & Review ClientFlow
              </h3>
              <p className="text-[11px] font-medium text-zinc-400 mt-0.5">Help fellow Indian freelancers discover us</p>
            </div>
            <button 
              onClick={() => {
                setIsOpen(false);
                setStatus('idle');
              }}
              className="text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-1.5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
            {status === 'success' ? (
              <div className="py-6 flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl">
                  ✓
                </div>
                <div>
                  <div className="flex justify-center text-yellow-400 text-lg mb-1">
                    {'★'.repeat(rating)}
                  </div>
                  <p className="text-white font-black text-lg">Thank You for Your Review!</p>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Your feedback was delivered directly to the builder. It helps us build a better product for Indian freelancers.
                  </p>
                </div>

                {rating >= 4 && (
                  <div className="mt-2 w-full rounded-2xl border border-yellow-400/30 bg-yellow-400/[0.08] p-4 text-left">
                    <p className="text-xs font-bold text-yellow-200">
                      🌟 Take 10 seconds to post on Google:
                    </p>
                    <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
                      Google reviews help other freelancers discover ClientFlow AI instead of getting stuck with clunky software.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenGoogle}
                      className="mt-3 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-yellow-500/20"
                    >
                      <span>⭐</span> Post on Google
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setStatus('idle');
                    setMessage('');
                  }}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 text-xs font-bold text-zinc-400 hover:text-white transition"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                {/* 5-Star Rating Selector */}
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-center">
                  <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">
                    How is your experience with ClientFlow?
                  </p>
                  <div className="flex items-center gap-2 my-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="text-2xl transition-transform hover:scale-125 focus:outline-none"
                      >
                        {star <= activeRating ? '★' : '☆'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs font-bold text-yellow-300 transition-all">
                    {RATING_LABELS[activeRating] || RATING_LABELS[5]}
                  </p>
                </div>

                {/* Happy User: Verified Trustpilot & Google Review prompt */}
                {rating >= 4 && (
                  <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] p-3.5">
                    <div className="flex items-start gap-2.5">
                      <span className="text-lg">⭐</span>
                      <div>
                        <p className="text-xs font-bold text-emerald-300">
                          Loving it? Leave a verified review!
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                          Your honest review on Trustpilot helps other freelancers discover a genuine client-to-cash workflow.
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          <a
                            href={TRUSTPILOT_REVIEW_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#00b67a] hover:bg-[#00a36d] px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-white transition shadow-sm"
                          >
                            ⭐ Review on Trustpilot →
                          </a>
                          <button
                            type="button"
                            onClick={handleOpenGoogle}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-white transition"
                          >
                            Google Review
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Unhappy User: Direct Help via WhatsApp */}
                {rating < 4 && (
                  <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-3.5">
                    <p className="text-xs font-bold text-amber-200">
                      We want to make this right for you.
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                      Chat directly with Ashieq (Builder) to resolve any issue with your invoices or proposals:
                    </p>
                    <button
                      type="button"
                      onClick={handleWhatsAppHelp}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/30 transition"
                    >
                      💬 Chat on WhatsApp
                    </button>
                  </div>
                )}

                {/* Category Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">Topic</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#130f24] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400/50 transition-colors"
                  >
                    <option value="Review">⭐ Public Review & Star Rating</option>
                    <option value="Feature Request">💡 Feature Request</option>
                    <option value="Bug Report">🐞 Bug or Issue</option>
                    <option value="General">❓ General Feedback</option>
                  </select>
                </div>

                {/* Message */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">Your Review / Feedback</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="What do you love most, or what can we improve for your freelance workflow?"
                    className="w-full bg-[#130f24] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400/50 transition-colors resize-none h-24 placeholder-zinc-600 hover:border-white/20"
                    required
                  />
                </div>

                {/* Guest info if not logged in */}
                {!isLoggedIn() && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">Your Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Rahul"
                        className="mt-1 w-full bg-[#130f24] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@email.com"
                        className="mt-1 w-full bg-[#130f24] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400/50"
                      />
                    </div>
                  </div>
                )}

                {status === 'error' && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <p className="text-red-400 text-xs text-center font-semibold">
                      Failed to submit. Please try again or message on WhatsApp.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading' || !message.trim()}
                  className="w-full bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 disabled:opacity-50 text-slate-950 font-black py-3 rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-yellow-500/20 mt-1 active:scale-[0.98]"
                >
                  {status === 'loading' ? 'Submitting...' : 'Submit Review & Rating'}
                </button>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  );
};

export default LiveFeedback;
