import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { initTheme } from './lib/theme'

// Apply theme before first paint
initTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/*
      HashRouter avoids 404s on static hosts (GitHub Pages, cPanel, GoDaddy, etc.)
      when users refresh deep links like /login or /app/dashboard.
    */}
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)
