import { StrictMode, Component, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Error Boundary for catch runtime errors
class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1>Ups! Terjadi kesalahan.</h1>
          <pre style={{ color: 'red', textAlign: 'left', display: 'inline-block' }}>
            {this.state.error?.toString()}
          </pre>
          <br />
          <button onClick={() => { localStorage.clear(); window.location.reload(); }}>
            Bersihkan Cache & Muat Ulang
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Dynamic PWA Manifest Injection ───────────────────────────────────────
// Switches the manifest link based on URL path so each role gets its own
// icon, name, and theme when installed as a PWA on the home screen.
function injectRoleManifest() {
  const path = window.location.pathname

  let manifestHref = '/manifest.json'
  let themeColor = '#C62828'
  let appleIcon = '/icon-192.png'

  if (path.startsWith('/admin')) {
    manifestHref = '/manifest-admin.json'
    themeColor = '#1565C0'
    appleIcon = '/icon-admin-192.png'
  } else if (path.startsWith('/courier')) {
    manifestHref = '/manifest-courier.json'
    themeColor = '#2E7D32'
    appleIcon = '/icon-courier-192.png'
  }

  // Update <link rel="manifest">
  const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
  if (manifestLink) {
    manifestLink.href = manifestHref
  }

  // Update <meta name="theme-color">
  const themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (themeColorMeta) {
    themeColorMeta.content = themeColor
  }

  // Update <link rel="apple-touch-icon">
  const appleTouchIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')
  if (appleTouchIcon) {
    appleTouchIcon.href = appleIcon
  }
}

injectRoleManifest()
// ──────────────────────────────────────────────────────────────────────────

const rootElement = document.getElementById('root')
if (rootElement) {
  const root = createRoot(rootElement)
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  )
}

// Register service worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('Service Worker registered with scope:', reg.scope))
      .catch((err) => console.error('Service Worker registration failed:', err))
  })
}

