
import { useState, useEffect } from 'react'
import { ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PRODUCTS } from '../constants/products'
import ProductCard from '../components/features/ProductCard'
import { useCartStore } from '../stores/cartStore'
import { useInstallPrompt } from '../hooks/useInstallPrompt'

const CATEGORIES = [
  { id: 'all', label: 'Semua' },
  { id: 'original', label: 'Batagor Kering' },
  { id: 'kuah', label: 'Batagor Kuah' },
]

export default function Menu() {
  const [activeCategory, setActiveCategory] = useState('all')
  const totalItems = useCartStore((s) => s.totalItems())
  const totalPrice = useCartStore((s) => s.totalPrice())
  const { recordMenuVisit } = useInstallPrompt()

  useEffect(() => {
    recordMenuVisit()
  }, [recordMenuVisit])

  const filtered = activeCategory === 'all'
    ? PRODUCTS
    : PRODUCTS.filter((p) => p.category === activeCategory)

  return (
    <main className="max-w-md mx-auto pb-36 sm:pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="font-display font-bold text-2xl text-[#1F2937] mb-1">Menu Kami</h1>
        <p className="text-gray-500 text-sm">Pilih batagor favorit Anda</p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 px-4 pb-4 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold min-h-[36px] transition-all duration-200 ${
              activeCategory === cat.id
                ? 'bg-[#C62828] text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="px-4 grid grid-cols-1 gap-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-5xl">🍜</span>
            </div>
            <h3 className="font-display font-bold text-lg text-[#1F2937] mb-2">
              Menu Tidak Ditemukan
            </h3>
            <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
              Maaf, belum ada produk di kategori ini. Coba pilih kategori lain ya!
            </p>
            <button
              onClick={() => setActiveCategory('all')}
              className="px-6 py-2.5 bg-[#C62828] text-white rounded-xl text-sm font-semibold hover:bg-[#b71c1c] transition-colors"
            >
              Lihat Semua Menu
            </button>
          </div>
        ) : (
          filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        )}
      </div>

      {/* Floating Cart Summary */}
      {totalItems > 0 && (
        <div className="fixed bottom-16 sm:bottom-4 left-4 right-4 max-w-md mx-auto z-40 animate-slide-up">
          <Link
            to="/cart"
            className="flex items-center justify-between bg-[#C62828] text-white rounded-2xl px-4 py-3.5 shadow-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-sm">{totalItems} item dipilih</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-base">
                Rp{totalPrice.toLocaleString('id-ID')}
              </span>
              <span className="text-white/70 text-sm">›</span>
            </div>
          </Link>
        </div>
      )}
    </main>
  )
}
