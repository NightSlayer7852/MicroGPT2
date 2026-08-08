// src/components/PublicRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { ReactNode } from "react";

interface PublicRouteProps {
  children: ReactNode;
}

export default function PublicRoute({ children }: PublicRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0d14", color: "#f0f0f0" }}>
        Loading MicroGPT...
      </div>
    );
  }

  // If the user IS already logged in, skip the auth pages and go to the dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // If they are NOT logged in, render the Login/Signup forms safely
  return <>{children}</>;
}