import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
}

export const getWhatsAppUrl = (phone: string, text?: string): { url: string; isMobile: boolean } => {
  const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const cleanPhone = phone.replace(/[^0-9]/g, '')
  const encodedText = text ? encodeURIComponent(text) : ''
  
  let url = ''
  if (isMobile) {
    url = `whatsapp://send?` + (cleanPhone ? `phone=${cleanPhone}` : '') + (encodedText ? `${cleanPhone ? '&' : ''}text=${encodedText}` : '')
  } else {
    url = `https://api.whatsapp.com/send?` + (cleanPhone ? `phone=${cleanPhone}` : '') + (encodedText ? `${cleanPhone ? '&' : ''}text=${encodedText}` : '')
  }
  
  return { url, isMobile }
}
