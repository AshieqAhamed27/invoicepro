import { useEffect } from 'react';
import { SITE_URL } from './company';

const absoluteUrl = (path) => {
  const normalizedPath = path && path.startsWith('/') ? path : `/${path || ''}`;
  return `${SITE_URL}${normalizedPath === '/' ? '/' : normalizedPath.replace(/\/+$/, '')}`;
};

const setMeta = (selector, attribute, value) => {
  const tag = document.querySelector(selector);
  if (tag && value) {
    tag.setAttribute(attribute, value);
  }
  return tag;
};

const defaultTitle = 'ClientFlow AI | Freelancer Business System';
const defaultDescription = 'ClientFlow AI helps freelancers get clients, manage projects, send proposals, create invoices, and collect payments.';

const normalizeMetaArgs = (titleOrConfig, description, options = {}) => {
  if (titleOrConfig && typeof titleOrConfig === 'object') {
    const { title, description: configDescription, ...configOptions } = titleOrConfig;
    return {
      title: String(title || defaultTitle),
      description: String(configDescription || defaultDescription),
      options: {
        ...configOptions,
        ...(description && typeof description === 'object' ? description : {})
      }
    };
  }

  return {
    title: String(titleOrConfig || defaultTitle),
    description: String(description || defaultDescription),
    options: options || {}
  };
};

export default function useDocumentMeta(titleOrConfig, description, options = {}) {
  const meta = normalizeMetaArgs(titleOrConfig, description, options);

  useEffect(() => {
    const previousTitle = document.title;
    const descriptionTag = document.querySelector('meta[name="description"]');
    const canonicalTag = document.querySelector('link[rel="canonical"]');
    const ogTitleTag = document.querySelector('meta[property="og:title"]');
    const ogDescriptionTag = document.querySelector('meta[property="og:description"]');
    const ogUrlTag = document.querySelector('meta[property="og:url"]');
    const twitterTitleTag = document.querySelector('meta[name="twitter:title"]');
    const twitterDescriptionTag = document.querySelector('meta[name="twitter:description"]');

    const previousDescription = descriptionTag?.getAttribute('content') || '';
    const previousCanonical = canonicalTag?.getAttribute('href') || '';
    const previousOgTitle = ogTitleTag?.getAttribute('content') || '';
    const previousOgDescription = ogDescriptionTag?.getAttribute('content') || '';
    const previousOgUrl = ogUrlTag?.getAttribute('content') || '';
    const previousTwitterTitle = twitterTitleTag?.getAttribute('content') || '';
    const previousTwitterDescription = twitterDescriptionTag?.getAttribute('content') || '';
    const canonicalUrl = meta.options.canonical || absoluteUrl(meta.options.path || window.location.pathname);

    document.title = meta.title;

    setMeta('meta[name="description"]', 'content', meta.description);
    setMeta('link[rel="canonical"]', 'href', canonicalUrl);
    setMeta('meta[property="og:title"]', 'content', meta.title);
    setMeta('meta[property="og:description"]', 'content', meta.description);
    setMeta('meta[property="og:url"]', 'content', canonicalUrl);
    setMeta('meta[name="twitter:title"]', 'content', meta.title);
    setMeta('meta[name="twitter:description"]', 'content', meta.description);

    return () => {
      document.title = previousTitle;

      if (descriptionTag && previousDescription) {
        descriptionTag.setAttribute('content', previousDescription);
      }

      if (canonicalTag && previousCanonical) canonicalTag.setAttribute('href', previousCanonical);
      if (ogTitleTag && previousOgTitle) ogTitleTag.setAttribute('content', previousOgTitle);
      if (ogDescriptionTag && previousOgDescription) ogDescriptionTag.setAttribute('content', previousOgDescription);
      if (ogUrlTag && previousOgUrl) ogUrlTag.setAttribute('content', previousOgUrl);
      if (twitterTitleTag && previousTwitterTitle) twitterTitleTag.setAttribute('content', previousTwitterTitle);
      if (twitterDescriptionTag && previousTwitterDescription) twitterDescriptionTag.setAttribute('content', previousTwitterDescription);
    };
  }, [meta.title, meta.description, meta.options.canonical, meta.options.path]);
}
