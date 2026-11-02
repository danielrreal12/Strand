"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OptimumNode } from "@/lib/nodes";

type Status =
  | { state: "loading" }
  | { state: "off"; reason: "public-link" | "not-allowed" }
  | { state: "setup" }
  | { state: "ready" }
  | { state: "connected"; account: string };

type MailRow = { id: string; from: string; subject: string; date: string };

export function GmailConnect({ onNodes }: { onNodes: (nodes: OptimumNode[]) => void }) {
  const [status, setStatus] = useState<Status>({ state: "loading" });
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<MailRow[]>([]);
  const [busy, setBusy] = useState(false);

  async function loadStatus() {
    const response = await fetch("/api/gmail/status", { cache: "no-store" });
    const body = (await response.json()) as {
      allowed: boolean;
      reason?: "public-link" | "not-allowed";
      configured: boolean;
      connected: boolean;
      account?: string;
    };
    if (!body.allowed) {
      setStatus({ state: "off", reason: body.reason ?? "not-allowed" });
      return;
    }
    if (!body.configured) {
      setStatus({ state: "setup" });
      return;
    }
    if (body.connected && body.account) {
      setStatus({ state: "connected", account: body.account });
      return;
    }
    setStatus({ state: "ready" });
  }

  useEffect(() => {
    const flag = new URLSearchParams(window.location.search).get("gmail");
    if (flag === "connected") setNote("Gmail is connected. Read-only.");
    if (flag === "error") setNote("Google sign-in did not finish. Try again.");
    if (flag === "setup") setNote("Add your Google OAuth client before connecting.");
    void loadStatus();
  }, []);

  async function loadMail() {
    setBusy(true);
    setNote("");
    try {
      const response = await fetch("/api/gmail/nodes", { cache: "no-store" });
      const body = (await response.json()) as {
        ok: boolean;
        messages?: MailRow[];
        nodes?: OptimumNode[];
      };
      if (!response.ok || !body.ok) {
        setNote("Could not read mail. Connect Gmail again.");
        return;
      }
      const messages = body.messages ?? [];
      setRows(messages);
      onNodes(body.nodes ?? []);
      setNote(
        messages.length === 0
          ? "No mail from Anthoney in the last 45 days."
          : `${messages.length} message${messages.length === 1 ? "" : "s"} from Anthoney.`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    await fetch("/api/gmail/disconnect", { method: "POST" });
    setRows([]);
    onNodes([]);
    setNote("Gmail disconnected.");
    setStatus({ state: "ready" });
    setBusy(false);
  }

  return (
    <section className="rounded-xl border border-border/70 bg-card/50 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <Mail className="mt-0.5 size-5 shrink-0 text-copper" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">Anthoney’s Gmail</p>
          {status.state === "loading" ? (
            <p className="mt-1 text-sm text-muted-foreground">Checking sign-in…</p>
          ) : null}
          {status.state === "off" ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {status.reason === "public-link"
                ? "Gmail stays off on this public link. Connect it on a private deployment you control. The mailbox is only available after your Google sign-in, and only with read-only access."
                : "Gmail is limited to localhost and hosts you list in GMAIL_ALLOWED_HOSTS."}
            </p>
          ) : null}
          {status.state === "setup" ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Create the OAuth client in a Google Cloud project you control. Scope is Gmail
              read-only. Put the client id, secret, and token secret in `.env.local`, then restart.
            </p>
          ) : null}
          {status.state === "ready" ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in with Google to read mail from Anthoney. Optimum cannot send, delete, or
              change anything in the mailbox.
            </p>
          ) : null}
          {status.state === "connected" ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Signed in as <span className="text-foreground">{status.account}</span>. Read-only.
            </p>
          ) : null}
          {note ? <p className="mt-2 text-sm text-primary">{note}</p> : null}
          {rows.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {rows.map((row) => (
                <li key={row.id}>
                  <span className="text-foreground">{row.subject || "(no subject)"}</span>
                  {" · "}
                  {row.date}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
      {status.state === "ready" ? (
        <a className={cn(buttonVariants(), "mt-4")} href="/api/gmail/auth">
          Connect Gmail
        </a>
      ) : null}
      {status.state === "connected" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={loadMail} disabled={busy}>
            {busy ? "Reading…" : "Load Anthoney’s mail"}
          </Button>
          <Button variant="secondary" onClick={disconnect} disabled={busy}>
            Disconnect
          </Button>
        </div>
      ) : null}
    </section>
  );
}
