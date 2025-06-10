import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { InventoryPage } from '@/pages';
import Login from './pages/Login';
import Navbar from './components/layout/Navbar';
import '@/App.css';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <Navbar />
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/" element={<InventoryPage />} />

          {/* Redirect all other paths to login */}
          <Route path="*" element={<Login />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
