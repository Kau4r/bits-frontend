import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import UserDetails from './pages/SysAd/UserDetails'
import InventoryPage from './pages/InventoryPage'
import SysAdDash from './pages/SysAd/UserPage'
import RoomPage from './pages/SysAd/RoomPage'
import LabtechDashboard from './pages/LabTech/LabtechDashboard'
import LabheadDashboard from './pages/LabHead/LabheadDashboard'
import LandingPage from './pages/LandingPage'
import Layout from './components/layout/Layout'
import StudentSession from './pages/Student/StudentSession'
import StudentPCView from './pages/Student/StudentPCView'
import StudentRoomView from './pages/Student/StudentRoomView'
import Tickets from './pages/Tickets'
import Notification from './pages/Notification'
import '@/App.css'
import './index.css';
import Room from './pages/LabTech/Room'
import Forms from './pages/LabTech/Forms'
import Secretary from './pages/Secretary/SecretaryScheduling'
import FacultyScheduling from './pages/Faculty/FacultyScheduling'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/room" element={<RoomPage />} />
          <Route path="/" element={<LandingPage />} />
          <Route path="/labtech-dashboard" element={<LabtechDashboard />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/labhead-dashboard" element={<LabheadDashboard />} />
          <Route path="/SysDashboard" element={<SysAdDash />} />
          <Route path="/user/:email" element={<UserDetails />} />
          <Route path="/student-session" element={<StudentSession />} />
          <Route path="/student-pc-view" element={<StudentPCView />} />
          <Route path="/student-room-view" element={<StudentRoomView />} />
          <Route path="/notification" element={<Notification />} />
          <Route path="/faculty/FacultyScheduling" element={<FacultyScheduling />} />
          <Route path="/labtech/tickets" element={<Tickets />} />
          <Route path="/labtech/room" element={<Room />} />
          <Route path="/labtech/forms" element={<Forms />} />
          <Route path="secretary/SecretaryScheduling" element={<Secretary/>}/>
        </Route>
      </Routes>
    </div>
  )
}

export default App
