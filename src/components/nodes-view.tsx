"use client";

import { useState } from "react";
import { Copy, MapPin, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NODES, PAY_PER_NODE, type NodeStatus, type OptimumNode } from "@/lib/nodes";
import { GmailConnect } from "@/components/gmail-connect";

const STATUS_LABEL: Record<NodeStatus, string> = {
  not_started: "Not started",
  ready: "Ready",
  on_site: "On site",
  done: "Done",
  turned_in: "Turned in",
};

function mapsHref(node: OptimumNode) {
  if (node.latitude != null && node.longitude != null) {
    const q = encodeURIComponent(node.address || node.node);
    return `https://maps.apple.com/?ll=${node.latitude},${node.longitude}&q=${q}`;
  }
  return node.mapUrl;
}

function coordLabel(node: OptimumNode) {
  if (node.latitude == null || node.longitude == null) return "—";
  return `${node.latitude.toFixed(5)}, ${node.longitude.toFixed(5)}`;
}

export function NodesView() {
  const [nodes, setNodes] = useState<OptimumNode[]>(NODES);
  const [copied, setCopied] = useState<string | null>(null);
  const weekPay = nodes.length * PAY_PER_NODE;
  const turnedIn = nodes.filter((n) => n.status === "turned_in").length;

  async function copyCoords(node: OptimumNode) {
    if (node.latitude == null || node.longitude == null) return;
    const text = `${node.latitude}, ${node.longitude}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(node.id);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  }

  function cycleStatus(id: string) {
    const order: NodeStatus[] = [
      "not_started",
      "ready",
      "on_site",
      "done",
      "turned_in",
    ];
    setNodes((list) =>
      list.map((node) => {
        if (node.id !== id) return node;
        const next = order[(order.indexOf(node.status) + 1) % order.length];
        return { ...node, status: next };
      }),
    );
  }

  return (
    <div className="space-y-6">
      <header className="rise-in">
        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
          Optimum Nodes · Production
        </p>
        <h2 className="font-heading mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          This week’s nodes
        </h2>
        <p className="mt-1 max-w-xl text-muted-foreground">
          ${PAY_PER_NODE} a node. Start window, due date, and map coordinates
          from Anthoney’s mail.
        </p>
      </header>

      <div className="rise-in rise-in-delay-1">
        <GmailConnect onNodes={setNodes} />
      </div>

      <div className="rise-in rise-in-delay-1 grid grid-cols-3 gap-2 sm:gap-3">
        <Stat label="Nodes" value={String(nodes.length)} />
        <Stat label="Week pay" value={`$${weekPay.toLocaleString("en-US")}`} />
        <Stat label="Turned in" value={`${turnedIn}/${nodes.length || 0}`} />
      </div>

      {nodes.length === 0 ? (
        <div className="rise-in rise-in-delay-2 rounded-xl border border-dashed border-border bg-card/40 p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 size-5 shrink-0 text-copper" />
            <div>
              <p className="font-medium">Waiting on Anthoney’s week</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Each row will show the node, when you can start, the due date,
                the address, coordinates, a Maps link, ${PAY_PER_NODE} pay, and
                access notes (gate, hours, contact) when the email includes them.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <ul className="rise-in rise-in-delay-2 space-y-3 md:hidden">
            {nodes.map((node) => (
              <NodeCard
                key={node.id}
                node={node}
                copied={copied === node.id}
                onCopy={() => copyCoords(node)}
                onStatus={() => cycleStatus(node.id)}
              />
            ))}
          </ul>

          <div className="rise-in rise-in-delay-2 hidden overflow-x-auto rounded-xl border border-border/70 bg-card/50 md:block">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-border/70 text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-3 font-medium">Node</th>
                  <th className="px-3 py-3 font-medium">Can start</th>
                  <th className="px-3 py-3 font-medium">Due</th>
                  <th className="px-3 py-3 font-medium">Address</th>
                  <th className="px-3 py-3 font-medium">Coordinates</th>
                  <th className="px-3 py-3 font-medium">Map</th>
                  <th className="px-3 py-3 font-medium">Pay</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map((node) => {
                  const href = mapsHref(node);
                  return (
                    <tr key={node.id} className="border-b border-border/40 last:border-0">
                      <td className="px-3 py-3 font-medium">{node.node}</td>
                      <td className="px-3 py-3">{node.canStart}</td>
                      <td className="px-3 py-3">{node.due}</td>
                      <td className="px-3 py-3 text-muted-foreground">{node.address}</td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          className="font-mono text-xs text-primary"
                          onClick={() => copyCoords(node)}
                        >
                          {copied === node.id ? "Copied" : coordLabel(node)}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        {href ? (
                          <a
                            className="text-primary underline-offset-2 hover:underline"
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-3 tabular-nums">${node.pay}</td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          className="text-left text-primary"
                          onClick={() => cycleStatus(node.id)}
                        >
                          {STATUS_LABEL[node.status]}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/60 p-3 sm:p-4">
      <p className="text-[10px] tracking-wide text-muted-foreground uppercase sm:text-xs">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tracking-tight tabular-nums sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

function NodeCard({
  node,
  copied,
  onCopy,
  onStatus,
}: {
  node: OptimumNode;
  copied: boolean;
  onCopy: () => void;
  onStatus: () => void;
}) {
  const href = mapsHref(node);
  return (
    <li className="rounded-xl border border-border/70 bg-card/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-heading text-lg font-semibold">{node.node}</p>
          <p className="text-sm text-muted-foreground">{node.address}</p>
        </div>
        <p className="text-sm font-semibold tabular-nums text-copper">${node.pay}</p>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">
            Can start
          </dt>
          <dd className="mt-0.5">{node.canStart}</dd>
        </div>
        <div>
          <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">
            Due
          </dt>
          <dd className="mt-0.5">{node.due}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">
            Coordinates
          </dt>
          <dd className="mt-0.5 flex items-center gap-2">
            <span className="font-mono text-xs">{coordLabel(node)}</span>
            {node.latitude != null ? (
              <button type="button" onClick={onCopy} aria-label="Copy coordinates">
                <Copy className="size-3.5 text-primary" />
              </button>
            ) : null}
            <span className="text-xs text-primary">{copied ? "Copied" : ""}</span>
          </dd>
        </div>
      </dl>
      {node.access ? (
        <p className="mt-3 text-sm text-muted-foreground">{node.access}</p>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-2">
        <button type="button" className="text-sm text-primary" onClick={onStatus}>
          {STATUS_LABEL[node.status]}
        </button>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary"
          >
            <MapPin className="size-3.5" />
            Maps
          </a>
        ) : null}
      </div>
    </li>
  );
}
