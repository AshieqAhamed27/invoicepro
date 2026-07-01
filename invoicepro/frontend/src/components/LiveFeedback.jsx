import React, { useState } from 'react';
import api from '../utils/api';

const LiveFeedback = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState('Feedback');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus('loading');
    try {
      await api.post('/api/feedback', { category, message });
      setStatus('success');
      setTimeout(() => {
        setIsOpen(false);
        setStatus('idle');
        setMessage('');
        setCategory('Feedback');
      }, 2000);
    } catch (error) {
      console.error('Feedback submission failed:', error);
      setStatus('error');
    }
  };

  return (
    <div className="fixed top-1/2 right-0 z-50 -translate-y-1/2 flex items-center">
      {/* Side Tab Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex flex-col items-center gap-3 bg-gray-950/90 backdrop-blur-sm border border-r-0 border-gray-800 hover:border-yellow-500/50 hover:bg-gray-900 text-gray-400 hover:text-yellow-500 py-5 px-2 rounded-l-xl shadow-2xl shadow-black/50 transition-all duration-300"
        >
          <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span 
            className="text-xs font-bold tracking-widest uppercase transition-transform group-hover:-translate-x-0.5" 
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Feedback
          </span>
        </button>
      )}

      {/* Feedback Modal / Popover */}
      {isOpen && (
        <div className="bg-gray-950/95 backdrop-blur-md border border-r-0 border-gray-800 rounded-l-2xl shadow-2xl shadow-black/80 w-[320px] overflow-hidden flex flex-col animate-in slide-in-from-right-8 fade-in duration-300">
          <div className="bg-gray-900/50 px-5 py-4 flex justify-between items-center border-b border-gray-800">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              Send Feedback
            </h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full p-1.5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-5">
            {status === 'success' ? (
              <div className="py-10 flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-300">
                <div className="w-14 h-14 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium text-lg">Feedback Sent!</p>
                  <p className="text-sm text-gray-400 mt-1">Thank you for helping us improve.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Category</label>
                  <div className="relative">
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-colors appearance-none cursor-pointer hover:bg-gray-800/80"
                    >
                      <option value="Feedback">General Feedback</option>
                      <option value="Feature Request">Feature Request</option>
                      <option value="Bug Report">Bug Report</option>
                      <option value="Need Help">I Need Help</option>
                    </select>
                    <svg className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what's on your mind..."
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-colors resize-none h-32 placeholder-gray-600 hover:bg-gray-800/80"
                    required
                  />
                </div>

                {status === 'error' && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-red-400 text-xs text-center font-medium">Something went wrong. Please try again.</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading' || !message.trim()}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:hover:bg-yellow-500 text-black font-semibold py-3 rounded-xl text-sm transition-all mt-2 active:scale-[0.98]"
                >
                  {status === 'loading' ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      Sending...
                    </span>
                  ) : (
                    'Send Feedback'
                  )}
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
