import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AnimatePresence } from 'framer-motion'
import Navbar from './components/layout/Navbar'
import BottomNav from './components/layout/BottomNav'
import Footer from './components/layout/Footer'
import WhatsAppButton from './components/features/WhatsAppButton'
import SplashScreen from './components/features/SplashScreen'
import PageTransition from './components/layout/PageTransition'
import Home from './pages/Home'
import Menu from './pages/Menu'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'
import AdminDashboard from './pages/AdminDashboard'
import CourierDashboard from './pages/CourierDashboard'
import NotFound from './pages/NotFound'
import { useDeliveryStore } from './stores/deliveryStore'
import { resumeSharedAudioContext } from './lib/audio'

function AppInner() {
  console.log("AppInner rendering...");
  const [isSplashActive, setIsSplashActive] = useState(true)
  const location = useLocation()
  const lastSyncModeRef = useRef<boolean | null>(null)

  // Dynamically sync and update document title on route transitions
  useEffect(() => {
    const store = useDeliveryStore.getState()
    const isAdmin = location.pathname.startsWith('/admin')
    const isCourier = location.pathname.startsWith('/courier')
    const isPortal = isAdmin || isCourier
    
    // Only re-sync when crossing the portal/customer boundary
    if (lastSyncModeRef.current !== isPortal) {
      lastSyncModeRef.current = isPortal
      store.initializeSupabaseSync(isPortal)
    }

    // ── Update PWA manifest & theme-color per role ──────────────────────
    const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
    const themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    const appleTouchIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')

    if (isAdmin) {
      if (manifestLink) manifestLink.href = '/manifest-admin.json'
      if (themeColorMeta) themeColorMeta.content = '#1565C0'
      if (appleTouchIcon) appleTouchIcon.href = '/icon-admin-192.png'
    } else if (isCourier) {
      if (manifestLink) manifestLink.href = '/manifest-courier.json'
      if (themeColorMeta) themeColorMeta.content = '#2E7D32'
      if (appleTouchIcon) appleTouchIcon.href = '/icon-courier-192.png'
    } else {
      if (manifestLink) manifestLink.href = '/manifest.json'
      if (themeColorMeta) themeColorMeta.content = '#C62828'
      if (appleTouchIcon) appleTouchIcon.href = '/icon-192.png'
    }
    // ────────────────────────────────────────────────────────────────────

    // Set document tab titles
    if (location.pathname.startsWith('/admin')) {
      document.title = 'Dashboard Admin - Balagadona'
    } else if (location.pathname.startsWith('/courier')) {
      document.title = 'Dashboard Kurir - Balagadona'
    } else if (location.pathname === '/checkout') {
      document.title = 'Checkout - Balagadona'
    } else if (location.pathname === '/menu') {
      document.title = 'Menu Terlezat - Balagadona'
    } else if (location.pathname === '/cart') {
      document.title = 'Keranjang Belanja - Balagadona'
    } else if (location.pathname === '/order-confirmation') {
      document.title = 'Pesanan Berhasil - Balagadona'
    } else {
      document.title = 'Batagor Balagadona - Pelopor Batagor Premium'
    }
  }, [location.pathname])

  // Screen wake lock and visibility state restoration
  useEffect(() => {
    const store = useDeliveryStore.getState()
    let wakeLock: any = null
    const requestLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen')
        }
      } catch (err) {
        console.warn('Wake Lock request failed:', err)
      }
    }

    requestLock()

    // Re-acquire lock, re-sync Supabase state, and resume audio context when visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestLock()
        // Re-sync Supabase immediately when phone is unlocked / brought back from background
        const isPortalActive = window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/courier')
        store.initializeSupabaseSync(isPortalActive)
        // Resume the global shared AudioContext if suspended
        resumeSharedAudioContext()
      }
    }

    const handleUserInteraction = () => {
      resumeSharedAudioContext()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('click', handleUserInteraction)
    window.addEventListener('touchstart', handleUserInteraction)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('click', handleUserInteraction)
      window.removeEventListener('touchstart', handleUserInteraction)
      if (wakeLock) {
        wakeLock.release().catch((e: any) => console.log(e))
      }
    }
  }, [])


  return (
    <>
      <AnimatePresence>
        {isSplashActive && (
          <SplashScreen key="splash" onComplete={() => setIsSplashActive(false)} />
        )}
      </AnimatePresence>

      <Toaster position="top-center" richColors />
      {(() => {
        const isPortal = location.pathname.startsWith('/admin') || location.pathname.startsWith('/courier')
        return (
          <div className="min-h-screen bg-white flex flex-col">
            {!isPortal && <Navbar />}
            <div className="flex-1 relative overflow-hidden flex flex-col">
              <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                  <Route path="/" element={<PageTransition><Home /></PageTransition>} />
                  <Route path="/menu" element={<PageTransition><Menu /></PageTransition>} />
                  <Route path="/cart" element={<PageTransition><Cart /></PageTransition>} />
                  <Route path="/checkout" element={<PageTransition><Checkout /></PageTransition>} />
                  <Route path="/order-confirmation" element={<PageTransition><OrderConfirmation /></PageTransition>} />
                  <Route path="/admin" element={<PageTransition><AdminDashboard /></PageTransition>} />
                  <Route path="/courier" element={<PageTransition><CourierDashboard /></PageTransition>} />
                  <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
                </Routes>
              </AnimatePresence>
            </div>

            {!isPortal && <Footer />}
            {!isPortal && <BottomNav />}
            {!isPortal && <WhatsAppButton />}
          </div>
        )
      })()}
    </>
  )
}

export default function App() {
  console.log("App component rendered");
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}

