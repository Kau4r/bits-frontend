import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar />
            <div className="flex-1 ml-50 overflow-hidden">
                <main className="h-full w-full overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}