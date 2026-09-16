"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";

type Document = {
  id: number;
  title: string;
  content: string;
  product_id: number;
  created_at: string;
};

type Product = {
  id: number;
  name: string;
};

const inputStyle = { borderColor: "var(--border)" };

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [productId, setProductId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  function loadDocuments() {
    setLoading(true);
    apiFetch("/documents/")
      .then((result) => setDocuments(result))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadDocuments();
    apiFetch("/products/").then((result) => setProducts(result));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      await apiFetch("/documents/", {
        method: "POST",
        body: JSON.stringify({
          title,
          content,
          product_id: Number(productId),
        }),
      });
      setMessage("Document created and processed successfully.");
      setTitle("");
      setContent("");
      setProductId("");
      loadDocuments();
    } catch {
      setMessage("Failed to create document.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Documents</h1>
        <p className="text-slate-500 text-sm mt-1">
          Upload manuals and FAQs — automatically chunked and embedded for search.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border rounded-xl p-5 mb-10"
        style={{ borderColor: "var(--border)" }}
      >
        <h2 className="font-semibold text-slate-900 text-sm mb-4">Add a new document</h2>

        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border rounded-lg px-3.5 py-2.5 text-sm outline-none"
            style={inputStyle}
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={5}
            className="w-full border rounded-lg px-3.5 py-2.5 text-sm outline-none resize-y"
            style={inputStyle}
          />
        </div>

        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Product</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
            className="w-full border rounded-lg px-3.5 py-2.5 text-sm outline-none bg-white"
            style={inputStyle}
          >
            <option value="">Select a product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {submitting ? "Processing..." : "Create Document"}
        </button>

        {message && (
          <p
            className="text-sm mt-3 font-medium"
            style={{
              color: message.startsWith("Failed") ? "var(--warning)" : "var(--success)",
            }}
          >
            {message}
          </p>
        )}
      </form>

      <h2 className="font-semibold text-slate-900 text-sm mb-3">
        Existing documents
        {!loading && <span className="text-slate-400 font-normal"> · {documents.length}</span>}
      </h2>
      {loading && <p className="text-slate-500 text-sm">Loading…</p>}
      {!loading && (
        <ul className="space-y-3">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="bg-white border rounded-xl p-4"
              style={{ borderColor: "var(--border)" }}
            >
              <h3 className="font-medium text-slate-900 text-sm">{doc.title}</h3>
              <p className="text-slate-500 text-sm mt-1 line-clamp-2">{doc.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
