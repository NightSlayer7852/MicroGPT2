// src/pages/OAuthCallback.tsx
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithGoogleTokens } = useAuth();

  useEffect(() => {
    // Extract tokens from the URL: /oauth-success?accessToken=...&refreshToken=...
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");

    if (accessToken && refreshToken) {
      // Pass them into our AuthContext to save to storage and update state
      loginWithGoogleTokens(accessToken, refreshToken);
      
      // Instantly redirect to the dashboard, wiping the tokens from the visible URL history
      navigate("/dashboard", { replace: true });
    } else {
      // If someone navigates here manually without tokens, kick them to login
      navigate("/", { replace: true });
    }
  }, [searchParams, navigate, loginWithGoogleTokens]);

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d14", display: "flex", alignItems: "center", justifyContent: "center", color: "#a0a0b8", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <p>Securely logging you in...</p>
    </div>
  );
}