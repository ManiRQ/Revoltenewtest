import { Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import { WorkspaceLayout } from "./components/WorkspaceLayout";
import { AppLoading } from "./components/AppLoading";
import { ErrorState } from "./components/StatePanel";
import { useAuth } from "./lib/auth-context";
import { AgentsPage } from "./pages/AgentsPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { CustomersPage } from "./pages/CustomersPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SetupPage } from "./pages/SetupPage";
import { TicketCreatePage } from "./pages/TicketCreatePage";
import { TicketDetailPage } from "./pages/TicketDetailPage";
import { TicketsPage } from "./pages/TicketsPage";

function AuthBootstrapState() {
  const { error, refresh } = useAuth();

  if (error) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }
  return <AppLoading />;
}

function PublicGate() {
  const { setupComplete, session, loading } = useAuth();
  const location = useLocation();

  if (loading || setupComplete === null) return <AuthBootstrapState />;
  if (!setupComplete) {
    return location.pathname === "/setup" ? (
      <Outlet />
    ) : (
      <Navigate to="/setup" replace />
    );
  }
  if (location.pathname === "/setup") return <Navigate to="/login" replace />;
  if (session) {
    return (
      <Navigate
        to={session.mustChangePassword ? "/change-password" : "/dashboard"}
        replace
      />
    );
  }
  return <Outlet />;
}

function ProtectedGate() {
  const { session, setupComplete, loading } = useAuth();
  const location = useLocation();

  if (loading || setupComplete === null) return <AuthBootstrapState />;
  if (!setupComplete) return <Navigate to="/setup" replace />;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  if (session.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }
  return <Outlet />;
}

function AppWorkspace() {
  return (
    <WorkspaceLayout>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/tickets/new" element={<TicketCreatePage />} />
        <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </WorkspaceLayout>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<PublicGate />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/setup" element={<SetupPage />} />
      </Route>
      <Route element={<ProtectedGate />}>
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/*" element={<AppWorkspace />} />
      </Route>
    </Routes>
  );
}
