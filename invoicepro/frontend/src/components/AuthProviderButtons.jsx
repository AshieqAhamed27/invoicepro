import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';
import { peekPostLoginRedirect } from '../utils/auth';
import { trackEvent } from '../utils/analytics';

const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

const oauthProviders = [
  {
    id: 'github',
    label: 'GitHub',
    shortLabel: 'G',
    clientId: (import.meta.env.VITE_GITHUB_CLIENT_ID || '').trim(),
    className: 'hover:border-white/30 hover:bg-white/10'
  },
  {
    id: 'microsoft',
    label: 'Microsoft',
    shortLabel: 'M',
    clientId: (import.meta.env.VITE_MICROSOFT_CLIENT_ID || '').trim(),
    className: 'hover:border-sky-300/30 hover:bg-sky-300/10'
  }
];

const getSafeReturnPath = (value) => {
  const path = String(value || '').trim();

  if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    return '/client-flow';
  }

  return path;
};

const getLocationStateReturnPath = (locationState) => {
  const from = locationState?.from;

  if (!from?.pathname) return '';

  return getSafeReturnPath(`${from.pathname}${from.search || ''}${from.hash || ''}`);
};

const loadGoogleScript = () => new Promise((resolve, reject) => {
  const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');

  if (existingScript) {
    resolve();
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.defer = true;
  script.onload = resolve;
  script.onerror = reject;

  document.body.appendChild(script);
});

export const hasConfiguredAuthProviders = () => (
  Boolean(googleClientId) ||
  oauthProviders.some((provider) => Boolean(provider.clientId))
);

export default function AuthProviderButtons({
  mode = 'login',
  onAuthenticated,
  onError,
  dividerLabel = 'or use email'
}) {
  const location = useLocation();
  const googleButtonRef = useRef(null);
  const configuredOAuthProviders = useMemo(
    () => oauthProviders.filter((provider) => provider.clientId),
    []
  );

  const handleGoogleCredential = useCallback(async(response) => {
    try {
      const res = await api.post('/auth/google', {
        credential: response.credential
      });

      onAuthenticated(res.data.token, res.data.user, 'google');
    } catch (err) {
      trackEvent('auth_provider_error', { provider: 'google', mode });
      onError(
        err.response?.data?.message ||
        'Google login failed. Please use email login or try again.'
      );
    }
  }, [onAuthenticated, onError]);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return undefined;

    let active = true;

    loadGoogleScript()
      .then(() => {
        if (!active || !window.google || !googleButtonRef.current) return;

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredential
        });

        googleButtonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          width: 300,
          text: mode === 'signup' ? 'signup_with' : 'continue_with',
          shape: 'pill'
        });
      })
      .catch(() => {
        if (active) {
          onError('Google login could not load. Please use email login or try again.');
        }
      });

    return () => {
      active = false;
    };
  }, [handleGoogleCredential, mode, onError]);

  const startOAuthLogin = (providerId) => {
    trackEvent('auth_provider_start', { provider: providerId, mode });

    const returnTo = getSafeReturnPath(
      getLocationStateReturnPath(location.state) ||
      peekPostLoginRedirect() ||
      '/client-flow'
    );
    const params = new URLSearchParams({
      returnTo,
      mode
    });

    window.location.assign(`${api.defaults.baseURL}/auth/oauth/${providerId}/start?${params.toString()}`);
  };

  if (!googleClientId && configuredOAuthProviders.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      {googleClientId && (
        <div ref={googleButtonRef} className="mb-3 flex max-w-full justify-center overflow-hidden sm:scale-110" />
      )}

      {configuredOAuthProviders.length > 0 && (
        <div className="grid gap-3">
          {configuredOAuthProviders.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => startOAuthLogin(provider.id)}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm font-black text-white transition ${provider.className}`}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-black/25 text-xs">
                {provider.shortLabel}
              </span>
              <span>{provider.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 flex items-center gap-4">
        <span className="h-px flex-1 bg-white/5" />
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-700">{dividerLabel}</span>
        <span className="h-px flex-1 bg-white/5" />
      </div>
    </div>
  );
}
