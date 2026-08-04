"use client";

import { useState } from "react";
import { apiFetch } from "../lib/api";

type AskResponse = {
  answer: string;
  document_source: string | null;
  issue_source: string | null;
  solution_used: string | null;
};

export default function AskPage() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const data = await apiFetch("/ask/", {
        method: "POST",
        body: JSON.stringify({ question }),
      });
      setResponse(data);
    } catch {
      setError("Something went wrong, or you've hit the rate limit. Please wait a moment and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Ask</h1>

      <form onSubmit={handleAsk} className="flex gap-2 mb-8">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about your products or support history..."
          required
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          {loading ? "Thinking..." : "Ask"}
        </button>
      </form>

      {loading && (
        <p className="text-gray-500">
          Generating an answer — this can take several seconds...
        </p>
      )}

      {error && <p className="text-red-500">{error}</p>}

      {response && (
        <div className="border border-gray-200 rounded-lg p-5">
          <h2 className="font-semibold mb-2">Answer</h2>
          <p className="text-sm text-gray-700 mb-5">{response.answer}</p>

          <div className="border-t border-gray-100 pt-4 space-y-2">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Sources
            </h3>
            {response.document_source && (
              <p className="text-sm">
                <span className="text-gray-500">Document:</span> {response.document_source}
              </p>
            )}
            {response.issue_source && (
              <p className="text-sm">
                <span className="text-gray-500">Related issue:</span> {response.issue_source}
              </p>
            )}
            {response.solution_used && (
              <p className="text-sm">
                <span className="text-gray-500">Solution applied:</span> {response.solution_used}
              </p>
            )}
            {!response.document_source && !response.issue_source && (
              <p className="text-sm text-gray-400">No specific sources found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}