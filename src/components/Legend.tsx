import { HandGlyph, NodeIcon } from './NodeIcon'
import type { NodeTypeId } from '../lib/content'

const TYPES: { id: NodeTypeId; label: string }[] = [
  { id: 'process-area', label: 'Process area' },
  { id: 'load-carrier', label: 'Load carrier' },
  { id: 'information-item', label: 'Information item' },
  { id: 'stationary-robot-station', label: 'Stationary robot station' },
]

/** Explains the visual encoding only; contains no case content. */
export function Legend() {
  return (
    <ul className="legend" aria-label="Legend">
      <li>
        <svg width="44" height="14" aria-hidden="true">
          <line x1="2" y1="7" x2="36" y2="7" className="legend-material" />
          <path d="M34,2 L42,7 L34,12 z" className="arrow-material" />
        </svg>
        Material flow
      </li>
      <li>
        <svg width="44" height="14" aria-hidden="true">
          <line x1="2" y1="7" x2="36" y2="7" className="legend-information" />
          <path d="M34,2 L42,7 L34,12 z" className="arrow-information" />
        </svg>
        Information flow
      </li>
      <li>
        <svg width="22" height="22" viewBox="0 0 26 26" aria-hidden="true" className="legend-marker">
          <circle cx="13" cy="13" r="13" />
          <g transform="translate(1,1)">
            <HandGlyph />
          </g>
        </svg>
        Manual handling
      </li>
      {TYPES.map((t) => (
        <li key={t.id}>
          <svg width="22" height="22" aria-hidden="true" className="legend-icon">
            <NodeIcon type={t.id} x={0} y={0} size={22} />
          </svg>
          {t.label}
        </li>
      ))}
    </ul>
  )
}
