import { create } from 'zustand'
import { OrderData, DeliveryBatch } from '../types'
import { supabase } from '../lib/supabase'

interface DeliveryStore {
  batches: DeliveryBatch[]
  orders: OrderData[]
  updateBatchQuota: (batchId: string, maxQuota: number) => Promise<void>
  addOrder: (order: OrderData) => Promise<void>
  updateOrderStatus: (orderId: string, status: OrderData['status']) => Promise<void>
  getRemainingQuota: (batchId: string) => number
  optimizeBatchSequence: (batchId: string) => void
  seedDemoData: () => Promise<void>
  clearAllOrders: () => Promise<void>
  addBatch: (batch: DeliveryBatch) => Promise<void>
  deleteBatch: (batchId: string) => Promise<void>
  updateBatch: (batchId: string, name: string, timeRange: string, maxQuota: number) => Promise<void>
  deleteOrder: (orderId: string) => Promise<void>
  initializeSupabaseSync: (isPortal?: boolean) => Promise<void>
}

const DEFAULT_BATCHES: DeliveryBatch[] = [
  { id: 'batch-1', name: 'Batch 1', timeRange: '12:00 - 13:00', maxQuota: 8 },
  { id: 'batch-2', name: 'Batch 2', timeRange: '13:00 - 14:00', maxQuota: 10 },
  { id: 'batch-3', name: 'Batch 3', timeRange: '14:00 - 15:00', maxQuota: 8 },
  { id: 'batch-4', name: 'Batch 4', timeRange: '15:00 - 16:00', maxQuota: 8 },
]

// Shop location coordinates
const SHOP_LAT = -6.875048893123725
const SHOP_LNG = 107.55602777499607

// Deterministic mock coordinates generator based on address string and distance label
export const getMockCoords = (address: string, distanceLabel: string) => {
  let distFactor = 1.5 // km for 's/d 3 km'
  if (distanceLabel && distanceLabel.includes('3 - 5')) distFactor = 4
  else if (distanceLabel && distanceLabel.includes('5 - 10')) distFactor = 7.5
  else if (distanceLabel && distanceLabel.includes('> 10')) distFactor = 12

  let hash = 0
  const addrStr = address || ''
  for (let i = 0; i < addrStr.length; i++) {
    hash = addrStr.charCodeAt(i) + ((hash << 5) - hash)
  }
  const angle = (Math.abs(hash) % 360) * (Math.PI / 180)
  const latOffset = (distFactor * Math.cos(angle)) / 111
  const lngOffset = (distFactor * Math.sin(angle)) / (111 * Math.cos((SHOP_LAT * Math.PI) / 180))

  return {
    lat: SHOP_LAT + latOffset,
    lng: SHOP_LNG + lngOffset,
  }
}

// Distance helper
const calcDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371 // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

let isSubscribed = false
let pollingInterval: any = null

