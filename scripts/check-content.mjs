#!/usr/bin/env node
/**
 * npm run check-content
 *
 * Lists every empty field in src/data/content.json (empty string, empty array, null).
 * Paths use ids instead of array indexes where an item has an id, for example
 *   nodes.receiving.detail.expectedBenefit
 * The same path format is used in content.json "requiredFields". A "*" segment matches anything,
 * for example "nodes.*.detail.expectedBenefit".
 *
 * Also reports broken references (edge endpoints, laneIds, view/step/ILO ids).
 *
 * Exit code: 1 if a required field is empty or missing, or a reference is broken; otherwise 0.
 *
 * Options:
 *   --required   only show required fields that are empty
 *   --json       machine-readable output
 *   --file PATH  check another file (default src/data/content.json)
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const fileArg = args.indexOf('--file')
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = fileArg >= 0 ? resolve(args[fileArg + 1]) : resolve(root, 'src/data/content.json')

let content
try {
  content = JSON.parse(readFileSync(file, 'utf8'))
} catch (err) {
  console.error(`Cannot read ${file}: ${err.message}`)
  process.exit(2)
}

/* ---------- walk ---------- */

const isEmptyValue = (v) =>
  v === null || v === undefined || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0)

const SKIP = new Set(['$schemaVersion', 'requiredFields'])

/** @type {{ path: string, kind: string }[]} */
const empty = []
/** all leaf and container paths that exist, for required-field lookup */
const values = new Map()

/** Information items are drawn in the information band, never in a lane. */
const infoNodeIds = new Set((content.nodes ?? []).filter((n) => n.type === 'information-item').map((n) => n.id))
const isIgnored = (path) => path.length === 3 && path[0] === 'nodes' && path[2] === 'laneId' && infoNodeIds.has(path[1])

function walk(value, path) {
  if (isIgnored(path)) return
  values.set(path.join('.'), value)
  if (isEmptyValue(value)) {
    empty.push({ path: path.join('.'), kind: Array.isArray(value) ? 'empty list' : value === null ? 'null' : 'empty text' })
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => {
      const seg = item && typeof item === 'object' && typeof item.id === 'string' && item.id ? item.id : String(i)
      walk(item, [...path, seg])
    })
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (path.length === 0 && SKIP.has(k)) continue
      walk(v, [...path, k])
    }
  }
}
walk(content, [])

/* ---------- required ---------- */

