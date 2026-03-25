"use client";

import { useState } from "react";

interface LoginFormProps {
  onLogin: () => void;
}

export const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "user" && password === "password") {
      setError("");
      onLogin();
    } else {
      setError("Invalid credentials. Try user / password");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5EEE4]">

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-sm rounded-[32px] bg-white p-8 shadow-xl shadow-pink-100/50"
      >
        <div className="mb-6 flex flex-col items-center justify-center">
          <img src="/logo_vertical.png" alt="Kawaii-Ban" className="h-[200px] w-auto object-contain" />
          <p className="mt-2 text-sm font-semibold text-[#a38c95]">
            Please sign in to your cute workspace
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block pl-2 text-sm font-semibold text-[#8a4e66]">
              Username
            </label>
            <input
              autoFocus
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="user"
              className="w-full rounded-2xl border-2 border-[#f5e1e8] bg-[#fcf9fa] px-4 py-3 text-sm text-[#554c4c] placeholder-[#d1b8c2] outline-none transition-colors focus:border-[#fbd0df]"
            />
          </div>

          <div>
            <label className="mb-1 block pl-2 text-sm font-semibold text-[#8a4e66]">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              className="w-full rounded-2xl border-2 border-[#f5e1e8] bg-[#fcf9fa] px-4 py-3 text-sm text-[#554c4c] placeholder-[#d1b8c2] outline-none transition-colors focus:border-[#fbd0df]"
            />
          </div>

          {error && (
            <p className="pl-2 text-xs font-semibold text-rose-400">{error}</p>
          )}

          <button
            type="submit"
            className="mt-4 w-full rounded-2xl bg-[#fbd0df] px-4 py-3 text-sm font-bold text-[#8a4e66] transition-transform hover:scale-105 active:scale-95"
          >
            Start Planning ✨
          </button>
        </div>
      </form>
    </div>
  );
};