export const useDeliveryStore = create<DeliveryStore>()(
  (set, get) => ({
    batches: DEFAULT_BATCHES,
    orders: [],

    updateBatchQuota: async (batchId, maxQuota) => {
      set({
        batches: get().batches.map((b) => (b.id === batchId ? { ...b, maxQuota } : b)),
      })
      try {
        await supabase.from('batches').update({ maxQuota }).eq('id', batchId)
      } catch (err) {
        console.error('Failed to update batch quota in Supabase:', err)
      }
    },

    addBatch: async (batch) => {
      set({ batches: [...get().batches, batch] })
      try {
        await supabase.from('batches').insert([
          {
            id: batch.id,
            name: batch.name,
            timeRange: batch.timeRange,
            maxQuota: batch.maxQuota,
          }
        ])
      } catch (err) {
        console.error('Failed to insert batch in Supabase:', err)
      }
    },

    deleteBatch: async (batchId) => {
      set({
        batches: get().batches.filter((b) => b.id !== batchId),
        orders: get().orders.filter((o) => o.batchId !== batchId),
      })
      try {
        await supabase.from('batches').delete().eq('id', batchId)
        await supabase.from('orders').delete().eq('batchId', batchId)
      } catch (err) {
        console.error('Failed to delete batch from Supabase:', err)
      }
    },

    updateBatch: async (batchId, name, timeRange, maxQuota) => {
      set({
        batches: get().batches.map((b) =>
          b.id === batchId ? { ...b, name, timeRange, maxQuota } : b
        ),
      })
      get().optimizeBatchSequence(batchId)
      try {
        await supabase.from('batches').update({ name, timeRange, maxQuota }).eq('id', batchId)
      } catch (err) {
        console.error('Failed to update batch in Supabase:', err)
      }
    },

    deleteOrder: async (orderId) => {
      const order = get().orders.find((o) => o.id === orderId)
      set({
        orders: get().orders.filter((o) => o.id !== orderId),
      })
      if (order?.batchId) {
        get().optimizeBatchSequence(order.batchId)
      }
      try {
        await supabase.from('orders').delete().eq('id', orderId)
      } catch (err) {
        console.error('Failed to delete order from Supabase:', err)
      }
    },

    addOrder: async (order) => {
      const fullOrder: OrderData = {
        ...order,
        status: order.status || 'pending',
        batchId: order.batchId || 'batch-1',
      }
      const updatedOrders = [...get().orders, fullOrder]
      set({ orders: updatedOrders })
      get().optimizeBatchSequence(fullOrder.batchId!)

      try {
        // Get the optimized order with sequence to write to database
        const optimizedOrder = get().orders.find(o => o.id === fullOrder.id) || fullOrder
        await supabase.from('orders').insert([
          {
            id: optimizedOrder.id,
            customer: optimizedOrder.customer,
            items: optimizedOrder.items,
            deliveryFee: optimizedOrder.deliveryFee,
            deliveryDistance: optimizedOrder.deliveryDistance,
            total: optimizedOrder.total,
            createdAt: optimizedOrder.createdAt,
            batchId: optimizedOrder.batchId,
            status: optimizedOrder.status,
            sequence: optimizedOrder.sequence,
          }
        ])
      } catch (err) {
        console.error('Failed to insert order in Supabase:', err)
      }
    },

    updateOrderStatus: async (orderId, status) => {
      set({
        orders: get().orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
      })
      try {
        await supabase.from('orders').update({ status }).eq('id', orderId)
      } catch (err) {
        console.error('Failed to update order status in Supabase:', err)
      }
    },

    getRemainingQuota: (batchId) => {
      const batch = get().batches.find((b) => b.id === batchId)
      if (!batch) return 0
      const currentOrders = get().orders.filter((o) => o.batchId === batchId)
      return Math.max(0, batch.maxQuota - currentOrders.length)
    },

    optimizeBatchSequence: (batchId) => {
      const allOrders = get().orders
      const batchOrders = allOrders.filter((o) => o.batchId === batchId)
      if (batchOrders.length === 0) return

      // Implement Nearest-Neighbor path routing starting from the shop
      // Only sequence valid orders containing customer information
      const validOrders = batchOrders.filter((o) => o.customer && o.customer.address)
      if (validOrders.length === 0) {
        const updatedOrders = allOrders.map((o) => {
          if (o.batchId === batchId) {
            return { ...o, sequence: undefined }
          }
          return o
        })
        set({ orders: updatedOrders })
        return
      }

      const unvisited = validOrders.map((order) => {
        const coords = getMockCoords(order.customer.address, order.deliveryDistance || '')
        return { ...order, coords }
      })

      const route: typeof unvisited = []
      let currentLat = SHOP_LAT
      let currentLng = SHOP_LNG

      while (unvisited.length > 0) {
        let closestIndex = 0
        let minDistance = Infinity

        for (let i = 0; i < unvisited.length; i++) {
          const dist = calcDistance(
            currentLat,
            currentLng,
            unvisited[i].coords.lat,
            unvisited[i].coords.lng
          )
          if (dist < minDistance) {
            minDistance = dist
            closestIndex = i
          }
        }

        const nextVisit = unvisited.splice(closestIndex, 1)[0]
        route.push(nextVisit)
        currentLat = nextVisit.coords.lat
        currentLng = nextVisit.coords.lng
      }

      // Apply sequence number to orders (skeletal orders get undefined sequence)
      const updatedOrders = allOrders.map((o) => {
        if (o.batchId === batchId) {
          const routeIndex = route.findIndex((ro) => ro.id === o.id)
          return { ...o, sequence: routeIndex !== -1 ? routeIndex + 1 : undefined }
        }
        return o
      })

      set({ orders: updatedOrders })
    },

    clearAllOrders: async () => {
      set({ orders: [] })
      try {
        await supabase.from('orders').delete().neq('id', '')
      } catch (err) {
        console.error('Failed to clear orders in Supabase:', err)
      }
    },

    seedDemoData: async () => {
      const dummyNames = [
        'Ahmad Hidayat',
        'Siti Rahma',
        'Budi Santoso',
        'Dewi Lestari',
        'Eko Prasetyo',
        'Fitriani',
        'Giri Wijaya',
        'Hendra Kurniawan',
        'Indah Permata',
        'Joko Widodo',
        'Kartika Sari',
        'Lukman Hakim',
        'Megawati',
        'Nugroho',
        'Olivia',
      ]

      const dummyAddresses = [
        'Jl. Gatot Subroto No.12, Baros, Cimahi Tengah',
        'Jl. Amir Machmud No.45, Cibabat, Cimahi Utara',
        'Jl. Kolonel Masturi No.88, Cipageran, Cimahi Utara',
        'Jl. Citeureup No.5A, Citeureup, Cimahi Utara',
        'Jl. HMS Mintaredja No.10, Baros, Cimahi Tengah',
        'Jl. Leuwigajah No.150, Utama, Cimahi Selatan',
        'Jl. Cihanjuang No.24, Cibabat, Cimahi Utara',
        'Jl. Sangkuriang No.7, Cipageran, Cimahi Utara',
        'Jl. Pasirkaliki No.102, Pasirkaliki, Cimahi Utara',
        'Jl. Mahar Martanegara No.32, Cigugur Tengah',
        'Jl. Dustira No.9, Baros, Cimahi Tengah',
        'Jl. Sriwijaya No.18, Setiamanah, Cimahi Tengah',
      ]

      const distances = [
        { label: 's/d 3 km', fee: 5000 },
        { label: '3 - 5 km', fee: 8000 },
        { label: '5 - 10 km', fee: 12000 },
        { label: '> 10 km', fee: 18000 },
      ]

      const batagorProducts = [
        { name: 'Batagor Campur', price: 20000 },
        { name: 'Batagor Siomay', price: 22000 },
        { name: 'Batagor Kuah', price: 18000 },
      ]

      const seedOrders: OrderData[] = []
      const now = new Date()

      // Distribute 14 orders across 4 batches
      for (let i = 0; i < 14; i++) {
        const batchIndex = (i % 4) + 1
        const batchId = `batch-${batchIndex}`
        const batch = get().batches.find((b) => b.id === batchId)!

        const name = dummyNames[i % dummyNames.length]
        const address = dummyAddresses[i % dummyAddresses.length]
        const distanceSlot = distances[i % distances.length]

        const qty = (i % 3) + 1
        const prod = batagorProducts[i % batagorProducts.length]

        const subtotal = prod.price * qty
        const isFreeOngkir = qty >= 3 && distanceSlot.label === 's/d 3 km'
        const deliveryFee = isFreeOngkir ? 0 : distanceSlot.fee
        const total = subtotal + deliveryFee

        const seedTime = new Date(now.getTime() - i * 3600000) // hourly intervals

        // Order statuses: mix of preparing, pending, delivering, delivered
        let status: OrderData['status'] = 'pending'
        if (i === 1 || i === 5) status = 'delivering'
        else if (i === 2 || i === 6 || i === 10) status = 'delivered'
        else if (i === 3 || i === 7) status = 'preparing'

        seedOrders.push({
          id: `ORD-DEMO-${1000 + i}`,
          customer: {
            name,
            phone: `081234567${100 + i}`,
            address,
            deliveryTime: `${batch.name} (${batch.timeRange})`,
            notes: i % 3 === 0 ? 'Minta bumbu kacang dipisah ya' : undefined,
          },
          items: [
            {
              product: { name: prod.name, price: prod.price },
              quantity: qty,
            },
          ],
          deliveryFee,
          deliveryDistance: distanceSlot.label,
          total,
          createdAt: seedTime.toISOString(),
          batchId,
          status,
        })
      }

      set({ orders: seedOrders })

      // Optimize sequence for all batches
      get().batches.forEach((b) => {
        get().optimizeBatchSequence(b.id)
      })

      // Remote update Supabase database
      try {
        await supabase.from('orders').delete().neq('id', '')
        const bulkInsert = get().orders.map(o => ({
          id: o.id,
          customer: o.customer,
          items: o.items,
          deliveryFee: o.deliveryFee,
          deliveryDistance: o.deliveryDistance,
          total: o.total,
          createdAt: o.createdAt,
          batchId: o.batchId,
          status: o.status,
          sequence: o.sequence,
        }))
        await supabase.from('orders').insert(bulkInsert)
      } catch (err) {
        console.error('Failed to sync demo data to Supabase:', err)
      }
    },

    initializeSupabaseSync: async (isPortal) => {
      const activePortal = isPortal !== undefined
        ? isPortal
        : (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/courier'))

      // 1. Fetch batches
      try {
        const { data: dbBatches, error: bError } = await supabase
          .from('batches')
          .select('*')
          .order('id', { ascending: true })
        if (!bError) {
          let finalBatches = dbBatches || []
          if (finalBatches.length === 0) {
            await supabase.from('batches').insert(DEFAULT_BATCHES)
            finalBatches = [...DEFAULT_BATCHES]
          }

          // Self-healing: Check if the virtual 'store-settings' record exists. If not, insert it as Buka (maxQuota = 1)
          if (!finalBatches.some(b => b.id === 'store-settings')) {
            const settingsBatch = {
              id: 'store-settings',
              name: 'Store Status',
              timeRange: 'open-status',
              maxQuota: 1, // 1 = Buka, 0 = Tutup Sementara
            }
            try {
              await supabase.from('batches').insert([settingsBatch])
              finalBatches = [...finalBatches, settingsBatch]
            } catch (seedingErr) {
              console.error('Failed to seed store status batch:', seedingErr)
            }
          }

          set({ batches: finalBatches })
        }
      } catch (err) {
        console.error('Failed to fetch batches from Supabase:', err)
      }

      // 2. Fetch orders
      try {
        let dbOrders: OrderData[] = []
        if (activePortal) {
          // Portal mode: fetch full order details
          const { data: fullOrders, error: oError } = await supabase
            .from('orders')
            .select('*')
          if (!oError && fullOrders) {
            dbOrders = fullOrders
          }
        } else {
          // Customer mode: fetch only id & batchId to count slots securely
          const { data: skeletons, error: oError } = await supabase
            .from('orders')
            .select('id, batchId')

          // Also retrieve the customer's own last order fully if it exists
          const lastOrderSaved = localStorage.getItem('lastOrder')
          let ownOrder: any = null
          if (lastOrderSaved) {
            const lastOrderObj = JSON.parse(lastOrderSaved)
            if (lastOrderObj?.id) {
              const { data: ownData } = await supabase
                .from('orders')
                .select('*')
                .eq('id', lastOrderObj.id)
                .maybeSingle()
              if (ownData) ownOrder = ownData
            }
          }

          if (!oError && skeletons) {
            dbOrders = skeletons.map((s: any) => {
              if (ownOrder && s.id === ownOrder.id) {
                return ownOrder
              }
              return s as OrderData
            })
            // Ensure customer's own order is in the list
            if (ownOrder && !dbOrders.some(o => o.id === ownOrder.id)) {
              dbOrders.push(ownOrder)
            }
          }
        }

        set({ orders: dbOrders })
        // Optimize sequences
        get().batches.forEach(b => get().optimizeBatchSequence(b.id))
      } catch (err) {
        console.error('Failed to fetch orders from Supabase:', err)
      }

      // 3. Subscribe to real-time order replication
      if (!isSubscribed) {
        isSubscribed = true

        supabase
          .channel('orders-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
            const { eventType, new: newRecord, old: oldRecord } = payload
            const isPortalActive = window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/courier')

            const lastOrderSaved = localStorage.getItem('lastOrder')
            const lastOrderObj = lastOrderSaved ? JSON.parse(lastOrderSaved) : null
            const isOwnOrder = (id: string) => lastOrderObj?.id === id

            if (eventType === 'INSERT') {
              set((state) => {
                if (state.orders.some(o => o.id === newRecord.id)) return state
                let recordToAdd = newRecord as OrderData
                if (!isPortalActive && !isOwnOrder(newRecord.id)) {
                  // Strip details for other customers' orders in customer mode
                  recordToAdd = {
                    id: newRecord.id,
                    batchId: newRecord.batchId,
                  } as any
                }
                const updated = [...state.orders, recordToAdd]
                return { orders: updated }
              })
              if (newRecord.batchId) get().optimizeBatchSequence(newRecord.batchId)
            } else if (eventType === 'UPDATE') {
              set((state) => {
                const updated = state.orders.map(o => {
                  if (o.id === newRecord.id) {
                    if (isPortalActive || isOwnOrder(newRecord.id)) {
                      return { ...o, ...newRecord }
                    } else {
                      // Strip details
                      return { id: newRecord.id, batchId: newRecord.batchId } as any
                    }
                  }
                  return o
                })
                return { orders: updated }
              })
              if (newRecord.batchId) get().optimizeBatchSequence(newRecord.batchId)
            } else if (eventType === 'DELETE') {
              set((state) => {
                const updated = state.orders.filter(o => o.id !== oldRecord.id)
                return { orders: updated }
              })
            }
          })
          .subscribe()

        // 4. Subscribe to real-time batch replication
        supabase
          .channel('batches-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'batches' }, (payload) => {
            const { eventType, new: newRecord, old: oldRecord } = payload
            if (eventType === 'INSERT') {
              set((state) => {
                if (state.batches.some(b => b.id === newRecord.id)) return state
                return { batches: [...state.batches, newRecord as DeliveryBatch] }
              })
            } else if (eventType === 'UPDATE') {
              set((state) => {
                const updated = state.batches.map(b => b.id === newRecord.id ? { ...b, ...newRecord } : b)
                return { batches: updated }
              })
            } else if (eventType === 'DELETE') {
              set((state) => ({
                batches: state.batches.filter(b => b.id !== oldRecord.id),
                orders: state.orders.filter(o => o.batchId !== oldRecord.id),
              }))
            }
          })
          .subscribe()
      }

      // 5. Polling Fallback Mechanism (for environment where real-time is disabled/disconnected)
      if (!pollingInterval) {
        pollingInterval = setInterval(async () => {
          if (document.visibilityState !== 'visible') return

          const isPortalActive = window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/courier')

          // Fetch batches
          try {
            const { data: dbBatches, error: bError } = await supabase
              .from('batches')
              .select('*')
              .order('id', { ascending: true })
            if (!bError && dbBatches && dbBatches.length > 0) {
              set({ batches: dbBatches })
            }
          } catch (err) {
            console.warn('Polling fallback: Failed to sync batches:', err)
          }

          // Fetch orders
          try {
            let dbOrders: OrderData[] = []
            if (isPortalActive) {
              const { data: fullOrders, error: oError } = await supabase
                .from('orders')
                .select('*')
              if (!oError && fullOrders) {
                dbOrders = fullOrders
              }
            } else {
              const { data: skeletons, error: oError } = await supabase
                .from('orders')
                .select('id, batchId')

              const lastOrderSaved = localStorage.getItem('lastOrder')
              let ownOrder: any = null
              if (lastOrderSaved) {
                const lastOrderObj = JSON.parse(lastOrderSaved)
                if (lastOrderObj?.id) {
                  const { data: ownData } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('id', lastOrderObj.id)
                    .maybeSingle()
                  if (ownData) ownOrder = ownData
                }
              }

              if (!oError && skeletons) {
                dbOrders = skeletons.map((s: any) => {
                  if (ownOrder && s.id === ownOrder.id) {
                    return ownOrder
                  }
                  return s as OrderData
                })
                if (ownOrder && !dbOrders.some(o => o.id === ownOrder.id)) {
                  dbOrders.push(ownOrder)
                }
              }
            }

            // Update store orders and re-sequence
            set({ orders: dbOrders })
            get().batches.forEach(b => get().optimizeBatchSequence(b.id))
          } catch (err) {
            console.warn('Polling fallback: Failed to sync orders:', err)
          }
        }, 8000) // Poll every 8 seconds for rapid admin notification chimes
      }
    }
  })
)
