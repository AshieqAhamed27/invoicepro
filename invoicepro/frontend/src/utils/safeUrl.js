const isLocalNetworkHostname = (hostname) => {
  const host = String(hostname || '').toLowerCase();
  if (!host) return false;

  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return true;
  if (host.endsWith('.local')) return true;

  // Private IPv4 ranges
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;

  return false;
};

export const getSafeRemoteImageUrl = (value) => {
  const input = String(value || '').trim();
  if (!input) return '';

  // Allow inline data URLs for logos.
  if (/^data:image\//i.test(input)) return input;

  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    return '';
  }

  const protocol = String(parsed.protocol || '').toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') return '';

  const pageIsHttps = typeof window !== 'undefined' && window.location?.protocol === 'https:';
  if (protocol === 'http:' && pageIsHttps) return '';

  // In production, block localhost / private network URLs to avoid mixed content + unreachable assets.
  if (import.meta.env.PROD && isLocalNetworkHostname(parsed.hostname)) return '';

  return parsed.toString();
};
