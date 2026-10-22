import React, { useState } from 'react';
import api from '../utils/api';

/**
 * LeadConversionBar
 * Inline action component for Leads table or cards.
 * Provides 1-click AI Lead Scoring & 1-click Convert Lead to Client.
 */
export default function LeadConversionBar({ lead, onUpdated }) {
  const [isScoring, setIsScoring] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [message, setMessage] = useState(null);

  const handleScoreLead = async () => {
    setIsScoring(true);
    setMessage(null);
    try {
      const res = await api.post('/leads/automation/score', { leadId: lead._id });
      setMessage({ type: 'success', text: `Score: ${res.data.fitScore}/100 (${res.data.fitLabel})` });
      if (onUpdated) onUpdated({ ...lead, fitScore: res.data.fitScore, fitLabel: res.data.fitLabel });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Scoring failed' });
    } finally {
      setIsScoring(false);
    }
  };

  const handleConvertToClient = async () => {
    setIsConverting(true);
    setMessage(null);
    try {
      const res = await api.post('/leads/automation/convert', { leadId: lead._id });
      setMessage({ type: 'success', text: 'Converted to Client!' });
      if (onUpdated) onUpdated(res.data.lead);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Conversion failed' });
    } finally {
      setIsConverting(false);
    }
  };

  const isWon = lead.status === 'won';

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {lead.fitScore ? (
        <span
          className={`px-2 py-0.5 rounded-full font-semibold border ${
            lead.fitScore >= 75
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : lead.fitScore >= 50
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
          }`}
          title={lead.fitLabel}
        >
          {lead.fitScore}/100 • {lead.fitLabel || 'Fit'}
        </span>
      ) : (
        <button
          onClick={handleScoreLead}
          disabled={isScoring}
          className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-indigo-300 font-medium transition border border-indigo-500/20 disabled:opacity-50"
        >
          {isScoring ? 'Scoring...' : '🎯 Score Fit'}
        </button>
      )}

      {!isWon && (
        <button
          onClick={handleConvertToClient}
          disabled={isConverting}
          className="px-2.5 py-1 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-medium transition border border-emerald-500/30 disabled:opacity-50"
        >
          {isConverting ? 'Converting...' : '✓ Convert to Client'}
        </button>
      )}

      {message && (
        <span
          className={`text-[11px] font-medium ${
            message.type === 'error' ? 'text-red-400' : 'text-emerald-400'
          }`}
        >
          {message.text}
        </span>
      )}
    </div>
  );
}
