import { useState, useEffect, useCallback } from 'react'

// Share the deferred event globally across hook instances
let deferredPrompt: any = null

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

      const dismissed = localStorage.getItem('pwa-install-dismissed')
      const visitCount = parseInt(sessionStorage.getItem('menu-visits') || '0', 10)

      // Show banner if not dismissed and visited menu at least once
      if (!dismissed && visitCount >= 1) {
        setShowBanner(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Check conditions if event already fired
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    const visitCount = parseInt(sessionStorage.getItem('menu-visits') || '0', 10)
    if (deferredPrompt && !dismissed && visitCount >= 1) {
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
    localStorage.setItem('pwa-install-dismissed', 'true')
    setShowBanner(false)
  }, [])

  const recordMenuVisit = useCallback(() => {
    const visits = parseInt(sessionStorage.getItem('menu-visits') || '0', 10)
    sessionStorage.setItem('menu-visits', (visits + 1).toString())

    const dismissed = localStorage.getItem('pwa-install-dismissed')
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
