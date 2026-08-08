// src/components/DashboardLayout.tsx
import { type ReactNode } from "react";
import Sidebar from "./Sidebar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="layout-container">
      {/* The Sidebar stays persistent on the left */}
      <Sidebar />
      
      {/* The dynamic page content gets injected here on the right */}
      <main className="layout-main">
        {children}
      </main>
    </div>
  );
}