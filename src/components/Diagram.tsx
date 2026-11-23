import { useMemo, useRef } from 'react'
import type { Content, FlowEdge, FlowNode, View } from '../lib/content'
import { isEmpty } from '../lib/content'
import { computeLayout, HEADER_W, isInfoNode, lerpRect, type Rect } from '../lib/layout'
import { usePanZoom, useTween } from '../lib/hooks'
import { HandGlyph, NodeIcon } from './NodeIcon'

interface Props {
  content: Content
  view: View
  selectedId: string | null
  onSelect: (id: string | null) => void
}

const isVisible = (ids: string[], id: string) => ids.length === 0 || ids.includes(id)

/** Splits a label into at most two lines that fit the node width. */
function wrapLabel(label: string, maxChars = 18): string[] {
  if (label.length <= maxChars) return [label]
  const words = label.split(' ')
  const lines: string[] = ['']
  for (const w of words) {
    const cur = lines[lines.length - 1]
    if (cur && (cur + ' ' + w).length > maxChars && lines.length < 2) lines.push(w)
    else lines[lines.length - 1] = cur ? `${cur} ${w}` : w
  }
  return lines
}

function SvgBadge({ x, y, text }: { x: number; y: number; text: string }) {
  const w = text.length * 6.6 + 18
  return (
    <g className="svg-badge" transform={`translate(${x},${y})`} role="note" aria-label={text}>
      <rect width={w} height={22} rx={11} />
      <text x={w / 2} y={15} textAnchor="middle">
        {text}
      </text>
    </g>
  )
}

