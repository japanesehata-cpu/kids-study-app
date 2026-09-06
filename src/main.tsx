import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// The PWA's service worker (registerType: 'autoUpdate', see vite.config.ts) fetches and
// activates a new version in the background, but an already-open tab keeps running
// whatever JS it already loaded until the NEW worker actually takes control — reproduced
// live after a deploy this session: the first visit after a push still rendered the old
// UI, and only a second visit (a fresh navigation, letting the now-active new worker serve
// the request) showed the update. Reloading once when control changes closes that gap, so
// a visitor who already has the app open sees the update on its own instead of needing to
// know to revisit/refresh — this is the standard workbox "controlling" reload pattern.
if ('serviceWorker' in navigator) {
  let reloadedForUpdate = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadedForUpdate) return
    reloadedForUpdate = true
    window.location.reload()
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
