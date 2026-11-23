import { useEffect, useState } from 'react'
import type { Content } from './lib/content'
import { Field, NotFilledBadge } from './components/NotFilled'
import { Diagram } from './components/Diagram'
import { Legend } from './components/Legend'
import { ThemeToggle } from './components/ThemeToggle'

interface Props {
  content: Content
  isFixture: boolean
}

function App({ content, isFixture }: Props) {
  const { meta, views } = content
  const [viewId, setViewId] = useState(views[0]?.id ?? '')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const view = views.find((v) => v.id === viewId) ?? views[0]

  useEffect(() => {
    document.title = isFixture ? 'DEV FIXTURE - NOT REAL CONTENT' : meta.title
  }, [isFixture, meta.title])

  const selectedLabel =
    selectedId &&
    (content.nodes.find((n) => n.id === selectedId)?.label ??
      (() => {
        const e = content.edges.find((x) => x.id === selectedId)
        if (!e) return selectedId
        const l = (id: string) => content.nodes.find((n) => n.id === id)?.label ?? id
        return `${e.kind === 'material' ? 'Material' : 'Information'} flow ${l(e.from)} → ${l(e.to)}`
      })())

  return (
    <div className="app">
      {isFixture && (
        <div className="fixture-banner" role="alert">
          DEV FIXTURE - NOT REAL CONTENT
        </div>
      )}

      <header className="app-header">
        <div>
          <h1>{meta.title}</h1>
          <p className="muted">
            {meta.course} · {meta.technology}
          </p>
        </div>
        <ThemeToggle />
      </header>

      <main>
        {view ? (
          <>
            <div className="toolbar">
              <div className="segmented" role="group" aria-label="Diagram view">
                {views.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    aria-pressed={v.id === view.id}
                    onClick={() => setViewId(v.id)}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              <p className="view-description">
                <Field value={view.description} />
              </p>
            </div>

            <Diagram content={content} view={view} selectedId={selectedId} onSelect={setSelectedId} />
            <Legend />

            <p className="selection-status" aria-live="polite">
              {selectedLabel ? (
                <>
                  Selected: <strong>{selectedLabel}</strong>{' '}
                  <span className="muted">(details panel arrives in Phase 2)</span>
                </>
              ) : (
                <span className="muted">Click or press Enter on an element to select it.</span>
              )}
            </p>
          </>
        ) : (
          <p>
            Views <NotFilledBadge />
          </p>
        )}
      </main>
    </div>
  )
}

export default App
