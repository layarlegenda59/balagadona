import React, { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Truck, ShieldCheck, Zap, Leaf, ChevronLeft } from 'lucide-react'
import heroImage from '../assets/hero-batagor.jpg'
import { PRODUCTS, TESTIMONIALS, WHY_CHOOSE_US } from '../constants/products'
import ProductCard from '../components/features/ProductCard'
import TestimonialCard from '../components/features/TestimonialCard'
import PromoBanner from '../components/features/PromoBanner'

export default function Home() {
  const bestSellers = PRODUCTS.filter((p) => p.isBestSeller)
  const testimonialsRef = useRef<HTMLDivElement>(null)

  const scrollTestimonials = (direction: 'left' | 'right') => {
    if (testimonialsRef.current) {
      const scrollAmount = 300
      testimonialsRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  const handleTestimonialKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      scrollTestimonials('left')
    } else if (e.key === 'ArrowRight') {
      scrollTestimonials('right')
    }
  }

  return (
    <main className="max-w-md mx-auto pb-24 sm:pb-8">
      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="relative h-[300px] sm:h-[360px]">
          <img
            src={heroImage}
            alt="Batagor Balagadona"
            className="w-full h-full object-cover"
            fetchPriority="high"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Hero text */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <span className="badge bg-[#F9A825] text-[#1F2937] mb-3 inline-block font-semibold">
              Batagor Terlezat di Kota Cimahi
            </span>
            <h1 className="font-display font-bold text-white text-2xl leading-tight mb-1.5">
              Batagor Enak,<br />Pesan Cepat, Antar Tepat
            </h1>
            <p className="text-gray-200 text-sm mb-4 leading-relaxed">
              Pesan Batagor favorit Anda hanya dalam beberapa detik.
            </p>
            <div className="flex gap-3">
              <Link to="/menu" className="btn-primary flex-1 text-center text-sm py-2.5">
                Pesan Sekarang
              </Link>
              <Link to="/menu" className="border border-white text-white bg-transparent hover:bg-white hover:text-[#C62828] flex-1 text-center text-sm py-2.5 rounded-xl transition-all font-semibold flex items-center justify-center">
                Lihat Menu
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── DELIVERY INFO BAR ── */}
      <section className="bg-[#C62828] px-4 py-3">
        <div className="flex items-center justify-center gap-6 text-white text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <Truck className="w-4 h-4" />
            <span>Antar Cepat</span>
          </div>
          <div className="w-px h-4 bg-white/30" />
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>Terjamin Segar</span>
          </div>
          <div className="w-px h-4 bg-white/30" />
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4" />
            <span>Pesan via WA</span>
          </div>
        </div>
      </section>

      {/* ── PROMO BANNER ── */}
      <PromoBanner />

      {/* ── BEST SELLERS ── */}
      <section className="px-4 pt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="section-title">Best Seller</h2>
            <p className="text-gray-500 text-sm">Produk paling favorit pelanggan</p>
          </div>
          <Link
            to="/menu"
            className="flex items-center gap-1 text-[#C62828] text-sm font-semibold hover:underline"
          >
            Semua <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {bestSellers.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* ── CARA PESAN (TOUR) ── */}
      <section className="px-4 pt-10">
        <h2 className="section-title mb-1">Cara Mudah Memesan</h2>
        <p className="text-gray-500 text-sm mb-5">Nikmati batagor Balagadona hangat dalam 3 langkah praktis:</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { step: '1', emoji: '🛒', title: 'Pilih Menu', desc: 'Tentukan batagor favorit Anda' },
            { step: '2', emoji: '📍', title: 'Isi Alamat', desc: 'Isi data kirim & bagikan lokasi' },
            { step: '3', emoji: '🛵', title: 'Nikmati!', desc: 'Pesanan diantar hangat & lezat' }
          ].map((item, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex flex-col items-center text-center relative hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-xl mb-2 relative">
                {item.emoji}
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#C62828] text-white text-[9px] font-bold flex items-center justify-center">
                  {item.step}
                </span>
              </div>
              <h3 className="font-bold text-[#1F2937] text-[11px] mb-0.5">{item.title}</h3>
              <p className="text-[9px] text-gray-400 leading-snug">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHY CHOOSE US ── */}
      <section className="px-4 pt-10">
        <h2 className="section-title mb-1">Kenapa Pilih Kami?</h2>
        <p className="text-gray-500 text-sm mb-5">Kualitas dan pelayanan terbaik untuk Anda</p>
        <div className="grid grid-cols-2 gap-3">
          {WHY_CHOOSE_US.map((item) => (
            <div
              key={item.title}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="text-2xl mb-2">{item.icon}</div>
              <h3 className="font-semibold text-[#1F2937] text-sm mb-1">{item.title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="pt-10" onKeyDown={handleTestimonialKeyDown} tabIndex={0}>
        <div className="flex items-center justify-between px-4 mb-4">
          <div>
            <h2 className="section-title mb-1">Kata Pelanggan</h2>
            <p className="text-gray-500 text-sm">Ribuan pelanggan sudah mempercayai kami</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => scrollTestimonials('left')}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              aria-label="Testimonial sebelumnya"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => scrollTestimonials('right')}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              aria-label="Testimonial selanjutnya"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
        <div
          ref={testimonialsRef}
          className="flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide"
          role="region"
          aria-label="Daftar testimonial pelanggan"
        >
          {TESTIMONIALS.map((t) => (
            <TestimonialCard
              key={t.id}
              name={t.name}
              location={t.location}
              rating={t.rating}
              text={t.text}
              avatar={t.avatar}
            />
          ))}
        </div>
      </section>

      {/* ── DELIVERY INFO ── */}
      <section className="mx-4 mt-8 bg-gradient-to-br from-[#C62828] to-[#8B0000] rounded-2xl p-5 text-white">
        <div className="flex items-start gap-3">
          <Truck className="w-6 h-6 text-[#F9A825] shrink-0 mt-0.5" />
          <div>
            <h3 className="font-display font-bold text-lg mb-1">Informasi Pengiriman</h3>
            <p className="text-white/80 text-sm leading-relaxed mb-3">
              Kami melayani pengiriman ke seluruh area kota. Estimasi 30–60 menit setelah pesanan dikonfirmasi.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="badge bg-white/20 text-white">Radius 10 km</span>
              <span className="badge bg-white/20 text-white">10.00–21.00</span>
              <span className="badge bg-white/20 text-white">Same Day</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── LOKASI KAMI ── */}
      <section className="px-4 pt-8">
        <h2 className="section-title mb-1">Lokasi Kami</h2>
        <p className="text-gray-500 text-sm mb-4">Mampir langsung ke kedai kami untuk menikmati batagor hangat</p>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 hover:shadow-md transition-shadow overflow-hidden">
          <div className="rounded-xl overflow-hidden aspect-video w-full border border-gray-100">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3961.129790490574!2d107.55602777499607!3d-6.875048893123725!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e68e5569a1a9273%3A0x48ec4a8cd8fe6c37!2sBatagor%20Balagadona!5e0!3m2!1sen!2sid!4v1781137791291!5m2!1sen!2sid"
              className="w-full h-full"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Lokasi Batagor Balagadona"
            />
          </div>
          <div className="pt-3 px-1 flex flex-col gap-1">
            <span className="font-bold text-sm text-[#1F2937]">Batagor Balagadona</span>
            <p className="text-xs text-gray-500 leading-relaxed">
              Jl. Pojok Utara, Cimahi Tengah, Kota Cimahi, Jawa Barat 40523
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-4 mt-6">
        <div className="bg-[#F9A825]/10 border border-[#F9A825]/30 rounded-2xl p-5 text-center">
          <Leaf className="w-8 h-8 text-[#16A34A] mx-auto mb-2" />
          <h3 className="font-display font-bold text-[#1F2937] text-base mb-1">
            Bahan Segar Setiap Hari
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            Dibuat dari ikan pilihan tanpa pengawet. Pesan hari ini, nikmati hari ini!
          </p>
          <Link to="/menu" className="btn-primary w-full">
            Pesan Sekarang
          </Link>
        </div>
      </section>
    </main>
  )
}
