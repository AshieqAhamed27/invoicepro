const isBrowser = () => typeof window !== 'undefined';
const GA_MEASUREMENT_ID = 'G-QBKM81QSFR';
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

export const trackEvent = (eventName, params = {}) => {
  if (!ensureAnalytics()) return;

  window.gtag('event', eventName, {
    app_name: 'ClientFlow AI',
    ...params
  });
};

export const trackPageView = (path, title = document.title) => {
  if (!ensureAnalytics()) return;

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title,
    page_location: window.location.href
  });
};

export const trackCtaClick = (label, location, destination = '') => {
  trackEvent('select_content', {
    content_type: 'cta',
    item_id: label,
    location,
    destination
  });
};
