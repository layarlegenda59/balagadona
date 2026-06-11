import { useEffect } from 'react'
import { motion } from 'framer-motion'
import logoImage from '../../assets/Logo Balagadona_fix.png'

interface SplashScreenProps {
  onComplete: () => void
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  useEffect(() => {
    // Show splash screen for 1200ms before triggering onComplete
    const timer = setTimeout(() => {
      onComplete()
    }, 1300)

    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className="fixed inset-0 bg-[#C62828] z-[9999] flex flex-col items-center justify-between py-12 px-6"
    >
      {/* Invisible spacer to push logo to center */}
      <div className="h-10" />

      {/* Center Brand Group */}
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Logo with scale, fade in, and 3D Y-axis vertical rotation */}
        <motion.img
          src={logoImage}
          alt="Logo Balagadona"
          initial={{ opacity: 0, scale: 0.7, rotateY: 0 }}
          animate={{ opacity: 1, scale: 1, rotateY: 360 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="w-32 h-32 object-contain filter drop-shadow-md"
          style={{ backfaceVisibility: 'hidden' }}
        />

        {/* Text Group */}
        <div className="space-y-2">
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
            className="text-white font-display font-extrabold text-2xl tracking-wider leading-none"
          >
            BATAGOR BALAGADONA
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5, ease: 'easeOut' }}
            className="text-white/80 text-xs font-medium tracking-wide max-w-xs"
          >
            Batagor Enak, Pesan Cepat, Antar Tepat.
          </motion.p>
        </div>
      </div>

      {/* Bottom Loading Dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="flex items-center gap-1.5"
      >
        <span className="w-2 h-2 bg-white/40 rounded-full animate-loading-dot-1" />
        <span className="w-2 h-2 bg-white/40 rounded-full animate-loading-dot-2" />
        <span className="w-2 h-2 bg-white/40 rounded-full animate-loading-dot-3" />
      </motion.div>
    </motion.div>
  )
}
