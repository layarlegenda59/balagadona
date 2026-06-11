import batagorOriginal from '../assets/batagor-original.jpg'
import batagorKuah from '../assets/batagor-kuah.jpg'

export const WHATSAPP_NUMBER = '6281224235733'
export const WHATSAPP_NUMBER_2 = '628982158787'

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

export const PRODUCTS: Product[] = [
  {
    id: 'batagor-original',
    name: 'Batagor Original',
    description: 'Batagor ikan segar dengan saus kacang spesial, renyah di luar lembut di dalam.',
    price: 15000,
    image: batagorOriginal,
    category: 'original',
    isBestSeller: true,
    badge: 'Best Seller',
  },
  {
    id: 'batagor-kuah',
    name: 'Batagor Kuah',
    description: 'Batagor lembut dalam kuah kaldu gurih yang hangat dan menyegarkan.',
    price: 15000,
    image: batagorKuah,
    category: 'kuah',
    isBestSeller: true,
    badge: 'Favorit',
  },
]

export const TESTIMONIALS = [
  {
    id: 1,
    name: 'Siti Rahayu',
    location: 'Cimahi',
    rating: 5,
    text: 'Batagornya enak banget dan pengirimannya cepat. Sausnya pas, tidak terlalu pedas. Pasti pesan lagi!',
    avatar: 'SR',
  },
  {
    id: 2,
    name: 'Ahmad Fauzi',
    location: 'Bandung',
    rating: 5,
    text: 'Pesan lewat aplikasi sangat mudah dan praktis. Langsung ke WhatsApp, tidak ribet sama sekali.',
    avatar: 'AF',
  },
  {
    id: 3,
    name: 'Dewi Kusuma',
    location: 'Kab. Bandung Barat',
    rating: 5,
    text: 'Anak-anak suka banget Batagor Balagadona. Sudah langganan sejak bulan lalu, kualitasnya selalu konsisten.',
    avatar: 'DK',
  },
]

export const WHY_CHOOSE_US = [
  {
    icon: '🥢',
    title: 'Bahan Segar',
    desc: 'Dibuat dari ikan pilihan segar setiap hari.',
  },
  {
    icon: '⚡',
    title: 'Pesan Cepat',
    desc: 'Checkout langsung via WhatsApp dalam 3 klik.',
  },
  {
    icon: '🛵',
    title: 'Antar Cepat',
    desc: 'Pengiriman cepat ke area Anda.',
  },
  {
    icon: '💯',
    title: 'Jaminan Kualitas',
    desc: 'Puas atau uang kembali, tanpa syarat.',
  },
]

export const formatPrice = (price: number): string => {
  return 'Rp' + price.toLocaleString('id-ID')
}
