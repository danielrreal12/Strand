"use client";

import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  Clock,
  Download,
  Layers,
  MapPin,
  Moon,
  Plus,
  Radio,
  Receipt,
  RefreshCw,
  Sun,
  Wallet,
  X,
} from "lucide-react";
import {
  PAY_PER_NODE,
  activeNodes,
  billable,
  downloadCsv,
  money,
  type TabId,
} from "@/lib/splicer";
import { WeekCharts } from "./calendar";
import { useSplicer } from "./provider";

const NAV: { id: TabId; label: string; icon: typeof CalendarDays }[] = [
  { id: "calendar", label: "Calendario", icon: CalendarDays },
  { id: "nodes", label: "Nodos", icon: Layers },
  { id: "routes", label: "Mapa y ruta", icon: MapPin },
  { id: "billing", label: "Billing", icon: Receipt },
];

const TABS: { id: TabId; label: string }[] = [
  { id: "calendar", label: "Calendario" },
  { id: "nodes", label: "Todos los nodos" },
  { id: "routes", label: "Mapa y ruta" },
  { id: "billing", label: "Billing y pagos" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const splicer = useSplicer();
  const active = activeNodes(splicer.nodes);
  const completed = active.filter((node) => node.status === "completed");
  const generated = completed.filter(billable);
  const receivable = generated.filter((node) => !node.paidDate);
  const paid = generated.filter((node) => node.paidDate);
  const open = active.filter((node) => node.status !== "completed");
  const progress = active.length ? (completed.length / active.length) * 100 : 0;
  const titles: Record<TabId, [string, string]> = {
    calendar: ["Tu operación, en calendario.", "Organiza el trabajo. Registra avances. Ten claridad de lo que viene."],
    routes: ["Tu jornada, punto por punto.", "Visualiza los nodos y prepara tu recorrido del día."],
    nodes: ["Cada nodo, bajo control.", "Mapas, ubicaciones y seguimiento de cada asignación."],
    billing: ["El trabajo se convierte en ingresos.", "Controla tu producción y conoce cuánto y cuándo vas a cobrar."],
  };
  const [title, subtitle] = titles[splicer.tab];

  return (
    <div className="shell">
      <aside>
        <a className="brand" href="/">
          <span className="brand-icon">
            <Activity size={25} />
          </span>
          splicer
          <span className="brand-dot">.</span>
        </a>
        <div className="workspace">
          <span className="project-icon">
            <Radio size={19} />
          </span>
          <div>
            <strong>Optimum Fiber</strong>
            <small>Paige Communications</small>
          </div>
          <span className="live-dot" />
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav>
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={splicer.tab === item.id ? "nav-active" : ""} onClick={() => splicer.setTab(item.id)}>
                <Icon size={19} />
                {item.label}
                {item.id === "nodes" ? <span>{active.length}</span> : null}
              </button>
            );
          })}
        </nav>
        <div className="side-note">
          <span className="live-dot" /> PROYECTO ACTIVO
          <strong>Cada conexión cuenta.</strong>
          <p>
            Tu operación y tus pagos,
            <br />
            en un mismo lugar.
          </p>
          <div className="fiber-lines">
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="profile">
          <div>AR</div>
          <span>
            <strong>Alex Ramirez</strong>
            <small>Administrador · Privado</small>
          </span>
        </div>
      </aside>
      <div className="main">
        <header>
          <div>
            <span className="breadcrumb">Workspace</span>
            <ChevronRight size={14} />
            <strong>Optimum Fiber</strong>
          </div>
          <span className="sync">
            <span className="live-dot" /> Guardado en este dispositivo
            <button className="theme-toggle" aria-label={splicer.dark ? "Activar modo claro" : "Activar modo oscuro"} aria-pressed={splicer.dark} title={splicer.dark ? "Modo claro" : "Modo oscuro"} onClick={splicer.toggleTheme}>
              {splicer.dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button title="Actualizar información" onClick={splicer.refresh}>
              <RefreshCw size={15} />
            </button>
            <button title="Cerrar sesión" aria-label="Cerrar sesión" onClick={splicer.lock}>
              Salir
            </button>
          </span>
        </header>
        <main>
          <div className="heading">
            <div>
              <div className="eyebrow">OPERACIONES DE FIBRA ÓPTICA</div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            <button className="primary" onClick={() => splicer.openBatch()}>
              <Plus size={18} />
              Registrar jornada
            </button>
          </div>
          {splicer.error && !splicer.editing && !splicer.batchOpen ? (
            <div className="error" role="alert">
              {splicer.error}
              <button onClick={() => splicer.setError("")} aria-label="Cerrar aviso">
                <X size={16} />
              </button>
            </div>
          ) : null}
          <div className="stats">
            <div className="stat">
              <span>
                Nodos completados
                <CircleCheck size={18} />
              </span>
              <strong>
                {completed.length}
                <em>/ {active.length}</em>
              </strong>
              <div className="progress">
                <i style={{ width: `${progress}%` }} />
              </div>
              <small>{open.length} pendientes de completar</small>
            </div>
            <div className="stat">
              <span>
                Generado
                <ArrowUpRight size={18} />
              </span>
              <strong>
                {money(generated.length * PAY_PER_NODE)}
                <em>USD</em>
              </strong>
              <small>{generated.length} nodos × $350 por nodo</small>
            </div>
            <div className="stat">
              <span>
                Por cobrar
                <Clock size={18} />
              </span>
              <strong>
                {money(receivable.length * PAY_PER_NODE)}
                <em>USD</em>
              </strong>
              <small>{receivable.filter((node) => !node.payDate).length} nodos sin fecha de pago</small>
            </div>
            <div className="stat green">
              <span>
                Pago recibido
                <Wallet size={18} />
              </span>
              <strong>
                {money(paid.length * PAY_PER_NODE)}
                <em>USD</em>
              </strong>
              <small>{paid.length} nodos pagados y confirmados</small>
            </div>
          </div>
          {splicer.tab === "calendar" ? <WeekCharts /> : null}
          <div className="section-title">
            <div className="tabs">
              {TABS.map((item) => (
                <button key={item.id} className={splicer.tab === item.id ? "current" : ""} onClick={() => splicer.setTab(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            <button className="text-button" onClick={() => downloadCsv(splicer.nodes, splicer.today)}>
              <Download size={16} /> Exportar CSV
            </button>
          </div>
          {children}
          <div className="bottom-note">
            <span>
              <Radio size={14} /> {active.length} nodos activos · {active.filter((node) => node.map).length} mapas disponibles · Bryan / College Station, TX
            </span>
            <span>Los pagos se confirman manualmente.</span>
          </div>
        </main>
      </div>
    </div>
  );
}
