# Splicer · Optimum

Operations board for Optimum Fiber / Paige Communications. Calendar, nodes, the Daniel and Iván route, and billing at $350 per node.

The board keeps the Optimum node calendar, route, and billing, in English, with a navy and copper workspace. Daniel, Iván, and Chris each sign in with their own access code. A route is six stops, grouped by how close the nodes are. Unfinished stops stay at the front of that person's next day, then nearby open nodes fill the list back to six. Daniel and Iván split each day's $350 nodes in half. Chris is paid $300 for his own nodes. The billing tab shows only that person's share.

Access codes: Daniel **5796**, Iván **6841**, Chris **9135**. Edits stay on this device (they are not written back to the original server). On an iPhone, the node sheet also opens Apple Maps and can copy coordinates.

Map PDFs open from **View PDF**. On this machine they are cached under `public/maps` when the original board is reachable. Those files are large and are not part of the git history.

## Run locally

```bash
npm install
npm run dev -- --port 3847
```

Open [http://localhost:3847](http://localhost:3847) and enter PIN **5796**. The browser remembers it for 30 days.

Production:

```bash
npm run build
npm run start -- --port 3847 --hostname 0.0.0.0
```

## Stack

Next.js (App Router), TypeScript, and the splicer layout (DM Sans and Manrope).
