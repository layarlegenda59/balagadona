import { Link, useNavigate } from 'react-router-dom'
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft } from 'lucide-react'
import { useCartStore } from '../stores/cartStore'
import { formatPrice } from '../constants/products'

export default function Cart() {
  const { items, increaseQty, decreaseQty, setQty, removeItem, cartNotes, setCartNotes, totalItems, totalPrice } = useCartStore()
  const navigate = useNavigate()
  const total = totalItems()
  const price = totalPrice()

  if (items.length === 0) {
    return (
      <main className="max-w-md mx-auto px-4 pb-24 pt-8 text-center">
        <div className="py-16">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-10 h-10 text-gray-300" />
          </div>
          <h2 className="font-display font-bold text-xl text-[#1F2937] mb-2">
            Keranjang Kosong
          </h2>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Belum ada produk di keranjang Anda.<br />Yuk, pilih batagor favorit!
          </p>
          <Link to="/menu" className="btn-primary">
            Lihat Menu
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-md mx-auto pb-36 sm:pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display font-bold text-xl text-[#1F2937]">Keranjang</h1>
          <p className="text-gray-500 text-sm">{total} item</p>
        </div>
      </div>

      {/* Cart Items */}
      <div className="px-4 space-y-3">
        {items.map(({ product, quantity }) => (
          <div key={product.id} className="card p-4 flex gap-3 animate-fade-in">
            <img
              src={product.image}
              alt={product.name}
              className="w-20 h-20 object-cover rounded-xl shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-[#1F2937] text-sm leading-tight">{product.name}</h3>
                <button
                  onClick={() => removeItem(product.id)}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                  aria-label={`Hapus ${product.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[#C62828] font-bold text-base mt-1">
                {formatPrice(product.price)}
              </p>

              {/* Qty Controls */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => decreaseQty(product.id)}
                  className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors active:scale-95"
                  aria-label="Kurangi"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  value={quantity || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    if (!isNaN(val) && val >= 0) {
                      setQty(product.id, val)
                    }
                  }}
                  onBlur={() => {
                    if (!quantity || quantity <= 0) {
                      setQty(product.id, 1)
                    }
                  }}
                  className="font-bold text-[#1F2937] text-sm w-12 text-center bg-gray-50 border border-gray-200 rounded-md py-0.5 px-1 focus:border-[#C62828] focus:bg-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  aria-label="Kuantitas kustom"
                />
                <button
                  onClick={() => increaseQty(product.id)}
                  className="w-8 h-8 flex items-center justify-center bg-[#C62828] text-white rounded-lg hover:bg-[#b71c1c] transition-colors active:scale-95"
                  aria-label="Tambah"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <span className="text-gray-400 text-xs ml-1">
                  = {formatPrice(product.price * quantity)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="px-4 mt-6">
        <label className="block text-sm font-semibold text-[#1F2937] mb-2">
          Catatan Pesanan
        </label>
        <textarea
          value={cartNotes}
          onChange={(e) => setCartNotes(e.target.value)}
          placeholder="Contoh: Bumbu kacang dipisah, tidak pakai seledri..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C62828] focus:ring-2 focus:ring-[#C62828]/20 outline-none transition-all text-sm resize-none"
          rows={3}
        />
      </div>

      {/* Summary */}
      <div className="px-4 mt-8">
        <div className="bg-gray-50 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-500 text-sm">Subtotal</span>
            <span className="font-display font-bold text-xl text-[#C62828]">
              {formatPrice(price)}
            </span>
          </div>
          <Link to="/checkout" className="btn-primary w-full py-4 text-base font-bold">
            Lanjut ke Detail Pengiriman
          </Link>
        </div>
      </div>
    </main>
  )
}
