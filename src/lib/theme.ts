export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'leave_manager_theme'

function systemPrefersDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function getCurrentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
}

export function initTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    if (stored === 'light' || stored === 'dark') {
      applyTheme(stored)
      return
    }
  } catch {
    // ignore storage errors
  }
  applyTheme(systemPrefersDark() ? 'dark' : 'light')
}

export function toggleTheme() {
  const next: Theme = getCurrentTheme() === 'dark' ? 'light' : 'dark'
  applyTheme(next)
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // ignore storage errors
  }
  return next
}
