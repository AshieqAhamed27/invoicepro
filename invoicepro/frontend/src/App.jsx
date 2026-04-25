import React, { Suspense, lazy, useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation
} from 'react-router-dom';

import { isLoggedIn, getUser } from './utils/auth';
import api from './utils/api';
import InvoiceGenerator from './pages/InvoiceGenerator';
import HowToCreateInvoiceIndia from './pages/blog/HowToCreateInvoiceIndia';

// ✅ Lazy load ALL pages (important)
const Home = lazy(() => import('./pages/Home'));
const Contact = lazy(() => import('./pages/Contact'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CreateInvoice = lazy(() => import('./pages/CreateInvoice'));
const InvoiceView = lazy(() => import('./pages/InvoiceView'));
const Payment = lazy(() => import('./pages/Payment'));
const Admin = lazy(() => import('./pages/Admin'));
const PublicInvoice = lazy(() => import('./pages/PublicInvoice'));
const Settings = lazy(() => import('./pages/Settings'));
const Clients = lazy(() => import('./pages/Clients'));
const Recurring = lazy(() => import('./pages/Recurring'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Loader
const RouteLoader = () => (
  <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white flex flex-col justify-center items-center">
    <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-3"></div>
    <p className="text-gray-400">Loading...</p>
  </div>
);

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// ✅ Optimized PrivateRoute (NO blocking)
const PrivateRoute = ({ children }) => {
  const location = useLocation();
  const loggedIn = isLoggedIn();

  useEffect(() => {
    // background check (non-blocking)
    if (loggedIn) {
      api.get('/auth/me')
        .then((res) => {
          const currentUser = getUser() || {};
          localStorage.setItem(
            'user',
            JSON.stringify({ ...currentUser, ...(res.data.user || {}) })
          );
        })
        .catch(() => {
          // silently fail
        });
    }
  }, [loggedIn]);

  if (!loggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  return !isLoggedIn()
    ? children
    : <Navigate to="/dashboard" replace />;
};

const isAdmin = () => {
  const user = getUser();
  return user?.role === 'admin';
};

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>

        {/* Public */}
        <Route
          path="/"
          element={
            <Suspense fallback={<RouteLoader />}>
              <Home />
            </Suspense>
          }
        />

        <Route
          path="/contact"
          element={
            <Suspense fallback={<RouteLoader />}>
              <Contact />
            </Suspense>
          }
        />

        <Route
          path="/privacy"
          element={
            <Suspense fallback={<RouteLoader />}>
              <Privacy />
            </Suspense>
          }
        />

        <Route
          path="/terms"
          element={
            <Suspense fallback={<RouteLoader />}>
              <Terms />
            </Suspense>
          }
        />

        <Route
          path="/public/invoice/:id"
          element={
            <Suspense fallback={<RouteLoader />}>
              <PublicInvoice />
            </Suspense>
          }
        />

        <Route
          path="/p/invoice/:id"
          element={
            <Suspense fallback={<RouteLoader />}>
              <PublicInvoice />
            </Suspense>
          }
        />

        {/* Auth */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Suspense fallback={<RouteLoader />}>
                <Login />
              </Suspense>
            </PublicRoute>
          }
        />

        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Suspense fallback={<RouteLoader />}>
                <Signup />
              </Suspense>
            </PublicRoute>
          }
        />

        {/* Protected */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Suspense fallback={<RouteLoader />}>
                <Dashboard />
              </Suspense>
            </PrivateRoute>
          }
        />

        <Route
          path="/create-invoice"
          element={
            <PrivateRoute>
              <Suspense fallback={<RouteLoader />}>
                <CreateInvoice />
              </Suspense>
            </PrivateRoute>
          }
        />

        <Route
          path="/invoice/:id"
          element={
            <PrivateRoute>
              <Suspense fallback={<RouteLoader />}>
                <InvoiceView />
              </Suspense>
            </PrivateRoute>
          }
        />

        <Route
          path="/payment"
          element={
            <PrivateRoute>
              <Suspense fallback={<RouteLoader />}>
                <Payment />
              </Suspense>
            </PrivateRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Suspense fallback={<RouteLoader />}>
                <Settings />
              </Suspense>
            </PrivateRoute>
          }
        />

        <Route
          path="/clients"
          element={
            <PrivateRoute>
              <Suspense fallback={<RouteLoader />}>
                <Clients />
              </Suspense>
            </PrivateRoute>
          }
        />

        <Route
          path="/recurring"
          element={
            <PrivateRoute>
              <Suspense fallback={<RouteLoader />}>
                <Recurring />
              </Suspense>
            </PrivateRoute>
          }
        />

        <Route
          path="/admin"
          element={
            isAdmin() ? (
              <Suspense fallback={<RouteLoader />}>
                <Admin />
              </Suspense>
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />

        <Route
          path="*"
          element={
            <Suspense fallback={<RouteLoader />}>
              <NotFound />
            </Suspense>
          }
        />
        <Route path="/invoice-generator" element={<InvoiceGenerator />} />
        <Route path="/blog/how-to-create-invoice-india" element={<HowToCreateInvoiceIndia />} />
      </Routes>
    </BrowserRouter>
  );
}
