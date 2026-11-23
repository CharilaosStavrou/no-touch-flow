import { content } from './lib/content'
import { Field, NotFilledBadge } from './components/NotFilled'

function App() {
  const { meta, nodes, nodeTypes } = content
  const typeLabel = (id: string) => nodeTypes.find((t) => t.id === id)?.label ?? id

  return (
    <div className="app">
      <header className="app-header">
        <h1>{meta.title}</h1>
        <p className="muted">
          {meta.course} · {meta.technology}
        </p>
      </header>

      <main>
        <section aria-labelledby="case-heading">
          <h2 id="case-heading">Case summary</h2>
          <p>
            <Field value={meta.caseSummary} />
          </p>
        </section>

        <section aria-labelledby="nodes-heading">
          <h2 id="nodes-heading">Structural elements</h2>
          <p className="muted">The diagram is built in Phase 1. Elements currently defined in content.json:</p>
          <ul className="node-list">
            {nodes.map((n) => (
              <li key={n.id}>
                <strong>{n.label}</strong> <span className="muted">({typeLabel(n.type)})</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="speakers-heading">
          <h2 id="speakers-heading">Speakers</h2>
          {meta.speakers.length === 0 ? <NotFilledBadge /> : <p>{meta.speakers.join(', ')}</p>}
        </section>
      </main>
    </div>
  )
}

export default App
