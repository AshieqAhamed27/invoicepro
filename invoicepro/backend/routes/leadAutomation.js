/**
 * Feature 4: Lead-to-Client Automation
 * Mount at: /api/leads/automation
 * File: invoicepro/backend/routes/leadAutomation.js
 */

const express = require('express');
const router = express.Router();
const https = require('https');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const Lead = require('../models/Lead');
const Client = require('../models/Client');

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Call OpenAI chat completions. Returns the assistant message string.
 * Rejects if API key is missing or the call fails.
 */
function callOpenAI(systemPrompt, userPrompt) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return reject(new Error('OPENAI_API_KEY is not configured'));
    }

    const body = JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          const content = parsed.choices?.[0]?.message?.content || '';
          resolve(content);
        } catch (e) {
          reject(new Error('Failed to parse OpenAI response: ' + e.message));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Deterministic fallback score when AI is unavailable.
 * Scores based on urgency, budget, and current status.
 */
function buildFallbackScore(lead) {
  let score = 40; // base score

  // Urgency bonus
  const urgencyMap = { high: 25, medium: 10, low: 0 };
  score += urgencyMap[lead.urgency] || 0;

  // Budget bonus (proportional, capped at 20)
  if (lead.budget) {
    const budgetBonus = Math.min(Math.floor(lead.budget / 50000) * 5, 20);
    score += budgetBonus;
  }

  // Status bonus
  const statusMap = {
    new: 0,
    contacted: 5,
    interested: 15,
    proposal_sent: 20,
    won: 30,
    lost: -20,
  };
  score += statusMap[lead.status] || 0;

  score = Math.max(0, Math.min(100, score));

  let label = 'Cold Lead';
  if (score >= 75) label = 'Hot Lead';
  else if (score >= 50) label = 'Warm Lead';
  else if (score < 20) label = 'Not a Fit';

  return {
    score,
    label,
    reasoning: 'Score calculated from urgency, budget, and current pipeline stage.',
    nextAction:
      lead.urgency === 'high'
        ? 'Follow up within 24 hours'
        : 'Schedule a discovery call',
  };
}

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /api/leads/automation/convert
 * Convert a won/interested/proposal_sent lead into a Client document.
 */
router.post('/convert', protect, async (req, res) => {
  try {
    const { leadId, companyName, address, gst } = req.body;

    if (!leadId || !mongoose.Types.ObjectId.isValid(leadId)) {
      return res.status(400).json({ message: 'A valid leadId is required' });
    }

    // ── 1. Find lead owned by this user with an eligible status ─────────────
    const lead = await Lead.findOne({
      _id: leadId,
      user: req.user._id,
      status: { $in: ['won', 'interested', 'proposal_sent'] },
    });

    if (!lead) {
      return res.status(404).json({
        message:
          'Lead not found, or it is not in an eligible status (won / interested / proposal_sent)',
      });
    }

    // ── 2. Guard: no duplicate client with same email for this user ──────────
    if (lead.email) {
      const existingClient = await Client.findOne({
        user: req.user._id,
        email: lead.email,
      });

      if (existingClient) {
        return res.status(409).json({
          message: 'A client with this email already exists for your account',
          existingClientId: existingClient._id,
        });
      }
    }

    // ── 3. Create Client ─────────────────────────────────────────────────────
    const newClient = new Client({
      user: req.user._id,
      name: lead.contactName || lead.businessName,
      email: lead.email || '',
      companyName: companyName || lead.businessName || '',
      address: address || '',
      gst: gst || '',
    });

    const savedClient = await newClient.save();

    // ── 4. Update Lead ───────────────────────────────────────────────────────
    const updatedLead = await Lead.findByIdAndUpdate(
      lead._id,
      {
        status: 'won',
        convertedClientId: savedClient._id,
        lastContactedAt: new Date(),
      },
      { new: true }
    );

    return res.status(201).json({
      client: savedClient,
      lead: updatedLead,
      message: 'Lead successfully converted to client',
    });
  } catch (err) {
    console.error('[POST /api/leads/automation/convert] Error:', err);
    return res.status(500).json({ message: 'Failed to convert lead to client', error: err.message });
  }
});

/**
 * POST /api/leads/automation/score
 * Auto-score a lead's fit using AI (with deterministic fallback).
 */
router.post('/score', protect, async (req, res) => {
  try {
    const { leadId } = req.body;

    if (!leadId || !mongoose.Types.ObjectId.isValid(leadId)) {
      return res.status(400).json({ message: 'A valid leadId is required' });
    }

    // ── 1. Fetch lead ────────────────────────────────────────────────────────
    const lead = await Lead.findOne({ _id: leadId, user: req.user._id });

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // ── 2. Build AI prompt ───────────────────────────────────────────────────
    const systemPrompt =
      'You are an expert sales coach for Indian freelancers. Evaluate leads and return only valid JSON. No markdown. No explanation.';

    const userPrompt = `Score this lead from 0-100 for an Indian freelancer.

Lead Details:
- Business Name: ${lead.businessName || 'Not specified'}
- Contact Name: ${lead.contactName || 'Not specified'}
- Niche/Industry: ${lead.niche || 'Not specified'}
- Pain Points: ${lead.pain || 'Not specified'}
- Budget: INR ${lead.budget || 'Not specified'}
- Urgency: ${lead.urgency || 'Not specified'}
- Current Status: ${lead.status}
- Notes: ${lead.notes || 'None'}

Return ONLY this JSON (no markdown fences):
{
  "score": <number 0-100>,
  "label": "<one of: Hot Lead | Warm Lead | Cold Lead | Not a Fit>",
  "reasoning": "<max 30 words explaining the score>",
  "nextAction": "<max 20 words — concrete next step for the freelancer>"
}`;

    // ── 3. Call AI or fall back ──────────────────────────────────────────────
    let scoreData;

    try {
      const raw = await callOpenAI(systemPrompt, userPrompt);
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
      scoreData = JSON.parse(cleaned);

      // Validate shape
      if (
        typeof scoreData.score !== 'number' ||
        !scoreData.label ||
        !scoreData.reasoning ||
        !scoreData.nextAction
      ) {
        throw new Error('AI response missing required scoring fields');
      }
    } catch (aiErr) {
      console.error('[leadAutomation /score] AI scoring failed, using fallback:', aiErr.message);
      scoreData = buildFallbackScore(lead);
    }

    // ── 4. Persist score & append note ──────────────────────────────────────
    const dateStr = new Date().toISOString().split('T')[0];
    const aiNote = `[AI Score ${dateStr}]: ${scoreData.reasoning}`;
    const updatedNotes = lead.notes ? `${lead.notes}\n${aiNote}` : aiNote;

    const updatedLead = await Lead.findByIdAndUpdate(
      lead._id,
      {
        fitScore: scoreData.score,
        fitLabel: scoreData.label,
        notes: updatedNotes,
      },
      { new: true }
    );

    return res.status(200).json({
      fitScore: updatedLead.fitScore,
      fitLabel: updatedLead.fitLabel,
      reasoning: scoreData.reasoning,
      nextAction: scoreData.nextAction,
    });
  } catch (err) {
    console.error('[POST /api/leads/automation/score] Error:', err);
    return res.status(500).json({ message: 'Failed to score lead', error: err.message });
  }
});

/**
 * GET /api/leads/automation/pipeline
 * Return all leads grouped by status — kanban-style pipeline view.
 */
router.get('/pipeline', protect, async (req, res) => {
  try {
    const STATUSES = ['new', 'contacted', 'interested', 'proposal_sent', 'won', 'lost'];

    // Fetch only the fields needed for the pipeline cards
    const leads = await Lead.find({ user: req.user._id })
      .select(
        '_id businessName contactName email budget fitScore fitLabel urgency nextFollowUpAt updatedAt status'
      )
      .lean();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Build pipeline groups
    const pipeline = {};
    STATUSES.forEach((status) => {
      pipeline[status] = { count: 0, totalBudget: 0, leads: [] };
    });

    let totalLeads = 0;
    let totalPipelineValue = 0;
    let hotLeads = 0;
    let followUpDueToday = 0;

    leads.forEach((lead) => {
      const group = pipeline[lead.status];
      if (!group) return; // unknown status — skip

      group.count += 1;
      group.totalBudget += Number(lead.budget) || 0;
      group.leads.push(lead);

      totalLeads += 1;

      // Pipeline value excludes 'lost' leads
      if (lead.status !== 'lost') {
        totalPipelineValue += Number(lead.budget) || 0;
      }

      if (lead.fitLabel === 'Hot Lead') hotLeads += 1;

      if (lead.nextFollowUpAt) {
        const followUpDate = new Date(lead.nextFollowUpAt);
        followUpDate.setHours(0, 0, 0, 0);
        if (followUpDate >= today && followUpDate < tomorrow) {
          followUpDueToday += 1;
        }
      }
    });

    // Sort each group by fitScore descending
    STATUSES.forEach((status) => {
      pipeline[status].leads.sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0));
    });

    return res.status(200).json({
      pipeline,
      summary: {
        totalLeads,
        totalPipelineValue,
        hotLeads,
        followUpDueToday,
      },
    });
  } catch (err) {
    console.error('[GET /api/leads/automation/pipeline] Error:', err);
    return res.status(500).json({ message: 'Failed to fetch pipeline', error: err.message });
  }
});

module.exports = router;
