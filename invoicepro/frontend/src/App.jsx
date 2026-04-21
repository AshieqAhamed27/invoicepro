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

import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const CreateInvoice = lazy(() => import('./pages/CreateInvoice'));
const InvoiceView = lazy(() => import('./pages/InvoiceView'));
const Payment = lazy(() => import('./pages/Payment'));
const Admin = lazy(() => import('./pages/Admin'));
const PublicInvoice = lazy(() => import('./pages/PublicInvoice'));
const Settings = lazy(() => import('./pages/Settings'));
const Clients = lazy(() => import('./pages/Clients'));

const RouteLoader = () => (
  <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white flex flex-col justify-center items-center">
    <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-3"></div>
    <p className="text-gray-400">Verifying session...</p>
  </div>
);

const PrivateRoute = ({ children }) => {
  const location = useLocation();
  const loggedIn = isLoggedIn();
  const [status, setStatus] = useState(() => (loggedIn ? 'checking' : 'unauthenticated'));

  useEffect(() => {
    let active = true;

    if (!loggedIn) {
      setStatus('unauthenticated');
      return undefined;
    }

    setStatus('checking');

    api.get('/auth/me')
      .then((res) => {
        if (!active) return;

        const currentUser = getUser() || {};
        localStorage.setItem('user', JSON.stringify({ ...currentUser, ...(res.data.user || {}) }));
        setStatus('authenticated');
      })
      .catch(() => {
        if (active) {
          setStatus('unauthenticated');
        }
      });

    return () => {
      active = false;
    };
  }, [loggedIn, location.pathname]);

  if (!loggedIn || status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (status === 'checking') {
    return <RouteLoader />;
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
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route
            path="/public/invoice/:id"
            element={<PublicInvoice />}
          />
          <Route
            path="/p/invoice/:id"
            element={<PublicInvoice />}
          />

          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          <Route
            path="/signup"
            element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/create-invoice"
            element={
              <PrivateRoute>
                <CreateInvoice />
              </PrivateRoute>
            }
          />

          <Route
            path="/invoice/:id"
            element={
              <PrivateRoute>
                <InvoiceView />
              </PrivateRoute>
            }
          />

          <Route
            path="/payment"
            element={
              <PrivateRoute>
                <Payment />
              </PrivateRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            }
          />

          <Route
            path="/clients"
            element={
              <PrivateRoute>
                <Clients />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin"
            element={
              isAdmin() ? (
                <Admin />
              ) : (
                <Navigate to="/dashboard" />
              )
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
