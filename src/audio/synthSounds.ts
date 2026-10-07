/**
 * DroidMPC Pro - Algorithmic Sound Generator & Synthesis Engine
 * Generates pristine studio drum hits, 808s, melodic chords, and vocal chops
 * directly into AudioBuffers so they can be triggered with zero network delay,
 * looped, trimmed, reversed, and chopped.
 */

// Helper to create an AudioBuffer with custom sample data
export function createBufferFromGenerator(
  ctx: AudioContext,
  duration: number,
  generator: (sampleRate: number, channelData: Float32Array) => void
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const channelData = buffer.getChannelData(0);
  generator(sampleRate, channelData);
  return buffer;
}

// 1. PUNCHY KICK
export function generateKick(ctx: AudioContext, type: 'punch' | '808' | 'vintage' | 'deep' = 'punch'): AudioBuffer {
  const duration = type === '808' ? 1.4 : 0.45;
  return createBufferFromGenerator(ctx, duration, (sampleRate, data) => {
    let startFreq = 160;
    let endFreq = 42;
    let clickIntensity = 0.8;
    let decayRate = 7.0;

    if (type === '808') {
      startFreq = 120;
      endFreq = 38;
      decayRate = 2.2;
      clickIntensity = 0.4;
    } else if (type === 'vintage') {
      startFreq = 140;
      endFreq = 50;
      decayRate = 9.0;
      clickIntensity = 0.6;
    }

    let phase = 0;
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      // Exponential pitch envelope
      const pitch = endFreq + (startFreq - endFreq) * Math.exp(-t * 35);
      phase += (2 * Math.PI * pitch) / sampleRate;
      
      // Amplitude envelope
      const amp = Math.exp(-t * decayRate);
      
      // Click transient in first 5ms
      const click = t < 0.005 ? Math.sin(t * 2000 * Math.PI) * clickIntensity * (1 - t / 0.005) : 0;
      
      // Soft saturation
      const raw = Math.sin(phase) * amp + click;
      data[i] = Math.tanh(raw * 1.5) * 0.95;
    }
  });
}

// 2. CRISP SNARE
export function generateSnare(ctx: AudioContext, type: 'trap' | 'boombap' | 'lofi' = 'boombap'): AudioBuffer {
  const duration = 0.35;
  return createBufferFromGenerator(ctx, duration, (sampleRate, data) => {
    let phase = 0;
    const bodyFreq = type === 'trap' ? 220 : 185;
    const toneDecay = type === 'trap' ? 14 : 11;
    const noiseDecay = type === 'lofi' ? 8 : 12;

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      // Tone body
      const pitch = bodyFreq * Math.exp(-t * 25);
      phase += (2 * Math.PI * pitch) / sampleRate;
      const tone = Math.sin(phase) * Math.exp(-t * toneDecay) * 0.6;

      // Noise body with high-pass characteristic
      const whiteNoise = (Math.random() * 2 - 1);
      const noise = whiteNoise * Math.exp(-t * noiseDecay) * 0.7;

      // Snap transient
      const snap = t < 0.003 ? (1 - t / 0.003) * 0.8 : 0;

      const mixed = tone + noise + snap;
      data[i] = Math.tanh(mixed * 1.3) * 0.9;
    }
  });
}

// 3. STEREO HAND CLAP
export function generateClap(ctx: AudioContext): AudioBuffer {
  const duration = 0.38;
  return createBufferFromGenerator(ctx, duration, (sampleRate, data) => {
    // 3 micro-transient spikes followed by reverb tail
    const spikes = [0, 0.012, 0.024];

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      let amp = 0;

      // Check micro-bursts
      for (const spikeTime of spikes) {
        if (t >= spikeTime && t < spikeTime + 0.015) {
          const subT = t - spikeTime;
          amp += (1 - subT / 0.015) * 0.7;
        }
      }

      // Main tail starting around 0.03s
      if (t >= 0.024) {
        amp += Math.exp(-(t - 0.024) * 16) * 0.9;
      }

      const noise = (Math.random() * 2 - 1);
      // Bandpass feeling through filtered noise
      data[i] = Math.tanh(noise * amp * 1.4) * 0.85;
    }
  });
}

