"use client";

import { useState, useEffect } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LoginForm } from "@/components/LoginForm";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const auth = localStorage.getItem("isAuthenticated");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    localStorage.setItem("isAuthenticated", "true");
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    setIsAuthenticated(false);
  };

  // Avoid hydration mismatch logic on NextJS static export
  if (!isClient) {
    return null;
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="relative min-h-screen bg-[#F5EEE4] text-[#554c4c]">
      {/* Top bar with Logout */}
      <header className="flex w-full items-center justify-between p-4 bg-[#D3BF9A] shadow-sm z-50 relative">
        <div className="flex items-center">
          <img src="/logo_horizontal.png" alt="Kawaii-Ban" className="w-[200px] h-auto object-contain" />
        </div>
        <button
          onClick={handleLogout}
          className="rounded-full bg-[#fbd0df] px-4 py-2 text-sm font-semibold text-[#8a4e66] transition-transform hover:scale-105 active:scale-95"
        >
          Log out
        </button>
      </header>

      <KanbanBoard />
    </div>
  );
}
