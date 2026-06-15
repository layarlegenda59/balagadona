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

// Programmatic synthesizer sound and speech alert for incoming orders
export const playNewOrderNotification = () => {
  try {
    const ctx = getSharedAudioContext()
    if (ctx) {
      // Prompt a resume just in case
      if (ctx.state === 'suspended') {
        ctx.resume().catch(e => console.warn('Context resume failed:', e))
      }

      const triggerChimes = () => {
        const now = ctx.currentTime

        // Chime note 1 (D5)
        const osc1 = ctx.createOscillator()
        const gain1 = ctx.createGain()
        osc1.type = 'sine'
        osc1.frequency.setValueAtTime(587.33, now)
        gain1.gain.setValueAtTime(0.15, now)
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
        osc1.connect(gain1)
        gain1.connect(ctx.destination)
        osc1.start(now)
        osc1.stop(now + 0.4)

        // Chime note 2 (A5 - slightly delayed)
        setTimeout(() => {
          if (ctx.state === 'suspended') {
            ctx.resume().catch(e => console.warn(e))
          }
          const now2 = ctx.currentTime
          const osc2 = ctx.createOscillator()
          const gain2 = ctx.createGain()
          osc2.type = 'sine'
          osc2.frequency.setValueAtTime(880, now2)
          gain2.gain.setValueAtTime(0.2, now2)
          gain2.gain.exponentialRampToValueAtTime(0.001, now2 + 0.6)
          osc2.connect(gain2)
          gain2.connect(ctx.destination)
          osc2.start(now2)
          osc2.stop(now2 + 0.6)
        }, 120)
      }

      if (ctx.state === 'suspended') {
        ctx.resume().then(triggerChimes).catch(e => {
          console.warn('AudioContext resume failed:', e)
          triggerChimes()
        })
      } else {
        triggerChimes()
      }
    }

    // Voice announcement: "Ada pesanan masuk!"
    setTimeout(() => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel() // Clear prior speech
        const utterance = new SpeechSynthesisUtterance('Ada pesanan masuk!')
        utterance.lang = 'id-ID'
        utterance.rate = 1.0
        utterance.pitch = 1.15
        window.speechSynthesis.speak(utterance)
      }
    }, 600)
  } catch (err) {
    console.error('Failed to play sound:', err)
  }
}

// Programmatic synthesizer chime and voice assistant for completed/delivered orders
export const playDeliveredNotification = (customerName: string) => {
  try {
    const nameToSpeak = customerName || 'Pelanggan'
    const ctx = getSharedAudioContext()
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(e => console.warn(e))
      }

      const triggerDeliveredChimes = () => {
        const playNote = (freq: number, delay: number, duration: number) => {
          setTimeout(() => {
            if (ctx.state === 'suspended') {
              ctx.resume().catch(e => console.warn(e))
            }
            const now = ctx.currentTime
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = 'sine'
            osc.frequency.setValueAtTime(freq, now)
            gain.gain.setValueAtTime(0.12, now)
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.start(now)
            osc.stop(now + duration)
          }, delay)
        }

        playNote(523.25, 0, 0.3)    // C5
        playNote(659.25, 100, 0.3)  // E5
        playNote(783.99, 200, 0.3)  // G5
        playNote(1046.50, 300, 0.5) // C6
      }

      if (ctx.state === 'suspended') {
        ctx.resume().then(triggerDeliveredChimes).catch(e => {
          console.warn('AudioContext resume failed:', e)
          triggerDeliveredChimes()
        })
      } else {
        triggerDeliveredChimes()
      }
    }

    // Voice announcement: "Pesanan untuk [Nama] telah sukses diantarkan!"
    setTimeout(() => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel() // Clear prior speech
        const utterance = new SpeechSynthesisUtterance(`Pesanan untuk ${nameToSpeak} telah sukses diantarkan!`)
        utterance.lang = 'id-ID'
        utterance.rate = 1.0
        utterance.pitch = 1.1
        window.speechSynthesis.speak(utterance)
      }
    }, 800)
  } catch (err) {
    console.error('Failed to play delivered sound:', err)
  }
}
