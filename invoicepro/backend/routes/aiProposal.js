/**
 * Feature 2: AI Proposal Generator
 * Mount at: /api/ai/proposal
 * File: invoicepro/backend/routes/aiProposal.js
 */

const express = require('express');
const router = express.Router();
const https = require('https');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const Invoice = require('../models/Invoice');
const Lead = require('../models/Lead');
const User = require('../models/User');

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Call OpenAI chat completions. Returns the assistant message string.
 * Falls back gracefully if the API key is missing or the call fails.
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
      temperature: 0.7,
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
 * Build a deterministic fallback proposal when AI is unavailable.
 */
function buildFallbackProposal(input) {
  const {
    clientName = 'Client',
    projectScope = 'Project',
    budget = 0,
    timeline = '4 weeks',
    freelancerName = 'Freelancer',
    freelancerSpecialty = 'development',
    niche = 'business',
    painPoints = '',
  } = input;

  const halfBudget = Math.round(budget / 2);
  const otherHalf = budget - halfBudget;

  return {
    executiveSummary: `This proposal outlines a tailored ${freelancerSpecialty} engagement for ${clientName} to address their ${niche} requirements. The scope covers ${projectScope}. Delivery is planned within ${timeline}.`,
    challengeSection: painPoints
      ? `You are currently facing: ${painPoints}. This engagement is designed to resolve these challenges efficiently.`
      : `Your business requires focused ${freelancerSpecialty} expertise to move forward. This proposal addresses that need directly.`,
    solutionPoints: [
      `Comprehensive ${freelancerSpecialty} solution tailored to ${niche}`,
      `Clear milestones and regular progress updates`,
      `Post-delivery support and documentation`,
      `Transparent communication throughout the project`,
    ],
    includedScope: [
      projectScope,
      'Up to 2 rounds of revisions',
      'Final handover with documentation',
    ],
    excludedScope: [
      'Third-party software licenses',
      'Content creation or copywriting (unless specified)',
      'Maintenance beyond the agreed period',
    ],
    items: [
      { name: 'Phase 1 – Discovery & Planning', price: halfBudget },
      { name: 'Phase 2 – Execution & Delivery', price: otherHalf },
    ],
    totalAmount: Number(budget),
    timelineWeeks: parseInt(timeline) || 4,
    paymentTerms: '50% upfront, 50% on delivery',
    validForDays: 14,
    notes: `This proposal is valid for 14 days from the date of issue. GST applicable as per prevailing rates. All payments in INR.`,
    serviceDescription: `${freelancerSpecialty} services for ${clientName}: ${projectScope}`,
  };
}

/**
 * Core proposal generation logic — shared between both endpoints.
 */
async function generateProposalData(input) {
  const {
    clientName,
    businessName,
    niche,
    painPoints,
    projectScope,
    budget,
    currency = 'INR',
    timeline,
    freelancerName,
    freelancerSpecialty,
  } = input;

  const systemPrompt = `You are an expert Indian freelancer who writes clear, professional proposals. 
You understand GST, Indian business culture, and how to set boundaries clearly.
Always respond with valid JSON only. No markdown, no explanation.`;

  const userPrompt = `Generate a complete, professional freelance proposal in JSON format.

Client Name: ${clientName}
Client Business: ${businessName || 'Not specified'}
Industry/Niche: ${niche || 'Not specified'}
Pain Points: ${painPoints || 'Not specified'}
Project Scope: ${projectScope}
Budget: ${currency} ${budget}
Timeline: ${timeline || 'To be discussed'}
Freelancer Name: ${freelancerName || 'The Freelancer'}
Freelancer Specialty: ${freelancerSpecialty || 'Freelance Services'}

Return ONLY this JSON structure, fully filled in (no markdown fences, no explanation):
{
  "executiveSummary": "2-3 sentence overview of the engagement",
  "challengeSection": "1-2 sentences referencing the client's specific pain points",
  "solutionPoints": ["bullet 1", "bullet 2", "bullet 3", "bullet 4"],
  "includedScope": ["item 1", "item 2", "item 3"],
  "excludedScope": ["exclusion 1", "exclusion 2", "exclusion 3"],
  "items": [
    { "name": "Phase or deliverable name", "price": 0 }
  ],
  "totalAmount": ${budget},
  "timelineWeeks": 4,
  "paymentTerms": "50% upfront, 50% on delivery",
  "validForDays": 14,
  "notes": "Additional terms, GST note, etc.",
  "serviceDescription": "One-line summary for invoice"
}

Rules:
- items[].price values must sum exactly to totalAmount (${budget})
- timelineWeeks should reflect the stated timeline
- excludedScope must include at least 3 items relevant to Indian freelancing context
- notes must mention GST applicability`;

  let rawAI = null;
  let proposal = null;

  try {
    rawAI = await callOpenAI(systemPrompt, userPrompt);

    // Strip markdown fences if the model included them despite instructions
    const cleaned = rawAI.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    proposal = JSON.parse(cleaned);

    // Sanity-check required fields
    if (!proposal.items || !Array.isArray(proposal.items)) {
      throw new Error('AI response missing items array');
    }
  } catch (aiErr) {
    // Graceful fallback — never crash
    console.error('[aiProposal] AI generation failed, using fallback:', aiErr.message);
    proposal = buildFallbackProposal(input);
  }

  return { proposal, rawAI };
}

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /api/ai/proposal/generate
 * Generate a complete proposal draft from minimal input (no save).
 */
