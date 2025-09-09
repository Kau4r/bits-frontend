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


const ProtectedRoute = ({ children, roles }: { children: JSX.Element, roles: string[] }) => {
  const { isAuthenticated, userRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (userRole && !roles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

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
  const { isAuthenticated, userRole } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (userRole === 'Student') {
    return (
      <Routes>
        <Route path="/student-session" element={<StudentSession />} />
        <Route path="/student-pc-view" element={<StudentPCView />} />
        <Route path="/student-room-view" element={<StudentRoomView />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="*" element={<Navigate to="/student-session" replace />} />
      </Routes>
    );
  }

  if (userRole === 'Faculty') {
    return (
      <Routes>
        <Route path="/faculty/scheduling" element={<FacultyScheduling />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="*" element={<Navigate to="/faculty/scheduling" replace />} />
      </Routes>
    );
  }


  if (userRole === 'Secretary') {
    return (
      <Routes>
        <Route path="/secretary/scheduling" element={<SecretaryScheduling />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="*" element={<Navigate to="/secretary/scheduling" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/logout" element={<Logout />} />
        <Route path="/unauthorized" element={
          <div className="flex items-center justify-center p-8">
            <div className="rounded-lg border border-red-300/30 bg-red-50/10 p-6 text-center dark:border-red-700/30 dark:bg-red-900/20">
              <h1 className="mb-2 text-2xl font-semibold text-red-700 dark:text-red-300">Unauthorized</h1>
              <p className="text-sm text-gray-700 dark:text-gray-300">You don't have permission to access this page.</p>
            </div>
          </div>
        } />

        <Route path="/" element={
          <ProtectedRoute roles={['System Admin']}>
            <SysAdDash />
          </ProtectedRoute>
        } />
        <Route path="/room" element={
          <ProtectedRoute roles={['System Admin']}>
            <RoomPage />
          </ProtectedRoute>
        } />
        <Route path="/user/:email" element={
          <ProtectedRoute roles={['System Admin']}>
            <UserDetails />
          </ProtectedRoute>
        } />

        <Route path="/inventory" element={
          <ProtectedRoute roles={['Lab Tech', 'Lab Head']}>
            <InventoryPage />
          </ProtectedRoute>
        } />
        <Route path="/labtech/room" element={
          <ProtectedRoute roles={['Lab Tech', 'Lab Head']}>
            <Room />
          </ProtectedRoute>
        } />
        <Route path="/labtech/forms" element={
          <ProtectedRoute roles={['Lab Tech', 'Lab Head']}>
            <Forms />
          </ProtectedRoute>
        } />
        <Route path="/labtech-dashboard" element={
          <ProtectedRoute roles={['Lab Tech', 'Lab Head']}>
            <LabtechDashboard />
          </ProtectedRoute>
        } />
        <Route path="/tickets" element={
          <ProtectedRoute roles={['Lab Tech', 'Lab Head']}>
            <Ticket />
          </ProtectedRoute>
        } />
        <Route path="/notification" element={
          <ProtectedRoute roles={['Lab Tech', 'Lab Head']}>
            <Notification />
          </ProtectedRoute>
        } />

        <Route path="/labhead-dashboard" element={
          <ProtectedRoute roles={['Lab Head']}>
            <LabheadDashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </Layout>
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
