import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import UserDetails from './pages/SysAd/UserDetails'
import InventoryPage from './pages/InventoryPage'
import SysAdDash from './pages/SysAd/UserPage'
import RoomPage from './pages/SysAd/RoomPage'
import LabtechDashboard from './pages/LabtechDashboard'
import LabheadDashboard from './pages/LabheadDashboard'
import LandingPage from './pages/LandingPage'
import Layout from './components/layout/Layout'
import '@/App.css'

function App() {
  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/room" element={<RoomPage />} />
          <Route path="/" element={<LandingPage />} />
          <Route path="/labtech-dashboard" element={<LabtechDashboard />} />
          <Route path="/labhead-dashboard" element={<LabheadDashboard />} />
          <Route path="/SysDashboard" element={<SysAdDash />} />
          <Route path="/user/:email" element={<UserDetails />} />
        </Route>
      </Routes>
    </div>
  )
}

export default App
