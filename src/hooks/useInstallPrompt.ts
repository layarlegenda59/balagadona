import { useState, useEffect, useCallback } from 'react'

// Share the deferred event globally across hook instances
let deferredPrompt: any = null

export function useInstallPrompt() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent default install bar
      e.preventDefault()
      deferredPrompt = e

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
    }
  }, [])

  return {
    showBanner,
    triggerInstall,
    dismissBanner,
    recordMenuVisit,
  }
}
