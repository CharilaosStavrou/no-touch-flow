import type { Content, Detail, View } from '../lib/content'
import { isEmpty } from '../lib/content'
import { DETAIL_FIELDS } from '../lib/fields'
import { Field, NotFilledBadge } from './NotFilled'

interface Props {
  content: Content
  view: View
  selectedId: string | null
  onClose: () => void
}

/** Side panel built only from content.json. Empty fields show the "Not filled in yet" badge. */
export function DetailPanel({ content, view, selectedId, onClose }: Props) {
  const node = selectedId ? content.nodes.find((n) => n.id === selectedId) : undefined
  const edge = !node && selectedId ? content.edges.find((e) => e.id === selectedId) : undefined
  const labelOf = (id: string) => content.nodes.find((n) => n.id === id)?.label ?? id

  if (!node && !edge) {
    return (
      <aside className="detail-panel is-empty" aria-label="Details">
        <p className="muted">Click or Tab to a node or flow to see its details here.</p>
      </aside>
    )
  }

  const markers = view.manualHandlingMarkers.filter((m) => m.targetId === selectedId)
  let title: string
  let subtitle: React.ReactNode
  let detail: Detail

  if (node) {
    title = node.label
    const type = content.nodeTypes.find((t) => t.id === node.type)?.label ?? node.type
    const lane = content.lanes.find((l) => l.id === node.laneId)
    subtitle = (
      <>
        {type}
        {node.type !== 'information-item' && (
          <>
            {' · Floor / lane: '}
            {lane && !isEmpty(lane.label) ? lane.label : <NotFilledBadge />}
          </>
        )}
      </>
    )
    detail = node.detail
  } else {
    const e = edge!
    title = `${labelOf(e.from)} → ${labelOf(e.to)}`
    subtitle = (
      <>
        {e.kind === 'material' ? 'Material flow' : 'Information flow'}
        {!isEmpty(e.label) && <> · {e.label}</>}
        {!isEmpty(e.origin) && (
          <>
            {' · '}
            <span className="origin-tag">{e.origin}</span>
          </>
        )}
      </>
    )
    detail = e.detail
  }

  return (
    <aside
      className="detail-panel"
      aria-labelledby="detail-title"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="detail-head">
        <h2 id="detail-title">
          {title}
        </h2>
        <button type="button" className="close" onClick={onClose} aria-label="Close details panel">
          ×
        </button>
      </div>
      <p className="detail-sub muted">{subtitle}</p>

      <dl className="detail-list">
        {DETAIL_FIELDS.map(({ key, label }) => (
          <div key={key} className="detail-row">
            <dt>{label}</dt>
            <dd>{key === 'sourceRef' ? <SourceRef content={content} value={detail[key]} /> : <Field value={detail[key]} />}</dd>
          </div>
        ))}
      </dl>

      {markers.length > 0 && (
        <section className="detail-markers" aria-label="Manual handling in this view">
          <h3>Manual handling in “{view.label}”</h3>
          <ul>
            {markers.map((m, i) => (
              <li key={i}>
                <Field value={m.note} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  )
}

/** Resolves a sourceRef against content.sources by id; otherwise shows the text as written. */
function SourceRef({ content, value }: { content: Content; value: string }) {
  if (isEmpty(value)) return <NotFilledBadge />
  const src = content.sources.find((s) => s.id === value)
  if (!src) return <>{value}</>
  return (
    <>
      {isEmpty(src.citation) ? <NotFilledBadge /> : src.citation}
      {!isEmpty(src.url) && (
        <>
          {' '}
          <a href={src.url} target="_blank" rel="noreferrer">
            Link
          </a>
        </>
      )}
    </>
  )
}
