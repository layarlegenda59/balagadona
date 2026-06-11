import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="max-w-md mx-auto px-4 pt-20 pb-24 text-center">
      <div className="mb-6">
        <span className="text-8xl">🔍</span>
      </div>
      <h1 className="font-display font-bold text-3xl text-[#1F2937] mb-3">
        Halaman Tidak Ditemukan
      </h1>
      <p className="text-gray-500 mb-8 leading-relaxed">
        Maaf, halaman yang Anda cari tidak tersedia atau sudah dipindahkan.
      </p>
      <Link to="/" className="btn-primary w-full gap-2">
        <Home className="w-4 h-4" />
        Kembali ke Beranda
      </Link>
    </main>
  )
}
