import api from './api';

const isBrowser = () => typeof window !== 'undefined';
const GA_MEASUREMENT_ID = 'G-QBKM81QSFR';
const VISITOR_ID_KEY = 'clientflow_visitor_id';
let analyticsScriptRequested = false;

const runWhenIdle = (callback) => {
  if (!isBrowser()) return;

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout: 2400 });
    return;
  }

  window.setTimeout(callback, 1200);
};

const ensureAnalytics = () => {
  if (!isBrowser()) return false;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  if (!analyticsScriptRequested) {
    analyticsScriptRequested = true;
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });

    runWhenIdle(() => {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      document.head.appendChild(script);
    });
  }

  return true;
};

const createVisitorId = () => {
  if (isBrowser() && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getVisitorId = () => {
  if (!isBrowser()) return '';

  try {
    const existing = window.localStorage.getItem(VISITOR_ID_KEY);
    if (existing) return existing;

    const next = createVisitorId();
    window.localStorage.setItem(VISITOR_ID_KEY, next);
    return next;
  } catch (err) {
    return createVisitorId();
  }
};

const sendProductAnalytics = (payload) => {
  if (!isBrowser()) return;

  runWhenIdle(() => {
    api.post('/product-analytics/event', {
      visitorId: getVisitorId(),
      path: `${window.location.pathname}${window.location.search}`,
      title: document.title,
      referrer: document.referrer,
      ...payload
    }, { timeout: 4000 }).catch(() => {});
  });
};

const safeEventPart = (value) => String(value || 'unknown')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 52) || 'unknown';

export const trackProductEvent = (eventName, params = {}) => {
  sendProductAnalytics({
    eventName,
    ...params
  });
};

export const trackEvent = (eventName, params = {}) => {
  if (!ensureAnalytics()) return;

  window.gtag('event', eventName, {
    app_name: 'ClientFlow AI',
    ...params
  });

  if (eventName !== 'select_content' && eventName !== 'page_view') {
    trackProductEvent(eventName, params);
  }
};

export const trackPageView = (path, title = document.title) => {
  if (!ensureAnalytics()) return;

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title,
    page_location: window.location.href
  });

  sendProductAnalytics({
    eventName: 'page_view',
    path,
    title
  });
};

export const trackCtaClick = (label, location, destination = '') => {
  if (ensureAnalytics()) {
    window.gtag('event', 'select_content', {
      app_name: 'ClientFlow AI',
      content_type: 'cta',
      item_id: label,
      location,
      destination
    });
  }

  trackProductEvent(`cta_click:${safeEventPart(label)}`, {
    content_type: 'cta',
    item_id: label,
    location,
    destination
  });
};