router.post('/generate', protect, async (req, res) => {
  try {
    const { clientName, projectScope, budget } = req.body;

    // Validate required fields
    if (!clientName || !projectScope || budget === undefined || budget === null || budget === '') {
      return res.status(400).json({
        message: 'clientName, projectScope, and budget are required',
      });
    }

    const { proposal, rawAI } = await generateProposalData(req.body);

    return res.status(200).json({ proposal, rawAI });
  } catch (err) {
    console.error('[POST /api/ai/proposal/generate] Error:', err);
    return res.status(500).json({ message: 'Failed to generate proposal', error: err.message });
  }
});

/**
 * POST /api/ai/proposal/generate-to-invoice
 * Generate a proposal AND save it as a draft Invoice document.
 */
router.post('/generate-to-invoice', protect, async (req, res) => {
  try {
    const { clientName, projectScope, budget, sourceLeadId, currency = 'INR' } = req.body;

    // Validate required fields
    if (!clientName || !projectScope || budget === undefined || budget === null || budget === '') {
      return res.status(400).json({
        message: 'clientName, projectScope, and budget are required',
      });
    }

    // ── 1. Generate proposal ────────────────────────────────────────────────
    const { proposal, rawAI } = await generateProposalData(req.body);

    // ── 2. Resolve client email (from lead if provided) ─────────────────────
    let clientEmail = req.body.clientEmail || '';
    let resolvedLead = null;

    if (sourceLeadId && mongoose.Types.ObjectId.isValid(sourceLeadId)) {
      resolvedLead = await Lead.findOne({ _id: sourceLeadId, user: req.user._id });
      if (resolvedLead && resolvedLead.email) {
        clientEmail = clientEmail || resolvedLead.email;
      }
    }

    // ── 3. Fetch user's business snapshot ───────────────────────────────────
    const userDoc = await User.findById(req.user._id).lean();
    const businessSnapshot = userDoc?.businessProfile || userDoc?.businessSnapshot || undefined;

    // ── 4. Build validUntil date ────────────────────────────────────────────
    const validForDays = proposal.validForDays || 14;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validForDays);

    // ── 5. Auto-generate invoice number ─────────────────────────────────────
    const invoiceCount = await Invoice.countDocuments({ user: req.user._id });
    const invoiceNumber = `PROP-${Date.now()}-${invoiceCount + 1}`;

    // ── 6. Create Invoice document ──────────────────────────────────────────
    const newInvoice = new Invoice({
      user: req.user._id,
      invoiceNumber,
      documentType: 'proposal',
      proposalStatus: 'draft',
      clientName,
      clientEmail,
      serviceDescription: proposal.serviceDescription || `Proposal: ${projectScope}`,
      items: (proposal.items || []).map((item) => ({
        name: item.name || 'Service',
        price: Number(item.price) || 0,
      })),
      amount: Number(proposal.totalAmount) || Number(budget),
      currency,
      notes: proposal.notes || '',
      validUntil,
      date: new Date(),
      ...(businessSnapshot && { businessSnapshot }),
      ...(sourceLeadId && mongoose.Types.ObjectId.isValid(sourceLeadId) && { sourceLeadId }),
    });

    const savedInvoice = await newInvoice.save();

    // ── 7. Update lead status if sourceLeadId was provided ──────────────────
    if (resolvedLead) {
      await Lead.findByIdAndUpdate(resolvedLead._id, {
        status: 'proposal_sent',
        lastContactedAt: new Date(),
      });
    }

    return res.status(201).json({
      invoice: savedInvoice,
      proposal,
      rawAI,
    });
  } catch (err) {
    console.error('[POST /api/ai/proposal/generate-to-invoice] Error:', err);
    return res.status(500).json({
      message: 'Failed to generate proposal and save invoice',
      error: err.message,
    });
  }
});

module.exports = router;
