import React, { Suspense, lazy, useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation
} from 'react-router-dom';

import { isLoggedIn, getUser, hasProAccess } from './utils/auth';
import api from './utils/api';
import { trackPageView } from './utils/analytics';
import ScrollAnimator from './components/ScrollAnimator';
import ProFeatureGate from './components/ProFeatureGate';
import PlanReminderAgent from './components/PlanReminderAgent';
import DeviceReminderAgent from './components/DeviceReminderAgent';
import SupportChatWidget from './components/SupportChatWidget';
import LiveFeedback from './components/LiveFeedback';
import UserOnboardingModal from './components/UserOnboardingModal';
import LoadingScreen from './components/LoadingScreen';

// ✅ Lazy load ALL pages (important)
const Home = lazy(() => import('./pages/HomeClear'));
const Contact = lazy(() => import('./pages/Contact'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const LinkedInPortfolio = lazy(() => import('./pages/LinkedInPortfolio'));
const AgencyServices = lazy(() => import('./pages/AgencyServices'));
const FeatureDetail = lazy(() => import('./pages/FeatureDetail'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Security = lazy(() => import('./pages/Security'));
const Terms = lazy(() => import('./pages/Terms'));
const RefundPolicy = lazy(() => import('./pages/RefundPolicy'));
const DigitalDeliveryPolicy = lazy(() => import('./pages/DigitalDeliveryPolicy'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const ClientFlow = lazy(() => import('./pages/ClientFlow'));
const GrowthPlan = lazy(() => import('./pages/GrowthPlan'));
const ClientCoach = lazy(() => import('./pages/ClientCoach'));
const LaunchCenter = lazy(() => import('./pages/LaunchCenter'));
const ClientFinder = lazy(() => import('./pages/ClientFinder'));
const SalesAgent = lazy(() => import('./pages/SalesAgent'));
const OutboundAutopilot = lazy(() => import('./pages/OutboundAutopilot'));
const BusinessAutopilot = lazy(() => import('./pages/BusinessAutopilot'));
const ProfitTracker = lazy(() => import('./pages/ProfitTracker'));
const ProposalWriter = lazy(() => import('./pages/ProposalWriter'));
const TeamWorkspace = lazy(() => import('./pages/TeamWorkspace'));
const TeamInvite = lazy(() => import('./pages/TeamInvite'));
const OrganizationWorkspace = lazy(() => import('./pages/OrganizationWorkspace'));
const LeadPipeline = lazy(() => import('./pages/LeadPipeline'));
const CreateInvoice = lazy(() => import('./pages/CreateInvoice'));
const InvoiceView = lazy(() => import('./pages/InvoiceView'));
const Payment = lazy(() => import('./pages/Payment'));
const PlanCheckout = lazy(() => import('./pages/PlanCheckout'));
const PaymentsOverview = lazy(() => import('./pages/PaymentsOverview'));
const Admin = lazy(() => import('./pages/Admin'));
const PublicInvoice = lazy(() => import('./pages/PublicInvoice'));
const FreelancerProfile = lazy(() => import('./pages/FreelancerProfile'));
const Settings = lazy(() => import('./pages/Settings'));
const Clients = lazy(() => import('./pages/Clients'));
const CloudDocuments = lazy(() => import('./pages/CloudDocuments'));
const Recurring = lazy(() => import('./pages/Recurring'));
const NotFound = lazy(() => import('./pages/NotFound'));
const SEOPage = lazy(() => import('./pages/SEOPage'));
const VerticalLanding = lazy(() => import('./pages/VerticalLanding'));
const WorkflowMode = lazy(() => import('./pages/WorkflowMode'));
const InvoiceGenerator = lazy(() => import('./pages/InvoiceGenerator'));
const HowToCreateInvoiceIndia = lazy(() => import('./pages/blog/HowToCreateInvoiceIndia'));
const GSTInvoiceFormatIndia = lazy(() => import('./pages/blog/GSTInvoiceFormatIndia'));
const BlogIndex = lazy(() => import('./pages/blog/BlogIndex'));
const GSTCompliance = lazy(() => import('./pages/GSTCompliance'));
const Changelog = lazy(() => import('./pages/Changelog'));
const HowToUse = lazy(() => import('./pages/HowToUse'));

// Ultra-Premium Animated Page Loader
const RouteLoader = () => (
  <LoadingScreen
    fullScreen={true}
    message="Initializing workspace"
    subtext="Multi-currency & GST Invoices · UPI & Card Payments"
  />
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
    : <Navigate to="/client-flow" replace />;
};

const isAdmin = () => {
  const user = getUser();
  return user?.role === 'admin';
};

const AdminRoute = ({ children }) => {
  const location = useLocation();
  const loggedIn = isLoggedIn();
  const [adminCheck, setAdminCheck] = useState(() => (
    loggedIn && isAdmin() ? 'allowed' : 'checking'
  ));

  useEffect(() => {
    let active = true;

    if (!loggedIn) {
      setAdminCheck('guest');
      return () => {
        active = false;
      };
    }

    const currentUser = getUser() || {};
    setAdminCheck(currentUser.role === 'admin' ? 'allowed' : 'checking');

    api.get('/auth/me')
      .then((res) => {
        if (!active) return;

        const nextUser = { ...currentUser, ...(res.data.user || {}) };
        localStorage.setItem('user', JSON.stringify(nextUser));
        setAdminCheck(nextUser.role === 'admin' ? 'allowed' : 'denied');
      })
      .catch(() => {
        if (!active) return;
        setAdminCheck(currentUser.role === 'admin' ? 'allowed' : 'denied');
      });

    return () => {
      active = false;
    };
  }, [loggedIn]);

  if (!loggedIn || adminCheck === 'guest') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (adminCheck === 'checking') {
    return <RouteLoader />;
  }

  if (adminCheck !== 'allowed') {
    return <Navigate to="/client-flow" replace />;
  }

  return children;
};

const ProRoute = ({ children, title }) => {
  const user = getUser();

  if (!hasProAccess(user)) {
    return <ProFeatureGate title={title} />;
  }

  return children;
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
          path="/blog"
          element={
            <Suspense fallback={<RouteLoader />}>
              <BlogIndex />
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
          path="/portfolio"
          element={
            <Suspense fallback={<RouteLoader />}>
              <Portfolio />
            </Suspense>
          }
        />

        <Route
          path="/linkedin"
          element={
            <Suspense fallback={<RouteLoader />}>
              <LinkedInPortfolio />
            </Suspense>
          }
        />

        <Route
          path="/agency"
          element={
            <Suspense fallback={<RouteLoader />}>
              <Navigate to="/payments" replace />
            </Suspense>
          }
        />

        <Route
          path="/enterprise"
          element={
            <Suspense fallback={<RouteLoader />}>
              <Navigate to="/client-flow" replace />
            </Suspense>
          }
        />

        <Route
          path="/devops-delivery"
          element={
            <Suspense fallback={<RouteLoader />}>
              <Navigate to="/client-flow" replace />
            </Suspense>
          }
        />

        <Route
          path="/freelance-fit-advisor"
          element={
            <Suspense fallback={<RouteLoader />}>
              <Navigate to="/client-flow" replace />
            </Suspense>
          }
        />

        <Route
          path="/features/:featureKey"
          element={
            <Suspense fallback={<RouteLoader />}>
              <FeatureDetail />
            </Suspense>
          }
        />

        <Route
          path="/work/:featureKey"
          element={
            <Suspense fallback={<RouteLoader />}>
              <FeatureDetail />
            </Suspense>
          }
        />

        <Route
          path="/linux-services"
          element={
            <Suspense fallback={<RouteLoader />}>
              <Navigate to="/client-flow" replace />
            </Suspense>
          }
        />

        <Route
          path="/clientflow-ai-agency"
          element={
            <Suspense fallback={<RouteLoader />}>
              <AgencyServices />
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
          path="/security"
          element={
            <Suspense fallback={<RouteLoader />}>
              <Security />
            </Suspense>
          }
        />

        <Route
          path="/gst-compliance"
          element={
            <Suspense fallback={<RouteLoader />}>
              <GSTCompliance />
            </Suspense>
          }
        />

        <Route
          path="/changelog"
          element={
            <Suspense fallback={<RouteLoader />}>
              <Changelog />
            </Suspense>
          }
        />

        <Route
          path="/how-to-use"
          element={
            <Suspense fallback={<RouteLoader />}>
              <HowToUse />
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

        <Route
          path="/f/:id"
          element={
            <Suspense fallback={<RouteLoader />}>
              <FreelancerProfile />
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
                <Navigate to="/client-flow" replace />
              </Suspense>
            </PrivateRoute>
          }
        />

        <Route
          path="/client-flow"
          element={
            <PrivateRoute>
              <Suspense fallback={<RouteLoader />}>
                <ClientFlow />
              </Suspense>
            </PrivateRoute>
          }
        />

        <Route
          path="/money-gps"
          element={
            <PrivateRoute>
              <Suspense fallback={<RouteLoader />}>
                <Navigate to="/client-flow" replace />
              </Suspense>
            </PrivateRoute>
          }
        />

        <Route
          path="/growth-plan"
          element={
            <PrivateRoute>
              <ProRoute title="Freelancer Growth Plan unlocks after Pro payment">
                <Suspense fallback={<RouteLoader />}>
                  <GrowthPlan />
                </Suspense>
              </ProRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/ai-coach"
          element={
            <PrivateRoute>
              <ProRoute title="AI Client Coach unlocks after Pro payment">
                <Suspense fallback={<RouteLoader />}>
                  <ClientCoach />
                </Suspense>
              </ProRoute>
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
              <ProRoute title="AI Client Finder unlocks after Pro payment">
                <Suspense fallback={<RouteLoader />}>
                  <ClientFinder />
                </Suspense>
              </ProRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/sales-agent"
          element={
            <PrivateRoute>
              <ProRoute title="AI Sales Agent unlocks after Pro payment">
                <Suspense fallback={<RouteLoader />}>
                  <SalesAgent />
                </Suspense>
              </ProRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/outbound-autopilot"
          element={
            <PrivateRoute>
              <ProRoute title="AI Outbound Autopilot unlocks after Pro payment">
                <Suspense fallback={<RouteLoader />}>
                  <OutboundAutopilot />
                </Suspense>
              </ProRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/business-autopilot"
          element={
            <PrivateRoute>
              <ProRoute title="Business Autopilot unlocks after Pro payment">
                <Suspense fallback={<RouteLoader />}>
                  <BusinessAutopilot />
                </Suspense>
              </ProRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/profit-tracker"
          element={
            <PrivateRoute>
              <ProRoute title="Profit Tracker unlocks after Pro payment">
                <Suspense fallback={<RouteLoader />}>
                  <ProfitTracker />
                </Suspense>
              </ProRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/proposal-writer"
          element={
            <PrivateRoute>
              <ProRoute title="AI Proposal Writer unlocks after Pro payment">
                <Suspense fallback={<RouteLoader />}>
                  <ProposalWriter />
                </Suspense>
              </ProRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/deal-room"
          element={
            <PrivateRoute>
              <ProRoute title="AI Deal Closure Room unlocks after Pro payment">
                <Suspense fallback={<RouteLoader />}>
                  <Navigate to="/proposal-writer" replace />
                </Suspense>
              </ProRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/client-workroom"
          element={
            <PrivateRoute>
              <Suspense fallback={<RouteLoader />}>
                <TeamWorkspace />
              </Suspense>
            </PrivateRoute>
          }
        />

        <Route
          path="/team-workspace"
          element={
            <PrivateRoute>
              <Suspense fallback={<RouteLoader />}>
                <TeamWorkspace />
              </Suspense>
            </PrivateRoute>
          }
        />

        <Route
          path="/organization"
          element={
            <PrivateRoute>
              <Suspense fallback={<RouteLoader />}>
                <OrganizationWorkspace />
              </Suspense>
            </PrivateRoute>
          }
        />

        <Route
          path="/team-invite/:token"
          element={
            <Suspense fallback={<RouteLoader />}>
              <TeamInvite />
            </Suspense>
          }
        />

        <Route
          path="/leads"
          element={
            <PrivateRoute>
              <ProRoute title="Lead Pipeline unlocks after Pro payment">
                <Suspense fallback={<RouteLoader />}>
                  <LeadPipeline />
                </Suspense>
              </ProRoute>
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
          path="/checkout/:planId"
          element={
            <Suspense fallback={<RouteLoader />}>
              <PlanCheckout />
            </Suspense>
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
          path="/payments/freelance-workflow"
          element={
            <PrivateRoute>
              <Suspense fallback={<RouteLoader />}>
                <Payment />
              </Suspense>
            </PrivateRoute>
          }
        />

        <Route
          path="/payments/agency-setup"
          element={
            <Suspense fallback={<RouteLoader />}>
              <Navigate to="/payments" replace />
            </Suspense>
          }
        />

        <Route
          path="/payments/enterprise"
          element={
            <Suspense fallback={<RouteLoader />}>
              <Navigate to="/payments" replace />
            </Suspense>
          }
        />

        <Route
          path="/payments/automation-setup"
          element={
            <Suspense fallback={<RouteLoader />}>
              <Navigate to="/payments" replace />
            </Suspense>
          }
        />

        <Route
          path="/payments"
          element={
            <Suspense fallback={<RouteLoader />}>
              <PaymentsOverview />
            </Suspense>
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
          path="/cloud-documents"
          element={
            <PrivateRoute>
              <Suspense fallback={<RouteLoader />}>
                <CloudDocuments />
              </Suspense>
            </PrivateRoute>
          }
        />

        <Route
          path="/recurring"
          element={
            <PrivateRoute>
              <ProRoute title="Recurring revenue tools unlock after Pro payment">
                <Suspense fallback={<RouteLoader />}>
                  <Recurring />
                </Suspense>
              </ProRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Suspense fallback={<RouteLoader />}>
                <Admin />
              </Suspense>
            </AdminRoute>
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

        <Route
          path="/freelancers"
          element={
            <Suspense fallback={<RouteLoader />}>
              <VerticalLanding pageKey="freelancers" />
            </Suspense>
          }
        />
        <Route
          path="/workflows/freelancers"
          element={
            <Suspense fallback={<RouteLoader />}>
              <WorkflowMode modeKey="freelancers" />
            </Suspense>
          }
        />
        <Route
          path="/developers"
          element={
            <Suspense fallback={<RouteLoader />}>
              <VerticalLanding pageKey="developers" />
            </Suspense>
          }
        />
        <Route
          path="/workflows/developers"
          element={
            <Suspense fallback={<RouteLoader />}>
              <WorkflowMode modeKey="developers" />
            </Suspense>
          }
        />
        <Route
          path="/designers"
          element={
            <Suspense fallback={<RouteLoader />}>
              <VerticalLanding pageKey="designers" />
            </Suspense>
          }
        />
        <Route
          path="/workflows/designers"
          element={
            <Suspense fallback={<RouteLoader />}>
              <WorkflowMode modeKey="designers" />
            </Suspense>
          }
        />
        <Route
          path="/agencies"
          element={
            <Suspense fallback={<RouteLoader />}>
              <VerticalLanding pageKey="agencies" />
            </Suspense>
          }
        />
        <Route
          path="/workflows/agencies"
          element={
            <Suspense fallback={<RouteLoader />}>
              <WorkflowMode modeKey="agencies" />
            </Suspense>
          }
        />
        <Route
          path="/consultants"
          element={
            <Suspense fallback={<RouteLoader />}>
              <VerticalLanding pageKey="consultants" />
            </Suspense>
          }
        />
        <Route
          path="/workflows/consultants"
          element={
            <Suspense fallback={<RouteLoader />}>
              <WorkflowMode modeKey="consultants" />
            </Suspense>
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

      </Routes>
      <DeviceReminderAgent />
      <PlanReminderAgent />
      <SupportChatWidget />
      <LiveFeedback />
      <UserOnboardingModal />
    </BrowserRouter>
  );
}
