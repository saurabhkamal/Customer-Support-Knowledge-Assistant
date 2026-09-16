"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    href: "/",
    label: "Overview",
    icon: (
      <path d="M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    ),
  },
  {
    href: "/records",
    label: "Records",
    icon: (
      <>
        <rect x="3.5" y="4" width="17" height="16" rx="2" />
        <path d="M3.5 9h17M8 4v16" />
      </>
    ),
  },
  {
    href: "/documents",
    label: "Documents",
    icon: (
      <>
        <path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
        <path d="M14 3v4h4M9 13h6M9 17h6" />
      </>
    ),
  },
  {
    href: "/search",
    label: "Search",
    icon: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m20 20-4.35-4.35" />
      </>
    ),
  },
  {
    href: "/ask",
    label: "Ask",
    icon: (
      <>
        <path d="M12 3a9 9 0 1 0 5.6 16.06L21 20l-1.06-3.34A9 9 0 0 0 12 3Z" />
        <path d="M9 10h.01M12 10h.01M15 10h.01" />
      </>
    ),
  },
  {
    href: "/graph",
    label: "Graph Explorer",
    icon: (
      <>
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="18" cy="6" r="2.5" />
        <circle cx="12" cy="18" r="2.5" />
        <path d="M8 7.2 15 16M16 7.2 9 16" />
      </>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-64 shrink-0 flex flex-col text-slate-300"
      style={{ background: "var(--brand-900)" }}
    >
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-white/10">
        <div
          className="h-8 w-8 rounded-md flex items-center justify-center text-white font-bold text-sm"
          style={{ background: "var(--accent)" }}
        >
          N
        </div>
        <div className="leading-tight">
          <p className="text-white font-semibold text-sm tracking-tight">Northlane</p>
          <p className="text-[11px] text-slate-400">Support Intelligence</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 thin-scroll overflow-y-auto">
        {NAV.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={active ? "text-indigo-400" : "text-slate-500"}
              >
                {item.icon}
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-[11px] text-slate-500">Graph RAG · v1.0</p>
      </div>
    </aside>
  );
}
