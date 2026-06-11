import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ShoppingCart, Home, UtensilsCrossed } from 'lucide-react'
import { useCartStore } from '../../stores/cartStore'
import logoImage from '../../assets/Logo Balagadona_fix.png'

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const totalItems = useCartStore((s) => s.totalItems())

  const navLinks = [
    { to: '/', icon: Home, label: 'Beranda' },
    { to: '/menu', icon: UtensilsCrossed, label: 'Menu' },
  ]

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img src={logoImage} alt="Logo Balagadona" className="w-8 h-8 object-contain" />
          <span className="font-sans font-bold text-[#C62828] text-base tracking-wide leading-none">
            Balagadona
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden sm:flex items-center gap-3">
          {navLinks.map((link) => {
            const Icon = link.icon
            const isActive = location.pathname === link.to
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`p-2 rounded-xl transition-all duration-200 flex items-center justify-center ${
                  isActive
                    ? 'text-gray-800 bg-gray-50'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50/50'
                }`}
                aria-label={link.label}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.4 : 2} />
              </Link>
            )
          })}
        </nav>

        {/* Cart Button */}
        <button
          onClick={() => navigate('/cart')}
          className="relative p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-red-50 transition-colors"
          aria-label="Keranjang belanja"
        >
          <ShoppingCart className="w-5 h-5 text-[#1F2937]" />
          {totalItems > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#C62828] text-white text-xs font-bold rounded-full flex items-center justify-center animate-bounce-subtle">
              {totalItems > 9 ? '9+' : totalItems}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
