import type { Store } from "./types";

export const STORE_KEY = "household-cfo.v2";
const RETIRED_KEY = "household-cfo.v1";

export function emptyStore(): Store {
  return {
    version: 2,
    customized: false,
    profile: { name: "", creditScore: null, creditPrior: null },
    accounts: [],
    holdings: [],
    transactions: [],
    budgets: [],
    goals: [],
  };
}

function valid(value: unknown): value is Store {
  if (!value || typeof value !== "object") return false;
  const row = value as Store;
  return (
    row.version === 2 &&
    !!row.profile &&
    Array.isArray(row.accounts) &&
    Array.isArray(row.holdings) &&
    Array.isArray(row.transactions) &&
    Array.isArray(row.budgets) &&
    Array.isArray(row.goals)
  );
}

export function loadStore(): Store {
  try {
    localStorage.removeItem(RETIRED_KEY);
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return emptyStore();
    const parsed: unknown = JSON.parse(raw);
    if (!valid(parsed)) return emptyStore();
    return parsed;
  } catch {
    return emptyStore();
  }
}

export function saveStore(store: Store): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}
