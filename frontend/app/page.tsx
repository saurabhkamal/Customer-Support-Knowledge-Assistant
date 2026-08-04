import Link from "next/link";

const sections = [
  {
    title: "Records",
    description: "View and manage customers, products, tickets, issues, and solutions.",
    href: "/records",
  },
  {
    title: "Documents",
    description: "Upload manuals and FAQs, automatically chunked and embedded for search.",
    href: "/documents",
  },
  {
    title: "Search",
    description: "Run semantic search across your document knowledge base.",
    href: "/search",
  },
  {
    title: "Ask",
    description: "Ask a question and get an AI-generated answer, grounded in your data.",
    href: "/ask",
  },
  {
    title: "Graph Explorer",
    description: "Visually explore how customers, tickets, issues, and solutions connect.",
    href: "/graph",
  },
];

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold mb-2">Customer Support Knowledge Assistant</h1>
      <p className="text-gray-500 mb-10">
        A Graph RAG system combining structured data, a knowledge graph, and vector search.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="block border border-gray-200 rounded-lg p-5 hover:border-gray-400 transition-colors"
          >
            <h2 className="text-lg font-semibold mb-1">{section.title}</h2>
            <p className="text-gray-500 text-sm">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}