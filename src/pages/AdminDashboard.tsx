import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Clock,
  Settings,
  AlertCircle,
  CheckCircle,
  MapPin,
  ArrowLeft,
  ChevronRight,
  Bike,
  Package,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  TrendingUp,
} from 'lucide-react'
import { useDeliveryStore, getMockCoords } from '../stores/deliveryStore'
import { formatPrice } from '../constants/products'
import { toast } from 'sonner'
import { DeliveryBatch, OrderData } from '../types'

// Programmatic synthesizer sound and speech alert for incoming orders
const playNewOrderNotification = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContext) {
      const ctx = new AudioContext()
      if (ctx.state === 'suspended') {
        ctx.resume().catch(e => console.warn(e))
      }
      
      // Chime note 1 (D5)
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime)
      gain1.gain.setValueAtTime(0.15, ctx.currentTime)
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start()
      osc1.stop(ctx.currentTime + 0.4)

      // Chime note 2 (A5 - slightly delayed)
      setTimeout(() => {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(e => console.warn(e))
        }
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.type = 'sine'
        osc2.frequency.setValueAtTime(880, ctx.currentTime)
        gain2.gain.setValueAtTime(0.2, ctx.currentTime)
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
        osc2.connect(gain2)
        gain2.connect(ctx.destination)
        osc2.start()
        osc2.stop(ctx.currentTime + 0.6)
      }, 120)
    }

    // Voice announcement: "Ada pesanan masuk!"
    setTimeout(() => {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance('Ada pesanan masuk!')
        utterance.lang = 'id-ID'
        utterance.rate = 1.0
        utterance.pitch = 1.15
        window.speechSynthesis.speak(utterance)
      }
    }, 600)
  } catch (err) {
    console.error('Failed to play sound:', err)
  }
}

// Programmatic synthesizer chime and voice assistant for completed/delivered orders
const playDeliveredNotification = (customerName: string) => {
  try {
    const nameToSpeak = customerName || 'Pelanggan'
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContext) {
      const ctx = new AudioContext()
      if (ctx.state === 'suspended') {
        ctx.resume().catch(e => console.warn(e))
      }
      
      // Happy arpeggio success chord (C5 -> E5 -> G5 -> C6)
      const playNote = (freq: number, delay: number, duration: number) => {
        setTimeout(() => {
          if (ctx.state === 'suspended') {
            ctx.resume().catch(e => console.warn(e))
          }
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, ctx.currentTime)
          gain.gain.setValueAtTime(0.12, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start()
          osc.stop(ctx.currentTime + duration)
        }, delay)
      }

      playNote(523.25, 0, 0.3)    // C5
      playNote(659.25, 100, 0.3)  // E5
      playNote(783.99, 200, 0.3)  // G5
      playNote(1046.50, 300, 0.5) // C6
    }

    // Voice announcement: "Pesanan untuk [Nama] telah sukses diantarkan!"
    setTimeout(() => {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(`Pesanan untuk ${nameToSpeak} telah sukses diantarkan!`)
        utterance.lang = 'id-ID'
        utterance.rate = 1.0
        utterance.pitch = 1.1
        window.speechSynthesis.speak(utterance)
      }
    }, 800)
  } catch (err) {
    console.error('Failed to play delivered sound:', err)
  }
}

