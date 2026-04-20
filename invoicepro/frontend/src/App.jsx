import React, { Suspense, lazy } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import { isLoggedIn, getUser } from './utils/auth';

// Normal pages
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';

// Lazy pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CreateInvoice = lazy(() => import('./pages/CreateInvoice'));
const InvoiceView = lazy(() => import('./pages/InvoiceView'));
const Payment = lazy(() => import('./pages/Payment'));
const Admin = lazy(() => import('./pages/Admin'));
const PublicInvoice = lazy(() => import('./pages/PublicInvoice'));
const Settings = lazy(() => import('./pages/Settings'));
const Clients = lazy(() => import('./pages/Clients'));

// ==========================
// PROTECTED ROUTE
// ==========================
const PrivateRoute = ({ children }) => {
  return isLoggedIn()
    ? children
    : <Navigate to="/login" replace />;
};

// ==========================
// PUBLIC ROUTE
// ==========================
const PublicRoute = ({ children }) => {
  return !isLoggedIn()
    ? children
    : <Navigate to="/dashboard" replace />;
};

// ==========================
// ADMIN CHECK (BASIC)
// ==========================
const isAdmin = () => {
  const user = getUser();
  return user?.role === 'admin';
};

export default function App() {
  return (
    <BrowserRouter>

      <Suspense
        fallback={
          <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white flex flex-col justify-center items-center">
            <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        }
      >

        <Routes>

          {/* HOME */}
          <Route path="/" element={<Home />} />

          {/* PUBLIC INVOICE */}
          <Route
            path="/public/invoice/:id"
            element={<PublicInvoice />}
          />
          <Route
            path="/p/invoice/:id"
            element={<PublicInvoice />}
          />

          {/* AUTH */}
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

          {/* PRIVATE ROUTES */}
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

          {/* 🔒 ADMIN ROUTE (SECURED) */}
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