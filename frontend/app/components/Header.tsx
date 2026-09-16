"use client";

import { useRouter } from "next/navigation";

export default function Header() {
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className="h-16 shrink-0 flex items-center justify-between px-8 border-b bg-white"
      style={{ borderColor: "var(--border)" }}
    >
      <p className="text-sm text-slate-500">
        Workspace <span className="text-slate-300 mx-1.5">/</span>{" "}
        <span className="font-medium text-slate-700">Acme Retail Support</span>
      </p>
      <div className="flex items-center gap-3">
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ background: "var(--success-soft)", color: "var(--success)" }}
        >
          ● Live
        </span>
        <button
          onClick={handleSignOut}
          className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          Sign out
        </button>
        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600">
          SK
        </div>
      </div>
    </header>
  );
}
