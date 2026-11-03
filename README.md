# Splicer · Optimum

Operations board for Optimum Fiber / Paige Communications. Today’s route opens first, then the week, the nodes, and each person’s billing.

The board is in English, with a navy and copper workspace. Daniel, Iván, and Chris each sign in with their own access code. The code is checked on the server, the phone stays signed in for 7 days, and five wrong codes lock sign-in for 15 minutes. A route is six stops, grouped by how close the nodes are. Unfinished stops stay at the front of that person's next day, then nearby open nodes fill the list back to six. Daniel and Iván split each day's $350 nodes in half. Chris is paid $300 for his own nodes, and his screens do not show the $350 rate. The billing tab shows only that person's share.

Daniel can edit payment dates, invoices, the day’s split, and backups. Iván and Chris can log completions in their own name. Each save updates a server copy under `.data/`, which is not committed. Daniel can download or restore that backup from Billing.

Access codes: Daniel **5796**, Iván **6841**, Chris **9135**. On an iPhone, Today has a Navigate button that opens driving directions.

On an iPhone, open https://paigesplicer.loca.lt/go. The first screen shows an IP address. Type that number and tap Continue, then enter the access code. That page is a short form with today’s stops, Navigate, and a button to mark the next stop finished. It does not download the full board. The address stays `paigesplicer.loca.lt`. `scripts/keep-board-up.sh` restarts the board if it stops answering, and it reopens that same address. The address in use is written to `/tmp/splicer-public-url.txt`.

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
