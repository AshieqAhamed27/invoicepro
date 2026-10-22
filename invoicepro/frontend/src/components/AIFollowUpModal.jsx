import React, { useState } from 'react';
import api from '../utils/api';

/**
 * AIFollowUpModal
 * Generates an AI-crafted follow-up message for any Lead or Invoice.
 * Supports Email and WhatsApp channels with customizable tones.
 */
export default function AIFollowUpModal({ isOpen, onClose, resourceType = 'lead', resource, onSuccess }) {
  const [tone, setTone] = useState('professional');
  const [channel, setChannel] = useState('email');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [preview, setPreview] = useState('');
  const [subject, setSubject] = useState('');
  const [followUpId, setFollowUpId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  if (!isOpen || !resource) return null;

  const recipientName = resource.contactName || resource.businessName || resource.clientName || 'Client';

  const handleGenerate = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const payload = {
        resourceType,
        resourceId: resource._id,
        tone,
        channel
      };

      const res = await api.post('/followup/generate', payload);
      if (res.data?.followUp) {
        setPreview(res.data.followUp.message || res.data.preview || '');
        setSubject(res.data.followUp.subject || '');
        setFollowUpId(res.data.followUp._id);
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to generate message with AI.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!followUpId) return;
    setIsSending(true);
    setStatusMessage(null);
    try {
      await api.patch(`/followup/${followUpId}`, { message: preview, subject });
      const res = await api.post(`/followup/${followUpId}/send`);
      setStatusMessage({ type: 'success', text: 'Follow-up sent successfully!' });
      if (onSuccess) onSuccess(res.data);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to send email. Check your email settings.' });
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(preview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openWhatsAppDirect = () => {
    const phone = resource.phone ? resource.phone.replace(/[^0-9]/g, '') : '';
    const encoded = encodeURIComponent(preview);
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              AI Assistant
            </span>
            <h3 className="text-lg font-bold mt-1 text-white">Follow-up for {recipientName}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {statusMessage && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm ${
              statusMessage.type === 'error'
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="friendly">Friendly & Warm</option>
              <option value="professional">Professional & Direct</option>
              <option value="firm">Firm & Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Channel</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium text-sm transition shadow-lg shadow-indigo-500/20 disabled:opacity-50"
          >
            {isLoading ? 'Crafting message with AI...' : '✨ Generate AI Message'}
          </button>
        </div>

        {preview && (
          <div className="mt-5 space-y-3">
            {channel === 'email' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Message Preview</label>
              <textarea
                rows={5}
                value={preview}
                onChange={(e) => setPreview(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              {channel === 'whatsapp' ? (
                <>
                  <button
                    onClick={handleCopyWhatsApp}
                    className="py-2 px-3.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center gap-1.5"
                  >
                    {copied ? '✓ Copied' : '📋 Copy Text'}
                  </button>
                  <button
                    onClick={openWhatsAppDirect}
                    className="py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                  >
                    💬 Open in WhatsApp
                  </button>
                </>
              ) : (
                <button
                  onClick={handleSendEmail}
                  disabled={isSending}
                  className="py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isSending ? 'Sending...' : '✉️ Send Email'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
