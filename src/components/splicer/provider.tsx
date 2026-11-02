"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  agendaAnchor,
  chicagoToday,
  clearSession,
  readRoutePlans,
  readStoredNodes,
  writeRoutePlans,
  writeStoredNodes,
  type CalendarMode,
  type RoutePlan,
  type SplicerNode,
  type TabId,
} from "@/lib/splicer";

type BatchMode = "complete" | "schedule" | "payment" | "received";

type SplicerState = {
  nodes: SplicerNode[];
  today: string;
  tab: TabId;
  setTab: (tab: TabId) => void;
  query: string;
  setQuery: (value: string) => void;
  filter: string;
  setFilter: (value: string) => void;
  calendarMode: CalendarMode;
  setCalendarMode: (mode: CalendarMode) => void;
  month: Date;
  setMonth: (month: Date) => void;
  selectedDay: string;
  setSelectedDay: (day: string) => void;
  anchor: string;
  selectedCodes: string[];
  setSelectedCodes: (codes: string[]) => void;
  toggleCode: (code: string) => void;
  editing: SplicerNode | null;
  setEditing: (node: SplicerNode | null) => void;
  batchOpen: boolean;
  batchMode: BatchMode;
  setBatchMode: (mode: BatchMode) => void;
  batchDate: string;
  setBatchDate: (value: string) => void;
  batchPay: string;
  setBatchPay: (value: string) => void;
  openBatch: (options?: { mode?: BatchMode; codes?: string[] }) => void;
  closeBatch: () => void;
  saving: boolean;
  error: string;
  setError: (value: string) => void;
  toast: string;
  showToast: (value: string) => void;
  dark: boolean;
  toggleTheme: () => void;
  saveChanges: (codes: string[], changes: Partial<SplicerNode>) => void;
  routePlans: Record<string, RoutePlan>;
  saveRoute: (plan: RoutePlan) => void;
  routeMode: "team" | "individual";
  setRouteMode: (mode: "team" | "individual") => void;
  lock: () => void;
  refresh: () => void;
};

const SplicerContext = createContext<SplicerState | null>(null);

export function useSplicer() {
  const value = useContext(SplicerContext);
  if (!value) throw new Error("Splicer is not ready");
  return value;
}

export function SplicerProvider({ children, onLock }: { children: ReactNode; onLock: () => void }) {
  const [nodes, setNodes] = useState<SplicerNode[]>(() => readStoredNodes());
  const [today, setToday] = useState(() => chicagoToday());
  const [tab, setTab] = useState<TabId>("calendar");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("scheduled");
  const [month, setMonth] = useState(() => new Date(`${chicagoToday()}T12:00:00`));
  const [selectedDay, setSelectedDay] = useState(() => chicagoToday());
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [editing, setEditing] = useState<SplicerNode | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchMode, setBatchModeState] = useState<BatchMode>("complete");
  const [batchDate, setBatchDate] = useState(() => chicagoToday());
  const [batchPay, setBatchPay] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [dark, setDark] = useState(false);
  const [routePlans, setRoutePlans] = useState<Record<string, RoutePlan>>(() => readRoutePlans());
  const [routeMode, setRouteMode] = useState<"team" | "individual">("team");
  const followedAnchor = useRef("");

  const anchor = useMemo(() => agendaAnchor(nodes, today), [nodes, today]);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
    const timer = window.setInterval(() => setToday(chicagoToday()), 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") setToday(chicagoToday());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    if (!nodes.length) return;
    if (!followedAnchor.current || selectedDay === followedAnchor.current) {
      setSelectedDay(anchor);
      setMonth(new Date(`${anchor}T12:00:00`));
      followedAnchor.current = anchor;
    }
  }, [anchor, nodes.length, selectedDay]);

  const showToast = useCallback((value: string) => {
    setToast(value);
    window.setTimeout(() => setToast(""), 3500);
  }, []);

  const toggleTheme = useCallback(() => {
    setDark((current) => {
      const next = !current;
      document.documentElement.dataset.theme = next ? "dark" : "light";
      localStorage.setItem("splicer-theme", next ? "dark" : "light");
      return next;
    });
  }, []);

  const saveChanges = useCallback(
    (codes: string[], changes: Partial<SplicerNode>) => {
      setSaving(true);
      setError("");
      try {
        if (!codes.length) throw new Error("Select at least one node.");
        const next = nodes.map((node) => (codes.includes(node.code) ? { ...node, ...changes } : node));
        writeStoredNodes(next);
        setNodes(next);
        setEditing(null);
        setBatchOpen(false);
        setSelectedCodes([]);
        showToast("Changes saved");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Couldn’t save");
      } finally {
        setSaving(false);
      }
    },
    [nodes, showToast],
  );

  const openBatch = useCallback(
    (options?: { mode?: BatchMode; codes?: string[] }) => {
      setBatchOpen(true);
      setBatchModeState(options?.mode ?? "complete");
      setBatchDate(today);
      setBatchPay("");
      setError("");
      if (options?.codes) setSelectedCodes(options.codes);
    },
    [today],
  );

  const setBatchMode = useCallback((mode: BatchMode) => {
    setBatchModeState(mode);
    setSelectedCodes([]);
  }, []);

  const saveRoute = useCallback((plan: RoutePlan) => {
    setRoutePlans((current) => {
      const next = { ...current, [plan.day]: plan };
      writeRoutePlans(next);
      return next;
    });
    showToast(plan.saved ? "Saved on this device" : "Preview updated");
  }, [showToast]);

  const refresh = useCallback(() => {
    setNodes(readStoredNodes());
    setToday(chicagoToday());
    setRoutePlans(readRoutePlans());
    showToast("Information updated");
  }, [showToast]);

  const lock = useCallback(() => {
    clearSession();
    onLock();
  }, [onLock]);

  const toggleCode = useCallback((code: string) => {
    setSelectedCodes((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]));
  }, []);

  const value: SplicerState = {
    nodes,
    today,
    tab,
    setTab,
    query,
    setQuery,
    filter,
    setFilter,
    calendarMode,
    setCalendarMode,
    month,
    setMonth,
    selectedDay,
    setSelectedDay,
    anchor,
    selectedCodes,
    setSelectedCodes,
    toggleCode,
    editing,
    setEditing,
    batchOpen,
    batchMode,
    setBatchMode,
    batchDate,
    setBatchDate,
    batchPay,
    setBatchPay,
    openBatch,
    closeBatch: () => setBatchOpen(false),
    saving,
    error,
    setError,
    toast,
    showToast,
    dark,
    toggleTheme,
    saveChanges,
    routePlans,
    saveRoute,
    routeMode,
    setRouteMode,
    lock,
    refresh,
  };

  return (
    <SplicerContext.Provider value={value}>
      {children}
      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}
    </SplicerContext.Provider>
  );
}
