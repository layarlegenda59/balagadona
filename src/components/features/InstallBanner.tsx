import { Download, X } from 'lucide-react'
import logoImage from '../../assets/Logo Balagadona_fix.png'

interface InstallBannerProps {
  onInstall: () => void
  onDismiss: () => void
}

export default function InstallBanner({ onInstall, onDismiss }: InstallBannerProps) {
  return (
    <div className="fixed bottom-24 right-4 z-50 animate-slide-up max-w-[250px]">
      <div className="bg-white/95 backdrop-blur-md border border-gray-100 rounded-xl py-1.5 pl-2.5 pr-2 shadow-lg flex items-center gap-2.5">
        {/* Logo/Icon */}
        <img src={logoImage} alt="Logo Balagadona" className="w-6 h-6 object-contain shrink-0" />
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-gray-800 text-[10px] leading-tight">
            Instal App
          </h4>
          <p className="text-[8px] text-gray-500 leading-none mt-0.5">
            Pesan lebih cepat
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onInstall}
            className="bg-[#C62828] text-white py-1 px-2.5 rounded-lg text-[9px] font-bold hover:bg-[#b71c1c] transition-colors"
          >
            Instal
          </button>
          <button
            onClick={onDismiss}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            aria-label="Tutup"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
