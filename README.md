# Strand

Operations board for Optimum Fiber / Paige Communications. Overview opens first, with the routes, calendar, nodes, personal billing, Stats, and Settings available from navigation.

The board is in English, with a navy and copper workspace. Daniel, Iván, and Chris each sign in with their own access code. The code is checked on the server, the phone stays signed in for 7 days, and five wrong codes lock sign-in for 15 minutes. Daily route targets are Daniel 5, Iván 5, and Chris 3 stops, grouped by how close the nodes are. Unfinished stops stay at the front of that person's next day, then nearby eligible nodes fill each person’s daily target. Daniel and Iván split each day's $350 nodes in half. Chris’s profile shows completed-node counts only; his rate is not recorded. The billing tab shows only that person's share.

Daniel can edit payment dates, invoices, the day’s split, and backups. Iván and Chris can log completions in their own name. Each save updates a server copy under `.data/`, which is not committed. Daniel can download or restore that backup from Billing.

Access codes: Daniel **5796**, Iván **6841**, Chris **9135**. On an iPhone, Today has a Navigate button that opens driving directions.

On an iPhone, open the Render address (it stays the same). It is the full board: Today, the calendar, every node, the route, and billing.

## Permanent site (Render)

Render keeps one HTTPS address. Nodes and maps are stored on a disk so they survive deploys. That disk needs Render’s cheapest paid web plan (0.5 CPU / 512 MB), not the free plan.

1. Put this repo on GitHub (private is fine). Render cannot pull from Origin directly.
2. Create an account at [render.com](https://dashboard.render.com/register) and sign in with GitHub.
3. New → Blueprint, pick the repo, apply `render.yaml`.
4. Wait for the deploy. The board is `https://optimum-splicer.onrender.com` (Render adds a suffix if that name is taken).
5. Sign in as Daniel. If this machine’s live records are not there yet, restore a backup from Billing.

If you send a Render API key, the deploy can be finished from here. Until Render is live, a temporary tunnel on this machine will keep dying.

Map PDFs open from **View PDF**. On this machine they are cached under `public/maps` when the original board is reachable. Those files are large and are not part of the git history.

## Run locally

```bash
npm install
npm run dev -- --port 3847
```

Open [http://localhost:3847](http://localhost:3847) and enter PIN **5796**. The sign-in lasts 7 days.

Production:

```bash
npm run build
npm run start -- --port 3847 --hostname 0.0.0.0
```

## Stack

Next.js (App Router), TypeScript, and the splicer layout (DM Sans and Manrope).

## Settings and cycle payments

Settings (including the top-right gear) saves theme, accent, density, default view, overview panels, and navigation-app preferences per profile on the current device.

Daniel can record unpaid, partial, or full payments for his or Iván’s individual share of a billing cycle. Partial amounts include cents. Received amount, date, and notes are saved on Render and included in backups. These totals do not mark every individual node paid. Other profiles cannot edit cycle payments; each splicer sees only their own financial receipts. Chris continues to see production counts only.

Stats has Daily, Weekly, Monthly, and All Time comparison views with charts.

## Master profile

PIN **0000** opens a separate Master administrator profile. Its Overview combines all three workers, their completion lists and routes, and Daniel’s and Iván’s individual cycle balances. Master can update both billing profiles, save routes, edit records, and manage backups. Master is not a worker and is not included in production counts or route allocation. Chris’s production remains counts-only.
