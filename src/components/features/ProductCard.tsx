import { Plus, Check } from 'lucide-react'
import { useState } from 'react'
import { useCartStore } from '../../stores/cartStore'
import { formatPrice } from '../../constants/products'
import type { Product } from '../../types'
import ImageSkeleton from './ImageSkeleton'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem)
  const cartItems = useCartStore((s) => s.items)
  const [added, setAdded] = useState(false)

  const qty = cartItems.find((i) => i.product.id === product.id)?.quantity ?? 0

  const handleAdd = () => {
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1000)
  }

  return (
    <div className="card flex flex-col hover:shadow-lg transition-shadow duration-200 animate-slide-up">
      {/* Image */}
      <ImageSkeleton
        src={product.image}
        alt={product.name}
        className="relative overflow-hidden h-44"
        skeletonClassName="rounded-none"
      >
        {product.badge && (
          <span className="absolute top-2 left-2 badge bg-[#C62828] text-white z-10">
            {product.badge}
          </span>
        )}
        {qty > 0 && (
          <span className="absolute top-2 right-2 badge bg-[#1F2937] text-white z-10">
            ×{qty}
          </span>
        )}
      </ImageSkeleton>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-display font-bold text-[#1F2937] text-base leading-tight mb-1">
          {product.name}
        </h3>
        <p className="text-gray-500 text-sm leading-relaxed flex-1 mb-3">
          {product.description}
        </p>
        <div className="flex items-center justify-between mt-auto gap-2">
          <span className="font-display font-bold text-[#C62828] text-lg">
            {formatPrice(product.price)}
          </span>
          <button
            onClick={handleAdd}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold min-h-[44px] min-w-[44px] transition-all duration-200 active:scale-95 ${
              added
                ? 'bg-[#16A34A] text-white'
                : 'bg-[#C62828] text-white hover:bg-[#b71c1c]'
            }`}
            aria-label={`Tambah ${product.name} ke keranjang`}
          >
            {added ? (
              <>
                <Check className="w-4 h-4" />
                <span>Ditambah!</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Tambah</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
