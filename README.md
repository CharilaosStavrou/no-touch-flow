# No-Touch Information Flow Explorer

Interactive diagram web app for a KTH group presentation in ML2305 Production Logistics and Supply Chains
(technology: Industrial and Collaborative Robots, stationary robots).

> Status: Phase 0 (scaffold). Description, screenshots and live link are added in Phase 4.

## Content rule

All descriptive content lives in [`src/data/content.json`](src/data/content.json).
Empty fields are shown in the UI with a visible **"Not filled in yet"** badge. Do not put example or
placeholder text in this file.

## Develop

```bash
npm install
npm run dev
```

```bash
npm run build
npm run lint
```

## Stack

React + Vite + TypeScript, custom SVG diagram, no backend.