const required = Array.isArray(content.requiredFields) ? content.requiredFields : []
const toRegex = (pattern) =>
  new RegExp('^' + pattern.split('.').map((s) => (s === '*' ? '[^.]+' : s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('\\.') + '$')

/** @type {{ pattern: string, path: string, problem: string }[]} */
const requiredProblems = []
for (const pattern of required) {
  const re = toRegex(pattern)
  const matches = [...values.keys()].filter((p) => re.test(p))
  if (matches.length === 0) {
    requiredProblems.push({ pattern, path: pattern, problem: 'does not exist in content.json' })
    continue
  }
  for (const p of matches) if (isEmptyValue(values.get(p))) requiredProblems.push({ pattern, path: p, problem: 'empty' })
}
const requiredEmptyPaths = new Set(requiredProblems.map((r) => r.path))

/* ---------- references ---------- */

const refProblems = []
const ids = (list) => new Set((Array.isArray(list) ? list : []).map((x) => x.id))
const nodeIds = ids(content.nodes)
const edgeIds = ids(content.edges)
const laneIds = ids(content.lanes)
const viewIds = ids(content.views)
const stepIds = ids(content.steps)
const typeIds = ids(content.nodeTypes)
const elementIds = new Set([...nodeIds, ...edgeIds])

const dupes = (list, label) => {
  const seen = new Set()
  for (const x of Array.isArray(list) ? list : []) {
    if (seen.has(x.id)) refProblems.push(`${label}: duplicate id "${x.id}"`)
    seen.add(x.id)
  }
}
dupes(content.nodes, 'nodes')
dupes(content.edges, 'edges')
dupes(content.lanes, 'lanes')
dupes(content.views, 'views')
dupes(content.steps, 'steps')

for (const n of content.nodes ?? []) {
  if (!typeIds.has(n.type)) refProblems.push(`nodes.${n.id}.type: unknown node type "${n.type}"`)
  if (n.laneId && !laneIds.has(n.laneId)) refProblems.push(`nodes.${n.id}.laneId: unknown lane "${n.laneId}"`)
}
for (const e of content.edges ?? []) {
  if (!nodeIds.has(e.from)) refProblems.push(`edges.${e.id}.from: unknown node "${e.from}"`)
  if (!nodeIds.has(e.to)) refProblems.push(`edges.${e.id}.to: unknown node "${e.to}"`)
  if (e.kind !== 'material' && e.kind !== 'information') refProblems.push(`edges.${e.id}.kind: must be "material" or "information"`)
}
for (const v of content.views ?? []) {
  for (const id of v.visibleNodeIds ?? []) if (!nodeIds.has(id)) refProblems.push(`views.${v.id}.visibleNodeIds: unknown node "${id}"`)
  for (const id of v.visibleEdgeIds ?? []) if (!edgeIds.has(id)) refProblems.push(`views.${v.id}.visibleEdgeIds: unknown edge "${id}"`)
  for (const m of v.manualHandlingMarkers ?? [])
    if (!elementIds.has(m.targetId)) refProblems.push(`views.${v.id}.manualHandlingMarkers: unknown target "${m.targetId}"`)
}
for (const s of content.steps ?? []) {
  if (s.viewId && !viewIds.has(s.viewId)) refProblems.push(`steps.${s.id}.viewId: unknown view "${s.viewId}"`)
  for (const id of s.nodeIds ?? []) if (!nodeIds.has(id)) refProblems.push(`steps.${s.id}.nodeIds: unknown node "${id}"`)
  for (const id of s.edgeIds ?? []) if (!edgeIds.has(id)) refProblems.push(`steps.${s.id}.edgeIds: unknown edge "${id}"`)
}
for (const o of content.learningOutcomes ?? []) {
  for (const id of o.stepIds ?? []) if (!stepIds.has(id)) refProblems.push(`learningOutcomes.${o.id}.stepIds: unknown step "${id}"`)
  for (const id of o.nodeIds ?? []) if (!nodeIds.has(id)) refProblems.push(`learningOutcomes.${o.id}.nodeIds: unknown node "${id}"`)
}
for (const q of content.questions ?? [])
  for (const id of q.relatedNodeIds ?? []) if (!nodeIds.has(id)) refProblems.push(`questions.${q.id}.relatedNodeIds: unknown node "${id}"`)

/* ---------- output ---------- */

const failed = requiredProblems.length > 0 || refProblems.length > 0

if (flag('--json')) {
  console.log(JSON.stringify({ file, empty, required: requiredProblems, references: refProblems, ok: !failed }, null, 2))
  process.exit(failed ? 1 : 0)
}

const useColor = process.stdout.isTTY && !process.env.NO_COLOR
const c = (code, s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s)
const bold = (s) => c(1, s)
const red = (s) => c(31, s)
const yellow = (s) => c(33, s)
const green = (s) => c(32, s)
const dim = (s) => c(2, s)

console.log(bold(`Content check: ${file.replace(root + '/', '')}`))
console.log()

if (!flag('--required')) {
  // group by top-level section
  const groups = new Map()
  for (const e of empty) {
    const top = e.path.split('.')[0] || '(root)'
    if (!groups.has(top)) groups.set(top, [])
    groups.get(top).push(e)
  }
  console.log(bold(`Empty fields (${empty.length})`))
  if (empty.length === 0) console.log(green('  none'))
  for (const [top, list] of groups) {
    console.log(`  ${bold(top)} ${dim(`(${list.length})`)}`)
    for (const e of list) {
      const mark = requiredEmptyPaths.has(e.path) ? red(' [REQUIRED]') : ''
      console.log(`    ${e.path}  ${dim(e.kind)}${mark}`)
    }
  }
  console.log()
}

console.log(bold(`Required fields (${required.length} pattern${required.length === 1 ? '' : 's'} in requiredFields)`))
if (required.length === 0) console.log(yellow('  No fields marked as required yet. Add dotted paths to "requiredFields" in content.json.'))
else if (requiredProblems.length === 0) console.log(green('  All required fields are filled in.'))
else for (const r of requiredProblems) console.log(red(`  ✗ ${r.path}  ${r.problem}`) + (r.pattern !== r.path ? dim(`  (from ${r.pattern})`) : ''))
console.log()

console.log(bold(`References (${refProblems.length} problem${refProblems.length === 1 ? '' : 's'})`))
if (refProblems.length === 0) console.log(green('  All ids resolve.'))
else for (const p of refProblems) console.log(red(`  ✗ ${p}`))
console.log()

console.log(
  failed
    ? red(bold('FAIL')) + ' required fields empty or broken references.'
    : green(bold('OK')) + ` no required fields empty, no broken references. ${empty.length} optional field(s) still empty.`,
)
process.exit(failed ? 1 : 0)
