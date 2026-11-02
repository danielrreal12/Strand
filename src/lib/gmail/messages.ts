import type { MailMessage } from "./parse";

type GmailPart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
};

type GmailPayload = GmailPart & {
  headers?: Array<{ name: string; value: string }>;
};

function decode(data: string): string {
  const pad = data.length % 4 === 0 ? "" : "=".repeat(4 - (data.length % 4));
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64").toString("utf8");
}

function collectText(part: GmailPart | undefined, into: { plain: string[]; html: string[] }) {
  if (!part) return;
  if (part.body?.data && part.mimeType === "text/plain") into.plain.push(decode(part.body.data));
  if (part.body?.data && part.mimeType === "text/html") into.html.push(decode(part.body.data));
  for (const child of part.parts ?? []) collectText(child, into);
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function header(payload: GmailPayload, name: string): string {
  return payload.headers?.find((item) => item.name.toLowerCase() === name)?.value ?? "";
}

async function gmailGet<T>(accessToken: string, path: string): Promise<T> {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Gmail request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export async function mailboxAddress(accessToken: string): Promise<string> {
  const profile = await gmailGet<{ emailAddress?: string }>(accessToken, "profile");
  if (!profile.emailAddress) throw new Error("Gmail did not return the mailbox address");
  return profile.emailAddress;
}

/** Only mail from Anthoney. Nothing else in the mailbox is requested. */
export async function anthoneyMessages(accessToken: string): Promise<MailMessage[]> {
  const query = encodeURIComponent("newer_than:45d (from:anthoney OR from:anthony)");
  const list = await gmailGet<{ messages?: Array<{ id: string }> }>(
    accessToken,
    `messages?q=${query}&maxResults=15`,
  );
  const messages: MailMessage[] = [];
  for (const item of list.messages ?? []) {
    const full = await gmailGet<{ id: string; payload?: GmailPayload }>(
      accessToken,
      `messages/${item.id}?format=full`,
    );
    const payload = full.payload ?? {};
    const buckets = { plain: [] as string[], html: [] as string[] };
    collectText(payload, buckets);
    const body = buckets.plain.join("\n").trim() || htmlToText(buckets.html.join("\n"));
    messages.push({
      id: full.id,
      from: header(payload, "from"),
      subject: header(payload, "subject"),
      date: header(payload, "date"),
      body,
    });
  }
  return messages;
}
