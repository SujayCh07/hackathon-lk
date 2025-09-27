# PPP Pocket

PPP Pocket is a minimalist travel-fintech playground that showcases how far your dollars stretch around the world with purchasing power parity (PPP) insights. The app is built with Vite, React 19, TailwindCSS, and animated routing via Framer Motion.

## Getting started

```bash
npm install
npm run dev
```

The development server will be available at the URL printed in your terminal (defaults to http://localhost:5173).

## Features

- Hero carousel with travel imagery and CTA into the dashboard.
- Dashboard with mock Capital One balance, transactions, PPP world map, and top city savings cards.
- GeoBudget planner with interactive budget slider and runway visualizations.
- Smart-Spend insights comparing category spending and PPP-adjusted savings with Recharts.
- Share page that exports PPP summaries as PNG or PDF via html2canvas and jsPDF.
- Mock data and hooks to simplify swapping in Supabase/Nessie APIs later.

## Tech stack

- Vite + React 19 (RC)
- TailwindCSS for styling
- React Router v6 + Framer Motion transitions
- Leaflet for world map visualization
- Recharts for comparison charts
- html2canvas + jsPDF for export actions

## Accessibility & design notes

- Travel-inspired color palette with high contrast.
- Semantic headings, focus states, and ARIA labelling on interactive elements.
- Responsive layouts across breakpoints.

Enjoy exploring how far your money can go globally with PPP Pocket!
