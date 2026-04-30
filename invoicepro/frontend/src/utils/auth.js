import { jwtDecode } from 'jwt-decode';

const POST_LOGIN_REDIRECT_KEY = 'postLoginRedirect';

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
