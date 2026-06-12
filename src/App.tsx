import { useState, useEffect } from 'react'
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

function AppInner() {
  console.log("AppInner rendering...");
  const [isSplashActive, setIsSplashActive] = useState(true)
  const location = useLocation()

  // Initialize Supabase sync and real-time listeners on mount
  useEffect(() => {
    const store = useDeliveryStore.getState()
    store.initializeSupabaseSync()

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
        store.initializeSupabaseSync()
        // Resume AudioContext if suspended
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext
        if (AudioContext) {
          const ctx = new AudioContext()
          if (ctx.state === 'suspended') {
            ctx.resume()
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
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

