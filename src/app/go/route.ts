import { connection } from "next/server";

function home(request: Request) {
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").split(",")[0]?.trim() || "";
  const name = host.split(":")[0] ?? "";
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const https =
    forwarded === "https" ||
    name.endsWith(".trycloudflare.com") ||
    name.endsWith(".lhr.life") ||
    name.endsWith(".loca.lt") ||
    name.endsWith(".serveousercontent.com") ||
    name.endsWith(".serveo.net");
  const proto = https ? "https" : "http";
  return new Response(null, {
    status: 307,
    headers: { location: `${proto}://${host}/`, "cache-control": "no-store" },
  });
}

export async function GET(request: Request) {
  await connection();
  return home(request);
}

export async function POST(request: Request) {
  await connection();
  return home(request);
}
