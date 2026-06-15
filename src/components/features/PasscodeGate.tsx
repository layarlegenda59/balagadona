import React, { useState, useEffect } from 'react'
import { ShieldAlert, Delete, Lock, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

interface PasscodeGateProps {
  target: 'admin' | 'courier'
  children: React.ReactNode
}

export default function PasscodeGate({ target, children }: PasscodeGateProps) {
  const [pin, setPin] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState(false)

  const correctPin = target === 'admin' ? '9988' : '8899'
  const sessionKey = `balagadona-auth-${target}`

  useEffect(() => {
    const isAuth = sessionStorage.getItem(sessionKey) === 'true'
    if (isAuth) {
      setIsAuthenticated(true)
    }
  }, [sessionKey])

  const handleKeyPress = (num: string) => {
    if (error) setError(false)
    if (pin.length < 4) {
      const nextPin = pin + num
      setPin(nextPin)

      // Auto-validate when 4 digits are entered
      if (nextPin === correctPin) {
        sessionStorage.setItem(sessionKey, 'true')
        setTimeout(() => {
          setIsAuthenticated(true)
        }, 150)
      } else if (nextPin.length === 4) {
        // Wrong PIN
        setTimeout(() => {
          setError(true)
          setPin('')
        }, 150)
      }
    }
  }

  const handleBackspace = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1))
    }
  }

  if (isAuthenticated) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex flex-col items-center justify-center p-4 text-white font-sans selection:bg-red-500/30">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>

      {/* Lock Card Container */}
      <div className="w-full max-w-sm bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-2xl flex flex-col items-center relative overflow-hidden">
        {/* Back Link */}
        <Link 
          to="/" 
          className="absolute top-4 left-4 p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-all flex items-center gap-1 text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Beranda</span>
        </Link>

        {/* Shield Icon */}
        <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20 mb-4 mt-4">
          <Lock className="w-6 h-6 text-red-500 animate-pulse" />
        </div>

        <h2 className="font-display font-bold text-lg text-white">
          Akses Terbatas
        </h2>
        <p className="text-white/40 text-[10px] uppercase tracking-wider font-semibold mt-1">
          {target === 'admin' ? 'Dashboard Admin' : 'Dashboard Kurir'}
        </p>

        {/* PIN Indicators */}
        <div className={`flex gap-4 my-6 py-2 ${error ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map((index) => {
            const filled = index < pin.length
            return (
              <span
                key={index}
                className={`w-3.5 h-3.5 rounded-full border transition-all duration-150 ${
                  error
                    ? 'border-red-500 bg-red-500/50'
                    : filled
                    ? 'bg-red-500 border-red-500 scale-110 shadow-lg shadow-red-500/30'
                    : 'border-white/20 bg-transparent'
                }`}
              />
            )
          })}
        </div>

        {error && (
          <p className="text-red-500 text-xs font-bold mb-3 flex items-center gap-1 animate-pulse">
            <ShieldAlert className="w-4 h-4" />
            PIN Salah! Silakan coba lagi.
          </p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] mt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 active:scale-90 border border-white/5 hover:border-white/10 text-lg font-bold transition-all flex items-center justify-center mx-auto"
            >
              {num}
            </button>
          ))}
          
          {/* Blank or special button */}
          <div className="w-16 h-16" />

          {/* Zero */}
          <button
            onClick={() => handleKeyPress('0')}
            className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 active:scale-90 border border-white/5 hover:border-white/10 text-lg font-bold transition-all flex items-center justify-center mx-auto"
          >
            0
          </button>

          {/* Delete */}
          <button
            onClick={handleBackspace}
            className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 active:scale-90 text-white/70 hover:text-white transition-all flex items-center justify-center mx-auto"
            aria-label="Hapus"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <p className="text-[10px] text-white/30 mt-6 text-center leading-relaxed">
          Masukkan PIN otentikasi kurir/admin Anda.<br />
          Hubungi owner jika Anda lupa.
        </p>
      </div>
    </div>
  )
}
