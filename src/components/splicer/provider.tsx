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
  type CrewName,
  type CrewRole,
  type RoutePlan,
  type SplicerNode,
  type TabId,
} from "@/lib/splicer";

type BatchMode = "complete" | "schedule" | "payment" | "received";

type SplicerState = {
  person: CrewName;
  role: CrewRole;
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
  batchPerson: CrewName;
  setBatchPerson: (person: CrewName) => void;
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
  replaceRecords: (nodes: SplicerNode[], routes: Record<string, RoutePlan>) => void;
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

export function SplicerProvider({ person, role, children, onLock }: { person: CrewName; role: CrewRole; children: ReactNode; onLock: () => void }) {
  const [nodes, setNodes] = useState<SplicerNode[]>(() => readStoredNodes());
  const [today, setToday] = useState(() => chicagoToday());
  const [tab, setTab] = useState<TabId>("today");
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
  const [batchPerson, setBatchPerson] = useState<CrewName>(person);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [dark, setDark] = useState(false);
  const [routePlans, setRoutePlans] = useState<Record<string, RoutePlan>>(() => readRoutePlans());
  const [routeMode, setRouteMode] = useState<"team" | "individual">("team");
  const followedAnchor = useRef("");
  const booted = useRef(false);
  const revisionRef = useRef<string | null>(null);
  const saveSeq = useRef(0);
  const syncRef = useRef<
    (nodes: SplicerNode[], routes: Record<string, RoutePlan>) => Promise<{ conflict?: boolean; updatedAt?: string | null; nodes?: SplicerNode[]; routes?: Record<string, RoutePlan> }>
  >(async () => ({}));
  const applyRef = useRef<(data: { nodes?: SplicerNode[]; routes?: Record<string, RoutePlan> }) => void>(() => undefined);
  const lockRef = useRef(onLock);

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

  const applyRemote = useCallback((data: { nodes?: SplicerNode[]; routes?: Record<string, RoutePlan> }) => {
    if (data.nodes?.length) {
      setNodes(data.nodes);
      writeStoredNodes(data.nodes);
    }
    if (data.routes) {
      setRoutePlans(data.routes);
      writeRoutePlans(data.routes);
    }
  }, []);

  const syncRecords = useCallback(
    async (nextNodes: SplicerNode[], nextRoutes: Record<string, RoutePlan>) => {
      writeStoredNodes(nextNodes);
      writeRoutePlans(nextRoutes);
      const response = await fetch("/api/records", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes: nextNodes, routes: nextRoutes, baseUpdatedAt: revisionRef.current }),
      });
      if (response.status === 401) {
        onLock();
        throw new Error("Sign in again.");
      }
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        updatedAt?: string | null;
        nodes?: SplicerNode[];
        routes?: Record<string, RoutePlan>;
      };
      if (response.status === 409) {
        if (data.updatedAt) revisionRef.current = data.updatedAt;
        return { ...data, conflict: true as const };
      }
      if (!response.ok) throw new Error(data.error || "Saved on this phone. The backup didn’t update.");
      if (data.updatedAt) revisionRef.current = data.updatedAt;
      return { ...data, conflict: false as const };
    },
    [onLock],
  );

  syncRef.current = syncRecords;
  applyRef.current = applyRemote;
  lockRef.current = onLock;

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const seq = saveSeq.current;
    const localNodes = readStoredNodes();
    const localRoutes = readRoutePlans();
    void fetch("/api/records")
      .then(async (response) => {
        if (saveSeq.current !== seq) return;
        if (response.status === 401) {
          lockRef.current();
          return;
        }
        if (!response.ok) return;
        const data = (await response.json()) as { updatedAt?: string | null; nodes?: SplicerNode[]; routes?: Record<string, RoutePlan> };
        if (saveSeq.current !== seq) return;
        if (data.updatedAt && data.nodes?.length) {
          revisionRef.current = data.updatedAt;
          applyRef.current(data);
          return;
        }
        const saved = await syncRef.current(localNodes, localRoutes);
        if (saveSeq.current !== seq) return;
        if (saved.updatedAt) revisionRef.current = saved.updatedAt;
        applyRef.current(saved);
      })
      .catch(() => undefined);
  }, []);

  const saveChanges = useCallback(
    (codes: string[], changes: Partial<SplicerNode>) => {
      setSaving(true);
      setError("");
      if (!codes.length) {
        setError("Select at least one node.");
        setSaving(false);
        return;
      }
      const next = nodes.map((node) => (codes.includes(node.code) ? { ...node, ...changes } : node));
      const seq = ++saveSeq.current;
      setNodes(next);
      setEditing(null);
      setBatchOpen(false);
      setSelectedCodes([]);
      void syncRecords(next, routePlans)
        .then(async (data) => {
          let saved = data;
          if (saved.conflict && saved.nodes) {
            const merged = saved.nodes.map((node) => (codes.includes(node.code) ? { ...node, ...changes } : node));
            saved = await syncRecords(merged, saved.routes ?? routePlans);
          }
          if (saveSeq.current !== seq) return;
          if (saved.conflict) {
            applyRemote(saved);
            setError("The records changed. The latest copy is loaded.");
            return;
          }
          applyRemote(saved);
          showToast("Changes saved");
        })
        .catch((caught) => {
          if (saveSeq.current !== seq) return;
          setError(caught instanceof Error ? caught.message : "Couldn’t save");
        })
        .finally(() => {
          if (saveSeq.current === seq) setSaving(false);
        });
    },
    [applyRemote, nodes, routePlans, showToast, syncRecords],
  );

  const openBatch = useCallback(
    (options?: { mode?: BatchMode; codes?: string[] }) => {
      setBatchOpen(true);
      setBatchModeState(options?.mode ?? "complete");
      setBatchDate(today);
      setBatchPay("");
      setBatchPerson(person);
      setError("");
      if (options?.codes) setSelectedCodes(options.codes);
    },
    [person, today],
  );

  const setBatchMode = useCallback((mode: BatchMode) => {
    setBatchModeState(mode);
    setSelectedCodes([]);
  }, []);

  const saveRoute = useCallback(
    (plan: RoutePlan) => {
      if (role !== "admin") {
        showToast("Daniel saves the day’s split");
        return;
      }
      const next = { ...routePlans, [plan.day]: plan };
      const seq = ++saveSeq.current;
      setRoutePlans(next);
      void syncRecords(nodes, next)
        .then((data) => {
          if (saveSeq.current !== seq) return;
          if (data.conflict) {
            applyRemote(data);
            setError("The records changed. The latest copy is loaded.");
            return;
          }
          applyRemote(data);
          showToast(plan.saved ? "Saved, and backed up" : "Preview updated");
        })
        .catch((caught) => setError(caught instanceof Error ? caught.message : "Couldn’t save the route"));
    },
    [applyRemote, nodes, role, routePlans, showToast, syncRecords],
  );

  const replaceRecords = useCallback(
    (nextNodes: SplicerNode[], nextRoutes: Record<string, RoutePlan>) => {
      setNodes(nextNodes);
      setRoutePlans(nextRoutes);
      writeStoredNodes(nextNodes);
      writeRoutePlans(nextRoutes);
    },
    [],
  );

  const refresh = useCallback(() => {
    setToday(chicagoToday());
    void fetch("/api/records")
      .then(async (response) => {
        if (response.status === 401) {
          onLock();
          return;
        }
        if (!response.ok) {
          showToast("Couldn’t refresh");
          return;
        }
        const data = (await response.json()) as { updatedAt?: string | null; nodes?: SplicerNode[]; routes?: Record<string, RoutePlan> };
        if (data.updatedAt && data.nodes?.length) {
          revisionRef.current = data.updatedAt;
          applyRemote(data);
        }
        else {
          setNodes(readStoredNodes());
          setRoutePlans(readRoutePlans());
        }
        showToast("Information updated");
      })
      .catch(() => showToast("Couldn’t refresh"));
  }, [applyRemote, onLock, showToast]);

  const lock = useCallback(() => {
    clearSession();
    void fetch("/api/session", { method: "DELETE" });
    onLock();
  }, [onLock]);

  const toggleCode = useCallback((code: string) => {
    setSelectedCodes((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]));
  }, []);

  const value: SplicerState = {
    person,
    role,
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
    batchPerson,
    setBatchPerson,
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
    replaceRecords,
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
