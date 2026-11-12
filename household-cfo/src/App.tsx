import { useEffect, useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { AdviceView, InvestmentsView } from "./components/InvestViews";
import {
  AccountsView,
  BudgetView,
  CashFlowView,
  GoalsView,
  RecurringView,
  ReportsView,
  TransactionsView,
} from "./components/LedgerViews";
import { Shell } from "./components/Shell";
import { HouseholdProvider } from "./context";
import { parseView, type View } from "./views";

export function App() {
  const [view, setView] = useState<View>(() => parseView(window.location.hash));

  useEffect(() => {
    const onHash = () => setView(parseView(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function go(next: View) {
    if (window.location.hash !== `#${next}`) window.location.hash = next;
    setView(next);
  }

  return (
    <HouseholdProvider>
      <Shell view={view} go={go}>
        {view === "dashboard" && <Dashboard go={go} />}
        {view === "accounts" && <AccountsView />}
        {view === "transactions" && <TransactionsView />}
        {view === "cashflow" && <CashFlowView />}
        {view === "reports" && <ReportsView />}
        {view === "budget" && <BudgetView />}
        {view === "recurring" && <RecurringView />}
        {view === "goals" && <GoalsView />}
        {view === "investments" && <InvestmentsView />}
        {view === "advice" && <AdviceView />}
      </Shell>
    </HouseholdProvider>
  );
}
