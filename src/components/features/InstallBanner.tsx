import { Download, X } from 'lucide-react'
import logoImage from '../../assets/Logo Balagadona_fix.png'

interface InstallBannerProps {
  onInstall: () => void
  onDismiss: () => void
}

export default function InstallBanner({ onInstall, onDismiss }: InstallBannerProps) {
  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up max-w-sm mx-auto">
      <div className="bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-md border border-gray-700/50 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 text-white ring-1 ring-white/10">
        {/* Logo and Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center p-1 shrink-0">
            <img src={logoImage} alt="Logo Balagadona" className="w-7 h-7 object-contain" />
          </div>
          <div className="min-w-0">
            <h4 className="font-sans font-bold text-xs leading-snug tracking-wide">
              Aplikasi Resmi Balagadona
            </h4>
            <p className="text-[10px] text-gray-400 leading-normal truncate">
              Pesan lebih cepat, hemat kuota & mudah!
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onInstall}
            className="bg-[#C62828] text-white py-1.5 px-3 rounded-xl text-[11px] font-bold hover:bg-[#b71c1c] active:scale-95 transition-all shadow-md shrink-0 flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
          <button
            onClick={onDismiss}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            aria-label="Tutup"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

