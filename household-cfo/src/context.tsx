import { createContext, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { derive, type Model } from "./derive";
import { clearQuoteCache, loadQuotes } from "./market";
import { emptyStore, loadStore, saveStore, STORE_KEY } from "./storage";
import type { Account, Budget, Goal, Holding, Profile, QuoteBook, Store, Transaction } from "./types";

export interface Actions {
  setProfile: (patch: Partial<Profile>) => void;
  setAccount: (id: string, patch: Partial<Account>) => void;
  setHolding: (id: string, patch: Partial<Holding>) => void;
  addHolding: (holding: Holding) => void;
  removeHolding: (id: string) => void;
  addAccount: (account: Account) => void;
  removeAccount: (id: string) => void;
  setBudgetLimit: (category: string, limit: number) => void;
  addBudget: (budget: Budget) => void;
  removeBudget: (category: string) => void;
  setGoal: (id: string, patch: Partial<Goal>) => void;
  addGoal: (goal: Goal) => void;
  removeGoal: (id: string) => void;
  setTransactionAmount: (id: string, amount: number) => void;
  addTransaction: (tx: Transaction) => void;
  removeTransaction: (id: string) => void;
  reset: () => void;
}

interface HouseholdValue {
  store: Store;
  model: Model;
  actions: Actions;
  book: QuoteBook | null;
  loading: boolean;
  refresh: () => void;
}

const HouseholdContext = createContext<HouseholdValue | null>(null);

function touch(setStore: Dispatch<SetStateAction<Store>>, fn: (store: Store) => Store): void {
  setStore((store) => ({ ...fn(store), customized: true }));
}

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>(() => loadStore());
  const [book, setBook] = useState<QuoteBook | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    saveStore(store);
  }, [store]);

  const symbolKey = useMemo(() => {
    return [...new Set(store.holdings.map((h) => h.symbol.toUpperCase()))].sort().join("|");
  }, [store.holdings]);

  useEffect(() => {
    let cancel = false;
    const symbols = symbolKey ? symbolKey.split("|") : [];
    if (!symbols.length) {
      setBook({
        bySymbol: {},
        errors: {},
        fetchedAt: Date.now(),
        stale: false,
        summary: "No tickers yet. Add a holding to load a live price.",
      });
      setLoading(false);
      return;
    }
    setLoading(true);
    loadQuotes(symbols)
      .then((next) => {
        if (!cancel) setBook(next);
      })
      .catch(() => {
        if (!cancel) {
          setBook((prev) =>
            prev ?? {
              bySymbol: {},
              errors: {},
              fetchedAt: Date.now(),
              stale: true,
              summary: "Live quotes didn't load, and there are no saved prices on this device.",
            },
          );
        }
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [symbolKey, tick]);

  const model = useMemo(() => derive(store, book), [store, book]);

  const actions = useMemo<Actions>(
    () => ({
      setProfile: (patch) => touch(setStore, (s) => ({ ...s, profile: { ...s.profile, ...patch } })),
      setAccount: (id, patch) =>
        touch(setStore, (s) => ({
          ...s,
          accounts: s.accounts.map((account) => (account.id === id ? { ...account, ...patch } : account)),
        })),
      setHolding: (id, patch) =>
        touch(setStore, (s) => ({
          ...s,
          holdings: s.holdings.map((holding) => (holding.id === id ? { ...holding, ...patch } : holding)),
        })),
      addAccount: (account) => touch(setStore, (s) => ({ ...s, accounts: [...s.accounts, account] })),
      removeAccount: (id) =>
        touch(setStore, (s) => ({
          ...s,
          accounts: s.accounts.filter((account) => account.id !== id),
          holdings: s.holdings.filter((holding) => holding.accountId !== id),
          goals: s.goals.map((goal) => (goal.linkedAccountId === id ? { ...goal, linkedAccountId: undefined } : goal)),
        })),
      addHolding: (holding) => touch(setStore, (s) => ({ ...s, holdings: [...s.holdings, holding] })),
      removeHolding: (id) => touch(setStore, (s) => ({ ...s, holdings: s.holdings.filter((h) => h.id !== id) })),
      setBudgetLimit: (category, limit) =>
        touch(setStore, (s) => ({
          ...s,
          budgets: s.budgets.map((budget) => (budget.category === category ? { ...budget, limit } : budget)),
        })),
      addBudget: (budget) =>
        touch(setStore, (s) =>
          s.budgets.some((item) => item.category === budget.category) ? s : { ...s, budgets: [...s.budgets, budget] },
        ),
      removeBudget: (category) => touch(setStore, (s) => ({ ...s, budgets: s.budgets.filter((budget) => budget.category !== category) })),
      setGoal: (id, patch) =>
        touch(setStore, (s) => ({
          ...s,
          goals: s.goals.map((goal) => (goal.id === id ? { ...goal, ...patch } : goal)),
        })),
      addGoal: (goal) => touch(setStore, (s) => ({ ...s, goals: [...s.goals, goal] })),
      removeGoal: (id) => touch(setStore, (s) => ({ ...s, goals: s.goals.filter((goal) => goal.id !== id) })),
      setTransactionAmount: (id, amount) =>
        touch(setStore, (s) => ({
          ...s,
          transactions: s.transactions.map((tx) => (tx.id === id ? { ...tx, amount } : tx)),
        })),
      addTransaction: (tx) => touch(setStore, (s) => ({ ...s, transactions: [tx, ...s.transactions] })),
      removeTransaction: (id) =>
        touch(setStore, (s) => ({ ...s, transactions: s.transactions.filter((tx) => tx.id !== id) })),
      reset: () => {
        clearQuoteCache();
        localStorage.removeItem(STORE_KEY);
        setBook(null);
        setStore(emptyStore());
      },
    }),
    [],
  );

  const value = useMemo(
    () => ({ store, model, actions, book, loading, refresh: () => setTick((n) => n + 1) }),
    [store, model, actions, book, loading],
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold(): HouseholdValue {
  const value = useContext(HouseholdContext);
  if (!value) throw new Error("Household context missing");
  return value;
}
