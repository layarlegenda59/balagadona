export interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
  category: string
  isBestSeller?: boolean
  badge?: string
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface OrderItem {
  product: { name: string; price: number }
  quantity: number
}

export interface OrderData {
  id: string
  customer: {
    name: string
    phone: string
    address: string
    deliveryTime: string
    notes?: string
  }
  items: OrderItem[]
  deliveryFee: number
  deliveryDistance: string
  total: number
  createdAt: string
}
