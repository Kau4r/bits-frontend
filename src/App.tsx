import { Routes, Route } from 'react-router-dom';
import { InventoryPage } from '@/pages';
import Login from './pages/Login';
import Navbar from './components/layout/Navbar';
import '@/App.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="flex">
        <Navbar />
        <div className="flex-1">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/" element={<InventoryPage />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default App;
