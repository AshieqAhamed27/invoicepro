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

    return currency === 'USD' ? `$${fixed}` : `₹${fixed}`;
};

const formatDate = (date) => {
    if (!date) return 'Not specified';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return 'Not specified';
    return parsed.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
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
            InvoicePro
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
          ${footerHtml || '<p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;">Sent via InvoicePro.</p>'}
        </div>
      </div>
      <p style="max-width:600px;margin:14px auto 0;color:#9ca3af;font-family:Arial,sans-serif;font-size:11px;line-height:1.5;text-align:center;">
        Please do not reply to this email. If you need help, contact the sender directly.
      </p>
    </div>
  `;
};

const invoiceCreated = ({ invoice, publicUrl, senderName }) => {
    const fromName = senderName || 'InvoicePro';
    const clientName = escapeHtml(invoice.clientName);
    const invoiceNumber = escapeHtml(invoice.invoiceNumber);
    const amount = formatCurrency(invoice.amount, invoice.currency);
    const due = formatDate(invoice.dueDate);

    const subject = `Invoice ${invoice.invoiceNumber} from ${fromName}`;
    const preheader = `Invoice ${invoice.invoiceNumber} for ${amount}.`;

    const bodyHtml = `
      <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">
        Hi ${clientName},
      </p>
      <p style="margin:0 0 18px;color:#374151;font-size:14px;line-height:1.6;">
        You have received an invoice from <strong>${escapeHtml(fromName)}</strong>. You can view the invoice and pay securely using the link below.
      </p>

      <div style="border:1px solid #e5e7eb;border-radius:14px;padding:14px 16px;background:#ffffff;">
        <p style="margin:0 0 8px;color:#6b7280;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">
          Invoice Summary
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

    const footerHtml = `
      <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;">
        This invoice link is unique. If you have any questions, reply to the sender: <strong>${escapeHtml(fromName)}</strong>.
      </p>
    `;

    const html = baseLayout({
        preheader,
        title: 'New invoice ready',
        bodyHtml,
        ctaHref: publicUrl,
        ctaLabel: 'View Invoice',
        footerHtml
    });

    const text = `Hi ${invoice.clientName},\n\nYou have received invoice ${invoice.invoiceNumber} from ${fromName} for ${amount}. Due: ${due}.\n\nView & pay: ${publicUrl}\n`;

    return { subject, html, text };
};

const invoiceReminder = ({ invoice, publicUrl, senderName }) => {
    const fromName = senderName || 'InvoicePro';
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
        footerHtml: `<p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;">Sent by ${escapeHtml(fromName)} via InvoicePro.</p>`
    });

    const text = `Hi ${invoice.clientName},\n\nReminder: invoice ${invoice.invoiceNumber} from ${fromName} is still pending (${amount}). Due: ${due}.\nView & pay: ${publicUrl}\n`;

    return { subject, html, text };
};

const paymentConfirmed = ({ invoice, publicUrl, senderName }) => {
    const fromName = senderName || 'InvoicePro';
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
        footerHtml: `<p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;">Thank you. This confirmation was sent via InvoicePro.</p>`
    });

    const text = `Hi ${invoice.clientName},\n\nPayment received for invoice ${invoice.invoiceNumber} (${amount}). Paid on: ${paidAt}.\nView: ${publicUrl}\n`;

    return { subject, html, text };
};

module.exports = {
    invoiceCreated,
    invoiceReminder,
    paymentConfirmed
};

