import '@/styles/App.css'
import '@/styles/index.css';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ModalProvider } from '@/context/ModalContext';
import LabtechDashboard from '@/pages/labtech/DashboardPage';
import Layout from '@/layout/Layout';
import Ticket from '@/pages/tickets/TicketsPage';
import Notification from '@/pages/notifications/NotificationPage';
import UserDetails from '@/pages/sysad/UserDetailsPage';
import Login from '@/pages/Login';
import SysAdDash from '@/pages/sysad/UserPage';
import RoomPage from '@/pages/sysad/RoomPage';
import ScheduleImportPage from '@/pages/sysad/ScheduleImportPage';
import MaintenancePage from '@/pages/sysad/MaintenancePage';
import InventoryPage from '@/pages/labtech/InventoryPage';
import InventoryItemInfo from '@/pages/labtech/InventoryItemInfoPage';
import Room from '@/pages/labtech/RoomPage';
import RoomQRPrintPage from '@/pages/labtech/RoomQRPrintPage';
import Forms from '@/pages/labtech/FormsPage';
import LabheadDashboard from '@/pages/labhead/DashboardPage';
import FacultyScheduling from '@/pages/faculty/SchedulingPage';
import SecretaryScheduling from '@/pages/secretary/SchedulingPage';
import StudentSession from '@/pages/student/SessionPage';
import StudentPCView from '@/pages/student/PCViewPage';
import StudentRoomView from '@/pages/student/RoomViewPage';
import LabTechOverview from '@/pages/labhead/LabTechOverviewPage';
import LabheadScheduling from '@/pages/labhead/SchedulingPage';
import type { JSX } from 'react';
import { normalizeUserRole, ROLES } from '@/types/user';
import InventoryMobile from '@/pages/labtech/InventoryMobile';
import InventoryAuditPage from '@/pages/labtech/InventoryAuditPage';
import Borrowing from '@/pages/labtech/BorrowingPage';
import Reports from '@/pages/labtech/ReportsPage';
import { useIsMobile } from '@/hooks/useIsMobile';
import StudentPublicLanding from '@/pages/public/StudentPublicLanding';
import StudentDesktopPlaceholder from '@/pages/public/StudentDesktopPlaceholder';

// Public landing gate: mobile visitors see the student landing page,
// desktop visitors are redirected to the existing /login UX.
const PublicLandingGate = () => {
  const isMobile = useIsMobile();
  if (isMobile) return <StudentPublicLanding />;
  return <Navigate to="/login" replace />;
};

// 🔒 Protects routes based on auth + role
const ProtectedRoute = ({ children, roles }: { children: JSX.Element, roles: string[] }) => {
  const { isAuthenticated, userRole, loading } = useAuth();
  const location = useLocation();
  const normalizedRole = normalizeUserRole(userRole);

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!normalizedRole || !roles.includes(normalizedRole)) return <Navigate to="/unauthorized" replace />;

  return children;
};

// Unauthenticated fallback: send users to `/` so the PublicLandingGate can
// route mobile visitors to the public landing page and desktop visitors to
// /login. The original path is preserved in `state.from` so Login can bounce
// the user back after they sign in.
const LoginRedirect = () => {
  const location = useLocation();
  return <Navigate to="/" replace state={{ from: location }} />;
};

// 🚪 Handles logout redirection
const Logout = () => {
  const { logout } = useAuth();
  const hasLoggedOut = useRef(false);

  useEffect(() => {
    if (!hasLoggedOut.current) {
      hasLoggedOut.current = true;
      logout();
    }
  }, [logout]);

  return <Navigate to="/login" replace />;
};

