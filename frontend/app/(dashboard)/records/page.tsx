"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";

const TABS = [
  { key: "customers", label: "Customers", endpoint: "/customers/" },
  { key: "products", label: "Products", endpoint: "/products/" },
  { key: "tickets", label: "Tickets", endpoint: "/tickets/" },
  { key: "issues", label: "Issues", endpoint: "/issues/" },
  { key: "solutions", label: "Solutions", endpoint: "/solutions/" },
];

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  open: { bg: "var(--warning-soft)", color: "var(--warning)" },
  closed: { bg: "var(--success-soft)", color: "var(--success)" },
};

export default function RecordsPage() {
  const [activeTab, setActiveTab] = useState("customers");
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const tab = TABS.find((t) => t.key === activeTab);
    if (!tab) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    apiFetch(tab.endpoint)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Records</h1>
        <p className="text-slate-500 text-sm mt-1">
          Browse the structured data backing your knowledge graph.
        </p>
      </div>

      <div className="flex gap-1.5 mb-6 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "text-white"
                : "text-slate-600 bg-white border hover:bg-slate-50"
            }`}
            style={
              activeTab === tab.key
                ? { background: "var(--accent)" }
                : { borderColor: "var(--border)" }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="bg-white border rounded-xl overflow-hidden"
        style={{ borderColor: "var(--border)" }}
      >
        {loading && (
          <p className="text-slate-500 text-sm px-5 py-8 text-center">Loading…</p>
        )}
        {error && (
          <p className="text-sm px-5 py-8 text-center" style={{ color: "var(--warning)" }}>
            {error}
          </p>
        )}
        {!loading && !error && <RecordsTable data={data} />}
      </div>
    </div>
  );
}

function RecordsTable({ data }: { data: Record<string, unknown>[] }) {
  if (data.length === 0) {
    return <p className="text-slate-500 text-sm px-5 py-8 text-center">No records found.</p>;
  }

  const columns = Object.keys(data[0]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50" style={{ borderColor: "var(--border)" }}>
            {columns.map((col) => (
              <th
                key={col}
                className="py-2.5 px-5 text-left font-medium text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap"
              >
                {col.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className="border-b last:border-0 hover:bg-slate-50/70 transition-colors"
              style={{ borderColor: "var(--border)" }}
            >
              {columns.map((col) => (
                <td key={col} className="py-3 px-5 text-slate-700 whitespace-nowrap">
                  {col === "status" && typeof row[col] === "string" ? (
                    <span
                      className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                      style={
                        STATUS_STYLES[row[col] as string] ?? {
                          bg: "var(--border)",
                          color: "var(--muted)",
                        }
                      }
                    >
                      {row[col] as string}
                    </span>
                  ) : (
                    String(row[col])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
