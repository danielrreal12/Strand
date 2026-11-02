export type NodeStatus = "not_started" | "ready" | "on_site" | "done" | "turned_in";

/** One Optimum production node from Anthoney's mail. */
export interface OptimumNode {
  id: string;
  node: string;
  address: string;
  /** When the node can be started, as written in the email. */
  canStart: string;
  /** Due date, as written in the email. */
  due: string;
  latitude: number | null;
  longitude: number | null;
  /** Map sheet attached to the email. */
  mapUrl?: string;
  pay: number;
  status: NodeStatus;
  /** Job reference and instructions included in the mail. */
  access?: string;
  /** Subject and date of the source email. */
  source?: string;
}

export const PAY_PER_NODE = 350;

const SOURCE =
  "Anthoney Kugler · Thu, Oct 29, 2026, 6:46 PM CT · Optimum Node Maps - Paige Communications Assignments Due 11/3";

/**
 * From the Oct 29 iCloud message (6:46 PM CT). Anthoney did not give a separate start
 * window, so the start column is the day they were assigned. GPS comes from
 * the attached map sheets. This is one email, not a full mailbox export.
 */
export const NODES: OptimumNode[] = [
  {
    id: "b165a",
    node: "B165A",
    address: "3737 Golden Trl, College Station, TX 77845",
    canStart: "Assigned Oct 29, 2026",
    due: "Nov 3, 2026",
    latitude: 30.631075,
    longitude: -96.261092,
    mapUrl: "/maps/b165a-overall-map.pdf",
    pay: PAY_PER_NODE,
    status: "not_started",
    access: "WISE-001963 · Send completion photos and an invoice when the node is done.",
    source: SOURCE,
  },
  {
    id: "b210a",
    node: "B210A",
    address: "3122 Camelot Dr, Bryan, TX 77802",
    canStart: "Assigned Oct 29, 2026",
    due: "Nov 3, 2026",
    latitude: 30.65711,
    longitude: -96.33818,
    mapUrl: "/maps/b210a-overall-map.pdf",
    pay: PAY_PER_NODE,
    status: "not_started",
    access: "WISE-001938 · Send completion photos and an invoice when the node is done.",
    source: SOURCE,
  },
];
