"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LoginForm } from "@/components/LoginForm";
import { RegisterForm } from "@/components/RegisterForm";
import { AiSidebar } from "@/components/AiSidebar";
import { getAuth, setAuth, clearAuth, type AuthState } from "@/lib/auth";
import type { BoardData } from "@/lib/kanban";

type Screen = "login" | "register";

export default function Home() {
  const [auth, setAuthState] = useState<AuthState | null>(null);
  const [screen, setScreen] = useState<Screen>("login");
  const [isClient, setIsClient] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const boardUpdaterRef = useRef<((board: BoardData) => void) | null>(null);

  const handleBoardReady = useCallback((updater: (board: BoardData) => void) => {
    boardUpdaterRef.current = updater;
  }, []);

  const handleAiBoardUpdate = useCallback((board: BoardData) => {
    boardUpdaterRef.current?.(board);
  }, []);

  useEffect(() => {
    setIsClient(true);

    // Handle Google OAuth redirect: /?token=xxx&username=yyy
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const username = params.get("username");
    if (token && username) {
      const newAuth = { token, username };
      setAuth(newAuth);
      setAuthState(newAuth);
      // Clean URL
      window.history.replaceState({}, "", "/");
      return;
    }

    // Restore existing session from localStorage
    const existing = getAuth();
    if (existing) {
      setAuthState(existing);
    }
  }, []);

  const handleLogin = (newAuth: AuthState) => {
    setAuth(newAuth);
    setAuthState(newAuth);
  };

  const handleLogout = useCallback(() => {
    clearAuth();
    setAuthState(null);
    setScreen("login");
  }, []);

  const handleAuthError = useCallback(() => {
    handleLogout();
  }, [handleLogout]);

  if (!isClient) return null;

  if (!auth) {
    if (screen === "register") {
      return (
        <RegisterForm
          onLogin={handleLogin}
          onShowLogin={() => setScreen("login")}
        />
      );
    }
    return (
      <LoginForm
        onLogin={handleLogin}
        onShowRegister={() => setScreen("register")}
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-[#F5EEE4] text-[#554c4c]">
      <header className="flex w-full items-center justify-between px-4 py-3 bg-[#D3BF9A] shadow-sm z-50 relative">
        <div className="flex items-center">
          <img src="/logo_horizontal.png" alt="Kawaii-Ban" className="w-[200px] h-auto object-contain" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#032147] font-medium hidden sm:block">
            {auth.username}
          </span>
          <button
            id="ai-sidebar-toggle"
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-105 active:scale-95 shadow-sm"
            style={{ backgroundColor: "#753991" }}
          >
            <svg
              className="h-4 w-4 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            <span>AI Assistant</span>
          </button>
          <button
            onClick={handleLogout}
            className="rounded-full bg-[#fbd0df] px-4 py-2 text-sm font-semibold text-[#8a4e66] transition-transform hover:scale-105 active:scale-95"
          >
            Log out
          </button>
        </div>
      </header>

      <KanbanBoard
        username={auth.username}
        onBoardReady={handleBoardReady}
        onAuthError={handleAuthError}
      />

      <AiSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onBoardUpdate={handleAiBoardUpdate}
      />
    </div>
  );
}
