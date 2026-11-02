# Optimum Nodes

PIN-gated board for Optimum production. Each node pays $350. The Nodes tab holds the week from Anthoney: when you can start, the due date, the map, and coordinates.

## Features

- **PIN access** with on-screen keypad (demo PIN `4826`, remembered for 30 days)
- **Overview** — live jobs, crew presence, splice progress, overdue cash
- **Calendar** — week board with job detail, crew, and notes
- **Production** — splice log with loss (dB), grades, and filters
- **Billing** — drafts, send, mark paid, outstanding totals

## Run locally

```bash
npm install
npm run dev -- --port 3847
```

Open [http://localhost:3847](http://localhost:3847) and enter PIN **4826**.

On iPhone, open the same site in Safari (a public link is printed when the tunnel is running). Tap **Share → Add to Home Screen** to launch Strand full screen. The phone layout uses a bottom tab bar and respects the notch and home indicator.

## Stack

Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui.
