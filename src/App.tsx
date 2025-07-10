import { Routes, Route } from 'react-router-dom'
import { InventoryPage } from '@/pages'
import Login from './pages/Login'
import UserDetails from './pages/UserDetails'
import Navbar from './components/layout/Navbar'
import SysAdDash from './pages/SysAdDash'
import RoomPage from './pages/RoomPage'
import LabtechDashboard from './pages/LabtechDashboard'
import LabheadDashboard from './pages/LabheadDashboard'
import LandingPage from './pages/LandingPage'
import '@/App.css'
import StudentSession from './pages/StudentSession'
import StudentPCView from './pages/StudentPCView'
import StudentRoomView from './pages/StudentRoomView'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex h-screen">
        <Navbar />
        <div className="flex-1 pl-20 w-full overflow-hidden">
          <div className="w-full h-full">
            <Routes>  
              <Route path="/login" element={<Login />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/room" element={<RoomPage />} />
              <Route path="/" element={<LandingPage />} />
              <Route path="/labtech-dashboard" element={<LabtechDashboard />} />
              <Route path="/labhead-dashboard" element={<LabheadDashboard />} />
              <Route path="/SysDashboard" element={<SysAdDash />} />
              <Route path="/user/:email" element={<UserDetails />} />
              <Route path="/student-session" element={<StudentSession />} />
              <Route path="/student-pc-view" element={<StudentPCView />} />
              <Route path="/student-room-view" element={<StudentRoomView />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