export default function AdminDashboard() {
  const {
    batches,
    orders,
    addBatch,
    updateBatch,
    deleteBatch,
    deleteOrder,
    getRemainingQuota,
    updateOrderStatus,
    optimizeBatchSequence,
    clearAllOrders,
    seedDemoData,
  } = useDeliveryStore()

  const [activeTab, setActiveTab] = useState<'overview' | 'batches' | 'quotas'>('overview')

  const [isAudioEnabled, setIsAudioEnabled] = useState(() => {
    const saved = localStorage.getItem('admin-audio-enabled')
    return saved !== 'false' // default to true if not set
  })

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
        // Resume AudioContext if it was suspended by the browser
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext
        if (AudioContext) {
          const ctx = new AudioContext()
          if (ctx.state === 'suspended') {
            ctx.resume()
          }
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

  // Sound Notification on New Order and Completed Delivery (handles both local updates and synced database updates)
  const [prevOrders, setPrevOrders] = useState<OrderData[]>(orders)

  useEffect(() => {
    // 1. Detect new orders (when orders array contains items not in prevOrders)
    orders.forEach((newOrder) => {
      const exists = prevOrders.some((o) => o.id === newOrder.id)
      if (!exists && prevOrders.length > 0) {
        // check if it's not a demo seeding bulk insert
        const isDemo = newOrder.id?.includes('DEMO')
        if (!isDemo && isAudioEnabled) {
          playNewOrderNotification()
          toast.info('🔔 Ada Pesanan Baru Masuk!', {
            duration: 5000,
          })
        }
      }
    })

    // 2. Detect order status change to 'delivered'
    orders.forEach((newOrder) => {
      const prevOrder = prevOrders.find((o) => o.id === newOrder.id)
      if (prevOrder && prevOrder.status !== 'delivered' && newOrder.status === 'delivered') {
        if (isAudioEnabled) {
          playDeliveredNotification(newOrder.customer.name || 'Pelanggan')
        }
        toast.success(`✅ Pesanan ${newOrder.customer.name || 'Pelanggan'} selesai diantar!`, {
          duration: 5000,
        })
      }
    })

    setPrevOrders(orders)
  }, [orders, prevOrders, isAudioEnabled])



  // CRUD Batch States
  const [isAddingBatch, setIsAddingBatch] = useState(false)
  const [newBatchName, setNewBatchName] = useState('')
  const [newBatchTime, setNewBatchTime] = useState('')
  const [newBatchQuota, setNewBatchQuota] = useState(8)

  const [editingBatchId, setEditingBatchId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editQuota, setEditQuota] = useState(8)

  // Calculations
  const totalSales = orders.reduce((sum, o) => sum + o.total, 0)
  const totalActiveOrders = orders.length

  const calculateWorkload = (batchId: string) => {
    const batchOrders = orders.filter((o) => o.batchId === batchId && o.status !== 'delivered')
    const totalPortions = batchOrders.reduce((sum, o) => sum + o.items.reduce((iSum, item) => iSum + item.quantity, 0), 0)

    let totalEstKm = 0
    batchOrders.forEach((o) => {
      if (o.deliveryDistance.includes('s/d 3')) totalEstKm += 1.5
      else if (o.deliveryDistance.includes('3 - 5')) totalEstKm += 4
      else if (o.deliveryDistance.includes('5 - 10')) totalEstKm += 7.5
      else totalEstKm += 12
    })

    const baseTravelMins = (totalEstKm / 25) * 60
    const deliveryDropMins = batchOrders.length * 6
    const totalEstMins = Math.round(baseTravelMins + deliveryDropMins)

    return {
      orderCount: batchOrders.length,
      portions: totalPortions,
      distanceKm: parseFloat(totalEstKm.toFixed(1)),
      durationMins: totalEstMins,
      revenue: batchOrders.reduce((sum, o) => sum + o.total, 0),
    }
  }

  // CRUD Batch Actions
  const handleAddBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBatchName.trim() || !newBatchTime.trim() || newBatchQuota < 1) {
      toast.error('Lengkapi semua data batch dengan benar!')
      return
    }

    const id = `batch-${Date.now()}`
    addBatch({
      id,
      name: newBatchName,
      timeRange: newBatchTime,
      maxQuota: newBatchQuota,
    })

    setIsAddingBatch(false)
    setNewBatchName('')
    setNewBatchTime('')
    setNewBatchQuota(8)
    toast.success('Batch baru berhasil ditambahkan!')
  }

  const handleStartEditBatch = (b: DeliveryBatch) => {
    setEditingBatchId(b.id)
    setEditName(b.name)
    setEditTime(b.timeRange)
    setEditQuota(b.maxQuota)
  }

  const handleSaveEditBatch = (id: string) => {
    if (!editName.trim() || !editTime.trim() || editQuota < 1) {
      toast.error('Lengkapi data edit batch!')
      return
    }
    updateBatch(id, editName, editTime, editQuota)
    setEditingBatchId(null)
    toast.success('Batch berhasil diperbarui!')
  }

  const handleDeleteBatchClick = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus batch ini? Seluruh pesanan di dalam batch ini juga akan dibersihkan.')) {
      deleteBatch(id)
      toast.success('Batch berhasil dihapus!')
    }
  }

  const handleDeleteOrderClick = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus/membatalkan pesanan ini?')) {
      deleteOrder(id)
      toast.success('Pesanan berhasil dihapus!')
    }
  }

  const handleClearOrders = async () => {
    if (confirm('Apakah Anda yakin ingin menghapus seluruh pesanan dari database? Tindakan ini akan mengosongkan semua data pesanan agar sistem kembali fresh.')) {
      try {
        await clearAllOrders()
        toast.success('🧹 Semua data pesanan berhasil dibersihkan!')
      } catch (err) {
        console.error(err)
        toast.error('Gagal membersihkan data pesanan.')
      }
    }
  }

  const handleSeedDemo = async () => {
    if (confirm('Apakah Anda yakin ingin memuat data demo simulasi? Ini akan membersihkan pesanan saat ini dan mengisi 14 data pesanan contoh.')) {
      try {
        await seedDemoData()
        toast.success('📦 Data demo simulasi berhasil dimuat!')
      } catch (err) {
        console.error(err)
        toast.error('Gagal memuat data demo.')
      }
    }
  }

  return (
    <main className="w-full max-w-md mx-auto px-4 pb-36 pt-6 animate-fade-in text-[#1F2937]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50">
          <Settings className="w-5 h-5 text-[#C62828]" />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl text-gray-800">Dashboard Admin</h1>
          <p className="text-gray-500 text-xs">Balagadona Delivery Management</p>
        </div>
      </div>

      {/* Mini Stats Banner */}
      <div className="bg-[#1F2937] text-white rounded-2xl p-3 mb-5 flex justify-between items-center shadow-sm text-xs">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-400" />
          <div>
            <span className="text-gray-400 text-[10px]">Hari Ini:</span>
            <span className="font-bold block text-white">{formatPrice(totalSales)}</span>
          </div>
        </div>
        <div className="w-px h-6 bg-gray-700" />
        <div>
          <span className="text-gray-400 text-[10px]">Total Order:</span>
          <span className="font-bold block text-right">{totalActiveOrders}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl mb-5 text-xs font-bold overflow-x-auto scrollbar-hide whitespace-nowrap">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 flex-shrink-0 min-w-[110px] py-2 px-3 rounded-lg transition-all ${
            activeTab === 'overview' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Pesanan & Batch
        </button>
        <button
          onClick={() => setActiveTab('batches')}
          className={`flex-1 flex-shrink-0 min-w-[110px] py-2 px-3 rounded-lg transition-all ${
            activeTab === 'batches' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Grup & Rute
        </button>
        <button
          onClick={() => setActiveTab('quotas')}
          className={`flex-1 flex-shrink-0 min-w-[110px] py-2 px-3 rounded-lg transition-all ${
            activeTab === 'quotas' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Kelola Slot
        </button>
      </div>

      {/* Overview & Orders Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Audio Notice Card */}
          <div className={`flex justify-between items-center rounded-2xl p-3 shadow-sm text-xs border transition-all duration-300 ${
            isAudioEnabled 
              ? 'bg-green-50/50 border-green-200' 
              : 'bg-amber-50/50 border-amber-200'
          }`}>
            <div className="flex items-start gap-2.5">
              <span className="text-lg leading-none shrink-0 mt-0.5 animate-bounce">
                {isAudioEnabled ? '🟢' : '⚠️'}
              </span>
              <div>
                <h4 className="font-bold text-gray-800">
                  {isAudioEnabled ? 'Notifikasi Suara Aktif' : 'Aktifkan Suara Notifikasi'}
                </h4>
                <p className="text-[9px] text-gray-500 leading-tight mt-0.5">
                  {isAudioEnabled 
                    ? 'Ringtone & suara otomatis berbunyi ketika pelanggan mengirim pesanan.' 
                    : 'Harap aktifkan suara agar ringtone otomatis berbunyi saat ada pesanan baru.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextState = !isAudioEnabled
                setIsAudioEnabled(nextState)
                localStorage.setItem('admin-audio-enabled', String(nextState))
                if (nextState) {
                  playNewOrderNotification()
                  toast.success('🔔 Notifikasi suara diaktifkan!')
                } else {
                  toast.info('🔕 Notifikasi suara dinonaktifkan.')
                }
              }}
              className={`px-3 py-2 rounded-xl text-[9px] font-bold shrink-0 transition-all active:scale-95 flex items-center gap-1 shadow-sm border ${
                isAudioEnabled
                  ? 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'
                  : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 animate-pulse'
              }`}
            >
              <span>{isAudioEnabled ? '🔊 Suara Aktif' : '🔊 Aktifkan Suara'}</span>
            </button>
          </div>

          {/* Batches Capacity List - COMPACT HORIZONTAL LAYOUT */}
          <div className="bg-white border border-gray-100 rounded-2xl p-3.5 shadow-sm space-y-2.5">
            <h3 className="font-bold text-xs text-gray-400 uppercase tracking-wider">
              Kapasitas Batch Saat Ini
            </h3>
            <div className="space-y-2">
              {batches.map((b) => {
                const totalInBatch = orders.filter((o) => o.batchId === b.id).length
                const remaining = getRemainingQuota(b.id)
                const isFull = remaining === 0
                const workload = calculateWorkload(b.id)

                return (
                  <div
                    key={b.id}
                    className={`flex items-center justify-between p-2 rounded-xl border text-xs ${
                      isFull ? 'bg-red-50/20 border-red-100' : 'bg-gray-50/50 border-gray-100'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5 font-bold text-gray-800">
                        <span>{b.name}</span>
                        <span className="text-[10px] text-gray-400 font-medium">({b.timeRange})</span>
                        {isFull ? (
                          <span className="bg-red-100 text-red-700 text-[8px] font-bold px-1 rounded">Penuh</span>
                        ) : (
                          <span className="bg-green-100 text-green-700 text-[8px] font-bold px-1 rounded">Sisa {remaining}</span>
                        )}
                      </div>
                      <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-1.5 max-w-[140px]">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isFull ? 'bg-red-600' : totalInBatch / b.maxQuota > 0.7 ? 'bg-amber-500' : 'bg-green-600'
                          }`}
                          style={{ width: `${Math.min(100, (totalInBatch / b.maxQuota) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3 shrink-0">
                      <div className="text-[10px] text-gray-400 font-semibold leading-tight">
                        <span className="block text-gray-700 font-bold">{totalInBatch} / {b.maxQuota} Order</span>
                        <span>{workload.distanceKm} km | {workload.durationMins} mnt</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Active Orders List */}
          <div className="bg-white border border-gray-100 rounded-2xl p-3.5 shadow-sm">
            <h3 className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-2.5 flex justify-between items-center">
              <span>Daftar Pesanan Masuk</span>
              <span className="text-[10px] text-[#C62828] bg-red-50 px-2 py-0.5 rounded-full font-bold">
                {orders.length} Total
              </span>
            </h3>

            {orders.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center italic">Belum ada pesanan masuk.</p>
            ) : (
              <div className="space-y-2.5">
                {orders.map((o) => (
                  <div
                    key={o.id}
                    className="flex justify-between items-start p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs relative"
                  >
                    {/* Delete Order Action button (CRUD) */}
                    <button
                      onClick={() => handleDeleteOrderClick(o.id)}
                      className="absolute top-2.5 right-2.5 p-1 text-gray-300 hover:text-red-600 rounded transition-colors"
                      title="Hapus / Batalkan Order"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="min-w-0 flex-1 pr-6">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-bold text-gray-800 truncate text-xs">{o.customer.name}</span>
                        <span className="text-[9px] bg-gray-200 px-1.5 rounded font-mono text-gray-500">
                          {o.id.replace('ORD-', '').slice(-6)}
                        </span>
                      </div>
                      <p className="text-gray-400 truncate text-[10px] mb-1">{o.customer.address}</p>
                      
                      <div className="flex flex-wrap gap-1 items-center mt-1 text-[10px]">
                        <span className="font-semibold text-[#C62828] bg-red-50 px-1.5 py-0.2 rounded text-[9px]">
                          {o.customer.deliveryTime.split(' (')[0]}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="font-bold text-gray-500">{o.deliveryDistance}</span>
                        {o.customer.notes && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span className="text-amber-800 truncate max-w-[120px] font-medium italic">
                              "{o.customer.notes}"
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right pl-3 flex flex-col items-end shrink-0 pt-0.5">
                      <span className="font-bold text-gray-800 block">{formatPrice(o.total)}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block mt-1 ${
                          o.status === 'delivered'
                            ? 'bg-green-100 text-green-700'
                            : o.status === 'delivering'
                            ? 'bg-blue-100 text-blue-700'
                            : o.status === 'ready'
                            ? 'bg-indigo-100 text-indigo-700'
                            : o.status === 'preparing'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {o.status === 'delivered'
                          ? 'Selesai'
                          : o.status === 'delivering'
                          ? 'Kurir Jalan'
                          : o.status === 'ready'
                          ? 'Siap Diantar'
                          : o.status === 'preparing'
                          ? 'Dapur'
                          : 'Pending'}
                      </span>

                      {/* Admin status controllers */}
                      <div className="mt-2">
                        {o.status === 'pending' && (
                          <button
                            onClick={() => {
                              updateOrderStatus(o.id, 'preparing')
                              toast.success('Pesanan dipindahkan ke Dapur!')
                            }}
                            className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-bold transition-all active:scale-95"
                          >
                            Mulai Masak
                          </button>
                        )}
                        {o.status === 'preparing' && (
                          <button
                            onClick={() => {
                              updateOrderStatus(o.id, 'ready')
                              toast.success('Pesanan siap diantar oleh Kurir!')
                            }}
                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold transition-all active:scale-95"
                          >
                            Siap Diantar
                          </button>
                        )}
                        {o.status === 'ready' && (
                          <button
                            onClick={() => {
                              updateOrderStatus(o.id, 'delivering')
                              toast.success('Pesanan sedang diantar!')
                            }}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold transition-all active:scale-95"
                          >
                            Kirim Sekarang
                          </button>
                        )}
                        {o.status === 'delivering' && (
                          <button
                            onClick={() => {
                              updateOrderStatus(o.id, 'delivered')
                              toast.success('Pesanan selesai diantar!')
                            }}
                            className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-bold transition-all active:scale-95"
                          >
                            Selesaikan Order
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auto Batching tab */}
      {activeTab === 'batches' && (
        <div className="space-y-4">
          {batches.map((b) => {
            const batchOrders = orders.filter((o) => o.batchId === b.id)
            const workload = calculateWorkload(b.id)

            return (
              <div key={b.id} className="bg-white border border-gray-100 rounded-2xl p-3.5 shadow-sm space-y-3">
                <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                  <div>
                    <h3 className="font-bold text-sm text-gray-800">{b.name}</h3>
                    <p className="text-[10px] text-gray-400 font-medium">{b.timeRange}</p>
                  </div>
                  <span className="text-[10px] bg-red-50 text-[#C62828] font-bold px-2 py-0.5 rounded-full">
                    {batchOrders.length} Order
                  </span>
                </div>

                {batchOrders.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                      <div className="bg-gray-50 py-1.5 rounded-lg border border-gray-100">
                        <span className="text-gray-400 block text-[9px] uppercase font-semibold">Radius</span>
                        <span className="font-bold text-gray-700">{workload.distanceKm} km</span>
                      </div>
                      <div className="bg-gray-50 py-1.5 rounded-lg border border-gray-100">
                        <span className="text-gray-400 block text-[9px] uppercase font-semibold">Estimasi</span>
                        <span className="font-bold text-gray-700">{workload.durationMins} mnt</span>
                      </div>
                      <div className="bg-gray-50 py-1.5 rounded-lg border border-gray-100">
                        <span className="text-gray-400 block text-[9px] uppercase font-semibold">Beban</span>
                        <span className="font-bold text-gray-700">{workload.portions} Porsi</span>
                      </div>
                    </div>

                    <div className="relative pl-5 py-1 space-y-2 border-l border-dashed border-[#C62828]/25 mt-2">
                      <div className="absolute -left-1 top-0 w-2.5 h-2.5 rounded-full bg-[#C62828]" />
                      <div className="text-[9px] text-gray-400 font-bold -mt-2.5">
                        START: Outlet Balagadona
                      </div>

                      {[...batchOrders]
                        .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
                        .map((order, idx) => (
                          <div key={order.id} className="relative text-xs leading-normal">
                            <div className="absolute -left-[27px] top-0.5 w-4 h-4 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold text-[9px]">
                              {idx + 1}
                            </div>
                            <div className="bg-white border border-gray-100 rounded-lg p-2 shadow-sm flex justify-between items-center">
                              <div className="min-w-0 flex-1 pr-2">
                                <span className="font-bold text-gray-800 truncate block text-[11px]">{order.customer.name}</span>
                                <span className="text-[9px] text-gray-400 truncate block">{order.customer.address}</span>
                              </div>
                              <span className="text-[#C62828] text-[9px] font-bold bg-red-50 px-1 rounded shrink-0">
                                {order.deliveryDistance}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 py-3 text-center italic">
                    Belum ada pesanan terjadwal di batch ini.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Quotas & Batch Settings Tab - FULL CRUD BATCH */}
      {activeTab === 'quotas' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-3.5 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Settings className="w-4 h-4 text-[#C62828]" />
                Manajemen Slot Delivery
              </h3>
              {!isAddingBatch && (
                <button
                  onClick={() => setIsAddingBatch(true)}
                  className="bg-[#C62828] hover:bg-[#b71c1c] text-white text-[10px] font-bold px-2 py-1 rounded-lg transition-all flex items-center gap-1 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah
                </button>
              )}
            </div>

            {/* Add Batch Form (CRUD) */}
            {isAddingBatch && (
              <form onSubmit={handleAddBatchSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-3.5 animate-fade-in">
                <h4 className="text-xs font-bold text-gray-700">Tambah Batch Pengiriman Baru</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="col-span-2">
                    <label className="block text-[10px] text-gray-400 font-bold mb-1">Nama Batch</label>
                    <input
                      type="text"
                      placeholder="Contoh: Batch 5"
                      value={newBatchName}
                      onChange={(e) => setNewBatchName(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-[#C62828]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 font-bold mb-1">Rentang Waktu</label>
                    <input
                      type="text"
                      placeholder="Contoh: 16:00 - 17:00"
                      value={newBatchTime}
                      onChange={(e) => setNewBatchTime(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-[#C62828]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 font-bold mb-1">Maks Kuota</label>
                    <input
                      type="number"
                      value={newBatchQuota}
                      onChange={(e) => setNewBatchQuota(parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-[#C62828] text-center"
                      min={1}
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end text-xs">
                  <button
                    type="button"
                    onClick={() => setIsAddingBatch(false)}
                    className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#C62828] text-white rounded-lg font-bold"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            )}

            {/* List of Batches with inline Edit / Delete (CRUD) */}
            <div className="space-y-3">
              {batches.map((b) => {
                const isEditing = editingBatchId === b.id

                return (
                  <div
                    key={b.id}
                    className="p-3 bg-gray-50/50 border border-gray-100 rounded-xl flex items-center justify-between text-xs transition-colors"
                  >
                    {isEditing ? (
                      <div className="flex-1 space-y-2 pr-3">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 rounded"
                          placeholder="Nama Batch"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editTime}
                            onChange={(e) => setEditTime(e.target.value)}
                            className="px-2 py-1 border border-gray-200 rounded"
                            placeholder="Waktu"
                          />
                          <input
                            type="number"
                            value={editQuota}
                            onChange={(e) => setEditQuota(parseInt(e.target.value) || 1)}
                            className="px-2 py-1 border border-gray-200 rounded text-center"
                            placeholder="Kuota"
                            min={1}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-800">{b.name}</span>
                          <span className="text-[10px] text-gray-400 font-medium">({b.timeRange})</span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                          Maksimal kuota: <strong className="text-gray-700 font-bold">{b.maxQuota} order</strong>
                        </p>
                      </div>
                    )}

                    <div className="flex gap-1.5 shrink-0 items-center">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSaveEditBatch(b.id)}
                            className="p-1 bg-green-50 text-green-700 border border-green-100 rounded"
                            title="Simpan"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingBatchId(null)}
                            className="p-1 bg-gray-100 text-gray-600 rounded"
                            title="Batal"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStartEditBatch(b)}
                            className="p-1 bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 rounded"
                            title="Edit Batch"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBatchClick(b.id)}
                            className="p-1 bg-white hover:bg-red-50 border border-gray-200 text-red-500 hover:text-red-700 rounded"
                            title="Hapus Batch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Data Maintenance Card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-3.5 shadow-sm space-y-3 border-amber-200 bg-amber-50/10">
            <h3 className="font-bold text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              🔧 Pemeliharaan Data & Simulasi
            </h3>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Gunakan tombol di bawah untuk membersihkan data lama agar sistem kembali bersih (fresh), atau untuk mengisi 14 pesanan contoh secara otomatis untuk keperluan simulasi real-time.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClearOrders}
                className="flex-1 bg-red-50 hover:bg-red-100 border border-red-200 text-[#C62828] py-2 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 text-center shadow-sm"
              >
                🧹 Bersihkan Semua Pesanan
              </button>
              <button
                type="button"
                onClick={handleSeedDemo}
                className="flex-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 py-2 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 text-center shadow-sm"
              >
                📦 Isi Data Demo Simulasi
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
