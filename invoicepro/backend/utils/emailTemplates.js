const DAY_MS = 24 * 60 * 60 * 1000;

const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => {
    switch (char) {
        case '&':
            return '&amp;';
        case '<':
            return '&lt;';
        case '>':
            return '&gt;';
        case '"':
            return '&quot;';
        case "'":
            return '&#39;';
        default:
            return char;
    }
});

const formatCurrency = (amount, currency) => {
    const value = Number(amount || 0);
    const fixed = value.toLocaleString(currency === 'USD' ? 'en-US' : 'en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    return currency === 'USD' ? `USD ${fixed}` : `Rs ${fixed}`;
};

const formatDate = (date) => {
    if (!date) return 'Not specified';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return 'Not specified';
    return parsed.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
};

const getDocumentLabels = (invoice) => {
    const isProposal = invoice?.documentType === 'proposal';

    return {
        isProposal,
        noun: isProposal ? 'proposal' : 'invoice',
        title: isProposal ? 'New proposal ready' : 'New invoice ready',
        summaryLabel: isProposal ? 'Proposal Summary' : 'Invoice Summary',
        numberLabel: isProposal ? 'Proposal No' : 'Invoice No',
        totalLabel: isProposal ? 'Proposal Total' : 'Total',
        dateLabel: isProposal ? 'Valid Until' : 'Due Date',
        ctaLabel: isProposal ? 'View Proposal' : 'View Invoice'
    };
};

const startOfDayUTC = (date) => new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
));

const daysUntil = (date) => {
    if (!date) return null;
    const now = startOfDayUTC(new Date());
    const target = startOfDayUTC(new Date(date));
    if (Number.isNaN(target.getTime())) return null;
    return Math.round((target - now) / DAY_MS);
};

