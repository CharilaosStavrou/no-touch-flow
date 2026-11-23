/**
 * Pure layout: turns content (nodes, edges, lanes) into SVG geometry.
 * Left-to-right flow. Lanes (floors) are horizontal swimlanes; information items sit in a
 * separate information band above the lanes. No positions are stored in content.json:
 * columns come from the longest path along material edges.
 */
import type { Content, FlowEdge, FlowNode, Lane } from './content'

export const NODE_W = 172
export const NODE_H = 64
const COL_W = 236
const STACK_GAP = 18
const LANE_PAD_Y = 26
export const HEADER_W = 156
const INFO_BAND_H = 176
const BAND_GAP = 36
const ISLAND_PAD = 16
const RIGHT_PAD = 24

export const DEFAULT_LANE_ID = '__default'
export const UNASSIGNED_LANE_ID = '__unassigned'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface LaneBox extends Rect {
  id: string
  label: string
  /** Lane exists only because content.json has no (matching) lane. */
  placeholder: 'floors-empty' | 'lane-not-set' | null
}

export interface PlacedNode {
  node: FlowNode
  rect: Rect
}

export interface PlacedEdge {
  edge: FlowEdge
  path: string
  /** Point at the middle of the curve, used for markers and labels. */
  mid: { x: number; y: number }
}

export interface Layout {
  width: number
  height: number
  lanes: LaneBox[]
  infoBand: Rect
  /** Rect the shared information layer occupies. */
  sharedLayer: Rect
  /** One island rect per information item (Current view). */
  islands: Map<string, Rect>
  nodes: Map<string, PlacedNode>
  edges: PlacedEdge[]
  /** Edges skipped because an endpoint id does not exist. */
  invalidEdges: FlowEdge[]
}

export const isInfoNode = (n: FlowNode) => n.type === 'information-item'

function resolveLanes(content: Content, flowNodes: FlowNode[]): Lane[] {
  const sorted = [...content.lanes].sort((a, b) => a.order - b.order)
  if (sorted.length === 0) return [{ id: DEFAULT_LANE_ID, label: '', order: 0 }]
  const ids = new Set(sorted.map((l) => l.id))
  if (flowNodes.some((n) => !ids.has(n.laneId))) {
    sorted.push({ id: UNASSIGNED_LANE_ID, label: '', order: Number.MAX_SAFE_INTEGER })
  }
  return sorted
}

/** Longest-path rank along material edges (cycle-safe: bounded relaxation). */
function rankNodes(flowNodes: FlowNode[], edges: FlowEdge[]): Map<string, number> {
  const rank = new Map(flowNodes.map((n) => [n.id, 0]))
  const material = edges.filter((e) => e.kind === 'material' && rank.has(e.from) && rank.has(e.to))
  for (let i = 0; i < flowNodes.length; i++) {
    let changed = false
    for (const e of material) {
      const next = rank.get(e.from)! + 1
      if (next > rank.get(e.to)!) {
        rank.set(e.to, next)
        changed = true
      }
    }
    if (!changed) break
  }
  return rank
}

function edgePath(a: Rect, b: Rect): { path: string; mid: { x: number; y: number } } {
  const acx = a.x + a.w / 2
  const acy = a.y + a.h / 2
  const bcx = b.x + b.w / 2
  const bcy = b.y + b.h / 2
  let p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number]

  if (b.x > a.x + a.w + 8) {
    // target to the right: right side -> left side
    p0 = [a.x + a.w, acy]
    p3 = [b.x, bcy]
    const dx = Math.max(40, (p3[0] - p0[0]) / 2)
    p1 = [p0[0] + dx, p0[1]]
    p2 = [p3[0] - dx, p3[1]]
  } else if (a.x > b.x + b.w + 8 && Math.abs(acy - bcy) < a.h) {
    // target to the left on the same row: left side -> right side
    p0 = [a.x, acy]
    p3 = [b.x + b.w, bcy]
    const dx = Math.max(40, (p0[0] - p3[0]) / 2)
    p1 = [p0[0] - dx, p0[1]]
    p2 = [p3[0] + dx, p3[1]]
  } else {
    // vertical: bottom -> top or top -> bottom
    const down = bcy > acy
    p0 = [acx, down ? a.y + a.h : a.y]
    p3 = [bcx, down ? b.y : b.y + b.h]
    const dy = Math.max(30, Math.abs(p3[1] - p0[1]) / 2) * (down ? 1 : -1)
    p1 = [p0[0], p0[1] + dy]
    p2 = [p3[0], p3[1] - dy]
  }
  const mid = {
    x: 0.125 * p0[0] + 0.375 * p1[0] + 0.375 * p2[0] + 0.125 * p3[0],
    y: 0.125 * p0[1] + 0.375 * p1[1] + 0.375 * p2[1] + 0.125 * p3[1],
  }
  return { path: `M${p0[0]},${p0[1]} C${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${p3[0]},${p3[1]}`, mid }
}

