"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import type { BoardData } from "@/lib/kanban";
import { authedFetch } from "@/lib/auth";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type AiSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  onBoardUpdate: (board: BoardData) => void;
};

export const AiSidebar = ({ isOpen, onClose, onBoardUpdate }: AiSidebarProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your Kawaii-Ban assistant. Tell me what to do with your board — I can create, move, or delete cards, and rename columns!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const prompt = input.trim();
    if (!prompt || isThinking) return;

    const userMessage: Message = { role: "user", content: prompt };
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsThinking(true);

    try {
      const res = await authedFetch("/api/ai_chat", {
        method: "POST",
        body: JSON.stringify({ prompt, history }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Request failed");
      }

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message || "Done!" },
      ]);

      if (data.board) {
        onBoardUpdate(data.board);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Something went wrong: ${err.message}`,
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sidebar panel */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-[380px] flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ backgroundColor: "#FBF6EE", borderLeft: "3px solid #D3BF9A" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ backgroundColor: "#D3BF9A" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <span className="font-display text-base font-bold text-[#032147]">
              Kawaii-Ban AI
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/10 text-[#032147] transition hover:bg-black/20"
            aria-label="Close AI sidebar"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="mr-2 mt-1 flex-shrink-0 text-lg">🐾</div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                  msg.role === "user"
                    ? "rounded-tr-sm text-white"
                    : "rounded-tl-sm text-[#032147]"
                }`}
                style={{
                  backgroundColor:
                    msg.role === "user" ? "#753991" : "#EEE4D9",
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isThinking && (
            <div className="flex justify-start">
              <div className="mr-2 mt-1 flex-shrink-0 text-lg">🐾</div>
              <div
                className="rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm"
                style={{ backgroundColor: "#EEE4D9" }}
              >
                <div className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="block h-2 w-2 rounded-full bg-[#b9a6d9] animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="border-t-2 px-4 py-4 flex flex-col gap-2"
          style={{ borderColor: "#D3BF9A" }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me to create, move, or delete cards..."
            rows={2}
            disabled={isThinking}
            className="w-full resize-none rounded-xl border-2 bg-white px-3 py-2 text-sm text-[#032147] outline-none transition focus:border-[#753991] disabled:opacity-60"
            style={{ borderColor: "#D3BF9A" }}
          />
          <button
            type="submit"
            disabled={isThinking || !input.trim()}
            className="self-end rounded-full px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110 active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: "#753991" }}
          >
            Send
          </button>
        </form>
      </aside>
    </>
  );
};
