import { Compass, Mail, PhoneCall } from 'lucide-react'
import { Link } from 'react-router-dom'
import { WHATSAPP_NUMBER } from '../../constants/products'
import logoImage from '../../assets/Logo Balagadona_fix.png'
import { getWhatsAppUrl } from '../../lib/utils'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-[#1F2937] text-gray-400 py-8 px-5 border-t border-gray-800 pb-28 sm:pb-8">
      <div className="max-w-md mx-auto space-y-6">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <img src={logoImage} alt="Logo Balagadona" className="w-8 h-8 object-contain" />
          <span className="font-sans font-bold text-white text-base tracking-wide leading-none">
            Balagadona
          </span>
        </div>

        <p className="text-xs leading-relaxed text-gray-400">
          Batagor Balagadona menyajikan batagor ikan segar berkualitas premium dengan saus kacang resep rahasia keluarga. Renyah di luar, lembut di dalam.
        </p>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
          <div>
            <h4 className="font-bold text-white mb-2 uppercase tracking-wider text-[10px]">
              Jam Operasional
            </h4>
            <p className="text-gray-400 text-[10px]">Senin - Minggu (Kecuali Jumat)</p>
            <p className="text-[#F9A825] font-semibold">10.00 - 21.00 WIB</p>
            <p className="text-gray-400 text-[10px] mt-1">Khusus Hari Jumat</p>
            <p className="text-[#F9A825] font-semibold">13.30 - 21.00 WIB</p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-2 uppercase tracking-wider text-[10px]">
              Hubungi Kami
            </h4>
            <a
              href={getWhatsAppUrl(WHATSAPP_NUMBER).url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
            >
              <PhoneCall className="w-3 h-3 text-[#25D366]" />
              <span>WhatsApp</span>
            </a>
            <p className="mt-0.5">Cimahi - Jawa Barat</p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-800 w-full" />

        {/* Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-gray-500">
          <div className="flex flex-col gap-1 items-center sm:items-start">
            <p>© {currentYear} Batagor Balagadona. All rights reserved.</p>
          </div>
          <div className="flex gap-3">
            <span className="hover:text-gray-400 transition-colors cursor-pointer">Syarat & Ketentuan</span>
            <span>•</span>
            <span className="hover:text-gray-400 transition-colors cursor-pointer">Kebijakan Privasi</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

