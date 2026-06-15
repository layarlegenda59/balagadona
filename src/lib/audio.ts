import orderMasukAudio from '../assets/Order Masuk.mp3'
import courierAudio from '../assets/Courier.mp3'

let sharedAudioCtx: AudioContext | null = null

export const getSharedAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioContextClass) return null
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioContextClass()
  }
  return sharedAudioCtx
}

export const resumeSharedAudioContext = async (): Promise<void> => {
  const ctx = getSharedAudioContext()
  if (ctx && ctx.state === 'suspended') {
    try {
      await ctx.resume()
      console.log('Shared AudioContext successfully resumed. State:', ctx.state)
    } catch (err) {
      console.warn('Failed to resume shared AudioContext:', err)
    }
  }
}

// Play incoming order sound using the new custom asset
export const playNewOrderNotification = () => {
  try {
    const audio = new Audio(orderMasukAudio)
    audio.play().catch(err => {
      console.warn('Failed to play Order Masuk audio:', err)
    })
  } catch (err) {
    console.error('Failed to play Order Masuk notification:', err)
  }
}

// Play delivered order sound using the new custom courier asset
export const playDeliveredNotification = (customerName: string) => {
  try {
    const audio = new Audio(courierAudio)
    audio.play().catch(err => {
      console.warn('Failed to play Delivered audio (Courier.mp3):', err)
    })
  } catch (err) {
    console.error('Failed to play Delivered notification:', err)
  }
}