const baseLayout = ({ preheader, title, bodyHtml, ctaHref, ctaLabel, footerHtml }) => {
    const safePreheader = escapeHtml(preheader || '');
    const safeTitle = escapeHtml(title || '');
    const safeCtaHref = escapeHtml(ctaHref || '');
    const safeCtaLabel = escapeHtml(ctaLabel || '');

    return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safePreheader}</div>
    <div style="background:#f8fafc;padding:24px;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;">
        <div style="padding:22px 24px;border-bottom:1px solid #f3f4f6;background:linear-gradient(180deg,#fff7ed 0%, #ffffff 70%);">
          <p style="margin:0 0 6px 0;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#a16207;font-weight:800;">
            ClientFlow AI
          </p>
          <h1 style="margin:0;font-family:Arial,sans-serif;font-size:22px;line-height:1.2;color:#111827;">
            ${safeTitle}
          </h1>
        </div>

        <div style="padding:24px;font-family:Arial,sans-serif;color:#111827;">
          ${bodyHtml || ''}

          ${ctaHref && ctaLabel ? `
            <div style="margin:22px 0 8px;">
              <a href="${safeCtaHref}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:800;">
                ${safeCtaLabel}
              </a>
            </div>
            <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.6;">
              If the button does not work, paste this link into your browser:<br/>
              <span style="word-break:break-all;color:#111827;">${safeCtaHref}</span>
            </p>
          ` : ''}
        </div>

        <div style="padding:16px 24px;border-top:1px solid #f3f4f6;background:#fafafa;font-family:Arial,sans-serif;">
          ${footerHtml || '<p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;">Sent via ClientFlow AI.</p>'}
        </div>
      </div>
      <p style="max-width:600px;margin:14px auto 0;color:#9ca3af;font-family:Arial,sans-serif;font-size:11px;line-height:1.5;text-align:center;">
        Please do not reply to this email. If you need help, contact the sender directly.
      </p>
    </div>
  `;
};

const invoiceCreated = ({ invoice, publicUrl, senderName }) => {
    const fromName = senderName || 'ClientFlow AI';
    const clientName = escapeHtml(invoice.clientName);
    const invoiceNumber = escapeHtml(invoice.invoiceNumber);
    const amount = formatCurrency(invoice.amount, invoice.currency);
    const labels = getDocumentLabels(invoice);
    const due = formatDate(labels.isProposal ? invoice.validUntil : invoice.dueDate);

    const subject = `${labels.isProposal ? 'Proposal' : 'Invoice'} ${invoice.invoiceNumber} from ${fromName}`;
    const preheader = `${labels.isProposal ? 'Proposal' : 'Invoice'} ${invoice.invoiceNumber} for ${amount}.`;

    const bodyHtml = `
      <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">
        Hi ${clientName},
      </p>
      <p style="margin:0 0 18px;color:#374151;font-size:14px;line-height:1.6;">
        ${labels.isProposal
        ? `You have received a proposal from <strong>${escapeHtml(fromName)}</strong>. Review the scope and approve it using the link below.`
        : `You have received an invoice from <strong>${escapeHtml(fromName)}</strong>. You can view the invoice and pay securely using the link below.`}
      </p>

      <div style="border:1px solid #e5e7eb;border-radius:14px;padding:14px 16px;background:#ffffff;">
        <p style="margin:0 0 8px;color:#6b7280;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">
          ${labels.summaryLabel}
        </p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;">${labels.numberLabel}</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:800;text-align:right;">${invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;">${labels.totalLabel}</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:800;text-align:right;">${escapeHtml(amount)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;">${labels.dateLabel}</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:800;text-align:right;">${escapeHtml(due)}</td>
          </tr>
        </table>
      </div>
    `;

    const footerHtml = `
      <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;">
        This invoice link is unique. If you have any questions, reply to the sender: <strong>${escapeHtml(fromName)}</strong>.
      </p>
    `;

    const html = baseLayout({
        preheader,
        title: labels.title,
        bodyHtml,
        ctaHref: publicUrl,
        ctaLabel: labels.ctaLabel,
        footerHtml
    });

    const text = labels.isProposal
        ? `Hi ${invoice.clientName},\n\nYou have received proposal ${invoice.invoiceNumber} from ${fromName} for ${amount}. Valid until: ${due}.\n\nReview & approve: ${publicUrl}\n`
        : `Hi ${invoice.clientName},\n\nYou have received invoice ${invoice.invoiceNumber} from ${fromName} for ${amount}. Due: ${due}.\n\nView & pay: ${publicUrl}\n`;

    return { subject, html, text };
};

const invoiceReminder = ({ invoice, publicUrl, senderName }) => {
    const fromName = senderName || 'ClientFlow AI';
    const clientName = escapeHtml(invoice.clientName);
    const invoiceNumber = escapeHtml(invoice.invoiceNumber);
    const amount = formatCurrency(invoice.amount, invoice.currency);
    const due = formatDate(invoice.dueDate);
    const delta = daysUntil(invoice.dueDate);

    const timingLine = delta === null
        ? 'This invoice is still pending.'
        : delta > 0
            ? `This invoice is due in ${delta} day${delta === 1 ? '' : 's'}.`
            : delta === 0
                ? 'This invoice is due today.'
                : `This invoice is overdue by ${Math.abs(delta)} day${Math.abs(delta) === 1 ? '' : 's'}.`;

    const subject = `Reminder: Invoice ${invoice.invoiceNumber} is pending`;
    const preheader = `Reminder for ${invoice.invoiceNumber} (${amount}).`;

    const bodyHtml = `
      <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">
        Hi ${clientName},
      </p>
      <p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.6;">
        Just a quick reminder from <strong>${escapeHtml(fromName)}</strong>.
      </p>
      <p style="margin:0 0 18px;color:#6b7280;font-size:13px;line-height:1.6;">
        ${escapeHtml(timingLine)} If you have already paid, please ignore this email.
      </p>

      <div style="border:1px solid #e5e7eb;border-radius:14px;padding:14px 16px;background:#ffffff;">
        <p style="margin:0 0 8px;color:#6b7280;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">
          Invoice Details
        </p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;">Invoice No</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:800;text-align:right;">${invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;">Total</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:800;text-align:right;">${escapeHtml(amount)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;">Due Date</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:800;text-align:right;">${escapeHtml(due)}</td>
          </tr>
        </table>
      </div>
    `;

    const html = baseLayout({
        preheader,
        title: 'Payment reminder',
        bodyHtml,
        ctaHref: publicUrl,
        ctaLabel: 'View & Pay',
        footerHtml: `<p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;">Sent by ${escapeHtml(fromName)} via ClientFlow AI.</p>`
    });

    const text = `Hi ${invoice.clientName},\n\nReminder: invoice ${invoice.invoiceNumber} from ${fromName} is still pending (${amount}). Due: ${due}.\nView & pay: ${publicUrl}\n`;

    return { subject, html, text };
};

const proposalReminder = ({ invoice, publicUrl, senderName }) => {
    const fromName = senderName || 'ClientFlow AI';
    const clientName = escapeHtml(invoice.clientName);
    const invoiceNumber = escapeHtml(invoice.invoiceNumber);
    const amount = formatCurrency(invoice.amount, invoice.currency);
    const validUntil = formatDate(invoice.validUntil);
    const delta = daysUntil(invoice.validUntil);

    const timingLine = delta === null
        ? 'This proposal is waiting for review.'
        : delta > 0
            ? `This proposal is valid for ${delta} more day${delta === 1 ? '' : 's'}.`
            : delta === 0
                ? 'This proposal is valid until today.'
                : `This proposal validity passed ${Math.abs(delta)} day${Math.abs(delta) === 1 ? '' : 's'} ago.`;

    const subject = `Reminder: Proposal ${invoice.invoiceNumber} is waiting for review`;
    const preheader = `Proposal ${invoice.invoiceNumber} from ${fromName} needs review.`;

    const bodyHtml = `
      <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">
        Hi ${clientName},
      </p>
      <p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.6;">
        Quick follow-up from <strong>${escapeHtml(fromName)}</strong>.
      </p>
      <p style="margin:0 0 18px;color:#6b7280;font-size:13px;line-height:1.6;">
        ${escapeHtml(timingLine)} Please review the scope and approve it if everything looks good.
      </p>

      <div style="border:1px solid #e5e7eb;border-radius:14px;padding:14px 16px;background:#ffffff;">
        <p style="margin:0 0 8px;color:#6b7280;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">
          Proposal Details
        </p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;">Proposal No</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:800;text-align:right;">${invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;">Total</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:800;text-align:right;">${escapeHtml(amount)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;">Valid Until</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:800;text-align:right;">${escapeHtml(validUntil)}</td>
          </tr>
        </table>
      </div>
    `;

    const html = baseLayout({
        preheader,
        title: 'Proposal follow-up',
        bodyHtml,
        ctaHref: publicUrl,
        ctaLabel: 'Review Proposal',
        footerHtml: `<p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;">Sent by ${escapeHtml(fromName)} via ClientFlow AI.</p>`
    });

    const text = `Hi ${invoice.clientName},\n\nReminder: proposal ${invoice.invoiceNumber} from ${fromName} is waiting for review (${amount}). Valid until: ${validUntil}.\nReview proposal: ${publicUrl}\n`;

    return { subject, html, text };
};

const paymentConfirmed = ({ invoice, publicUrl, senderName }) => {
    const fromName = senderName || 'ClientFlow AI';
    const clientName = escapeHtml(invoice.clientName);
    const invoiceNumber = escapeHtml(invoice.invoiceNumber);
    const amount = formatCurrency(invoice.amount, invoice.currency);
    const paidAt = formatDate(invoice.paidAt || new Date());

    const subject = `Payment received: Invoice ${invoice.invoiceNumber}`;
    const preheader = `Payment received for ${invoice.invoiceNumber} (${amount}).`;

    const bodyHtml = `
      <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">
        Hi ${clientName},
      </p>
      <p style="margin:0 0 18px;color:#374151;font-size:14px;line-height:1.6;">
        Payment has been received for your invoice from <strong>${escapeHtml(fromName)}</strong>.
      </p>

      <div style="border:1px solid #e5e7eb;border-radius:14px;padding:14px 16px;background:#ffffff;">
        <p style="margin:0 0 8px;color:#6b7280;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">
          Receipt
        </p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;">Invoice No</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:800;text-align:right;">${invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;">Amount</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:800;text-align:right;">${escapeHtml(amount)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;">Paid on</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:800;text-align:right;">${escapeHtml(paidAt)}</td>
          </tr>
        </table>
      </div>
    `;

    const html = baseLayout({
        preheader,
        title: 'Payment confirmed',
        bodyHtml,
        ctaHref: publicUrl,
        ctaLabel: 'View Invoice',
        footerHtml: `<p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;">Thank you. This confirmation was sent via ClientFlow AI.</p>`
    });

    const text = `Hi ${invoice.clientName},\n\nPayment received for invoice ${invoice.invoiceNumber} (${amount}). Paid on: ${paidAt}.\nView: ${publicUrl}\n`;

    return { subject, html, text };
};

const userDailyDigest = ({ user, items = [], dashboardUrl }) => {
    const name = user?.name || user?.companyName || 'there';
    const safeName = escapeHtml(name);
    const visibleItems = items.slice(0, 8);
    const subject = `ClientFlow AI: ${visibleItems.length || 0} action${visibleItems.length === 1 ? '' : 's'} need attention`;
    const preheader = 'Your leads, invoices, proposals, and project tasks that need attention today.';

    const bodyHtml = `
      <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">
        Hi ${safeName},
      </p>
      <p style="margin:0 0 18px;color:#374151;font-size:14px;line-height:1.6;">
        ClientFlow AI found these actions that may need attention today. Review them before they slow down your client workflow.
      </p>
      <div style="border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;background:#ffffff;">
        ${visibleItems.map((item) => `
          <div style="padding:14px 16px;border-bottom:1px solid #f3f4f6;">
            <p style="margin:0 0 4px;color:#111827;font-size:14px;font-weight:800;">${escapeHtml(item.title)}</p>
            <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.5;">${escapeHtml(item.detail)}</p>
          </div>
        `).join('')}
      </div>
    `;

    const html = baseLayout({
        preheader,
        title: 'Today\'s client workflow actions',
        bodyHtml,
        ctaHref: dashboardUrl,
        ctaLabel: 'Open Dashboard',
        footerHtml: '<p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;">You are receiving this because automated ClientFlow AI reminders are enabled for your workspace.</p>'
    });

    const text = [
        `Hi ${name},`,
        '',
        'ClientFlow AI found these actions that may need attention today:',
        '',
        ...visibleItems.map((item) => `- ${item.title}: ${item.detail}`),
        '',
        `Open dashboard: ${dashboardUrl}`
    ].join('\n');

    return { subject, html, text };
};

const planExpiredNotification = ({ user, planLabel = 'Pro', daysExpired = 0, isFreeAccess = false, renewUrl }) => {
    const name = user?.name || user?.companyName || 'there';
    const safeName = escapeHtml(name);
    const label = escapeHtml(planLabel);
    const subject = isFreeAccess
        ? 'Your 30-Day Free Access to ClientFlow AI has expired'
        : `Your ClientFlow AI ${label} access has expired`;
    const preheader = isFreeAccess
        ? 'Your 30-day free trial has ended. Upgrade to Pro to keep generating unlimited invoices & proposals.'
        : `Your ${label} plan has expired. Renew your Pro access now to avoid workflow interruptions.`;

    const bodyHtml = `
      <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">
        Hi ${safeName},
      </p>
      <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
        ${isFreeAccess
            ? 'Your <strong>30-Day Full Free Access</strong> window for ClientFlow AI has expired.'
            : `Your <strong>${label}</strong> plan subscription for ClientFlow AI has ended.`}
      </p>

      <div style="border:1px solid #fecaca;background:#fef2f2;border-radius:14px;padding:16px;margin:0 0 20px;">
        <p style="margin:0 0 6px;color:#991b1b;font-size:12px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;">
          Account Notice · Action Needed
        </p>
        <p style="margin:0;color:#7f1d1d;font-size:13px;line-height:1.5;">
          ${daysExpired > 0
            ? `Your access expired ${daysExpired} day${daysExpired === 1 ? '' : 's'} ago.`
            : 'Your access period has reached its conclusion.'}
          Upgrade to Pro now to keep full access to unlimited invoices, AI client discovery, professional proposals, and payment links.
        </p>
      </div>

      <div style="border:1px solid #e5e7eb;border-radius:14px;padding:14px 16px;background:#ffffff;margin:0 0 20px;">
        <p style="margin:0 0 8px;color:#6b7280;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">
          Plan Details
        </p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;">Plan Type</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:800;text-align:right;">${label}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;">Account Status</td>
            <td style="padding:6px 0;color:#dc2626;font-size:13px;font-weight:800;text-align:right;">Expired</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;">Your Data</td>
            <td style="padding:6px 0;color:#059669;font-size:13px;font-weight:800;text-align:right;">Safely Preserved</td>
          </tr>
        </table>
      </div>

      <p style="margin:0 0 8px;color:#374151;font-size:14px;line-height:1.6;">
        All your past invoices, clients, and documents remain securely preserved. You can resume right where you left off the moment you renew.
      </p>
    `;

    const html = baseLayout({
        preheader,
        title: isFreeAccess ? '30-Day Free Access Expired' : `${label} Plan Expired`,
        bodyHtml,
        ctaHref: renewUrl,
        ctaLabel: 'Renew Pro Access Now',
        footerHtml: '<p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;">You received this notification regarding your ClientFlow AI account access status.</p>'
    });

    const text = [
        `Hi ${name},`,
        '',
        isFreeAccess
            ? 'Your 30-Day Full Free Access to ClientFlow AI has expired.'
            : `Your ${label} plan for ClientFlow AI has expired.`,
        '',
        'Upgrade to Pro to restore unlimited invoice generation, AI client finding, and proposal tools:',
        renewUrl,
        '',
        'All your clients, invoices, and documents are securely saved in your workspace.'
    ].join('\n');

    return { subject, html, text };
};

// ───── Trial Expiry Warning ─────
const trialExpiryWarning = ({ user, daysLeft, upgradeUrl }) => {
    const name = escapeHtml(user?.name || 'there');
    const days = Number(daysLeft) || 3;
    const url = upgradeUrl || 'https://www.clientflowai.in/checkout/monthly';

    const subject = `⏰ Your free trial expires in ${days} day${days === 1 ? '' : 's'} — upgrade now`;
    const preheader = `Only ${days} day${days === 1 ? '' : 's'} left of your 30-day ClientFlow AI free trial. Lock in your Pro access before it ends.`;

    const bodyHtml = `
      <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Hi ${name},</p>
      <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
        Your <strong>30-Day Free Trial</strong> of ClientFlow AI expires in <strong style="color:#dc2626;">${days} day${days === 1 ? '' : 's'}</strong>.
      </p>
      <div style="border:1px solid #fef08a;background:#fefce8;border-radius:14px;padding:16px;margin:0 0 20px;">
        <p style="margin:0 0 6px;color:#854d0e;font-size:12px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;">What you'll lose access to:</p>
        <ul style="margin:8px 0 0;padding-left:18px;color:#713f12;font-size:13px;line-height:1.8;">
          <li>Unlimited GST Invoice generation</li>
          <li>AI Proposal Writer</li>
          <li>Automated Payment Reminders</li>
          <li>Client Finder &amp; Outbound Autopilot</li>
        </ul>
      </div>
      <p style="margin:0 0 8px;color:#374151;font-size:14px;line-height:1.6;">Pro is just <strong>₹499/month</strong> — less than the value of one recovered late payment.</p>
    `;

    const html = baseLayout({
        preheader,
        title: `Your free trial ends in ${days} day${days === 1 ? '' : 's'}`,
        bodyHtml,
        ctaHref: url,
        ctaLabel: '🚀 Upgrade to Pro Now',
        footerHtml: '<p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;">You are receiving this because your ClientFlow AI trial is expiring soon.</p>'
    });

    const text = `Hi ${user?.name || 'there'},\n\nYour 30-Day Free Trial expires in ${days} day${days === 1 ? '' : 's'}.\nUpgrade to Pro now: ${url}\n`;
    return { subject, html, text };
};

// ───── Diwali Campaign Email ─────
const diwaliCampaign = ({ user, upgradeUrl }) => {
    const name = escapeHtml(user?.name || 'there');
    const url = upgradeUrl || 'https://www.clientflowai.in/checkout/monthly';

    const subject = '🪔 Diwali Special: 50% OFF ClientFlow AI Pro — Today Only!';
    const preheader = 'Celebrate Diwali with 50% off your Pro subscription. Offer valid Nov 8–15 only.';

    const bodyHtml = `
      <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Hi ${name},</p>
      <div style="background:linear-gradient(135deg,#7c2d12,#c2410c);border-radius:16px;padding:24px;margin:0 0 20px;text-align:center;">
        <p style="margin:0 0 6px;font-size:28px;">🪔✨🎆</p>
        <p style="margin:0 0 4px;color:#fef08a;font-size:20px;font-weight:800;letter-spacing:-0.02em;">Happy Diwali!</p>
        <p style="margin:0;color:#fde68a;font-size:14px;">We're celebrating with our biggest offer ever</p>
      </div>
      <div style="border:2px solid #f59e0b;border-radius:14px;padding:20px;margin:0 0 20px;text-align:center;background:#fffbeb;">
        <p style="margin:0 0 4px;color:#78350f;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">Limited Diwali Offer (Nov 8–15 only)</p>
        <p style="margin:0 0 4px;color:#6b7280;font-size:16px;text-decoration:line-through;">₹499/month</p>
        <p style="margin:0 0 4px;color:#b45309;font-size:36px;font-weight:900;">₹249<span style="font-size:16px;">/month</span></p>
        <p style="margin:0;color:#059669;font-size:13px;font-weight:700;">Save ₹250 — 50% OFF 🎉</p>
      </div>
      <p style="margin:0 0 8px;color:#374151;font-size:14px;line-height:1.6;">This offer is <strong>automatically applied</strong> at checkout — no coupon code needed. Just click below and pay the discounted price.</p>
    `;

    const html = baseLayout({
        preheader,
        title: '🪔 Diwali 50% OFF Offer',
        bodyHtml,
        ctaHref: url,
        ctaLabel: '🪔 Claim 50% Diwali Offer',
        footerHtml: '<p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;">Offer valid Nov 8–15, 2026 only. Price reverts to ₹499/month after the offer ends.</p>'
    });

    const text = `Hi ${user?.name || 'there'},\n\n🪔 Happy Diwali! We're offering 50% OFF ClientFlow AI Pro — just ₹249/month!\nOffer valid Nov 8–15 only. Upgrade here: ${url}\n`;
    return { subject, html, text };
};

// ───── Pro Plan Activation Confirmation ─────
const planActivated = ({ user, planLabel = 'Pro Monthly', amount, dashboardUrl }) => {
    const name = escapeHtml(user?.name || 'there');
    const url = dashboardUrl || 'https://www.clientflowai.in/client-flow';
    const amountStr = amount ? `₹${Number(amount).toLocaleString('en-IN')}` : '';

    const subject = '✅ Payment Confirmed — Welcome to ClientFlow AI Pro!';
    const preheader = 'Your Pro plan is now active. Start creating unlimited invoices and proposals.';

    const bodyHtml = `
      <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Hi ${name},</p>
      <div style="border:1px solid #d1fae5;background:#ecfdf5;border-radius:14px;padding:16px;margin:0 0 20px;">
        <p style="margin:0 0 4px;color:#065f46;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;">✅ Payment Confirmed</p>
        <p style="margin:0;color:#047857;font-size:14px;line-height:1.5;">Your <strong>${escapeHtml(planLabel)}</strong> subscription is now active.${amountStr ? ` Amount paid: <strong>${escapeHtml(amountStr)}</strong>.` : ''}</p>
      </div>
      <p style="margin:0 0 8px;color:#374151;font-size:14px;line-height:1.6;">You now have <strong>unlimited access</strong> to all ClientFlow AI Pro features — invoices, AI proposals, payment reminders, client finder, and more.</p>
      <p style="margin:0 0 8px;color:#374151;font-size:14px;line-height:1.6;">Thank you for trusting us with your freelance business. 🙏</p>
    `;

    const html = baseLayout({
        preheader,
        title: 'Welcome to ClientFlow AI Pro!',
        bodyHtml,
        ctaHref: url,
        ctaLabel: '🚀 Open My Pro Workspace',
        footerHtml: '<p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;">Thank you for your payment. This is your payment confirmation email from ClientFlow AI.</p>'
    });

    const text = `Hi ${user?.name || 'there'},\n\n✅ Payment confirmed! Your ${planLabel} subscription is now active.\nOpen your workspace: ${url}\n`;
    return { subject, html, text };
};

module.exports = {
    invoiceCreated,
    invoiceReminder,
    proposalReminder,
    paymentConfirmed,
    userDailyDigest,
    planExpiredNotification,
    trialExpiryWarning,
    diwaliCampaign,
    planActivated
};
