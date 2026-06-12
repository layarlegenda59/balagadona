import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, User, Phone, MapPin, FileText, Clock, Edit2, Trash2, Plus, CheckCircle2 } from 'lucide-react'
import { useDeliveryStore } from '../stores/deliveryStore'
import { useCartStore } from '../stores/cartStore'
import { formatPrice, WHATSAPP_NUMBER } from '../constants/products'
import { generateReceiptPDF } from '../lib/pdf'
import { toast } from 'sonner'

const getEmoji = (code: number) => String.fromCodePoint(code)

interface AddressProfile {
  id: string
  name: string
  phone: string
  address: string
}


const DISTANCE_SLOTS = [
  { id: 'near', label: 's/d 3 km', value: 5000 },
  { id: 'medium', label: '3 - 5 km', value: 8000 },
  { id: 'far', label: '5 - 10 km', value: 12000 },
  { id: 'very-far', label: '> 10 km', value: 18000 },
]

const schema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(50, 'Nama terlalu panjang'),
  phone: z
    .string()
    .min(9, 'Nomor WhatsApp tidak valid')
    .max(15, 'Nomor WhatsApp tidak valid')
    .regex(/^(\+62|62|0)[0-9]{8,13}$/, 'Format nomor: 08xx atau +628xx'),
  address: z.string().min(10, 'Alamat minimal 10 karakter'),
  deliveryTime: z.string().min(1, 'Pilih waktu pengiriman'),
  notes: z.string().max(200, 'Catatan terlalu panjang').optional(),
})

type FormData = z.infer<typeof schema>

