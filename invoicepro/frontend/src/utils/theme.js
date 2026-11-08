// ClientFlow AI Theme Manager — Luminous Modern Bright SaaS
export const getTheme = () => 'light';

export const applyTheme = () => {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.remove('dark');
  try {
    localStorage.removeItem('clientflow_theme');
  } catch {
    // safe fallback
  }
};

export const setTheme = () => {
  applyTheme();
};

export const toggleTheme = () => {
  applyTheme();
  return 'light';
};

export const initTheme = () => {
  applyTheme();
  return 'light';
};
