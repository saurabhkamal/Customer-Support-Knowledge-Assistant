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
import { apiFetch } from "../lib/api";

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
      <h1 className="text-2xl font-semibold mb-6">Graph Explorer</h1>

      <form onSubmit={handleLoadGraph} className="flex gap-2 mb-6">
        <input
          value={ticketId}
          onChange={(e) => setTicketId(e.target.value)}
          placeholder="Enter a ticket ID (e.g. 3)"
          required
          type="number"
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          {loading ? "Loading..." : "Load Graph"}
        </button>
      </form>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {nodes.length > 0 && (
        <div style={{ height: 500 }} className="border border-gray-200 rounded-lg">
          <ReactFlow nodes={nodes} edges={edges} fitView>
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      )}
    </div>
  );
}