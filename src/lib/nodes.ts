export type NodeStatus =
  | "not_started"
  | "ready"
  | "on_site"
  | "spliced"
  | "turned_in";

/** One Optimum production node from Anthoney's weekly mail. */
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
  /** Original map link from the email, when one was attached. */
  mapUrl?: string;
  pay: number;
  status: NodeStatus;
  /** Gate codes, hours, on-site contact, NOL — whatever the mail included. */
  access?: string;
  fiberCount?: number;
  /** Subject and date of the source email. */
  source?: string;
}

export const PAY_PER_NODE = 350;

/**
 * Filled from Anthoney's emails. Empty until those messages are available
 * to read — do not invent assignments.
 */
export const NODES: OptimumNode[] = [];
