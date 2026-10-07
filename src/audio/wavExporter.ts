import { MasterEffectsConfig, PadConfig, Pattern, SongBlock } from '../types';

export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const outBuffer = new ArrayBuffer(length);
  const view = new DataView(outBuffer);
  const channels: Float32Array[] = [];
  let sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  // RIFF identifier
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  // fmt sub-chunk
  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // subchunk1size (16 for PCM)
  setUint16(1); // linear quantization (PCM)
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan); // byte rate
  setUint16(numOfChan * 2); // block align
  setUint16(16); // bits per sample (16 bit)

  // data sub-chunk
  setUint32(0x61746164); // "data" chunk
  setUint32(length - pos - 4); // chunk length

  // extract channels
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  // Interleave channels & write 16-bit PCM
  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      // 16-bit PCM scale
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([outBuffer], { type: 'audio/wav' });
}

export async function renderOfflineSong(
  patterns: Pattern[],
  songBlocks: SongBlock[],
  pads: PadConfig[],
  bpm: number,
  swing: number,
  effects: MasterEffectsConfig
): Promise<Blob> {
  const sampleRate = 44100;
  const secondsPer16th = 60.0 / (bpm * 4);

  // Calculate total duration
  let total16thSteps = 0;
  const patternMap = new Map<string, Pattern>();
  patterns.forEach(p => patternMap.set(p.id, p));

  const resolvedBlocks = songBlocks.length > 0
    ? songBlocks
    : [{ id: 'b1', patternId: patterns[0]?.id || '', repeats: 4, name: 'Loop' }];

  for (const block of resolvedBlocks) {
    const pat = patternMap.get(block.patternId) || patterns[0];
    const len = pat ? pat.length : 16;
    total16thSteps += len * block.repeats;
  }

  const durationSec = Math.max(2, total16thSteps * secondsPer16th + 2.5); // Add 2.5s tail for reverb/delay
  const totalFrames = Math.ceil(durationSec * sampleRate);

  const offlineCtx = new OfflineAudioContext(2, totalFrames, sampleRate);

  // Setup offline graph
  const masterBus = offlineCtx.createGain();
  masterBus.gain.value = 1.0;

  // Resonant Filter
  const filter = offlineCtx.createBiquadFilter();
  filter.type = effects.filterType;
  filter.frequency.value = effects.filterCutoff;
  filter.Q.value = effects.filterResonance;

  // Master Compressor
  const comp = offlineCtx.createDynamicsCompressor();
  comp.threshold.value = effects.compressorThreshold;
  comp.ratio.value = effects.compressorRatio;

  // Master Gain
  const masterGain = offlineCtx.createGain();
  masterGain.gain.value = effects.masterVolume;

  masterBus.connect(filter);
  filter.connect(comp);
  comp.connect(masterGain);
  masterGain.connect(offlineCtx.destination);

  // Optional Delay
  if (effects.delayEnabled) {
    const delay = offlineCtx.createDelay(2.0);
    delay.delayTime.value = effects.delayTime;
    const fb = offlineCtx.createGain();
    fb.gain.value = effects.delayFeedback;
    const wet = offlineCtx.createGain();
    wet.gain.value = effects.delayMix;

    delay.connect(fb);
    fb.connect(delay);
    delay.connect(wet);
    filter.connect(delay);
    wet.connect(comp);
  }

  const padMap = new Map<number, PadConfig>();
  pads.forEach(p => padMap.set(p.id, p));

  // Schedule all events
  let currentStepGlobal = 0;
  for (const block of resolvedBlocks) {
    const pat = patternMap.get(block.patternId) || patterns[0];
    if (!pat) continue;
    const len = pat.length;

    for (let r = 0; r < block.repeats; r++) {
      for (let s = 0; s < len; s++) {
        // Calculate step timestamp with swing
        let stepTime = currentStepGlobal * secondsPer16th;
        if (s % 2 === 1 && swing > 50) {
          const swingRatio = (swing - 50) / 100;
          stepTime += swingRatio * secondsPer16th * 0.6;
        }

        // Trigger notes
        for (const [padIdStr, track] of Object.entries(pat.tracks)) {
          const padId = parseInt(padIdStr, 10);
          const stepEvt = track.steps[s];
          if (stepEvt && stepEvt.active) {
            const pad = padMap.get(padId);
            if (pad && pad.audioBuffer && !pad.isMuted) {
              const src = offlineCtx.createBufferSource();
              src.buffer = pad.audioBuffer;
              const pitchShift = (pad.pitch || 0) + (stepEvt.pitchOffset || 0);
              src.playbackRate.value = Math.pow(2, pitchShift / 12);

              const gainNode = offlineCtx.createGain();
              gainNode.gain.value = (pad.volume ?? 1.0) * stepEvt.velocity;

              const panner = offlineCtx.createStereoPanner();
              panner.pan.value = pad.pan || 0;

              src.connect(gainNode);
              gainNode.connect(panner);
              panner.connect(masterBus);

              const dur = pad.audioBuffer.duration;
              const offset = Math.max(0, (pad.trimStart || 0) * dur);
              const end = Math.min(dur, (pad.trimEnd || 1) * dur);
              src.start(stepTime, offset, end - offset);
            }
          }
        }

        currentStepGlobal++;
      }
    }
  }

  const renderedBuffer = await offlineCtx.startRendering();
  return audioBufferToWav(renderedBuffer);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
}
