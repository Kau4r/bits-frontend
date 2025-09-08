import { useState } from "react";
import Navbar from "./Navbar";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex">
      <Navbar collapsed={collapsed} setCollapsed={setCollapsed} />
      <main
        className={`flex-1 overflow-y-auto transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-56'}`}
      >
        {children}
      </main>
    </div>
  );
};

export default Layout;