export function Diagram({ content, view, selectedId, onSelect }: Props) {
  const layout = useMemo(() => computeLayout(content), [content])
  const svgRef = useRef<SVGSVGElement>(null)
  const { pz, zoomCenter, panBy, reset, handlers } = usePanZoom(svgRef)
  const t = useTween(view.sharedInformationLayer ? 1 : 0)

  const nodeById = useMemo(() => new Map(content.nodes.map((n) => [n.id, n])), [content])
  const labelOf = (id: string): string => {
    const n = nodeById.get(id)
    if (n) return n.label
    const e = content.edges.find((x) => x.id === id)
    return e ? `${labelOf(e.from)} → ${labelOf(e.to)}` : id
  }

  const nodeVisible = (id: string) => isVisible(view.visibleNodeIds, id)
  const edgeVisible = (e: FlowEdge) =>
    isVisible(view.visibleEdgeIds, e.id) && nodeVisible(e.from) && nodeVisible(e.to)

  const infoNodes = content.nodes.filter(isInfoNode)

  // markers from every view are rendered so they can fade in and out
  const markers = content.views.flatMap((v) =>
    v.manualHandlingMarkers.map((m, i) => ({ ...m, key: `${v.id}:${m.targetId}:${i}`, active: v.id === view.id })),
  )
  const markerPos = (targetId: string): { x: number; y: number } | null => {
    const n = layout.nodes.get(targetId)
    if (n) return { x: n.rect.x + n.rect.w - 6, y: n.rect.y - 6 }
    const e = layout.edges.find((pe) => pe.edge.id === targetId)
    return e ? e.mid : null
  }

  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    const step = 40 / pz.k
    switch (e.key) {
      case '+':
      case '=':
        zoomCenter(1.2)
        break
      case '-':
      case '_':
        zoomCenter(1 / 1.2)
        break
      case '0':
        reset()
        break
      case 'Escape':
        onSelect(null)
        break
      default:
        if (e.target !== e.currentTarget) return
        if (e.key === 'ArrowLeft') panBy(step, 0)
        else if (e.key === 'ArrowRight') panBy(-step, 0)
        else if (e.key === 'ArrowUp') panBy(0, step)
        else if (e.key === 'ArrowDown') panBy(0, -step)
        else return
    }
    e.preventDefault()
  }

  const activate = (id: string) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      onSelect(id)
    }
  }

  // reading order: information band first, then lane by lane; inside a band column by column
  const bandOf = (r: Rect) => {
    const i = layout.lanes.findIndex((l) => r.y >= l.y && r.y < l.y + l.h)
    return i < 0 ? -1 : i
  }
  const byPosition = (a: Rect, b: Rect) => bandOf(a) - bandOf(b) || a.x - b.x || a.y - b.y
  const orderedNodes = [...layout.nodes.values()].sort((a, b) => byPosition(a.rect, b.rect))
  const nodeOrder = new Map(orderedNodes.map((n, i) => [n.node.id, i]))
  const orderedEdges = [...layout.edges].sort(
    (a, b) =>
      nodeOrder.get(a.edge.from)! - nodeOrder.get(b.edge.from)! || nodeOrder.get(a.edge.to)! - nodeOrder.get(b.edge.to)!,
  )

  const shared = layout.sharedLayer
  const infoCenters = infoNodes
    .map((n) => layout.nodes.get(n.id)?.rect)
    .filter((r): r is Rect => !!r)
    .map((r) => ({ x: r.x + r.w / 2, y: r.y + r.h }))
  const busY = shared.y + shared.h - 10

  return (
    <div className="diagram-wrap">
      <div className="zoom-controls" role="toolbar" aria-label="Zoom controls">
        <span className="zoom-hint" aria-hidden="true">
          Scroll to zoom, drag to pan. Keys: + − 0, arrows.
        </span>
        <button type="button" onClick={() => zoomCenter(1.2)} aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={() => zoomCenter(1 / 1.2)} aria-label="Zoom out">
          −
        </button>
        <button type="button" onClick={reset} aria-label="Reset zoom and pan">
          Reset
        </button>
      </div>

      <svg
        ref={svgRef}
        className="diagram"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        preserveAspectRatio="xMidYMin meet"
        tabIndex={0}
        role="group"
        aria-label={`Flow diagram, ${view.label} view. Plus and minus zoom, arrow keys pan, 0 resets. Tab moves through nodes, then flows; the focused element opens in the details panel.`}
        onKeyDown={onKeyDown}
        {...handlers}
      >
        <defs>
          <marker id="arrow-material" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className="arrow-material" />
          </marker>
          <marker id="arrow-information" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className="arrow-information" />
          </marker>
        </defs>

        <g transform={`translate(${pz.x},${pz.y}) scale(${pz.k})`}>
          {/* information band */}
          <g className="band band-info">
            <rect x={layout.infoBand.x} y={layout.infoBand.y} width={layout.infoBand.w} height={layout.infoBand.h} rx={10} />
            <text x={16} y={30} className="band-label">
              Information
            </text>
          </g>

          {/* lanes */}
          {layout.lanes.map((lane, i) => (
            <g key={lane.id} className={`band lane ${i % 2 ? 'lane-alt' : ''}`}>
              <rect x={lane.x} y={lane.y} width={lane.w} height={lane.h} />
              <line x1={HEADER_W - 12} x2={HEADER_W - 12} y1={lane.y + 8} y2={lane.y + lane.h - 8} className="lane-divider" />
              {lane.placeholder === 'floors-empty' ? (
                <SvgBadge x={8} y={lane.y + 14} text="Floors not filled in yet" />
              ) : lane.placeholder === 'lane-not-set' ? (
                <SvgBadge x={8} y={lane.y + 14} text="Lane not filled in yet" />
              ) : isEmpty(lane.label) ? (
                <SvgBadge x={8} y={lane.y + 14} text="Not filled in yet" />
              ) : (
                <text x={16} y={lane.y + 30} className="band-label">
                  {wrapLabel(lane.label, 14).map((l, li) => (
                    <tspan key={li} x={16} dy={li === 0 ? 0 : 18}>
                      {l}
                    </tspan>
                  ))}
                </text>
              )}
            </g>
          ))}

          {/* information islands morphing into one shared layer */}
          <g className="info-layer" aria-hidden="true">
            {infoNodes.map((n) => {
              const island = layout.islands.get(n.id)
              if (!island || !nodeVisible(n.id)) return null
              const r = lerpRect(island, shared, t)
              return (
                <rect
                  key={n.id}
                  className="island"
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  rx={14}
                  style={{ fillOpacity: 0.55 * (1 - t) }}
                />
              )
            })}
            <rect
              className="shared-layer"
              x={shared.x}
              y={shared.y}
              width={shared.w}
              height={shared.h}
              rx={14}
              style={{ opacity: t }}
            />
            <text x={shared.x + 14} y={shared.y + 20} className="shared-label" style={{ opacity: t }}>
              Shared information layer
            </text>
            {infoCenters.length > 1 && (
              <g className="bus" style={{ opacity: t }}>
                <line x1={infoCenters[0].x} x2={infoCenters[infoCenters.length - 1].x} y1={busY} y2={busY} />
                {infoCenters.map((c, i) => (
                  <line key={i} x1={c.x} x2={c.x} y1={c.y} y2={busY} />
                ))}
              </g>
            )}
          </g>

          {/* edge lines: painted under the nodes, not focusable */}
          <g aria-hidden="true">
            {orderedEdges.map(({ edge, path }) => {
              const visible = edgeVisible(edge)
              return (
                <path
                  key={edge.id}
                  d={path}
                  className={`edge-line edge-line-${edge.kind} ${selectedId === edge.id ? 'is-selected' : ''}`}
                  markerEnd={`url(#arrow-${edge.kind})`}
                  style={{ opacity: visible ? 1 : 0 }}
                />
              )
            })}
          </g>

          {/* nodes (Tab order 1: top to bottom, left to right) */}
          {orderedNodes.map(({ node, rect }) => (
            <DiagramNode
              key={node.id}
              node={node}
              rect={rect}
              typeLabel={content.nodeTypes.find((nt) => nt.id === node.type)?.label ?? node.type}
              visible={nodeVisible(node.id)}
              selected={selectedId === node.id}
              onSelect={() => onSelect(node.id)}
              onKeyDown={activate(node.id)}
            />
          ))}

          {/* edge hit areas (Tab order 2): after the nodes so focus visits nodes first */}
          {orderedEdges.map(({ edge, path }) => {
            const visible = edgeVisible(edge)
            const selected = selectedId === edge.id
            const kindLabel = edge.kind === 'material' ? 'Material flow' : 'Information flow'
            return (
              <g
                key={edge.id}
                className={`edge edge-${edge.kind} ${selected ? 'is-selected' : ''}`}
                style={{ pointerEvents: visible ? 'auto' : 'none' }}
                data-interactive
                tabIndex={visible ? 0 : -1}
                role="button"
                aria-hidden={!visible}
                aria-pressed={selected}
                aria-label={`${kindLabel} from ${labelOf(edge.from)} to ${labelOf(edge.to)}${edge.label ? `: ${edge.label}` : ''}`}
                onClick={() => onSelect(edge.id)}
                onFocus={() => onSelect(edge.id)}
                onKeyDown={activate(edge.id)}
              >
                <path d={path} className="edge-hit" />
              </g>
            )
          })}

          {/* manual handling markers */}
          {markers.map((m) => {
            const p = markerPos(m.targetId)
            if (!p) return null
            const note = isEmpty(m.note) ? 'note not filled in yet' : m.note
            return (
              <g
                key={m.key}
                className="manual-marker"
                transform={`translate(${p.x - 13},${p.y - 13})`}
                style={{ opacity: m.active ? 1 : 0, pointerEvents: m.active ? 'auto' : 'none' }}
                tabIndex={m.active ? 0 : -1}
                role="note"
                aria-hidden={!m.active}
                aria-label={`Manual handling on ${labelOf(m.targetId)}: ${note}`}
                data-interactive
              >
                <title>{`Manual handling: ${note}`}</title>
                <circle cx={13} cy={13} r={13} />
                <g transform="translate(1,1)">
                  <HandGlyph />
                </g>
              </g>
            )
          })}
        </g>
      </svg>

      {layout.invalidEdges.length > 0 && (
        <p className="warning" role="alert">
          {layout.invalidEdges.length} edge(s) in content reference unknown node ids and are not drawn:{' '}
          {layout.invalidEdges.map((e) => e.id).join(', ')}
        </p>
      )}
    </div>
  )
}

