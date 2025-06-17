import { Routes, Route } from 'react-router-dom'
import { InventoryPage } from '@/pages'
import Login from './pages/Login'
import UserDetails from './pages/UserDetails'
import Navbar from './components/layout/Navbar'
import SysAdDash from './pages/SysAdDash'
import RoomPage from './pages/RoomPage'
import '@/App.css'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 transition-colors duration-200 dark:bg-gray-900">
      <div className="flex">
        <Navbar />
        <div className="flex-1">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/room" element={<RoomPage />} />
            <Route path="/" element={<InventoryPage />} />
            <Route path="/SysDashboard" element={<SysAdDash />} />
            <Route path="/user/:email" element={<UserDetails />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default App
