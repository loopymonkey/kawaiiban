"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LoginForm } from "@/components/LoginForm";
import { AiSidebar } from "@/components/AiSidebar";
import type { BoardData } from "@/lib/kanban";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Callback ref: KanbanBoard registers its setter here so AI can push updates
  const boardUpdaterRef = useRef<((board: BoardData) => void) | null>(null);

  const handleBoardReady = useCallback((updater: (board: BoardData) => void) => {
    boardUpdaterRef.current = updater;
  }, []);

  const handleAiBoardUpdate = useCallback((board: BoardData) => {
    boardUpdaterRef.current?.(board);
  }, []);

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

  if (!isClient) {
    return null;
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="relative min-h-screen bg-[#F5EEE4] text-[#554c4c]">
      {/* Top bar */}
      <header className="flex w-full items-center justify-between px-4 py-3 bg-[#D3BF9A] shadow-sm z-50 relative">
        <div className="flex items-center">
          <img src="/logo_horizontal.png" alt="Kawaii-Ban" className="w-[200px] h-auto object-contain" />
        </div>
        <div className="flex items-center gap-3">
          <button
            id="ai-sidebar-toggle"
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-105 active:scale-95 shadow-sm"
            style={{ backgroundColor: "#753991" }}
          >
            <span>✨</span>
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

      <KanbanBoard onBoardReady={handleBoardReady} />

      <AiSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onBoardUpdate={handleAiBoardUpdate}
      />
    </div>
  );
}
