import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Bring in the signup function from our custom hook
  const { signup } = useAuth();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      // Use the context function instead of raw axios
      await signup(name, email, password);
      
      alert("Account created successfully! Please login.");
      navigate("/"); // Send them back to the login page
    } catch (err: any) {
      setError(err.response?.data?.message || "Signup failed. Please try again.");
    }
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSignup} style={{ background: "#1e1e26", borderRadius: "20px", border: "0.5px solid rgba(255,255,255,0.08)", padding: "32px 28px 28px", width: "100%", maxWidth: "320px", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2 }}>
        
        <h1 style={{ fontSize: "22px", fontWeight: 500, color: "#f0f0f0", marginBottom: "24px", textAlign: "center" }}>MicroGPT</h1>

        {error && <p style={{ color: "#ff6b6b", fontSize: "13px", marginBottom: "10px", textAlign: "center" }}>{error}</p>}

        {/* Full Name field (Required by backend) */}
        <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: "100%", background: "#252530", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "11px 14px", fontSize: "14px", color: "#c0c0c8", outline: "none", marginBottom: "10px", fontFamily: "inherit" }} />
        
        {/* Email field */}
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: "100%", background: "#252530", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "11px 14px", fontSize: "14px", color: "#c0c0c8", outline: "none", marginBottom: "10px", fontFamily: "inherit" }} />

        {/* Correct Password field with clear logic */}
        <div style={{ position: "relative", width: "100%", marginBottom: "18px" }}>
          <input type={showPassword ? "text" : "password"} placeholder="Create Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: "100%", background: "#252530", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "11px 40px 11px 14px", fontSize: "14px", color: "#c0c0c8", outline: "none", fontFamily: "inherit" }} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#555566", padding: 0, textTransform: "uppercase", fontSize: "12px", fontWeight: 500 }}>
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {/* Create Account button */}
        <button type="submit" style={{ width: "100%", background: "#2e2e3c", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "11px 14px", fontSize: "14px", color: "#c0c0cc", cursor: "pointer", marginBottom: "18px", fontFamily: "inherit" }}>
          Create Account
        </button>

        <p style={{ fontSize: "13px", color: "#555568", textAlign: "center", margin: 0 }}>
          Already have an account? <Link to="/" style={{ color: "#a0a0b8", textDecoration: "none", fontWeight: 500 }}>Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}