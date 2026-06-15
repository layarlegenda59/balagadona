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

// Play selesai order sound by speaking the customer's name via SpeechSynthesis
export const playSelesaiNotification = (customerName: string) => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel() // Cancel any ongoing speech
      const text = `Pesanan atas nama ${customerName} telah sukses diantarkan.`
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'id-ID' // Indonesian language
      utterance.rate = 0.9     // slightly slower for clarity
      utterance.pitch = 1.0    // natural pitch
      window.speechSynthesis.speak(utterance)
    } catch (err) {
      console.warn('Failed to speak customer name via SpeechSynthesis:', err)
    }
  }
}

// Generate a valid 5-second silent PCM WAV data URI dynamically to bypass autoplay & CPU spin locks
function generateSilentWavDataUri(seconds: number = 5): string {
  const sampleRate = 8000;
  const numChannels = 1;
  const bitsPerSample = 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const subChunk2Size = seconds * byteRate;
  const chunkSize = 36 + subChunk2Size;

  const buffer = new ArrayBuffer(44 + subChunk2Size);
  const view = new DataView(buffer);

  // RIFF header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, chunkSize, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // fmt chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  // data chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, subChunk2Size, true);

  // Fill audio data block with silent midpoint byte values (128 for 8-bit PCM)
  const offset = 44;
  for (let i = 0; i < subChunk2Size; i++) {
    view.setUint8(offset + i, 128);
  }

  // Encode ArrayBuffer into base64 URI
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

let keepAliveAudio: HTMLAudioElement | null = null;
let keepAliveOsc: OscillatorNode | null = null;
let keepAliveGain: GainNode | null = null;

// Initialize background audio playback and setup OS MediaSession to prevent mobile lock sleep
export const startBackgroundKeepAlive = (enabled: boolean) => {
  if (typeof window === 'undefined') return;

  // Cleanup active objects first
  stopBackgroundKeepAlive();

  if (!enabled) return;

  try {
    // 1. Play silent loop
    const silentWavUri = generateSilentWavDataUri(5);
    keepAliveAudio = new Audio(silentWavUri);
    keepAliveAudio.loop = true;
    keepAliveAudio.play().catch(err => {
      console.warn('Silent keep-alive play failed (autoplay locked):', err);
    });

    // 2. Register with browser navigator MediaSession
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Balagadona Live Assistant',
        artist: 'Balagadona PWA',
        album: 'Live Tracking',
      });
      navigator.mediaSession.setActionHandler('play', () => {
        keepAliveAudio?.play().catch(() => {});
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        keepAliveAudio?.pause();
      });
    }

    // 3. Keep WebAudio API context active with sub-audible oscillator
    const ctx = getSharedAudioContext();
    if (ctx) {
      keepAliveOsc = ctx.createOscillator();
      keepAliveGain = ctx.createGain();
      
      keepAliveOsc.frequency.setValueAtTime(1, ctx.currentTime); // 1 Hz (sub-audible)
      keepAliveGain.gain.setValueAtTime(0.0001, ctx.currentTime); // virtually silent
      
      keepAliveOsc.connect(keepAliveGain);
      keepAliveGain.connect(ctx.destination);
      
      keepAliveOsc.start();
    }
  } catch (err) {
    console.warn('Failed to start background keep-alive:', err);
  }
};

export const stopBackgroundKeepAlive = () => {
  try {
    if (keepAliveAudio) {
      keepAliveAudio.pause();
      keepAliveAudio = null;
    }
    if (keepAliveOsc) {
      try { keepAliveOsc.stop(); } catch (e) {}
      keepAliveOsc = null;
    }
    if (keepAliveGain) {
      keepAliveGain.disconnect();
      keepAliveGain = null;
    }
    const ctx = getSharedAudioContext();
    if (ctx && ctx.state === 'running') {
      ctx.suspend().catch(e => console.warn(e));
    }
  } catch (err) {
    console.warn('Failed to stop background keep-alive:', err);
  }
};