// ⚙️ Main app logic
function AppContent() {
  const { isAuthenticated, userRole, loading } = useAuth();
  const normalizedRole = normalizeUserRole(userRole);
  const isMobile = useIsMobile();

  if (loading) return null;

  // 🔹 Public (unauthenticated) routes
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/student" element={<StudentDesktopPlaceholder />} />
        <Route path="/" element={<PublicLandingGate />} />
        <Route path="*" element={<LoginRedirect />} />
      </Routes>
    );
  }

  // 🔹 Authenticated routes
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/logout" element={<Logout />} />

        {/* Redirect default / to dashboard based on role */}
        <Route path="/" element={
          normalizedRole === ROLES.ADMIN ? <SysAdDash /> :
            normalizedRole === ROLES.LAB_TECH ? (isMobile ? <Navigate to="/labtech-mobile" replace /> : <LabtechDashboard />) :
              normalizedRole === ROLES.LAB_HEAD ? <LabheadDashboard /> :
                normalizedRole === ROLES.STUDENT ? <StudentSession /> :
                  normalizedRole === ROLES.FACULTY ? <FacultyScheduling /> :
                    normalizedRole === ROLES.SECRETARY ? <SecretaryScheduling /> :
                      <Navigate to="/unauthorized" replace />
        } />

        {/* Admin routes */}
        <Route path="/room" element={<ProtectedRoute roles={[ROLES.ADMIN]}><RoomPage /></ProtectedRoute>} />
        <Route path="/schedule-import" element={<ProtectedRoute roles={[ROLES.ADMIN]}><ScheduleImportPage /></ProtectedRoute>} />
        <Route path="/maintenance" element={<ProtectedRoute roles={[ROLES.ADMIN]}><MaintenancePage /></ProtectedRoute>} />
        <Route path="/user/:email" element={<ProtectedRoute roles={[ROLES.ADMIN]}><UserDetails /></ProtectedRoute>} />

        {/* LabTech & LabHead routes */}
        <Route path="/labtech-dashboard" element={<ProtectedRoute roles={[ROLES.LAB_TECH, ROLES.LAB_HEAD]}><LabtechDashboard /></ProtectedRoute>} />
        <Route path="/labtech-mobile" element={<ProtectedRoute roles={[ROLES.LAB_TECH, ROLES.LAB_HEAD]}><InventoryMobile /></ProtectedRoute>} />
        <Route path="/inventory-audit" element={<ProtectedRoute roles={[ROLES.LAB_TECH, ROLES.LAB_HEAD]}><InventoryAuditPage /></ProtectedRoute>} />
        <Route path="/labtech/room" element={<ProtectedRoute roles={[ROLES.LAB_TECH, ROLES.LAB_HEAD]}><Room /></ProtectedRoute>} />
        <Route path="/labtech/room/:roomId/print-qr" element={<ProtectedRoute roles={[ROLES.LAB_TECH, ROLES.LAB_HEAD]}><RoomQRPrintPage /></ProtectedRoute>} />
        <Route path="/forms" element={<ProtectedRoute roles={[ROLES.LAB_TECH, ROLES.LAB_HEAD]}><Forms /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute roles={[ROLES.LAB_TECH, ROLES.LAB_HEAD]}><InventoryPage /></ProtectedRoute>} />
        <Route path="/inventory/item/:itemCode" element={<ProtectedRoute roles={[ROLES.LAB_TECH, ROLES.LAB_HEAD]}><InventoryItemInfo /></ProtectedRoute>} />
        <Route path="/labtech/borrowing" element={<ProtectedRoute roles={[ROLES.LAB_TECH, ROLES.LAB_HEAD]}><Borrowing /></ProtectedRoute>} />
        <Route path="/tickets" element={<ProtectedRoute roles={[ROLES.LAB_TECH, ROLES.LAB_HEAD]}><Ticket /></ProtectedRoute>} />
        <Route path="/notification" element={<ProtectedRoute roles={[ROLES.LAB_TECH, ROLES.LAB_HEAD]}><Notification /></ProtectedRoute>} />
        <Route path="/monitoring" element={<Navigate to="/" replace />} />
        <Route path="/reports" element={<ProtectedRoute roles={[ROLES.LAB_TECH]}><Reports /></ProtectedRoute>} />

        <Route path="/labhead-scheduling" element={<ProtectedRoute roles={[ROLES.LAB_HEAD]}><LabheadScheduling /></ProtectedRoute>} />

        {/* LabHead only */}
        <Route path="/labhead-dashboard" element={<ProtectedRoute roles={[ROLES.LAB_HEAD]}><LabheadDashboard /></ProtectedRoute>} />
        <Route path="/labtechview" element={<ProtectedRoute roles={[ROLES.LAB_HEAD]}><LabTechOverview /></ProtectedRoute>} />

        {/* Student */}
        <Route path="/student-session" element={<ProtectedRoute roles={[ROLES.STUDENT]}><StudentSession /></ProtectedRoute>} />
        <Route path="/student-pc-view" element={<ProtectedRoute roles={[ROLES.STUDENT]}><StudentPCView /></ProtectedRoute>} />
        <Route path="/student-room-view" element={<ProtectedRoute roles={[ROLES.STUDENT]}><StudentRoomView /></ProtectedRoute>} />

        {/* Faculty */}
        <Route path="/faculty/scheduling" element={<ProtectedRoute roles={[ROLES.FACULTY]}><FacultyScheduling /></ProtectedRoute>} />

        {/* Secretary */}
        <Route path="/secretary/scheduling" element={<ProtectedRoute roles={[ROLES.SECRETARY]}><SecretaryScheduling /></ProtectedRoute>} />

        {/* Unauthorized */}
        <Route path="/unauthorized" element={
          <div className="flex items-center justify-center p-8">
            <div className="rounded-lg border border-red-300/30 bg-red-50/10 p-6 text-center dark:border-red-700/30 dark:bg-red-900/20">
              <h1 className="mb-2 text-2xl font-semibold text-red-700 dark:text-red-300">Unauthorized</h1>
              <p className="text-sm text-gray-700 dark:text-gray-300">You don't have permission to access this page.</p>
            </div>
          </div>
        } />
        <Route path="*" element={<Outlet />} />
      </Route>
    </Routes>
  );
}

import { NotificationProvider } from '@/context/NotificationContext';
import { HeartbeatProvider } from '@/context/HeartbeatContext';

function App() {
  return (
    <AuthProvider>
      <ModalProvider>
        <NotificationProvider>
          <HeartbeatProvider>
            <AppContent />
          </HeartbeatProvider>
        </NotificationProvider>
      </ModalProvider>
    </AuthProvider>
  );
}

export default App;
