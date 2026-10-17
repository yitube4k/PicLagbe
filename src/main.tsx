import './lib/authBridge' // V32: must run FIRST — bounces auth landings back to photolagbe.pages.dev
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// GitHub Pages SPA fallback: restore deep link saved by 404.html
try {
  const saved = sessionStorage.getItem('spa-redirect')
  if (saved) {
    sessionStorage.removeItem('spa-redirect')
    const target = saved.replace(/^\/+/, '')
    if (target && !target.startsWith('http')) {
      window.history.replaceState(null, '', `${import.meta.env.BASE_URL}${target}`.replace(/\/{2,}/g, '/'))
    }
  }
} catch (e) {
  /* ignore */
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
