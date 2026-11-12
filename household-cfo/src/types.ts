export type AccountType =
  | "cash"
  | "investment"
  | "retirement"
  | "property"
  | "loan"
  | "credit";

export interface Account {
  id: string;
  name: string;
  institution: string;
  type: AccountType;
  balance: number;
}

export type HoldingKind = "stock" | "etf-broad";

export interface Holding {
  id: string;
  accountId: string;
  symbol: string;
  shares: number;
  costBasis: number;
  kind: HoldingKind;
}

export interface Transaction {
  id: string;
  date: string;
  merchant: string;
  category: string;
  amount: number;
}

export interface Budget {
  category: string;
  limit: number;
  kind: "fixed" | "variable";
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  linkedAccountId?: string;
}

export interface Profile {
  name: string;
  creditScore: number | null;
  creditPrior: number | null;
}

export interface Store {
  version: 2;
  customized: boolean;
  profile: Profile;
  accounts: Account[];
  holdings: Holding[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
}

export interface Bar {
  date: string;
  close: number;
}

export type QuoteSource = "yahoo" | "yahoo-backup" | "nasdaq" | "saved";

export interface Quote {
  symbol: string;
  name: string;
  price: number;
  previousClose: number;
  dayChange: number;
  dayPct: number;
  currency: string;
  asOf: number;
  bars: Bar[];
  source: QuoteSource;
}

export interface QuoteBook {
  bySymbol: Record<string, Quote>;
  errors: Record<string, string>;
  fetchedAt: number;
  stale: boolean;
  summary: string;
}

export type Action = "buy" | "hold" | "trim" | "sell";

export interface Signal {
  symbol: string;
  name: string;
  action: Action;
  summary: string;
  detail: string;
  held: boolean;
  broad: boolean;
  price: number;
  dayPct: number;
  ret20: number | null;
  ret60: number | null;
  drawdown: number | null;
  sma20: number | null;
  sma50: number | null;
  maCross: "golden" | "death" | "none";
  weightAccount: number | null;
  accountName: string | null;
  weightPortfolio: number | null;
  score: number;
  unpriced: boolean;
}
