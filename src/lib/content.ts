/**
 * Types for src/data/content.json.
 * All descriptive text lives in content.json. Empty string / empty array = "not filled in yet".
 * Array item shapes below (edges, steps, lanes, ...) define the schema for later phases.
 */
import raw from '../data/content.json'

export type NodeTypeId =
  | 'process-area'
  | 'load-carrier'
  | 'information-item'
  | 'stationary-robot-station'

/** Detail fields shown in the side panel for a node or an edge. */
export interface Detail {
  whatPasses: string
  whoNeeds: string
  dataSource: string
  /** Range or note, as text. */
  uncertainty: string
  implementationRequirement: string
  expectedBenefit: string
  /** Id from `sources`, or free text reference. */
  sourceRef: string
}

export interface NodeType {
  id: NodeTypeId
  label: string
  description: string
}

/** Horizontal swimlane, e.g. one per floor. */
export interface Lane {
  id: string
  label: string
  order: number
}

export interface FlowNode {
  id: string
  label: string
  type: NodeTypeId
  laneId: string
  detail: Detail
}

export type EdgeKind = 'material' | 'information'

export interface FlowEdge {
  id: string
  from: string
  to: string
  kind: EdgeKind
  label: string
  /** Where the structural edge comes from, e.g. "structural, from case" or a note reference. */
  origin: string
  detail: Detail
}

export interface ManualMarker {
  /** Node or edge id the marker is attached to. */
  targetId: string
  note: string
}

export interface View {
  id: string
  label: string
  description: string
  sharedInformationLayer: boolean
  /** Empty = all nodes visible. */
  visibleNodeIds: string[]
  /** Empty = all edges visible. */
  visibleEdgeIds: string[]
  manualHandlingMarkers: ManualMarker[]
}

export interface Step {
  id: string
  title: string
  speaker: string
  targetSeconds: number | null
  viewId: string
  nodeIds: string[]
  edgeIds: string[]
  notes: string
}

export interface LearningOutcome {
  id: string
  label: string
  description: string
  stepIds: string[]
  nodeIds: string[]
  coverage: string
}

export interface Question {
  id: string
  prompt: string
  relatedNodeIds: string[]
  notes: string
}

export interface ResearchProposal {
  id: string
  title: string
  description: string
}

export interface Source {
  id: string
  citation: string
  url: string
}

export interface Content {
  $schemaVersion: number
  meta: {
    title: string
    course: string
    technology: string
    groupName: string
    speakers: string[]
    caseSummary: string
    talkDurationSeconds: number
    oppositionDurationSeconds: number
  }
  /** Dotted paths (e.g. "nodes.receiving.detail.expectedBenefit") the content check must treat as required. */
  requiredFields: string[]
  nodeTypes: NodeType[]
  lanes: Lane[]
  nodes: FlowNode[]
  edges: FlowEdge[]
  views: View[]
  steps: Step[]
  learningOutcomes: LearningOutcome[]
  questions: Question[]
  furtherResearch: ResearchProposal[]
  sources: Source[]
}

export const content = raw as unknown as Content

export interface LoadedContent {
  content: Content
  /** True when the dev-only fixture (?fixture=dev) is loaded instead of content.json. */
  isFixture: boolean
}

/**
 * Loads content.json, or the dev fixture when running `npm run dev` with ?fixture=dev.
 * `import.meta.env.DEV` is statically false in production builds, so the fixture import
 * is removed from the bundle entirely.
 */
export async function loadContent(): Promise<LoadedContent> {
  if (import.meta.env.DEV) {
    const params = new URLSearchParams(window.location.search)
    if (params.get('fixture') === 'dev') {
      const mod = await import('../data/dev-fixture.json')
      return { content: mod.default as unknown as Content, isFixture: true }
    }
  }
  return { content, isFixture: false }
}

export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}
