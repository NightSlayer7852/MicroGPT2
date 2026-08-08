// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
// 1. IMPORT THE THEME PROVIDER
import { ThemeProvider } from "./context/ThemeContext";

// Import Route Guards & Layout
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import DashboardLayout from "./components/DashboardLayout";

// Import Pages
import Login from "./pages/login";
import Signup from "./pages/signup";
import Dashboard from "./pages/dashboard";
import OAuthCallback from "./pages/OAuthCallback";
import SettingsPage from "./pages/settings"; // <-- NEW: Import the settings page
import HelpPage from './pages/help';

function App() {
  return (
    <AuthProvider>
      {/* 2. WRAP YOUR APP IN THE THEME PROVIDER */}
      <ThemeProvider>
        <Router>
          <Routes>
            {/* PUBLIC ROUTES 
              Wrapped in <PublicRoute> so logged-in users get bounced to the dashboard
            */}
            <Route 
              path="/" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            <Route 
              path="/signup" 
              element={
                <PublicRoute>
                  <Signup />
                </PublicRoute>
              } 
            />

            {/* PROTECTED ROUTES 
              Wrapped in <ProtectedRoute> so unauthenticated users get bounced to login.
              Wrapped in <DashboardLayout> to render the persistent sidebar.
            */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Dashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              } 
            />

           
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SettingsPage />
                  </DashboardLayout>
                </ProtectedRoute>
              } 
            /> 

            <Route 
            path="/help" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <HelpPage />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
            

            {/* HIDDEN AUTH ROUTES 
              Note: This path MUST match what you put in your Express backend res.redirect()
            */}
            <Route path="/oauth-success" element={<OAuthCallback />} />

          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;