import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  
  // Bring in the login function from our custom hook
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      // Use the context function instead of raw axios
      await login(email, password);
      
      // On success, send them to the protected dashboard
      navigate("/dashboard");
    } catch (err: any) {
      // axiosClient passes the exact backend error payload through
      setError(err.response?.data?.message || "Login failed. Please check your credentials.");
    }
  };

  const handleGoogleLogin = () => {
    // This stays the same, as OAuth requires a full browser redirect to Google
    window.location.href = `${BASE_URL}/auth/google`;
  };

  return (
    <AuthLayout>
      <form onSubmit={handleLogin} style={{ background: "#1e1e26", borderRadius: "20px", border: "0.5px solid rgba(255,255,255,0.08)", padding: "32px 28px 28px", width: "100%", maxWidth: "320px", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2 }}>
        
        {/* Logo */}
        <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#2e2e3a", border: "0.5px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2 L13.5 10 L22 12 L13.5 14 L12 22 L10.5 14 L2 12 L10.5 10 Z" fill="#a855f7" />
          </svg>
        </div>

        <h1 style={{ fontSize: "22px", fontWeight: 500, color: "#f0f0f0", marginBottom: "24px", textAlign: "center" }}>MicroGPT</h1>

        {error && <p style={{ color: "#ff6b6b", fontSize: "13px", marginBottom: "10px", textAlign: "center" }}>{error}</p>}

        {/* Email field */}
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: "100%", background: "#252530", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "11px 14px", fontSize: "14px", color: "#c0c0c8", outline: "none", marginBottom: "10px", fontFamily: "inherit" }} />

        {/* Correct Password field with clear logic */}
        <div style={{ position: "relative", width: "100%", marginBottom: "10px" }}>
          <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: "100%", background: "#252530", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "11px 40px 11px 14px", fontSize: "14px", color: "#c0c0c8", outline: "none", fontFamily: "inherit" }} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#555566", padding: 0, textTransform: "uppercase", fontSize: "12px", fontWeight: 500 }}>
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {/* Sign in button */}
        <button type="submit" style={{ width: "100%", background: "#2e2e3c", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "11px 14px", fontSize: "14px", color: "#c0c0cc", cursor: "pointer", marginBottom: "10px", fontFamily: "inherit" }}>
          Sign in
        </button>

        {/* Proper Google SVG button */}
        <button type="button" onClick={handleGoogleLogin} style={{ width: "100%", background: "#252530", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "11px 14px", fontSize: "14px", color: "#c0c0cc", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "18px", fontFamily: "inherit" }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Sign in with Google
        </button>

        <p style={{ fontSize: "13px", color: "#555568", textAlign: "center", margin: 0 }}>
          Don't have an account? <Link to="/signup" style={{ color: "#a0a0b8", textDecoration: "none", fontWeight: 500 }}>Sign up, it's free!</Link>
        </p>
      </form>
    </AuthLayout>
  );
}