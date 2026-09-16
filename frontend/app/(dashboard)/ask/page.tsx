"use client";

import { useState } from "react";
import { apiFetch } from "../../lib/api";

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
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Ask</h1>
        <p className="text-slate-500 text-sm mt-1">
          Get a grounded answer, sourced from your documents and resolved issues.
        </p>
      </div>

      <form onSubmit={handleAsk} className="flex gap-2 mb-8">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about your products or support history..."
          required
          className="flex-1 border rounded-lg px-3.5 py-2.5 text-sm outline-none transition-shadow"
          style={{ borderColor: "var(--border)" }}
        />
        <button
          type="submit"
          disabled={loading}
          className="text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {loading ? "Thinking..." : "Ask"}
        </button>
      </form>

      {loading && (
        <div
          className="flex items-center gap-2.5 text-sm text-slate-500 border rounded-xl px-4 py-3.5 bg-white"
          style={{ borderColor: "var(--border)" }}
        >
          <span
            className="h-2 w-2 rounded-full animate-pulse"
            style={{ background: "var(--accent)" }}
          />
          Generating an answer — this can take several seconds...
        </div>
      )}

      {error && (
        <p
          className="text-sm border rounded-xl px-4 py-3.5"
          style={{ color: "var(--warning)", background: "var(--warning-soft)", borderColor: "var(--border)" }}
        >
          {error}
        </p>
      )}

      {response && (
        <div className="bg-white border rounded-xl p-5" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <div
              className="h-6 w-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
              style={{ background: "var(--accent)" }}
            >
              N
            </div>
            <h2 className="font-semibold text-slate-900 text-sm">Answer</h2>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed mb-5">{response.answer}</p>

          <div className="border-t pt-4 space-y-2" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Sources
            </h3>
            {response.document_source && (
              <p className="text-sm text-slate-600">
                <span className="font-medium text-slate-500">Document —</span>{" "}
                {response.document_source}
              </p>
            )}
            {response.issue_source && (
              <p className="text-sm text-slate-600">
                <span className="font-medium text-slate-500">Related issue —</span>{" "}
                {response.issue_source}
              </p>
            )}
            {response.solution_used && (
              <p className="text-sm text-slate-600">
                <span className="font-medium text-slate-500">Solution applied —</span>{" "}
                {response.solution_used}
              </p>
            )}
            {!response.document_source && !response.issue_source && (
              <p className="text-sm text-slate-400">No specific sources found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
