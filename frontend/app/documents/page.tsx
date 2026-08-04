"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";

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
      <h1 className="text-2xl font-semibold mb-6">Documents</h1>

      <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-5 mb-10">
        <h2 className="font-semibold mb-4">Add a new document</h2>

        <div className="mb-4">
          <label className="block text-sm text-gray-500 mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-500 mb-1">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={5}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-500 mb-1">Product</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
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
          className="bg-black text-white px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          {submitting ? "Processing..." : "Create Document"}
        </button>

        {message && <p className="text-sm mt-3">{message}</p>}
      </form>

      <h2 className="font-semibold mb-3">Existing documents</h2>
      {loading && <p className="text-gray-500">Loading...</p>}
      {!loading && (
        <ul className="space-y-3">
          {documents.map((doc) => (
            <li key={doc.id} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium">{doc.title}</h3>
              <p className="text-gray-500 text-sm mt-1 line-clamp-2">{doc.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}