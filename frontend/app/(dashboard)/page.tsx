"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

const sections = [
  {
    title: "Records",
    description: "Customers, products, tickets, issues, and solutions in one place.",
    href: "/records",
    accent: "#4f46e5",
    icon: (
      <>
        <rect x="3.5" y="4" width="17" height="16" rx="2" />
        <path d="M3.5 9h17M8 4v16" />
      </>
    ),
  },
  {
    title: "Documents",
    description: "Upload manuals and FAQs — chunked and embedded automatically.",
    href: "/documents",
    accent: "#0891b2",
    icon: (
      <>
        <path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
        <path d="M14 3v4h4M9 13h6M9 17h6" />
      </>
    ),
  },
  {
    title: "Search",
    description: "Semantic search over your knowledge base, powered by embeddings.",
    href: "/search",
    accent: "#7c3aed",
    icon: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m20 20-4.35-4.35" />
      </>
    ),
  },
  {
    title: "Ask",
    description: "Grounded, sourced answers generated from your own support data.",
    href: "/ask",
    accent: "#059669",
    icon: (
      <>
        <path d="M12 3a9 9 0 1 0 5.6 16.06L21 20l-1.06-3.34A9 9 0 0 0 12 3Z" />
        <path d="M9 10h.01M12 10h.01M15 10h.01" />
      </>
    ),
  },
  {
    title: "Graph Explorer",
    description: "Visually trace how customers, tickets, and solutions connect.",
    href: "/graph",
    accent: "#d97706",
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

export default function Home() {
  const [stats, setStats] = useState<{ tickets: number; documents: number; solutions: number } | null>(
    null
  );

  useEffect(() => {
    Promise.all([
      apiFetch("/tickets/"),
      apiFetch("/documents/"),
      apiFetch("/solutions/"),
    ])
      .then(([tickets, documents, solutions]) =>
        setStats({
          tickets: tickets.filter((t: { status: string }) => t.status === "open").length,
          documents: documents.length,
          solutions: solutions.length,
        })
      )
      .catch(() => setStats(null));
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-10">
        <p
          className="text-xs font-semibold tracking-wide uppercase mb-2"
          style={{ color: "var(--accent)" }}
        >
          Northlane Support Console
        </p>
        <h1 className="text-3xl font-semibold text-slate-900 mb-2">
          Good to see you, Saurabh
        </h1>
        <p className="text-slate-500 max-w-xl">
          A Graph RAG system combining structured data, a knowledge graph, and vector
          search — so every answer traces back to a real source.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {[
          { label: "Open tickets", value: stats?.tickets },
          { label: "Documents indexed", value: stats?.documents },
          { label: "Resolved issues", value: stats?.solutions },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white border rounded-xl px-5 py-4"
            style={{ borderColor: "var(--border)" }}
          >
            <p className="text-2xl font-semibold text-slate-900">
              {stat.value ?? <span className="text-slate-300">···</span>}
            </p>
            <p className="text-sm text-slate-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group block bg-white border rounded-xl p-5 transition-all hover:shadow-md hover:-translate-y-0.5"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center mb-3"
              style={{ background: `${section.accent}1a` }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={section.accent}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {section.icon}
              </svg>
            </div>
            <h2 className="text-base font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
              {section.title}
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">
                →
              </span>
            </h2>
            <p className="text-slate-500 text-sm">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
