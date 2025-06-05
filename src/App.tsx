import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { InventoryPage } from '@/pages';
import '@/App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/" element={<InventoryPage />} />
      </Routes>
    </Router>
  );
}

export default App;
