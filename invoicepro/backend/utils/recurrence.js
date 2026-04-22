const DAY_MS = 24 * 60 * 60 * 1000;

const normalizeUrl = (url) => (url || '').trim().replace(/\/+$/, '');

const parseDateInput = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDayUTC = (date) => new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
));

const diffDaysUTC = (fromDate, toDate) => {
    const from = startOfDayUTC(fromDate);
    const to = startOfDayUTC(toDate);
    return Math.max(0, Math.round((to - from) / DAY_MS));
};

const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);

const daysInMonthUTC = (year, monthIndex0) => new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();

const addMonthsPreserveDayUTC = (date, monthsToAdd, dayOfMonth) => {
    const fromYear = date.getUTCFullYear();
    const fromMonth = date.getUTCMonth();
    const hour = date.getUTCHours();
    const minute = date.getUTCMinutes();
    const second = date.getUTCSeconds();
    const ms = date.getUTCMilliseconds();

    const rawMonth = fromMonth + monthsToAdd;
    const targetYear = fromYear + Math.floor(rawMonth / 12);
    const targetMonth = ((rawMonth % 12) + 12) % 12;

    const maxDay = daysInMonthUTC(targetYear, targetMonth);
    const dom = Math.min(Math.max(1, dayOfMonth || 1), maxDay);

    return new Date(Date.UTC(targetYear, targetMonth, dom, hour, minute, second, ms));
};

const computeNextRunAt = ({ from, frequency, interval, dayOfMonth }) => {
    const safeInterval = Math.max(1, Number(interval || 1));

    if (frequency === 'weekly') {
        return addDays(from, safeInterval * 7);
    }

    const dom = dayOfMonth || from.getUTCDate();
    return addMonthsPreserveDayUTC(from, safeInterval, dom);
};

const getPublicInvoiceUrl = (frontendUrl, invoiceId) => {
    const base = normalizeUrl(frontendUrl);
    if (!base) return '';
    return `${base}/public/invoice/${invoiceId}`;
};

module.exports = {
    addDays,
    computeNextRunAt,
    diffDaysUTC,
    getPublicInvoiceUrl,
    parseDateInput
};

