import '@/App.css'
import './index.css';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LabtechDashboard from './pages/LabTech/LabtechDashboard';
import Layout from './components/layout/Layout';
import Ticket from './pages/Tickets/Tickets';
import Notification from './pages/Notification';
import UserDetails from './pages/SysAd/UserDetails';
import Login from './pages/Login';
import SysAdDash from './pages/SysAd/UserPage';
import RoomPage from './pages/SysAd/RoomPage';
import InventoryPage from './pages/LabTech/InventoryPage';
import Room from './pages/LabTech/Room';
import Forms from './pages/LabTech/Forms';
import LabheadDashboard from './pages/LabHead/LabheadDashboard';
import FacultyScheduling from './pages/Faculty/FacultyScheduling';
import SecretaryScheduling from './pages/Secretary/SecretaryScheduling';
import StudentSession from './pages/Student/StudentSession';
import LabTechOverview from './pages/LabHead/LabTechOverview';
import LabheadScheduling from './pages/LabHead/LabheadScheduling';
import type { JSX } from 'react';
import { ROLES } from './types/user';

// 🔒 Protects routes based on auth + role
const ProtectedRoute = ({ children, roles }: { children: JSX.Element, roles: string[] }) => {
  const { isAuthenticated, userRole } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (userRole && !roles.includes(userRole)) return <Navigate to="/unauthorized" replace />;

  return children;
};

// 🚪 Handles logout redirection
const Logout = () => {
  const { logout } = useAuth();
  useEffect(() => {
    logout();
  }, [logout]);
  return <Navigate to="/login" replace />;
};

// ⚙️ Main app logic
function AppContent() {
  const { isAuthenticated, userRole } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // 🔹 Public routes (not logged in)
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
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
          userRole === ROLES.ADMIN ? <SysAdDash /> :
          userRole === ROLES.LAB_TECH ? <LabtechDashboard /> :
          userRole === ROLES.LAB_HEAD ? <LabheadDashboard /> :
          userRole === ROLES.STUDENT ? <StudentSession /> :
          userRole === ROLES.FACULTY ? <FacultyScheduling /> :
          userRole === ROLES.SECRETARY ? <SecretaryScheduling /> :
          <Navigate to="/unauthorized" replace />
        } />

        {/* Admin routes */}
        <Route path="/room" element={<ProtectedRoute roles={[ROLES.ADMIN]}><RoomPage /></ProtectedRoute>} />
        <Route path="/user/:email" element={<ProtectedRoute roles={[ROLES.ADMIN]}><UserDetails /></ProtectedRoute>} />

        {/* LabTech & LabHead routes */}
        <Route path="/labtech-dashboard" element={<ProtectedRoute roles={[ROLES.LAB_TECH, ROLES.LAB_HEAD]}><LabtechDashboard /></ProtectedRoute>} />
        <Route path="/labtech/room" element={<ProtectedRoute roles={[ROLES.LAB_TECH, ROLES.LAB_HEAD]}><Room /></ProtectedRoute>} />
        <Route path="/forms" element={<ProtectedRoute roles={[ROLES.LAB_TECH, ROLES.LAB_HEAD]}><Forms /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute roles={[ROLES.LAB_TECH, ROLES.LAB_HEAD]}><InventoryPage /></ProtectedRoute>} />
        <Route path="/tickets" element={<ProtectedRoute roles={[ROLES.LAB_TECH, ROLES.LAB_HEAD]}><Ticket /></ProtectedRoute>} />
        <Route path="/notification" element={<ProtectedRoute roles={[ROLES.LAB_TECH, ROLES.LAB_HEAD]}><Notification /></ProtectedRoute>} />
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

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
