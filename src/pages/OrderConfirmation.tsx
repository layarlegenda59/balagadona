import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, CheckCircle2, Home, UtensilsCrossed, Copy, Clock, Bike, ChefHat, CheckSquare, Star, FileDown, Share2 } from 'lucide-react'
import { OrderData } from '../types'
import { useDeliveryStore } from '../stores/deliveryStore'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import logoImage from '../assets/Logo Balagadona_fix.png'
import { supabase } from '../lib/supabase'
import { generateReceiptPDF } from '../lib/pdf'
import { playNewOrderNotification, playDeliveredNotification, getSharedAudioContext, startBackgroundKeepAlive, stopBackgroundKeepAlive } from '../lib/audio'
import bintang1Audio from '../assets/Bintang 1.mp3'
import bintang2Audio from '../assets/Bintang 2.mp3'
import bintang3Audio from '../assets/Bintang 3.mp3'
import bintang4Audio from '../assets/Bintang 4.mp3'
import bintang5Audio from '../assets/Bintang 5.mp3'

export default function OrderConfirmation() {

  const [order, setOrder] = useState<OrderData | null>(null)
  const [copied, setCopied] = useState(false)

  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false)
  const prevStatusRef = useRef<string>('')

  // Listen to browser user interaction to unlock/resume AudioContext
  useEffect(() => {
    const checkAudioUnlocked = () => {
      const ctx = getSharedAudioContext()
      if (ctx && ctx.state === 'running') {
        setIsAudioUnlocked(true)
      } else {
        setIsAudioUnlocked(false)
      }
    }

    checkAudioUnlocked()

    const handleUnlock = () => {
      setTimeout(checkAudioUnlocked, 100)
    }

    document.addEventListener('click', handleUnlock)
    document.addEventListener('touchstart', handleUnlock)

    // Run keep-alive automatically for live order tracking on mount
    startBackgroundKeepAlive(true)

    return () => {
      document.removeEventListener('click', handleUnlock)
      document.removeEventListener('touchstart', handleUnlock)
      stopBackgroundKeepAlive()
    }
  }, [])

  // Review states
  const [rating, setRating] = useState(0)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitted, setReviewSubmitted] = useState(false)

  // Dynamic tags list based on rating score
  const getReviewTags = () => {
    if (rating === 0) {
      return ['Rasa Mantap! 😋', 'Garing & Hangat! 🔥', 'Bumbu Kacang Juara! 🥜', 'Porsi Kenyang! 👍', 'Kurir Ramah! 🛵', 'Bikin Nagih! ❤️']
    }
    if (rating <= 3) {
      return [
        'Kurang Garing 😕',
        'Bumbu Kacang Sedikit 🥜',
        'Agak Dingin ❄️',
        'Porsi Sedikit 🍲',
        'Pengantaran Lama ⏳',
        'Kurir Kurang Ramah 🛵'
      ]
    }
    return [
      'Rasa Mantap! 😋',
      'Garing & Hangat! 🔥',
      'Bumbu Kacang Juara! 🥜',
      'Porsi Kenyang! 👍',
      'Kurir Ramah! 🛵',
      'Bikin Nagih! ❤️'
    ]
  }

  const handleRatingChange = (newRating: number) => {
    const wasLow = rating > 0 && rating <= 3
    const isNowLow = newRating <= 3
    // Reset selected tags if shifting between low and high rating pools to avoid mixed sentiments
    if (wasLow !== isNowLow) {
      setSelectedTags([])
    }
    setRating(newRating)
  }

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const getRatingLabel = () => {
    switch (rating) {
      case 1: return { text: 'Kecewa 😞', color: 'text-gray-500 bg-gray-100' }
      case 2: return { text: 'Kurang Puas 😐', color: 'text-amber-600 bg-amber-50' }
      case 3: return { text: 'Cukup Enak 🙂', color: 'text-yellow-600 bg-yellow-50' }
      case 4: return { text: 'Sangat Enak! 😋', color: 'text-[#C62828] bg-red-50' }
      case 5: return { text: 'Sempurna! 😍', color: 'text-[#C62828] bg-red-50 font-black animate-bounce-subtle' }
      default: return { text: 'Ketuk bintang untuk menilai', color: 'text-gray-400 bg-gray-50' }
    }
  }

  const handleReviewSubmit = async () => {
    if (rating === 0) {
      toast.error('Pilih jumlah bintang terlebih dahulu!')
      return
    }

    // Play the pre-recorded voice assistant thank-you audio corresponding to the star rating
    let audioSrc = ''
    if (rating === 5) {
      audioSrc = bintang5Audio
    } else if (rating === 4) {
      audioSrc = bintang4Audio
    } else if (rating === 3) {
      audioSrc = bintang3Audio
    } else if (rating === 2) {
      audioSrc = bintang2Audio
    } else if (rating === 1) {
      audioSrc = bintang1Audio
    }

    if (audioSrc) {
      try {
        const audio = new Audio(audioSrc)
        audio.play().catch(err => console.warn('Failed to play review audio:', err))
      } catch (err) {
        console.warn('Audio construction failed:', err)
      }
    }

    const customerName = order?.customer?.name || 'Pelanggan'

    try {
      await supabase.from('reviews').insert([
        {
          name: customerName,
          rating: rating,
          tags: selectedTags,
          comment: reviewComment,
        }
      ])
    } catch (err) {
      console.error('Failed to submit review to Supabase:', err)
    }

    setReviewSubmitted(true)
    toast.success('Ulasan Anda berhasil dikirim! Terima kasih.')
  }

  const storeOrders = useDeliveryStore((s) => s.orders)
  const updateOrderStatus = useDeliveryStore((s) => s.updateOrderStatus)

  useEffect(() => {
    const saved = localStorage.getItem('lastOrder')
    if (saved) {
      const parsedOrder = JSON.parse(saved) as OrderData
      setOrder(parsedOrder)

      if (parsedOrder?.id) {
        // Retrieve and update local order history for loyalty loops
        const historySaved = localStorage.getItem('balagadona-order-history')
        const history = historySaved ? JSON.parse(historySaved) : []
        if (!history.includes(parsedOrder.id)) {
          const nextHistory = [...history, parsedOrder.id]
          localStorage.setItem('balagadona-order-history', JSON.stringify(nextHistory))
        }
      }
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

  const currentOrderInStore = storeOrders.find((o) => o.id === order?.id)
  const currentStatus = currentOrderInStore?.status || order?.status || 'pending'

  const handleConfirmReceived = () => {
    if (order?.id) {
      updateOrderStatus(order.id, 'delivered')
      toast.success('Terima kasih atas konfirmasinya! Selamat menikmati batagor hangat kami. 🙏')
    }
  }

  const isDelivered = currentStatus === 'delivered'

  // Listen to status changes and play corresponding sounds
  useEffect(() => {
    if (!currentStatus) return
    const prevStatus = prevStatusRef.current

    if (prevStatus && prevStatus !== currentStatus) {
      if (currentStatus === 'preparing') {
        playNewOrderNotification() // Plays Order Masuk.mp3
        toast.info('🍳 Pesanan Anda mulai disiapkan di dapur!')
      } else if (currentStatus === 'ready') {
        playNewOrderNotification() // Plays Order Masuk.mp3
        toast.info('📦 Pesanan Anda sudah siap dikirim!')
      } else if (currentStatus === 'delivering') {
        playDeliveredNotification('Pelanggan') // Plays Courier.mp3
        toast.success('🛵 Kurir sedang mengantarkan pesanan Anda!')
      }
    }

    prevStatusRef.current = currentStatus
  }, [currentStatus])

  return (
    <main className="max-w-md mx-auto px-4 pb-24 pt-12 text-center animate-fade-in">
      {/* Sound Warning Banner when blocked by Autoplay Policy */}
      {!isAudioUnlocked && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-3.5 text-xs text-left mb-6 animate-pulse">
          ⚠️ <strong>Notifikasi Suara Live Terkunci:</strong> Harap ketuk bagian layar mana saja untuk mengizinkan browser memutar suara notifikasi pesanan secara otomatis saat HP Anda terkunci.
        </div>
      )}
      {/* Dynamic Keyframe Animations */}
      <style>{`
        @keyframes premium-float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.85); opacity: 0.8; }
          100% { transform: scale(1.25); opacity: 0; }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
      `}</style>

      {/* Success Icon / Celebration Icon */}
      <div className="flex justify-center mb-6">
        {isDelivered ? (
          <div className="relative w-32 h-32 flex items-center justify-center">
            {/* Animated double rings */}
            <div 
              className="absolute w-[104px] h-[104px] rounded-full bg-green-500/20 animate-pulse" 
              style={{ animation: 'pulse-ring 2s cubic-bezier(0.215, 0.610, 0.355, 1) infinite' }} 
            />
            <div 
              className="absolute w-[104px] h-[104px] rounded-full bg-green-500/10 animate-pulse" 
              style={{ animation: 'pulse-ring 2s cubic-bezier(0.215, 0.610, 0.355, 1) infinite 0.6s' }} 
            />
            
            {/* White card wrapper for logo - 30% larger, no green outer border */}
            <div className="relative w-[104px] h-[104px] rounded-full bg-white shadow-md z-10 flex items-center justify-center">
              <img src={logoImage} alt="Logo Balagadona" className="w-[80px] h-[80px] object-contain" />
            </div>

            {/* Check badge - positioned relative to larger circle */}
            <div className="absolute bottom-1.5 right-1.5 bg-green-500 text-white p-0.5 rounded-full border-2 border-white shadow-sm z-20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        ) : (
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-14 h-14 text-[#16A34A]" strokeWidth={1.5} />
          </div>
        )}
      </div>

      {isDelivered ? (
        <>
          <div 
            className="bg-gradient-to-br from-[#C62828] to-[#8B0000] text-white rounded-3xl p-6 mb-4 shadow-xl relative overflow-hidden text-center border border-red-700/30"
            style={{ animation: 'premium-float 4s ease-in-out infinite' }}
          >
            {/* Background pattern */}
            <div className="absolute -top-6 -right-6 transform rotate-12 opacity-10">
              <UtensilsCrossed className="w-32 h-32 text-white" />
            </div>
            
            <h2 className="font-display font-bold text-xl mb-1 text-white flex items-center justify-center gap-1.5">
              Selamat Menikmati! 🍽️
            </h2>
            <p className="text-red-100 text-xs leading-relaxed max-w-xs mx-auto">
              Pesanan Batagor Balagadona hangat Anda telah sampai dengan selamat. Terima kasih telah memesan, ditunggu pesanan berikutnya! 🙏
            </p>
          </div>

          {/* Simple Rating / Feedback Section */}
          <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-6 shadow-sm text-left animate-fade-in">
            {reviewSubmitted ? (
              <div className="text-center py-6 space-y-3 animate-fade-in">
                <div className="relative w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-2 border border-red-100 shadow-sm animate-bounce-subtle">
                  <span className="text-3xl">❤️</span>
                </div>
                <h3 className="font-display font-bold text-gray-800 text-base">Terima Kasih!</h3>
                <p className="text-[11px] text-gray-500 max-w-xs mx-auto leading-relaxed">
                  Ulasan Anda sangat berharga bagi kami untuk terus menjaga cita rasa dan kualitas premium Batagor Balagadona!
                </p>
                <div className="pt-2 text-[10px] text-gray-400 italic font-medium">
                  Rating Anda: {rating} ★ {selectedTags.length > 0 && `• "${selectedTags.join(', ')}"`}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="font-bold text-sm text-gray-800">Bagaimana rasa & layanan kami?</h3>
                  <p className="text-[10px] text-gray-400">Beri ulasan instan sekali klik tanpa mengetik</p>
                </div>

                {/* Stars selector with micro-animation */}
                <div className="flex flex-col items-center gap-2 py-1 border-b border-gray-50 pb-3">
                  <div className="flex gap-2.5 justify-center">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isActive = star <= rating
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleRatingChange(star)}
                          className="transition-all duration-150 hover:scale-110 active:scale-90 cursor-pointer relative focus:outline-none"
                          aria-label={`Bintang ${star}`}
                        >
                          <Star
                            className={`w-8 h-8 transition-all duration-200 ${
                              isActive
                                ? 'text-[#F9A825] fill-[#F9A825] drop-shadow-[0_1px_3px_rgba(249,168,37,0.5)]'
                                : 'text-gray-300 fill-transparent'
                            }`}
                          />
                        </button>
                      )
                    })}
                  </div>
                  {/* Rating description tag */}
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full transition-all duration-300 ${getRatingLabel().color}`}>
                    {getRatingLabel().text}
                  </span>
                </div>

                {/* Pills tags (Quick Feedback options) */}
                <div className="space-y-1.5">
                  <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Ulasan Instan</span>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {getReviewTags().map((tag) => {
                      const isSelected = selectedTags.includes(tag)
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleTagToggle(tag)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 active:scale-95 flex items-center gap-1 ${
                            isSelected
                              ? 'bg-red-50 text-[#C62828] border-[#C62828] font-bold shadow-sm scale-[1.02]'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {isSelected && <span className="text-[10px]">✓</span>}
                          <span>{tag}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Comment (Optional) */}
                <div className="space-y-1">
                  <label className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Komentar Tambahan (Opsional)</label>
                  <textarea
                    rows={2}
                    placeholder="Ada saran lain? Ketik di sini hanya jika diperlukan..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-[#C62828] focus:ring-1 focus:ring-[#C62828] transition-all bg-gray-50/50 resize-none placeholder-gray-400"
                  />
                </div>

                {/* Submit button */}
                <button
                  onClick={handleReviewSubmit}
                  disabled={rating === 0}
                  className="w-full bg-[#C62828] hover:bg-[#b71c1c] text-white py-3 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed shadow-md hover:shadow-lg shadow-red-900/10"
                >
                  Kirim Ulasan
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <h1 className="font-display font-bold text-2xl text-[#1F2937] mb-2">
            Pesanan Terkirim!
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Pesanan Anda sudah dikirim ke WhatsApp kami. Tim kami akan segera mengkonfirmasi pesanan Anda.
          </p>
        </>
      )}




      {/* Live Order Tracker Stepper */}
      {order && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 text-left mb-5 shadow-sm">
          <h3 className="font-bold text-sm text-[#1F2937] mb-4 flex items-center gap-1.5">
            <Bike className="w-4.5 h-4.5 text-[#C62828]" />
            Status Pengiriman Live
          </h3>

          <div className="relative pl-6 border-l-2 border-gray-100 ml-3">
            <AnimatePresence initial={false}>
              {[
                { id: 'pending', title: 'Menunggu Konfirmasi', desc: 'Admin mengkonfirmasi pesanan & pembayaran Anda via WhatsApp.' },
                { id: 'preparing', title: 'Sedang Disiapkan', desc: 'Batagor Balagadona sedang digoreng & dikemas hangat di dapur.' },
                { id: 'ready', title: 'Siap Diantar', desc: 'Pesanan Anda selesai dimasak dan menunggu kurir berangkat.' },
                { id: 'delivering', title: 'Dalam Pengantaran', desc: 'Kurir dalam perjalanan menuju alamat Anda sesuai jadwal batch.' },
              ]
                .filter((step) => {
                  const statuses = ['pending', 'preparing', 'ready', 'delivering', 'delivered']
                  const currentIndex = statuses.indexOf(currentStatus)
                  const stepIndex = ['pending', 'preparing', 'ready', 'delivering'].indexOf(step.id)
                  return stepIndex >= currentIndex
                })
                .map((step) => {
                  const isActive = currentStatus === step.id
                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, height: 0, y: 15 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -15, transition: { duration: 0.25 } }}
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                      className="relative pb-5 last:pb-0"
                    >
                      <span className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 ${
                        isActive
                          ? 'bg-[#C62828] border-[#C62828] ring-4 ring-red-100'
                          : 'bg-white border-gray-300'
                      }`} />
                      <div className="text-xs">
                        <span className="font-bold text-gray-800">{step.title}</span>
                        <p className="text-gray-400 text-[10px] mt-0.5">{step.desc}</p>
                      </div>
                    </motion.div>
                  )
                })}
            </AnimatePresence>
          </div>

          {/* Customer Self-Confirmation Button */}
          {currentStatus === 'delivering' && (
            <button
              onClick={handleConfirmReceived}
              className="mt-5 w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Konfirmasi Saya Sudah Menerima Pesanan</span>
            </button>
          )}
        </div>
      )}


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

      {/* Premium Referral & Share Card (Viral Loop) */}
      <div className="bg-[#F9A825]/10 border border-[#F9A825]/30 rounded-2xl p-4 text-left mb-6 mt-4">
        <div className="flex items-start gap-2.5">
          <span className="text-xl">📢</span>
          <div>
            <h4 className="font-bold text-[#1F2937] text-xs leading-snug">Bagikan Kelezatan Balagadona</h4>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
              Rekomendasikan batagor renyah premium terlezat di Cimahi ke teman-temanmu di WhatsApp!
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            const shareText = `Wah, saya baru saja memesan Batagor Balagadona hangat yang super renyah dan bumbunya juara banget! Batagor premium terlezat di Cimahi. Kamu juga harus coba, pesan praktis langsung di sini: https://batagor-balagadona.vercel.app 😋🔥`
            const shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`
            window.open(shareUrl, '_blank', 'noopener,noreferrer')
          }}
          className="w-full bg-[#16A34A] hover:bg-[#15803d] text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 mt-3 shadow-sm"
        >
          <Share2 className="w-4 h-4" />
          <span>Bagikan ke WhatsApp Teman</span>
        </button>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {order && (
          <button
            type="button"
            onClick={() => {
              try {
                generateReceiptPDF(order)
                toast.success('Struk digital berhasil disimpan!')
              } catch (err) {
                console.error(err)
                toast.error('Gagal mengunduh struk.')
              }
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
          >
            <FileDown className="w-4 h-4" />
            <span>Simpan Struk Digital (PDF)</span>
          </button>
        )}
        
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
