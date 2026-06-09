# SpendLedger — Personal Finance Tracker

A clean, fast personal finance & expense tracker PWA built with React 18 + Vite and deployed to GitHub Pages. Track income and expenses with custom categories, visualize spending patterns, and sync across devices via Firebase Firestore.

## Features

- **Dashboard** — balance overview, stat cards, running balance chart, monthly income/expenses chart, recent entries
- **History** — full entry table with filtering by category, type, date range, and search; sortable columns; pagination
- **Analytics** — spending by category donut chart, top categories ranked with progress bars, monthly trend per category, income vs expenses bar chart, monthly summary table
- **Settings** — category manager (custom name, color, icon), export/import JSON, reset all data, admin account management
- **Auth** — persistent sessions with 30-day expiry, synced to Firestore
- **Custom categories** — user-defined with 10 color options and 15 emoji icons; seeded with 6 defaults on first use
- **Firestore sync** — real-time onSnapshot with localStorage caching for instant loads
- **Dark theme** — Space Grotesk + DM Sans fonts, `#0f1117` background

## Tech Stack

- React 18 + Vite
- Tailwind CSS v3
- Recharts
- Firebase Firestore
- date-fns, uuid
- gh-pages

## 🔗 Links

- **Live app:** https://tommyhanono.github.io/spend-ledger/
- **Repository:** https://github.com/tommyhanono/spend-ledger
