import { Star } from 'lucide-react'

export interface TestimonialCardProps {
  name: string
  location: string
  rating: number
  text: string
  avatar: string
}

export default function TestimonialCard({ name, location, rating, text, avatar }: TestimonialCardProps) {
  return (
    <div className="card p-5 flex-shrink-0 w-[280px] sm:w-72 transition-all duration-300">
      {/* Stars */}
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < rating ? 'fill-[#F9A825] text-[#F9A825]' : 'text-gray-300'}`}
          />
        ))}
      </div>

      {/* Text */}
      <p className="text-gray-600 text-sm leading-relaxed mb-4">"{text}"</p>

      {/* Author */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#C62828] flex items-center justify-center text-white font-bold text-sm shrink-0">
          {avatar}
        </div>
        <div>
          <p className="font-semibold text-[#1F2937] text-sm">{name}</p>
          <p className="text-gray-400 text-xs">{location}</p>
        </div>
      </div>
    </div>
  )
}