// 4. HI-HAT (Closed & Open)
export function generateHiHat(ctx: AudioContext, open: boolean = false): AudioBuffer {
  const duration = open ? 0.5 : 0.09;
  return createBufferFromGenerator(ctx, duration, (sampleRate, data) => {
    const freqs = [3200, 4800, 7200, 8900, 11400];
    const decay = open ? 6.5 : 45.0;

    let p = [0, 0, 0, 0, 0];
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      let metal = 0;
      for (let f = 0; f < freqs.length; f++) {
        p[f] += (2 * Math.PI * freqs[f]) / sampleRate;
        metal += Math.sin(p[f]) * 0.2;
      }
      const noise = (Math.random() * 2 - 1) * 0.8;
      const amp = Math.exp(-t * decay);
      data[i] = (metal + noise) * amp * 0.75;
    }
  });
}

// 5. PERCUSSION / RIMSHOT / TOM
export function generatePerc(ctx: AudioContext, type: 'rim' | 'tom' | 'cowbell' | 'shaker'): AudioBuffer {
  const duration = type === 'tom' ? 0.4 : 0.25;
  return createBufferFromGenerator(ctx, duration, (sampleRate, data) => {
    if (type === 'rim') {
      let phase = 0;
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        phase += (2 * Math.PI * 1400) / sampleRate;
        const ping = Math.sin(phase) * Math.exp(-t * 35);
        const click = t < 0.002 ? (1 - t / 0.002) : 0;
        data[i] = (ping * 0.7 + click * 0.8) * 0.9;
      }
    } else if (type === 'tom') {
      let phase = 0;
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const freq = 90 * Math.exp(-t * 8) + 40;
        phase += (2 * Math.PI * freq) / sampleRate;
        const amp = Math.exp(-t * 9);
        data[i] = Math.sin(phase) * amp * 0.9;
      }
    } else if (type === 'cowbell') {
      let p1 = 0;
      let p2 = 0;
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        p1 += (2 * Math.PI * 800) / sampleRate;
        p2 += (2 * Math.PI * 540) / sampleRate;
        const tone = (Math.sin(p1) + Math.sin(p2) * 0.8) * Math.exp(-t * 18);
        data[i] = Math.tanh(tone * 1.5) * 0.8;
      }
    } else {
      // Shaker
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const noise = (Math.random() * 2 - 1);
        const env = Math.sin(Math.min(Math.PI, t * 25)) * Math.exp(-t * 12);
        data[i] = noise * env * 0.7;
      }
    }
  });
}

// 6. MELODIC RHODES / CHORD STAB
export function generateChord(ctx: AudioContext, chord: 'Fm9' | 'Cm7' | 'Ebmaj7' | 'Abmaj9' = 'Fm9'): AudioBuffer {
  const duration = 1.2;
  const chordFrequencies: Record<string, number[]> = {
    Fm9: [174.61, 207.65, 261.63, 311.13, 392.00], // F3, Ab3, C4, Eb4, G4
    Cm7: [130.81, 155.56, 196.00, 233.08, 261.63], // C3, Eb3, G3, Bb3, C4
    Ebmaj7: [155.56, 196.00, 233.08, 293.66, 349.23], // Eb3, G3, Bb3, D4, F4
    Abmaj9: [207.65, 261.63, 311.13, 392.00, 466.16], // Ab3, C4, Eb4, G4, Bb4
  };
  const notes = chordFrequencies[chord] || chordFrequencies.Fm9;

  return createBufferFromGenerator(ctx, duration, (sampleRate, data) => {
    const phases = notes.map(() => 0);
    const bellPhases = notes.map(() => 0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      let mixed = 0;

      // Tremolo LFO
      const tremolo = 1 + 0.15 * Math.sin(2 * Math.PI * 4.5 * t);
      const amp = Math.exp(-t * 2.8) * tremolo;

      for (let n = 0; n < notes.length; n++) {
        const f = notes[n];
        phases[n] += (2 * Math.PI * f) / sampleRate;
        bellPhases[n] += (2 * Math.PI * f * 3.5) / sampleRate;

        // Warm electric piano tone: fundamental + 2nd harmonic + subtle bell tinkle
        const noteTone = Math.sin(phases[n]) + 0.3 * Math.sin(phases[n] * 2);
        const bellPing = Math.sin(bellPhases[n]) * Math.exp(-t * 20) * 0.2;
        mixed += (noteTone + bellPing) * (1 / notes.length);
      }

      data[i] = Math.tanh(mixed * amp * 1.2) * 0.85;
    }
  });
}

