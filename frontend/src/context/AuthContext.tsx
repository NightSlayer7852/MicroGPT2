// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import axiosClient from "../api/axiosClient";

// 1. Define the types for our Context state and functions
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userName: string; // <-- NEW: Expose the user's name globally
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogleTokens: (accessToken: string, refreshToken: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to decode the JWT without external libraries
const extractNameFromToken = (token: string): string => {
  try {
    const payload = token.split(".")[1]; // Get the middle part of the JWT
    const decoded = JSON.parse(atob(payload)); // Decode base64 to JSON
    return decoded.name || "User"; // Fallback to "User" if name isn't in token
  } catch (e) {
    return "User";
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userName, setUserName] = useState<string>("User"); // <-- NEW

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      setIsAuthenticated(true);
      setUserName(extractNameFromToken(token)); // <-- Extract name on load
    }
    setIsLoading(false); 
  }, []);

  const login = async (email: string, password: string) => {
    const response = await axiosClient.post("/auth/login", { email, password });
    const { accessToken, refreshToken } = response.data;
    
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    
    setIsAuthenticated(true);
    setUserName(extractNameFromToken(accessToken)); // <-- Extract name on login
  };

  const signup = async (name: string, email: string, password: string) => {
    await axiosClient.post("/auth/signup", { name, email, password });
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        await axiosClient.post("/auth/logout", { refreshToken });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      setIsAuthenticated(false);
      setUserName("User"); // <-- Reset name on logout
    }
  };

  const loginWithGoogleTokens = (accessToken: string, refreshToken: string) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    setIsAuthenticated(true);
    setUserName(extractNameFromToken(accessToken)); // <-- Extract name from Google login
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        userName, // <-- NEW: Provide to the app
        login,
        signup,
        logout,
        loginWithGoogleTokens,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}