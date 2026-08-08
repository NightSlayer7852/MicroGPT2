// src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  // Prevent UI flashing by showing a loader while checking local storage tokens
  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0d14", color: "#f0f0f0" }}>
        Loading MicroGPT...
      </div>
    );
  }

  // If the user is NOT logged in, redirect them to the Login page
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // If they are logged in, render the protected component (like the Dashboard)
  return <>{children}</>;
}