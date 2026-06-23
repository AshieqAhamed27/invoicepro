import { jwtDecode } from 'jwt-decode';

const POST_LOGIN_REDIRECT_KEY = 'postLoginRedirect';
const FREE_FULL_ACCESS_ENABLED = String(import.meta.env?.VITE_FREE_FULL_ACCESS_ENABLED ?? 'true').toLowerCase() !== 'false';
const FREE_FULL_ACCESS_DAYS = Math.max(1, Number.parseInt(import.meta.env?.VITE_FREE_FULL_ACCESS_DAYS || '30', 10) || 30);
const DAY_MS = 24 * 60 * 60 * 1000;

export const getUser = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

export const getToken = () => localStorage.getItem('token');

const isTokenExpired = (token) => {
  try {
    const decoded = jwtDecode(token);
    if (!decoded?.exp) return false;
    return decoded.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

export const setAuth = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const setPostLoginRedirect = (path) => {
  if (!path || path === '/login' || path === '/signup') return;
  localStorage.setItem(POST_LOGIN_REDIRECT_KEY, path);
};

export const peekPostLoginRedirect = () => {
  return localStorage.getItem(POST_LOGIN_REDIRECT_KEY);
};

export const consumePostLoginRedirect = () => {
  const redirect = localStorage.getItem(POST_LOGIN_REDIRECT_KEY);
  localStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
  return redirect;
};

export const resolvePostLoginRedirect = (locationState) => {
  const storedRedirect = consumePostLoginRedirect();
  const from = locationState?.from;

  if (from?.pathname) {
    return `${from.pathname}${from.search || ''}${from.hash || ''}`;
  }

  return storedRedirect || '/dashboard';
};

export const isLoggedIn = () => {
  const token = getToken();

  if (!token) {
    return false;
  }

  if (isTokenExpired(token)) {
    clearAuth();
    return false;
  }

  return true;
};

export const isFreeFullAccessEnabled = () => FREE_FULL_ACCESS_ENABLED;
export const getFreeFullAccessDays = () => FREE_FULL_ACCESS_DAYS;

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const getFreeAccessState = (user = getUser()) => {
  if (!user || user.role === 'admin' || (user.plan && user.plan !== 'free')) {
    return {
      enabled: FREE_FULL_ACCESS_ENABLED,
      days: FREE_FULL_ACCESS_DAYS,
      startedAt: null,
      expiresAt: null,
      provisional: false,
      active: false,
      expired: false,
      daysLeft: 0
    };
  }

  const startedAt = parseDate(user?.freeAccessStartedAt || user?.createdAt);
  const configuredExpiry = parseDate(user?.freeAccessExpiresAt);
  const provisional = FREE_FULL_ACCESS_ENABLED && user && !startedAt && !configuredExpiry;
  const expiresAt = configuredExpiry || (startedAt ? new Date(startedAt.getTime() + FREE_FULL_ACCESS_DAYS * DAY_MS) : null);
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / DAY_MS) : FREE_FULL_ACCESS_DAYS;
  const active = Boolean(
    FREE_FULL_ACCESS_ENABLED &&
    user &&
    (
      provisional ||
      (startedAt && expiresAt && expiresAt > new Date())
    )
  );

  return {
    enabled: FREE_FULL_ACCESS_ENABLED,
    days: FREE_FULL_ACCESS_DAYS,
    startedAt,
    expiresAt,
    provisional,
    active,
    expired: Boolean(FREE_FULL_ACCESS_ENABLED && user && expiresAt && expiresAt <= new Date()),
    daysLeft: Math.max(daysLeft, 0)
  };
};

export const hasProAccess = (user = getUser()) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (getFreeAccessState(user).active) return true;
  if (!user.plan || user.plan === 'free') return false;

  if (user.planExpiresAt) {
    const expiresAt = new Date(user.planExpiresAt);
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt <= new Date()) {
      return false;
    }
  }

  return true;
};

export const getPlanLabel = (user = getUser()) => {
  if (user?.role === 'admin') return 'Admin';
  if (getFreeAccessState(user).active) return `${FREE_FULL_ACCESS_DAYS}-Day Free Access`;
  if (getFreeAccessState(user).expired) return 'Free Access Expired';
  if (!user?.plan || user.plan === 'free') return 'Free';
  if (user.plan === 'trial') return 'Pro Trial';
  if (user.plan === 'early_access') return 'Early Access';
  if (user.plan === 'monthly') return 'Pro Monthly';
  if (user.plan === 'yearly') return 'Pro Annual';
  if (user.plan === 'founder90') return 'Founder 90 Days';
  return 'Pro';
};

export const formatCurrency = (amount, currency) => {
  const symbol = currency === 'USD' ? 'USD ' : 'Rs ';
  return `${symbol}${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
};
