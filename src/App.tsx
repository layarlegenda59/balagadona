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
    useDeliveryStore.getState().initializeSupabaseSync()
  }, [])


  return (
    <>
      <AnimatePresence>
        {isSplashActive && (
          <SplashScreen key="splash" onComplete={() => setIsSplashActive(false)} />
        )}
      </AnimatePresence>

      <Toaster position="top-center" richColors />
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
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

        <Footer />
        <BottomNav />
        <WhatsAppButton />
      </div>
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

