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

export default function useDocumentMeta(title, description, options = {}) {
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
    const canonicalUrl = options.canonical || absoluteUrl(options.path || window.location.pathname);

    document.title = title;

    setMeta('meta[name="description"]', 'content', description);
    setMeta('link[rel="canonical"]', 'href', canonicalUrl);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', canonicalUrl);
    setMeta('meta[name="twitter:title"]', 'content', title);
    setMeta('meta[name="twitter:description"]', 'content', description);

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
  }, [title, description, options.canonical, options.path]);
}