function DiagramNode({
  node,
  rect,
  typeLabel,
  visible,
  selected,
  onSelect,
  onKeyDown,
}: {
  node: FlowNode
  rect: Rect
  typeLabel: string
  visible: boolean
  selected: boolean
  onSelect: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
}) {
  const lines = wrapLabel(node.label)
  const textX = rect.x + 48
  const firstY = rect.y + rect.h / 2 - (lines.length - 1) * 8 + 5
  return (
    <g
      className={`node node-${node.type} ${selected ? 'is-selected' : ''}`}
      style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
      data-interactive
      tabIndex={visible ? 0 : -1}
      role="button"
      aria-hidden={!visible}
      aria-pressed={selected}
      aria-label={`${node.label}, ${typeLabel}`}
      onClick={onSelect}
      onFocus={onSelect}
      onKeyDown={onKeyDown}
    >
      <rect className="node-focus" x={rect.x - 5} y={rect.y - 5} width={rect.w + 10} height={rect.h + 10} rx={16} />
      <rect className="node-box" x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={12} />
      <g className="node-icon">
        <NodeIcon type={node.type} x={rect.x + 14} y={rect.y + rect.h / 2 - 12} />
      </g>
      <text className="node-label" x={textX} y={firstY}>
        {lines.map((l, i) => (
          <tspan key={i} x={textX} dy={i === 0 ? 0 : 16}>
            {l}
          </tspan>
        ))}
      </text>
    </g>
  )
}
