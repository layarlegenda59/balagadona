import { Link, useLocation } from 'react-router-dom'
import { Home, UtensilsCrossed, ShoppingCart } from 'lucide-react'
import { useCartStore } from '../../stores/cartStore'

const navItems = [
  { to: '/', icon: Home, label: 'Beranda' },
  { to: '/menu', icon: UtensilsCrossed, label: 'Menu' },
  { to: '/cart', icon: ShoppingCart, label: 'Keranjang' },
]

export default function BottomNav() {
  const location = useLocation()
  const totalItems = useCartStore((s) => s.totalItems())

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] pb-safe sm:hidden">
      <div className="max-w-md mx-auto flex">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to
          const isCart = to === '/cart'
          return (
            <Link
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] transition-all relative ${
                isActive ? 'text-[#C62828]' : 'text-gray-400 hover:text-gray-600'
              }`}
              aria-label={label}
            >
              <div className="relative">
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                {isCart && totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#C62828] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 font-semibold ${isActive ? 'text-[#C62828]' : ''}`}>
                {label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#C62828] rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
