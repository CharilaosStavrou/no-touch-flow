import { useEffect, useState } from 'react'

type Theme = 'system' | 'light' | 'dark'
const KEY = 'ntf-theme'

function readTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* storage unavailable */
  }
  return 'system'
}

/** Cycles System → Light → Dark. Sets data-theme on <html>. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
    try {
      if (theme === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, theme)
    } catch {
      /* storage unavailable */
    }
  }, [theme])

  const next: Theme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'
  const label = { system: 'System', light: 'Light', dark: 'Dark' }[theme]

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${label}. Switch to ${next}.`}
    >
      Theme: {label}
    </button>
  )
}
