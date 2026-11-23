import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadContent } from './lib/content'

loadContent().then(({ content, isFixture }) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App content={content} isFixture={isFixture} />
    </StrictMode>,
  )
})
