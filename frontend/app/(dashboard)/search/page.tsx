"use client";

import { useState } from "react";
import { apiFetch } from "../../lib/api";

type SearchResult = {
  chunk_id: number;
  document_id: number;
  document_title: string;
  chunk_text: string;
  similarity_score: number;
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSearched(true);

    try {
      const data = await apiFetch("/search/", {
        method: "POST",
        body: JSON.stringify({ query, top_k: 5 }),
      });
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Search</h1>
        <p className="text-slate-500 text-sm mt-1">
          Semantic search across your document knowledge base.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your knowledge base..."
          required
          className="flex-1 border rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 transition-shadow"
          style={{ borderColor: "var(--border)" }}
        />
        <button
          type="submit"
          disabled={loading}
          className="text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          style={{ background: "var(--accent)" }}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {loading && (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="border rounded-xl p-4 animate-pulse h-20 bg-slate-50"
              style={{ borderColor: "var(--border)" }}
            />
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div
          className="text-center py-12 border rounded-xl bg-white"
          style={{ borderColor: "var(--border)" }}
        >
          <p className="text-slate-500 text-sm">No results found for that query.</p>
        </div>
      )}

      <ul className="space-y-3">
        {results.map((result) => (
          <li
            key={result.chunk_id}
            className="bg-white border rounded-xl p-4"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex justify-between items-start mb-2 gap-3">
              <span className="text-sm font-semibold text-slate-900">
                {result.document_title}
              </span>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
              >
                {(result.similarity_score * 100).toFixed(1)}% match
              </span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{result.chunk_text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
