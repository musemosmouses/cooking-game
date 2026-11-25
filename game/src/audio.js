// All sound is synthesized with WebAudio: no audio files, no network, and
// the game still sizzles, dings and chimes when it is played offline.
/** One named sound, built from oscillators and filtered noise. */
export function createAudio() {
  let context = null;
  let muted = false;
  let noiseBuffer = null;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      context = new AudioContext();
      noiseBuffer = context.createBuffer(1, context.sampleRate * 0.5, context.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, dur, type, vol, when = 0) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const start = ctx.currentTime + when;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  function noise(dur, vol, filterFreq) {
    const ctx = ensure();
    if (!ctx || muted || !noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    const start = ctx.currentTime;
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(start);
    src.stop(start + dur + 0.05);
  }

  return {
    unlock() { ensure(); },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() { return muted; },
    pickup() { tone(520, 0.08, 'sine', 0.12); },
    place() { tone(340, 0.08, 'triangle', 0.12); },
    chop() { noise(0.09, 0.2, 1800); tone(180, 0.06, 'square', 0.05); },
    chopped() { tone(660, 0.1, 'sine', 0.14); tone(880, 0.12, 'sine', 0.12, 0.08); },
    sizzle() { noise(0.35, 0.1, 4200); },
    cooked() { tone(740, 0.12, 'sine', 0.14); tone(988, 0.16, 'sine', 0.12, 0.1); },
    burnt() { tone(220, 0.25, 'sawtooth', 0.08); },
    serve() { tone(523, 0.12, 'sine', 0.16); tone(659, 0.12, 'sine', 0.16, 0.09); tone(784, 0.2, 'sine', 0.16, 0.18); },
    error() { tone(160, 0.18, 'square', 0.1); },
    order() { tone(880, 0.1, 'sine', 0.1); tone(1174, 0.14, 'sine', 0.1, 0.09); },
    tick() { tone(1200, 0.04, 'sine', 0.06); },
    over() { tone(392, 0.2, 'sine', 0.14); tone(330, 0.2, 'sine', 0.14, 0.18); tone(262, 0.4, 'sine', 0.14, 0.36); },
  };
}
