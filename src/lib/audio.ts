// Programmatic synthesizer sound and speech alert for incoming orders
export const playNewOrderNotification = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContext) {
      const ctx = new AudioContext()
      if (ctx.state === 'suspended') {
        ctx.resume().catch(e => console.warn(e))
      }
      
      // Chime note 1 (D5)
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime)
      gain1.gain.setValueAtTime(0.15, ctx.currentTime)
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start()
      osc1.stop(ctx.currentTime + 0.4)

      // Chime note 2 (A5 - slightly delayed)
      setTimeout(() => {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(e => console.warn(e))
        }
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.type = 'sine'
        osc2.frequency.setValueAtTime(880, ctx.currentTime)
        gain2.gain.setValueAtTime(0.2, ctx.currentTime)
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
        osc2.connect(gain2)
        gain2.connect(ctx.destination)
        osc2.start()
        osc2.stop(ctx.currentTime + 0.6)
      }, 120)
    }

    // Voice announcement: "Ada pesanan masuk!"
    setTimeout(() => {
      if ('speechSynthesis' in window) {
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
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContext) {
      const ctx = new AudioContext()
      if (ctx.state === 'suspended') {
        ctx.resume().catch(e => console.warn(e))
      }
      
      // Happy arpeggio success chord (C5 -> E5 -> G5 -> C6)
      const playNote = (freq: number, delay: number, duration: number) => {
        setTimeout(() => {
          if (ctx.state === 'suspended') {
            ctx.resume().catch(e => console.warn(e))
          }
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, ctx.currentTime)
          gain.gain.setValueAtTime(0.12, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start()
          osc.stop(ctx.currentTime + duration)
        }, delay)
      }

      playNote(523.25, 0, 0.3)    // C5
      playNote(659.25, 100, 0.3)  // E5
      playNote(783.99, 200, 0.3)  // G5
      playNote(1046.50, 300, 0.5) // C6
    }

    // Voice announcement: "Pesanan untuk [Nama] telah sukses diantarkan!"
    setTimeout(() => {
      if ('speechSynthesis' in window) {
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
