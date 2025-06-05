import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { InventoryPage } from '@/pages';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Navbar from './components/Navbar';
import '@/App.css';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <Navbar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/" element={<InventoryPage />} />
          </Route>

          {/* Redirect all other paths to login */}
          <Route path="*" element={<Login />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
