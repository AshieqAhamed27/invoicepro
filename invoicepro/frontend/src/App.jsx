import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isLoggedIn } from './utils/auth';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import CreateInvoice from './pages/CreateInvoice';
import InvoiceView from './pages/InvoiceView';
import Payment from './pages/Payment'; // ✅ FIXED

const PrivateRoute = ({ children }) => {
  return isLoggedIn() ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  return !isLoggedIn() ? children : <Navigate to="/dashboard" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />

        <Route path="/signup" element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        } />

        <Route path="/dashboard" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />

        <Route path="/create-invoice" element={
          <PrivateRoute>
            <CreateInvoice />
          </PrivateRoute>
        } />

        <Route path="/invoice/:id" element={
          <PrivateRoute>
            <InvoiceView />
          </PrivateRoute>
        } />

        {/* ✅ ADD PAYMENT ROUTE */}
        <Route path="/payment" element={
          <PrivateRoute>
            <Payment />
          </PrivateRoute>
        } />

      </Routes>
    </BrowserRouter>
  );
}