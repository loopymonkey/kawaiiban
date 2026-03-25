"use client";

import { useState, type FormEvent } from "react";
import type { AuthState } from "@/lib/auth";

type RegisterFormProps = {
  onLogin: (auth: AuthState) => void;
  onShowLogin: () => void;
};

export const RegisterForm = ({ onLogin, onShowLogin }: RegisterFormProps) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Registration failed");
        return;
      }
      onLogin({ token: data.token, username: data.username });
    } catch {
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5EEE4]">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center gap-2">
          <img src="/logo_vertical.png" alt="Kawaii-Ban" className="h-28 w-auto object-contain" />
          <p className="text-sm font-semibold text-[#032147]">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            id="register-username"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={30}
            className="rounded-xl border-2 border-[#D3BF9A] px-4 py-2.5 text-sm text-[#032147] outline-none focus:border-[#753991] transition"
          />
          <input
            id="register-email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-xl border-2 border-[#D3BF9A] px-4 py-2.5 text-sm text-[#032147] outline-none focus:border-[#753991] transition"
          />
          <input
            id="register-password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="rounded-xl border-2 border-[#D3BF9A] px-4 py-2.5 text-sm text-[#032147] outline-none focus:border-[#753991] transition"
          />
          <input
            id="register-confirm"
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="rounded-xl border-2 border-[#D3BF9A] px-4 py-2.5 text-sm text-[#032147] outline-none focus:border-[#753991] transition"
          />

          {error && <p className="text-center text-sm text-red-500">{error}</p>}

          <button
            id="register-submit"
            type="submit"
            disabled={loading}
            className="rounded-full py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-95 disabled:opacity-60"
            style={{ backgroundColor: "#753991" }}
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[#888]">
          Already have an account?{" "}
          <button
            onClick={onShowLogin}
            className="font-semibold text-[#753991] hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};
