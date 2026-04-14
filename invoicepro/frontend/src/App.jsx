import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import {
  isLoggedIn
} from './utils/auth';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import CreateInvoice from './pages/CreateInvoice';
import InvoiceView from './pages/InvoiceView';
import Payment from './pages/Payment';
import Admin from './pages/Admin';
import Home from './pages/Home';
import PublicInvoice from './pages/PublicInvoice';
import Settings from './pages/Settings';

const PrivateRoute = ({
  children
}) => {
  return isLoggedIn()
    ? children
    : (
      <Navigate
        to="/login"
        replace
      />
    );
};

const PublicRoute = ({
  children
}) => {
  return !isLoggedIn()
    ? children
    : (
      <Navigate
        to="/dashboard"
        replace
      />
    );
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* HOME */}
        <Route
          path="/"
          element={<Home />}
        />

        {/* PUBLIC INVOICE */}
        <Route
          path="/public/invoice/:id"
          element={
            <PublicInvoice />
          }
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

        {/* PRIVATE */}
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

        {/* ADMIN */}
        <Route
          path="/admin"
          element={<Admin />}
        />

      </Routes>
    </BrowserRouter>
  );
}