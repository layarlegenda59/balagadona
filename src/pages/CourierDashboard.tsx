import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import PasscodeGate from '../components/features/PasscodeGate'
import InstallBanner from '../components/features/InstallBanner'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import {
  Clock,
  ArrowLeft,
  Bike,
  CheckCircle2,
  Phone,
  MapPin,
  ClipboardList,
  AlertCircle,
  Play,
  Check,
} from 'lucide-react'
import { useDeliveryStore } from '../stores/deliveryStore'
import { formatPrice } from '../constants/products'
import { toast } from 'sonner'
import { playDeliveredNotification, getSharedAudioContext } from '../lib/audio'

export default function CourierDashboard() {
  const { batches, orders, updateOrderStatus } = useDeliveryStore()
  const [selectedBatchId, setSelectedBatchId] = useState('batch-1')

  const [isAudioEnabled, setIsAudioEnabled] = useState(() => {
    const saved = localStorage.getItem('courier-audio-enabled')
    return saved !== 'false' // default to true if not set
  })

  const prevOrdersRef = useRef(orders)
  const isFirstLoadRef = useRef(true)

  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false)

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

    return () => {
      document.removeEventListener('click', handleUnlock)
      document.removeEventListener('touchstart', handleUnlock)
    }
  }, [])

  // Background Audio Keep-Alive to prevent sleep/suspension when locked
  useEffect(() => {
    // 1. Looping silent HTML5 audio element
    const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA')
    audio.loop = true

    // 2. Persistent sub-audible Web Audio oscillator (1 Hz at 0.0001 volume) on the global context
    let osc: OscillatorNode | null = null
    let gain: GainNode | null = null
    
    const startKeepAlive = () => {
      if (!isAudioEnabled) return
      
      try {
        // Play silent HTML5 loop
        audio.play().catch(err => console.warn('Silent HTML5 play failed:', err))

        // Start sub-audible Web Audio oscillator on the global context
        const ctx = getSharedAudioContext()
        if (ctx) {
          if (!osc) {
            osc = ctx.createOscillator()
            gain = ctx.createGain()
            
            osc.frequency.setValueAtTime(1, ctx.currentTime) // 1 Hz (sub-audible)
            gain.gain.setValueAtTime(0.0001, ctx.currentTime) // virtually silent
            
            osc.connect(gain)
            gain.connect(ctx.destination)
            
            osc.start()
          } else if (ctx.state === 'suspended') {
            ctx.resume().catch(e => console.warn(e))
          }
        }
      } catch (err) {
        console.warn('Keep-alive start failed:', err)
      }
    }

    const stopKeepAlive = () => {
      try {
        audio.pause()
        const ctx = getSharedAudioContext()
        if (ctx && ctx.state === 'running') {
          ctx.suspend().catch(e => console.warn(e))
        }
      } catch (err) {
        console.warn('Keep-alive stop failed:', err)
      }
    }

    // Trigger keep-alive on user interaction
    const triggerStart = () => {
      startKeepAlive()
    }

    if (isAudioEnabled) {
      document.addEventListener('click', triggerStart)
      document.addEventListener('touchstart', triggerStart)
      startKeepAlive()
    } else {
      stopKeepAlive()
    }

    return () => {
      document.removeEventListener('click', triggerStart)
      document.removeEventListener('touchstart', triggerStart)
      audio.pause()
      if (osc) {
        try { osc.stop() } catch(e){}
      }
    }
  }, [isAudioEnabled])

  // Screen Wake Lock to keep the screen standby and prevent phone lock/sleep
  useEffect(() => {
    let wakeLock: any = null
    const requestLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen')
        }
      } catch (err) {
        console.warn('Wake Lock request failed:', err)
      }
    }

    requestLock()

    // Re-acquire lock and resume audio context when visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestLock()
        // Resume the global shared AudioContext if suspended
        const ctx = getSharedAudioContext()
        if (ctx && ctx.state === 'suspended') {
          ctx.resume().catch(e => console.warn(e))
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (wakeLock) {
        wakeLock.release().catch((e: any) => console.log(e))
      }
    }
  }, [])

  // Initial load delay to avoid noise on first mount
  useEffect(() => {
    const timer = setTimeout(() => {
      isFirstLoadRef.current = false
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  // Sound trigger on order status transitioning to 'ready'
  useEffect(() => {
    const prevOrders = prevOrdersRef.current

    orders.forEach((newOrder) => {
      const prevOrder = prevOrders.find((o) => o.id === newOrder.id)
      // Transition: not 'ready' previously, now 'ready'
      if (prevOrder && prevOrder.status !== 'ready' && newOrder.status === 'ready') {
        const isDemo = newOrder.id?.includes('DEMO')
        if (!isDemo && isAudioEnabled) {
          playDeliveredNotification('Pelanggan') // Plays Courier.mp3
          toast.info(`🔔 Pesanan ${newOrder.customer?.name || 'Pelanggan'} siap diantar!`, {
            duration: 6000,
          })
        }
      }
    })

    prevOrdersRef.current = orders
  }, [orders, isAudioEnabled])


  // Filter orders for the selected batch
  const batchOrders = orders
    .filter((o) => o.batchId === selectedBatchId)
    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))

  const undeliveredOrders = batchOrders.filter((o) => o.status !== 'delivered')
  const activeBatchObj = batches.find((b) => b.id === selectedBatchId)

  // Start delivery for all ready/pending/preparing orders in the batch
  const handleStartDelivery = () => {
    if (batchOrders.length === 0) {
      toast.error('Tidak ada pesanan di batch ini')
      return
    }

    let startedCount = 0
    batchOrders.forEach((o) => {
      if (o.status === 'pending' || o.status === 'preparing' || o.status === 'ready') {
        updateOrderStatus(o.id, 'delivering')
        startedCount++
      }
    })

    if (startedCount > 0) {
      toast.success(`${startedCount} pesanan di-set sedang diantar!`)
    } else {
      toast.info('Seluruh pesanan sudah dalam pengantaran atau selesai.')
    }
  }

  // Complete delivery for a specific order
  const handleCompleteOrder = (orderId: string) => {
    updateOrderStatus(orderId, 'delivered')
    toast.success('Pesanan berhasil diselesaikan!')
  }

  const { showBanner, triggerInstall, dismissBanner } = useInstallPrompt()

  return (
    <PasscodeGate target="courier">
      {showBanner && (
        <InstallBanner onInstall={triggerInstall} onDismiss={dismissBanner} />
      )}
      <main className="max-w-md mx-auto px-4 pb-28 pt-4 animate-fade-in text-[#1F2937] bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#C62828] text-white shadow-sm">
          <Bike className="w-4 h-4" />
        </div>
        <div>
          <h1 className="font-display font-bold text-lg text-gray-800 leading-tight">Dashboard Kurir</h1>
          <p className="text-gray-500 text-[10px]">Jadwal & Urutan Pengiriman</p>
        </div>
      </div>

      {/* Sound Warning Banner when blocked by Autoplay Policy */}
      {isAudioEnabled && !isAudioUnlocked && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-3.5 text-xs text-left mb-4 animate-pulse">
          ⚠️ <strong>Notifikasi Suara Terkunci:</strong> Harap ketuk tombol di bawah atau bagian layar mana saja untuk mengaktifkan notifikasi suara kurir secara otomatis.
        </div>
      )}

      {/* Sound Control Panel */}
      <div className="bg-white border border-gray-100 rounded-2xl p-3.5 shadow-sm flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🔊</span>
          <div className="text-left">
            <h4 className="font-bold text-[#1F2937] text-xs">Asisten Suara Kurir</h4>
            <p className="text-[9px] text-gray-500 leading-tight mt-0.5">
              {isAudioEnabled 
                ? 'Ringtone aktif & browser terkunci agar standby terus meski HP dikunci.' 
                : 'Aktifkan suara agar ringtone & mode standby lock screen berjalan.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (isAudioEnabled && !isAudioUnlocked) {
              // Trigger play to unlock
              playDeliveredNotification('Pelanggan')
              toast.success('🔔 Suara & Standby Lock Screen Aktif!')
              return
            }
            const nextState = !isAudioEnabled
            setIsAudioEnabled(nextState)
            localStorage.setItem('courier-audio-enabled', String(nextState))
            if (nextState) {
              playDeliveredNotification('Pelanggan')
              toast.success('🔔 Suara & Standby Lock Screen Aktif!')
            } else {
              toast.info('🔕 Suara & Standby Lock Screen Dinonaktifkan.')
            }
          }}
          className={`px-3 py-2 rounded-xl text-[9px] font-bold shrink-0 transition-all active:scale-95 flex items-center gap-1 shadow-sm border ${
            isAudioEnabled
              ? isAudioUnlocked
                ? 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'
                : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 animate-pulse'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-500 border-gray-200'
          }`}
        >
          <span>
            {isAudioEnabled
              ? isAudioUnlocked
                ? '🔊 Suara Aktif'
                : '🔊 Ketuk untuk Aktifkan'
              : '🔇 Suara Mati'}
          </span>
        </button>
      </div>

      {/* Select Batch - Horizontal Scroll Tabs */}
      <div className="mb-4 bg-white border border-gray-100 rounded-2xl p-3 shadow-sm">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2 px-1">
          Pilih Batch Pengiriman
        </span>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-3 px-3 snap-x">
          {batches.filter(b => b.id !== 'store-settings').map((b) => {
            const count = orders.filter((o) => o.batchId === b.id).length
            const isSelected = selectedBatchId === b.id
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBatchId(b.id)}
                className={`snap-start shrink-0 px-3 py-2 rounded-xl border flex flex-col items-center justify-center min-w-[105px] transition-all duration-200 active:scale-95 ${
                  isSelected
                    ? 'border-[#C62828] bg-[#C62828] text-white shadow-sm ring-1 ring-[#C62828]'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="text-[11px] font-bold block leading-none">{b.name}</span>
                <span className={`text-[8px] block mt-1 leading-none ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                  {b.timeRange}
                </span>
                <span className={`text-[9px] font-bold block mt-1.5 leading-none ${isSelected ? 'text-yellow-300' : 'text-[#C62828]'}`}>
                  {count} Order
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Action Button: Start delivery for the whole batch */}
      {batchOrders.length > 0 && undeliveredOrders.length > 0 && (
        <button
          onClick={handleStartDelivery}
          className="w-full bg-[#C62828] hover:bg-[#b71c1c] text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 mb-4 shadow-md transition-all active:scale-95 hover:scale-[1.01]"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          <span>Mulai Antar Batch Ini ({undeliveredOrders.length} Order)</span>
        </button>
      )}

      {/* Route & Orders list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <ClipboardList className="w-3.5 h-3.5 text-[#C62828]" />
            Daftar Antaran {activeBatchObj ? `(${activeBatchObj.name})` : ''}
          </h3>
          {batchOrders.length > 0 && (
            <span className="text-[10px] text-gray-400 font-semibold bg-gray-200/50 px-2 py-0.5 rounded-full">
              {batchOrders.length} Pesanan
            </span>
          )}
        </div>

        {batchOrders.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
            <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2 animate-bounce" />
            <p className="text-xs text-gray-400 italic">Belum ada pesanan untuk batch ini.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {batchOrders.map((order, index) => {
              const isDelivered = order.status === 'delivered'
              const isDelivering = order.status === 'delivering'

              return (
                <div
                  key={order.id}
                  className={`bg-white border rounded-2xl p-3 shadow-sm relative overflow-hidden transition-all duration-200 ${
                    isDelivered
                      ? 'border-gray-200 bg-gray-50/70 opacity-70'
                      : isDelivering
                      ? 'border-blue-200 ring-1 ring-blue-100 shadow-md shadow-blue-50 bg-white'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex flex-col gap-2.5">
                    {/* Top Row: Name, Order ID, Distance */}
                    <div className="flex items-center justify-between border-b border-gray-100/60 pb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0 ${
                          isDelivered ? 'bg-green-100 text-green-700' : isDelivering ? 'bg-blue-600 text-white animate-pulse' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {index + 1}
                        </span>
                        <h4 className="font-bold text-sm text-gray-800 truncate">{order.customer.name}</h4>
                        <span className="text-[8px] bg-gray-100 text-gray-500 font-mono px-1 py-0.2 rounded shrink-0">
                          {order.id.replace('ORD-', '')}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-[#C62828] bg-red-50 px-2 py-0.5 rounded-full shrink-0">
                        {order.deliveryDistance}
                      </span>
                    </div>

                    {/* Middle Row: Address & Contact Shortcuts */}
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: Address info & item text */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-start gap-1 text-[11px] text-gray-600">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                          <span className="leading-snug text-gray-700 font-medium line-clamp-2">{order.customer.address}</span>
                        </div>
                        
                        {/* Inline Simplified Items */}
                        <div className="text-[10px] text-gray-500 bg-gray-50/80 px-2 py-1 rounded-lg border border-gray-100/60">
                          <span className="font-bold text-gray-400 uppercase text-[8px] block tracking-wider leading-none mb-0.5">Item:</span>
                          <span className="font-semibold text-gray-700 leading-tight block">
                            {order.items.map((i) => `${i.quantity}x ${i.product.name}`).join(', ')}
                          </span>
                        </div>

                        {order.customer.notes && (
                          <div className="text-[9px] bg-amber-50/50 border border-amber-100 text-amber-800 px-2 py-0.5 rounded">
                            <span className="font-bold uppercase text-[7px] text-amber-600 block leading-none">Catatan:</span>
                            {order.customer.notes}
                          </div>
                        )}
                      </div>

                      {/* Right: Circle quick-tap buttons */}
                      <div className="flex flex-col gap-1.5 shrink-0 justify-center">
                        {/* Navigation button */}
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customer.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 active:scale-90 transition-transform shadow-sm"
                          title="Navigasi Peta"
                        >
                          <MapPin className="w-4 h-4 fill-blue-50 text-blue-600" />
                        </a>
                        
                        {/* Contact WhatsApp */}
                        <a
                          href={`https://wa.me/${order.customer.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-green-50 text-green-600 hover:bg-green-100 border border-green-100 active:scale-90 transition-transform shadow-sm"
                          title="Hubungi WhatsApp"
                        >
                          <Phone className="w-4 h-4 fill-green-50 text-green-600" />
                        </a>
                      </div>
                    </div>

                    {/* Bottom Row: Total Price and Action Status */}
                    <div className="flex justify-between items-center border-t border-gray-100/60 pt-2">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider leading-none">Total Tagihan</span>
                        <span className="text-xs font-bold text-gray-800 leading-tight">
                          {formatPrice(order.total)}
                        </span>
                      </div>

                      {isDelivered ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-xl border border-green-100">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Terkirim
                        </span>
                      ) : isDelivering ? (
                        <button
                          onClick={() => handleCompleteOrder(order.id)}
                          className="bg-[#16A34A] hover:bg-[#15803d] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all active:scale-95 shadow-sm hover:shadow"
                        >
                          <Check className="w-3.5 h-3.5" strokeWidth={3} />
                          <span>Selesaikan</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'delivering')}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all active:scale-95 shadow-sm hover:shadow"
                        >
                          <Bike className="w-3.5 h-3.5" />
                          <span>Mulai Kirim</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
    </PasscodeGate>
  )
}

