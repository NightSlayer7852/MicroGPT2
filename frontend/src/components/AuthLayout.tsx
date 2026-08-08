// src/components/AuthLayout.tsx
import { type ReactNode } from "react";
import bgImage from "../assets/backgroundSTM32.png"; 

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div 
      style={{ 
        minHeight: "100vh", 
        width: "100%",
        margin: 0,
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        fontFamily: "system-ui, -apple-system, sans-serif", 
        padding: "40px 20px" 
      }}
    >
      {/* We removed the background color, blur, border, and divider lines here */}
      <div 
        style={{ 
          position: "relative", 
          width: "100%", 
          maxWidth: "900px", 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          justifyContent: "center", 
          padding: "40px 20px"
        }}
      >
        
        {/* Form Container (Login/Signup gets injected here) */}
        {children}

      </div>
    </div>
  );
}