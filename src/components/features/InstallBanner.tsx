import { Download, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import logoImage from '../../assets/Logo Balagadona_fix.png'

interface InstallBannerProps {
  onInstall: () => void
  onDismiss: () => void
}

type RoleConfig = {
  title: string
  subtitle: string
  btnColor: string
  btnHover: string
  borderColor: string
  icon: string // emoji fallback
}

const ROLE_CONFIG: Record<string, RoleConfig> = {
  admin: {
    title: 'Dashboard Admin',
    subtitle: 'Install untuk akses cepat dashboard',
    btnColor: '#1565C0',
    btnHover: '#0D47A1',
    borderColor: 'rgba(21,101,192,0.4)',
    icon: '🛡️',
  },
  courier: {
    title: 'Aplikasi Kurir Balagadona',
    subtitle: 'Install untuk akses cepat pengiriman',
    btnColor: '#2E7D32',
    btnHover: '#1B5E20',
    borderColor: 'rgba(46,125,50,0.4)',
    icon: '🚴',
  },
  customer: {
    title: 'Aplikasi Resmi Balagadona',
    subtitle: 'Pesan lebih cepat, hemat kuota & mudah!',
    btnColor: '#C62828',
    btnHover: '#b71c1c',
    borderColor: 'rgba(198,40,40,0.3)',
    icon: '',
  },
}

export default function InstallBanner({ onInstall, onDismiss }: InstallBannerProps) {
  const location = useLocation()

  const role = location.pathname.startsWith('/admin')
    ? 'admin'
    : location.pathname.startsWith('/courier')
    ? 'courier'
    : 'customer'

  const cfg = ROLE_CONFIG[role]

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up max-w-sm mx-auto">
      <div
        className="backdrop-blur-md rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 text-white ring-1"
        style={{
          background: 'linear-gradient(135deg, rgba(17,17,27,0.97) 0%, rgba(30,30,46,0.97) 100%)',
          borderColor: cfg.borderColor,
          border: `1px solid ${cfg.borderColor}`,
        }}
      >
        {/* Logo / Icon */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="relative w-9 h-9 rounded-xl flex items-center justify-center p-1 shrink-0"
            style={{ background: `${cfg.btnColor}22` }}
          >
            {role === 'customer' ? (
              <img src={logoImage} alt="Logo Balagadona" className="w-7 h-7 object-contain" />
            ) : (
              <span className="text-lg leading-none">{cfg.icon}</span>
            )}
          </div>
          <div className="min-w-0">
            <h4 className="font-sans font-bold text-xs leading-snug tracking-wide">{cfg.title}</h4>
            <p className="text-[10px] text-gray-400 leading-normal truncate">{cfg.subtitle}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onInstall}
            className="text-white py-1.5 px-3 rounded-xl text-[11px] font-bold active:scale-95 transition-all shadow-md shrink-0 flex items-center gap-1"
            style={{ background: cfg.btnColor }}
            onMouseEnter={(e) => (e.currentTarget.style.background = cfg.btnHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = cfg.btnColor)}
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
