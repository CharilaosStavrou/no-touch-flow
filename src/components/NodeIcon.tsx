import type { NodeTypeId } from '../lib/content'

/** 24x24 line icons, one per node type. Drawn with currentColor. */
export function NodeIcon({ type, x, y, size = 24 }: { type: NodeTypeId; x: number; y: number; size?: number }) {
  const s = size / 24
  return (
    <g
      transform={`translate(${x},${y}) scale(${s})`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[type] ?? ICONS['process-area']}
    </g>
  )
}

const ICONS: Record<NodeTypeId, React.ReactNode> = {
  // building with roller door
  'process-area': (
    <>
      <path d="M3 21V9l9-5 9 5v12" />
      <path d="M7 21v-8h10v8" />
      <path d="M7 16h10" />
    </>
  ),
  // pallet: deck boards and blocks
  'load-carrier': (
    <>
      <path d="M2 10h20M2 14h20" />
      <path d="M4 14v5M12 14v5M20 14v5" />
      <path d="M3 19h18" />
      <path d="M6 10V6h12v4" />
    </>
  ),
  // stacked database
  'information-item': (
    <>
      <ellipse cx="12" cy="5.5" rx="7" ry="2.5" />
      <path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13" />
      <path d="M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
    </>
  ),
  // stationary articulated robot arm on a base
  'stationary-robot-station': (
    <>
      <path d="M4 21h10" />
      <path d="M6 21v-3h6v3" />
      <path d="M9 18l3-7" />
      <circle cx="12" cy="11" r="1.6" />
      <path d="M12 11l6-4" />
      <circle cx="18" cy="7" r="1.4" />
      <path d="M18 7l2 3M18 7l3-1" />
    </>
  ),
}

/** Small hand glyph used for manual-handling / manual-data-entry markers. */
export function HandGlyph() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 13V5.5a1.2 1.2 0 0 1 2.4 0V11" />
      <path d="M10.4 11V4.2a1.2 1.2 0 0 1 2.4 0V11" />
      <path d="M12.8 11V5a1.2 1.2 0 0 1 2.4 0v6.5" />
      <path d="M15.2 8.5a1.2 1.2 0 0 1 2.4 0V14a6 6 0 0 1-6 6h-.6a5.6 5.6 0 0 1-4.3-2l-3-3.6a1.3 1.3 0 0 1 2-1.6L8 15" />
    </g>
  )
}
