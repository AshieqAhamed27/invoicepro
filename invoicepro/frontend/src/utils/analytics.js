const isBrowser = () => typeof window !== 'undefined';

export const trackEvent = (eventName, params = {}) => {
  if (!isBrowser() || typeof window.gtag !== 'function') return;

  window.gtag('event', eventName, {
    app_name: 'InvoicePro',
    ...params
  });
};

export const trackPageView = (path, title = document.title) => {
  if (!isBrowser() || typeof window.gtag !== 'function') return;

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
