import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AuthGuard from '../features/auth/components/AuthGuard';
import LoginPage from '../features/auth/pages/LoginPage';
import VerifyOtpPage from '../features/auth/pages/VerifyOtpPage';
import InvoicesPage from '../features/portal/pages/InvoicesPage';
import OverviewPage from '../features/portal/pages/OverviewPage';
import PortalLayout from '../features/portal/pages/PortalLayout';
import ProfilePage from '../features/portal/pages/ProfilePage';
import WifiPage from '../features/portal/pages/WifiPage';
import AddonsPage from '../features/portal/pages/AddonsPage';

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <AuthGuard>
              <PortalLayout />
            </AuthGuard>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="wifi" element={<WifiPage />} />
          <Route path="addons" element={<AddonsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
