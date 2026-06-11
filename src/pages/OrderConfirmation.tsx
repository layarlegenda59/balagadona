import { Link } from 'react-router-dom'
import { CheckCircle, Home, UtensilsCrossed, Copy, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { OrderData } from '../types'

export default function OrderConfirmation() {
  const [order, setOrder] = useState<OrderData | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('lastOrder')
    if (saved) {
      setOrder(JSON.parse(saved))
    }
  }, [])

  const copyOrderId = () => {
    if (order?.id) {
      navigator.clipboard.writeText(order.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatPrice = (price: number) => {
    return 'Rp' + price.toLocaleString('id-ID')
  }



  return (
    <main className="max-w-md mx-auto px-4 pb-24 pt-12 text-center animate-fade-in">
      {/* Success Icon */}
      <div className="flex justify-center mb-5">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-14 h-14 text-[#16A34A]" strokeWidth={1.5} />
        </div>
      </div>

      <h1 className="font-display font-bold text-2xl text-[#1F2937] mb-2">
        Pesanan Terkirim!
      </h1>
      <p className="text-gray-500 text-sm leading-relaxed mb-6">
        Pesanan Anda sudah dikirim ke WhatsApp kami. Tim kami akan segera mengkonfirmasi pesanan Anda.
      </p>

      {/* Order Info */}
      {order && (
        <>
          <div className="bg-gray-50 rounded-2xl p-4 text-left mb-4 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-[#1F2937] text-sm mb-3">Detail Pesanan</h2>
            <div className="space-y-2">
              {/* Order ID with Copy */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">ID Pesanan</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#1F2937] font-mono text-xs">{order.id}</span>
                  <button
                    onClick={copyOrderId}
                    className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                    aria-label="Salin ID pesanan"
                  >
                    <Copy className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  {copied && <span className="text-[#16A34A] text-xs">Tersalin!</span>}
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Nama</span>
                <span className="font-semibold text-[#1F2937]">{order.customer.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Waktu Pengiriman</span>
                <span className="flex items-center gap-1 font-semibold text-[#1F2937]">
                  <Clock className="w-3.5 h-3.5" />
                  {order.customer.deliveryTime}
                </span>
              </div>
            </div>
          </div>

          {/* Items Ordered */}
          <div className="bg-gray-50 rounded-2xl p-4 text-left mb-4 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-[#1F2937] text-sm mb-3">Item Pesanan</h2>
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.product.name} x{item.quantity}
                  </span>
                  <span className="font-medium text-[#1F2937]">
                    {formatPrice(item.product.price * item.quantity)}
                  </span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between">
                <span className="font-semibold text-[#1F2937]">Total</span>
                <span className="font-bold text-[#C62828]">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Steps */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-left mb-8">
        <h3 className="font-semibold text-blue-900 text-sm mb-3">Langkah Selanjutnya</h3>
        <div className="space-y-3">
          {[
            { step: '1', text: 'WhatsApp terbuka otomatis. Tekan kirim jika belum terkirim.' },
            { step: '2', text: 'Admin kami akan mengkonfirmasi pesanan dalam 5-10 menit.' },
            { step: '3', text: 'Lakukan pembayaran sesuai instruksi admin.' },
            { step: '4', text: 'Pesanan Anda akan segera diantar. Selamat menikmati!' },
          ].map(({ step, text }) => (
            <div key={step} className="flex gap-3">
              <div className="w-5 h-5 bg-[#C62828] rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-white text-[10px] font-bold">{step}</span>
              </div>
              <p className="text-blue-800 text-xs leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <Link to="/" className="btn-primary w-full gap-2">
          <Home className="w-4 h-4" />
          Kembali ke Beranda
        </Link>
        <Link to="/menu" className="btn-outline w-full gap-2">
          <UtensilsCrossed className="w-4 h-4" />
          Pesan Lagi
        </Link>
      </div>
    </main>
  )
}