export function computeLayout(content: Content): Layout {
  const infoNodes = content.nodes.filter(isInfoNode)
  const flowNodes = content.nodes.filter((n) => !isInfoNode(n))
  const lanes = resolveLanes(content, flowNodes)
  const laneIds = new Set(lanes.map((l) => l.id))
  const laneOf = (n: FlowNode) =>
    laneIds.has(n.laneId)
      ? n.laneId
      : laneIds.has(DEFAULT_LANE_ID)
        ? DEFAULT_LANE_ID
        : UNASSIGNED_LANE_ID

  const rank = rankNodes(flowNodes, content.edges)
  const columns = Math.max(1, ...[...rank.values()].map((r) => r + 1), Math.ceil(infoNodes.length * 0.85))

  // stack index per (lane, column)
  const stackIndex = new Map<string, number>()
  const cellCount = new Map<string, number>()
  for (const n of flowNodes) {
    const key = `${laneOf(n)}|${rank.get(n.id)}`
    const i = cellCount.get(key) ?? 0
    stackIndex.set(n.id, i)
    cellCount.set(key, i + 1)
  }
  const maxStack = (laneId: string) =>
    Math.max(1, ...[...cellCount.entries()].filter(([k]) => k.startsWith(laneId + '|')).map(([, v]) => v))

  const width = HEADER_W + columns * COL_W + RIGHT_PAD
  const infoBand: Rect = { x: 0, y: 0, w: width, h: INFO_BAND_H }

  const nodes = new Map<string, PlacedNode>()
  const laneBoxes: LaneBox[] = []
  let y = INFO_BAND_H + BAND_GAP
  for (const lane of lanes) {
    const stacks = maxStack(lane.id)
    const h = LANE_PAD_Y * 2 + stacks * NODE_H + (stacks - 1) * STACK_GAP
    laneBoxes.push({
      id: lane.id,
      label: lane.label,
      x: 0,
      y,
      w: width,
      h,
      placeholder:
        lane.id === DEFAULT_LANE_ID ? 'floors-empty' : lane.id === UNASSIGNED_LANE_ID ? 'lane-not-set' : null,
    })
    for (const n of flowNodes.filter((fn) => laneOf(fn) === lane.id)) {
      const cellStacks = cellCount.get(`${lane.id}|${rank.get(n.id)}`) ?? 1
      const blockH = cellStacks * NODE_H + (cellStacks - 1) * STACK_GAP
      const top = y + (h - blockH) / 2
      nodes.set(n.id, {
        node: n,
        rect: {
          x: HEADER_W + rank.get(n.id)! * COL_W + (COL_W - NODE_W) / 2,
          y: top + stackIndex.get(n.id)! * (NODE_H + STACK_GAP),
          w: NODE_W,
          h: NODE_H,
        },
      })
    }
    y += h
  }

  // information items spread evenly across the band
  const islands = new Map<string, Rect>()
  const usable = width - HEADER_W - RIGHT_PAD
  const slot = usable / Math.max(1, infoNodes.length)
  infoNodes.forEach((n, i) => {
    const rect = {
      x: HEADER_W + i * slot + (slot - NODE_W) / 2,
      y: (INFO_BAND_H - NODE_H) / 2 + 6,
      w: NODE_W,
      h: NODE_H,
    }
    nodes.set(n.id, { node: n, rect })
    islands.set(n.id, {
      x: rect.x - ISLAND_PAD,
      y: rect.y - ISLAND_PAD - 6,
      w: rect.w + ISLAND_PAD * 2,
      h: rect.h + ISLAND_PAD * 2 + 6,
    })
  })
  const sharedLayer: Rect = { x: HEADER_W - 8, y: 14, w: usable + 16, h: INFO_BAND_H - 22 }

  const edges: PlacedEdge[] = []
  const invalidEdges: FlowEdge[] = []
  for (const e of content.edges) {
    const a = nodes.get(e.from)
    const b = nodes.get(e.to)
    if (!a || !b) {
      invalidEdges.push(e)
      continue
    }
    edges.push({ edge: e, ...edgePath(a.rect, b.rect) })
  }

  return { width, height: y + 8, lanes: laneBoxes, infoBand, sharedLayer, islands, nodes, edges, invalidEdges }
}

export function lerpRect(a: Rect, b: Rect, t: number): Rect {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    w: a.w + (b.w - a.w) * t,
    h: a.h + (b.h - a.h) * t,
  }
}