// 7. BASS PLUCK / 808 GLIDE
export function generateBass(ctx: AudioContext, note: number = 55): AudioBuffer { // 55Hz = A1
  const duration = 0.9;
  return createBufferFromGenerator(ctx, duration, (sampleRate, data) => {
    let phase = 0;
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      phase += (2 * Math.PI * note) / sampleRate;
      const fund = Math.sin(phase);
      const sub = Math.sin(phase * 0.5) * 0.4;
      const harm = Math.sin(phase * 2) * 0.3 * Math.exp(-t * 6);
      const amp = Math.exp(-t * 3.2);
      data[i] = Math.tanh((fund + sub + harm) * amp * 1.5) * 0.9;
    }
  });
}

// 8. VOCAL FORMANT CHOP ("HEY!" / "OOH!")
export function generateVocalChop(ctx: AudioContext, type: 'hey' | 'ooh' | 'chant' = 'hey'): AudioBuffer {
  const duration = 0.45;
  return createBufferFromGenerator(ctx, duration, (sampleRate, data) => {
    const f0 = type === 'hey' ? 240 : 180;
    // Formant filter frequencies for vocal vowel
    const f1 = type === 'hey' ? 550 : 350;
    const f2 = type === 'hey' ? 1900 : 800;

    let p0 = 0, p1 = 0, p2 = 0;
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const pitch = f0 * (1 - 0.2 * t);
      p0 += (2 * Math.PI * pitch) / sampleRate;
      p1 += (2 * Math.PI * f1) / sampleRate;
      p2 += (2 * Math.PI * f2) / sampleRate;

      // Pulse train excitation
      const pulse = Math.sin(p0) > 0 ? 1 : -0.2;
      const formant = pulse * (Math.sin(p1) * 0.5 + Math.sin(p2) * 0.4);
      const amp = Math.sin(Math.min(Math.PI, t * 10)) * Math.exp(-t * 4);

      data[i] = Math.tanh(formant * amp * 1.4) * 0.8;
    }
  });
}

// 9. VINYL SCRATCH / SOUND EFFECT
export function generateFx(ctx: AudioContext, type: 'scratch' | 'riser' | 'laser'): AudioBuffer {
  const duration = 0.6;
  return createBufferFromGenerator(ctx, duration, (sampleRate, data) => {
    if (type === 'scratch') {
      let phase = 0;
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const f = 200 + 800 * Math.sin(t * 25);
        phase += (2 * Math.PI * Math.abs(f)) / sampleRate;
        const amp = Math.exp(-t * 5);
        const noise = (Math.random() * 2 - 1) * 0.2;
        data[i] = (Math.sin(phase) + noise) * amp * 0.8;
      }
    } else if (type === 'riser') {
      let phase = 0;
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const f = 100 + 1200 * Math.pow(t / duration, 2);
        phase += (2 * Math.PI * f) / sampleRate;
        const amp = Math.min(1, t / 0.1) * Math.min(1, (duration - t) / 0.05);
        data[i] = Math.sin(phase) * amp * 0.75;
      }
    } else {
      // Laser
      let phase = 0;
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const f = 1800 * Math.exp(-t * 25) + 80;
        phase += (2 * Math.PI * f) / sampleRate;
        data[i] = Math.sin(phase) * Math.exp(-t * 8) * 0.8;
      }
    }
  });
}
