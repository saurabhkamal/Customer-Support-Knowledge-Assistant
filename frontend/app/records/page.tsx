"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";

const TABS = [
  { key: "customers", label: "Customers", endpoint: "/customers/" },
  { key: "products", label: "Products", endpoint: "/products/" },
  { key: "tickets", label: "Tickets", endpoint: "/tickets/" },
  { key: "issues", label: "Issues", endpoint: "/issues/" },
  { key: "solutions", label: "Solutions", endpoint: "/solutions/" },
];

export default function RecordsPage() {
  const [activeTab, setActiveTab] = useState("customers");
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const tab = TABS.find((t) => t.key === activeTab);
    if (!tab) return;

    setLoading(true);
    setError("");

    apiFetch(tab.endpoint)
      .then((result) => setData(result))
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }, [activeTab]);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Records</h1>

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === tab.key
                ? "border-b-2 border-black"
                : "text-gray-500"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && (
        <RecordsTable data={data} />
      )}
    </div>
  );
}

function RecordsTable({ data }: { data: Record<string, unknown>[] }) {
  if (data.length === 0) {
    return <p className="text-gray-500">No records found.</p>;
  }

  const columns = Object.keys(data[0]);

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="text-left border-b border-gray-200">
          {columns.map((col) => (
            <th key={col} className="py-2 pr-4 font-medium text-gray-500">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} className="border-b border-gray-100">
            {columns.map((col) => (
              <td key={col} className="py-2 pr-4">
                {String(row[col])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}