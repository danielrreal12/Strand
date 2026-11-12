export type View =
  | "dashboard"
  | "accounts"
  | "transactions"
  | "cashflow"
  | "reports"
  | "budget"
  | "recurring"
  | "goals"
  | "investments"
  | "advice";

const VIEWS: View[] = [
  "dashboard",
  "accounts",
  "transactions",
  "cashflow",
  "reports",
  "budget",
  "recurring",
  "goals",
  "investments",
  "advice",
];

export function parseView(hash: string): View {
  const name = hash.replace("#", "") as View;
  return VIEWS.includes(name) ? name : "dashboard";
}
