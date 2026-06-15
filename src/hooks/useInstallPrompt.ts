import { useState, useEffect, useCallback } from 'react'

// Share the deferred event globally across hook instances
let deferredPrompt: any = null

// Role-specific dismiss keys so each PWA tracks dismissal independently
function getDismissKey() {
  const path = window.location.pathname
  if (path.startsWith('/admin')) return 'pwa-install-dismissed-admin'
  if (path.startsWith('/courier')) return 'pwa-install-dismissed-courier'
  return 'pwa-install-dismissed'
}

function isPortalRoute() {
  const path = window.location.pathname
  return path.startsWith('/admin') || path.startsWith('/courier')
}

export function useInstallPrompt() {
  const [showBanner, setShowBanner] = useState(false)
  const [isInstallable, setIsInstallable] = useState(!!deferredPrompt)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check if iOS/Safari
    const ua = window.navigator.userAgent.toLowerCase()
    const isIOSDevice = /iphone|ipad|ipod/.test(ua)
    const isSafari = /safari/.test(ua) && !/crios|fxios|opios|mercury/.test(ua)
    setIsIOS(isIOSDevice && isSafari)

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent default install bar
      e.preventDefault()
      deferredPrompt = e
      setIsInstallable(true)

      const dismissed = localStorage.getItem(getDismissKey())
      const visitCount = parseInt(sessionStorage.getItem('menu-visits') || '0', 10)

      // Portal routes (admin/courier): show immediately — no visit-count gate
      // Customer routes: show banner only after 1+ menu visit
      const shouldShow = isPortalRoute() ? !dismissed : (!dismissed && visitCount >= 1)
      if (shouldShow) {
        setShowBanner(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Check conditions if event already fired
    const dismissed = localStorage.getItem(getDismissKey())
    const visitCount = parseInt(sessionStorage.getItem('menu-visits') || '0', 10)
    const shouldShow = isPortalRoute() ? !dismissed : (!dismissed && visitCount >= 1)
    if (deferredPrompt && shouldShow) {
      setShowBanner(true)
      setIsInstallable(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`User response to install: ${outcome}`)

    deferredPrompt = null
    setIsInstallable(false)
    setShowBanner(false)
  }, [])

  const dismissBanner = useCallback(() => {
    localStorage.setItem(getDismissKey(), 'true')
    setShowBanner(false)
  }, [])

  const recordMenuVisit = useCallback(() => {
    const visits = parseInt(sessionStorage.getItem('menu-visits') || '0', 10)
    sessionStorage.setItem('menu-visits', (visits + 1).toString())

    const dismissed = localStorage.getItem(getDismissKey())
    if (deferredPrompt && !dismissed) {
      setShowBanner(true)
      setIsInstallable(true)
    }
  }, [])

  return {
    showBanner,
    isInstallable,
    isIOS,
    triggerInstall,
    dismissBanner,
    recordMenuVisit,
  }
}
