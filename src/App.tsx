import { useEffect, useState } from 'react'
import type { Content } from './lib/content'
import { Field, NotFilledBadge } from './components/NotFilled'
import { Diagram } from './components/Diagram'
import { Legend } from './components/Legend'
import { ThemeToggle } from './components/ThemeToggle'
import { DetailPanel } from './components/DetailPanel'

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

            <div className="workspace">
              <div className="workspace-main">
                <Diagram content={content} view={view} selectedId={selectedId} onSelect={setSelectedId} />
                <Legend />
              </div>
              <DetailPanel content={content} view={view} selectedId={selectedId} onClose={() => setSelectedId(null)} />
            </div>
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
