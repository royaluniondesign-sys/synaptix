import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import '@fontsource/geist/latin-400.css'
import '@fontsource/geist/latin-500.css'
import '@fontsource/geist/latin-600.css'
import '@fontsource/geist-mono/latin-400.css'
import './index.css'

async function start(): Promise<void> {
  if (import.meta.env.VITE_DEMO === '1') {
    // Demo build only: swap the network for in-memory fakes before the app boots.
    const { installDemoBackend } = await import('./demo-backend/install');
    installDemoBackend();
  } else if ('serviceWorker' in navigator) {
    // Register service worker for offline/tunnel-down support
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed — app still works without it
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

void start()
