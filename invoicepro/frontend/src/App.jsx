import { AnimatePresence } from 'framer-motion';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import CreateInvoicePage from './pages/CreateInvoicePage';
import DashboardPage from './pages/DashboardPage';
import LandingPage from './pages/LandingPage';
import UpgradePage from './pages/UpgradePage';
import WorkspacePage from './pages/WorkspacePage';

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/dashboard"
          element={
            <DashboardLayout>
              <DashboardPage />
            </DashboardLayout>
          }
        />
        <Route
          path="/create-invoice"
          element={
            <DashboardLayout>
              <CreateInvoicePage />
            </DashboardLayout>
          }
        />
        <Route
          path="/invoices"
          element={
            <DashboardLayout>
              <WorkspacePage type="invoices" />
            </DashboardLayout>
          }
        />
        <Route
          path="/clients"
          element={
            <DashboardLayout>
              <WorkspacePage type="clients" />
            </DashboardLayout>
          }
        />
        <Route
          path="/payments"
          element={
            <DashboardLayout>
              <WorkspacePage type="payments" />
            </DashboardLayout>
          }
        />
        <Route
          path="/payment"
          element={
            <DashboardLayout>
              <UpgradePage />
            </DashboardLayout>
          }
        />
        <Route
          path="/upgrade"
          element={
            <DashboardLayout>
              <UpgradePage />
            </DashboardLayout>
          }
        />
        <Route
          path="/settings"
          element={
            <DashboardLayout>
              <WorkspacePage type="settings" />
            </DashboardLayout>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
