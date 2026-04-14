import React, {
  Suspense,
  lazy
} from 'react';

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import {
  isLoggedIn
} from './utils/auth';

// Normal pages
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';

// Lazy loaded pages
const Dashboard = lazy(() =>
  import('./pages/Dashboard')
);

const CreateInvoice = lazy(() =>
  import(
    './pages/CreateInvoice'
  )
);

const InvoiceView = lazy(() =>
  import(
    './pages/InvoiceView'
  )
);

const Payment = lazy(() =>
  import('./pages/Payment')
);

const Admin = lazy(() =>
  import('./pages/Admin')
);

const PublicInvoice = lazy(
  () =>
    import(
      './pages/PublicInvoice'
    )
);

const Settings = lazy(() =>
  import('./pages/Settings')
);

// Protected route
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

// Public route
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
      <Suspense
        fallback={
          <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white flex justify-center items-center text-lg">
            Loading...
          </div>
        }
      >
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
      </Suspense>
    </BrowserRouter>
  );
}