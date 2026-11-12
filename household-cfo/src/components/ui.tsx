import { useId, useState, type FormEvent, type ReactNode } from "react";
import { answerQuestion } from "../ask";
import { useHousehold } from "../context";
import { clamp, parseNumber } from "../format";

export const DISCLAIMER =
  "Educational only. Not personalized financial advice, and not a broker. Alerts are mechanical rules on public prices and the figures saved in this browser. They ignore taxes, your job, and losses you cannot afford.";

export function Tag({ kind, children }: { kind: "live" | "sample" | "saved"; children: ReactNode }) {
  return <span className={`tag tag-${kind}`}>{children}</span>;
}

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <p className={compact ? "disclaimer compact" : "disclaimer"} data-testid="disclaimer">
      {DISCLAIMER}
    </p>
  );
}

export function EditableNumber({
  value,
  onChange,
  format,
  ariaLabel,
  testId,
  className,
  min,
  max,
}: {
  value: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  ariaLabel: string;
  testId?: string;
  className?: string;
  min?: number;
  max?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  if (!editing) {
    return (
      <button
        type="button"
        className={`editable ${className ?? ""}`}
        aria-label={ariaLabel}
        data-testid={testId}
        onClick={() => {
          setDraft(String(value));
          setEditing(true);
        }}
      >
        {format(value)}
      </button>
    );
  }
  return (
    <input
      autoFocus
      className={`edit-input ${className ?? ""}`}
      aria-label={ariaLabel}
      data-testid={testId ? `${testId}-input` : undefined}
      value={draft}
      inputMode="decimal"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const next = parseNumber(draft);
        if (next != null) onChange(clamp(next, min ?? -1e12, max ?? 1e12));
        setEditing(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") setEditing(false);
      }}
    />
  );
}

export function EditableText({
  value,
  onChange,
  ariaLabel,
  className,
  placeholder = "Add your name",
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (!editing) {
    return (
      <button type="button" className={`editable ${className ?? ""}`} aria-label={ariaLabel} onClick={() => { setDraft(value); setEditing(true); }}>
        {value.trim() ? value : placeholder}
      </button>
    );
  }
  return (
    <input
      autoFocus
      className={`edit-input ${className ?? ""}`}
      aria-label={ariaLabel}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const next = draft.trim();
        if (next) onChange(next);
        setEditing(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") setEditing(false);
      }}
    />
  );
}

export function LineArea({
  points,
  color,
  label,
}: {
  points: { label: string; value: number }[];
  color: string;
  label: string;
}) {
  const uid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) {
    return <p className="empty">The chart appears once price history loads.</p>;
  }
  const width = 720;
  const height = 220;
  const padL = 54;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const values = points.map((point) => point.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  min -= span * 0.08;
  max += span * 0.08;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const x = (index: number) => padL + (index / (points.length - 1)) * innerW;
  const y = (value: number) => padT + (1 - (value - min) / (max - min)) * innerH;
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"} ${x(index).toFixed(1)} ${y(point.value).toFixed(1)}`).join(" ");
  const area = `${line} L ${x(points.length - 1).toFixed(1)} ${(padT + innerH).toFixed(1)} L ${x(0).toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;
  const ticks = 4;
  const yTicks = Array.from({ length: ticks }, (_, index) => max - ((max - min) * index) / (ticks - 1));
  const xTicks = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
  const active = hover == null ? points.length - 1 : hover;

  function move(event: React.MouseEvent<SVGSVGElement>) {
    const svg = event.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const local = pt.matrixTransform(ctm.inverse());
    const ratio = (local.x - padL) / innerW;
    const index = Math.round(ratio * (points.length - 1));
    setHover(Math.min(points.length - 1, Math.max(0, index)));
  }

  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="chart"
        role="img"
        aria-label={label}
        onMouseMove={move}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {yTicks.map((tick, index) => (
          <g key={index}>
            <line x1={padL} x2={width - padR} y1={y(tick)} y2={y(tick)} className="grid-line" />
            <text x={padL - 8} y={y(tick) + 4} className="axis" textAnchor="end">
              {compact(tick)}
            </text>
          </g>
        ))}
        <path d={area} fill={`url(#fill-${uid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(active)} cy={y(points[active].value)} r="4.5" fill={color} stroke="#0c0d0f" strokeWidth="2" />
        {xTicks.map((index) => (
          <text key={index} x={x(index)} y={height - 8} className="axis" textAnchor="middle">
            {points[index].label}
          </text>
        ))}
      </svg>
      {hover != null && (
        <div className="chart-tip">
          <span>{points[hover].label}</span>
          <strong>{usd(points[hover].value)}</strong>
        </div>
      )}
    </div>
  );
}

function compact(n: number): string {
  const sign = n < 0 ? "−" : "";
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 10_000) return `${sign}$${Math.round(a / 1000)}k`;
  if (a >= 1000) return `${sign}$${(a / 1000).toFixed(1)}k`;
  return `${sign}$${Math.round(a)}`;
}

function usd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.abs(n) >= 1000 ? 0 : 2,
  }).format(n);
}

export function Spark({ values, up }: { values: number[]; up: boolean }) {
  if (values.length < 2) return <span className="spark empty-spark" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const d = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 72;
      const y = 22 - ((value - min) / span) * 18;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 72 26" className="spark" aria-hidden="true">
      <path d={d} fill="none" stroke={up ? "var(--green)" : "var(--red)"} strokeWidth="1.6" />
    </svg>
  );
}

export function AskBox({ compact = false }: { compact?: boolean }) {
  const { store, model, book } = useHousehold();
  const [question, setQuestion] = useState("");
  const [items, setItems] = useState<{ q: string; a: string }[]>([]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const q = question.trim();
    if (!q) return;
    const a = answerQuestion(q, { store, model, book });
    setItems((prev) => [...prev, { q, a }].slice(-5));
    setQuestion("");
  }

  return (
    <section className={compact ? "ask compact" : "ask"} data-testid="ask-box">
      <div className="card-h">
        <h2>Ask</h2>
        <span className="hint">Uses this household and the live quotes. No API key.</span>
      </div>
      <form onSubmit={submit} className="ask-form">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="What should I sell? Will dining overshoot?"
          aria-label="Ask about this household"
        />
        <button type="submit" className="btn">
          Ask
        </button>
      </form>
      <div className="ask-log">
        {items.map((item, index) => (
          <article key={`${item.q}-${index}`}>
            <p className="ask-q">{item.q}</p>
            <p className="ask-a">{item.a}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PageHead({ title, lede, extra }: { title: string; lede: string; extra?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        <p>{lede}</p>
      </div>
      {extra}
    </header>
  );
}

export function Meter({ value, max, hot }: { value: number; max: number; hot?: boolean }) {
  const width = max <= 0 ? 0 : Math.min(100, (value / max) * 100);
  return (
    <div className="meter" aria-hidden="true">
      <span className={hot ? "hot" : ""} style={{ width: `${width}%` }} />
    </div>
  );
}
