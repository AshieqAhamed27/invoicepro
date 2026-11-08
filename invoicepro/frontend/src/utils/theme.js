// ClientFlow AI Theme Manager (Light & Dark Mode)

const THEME_STORAGE_KEY = 'clientflow_theme';

export const getTheme = () => {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // fallback
  }
  return 'light'; // Default to modern bright UI
};

export const applyTheme = (theme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

export const setTheme = (theme) => {
  if (typeof window === 'undefined') return;
  const targetTheme = theme === 'dark' ? 'dark' : 'light';
  try {
    localStorage.setItem(THEME_STORAGE_KEY, targetTheme);
  } catch {
    // safe fallback
  }
  applyTheme(targetTheme);
  window.dispatchEvent(new CustomEvent('clientflow:theme-changed', { detail: { theme: targetTheme } }));
};

export const toggleTheme = () => {
  const current = getTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
};

export const initTheme = () => {
  const current = getTheme();
  applyTheme(current);
  return current;
};
