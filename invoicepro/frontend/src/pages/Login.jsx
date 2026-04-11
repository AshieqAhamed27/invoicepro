import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { setAuth } from '../utils/auth';
import { jwtDecode } from 'jwt-decode';
import Navbar from '../components/Navbar';

export default function Login() {
  const navigate = useNavigate();

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

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      window.location.href = '/dashboard';
    } catch (err) {
      console.log(err);
      alert('Google login failed');
    }
  };

  useEffect(() => {
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
          client_id:
            '251597134759-nfkq6fmlnvsgn8lniia3colbfer62gum.apps.googleusercontent.com',
          callback: handleGoogleLogin
        });

        const googleBtn = document.getElementById('googleBtn');
        if (googleBtn) {
          googleBtn.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtn, {
            theme: 'outline',
            size: 'large',
            width: 300
          });
        }
      } else {
        console.log('❌ Google not loaded');
      }
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', form);

      localStorage.clear();
      setAuth(res.data.token, res.data.user);

      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyle =
    'w-full border border-gray-700 bg-gray-800 text-white p-3 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500';

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
      <Navbar />

      <div className="flex min-h-[calc(100vh-72px)]">

        {/* LEFT PANEL */}
        <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 border-r border-gray-800">
          <div>
            <div className="flex items-center gap-3 mb-10">
              <img
                src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                alt="logo"
                className="w-10 h-10"
              />
              <span className="text-2xl font-bold">InvoicePro</span>
            </div>

            <h1 className="text-4xl font-bold leading-tight mb-6">
              Welcome back.
              <br />
              Get paid faster.
            </h1>

            <p className="text-gray-400 text-lg mb-8 max-w-md">
              Create professional invoices, track payments,
              and grow your business effortlessly.
            </p>

            <ul className="space-y-3 text-gray-300">
              <li>✔ Create invoices in seconds</li>
              <li>✔ Track payments easily</li>
              <li>✔ Download PDF instantly</li>
              <li>✔ Manage clients professionally</li>
            </ul>
          </div>

          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} InvoicePro
          </p>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-2xl shadow-xl p-8">

            <h2 className="text-3xl font-bold mb-2">
              Sign in
            </h2>

            <p className="text-gray-400 mb-6">
              Login to your InvoicePro account
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-5 text-sm">
                {error}
              </div>
            )}

            {/* GOOGLE */}
            <div
              id="googleBtn"
              className="mb-5 flex justify-center"
            ></div>

            <div className="text-center text-gray-500 mb-5">
              OR
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit} className="space-y-4">

              <input
                type="email"
                required
                placeholder="Email"
                value={form.email}
                onChange={(e) =>
                  setForm({
                    ...form,
                    email: e.target.value
                  })
                }
                className={inputStyle}
              />

              <input
                type="password"
                required
                placeholder="Password"
                value={form.password}
                onChange={(e) =>
                  setForm({
                    ...form,
                    password: e.target.value
                  })
                }
                className={inputStyle}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-3 rounded-lg font-semibold transition"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

            </form>

            <p className="text-center text-sm mt-6 text-gray-400">
              Don’t have an account?{' '}
              <Link
                to="/signup"
                className="text-yellow-400 hover:text-yellow-300 font-medium"
              >
                Signup
              </Link>
            </p>

          </div>
        </div>

      </div>
    </div>
  );
}