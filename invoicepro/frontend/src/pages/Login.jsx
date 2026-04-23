import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { resolvePostLoginRedirect, setAuth } from '../utils/auth';
import { jwtDecode } from 'jwt-decode';
import Navbar from '../components/Navbar';
import { SUPPORT_EMAIL } from '../utils/company';
import useDocumentMeta from '../utils/useDocumentMeta';

const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  useDocumentMeta(
    'Login | InvoicePro',
    'Sign in to manage invoices, clients, recurring billing, and payment tracking in InvoicePro.'
  );

  const [form, setForm] = useState({
    email: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async (response) => {
    const decoded = jwtDecode(response.credential);

    try {
      const res = await api.post('/auth/google', {
        name: decoded.name,
        email: decoded.email
      });

      setAuth(res.data.token, res.data.user);
      navigate(resolvePostLoginRedirect(location.state), { replace: true });
    } catch (err) {
      console.log(err);
      alert('Google login failed');
    }
  };

  useEffect(() => {
    if (!googleClientId) return;

    const loadGoogleScript = () => {
      return new Promise((resolve) => {
        const existingScript = document.querySelector(
          'script[src="https://accounts.google.com/gsi/client"]'
        );

        if (existingScript) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = resolve;

        document.body.appendChild(script);
      });
    };

    loadGoogleScript().then(() => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleLogin
        });

        const googleBtn = document.getElementById('googleBtn');
        if (googleBtn) {
          googleBtn.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtn, {
            theme: 'outline',
            size: 'large',
            width: 300,
            text: 'continue_with',
            shape: 'pill'
          });
        }
      }
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', form);
      setAuth(res.data.token, res.data.user);
      navigate(resolvePostLoginRedirect(location.state), { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="container-custom grid items-start gap-8 py-8 sm:gap-10 sm:py-12 lg:min-h-[calc(100vh-120px)] lg:items-center lg:gap-16 lg:grid-cols-[1fr_420px]">
        <section className="hidden lg:block relative">
          <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-400/10 blur-[120px]" />
          <div className="max-w-xl relative">
            <div className="mb-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
               <span className="h-1.5 w-1.5 bg-yellow-400 rounded-full animate-pulse" />
               <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Client billing workspace</p>
            </div>

            <h1 className="mb-6 text-5xl font-black leading-none tracking-tight">
              Sign in to manage <br /> <span className="text-yellow-300">invoices and collections.</span>
            </h1>

            <p className="mb-12 text-lg text-zinc-500 font-medium leading-relaxed">
              Access your clients, invoice history, recurring schedules, and payment tracking from one secure workspace.
            </p>

            <div className="grid gap-4">
               {[
                 { t: 'Invoice overview', d: 'See pending and paid invoices without jumping between tools.' },
                 { t: 'Client records', d: 'Keep billing history and saved client details in one place.' },
                 { t: 'Need help?', d: `Support is available at ${SUPPORT_EMAIL}.` }
               ].map((item, i) => (
                 <div key={i} className="flex items-start gap-4 p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
                    <div className="h-2 w-2 rounded-full bg-yellow-400 mt-2" />
                    <div>
                       <p className="font-bold text-white text-sm">{item.t}</p>
                       <p className="text-xs text-zinc-600 font-medium">{item.d}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </section>

        <section className="reveal mx-auto w-full max-w-xl lg:max-w-none">
          <div className="surface rounded-[2rem] border-white/5 bg-zinc-950/40 p-6 shadow-2xl backdrop-blur-2xl sm:rounded-[2.5rem] sm:p-10 lg:rounded-[3rem] lg:p-12">
            <div className="mb-10">
              <h2 className="text-3xl font-black text-white leading-none mb-3">
                Welcome.
              </h2>
              <p className="text-sm font-medium text-zinc-500">
                Continue with your credentials.
              </p>
            </div>

            {error && (
              <div className="mb-8 p-4 rounded-2xl border border-red-400/20 bg-red-400/5 text-xs font-bold text-red-400">
                {error}
              </div>
            )}

            {googleClientId && (
              <>
                <div id="googleBtn" className="mb-8 flex justify-center scale-110" />

                <div className="mb-8 flex items-center gap-4">
                  <span className="h-px flex-1 bg-white/5" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-700">or use email</span>
                  <span className="h-px flex-1 bg-white/5" />
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Email Address</p>
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input py-4 bg-black/20 border-white/5 focus:bg-black/60"
                  />
              </div>

              <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Password</p>
                  <input
                    type="password"
                    required
                    placeholder="********"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="input py-4 bg-black/20 border-white/5 focus:bg-black/60"
                  />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-5 rounded-2xl shadow-xl shadow-yellow-500/10 font-black text-lg mt-4"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-10 pt-8 border-t border-white/5 text-center">
              <p className="text-sm font-medium text-zinc-500">
                New to InvoicePro?{' '}
                <Link to="/signup" className="font-black text-yellow-300 hover:text-white transition-colors">
                  Create an account
                </Link>
              </p>
              <p className="mt-4 text-xs font-medium text-zinc-600">
                By continuing, you agree to our{' '}
                <Link to="/terms" className="text-zinc-400 hover:text-white transition-colors">Terms</Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-zinc-400 hover:text-white transition-colors">Privacy Policy</Link>.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
