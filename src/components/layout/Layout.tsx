import { useState } from "react";
import Navbar from "./Navbar";
import { Outlet } from "react-router-dom";

const Layout = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-900">
      <Navbar collapsed={collapsed} setCollapsed={setCollapsed} />
      <main
        className={`flex-1 min-h-screen overflow-y-auto transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-56'} bg-white dark:bg-gray-900`}
      >
        <Outlet /> {/* THIS IS CRUCIAL */}
      </main>
    </div>
  );
};

export default Layout;