export default function Checkout() {
  const navigate = useNavigate()
  const { items, cartNotes, totalPrice, clearCart, totalItems } = useCartStore()
  const price = totalPrice()
  const totalPortions = totalItems()

  const { batches, orders, addOrder, getRemainingQuota } = useDeliveryStore()

  const [selectedDistance, setSelectedDistance] = useState('near')
  const activeDistanceSlot = DISTANCE_SLOTS.find(d => d.id === selectedDistance) || DISTANCE_SLOTS[0]
  const isFreeOngkir = totalPortions >= 3 && selectedDistance === 'near'
  const deliveryFee = isFreeOngkir ? 0 : activeDistanceSlot.value

  // Filter batches dynamically based on operational hours (on Fridays we open late at 13:30, so hide Batch 1 & 2)
  const isFriday = new Date().getDay() === 5
  const visibleBatches = batches.filter(b => {
    if (isFriday) {
      return b.id !== 'batch-1' && b.id !== 'batch-2'
    }
    return true
  })

  // Find first batch that is not full
  const availableBatch = visibleBatches.find(b => getRemainingQuota(b.id) > 0)
  const [selectedTime, setSelectedTime] = useState(availableBatch?.id || visibleBatches[0]?.id || 'batch-3')

  // Auto-switch selected batch if it becomes full in real-time
  useEffect(() => {
    if (selectedTime) {
      const remaining = getRemainingQuota(selectedTime)
      if (remaining === 0) {
        const firstAvailable = visibleBatches.find(b => getRemainingQuota(b.id) > 0)
        if (firstAvailable) {
          setSelectedTime(firstAvailable.id)
        }
      }
    }
  }, [visibleBatches, orders, selectedTime, getRemainingQuota])



  const [detecting, setDetecting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleAutoDetectDistance = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Browser Anda tidak mendukung deteksi lokasi.')
      return
    }
    setDetecting(true)
    setErrorMsg('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude
        const userLng = position.coords.longitude
        const shopLat = -6.875048893123725
        const shopLng = 107.55602777499607

        // Haversine formula to calculate straight-line distance
        const R = 6371 // Earth radius in km
        const dLat = ((shopLat - userLat) * Math.PI) / 180
        const dLng = ((shopLng - userLng) * Math.PI) / 180
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((userLat * Math.PI) / 180) *
          Math.cos((shopLat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        const distance = R * c

        // Automatically map straight distance to the correct delivery tiers
        if (distance <= 3) {
          setSelectedDistance('near')
        } else if (distance <= 5) {
          setSelectedDistance('medium')
        } else if (distance <= 10) {
          setSelectedDistance('far')
        } else {
          setSelectedDistance('very-far')
        }
        setDetecting(false)
      },
      (error) => {
        console.error('Geolocation error:', error)
        setErrorMsg('Gagal mendeteksi lokasi. Silakan pilih jarak secara manual.')
        setDetecting(false)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  // Address Profile CRUD States
  const [profiles, setProfiles] = useState<AddressProfile[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [profileName, setProfileName] = useState('')
  const [profilePhone, setProfilePhone] = useState('')
  const [profileAddress, setProfileAddress] = useState('')

  const activeBatchObj = batches.find(b => b.id === selectedTime)
  const activeBatchText = activeBatchObj ? `${activeBatchObj.name} (${activeBatchObj.timeRange})` : ''

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { notes: cartNotes, deliveryTime: activeBatchText },
  })

  // Keep react-hook-form value in sync with selectedTime
  useEffect(() => {
    if (activeBatchText) {
      setValue('deliveryTime', activeBatchText)
    }
  }, [selectedTime, activeBatchText, setValue])

  // Load saved profiles from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('saved-addresses')
    if (saved) {
      const parsed = JSON.parse(saved) as AddressProfile[]
      setProfiles(parsed)
      if (parsed.length > 0) {
        const firstProfile = parsed[0]
        setSelectedProfileId(firstProfile.id)
        setValue('name', firstProfile.name)
        setValue('phone', firstProfile.phone)
        setValue('address', firstProfile.address)
      }
    }
  }, [setValue])

  if (items.length === 0) {
    return (
      <main className="max-w-md mx-auto px-4 pt-8 text-center">
        <p className="text-gray-500 mb-4">Keranjang kosong.</p>
        <Link to="/menu" className="btn-primary">Kembali ke Menu</Link>
      </main>
    )
  }

  // CRUD Actions
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileName.trim() || !profilePhone.trim() || !profileAddress.trim()) return

    let updated: AddressProfile[] = []
    if (editingId) {
      // Update existing
      updated = profiles.map((p) =>
        p.id === editingId ? { id: p.id, name: profileName, phone: profilePhone, address: profileAddress } : p
      )
    } else {
      // Create new
      const newProfile: AddressProfile = {
        id: `ADDR-${Date.now()}`,
        name: profileName,
        phone: profilePhone,
        address: profileAddress,
      }
      updated = [...profiles, newProfile]
    }

    setProfiles(updated)
    localStorage.setItem('saved-addresses', JSON.stringify(updated))

    // Reset inputs
    setIsAdding(false)
    setEditingId(null)
    setProfileName('')
    setProfilePhone('')
    setProfileAddress('')
  }

  const handleStartEdit = (p: AddressProfile, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent selection
    setEditingId(p.id)
    setIsAdding(true)
    setProfileName(p.name)
    setProfilePhone(p.phone)
    setProfileAddress(p.address)
  }

  const handleDeleteProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent selection
    const updated = profiles.filter((p) => p.id !== id)
    setProfiles(updated)
    localStorage.setItem('saved-addresses', JSON.stringify(updated))

    if (editingId === id) {
      setIsAdding(false)
      setEditingId(null)
      setProfileName('')
      setProfilePhone('')
      setProfileAddress('')
    }
    if (selectedProfileId === id) {
      setSelectedProfileId(null)
    }
  }

  const handleSelectProfile = (p: AddressProfile) => {
    setSelectedProfileId(p.id)
    setValue('name', p.name)
    setValue('phone', p.phone)
    setValue('address', p.address)
  }

  const onSubmit = (data: FormData) => {
    const remaining = getRemainingQuota(selectedTime)
    if (remaining <= 0) {
      const anyAvailable = visibleBatches.some(b => getRemainingQuota(b.id) > 0)
      if (anyAvailable) {
        toast.error('Maaf, slot pengiriman untuk batch ini sudah penuh. Silakan pilih batch lain!')
      } else {
        toast.error('Maaf, seluruh slot pengiriman untuk hari ini sudah penuh!')
      }
      return
    }

    const notesArray = [data.notes, cartNotes].filter(Boolean)
    const allNotes = Array.from(new Set(notesArray)).join(', ')

    const message = [
      `${getEmoji(0x1F4CB)} *PESANAN BATAGOR BALAGADONA*`,
      '===================================',
      '',
      '*DATA PELANGGAN*',
      `${getEmoji(0x1F464)} Nama: ${data.name}`,
      `${getEmoji(0x1F4DE)} No. WhatsApp: ${data.phone}`,
      '',
      '*DETAIL PESANAN*',
      items.map(({ product, quantity }) => `- ${product.name} (${quantity}x) : ${formatPrice(product.price * quantity)}`).join('\n'),
      '',
      '*RINGKASAN PEMBAYARAN*',
      `${getEmoji(0x1F4B0)} Subtotal: ${formatPrice(price)}`,
      `${getEmoji(0x1F6F5)} Ongkos Kirim (${activeDistanceSlot.label}): ${isFreeOngkir ? 'Gratis (Promo s/d 3 km)' : formatPrice(deliveryFee)}`,
      `${getEmoji(0x1F4B8)} Total Harga: *${formatPrice(price + deliveryFee)}*`,
      `${getEmoji(0x23F1)} Waktu Pengiriman: ${data.deliveryTime}`,
      allNotes ? `${getEmoji(0x1F4DD)} Catatan: ${allNotes}` : '',
      '',
      '*ALAMAT PENGIRIMAN*',
      `${getEmoji(0x1F4CC)} Alamat: ${data.address}`,
      '',
      '===================================',
      `Terima kasih! Pesanan Anda akan segera kami proses. ${getEmoji(0x1F64F)}`,
    ]
      .filter((line) => line !== undefined)
      .join('\n')

    const encoded = encodeURIComponent(message)
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`

    const order = {
      id: `ORD-${Date.now()}`,
      customer: data,
      items: items.map(item => ({
        product: { name: item.product.name, price: item.product.price },
        quantity: item.quantity
      })),
      deliveryFee,
      deliveryDistance: activeDistanceSlot.label,
      total: price + deliveryFee,
      createdAt: new Date().toISOString(),
      batchId: selectedTime,
      status: 'pending' as const,
    }
    localStorage.setItem('lastOrder', JSON.stringify(order))
    addOrder(order)
    clearCart()

    // Automatically trigger receipt PDF download for the customer
    try {
      generateReceiptPDF(order)
    } catch (err) {
      console.error('Failed to auto-download PDF receipt:', err)
    }

    window.open(waUrl, '_blank', 'noopener,noreferrer')
    navigate('/order-confirmation')
  }


  return (
    <main className="max-w-md mx-auto pb-36 sm:pb-24 animate-fade-in">
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
          <h1 className="font-display font-bold text-xl text-[#1F2937]">Checkout</h1>
          <p className="text-gray-500 text-sm">Lengkapi data pengiriman</p>
        </div>
      </div>

      {/* ── SAVED ADDRESSES CRUD PANEL ── */}
      <div className="px-4 mb-4">
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#C62828]" />
              Alamat Pengiriman Tersimpan
            </h3>
            {!isAdding && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null)
                  setIsAdding(true)
                  setProfileName('')
                  setProfilePhone('')
                  setProfileAddress('')
                }}
                className="text-xs font-bold text-[#C62828] hover:underline flex items-center gap-1 min-h-[32px]"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah
              </button>
            )}
          </div>

          {/* Form Create/Update Profile */}
          {isAdding && (
            <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 space-y-3 animate-fade-in">
              <h4 className="text-xs font-bold text-gray-700">
                {editingId ? 'Edit Alamat' : 'Tambah Alamat Baru'}
              </h4>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Nama Lengkap"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#C62828] transition-colors"
                />
                <input
                  type="tel"
                  placeholder="No. WhatsApp (contoh: 08123456789)"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#C62828] transition-colors"
                />
                <textarea
                  placeholder="Alamat Lengkap (RT/RW, Kelurahan, Kecamatan, Kota)"
                  rows={2}
                  value={profileAddress}
                  onChange={(e) => setProfileAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none resize-none focus:border-[#C62828] transition-colors"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false)
                    setEditingId(null)
                  }}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-[11px] font-semibold text-gray-600 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="px-3 py-1.5 bg-[#C62828] hover:bg-[#b71c1c] text-white rounded-lg text-[11px] font-semibold transition-colors"
                >
                  Simpan
                </button>
              </div>
            </div>
          )}

          {/* Profiles list */}
          {profiles.length === 0 ? (
            <p className="text-xs text-gray-400 py-2 italic leading-relaxed">
              Belum ada alamat tersimpan. Silakan klik tambah alamat untuk mempercepat pengisian data checkout.
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {profiles.map((p) => {
                const isSelected = selectedProfileId === p.id
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProfile(p)}
                    className={`flex-shrink-0 w-52 p-3 bg-white border rounded-xl cursor-pointer transition-all duration-200 hover:shadow-sm ${isSelected
                        ? 'border-[#C62828] bg-red-50/10 shadow-sm shadow-[#C62828]/5'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <div className="font-bold text-gray-800 text-[11px] truncate flex-1 leading-snug">
                        {p.name}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleStartEdit(p, e)}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          aria-label="Edit alamat"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteProfile(p.id, e)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          aria-label="Hapus alamat"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 truncate mb-1">
                      {p.phone}
                    </div>
                    <div className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed h-7">
                      {p.address}
                    </div>
                    {isSelected ? (
                      <div className="mt-2 text-[9px] font-bold text-[#C62828] flex items-center gap-1 justify-end animate-fade-in">
                        <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />
                        <span>Terpilih</span>
                      </div>
                    ) : (
                      <div className="mt-2 text-[9px] font-semibold text-gray-500 hover:text-[#C62828] flex items-center gap-1 justify-end transition-colors">
                        <span>Gunakan Alamat Ini</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Checkout Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="px-4 space-y-4">
        {/* Nama */}
        <div>
          <label className="block text-sm font-semibold text-[#1F2937] mb-1.5">
            <User className="w-4 h-4 inline mr-1.5 text-gray-400" />
            Nama Lengkap
          </label>
          <input
            {...register('name')}
            type="text"
            placeholder="Masukkan nama lengkap"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C62828] focus:ring-2 focus:ring-[#C62828]/20 outline-none transition-all text-sm"
          />
          {errors.name && (
            <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
          )}
        </div>

        {/* No. WhatsApp */}
        <div>
          <label className="block text-sm font-semibold text-[#1F2937] mb-1.5">
            <Phone className="w-4 h-4 inline mr-1.5 text-gray-400" />
            No. WhatsApp
          </label>
          <input
            {...register('phone')}
            type="tel"
            placeholder="08xxxxxxxxxx"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C62828] focus:ring-2 focus:ring-[#C62828]/20 outline-none transition-all text-sm"
          />
          {errors.phone && (
            <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
          )}
        </div>

        {/* Alamat */}
        <div>
          <label className="block text-sm font-semibold text-[#1F2937] mb-1.5">
            <MapPin className="w-4 h-4 inline mr-1.5 text-gray-400" />
            Alamat Pengiriman
          </label>
          <textarea
            {...register('address')}
            rows={3}
            placeholder="Masukkan alamat lengkap (jalan, RT/RW, kelurahan, kecamatan)"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C62828] focus:ring-2 focus:ring-[#C62828]/20 outline-none transition-all text-sm resize-none"
          />
          {errors.address && (
            <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>
          )}
        </div>

        {/* Jarak Pengiriman */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-[#1F2937] flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-gray-400" />
            Jarak Pengiriman (Ongkir)
          </label>

          {/* Premium Location Assistant Card */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-50/50 border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-[#C62828] animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-gray-800 text-xs leading-snug">
                  Asisten Jarak Pengiriman
                </h4>
                <p className="text-[10px] text-gray-500 leading-relaxed mt-0.5">
                  Deteksi jarak lokasi Anda secara otomatis menggunakan GPS, atau hitung rute langsung di Google Maps.
                </p>
              </div>
            </div>

            {errorMsg && (
              <p className="text-[10px] text-red-500 font-medium bg-red-50 border border-red-100 rounded-xl py-2 px-3">
                {errorMsg}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAutoDetectDistance}
                disabled={detecting}
                className="flex-1 bg-[#C62828] hover:bg-[#b71c1c] text-white py-2 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm shadow-[#C62828]/15 disabled:opacity-50 disabled:scale-100"
              >
                {detecting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Mendeteksi...</span>
                  </>
                ) : (
                  <>
                    <span>Deteksi Otomatis</span>
                  </>
                )}
              </button>
              <a
                href="https://www.google.com/maps/dir/My+Location/Batagor+Balagadona,+Jl.+Kec.+No.93%2F101,+Cibabat,+Cimahi+Utara,+Cimahi+City,+West+Java+40513"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 py-2 px-3 rounded-xl text-xs font-bold text-center transition-all active:scale-95 flex items-center justify-center gap-1"
              >
                Cek Google Maps
              </a>
            </div>
          </div>

          {/* Grid Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            {DISTANCE_SLOTS.map((slot) => {
              const isFree = totalPortions >= 3 && slot.id === 'near'
              const isActive = selectedDistance === slot.id
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setSelectedDistance(slot.id)}
                  className={`p-3 rounded-2xl text-left border transition-all duration-200 flex flex-col justify-between min-h-[72px] relative ${isActive
                      ? 'border-[#C62828] bg-red-50/10 shadow-sm ring-1 ring-[#C62828]'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                >
                  <div className="flex justify-between items-center w-full mb-1">
                    <span className="text-xs font-bold text-gray-800">{slot.label}</span>
                    {isActive && (
                      <span className="w-3 h-3 rounded-full bg-[#C62828] flex items-center justify-center">
                        <span className="w-1 h-1 rounded-full bg-white" />
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold ${isFree ? 'text-[#16A34A]' : 'text-gray-500'}`}>
                    {isFree ? 'Gratis Ongkir' : formatPrice(slot.value)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Jadwal Pengiriman Batch */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-[#1F2937]">
            <Clock className="w-4 h-4 inline mr-1.5 text-[#C62828]" />
            Jadwal Pengiriman Batch
          </label>

          {/* Info Notice Banner */}
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
            <Clock className="w-5 h-5 text-[#C62828] shrink-0 mt-0.5" />
            <p className="text-xs text-red-900 leading-relaxed font-medium">
              Untuk menjaga kualitas layanan dan ketepatan waktu, pengiriman menggunakan sistem batch terjadwal.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {visibleBatches.map((batch) => {
              const remaining = getRemainingQuota(batch.id)
              const isFull = remaining === 0
              const isActive = selectedTime === batch.id

              return (
                <button
                  key={batch.id}
                  type="button"
                  disabled={isFull}
                  onClick={() => {
                    setSelectedTime(batch.id)
                  }}
                  className={`p-3.5 rounded-2xl text-left border transition-all duration-200 flex flex-col justify-between min-h-[96px] relative ${
                    isActive
                      ? 'border-[#C62828] bg-red-50/10 shadow-sm ring-1 ring-[#C62828]'
                      : isFull
                      ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed pointer-events-none'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className="text-xs font-bold text-gray-800">{batch.name}</span>
                    {isActive && (
                      <span className="w-3.5 h-3.5 rounded-full bg-[#C62828] flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs font-medium text-gray-600">
                    {batch.timeRange}
                  </div>
                  <div className="mt-2 text-[10px] font-bold">
                    {isFull ? (
                      <span className="text-red-600 font-bold">Slot pengiriman telah penuh</span>
                    ) : (
                      <span className={remaining <= 3 ? 'text-amber-600' : 'text-[#16A34A]'}>
                        Sisa {remaining} slot
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
          <input
            type="hidden"
            {...register('deliveryTime')}
          />
          {errors.deliveryTime && (
            <p className="text-red-500 text-xs mt-1">{errors.deliveryTime.message}</p>
          )}
        </div>


        {/* Catatan */}
        <div>
          <label className="block text-sm font-semibold text-[#1F2937] mb-1.5">
            <FileText className="w-4 h-4 inline mr-1.5 text-gray-400" />
            Catatan (opsional)
          </label>
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Tambahkan catatan untuk pesanan..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C62828] focus:ring-2 focus:ring-[#C62828]/20 outline-none transition-all text-sm resize-none"
          />
          {errors.notes && (
            <p className="text-red-500 text-xs mt-1">{errors.notes.message}</p>
          )}
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 rounded-2xl p-4 mt-4 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-[#1F2937] mb-3">Ringkasan Pesanan</h3>
          <div className="space-y-2">
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{product.name} ×{quantity}</span>
                <span className="font-medium">{formatPrice(product.price * quantity)}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2 flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium text-gray-700">{formatPrice(price)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Ongkos Kirim ({activeDistanceSlot.label})</span>
              <span className={`font-semibold ${isFreeOngkir ? 'text-[#16A34A] font-bold' : 'text-gray-700'}`}>
                {isFreeOngkir ? 'Gratis' : formatPrice(deliveryFee)}
              </span>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between">
            <span className="font-semibold text-[#1F2937]">Total Bayar</span>
            <span className="font-bold text-[#C62828] text-lg">{formatPrice(price + deliveryFee)}</span>
          </div>
        </div>

        {/* Submit */}
        {(() => {
          const isSelectedBatchFull = getRemainingQuota(selectedTime) === 0
          return (
            <button
              type="submit"
              disabled={isSubmitting || isSelectedBatchFull}
              className="w-full btn-primary py-4 text-base font-bold mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSelectedBatchFull ? 'Slot Pengiriman Penuh' : 'Kirim Pesanan via WhatsApp'}
            </button>
          )
        })()}
      </form>
    </main>
  )
}
