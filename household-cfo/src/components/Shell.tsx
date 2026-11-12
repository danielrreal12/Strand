import { useState, type ReactNode } from "react";
import { useHousehold } from "../context";
import type { View } from "../views";

const NAV: { id: View; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" },
  { id: "accounts", label: "Accounts", icon: "M3 7h18v12H3zM3 11h18M8 7V5h8v2" },
  { id: "transactions", label: "Transactions", icon: "M5 6h14M5 12h14M5 18h10" },
  { id: "cashflow", label: "Cash Flow", icon: "M4 16c2-6 4-6 6 0s4 6 6 0 4-6 4-6" },
  { id: "reports", label: "Reports", icon: "M5 19V9M12 19V5M19 19v-7" },
  { id: "budget", label: "Budget", icon: "M5 6h14v4H5zM5 14h8v4H5z" },
  { id: "recurring", label: "Recurring", icon: "M7 8a6 6 0 0 1 10 0M17 16a6 6 0 0 1-10 0M8 4v4H4M16 20v-4h4" },
  { id: "goals", label: "Goals", icon: "M6 20V5m0 0h9l-2 4 2 4H6" },
  { id: "investments", label: "Investments", icon: "M4 16l5-6 3 3 8-8" },
  { id: "advice", label: "Advice", icon: "M6 18h12M8 6h8v8H8z" },
];

export function Shell({ view, go, children }: { view: View; go: (view: View) => void; children: ReactNode }) {
  const { actions, store } = useHousehold();
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5 16l4.2-5 3.1 2.4L19 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <strong>Household</strong>
            <em>CFO of your household</em>
          </div>
        </div>
        <nav className="nav" aria-label="Sections" data-testid="nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={view === item.id ? "nav-item active" : "nav-item"}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => go(item.id)}
            >
              <svg viewBox="0 0 24 24" className="nav-ico" aria-hidden="true">
                <path d={item.icon} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
              {item.label}
            </button>
          ))}
          <button type="button" className="nav-item reset" onClick={() => setConfirm(true)}>
            Clear data
          </button>
        </nav>
        {confirm && (
          <div className="confirm">
            <p>Erase the numbers saved in this browser?</p>
            <div>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  actions.reset();
                  setConfirm(false);
                }}
              >
                Clear
              </button>
              <button type="button" className="btn ghost" onClick={() => setConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
        <p className="side-note">{store.customized ? "Saved on this device" : "Nothing saved yet"}</p>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
