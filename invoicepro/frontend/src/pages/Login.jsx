import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { setAuth } from '../utils/auth';
import { jwtDecode } from "jwt-decode";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 🔥 GOOGLE LOGIN HANDLER
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
      alert("Google login failed");
    }
  };

  // 🔥 LOAD GOOGLE BUTTON
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

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;

      script.onload = resolve;

      document.body.appendChild(script);
    });
  };

  loadGoogleScript().then(() => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: "251597134759-nfkq6fmlnvsgn8lniia3colbfer62gum.apps.googleusercontent.com",
        callback: handleGoogleLogin,
      });

      window.google.accounts.id.renderButton(
        document.getElementById("googleBtn"),
        {
          theme: "outline",
          size: "large",
          width: 300,
        }
      );
    } else {
      console.log("❌ Google not loaded");
    }
  });
}, []);

  // 🔥 NORMAL LOGIN
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
        (err.response && err.response.data && err.response.data.message) ||
        'Login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-50 flex">

      {/* LEFT PANEL */}
      <div className="hidden lg:flex w-1/2 bg-ink-900 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-sm flex items-center justify-center font-bold text-ink-900">
            IP
          </div>
          <span className="text-white text-2xl font-bold">
            InvoicePro
          </span>
        </div>

        <div>
          <p className="text-ink-200 text-xl mb-4">
            Professional invoices that get you paid faster.
          </p>

          <ul className="text-ink-300 text-sm space-y-2">
            <li>✔ Create invoices in seconds</li>
            <li>✔ Track payments</li>
            <li>✔ Download PDF instantly</li>
          </ul>
        </div>

        <p className="text-ink-600 text-sm">
          © InvoicePro
        </p>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">

          <h1 className="text-2xl font-bold mb-2">
            Welcome back
          </h1>

          <p className="text-gray-500 mb-6">
            Login to your account
          </p>

          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          {/* 🔥 GOOGLE BUTTON (WORKING) */}
          <div id="googleBtn" className="mb-4 flex justify-center"></div>

          <div className="text-center text-gray-400 mb-4">OR</div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-4">

            <input
              type="email"
              required
              placeholder="Email"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
              className="w-full border p-3 rounded"
            />

            <input
              type="password"
              required
              placeholder="Password"
              value={form.password}
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
              className="w-full border p-3 rounded"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-3 rounded"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

          </form>

          <p className="text-center text-sm mt-4">
            Don’t have an account?{' '}
            <Link to="/signup" className="text-blue-600">
              Signup
            </Link>
          </p>

        </div>
      </div>

    </div>
  );
}