import UnauthorizedPage from './pages/UnauthorizedPage';
import '@/App.css'
import './index.css';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import StudentPCView from './pages/Student/StudentPCView';
import StudentRoomView from './pages/Student/StudentRoomView';
import type { JSX } from 'react';
import { ROLES } from './types/user';


const ProtectedRoute = ({ children, roles }: { children: JSX.Element, roles: string[] }) => {
  const { isAuthenticated, userRole } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (userRole && !roles.includes(userRole)) return <Navigate to="/unauthorized" replace />;

  return children;
};

const Logout = () => {
  const { logout } = useAuth();
  useEffect(() => {
    logout();
  }, [logout]);
  return <Navigate to="/login" replace />;
};

function AppContent() {
  const { isAuthenticated, userRole, loading } = useAuth();

  if (loading)
    return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/logout" element={<Logout />} />

      {/* Protected routes */}
      {isAuthenticated && (
        <Route element={<Layout />}>
          <Route
            index
            element={
              userRole === 'ADMIN' ? <SysAdDash /> :
                userRole === 'LAB_TECH' ? <LabtechDashboard /> :
                  userRole === 'LAB_HEAD' ? <LabheadDashboard /> :
                    userRole === 'STUDENT' ? <StudentSession /> :
                      userRole === 'FACULTY' ? <FacultyScheduling /> :
                        userRole === 'SECRETARY' ? <SecretaryScheduling /> :
                          <Navigate to="/unauthorized" replace />
            }
          />
          {/* Admin */}
          <Route path="room" element={<ProtectedRoute roles={[ROLES.ADMIN]}><RoomPage /></ProtectedRoute>} />
          <Route path="user/:email" element={<ProtectedRoute roles={[ROLES.ADMIN]}><UserDetails /></ProtectedRoute>} />

          {/* LabTech & LabHead */}
          <Route path="labtech-dashboard" element={<ProtectedRoute roles={[ROLES.LAB_TECH, ROLES.LAB_HEAD]}><LabtechDashboard /></ProtectedRoute>} />
          <Route path="labtech/room" element={<ProtectedRoute roles={[ROLES.LAB_TECH, ROLES.LAB_HEAD]}><Room /></ProtectedRoute>} />
          <Route path="labtech/forms" element={<ProtectedRoute roles={[ROLES.LAB_TECH, ROLES.LAB_HEAD]}><Forms /></ProtectedRoute>} />
          <Route path="inventory" element={<ProtectedRoute roles={[ROLES.LAB_TECH, ROLES.LAB_HEAD]}><InventoryPage /></ProtectedRoute>} />
          <Route path="tickets" element={<ProtectedRoute roles={[ROLES.LAB_TECH, ROLES.LAB_HEAD]}><Ticket /></ProtectedRoute>} />
          <Route path="notification" element={<ProtectedRoute roles={[ROLES.LAB_TECH, ROLES.LAB_HEAD]}><Notification /></ProtectedRoute>} />

          {/* LabHead */}
          <Route path="labhead-dashboard" element={<ProtectedRoute roles={[ROLES.LAB_HEAD]}><LabheadDashboard /></ProtectedRoute>} />

          {/* Student */}
          <Route path="student-session" element={<ProtectedRoute roles={[ROLES.STUDENT]}><StudentSession /></ProtectedRoute>} />
          <Route path="student-pc-view" element={<ProtectedRoute roles={[ROLES.STUDENT]}><StudentPCView /></ProtectedRoute>} />
          <Route path="student-room-view" element={<ProtectedRoute roles={[ROLES.STUDENT]}><StudentRoomView /></ProtectedRoute>} />

          {/* Faculty */}
          <Route path="faculty/scheduling" element={<ProtectedRoute roles={[ROLES.FACULTY]}><FacultyScheduling /></ProtectedRoute>} />

          {/* Secretary */}
          <Route path="secretary/scheduling" element={<ProtectedRoute roles={[ROLES.SECRETARY]}><SecretaryScheduling /></ProtectedRoute>} />

          {/* Catch-all for authenticated users */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      )}

      {/* Catch-all for unauthenticated users */}
      {!isAuthenticated && <Route path="*" element={<Navigate to="/login" replace />} />}
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
