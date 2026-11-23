# No-Touch Information Flow Explorer

Interactive diagram web app for a KTH group presentation in ML2305 Production Logistics and Supply Chains
(technology: Industrial and Collaborative Robots, stationary robots).

> Status: Phase 1 (diagram engine). Description, screenshots and live link are added in Phase 4.

## Content rule

All descriptive content lives in [`src/data/content.json`](src/data/content.json).
Empty fields are shown in the UI with a visible **"Not filled in yet"** badge. Do not put example or
placeholder text in this file.

## Diagram (driven by content.json)

- `lanes`: floors as horizontal swimlanes (`id`, `label`, `order`). Empty = one unnamed lane with a
  "Floors not filled in yet" badge. Nodes are placed in a lane via `laneId`.
- `edges`: `kind` is `material` (solid) or `information` (dashed). `origin` records where the edge comes
  from (the two material edges Receiving → Storage → Production floors are marked `"structural, from case"`).
- `views`: each entry is one toggle button. `sharedInformationLayer` merges the information islands into
  one layer, `visibleNodeIds` / `visibleEdgeIds` (empty = all) choose what is shown, and
  `manualHandlingMarkers` (`targetId` = node or edge id, `note`) place manual-handling markers.
- Columns are computed from the material flow; no coordinates are stored.

Controls: scroll to zoom, drag to pan, `+` `-` `0` and arrow keys on the focused canvas, Tab between
elements, Enter/Space to select, Esc to clear.

## Dev fixture (not real content)

`src/data/dev-fixture.json` exists only to exercise the diagram engine. Open it with
`npm run dev` and `http://localhost:5173/?fixture=dev`. The page shows a red
"DEV FIXTURE - NOT REAL CONTENT" banner. The fixture is loaded behind `import.meta.env.DEV`, so it is
never part of the production build and never written into content.json.

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
