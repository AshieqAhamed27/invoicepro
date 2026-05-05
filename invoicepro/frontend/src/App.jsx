import React, { Suspense, lazy, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation
} from 'react-router-dom';

import { isLoggedIn, getUser } from './utils/auth';
import api from './utils/api';
import { getWhatsAppShareUrl } from './utils/whatsapp';
import { trackPageView } from './utils/analytics';
import ScrollAnimator from './components/ScrollAnimator';

// ✅ Lazy load ALL pages (important)
const Home = lazy(() => import('./pages/Home'));
const Contact = lazy(() => import('./pages/Contact'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const RefundPolicy = lazy(() => import('./pages/RefundPolicy'));
const DigitalDeliveryPolicy = lazy(() => import('./pages/DigitalDeliveryPolicy'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LaunchCenter = lazy(() => import('./pages/LaunchCenter'));
const ClientFinder = lazy(() => import('./pages/ClientFinder'));
const LeadPipeline = lazy(() => import('./pages/LeadPipeline'));
const CreateInvoice = lazy(() => import('./pages/CreateInvoice'));
const InvoiceView = lazy(() => import('./pages/InvoiceView'));
const Payment = lazy(() => import('./pages/Payment'));
const Admin = lazy(() => import('./pages/Admin'));
const PublicInvoice = lazy(() => import('./pages/PublicInvoice'));
const Settings = lazy(() => import('./pages/Settings'));
const Clients = lazy(() => import('./pages/Clients'));
const Recurring = lazy(() => import('./pages/Recurring'));
const NotFound = lazy(() => import('./pages/NotFound'));
const SEOPage = lazy(() => import('./pages/SEOPage'));
const InvoiceGenerator = lazy(() => import('./pages/InvoiceGenerator'));
const HowToCreateInvoiceIndia = lazy(() => import('./pages/blog/HowToCreateInvoiceIndia'));
const GSTInvoiceFormatIndia = lazy(() => import('./pages/blog/GSTInvoiceFormatIndia'));

// Loader
const RouteLoader = () => (
  <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white flex flex-col justify-center items-center">
    <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-3"></div>
    <p className="text-gray-400">Loading...</p>
  </div>
);

const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    trackPageView(`${pathname}${search}`);
  }, [pathname, search]);

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

const supportMessage = 'Hi I am interested in ClientFlow AI';
const appRoutePrefixes = [
  '/admin',
  '/clients',
  '/client-finder',
  '/contact',
  '/create-invoice',
  '/dashboard',
  '/invoice/',
  '/launch',
  '/leads',
  '/login',
  '/payment',
  '/public/invoice',
  '/p/invoice',
  '/recurring',
  '/settings',
  '/signup'
];

const WhatsAppFloatingButton = () => {
  const { pathname } = useLocation();
  const hiddenOnCurrentRoute = appRoutePrefixes.some((prefix) => pathname.startsWith(prefix));

  if (hiddenOnCurrentRoute) return null;

  const supportWhatsAppUrl = getWhatsAppShareUrl(supportMessage, '919080963704');

  return (
    <a
      href={supportWhatsAppUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-40 print:hidden sm:right-5"
      aria-label="Chat with ClientFlow AI on WhatsApp"
    >
      <div className="rounded-full bg-green-500 p-3.5 shadow-lg shadow-black/25 transition hover:scale-110 sm:p-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="white"
          viewBox="0 0 24 24"
          className="h-5 w-5 sm:h-6 sm:w-6"
        >
          <path d="M20.52 3.48A11.87 11.87 0 0012.02 0C5.38 0 .03 5.35.03 11.99c0 2.12.55 4.19 1.6 6.02L0 24l6.2-1.62a11.93 11.93 0 005.82 1.49h.01c6.63 0 11.99-5.35 11.99-11.99 0-3.2-1.25-6.21-3.5-8.4z" />
        </svg>
      </div>
    </a>
  );
};

export default function App() {

  return (
    <BrowserRouter>
      <ScrollToTop />
      <ScrollAnimator />
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
          path="/refund-policy"
          element={
            <Suspense fallback={<RouteLoader />}>
              <RefundPolicy />
            </Suspense>
          }
        />

        <Route
          path="/cancellation-refund-policy"
          element={
            <Suspense fallback={<RouteLoader />}>
              <RefundPolicy />
            </Suspense>
          }
        />

        <Route
          path="/shipping-policy"
          element={
            <Suspense fallback={<RouteLoader />}>
              <DigitalDeliveryPolicy />
            </Suspense>
          }
        />

        <Route
          path="/digital-delivery-policy"
          element={
            <Suspense fallback={<RouteLoader />}>
              <DigitalDeliveryPolicy />
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
          path="/launch"
          element={
            <PrivateRoute>
              <Suspense fallback={<RouteLoader />}>
                <LaunchCenter />
              </Suspense>
            </PrivateRoute>
          }
        />

        <Route
          path="/client-finder"
          element={
            <PrivateRoute>
              <Suspense fallback={<RouteLoader />}>
                <ClientFinder />
              </Suspense>
            </PrivateRoute>
          }
        />

        <Route
          path="/leads"
          element={
            <PrivateRoute>
              <Suspense fallback={<RouteLoader />}>
                <LeadPipeline />
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
        <Route
          path="/invoice-generator"
          element={
            <Suspense fallback={<RouteLoader />}>
              <InvoiceGenerator />
            </Suspense>
          }
        />
        <Route
          path="/blog/how-to-create-invoice-india"
          element={
            <Suspense fallback={<RouteLoader />}>
              <HowToCreateInvoiceIndia />
            </Suspense>
          }
        />
        <Route
          path="/blog/gst-invoice-format-india"
          element={
            <Suspense fallback={<RouteLoader />}>
              <GSTInvoiceFormatIndia />
            </Suspense>
          }
        />
        <Route
          path="/gst-invoice-generator"
          element={
            <Suspense fallback={<RouteLoader />}>
              <SEOPage pageKey="gst-invoice-generator" />
            </Suspense>
          }
        />
        <Route
          path="/online-invoice-maker-india"
          element={
            <Suspense fallback={<RouteLoader />}>
              <SEOPage pageKey="online-invoice-maker-india" />
            </Suspense>
          }
        />
        <Route
          path="/freelance-invoice-software"
          element={
            <Suspense fallback={<RouteLoader />}>
              <SEOPage pageKey="freelance-invoice-software" />
            </Suspense>
          }
        />
        <Route
          path="/payment-reminder-software"
          element={
            <Suspense fallback={<RouteLoader />}>
              <SEOPage pageKey="payment-reminder-software" />
            </Suspense>
          }
        />
        <Route
          path="/razorpay-invoice-payment-tracking"
          element={
            <Suspense fallback={<RouteLoader />}>
              <SEOPage pageKey="razorpay-invoice-payment-tracking" />
            </Suspense>
          }
        />

      </Routes>
      {/* ✅ WhatsApp Floating Button */}
      <WhatsAppFloatingButton />
    </BrowserRouter>
  );
}
