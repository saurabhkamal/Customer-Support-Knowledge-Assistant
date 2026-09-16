"use client";

import { useState, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { apiFetch } from "../../lib/api";

type GraphNode = { id: string; label: string; type: string };
type GraphEdge = { source: string; target: string; label: string };
type GraphResponse = { nodes: GraphNode[]; edges: GraphEdge[] };

const TYPE_COLORS: Record<string, string> = {
  Customer: "#f472b6",
  Ticket: "#fb923c",
  Product: "#c084fc",
  Issue: "#60a5fa",
  Solution: "#4ade80",
};

export default function GraphPage() {
  const [ticketId, setTicketId] = useState("");
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const layoutNodes = useCallback((graphNodes: GraphNode[]): Node[] => {
    return graphNodes.map((n, index) => ({
      id: n.id,
      position: { x: (index % 3) * 220, y: Math.floor(index / 3) * 150 },
      data: { label: `${n.label} (${n.type})` },
      style: {
        background: TYPE_COLORS[n.type] || "#d1d5db",
        borderRadius: 8,
        padding: 10,
        fontSize: 12,
        width: 180,
        border: "none",
        color: "#1e293b",
        fontWeight: 500,
      },
    }));
  }, []);

  async function handleLoadGraph(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data: GraphResponse = await apiFetch(`/graph/ticket/${ticketId}`);

      if (data.nodes.length === 0) {
        setError("No graph data found for this ticket ID.");
        setNodes([]);
        setEdges([]);
        return;
      }

      setNodes(layoutNodes(data.nodes));
      setEdges(
        data.edges.map((e, i) => ({
          id: `edge-${i}`,
          source: e.source,
          target: e.target,
          label: e.label,
          animated: true,
          style: { stroke: "#94a3b8" },
          labelStyle: { fill: "#475569", fontSize: 11, fontWeight: 500 },
        }))
      );
    } catch {
      setError("Failed to load graph.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Graph Explorer</h1>
        <p className="text-slate-500 text-sm mt-1">
          Trace how a ticket connects to its customer, product, issue, and solution.
        </p>
      </div>

      <form onSubmit={handleLoadGraph} className="flex gap-2 mb-4">
        <input
          value={ticketId}
          onChange={(e) => setTicketId(e.target.value)}
          placeholder="Enter a ticket ID (e.g. 3)"
          required
          type="number"
          className="flex-1 border rounded-lg px-3.5 py-2.5 text-sm outline-none"
          style={{ borderColor: "var(--border)" }}
        />
        <button
          type="submit"
          disabled={loading}
          className="text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {loading ? "Loading..." : "Load Graph"}
        </button>
      </form>

      <div className="flex gap-4 mb-5 flex-wrap">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
            {type}
          </div>
        ))}
      </div>

      {error && (
        <p
          className="text-sm mb-4 border rounded-xl px-4 py-3"
          style={{ color: "var(--warning)", background: "var(--warning-soft)", borderColor: "var(--border)" }}
        >
          {error}
        </p>
      )}

      {nodes.length > 0 && (
        <div
          style={{ height: 500, borderColor: "var(--border)" }}
          className="border rounded-xl overflow-hidden bg-white"
        >
          <ReactFlow nodes={nodes} edges={edges} fitView>
            <Background color="#e2e8f0" />
            <Controls />
          </ReactFlow>
        </div>
      )}
    </div>
  );
}
