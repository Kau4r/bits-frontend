import { useState } from "react";
import Navbar from "./Navbar";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Layout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { userRole } = useAuth();

  const noSidebarRoles = ["STUDENT", "FACULTY"];

  const hideSidebar = noSidebarRoles.includes(userRole ?? "");

  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-900">
      {!hideSidebar && <Navbar collapsed={collapsed} setCollapsed={setCollapsed} />}
      <main
        className={`flex-1 min-h-screen overflow-y-auto transition-all duration-300 
          ${hideSidebar ? "ml-0" : collapsed ? "ml-20" : "ml-56"} 
          bg-white dark:bg-gray-900`}
      >
        <Outlet /> 
      </main>
    </div>
  );
};

export default Layout;
