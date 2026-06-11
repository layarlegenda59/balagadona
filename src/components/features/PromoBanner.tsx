import { Sparkles, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function PromoBanner() {
  return (
    <div className="px-4 pt-6">
      <div className="relative overflow-hidden bg-gradient-to-r from-[#F9A825] to-[#FFD600] rounded-3xl p-5 shadow-lg">
        {/* Background elements */}
        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/20 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 -ml-4 -mb-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-[#1F2937] text-white p-1 rounded-md">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-[#1F2937] text-xs font-bold uppercase tracking-wider">
              Promo Spesial
            </span>
          </div>

          <h3 className="font-display font-extrabold text-[#1F2937] text-xl leading-tight mb-1">
            Beli Min. 3 Porsi,<br />Gratis Ongkir s/d 3 km!
          </h3>
          <p className="text-[#1F2937]/70 text-xs font-medium mb-4">
            Makin praktis, makan enak langsung diantar ke rumah Anda.
          </p>

          <Link
            to="/menu"
            className="inline-flex items-center gap-2 bg-[#1F2937] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all hover:gap-3 active:scale-95 shadow-md shadow-black/10"
          >
            Lihat Promo <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Floating icon */}
        <div className="absolute right-4 bottom-4 text-4xl opacity-20 transform rotate-12">
          🛵
        </div>
      </div>
    </div>
  )
}
