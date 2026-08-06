"use client";

import { useState } from "react";
import { apiFetch } from "../lib/api";

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
      <h1 className="text-2xl font-semibold mb-6">Search</h1>

      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your knowledge base..."
          required
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {loading && <p className="text-gray-500">Searching...</p>}

      {!loading && searched && results.length === 0 && (
        <p className="text-gray-500">No results found.</p>
      )}

      <ul className="space-y-4">
        {results.map((result) => (
          <li key={result.chunk_id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-medium">{result.document_title}</span>
              <span className="text-xs text-gray-500">
                {(result.similarity_score * 100).toFixed(1)}% match
              </span>
            </div>
            <p className="text-sm text-gray-600">{result.chunk_text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}