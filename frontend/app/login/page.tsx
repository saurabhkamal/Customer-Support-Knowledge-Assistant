"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || "Invalid username or password");
        return;
      }

      router.push(searchParams.get("next") || "/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--brand-900)" }}
    >
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div
            className="h-9 w-9 rounded-md flex items-center justify-center text-white font-bold"
            style={{ background: "var(--accent)" }}
          >
            N
          </div>
          <div>
            <p className="text-white font-semibold text-base tracking-tight">Northlane</p>
            <p className="text-[11px] text-slate-400 -mt-0.5">Support Intelligence</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-xl">
          <h1 className="text-lg font-semibold text-slate-900 mb-1">Sign in</h1>
          <p className="text-sm text-slate-500 mb-5">Access the support console.</p>

          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              autoComplete="username"
              className="w-full border rounded-lg px-3.5 py-2.5 text-sm outline-none"
              style={{ borderColor: "var(--border)" }}
            />
          </div>

          <div className="mb-5">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full border rounded-lg px-3.5 py-2.5 text-sm outline-none"
              style={{ borderColor: "var(--border)" }}
            />
          </div>

          {error && (
            <p
              className="text-sm mb-4 px-3 py-2 rounded-lg"
              style={{ color: "var(--warning)", background: "var(--warning-soft)" }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
