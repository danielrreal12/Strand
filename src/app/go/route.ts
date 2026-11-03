import { connection } from "next/server";
import { memberById, memberByPin } from "@/lib/crew.server";
import { judgeAttempt, sessionSecret, signToken, currentSession, SESSION_COOKIE, SESSION_DAYS, type AttemptState } from "@/lib/session.server";
import { readStore, writeStore } from "@/lib/store.server";
import {
  ROUTE_FOCUS_DAY,
  chicagoToday,
  driveTo,
  formatShort,
  googleDriveTo,
  mergeNodeEdit,
  money,
  personalTotal,
  routeForDay,
  weekBounds,
  type CrewName,
  type SplicerNode,
} from "@/lib/splicer";

const attempts = new Map<string, AttemptState>();

function esc(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function page(body: string) {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Splicer</title><style>
    body{margin:0;background:#f3f5f8;color:#172033;font:17px system-ui,sans-serif}
    main{max-width:420px;margin:0 auto;padding:22px 16px 40px}
    h1{font-size:28px;margin:8px 0}p,li{line-height:1.4}
    .card{background:#fff;border:1px solid #e3e7ef;border-radius:16px;padding:16px;margin:12px 0}
    button,a.nav{display:block;width:100%;box-sizing:border-box;text-align:center;text-decoration:none;background:#1b3a63;color:#fff;border:0;border-radius:12px;padding:16px;font:600 18px system-ui,sans-serif;margin-top:10px}
    a.alt{background:#c4622d}
    input{width:100%;box-sizing:border-box;font-size:28px;letter-spacing:.4em;text-align:center;padding:14px;border:1px solid #c5d0e0;border-radius:12px}
    .err{color:#9a3412;font-weight:600}
    small{color:#667085}
    form.out button{background:transparent;color:#1b3a63;padding:10px}
    </style></head><body><main>${body}</main></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}

function pinPage(error = "") {
  return page(`<p>OPTIMUM · PAIGE</p><h1>Splicer</h1><p>Enter your access code. Today’s route opens on this page.</p>${error ? `<p class="err">${esc(error)}</p>` : ""}<form method="post" action="/go"><label>Access code<br><input name="pin" inputmode="numeric" autocomplete="current-password" maxlength="4" required></label><button type="submit">Enter</button></form>`);
}

function cookieHeader(token: string, secure: boolean) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

function secureCookie(request: Request) {
  const host = request.headers.get("host") || "";
  return host.endsWith(".lhr.life") || host.endsWith(".trycloudflare.com") || request.headers.get("x-forwarded-proto") === "https";
}

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function GET() {
  await connection();
  const session = await currentSession();
  if (!session) return pinPage();
  return page(await board(session.id));
}

export async function POST(request: Request) {
  await connection();
  const form = await request.formData();
  const session = await currentSession();
  if (form.get("out")) {
    const secure = secureCookie(request) ? "; Secure" : "";
    return new Response(null, {
      status: 303,
      headers: { location: "/go", "set-cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}` },
    });
  }
  if (!session) {
    const ip = clientIp(request);
    const now = Date.now();
    const prior = attempts.get(ip) ?? { fails: 0, lockedUntil: 0 };
    if (prior.lockedUntil > now) return pinPage("Too many tries. Wait 15 minutes.");
    const pin = String(form.get("pin") ?? "").replace(/\D/g, "").slice(0, 4);
    const member = memberByPin(pin);
    const judged = judgeAttempt(prior, Boolean(member), now);
    attempts.set(ip, judged.state);
    if (!member) return pinPage(judged.locked ? "Too many tries. Wait 15 minutes." : "Wrong access code.");
    const token = signToken({ id: member.id, role: member.role, exp: now + SESSION_DAYS * 24 * 60 * 60 * 1000 }, await sessionSecret());
    return new Response(null, {
      status: 303,
      headers: { location: "/go", "set-cookie": cookieHeader(token, secureCookie(request)) },
    });
  }
  const code = String(form.get("done") ?? "");
  if (code) await finishStop(session.id, session.role, code);
  return new Response(null, { status: 303, headers: { location: "/go" } });
}

async function finishStop(actor: CrewName, role: "admin" | "splicer", code: string) {
  const store = await readStore();
  if (!store) return;
  const today = chicagoToday();
  const routeDay = today <= ROUTE_FOCUS_DAY ? ROUTE_FOCUS_DAY : today;
  const plan = routeForDay(routeDay, store.nodes, store.routes);
  if (!plan[actor].includes(code)) return;
  const current = store.nodes.find((node) => node.code === code);
  if (!current || current.status === "excluded") return;
  if (current.status === "completed" && current.completedBy && current.completedBy !== actor) return;
  const incoming: SplicerNode = { ...current, status: "completed", completed: chicagoToday(), completedBy: actor };
  const merged = mergeNodeEdit(current, incoming, role, actor);
  await writeStore({ ...store, nodes: store.nodes.map((node) => (node.code === code ? merged : node)) });
}

async function board(person: CrewName) {
  const store = await readStore();
  const profile = memberById(person);
  const today = chicagoToday();
  const routeDay = today <= ROUTE_FOCUS_DAY ? ROUTE_FOCUS_DAY : today;
  if (!store) return `<h1>Records are unavailable.</h1>`;
  const plan = routeForDay(routeDay, store.nodes, store.routes);
  const byCode = new Map(store.nodes.map((node) => [node.code, node]));
  const stops = plan[person].map((code) => byCode.get(code)).filter((node): node is SplicerNode => Boolean(node));
  const next = stops.find((node) => node.status !== "completed");
  const bounds = weekBounds(today);
  const weekNodes = store.nodes.filter((node) => node.status === "completed" && node.completed >= bounds.start && node.completed <= bounds.end);
  const mine = weekNodes.filter((node) => node.completedBy === person).length;
  const pay = personalTotal(weekNodes, person);
  const lines = stops
    .map((node, index) => {
      const done = node.status === "completed";
      return `<li><strong>${index + 1}. ${esc(node.code)}</strong> ${done ? "· finished" : ""}<br><small>${esc(node.job || "No Wise job")} · due ${esc(formatShort(node.due))}</small></li>`;
    })
    .join("");
  const nextBlock = next
    ? `<div class="card"><small>Next stop · ${esc(formatShort(routeDay))}</small><h1>${esc(next.code)}</h1><p>${esc(next.job || "No Wise job")} · due ${esc(formatShort(next.due))}<br>${esc(next.gps || "No coordinates")}</p>${driveTo(next) ? `<a class="nav" href="${esc(driveTo(next))}">Navigate</a>` : ""}<a class="nav alt" href="${esc(googleDriveTo(next))}">Google Maps</a>${next.map ? `<a class="nav alt" href="/maps/${encodeURIComponent(next.map)}">Map PDF</a>` : ""}<form method="post" action="/go"><button name="done" value="${esc(next.code)}">Mark ${esc(next.code)} finished</button></form></div>`
    : `<div class="card"><h1>Route is clear.</h1><p>Nothing unfinished on your list for ${esc(formatShort(routeDay))}.</p></div>`;
  return `<p>OPTIMUM · PAIGE</p><h1>${esc(profile?.name || person)}</h1><p><small>Billing week ${esc(formatShort(bounds.start))}–${esc(formatShort(bounds.end))}, Friday through Thursday. ${mine} of yours finished. Your pay ${esc(money(pay))}.</small></p>${nextBlock}<div class="card"><h2>Your stops</h2><ol>${lines || "<li>No stops saved for you.</li>"}</ol></div><form class="out" method="post" action="/go"><button name="out" value="1">Sign out</button></form>`;
}
