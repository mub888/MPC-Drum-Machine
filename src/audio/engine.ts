import { MasterEffectsConfig, PadConfig, Pattern, StepEvent } from '../types';

export class DroidMPCAudioEngine {
  public ctx: AudioContext | null = null;
  public masterGain: GainNode | null = null;
  public masterBus: GainNode | null = null;
  public analyser: AnalyserNode | null = null;

  // Insert FX Nodes
  private vintageShaper: WaveShaperNode | null = null;
  private eqLow: BiquadFilterNode | null = null;
  private eqMid: BiquadFilterNode | null = null;
  private eqHigh: BiquadFilterNode | null = null;
  private masterFilter: BiquadFilterNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedbackNode: GainNode | null = null;
  private delayWetNode: GainNode | null = null;
  private reverbConvolver: ConvolverNode | null = null;
  private reverbWetNode: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  // Active playing sources for voice management & mute groups
  private activeVoices: Map<number, { source: AudioBufferSourceNode; gainNode: GainNode; muteGroup?: number }> = new Map();

  // Sequencer state
  public isPlaying: boolean = false;
  public isRecording: boolean = false;
  public bpm: number = 120;
  public swing: number = 54; // 50 to 75
  public metronomeEnabled: boolean = false;
  public preRollBars: number = 0; // 0, 1, or 2 bars
  public countInActive: boolean = false;
  public currentStep: number = 0; // 0 to 15 or 31
  public currentBar: number = 1;
  public currentBeat: number = 1;

  // Scheduler internals
  private scheduleTimer: number | null = null;
  private nextStepTime: number = 0;
  private lookaheadMs: number = 25;
  private scheduleIntervalMs: number = 20;
  private activePattern: Pattern | null = null;
  private padLookup: Map<number, PadConfig> = new Map();
  private onStepCallback: ((step: number, bar: number, beat: number) => void) | null = null;
  private onRecordEventCallback: ((padId: number, step: number, velocity: number) => void) | null = null;

  // Live Audio Recording
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  public isSamplingMic: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  public async initAudio(): Promise<AudioContext> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.setupMasterGraph();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    return this.ctx;
  }

  private setupMasterGraph(): void {
    if (!this.ctx) return;

    // Master Bus (all tracks & pads sum here)
    this.masterBus = this.ctx.createGain();
    this.masterBus.gain.value = 1.0;

    // Vintage Shaper (12-bit / analog saturation)
    this.vintageShaper = this.ctx.createWaveShaper();
    this.vintageShaper.curve = this.createCleanCurve() as unknown as Float32Array<ArrayBuffer>;

    // 3-Band Parametric EQ
    this.eqLow = this.ctx.createBiquadFilter();
    this.eqLow.type = 'lowshelf';
    this.eqLow.frequency.value = 100;
    this.eqLow.gain.value = 0;

    this.eqMid = this.ctx.createBiquadFilter();
    this.eqMid.type = 'peaking';
    this.eqMid.frequency.value = 1000;
    this.eqMid.Q.value = 1.0;
    this.eqMid.gain.value = 0;

    this.eqHigh = this.ctx.createBiquadFilter();
    this.eqHigh.type = 'highshelf';
    this.eqHigh.frequency.value = 7000;
    this.eqHigh.gain.value = 0;

    // Resonant Filter
    this.masterFilter = this.ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 20000;
    this.masterFilter.Q.value = 1.0;

    // Delay line
    this.delayNode = this.ctx.createDelay(2.0);
    this.delayNode.delayTime.value = 0.25;
    this.delayFeedbackNode = this.ctx.createGain();
    this.delayFeedbackNode.gain.value = 0.35;
    this.delayWetNode = this.ctx.createGain();
    this.delayWetNode.gain.value = 0.0;

    // Delay routing loop
    this.delayNode.connect(this.delayFeedbackNode);
    this.delayFeedbackNode.connect(this.delayNode);
    this.delayNode.connect(this.delayWetNode);

    // Reverb
    this.reverbConvolver = this.ctx.createConvolver();
    this.reverbConvolver.buffer = this.createSyntheticImpulse(1.6, 2.0);
    this.reverbWetNode = this.ctx.createGain();
    this.reverbWetNode.gain.value = 0.0;
    this.reverbConvolver.connect(this.reverbWetNode);

    // Master Compressor / Limiter
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -6;
    this.compressor.knee.value = 10;
    this.compressor.ratio.value = 3;
    this.compressor.attack.value = 0.005;
    this.compressor.release.value = 0.15;

    // Master Gain & Analyser
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1.0;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;

    // Routing Graph:
    // masterBus -> vintageShaper -> eqLow -> eqMid -> eqHigh -> masterFilter
    // masterFilter -> compressor
    // masterFilter -> delayNode (send) -> delayWet -> compressor
    // masterFilter -> reverbConvolver (send) -> reverbWet -> compressor
    // compressor -> masterGain -> analyser -> destination
    this.masterBus.connect(this.vintageShaper);
    this.vintageShaper.connect(this.eqLow);
    this.eqLow.connect(this.eqMid);
    this.eqMid.connect(this.eqHigh);
    this.eqHigh.connect(this.masterFilter);

    // Dry path to compressor
    this.masterFilter.connect(this.compressor);

    // FX sends
    this.masterFilter.connect(this.delayNode);
    this.masterFilter.connect(this.reverbConvolver);
    this.delayWetNode.connect(this.compressor);
    this.reverbWetNode.connect(this.compressor);

    // Output
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  private createCleanCurve(): Float32Array {
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = x;
    }
    return curve;
  }

  private createMpc60Curve(): Float32Array {
    // 12-bit quantization and vintage transformer warmth
    const steps = 4096;
    const curve = new Float32Array(512);
    for (let i = 0; i < 512; i++) {
      const x = (i * 2) / 512 - 1;
      // Quantize to simulate 12-bit AD converter
      const quantized = Math.round(x * steps) / steps;
      // Soft saturation curve
      curve[i] = Math.tanh(quantized * 1.35) * 0.95;
    }
    return curve;
  }

  private createMpc3000Curve(): Float32Array {
    // 16-bit analog punch & subtle tube warmth
    const curve = new Float32Array(512);
    for (let i = 0; i < 512; i++) {
      const x = (i * 2) / 512 - 1;
      curve[i] = (1.5 * x - 0.5 * Math.pow(x, 3)) * 0.98;
    }
    return curve;
  }

  private createSyntheticImpulse(duration: number, decay: number): AudioBuffer {
    if (!this.ctx) throw new Error('No context');
    const length = Math.floor(this.ctx.sampleRate * duration);
    const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      const env = Math.pow(1 - n, decay);
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }
    return impulse;
  }

  public updateEffects(cfg: MasterEffectsConfig): void {
    if (!this.ctx || !this.masterGain) return;

    this.masterGain.gain.setTargetAtTime(cfg.masterVolume, this.ctx.currentTime, 0.02);

    // Vintage Mode
    if (this.vintageShaper) {
      if (cfg.vintageMode === 'mpc60') {
        this.vintageShaper.curve = this.createMpc60Curve() as unknown as Float32Array<ArrayBuffer>;
      } else if (cfg.vintageMode === 'mpc3000') {
        this.vintageShaper.curve = this.createMpc3000Curve() as unknown as Float32Array<ArrayBuffer>;
      } else {
        this.vintageShaper.curve = this.createCleanCurve() as unknown as Float32Array<ArrayBuffer>;
      }
    }

    // EQ
    if (this.eqLow) this.eqLow.gain.setTargetAtTime(cfg.eqLow, this.ctx.currentTime, 0.02);
    if (this.eqMid) this.eqMid.gain.setTargetAtTime(cfg.eqMid, this.ctx.currentTime, 0.02);
    if (this.eqHigh) this.eqHigh.gain.setTargetAtTime(cfg.eqHigh, this.ctx.currentTime, 0.02);

    // Filter
    if (this.masterFilter) {
      this.masterFilter.type = cfg.filterType;
      this.masterFilter.frequency.setTargetAtTime(cfg.filterCutoff, this.ctx.currentTime, 0.02);
      this.masterFilter.Q.setTargetAtTime(cfg.filterResonance, this.ctx.currentTime, 0.02);
    }

    // Delay
    if (this.delayNode && this.delayFeedbackNode && this.delayWetNode) {
      this.delayNode.delayTime.setTargetAtTime(cfg.delayTime, this.ctx.currentTime, 0.02);
      this.delayFeedbackNode.gain.setTargetAtTime(cfg.delayFeedback, this.ctx.currentTime, 0.02);
      this.delayWetNode.gain.setTargetAtTime(cfg.delayEnabled ? cfg.delayMix : 0, this.ctx.currentTime, 0.02);
    }

    // Reverb
    if (this.reverbWetNode) {
      this.reverbWetNode.gain.setTargetAtTime(cfg.reverbEnabled ? cfg.reverbMix : 0, this.ctx.currentTime, 0.02);
    }

    // Compressor
    if (this.compressor) {
      this.compressor.threshold.setTargetAtTime(cfg.compressorThreshold, this.ctx.currentTime, 0.02);
      this.compressor.ratio.setTargetAtTime(cfg.compressorRatio, this.ctx.currentTime, 0.02);
    }
  }

  // Realtime modulation (from XY Performance Pad)
  public setXYModulation(xVal: number, yVal: number, active: boolean): void {
    if (!this.ctx || !this.masterFilter || !this.delayWetNode) return;
    if (!active) {
      // Reset filter and delay to normal
      this.masterFilter.frequency.setTargetAtTime(20000, this.ctx.currentTime, 0.05);
      this.masterFilter.Q.setTargetAtTime(1.0, this.ctx.currentTime, 0.05);
      return;
    }

    // X controls Low-pass Cutoff (60Hz to 18000Hz log scale)
    const minF = 60;
    const maxF = 18000;
    const cutoff = minF * Math.pow(maxF / minF, Math.max(0.01, Math.min(1, xVal)));
    this.masterFilter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.01);
    this.masterFilter.Q.setTargetAtTime(4.0 + (1 - xVal) * 6, this.ctx.currentTime, 0.01);

    // Y controls Delay / Repeat stutter send
    if (this.delayNode && this.delayFeedbackNode) {
      const delayDivision = Math.max(0.06, 0.45 * (1 - yVal * 0.7)); // Shorter delay at higher Y
      this.delayNode.delayTime.setTargetAtTime(delayDivision, this.ctx.currentTime, 0.01);
      this.delayFeedbackNode.gain.setTargetAtTime(0.3 + yVal * 0.45, this.ctx.currentTime, 0.01);
      this.delayWetNode.gain.setTargetAtTime(yVal * 0.65, this.ctx.currentTime, 0.01);
    }
  }

  // Trigger Pad Audio
  public triggerPad(
    pad: PadConfig,
    velocity: number = 1.0,
    pitchOffset: number = 0,
    scheduledTime?: number
  ): void {
    if (!this.ctx || !this.masterBus || !pad.audioBuffer) return;

    const time = scheduledTime ?? this.ctx.currentTime;

    // Check mute group (e.g. Hi-Hat mute group)
    if (pad.muteGroup !== undefined) {
      for (const [id, voice] of this.activeVoices.entries()) {
        if (voice.muteGroup === pad.muteGroup) {
          voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, time);
          voice.gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.015);
          voice.source.stop(time + 0.02);
          this.activeVoices.delete(id);
        }
      }
    }

    // If pad is muted, do not sound
    if (pad.isMuted) return;

    // Source Node
    const source = this.ctx.createBufferSource();
    source.buffer = pad.audioBuffer;
    source.loop = pad.loop;

    // Playback rate (pitch shift: semitones to playbackRate ratio)
    const totalSemitones = (pad.pitch || 0) + pitchOffset;
    const playbackRate = Math.pow(2, totalSemitones / 12);
    source.playbackRate.setValueAtTime(Math.max(0.1, playbackRate), time);

    // Gain & Pan
    const gainNode = this.ctx.createGain();
    const finalGain = Math.max(0, Math.min(2.0, (pad.volume ?? 1.0) * velocity));
    gainNode.gain.setValueAtTime(finalGain, time);

    const panner = this.ctx.createStereoPanner();
    panner.pan.setValueAtTime(pad.pan || 0, time);

    // Connect
    source.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(this.masterBus);

    // Start with trim calculations
    const duration = pad.audioBuffer.duration;
    const offset = Math.max(0, Math.min(duration - 0.01, (pad.trimStart || 0) * duration));
    const end = Math.max(offset + 0.01, Math.min(duration, (pad.trimEnd || 1) * duration));
    const playLength = end - offset;

    source.start(time, offset, pad.loop ? undefined : playLength);

    this.activeVoices.set(pad.id, { source, gainNode, muteGroup: pad.muteGroup });

    source.onended = () => {
      this.activeVoices.delete(pad.id);
    };

    // If we're recording in playback mode, capture the event
    if (this.isRecording && this.isPlaying && !scheduledTime) {
      if (this.onRecordEventCallback) {
        this.onRecordEventCallback(pad.id, this.currentStep, velocity);
      }
    }
  }

  // Metronome tick
  private playMetronomeClick(isDownbeat: boolean, time: number): void {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isDownbeat ? 1600 : 900, time);

    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  // Sequencer Engine Lookahead Scheduler
  public setPattern(pattern: Pattern, pads: PadConfig[]): void {
    this.activePattern = pattern;
    this.padLookup.clear();
    pads.forEach(p => this.padLookup.set(p.id, p));
  }

  public setCallbacks(
    onStep: (step: number, bar: number, beat: number) => void,
    onRecord: (padId: number, step: number, velocity: number) => void
  ): void {
    this.onStepCallback = onStep;
    this.onRecordEventCallback = onRecord;
  }

  public startPlayback(startStep: number = 0): void {
    if (!this.ctx) return;
    this.isPlaying = true;
    this.currentStep = startStep;
    this.nextStepTime = this.ctx.currentTime + 0.05;

    if (this.scheduleTimer) window.clearTimeout(this.scheduleTimer);
    this.scheduler();
  }

  public stopPlayback(): void {
    this.isPlaying = false;
    this.isRecording = false;
    this.countInActive = false;
    if (this.scheduleTimer) {
      window.clearTimeout(this.scheduleTimer);
      this.scheduleTimer = null;
    }
    // Stop all active voice loops
    for (const voice of this.activeVoices.values()) {
      try {
        voice.source.stop();
      } catch {
        // ignore already stopped
      }
    }
    this.activeVoices.clear();
  }

  private scheduler = (): void => {
    if (!this.ctx || !this.isPlaying) return;

    while (this.nextStepTime < this.ctx.currentTime + this.lookaheadMs / 1000) {
      this.scheduleStep(this.currentStep, this.nextStepTime);
      this.advanceStep();
    }

    this.scheduleTimer = window.setTimeout(this.scheduler, this.scheduleIntervalMs);
  };

  private scheduleStep(stepIndex: number, stepTime: number): void {
    if (!this.ctx || !this.activePattern) return;

    const patternLength = this.activePattern.length || 16;
    const safeStep = stepIndex % patternLength;

    // Calculate bar and beat
    const beatIn16ths = safeStep % 4;
    const currentBeat = Math.floor(safeStep / 4) + 1;
    const currentBar = Math.floor(stepIndex / patternLength) + 1;

    // Metronome on quarter notes (steps 0, 4, 8, 12, etc.)
    if (this.metronomeEnabled && beatIn16ths === 0) {
      const isDownbeat = currentBeat === 1;
      this.playMetronomeClick(isDownbeat, stepTime);
    }

    // Schedule pad tracks
    for (const padIdStr of Object.keys(this.activePattern.tracks)) {
      const padId = parseInt(padIdStr, 10);
      const track = this.activePattern.tracks[padId];
      if (track && track.steps && track.steps[safeStep]) {
        const stepEvt: StepEvent = track.steps[safeStep];
        if (stepEvt.active) {
          const pad = this.padLookup.get(padId);
          if (pad) {
            this.triggerPad(pad, stepEvt.velocity, stepEvt.pitchOffset || 0, stepTime);
          }
        }
      }
    }

    // UI Notify sync
    if (this.onStepCallback) {
      const delay = Math.max(0, (stepTime - this.ctx.currentTime) * 1000);
      setTimeout(() => {
        if (this.isPlaying && this.onStepCallback) {
          this.onStepCallback(safeStep, currentBar, currentBeat);
        }
      }, delay);
    }
  }

  private advanceStep(): void {
    if (!this.activePattern) return;

    // Duration of a 16th note in seconds = (60 / bpm) / 4
    const secondsPer16th = 60.0 / (this.bpm * 4);

    // MPC Swing formula:
    // Even steps (0, 2, 4...) are baseline.
    // Odd steps (1, 3, 5...) are swung forward in time.
    let swingDelta = 0;
    const isOddStep = this.currentStep % 2 === 1;

    if (isOddStep && this.swing > 50) {
      // Swing 50% = 0 swing; Swing 75% = max swing delay
      const swingRatio = (this.swing - 50) / 100;
      swingDelta = swingRatio * secondsPer16th * 0.6;
    }

    this.nextStepTime += secondsPer16th + swingDelta;

    const patternLen = this.activePattern.length || 16;
    this.currentStep = (this.currentStep + 1) % patternLen;
  }

  // Microphone Sample Recording
  public async startMicRecording(): Promise<void> {
    if (this.isSamplingMic) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
      };

      this.mediaRecorder.start();
      this.isSamplingMic = true;
    } catch (err) {
      console.error('Failed to access microphone for sampling:', err);
      throw err;
    }
  }

  public async stopMicRecording(): Promise<AudioBuffer | null> {
    if (!this.isSamplingMic || !this.mediaRecorder) return null;

    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = async () => {
        this.isSamplingMic = false;
        // Stop all mic tracks to release hardware indicator
        if (this.mediaRecorder?.stream) {
          this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        }

        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        const arrayBuffer = await blob.arrayBuffer();

        await this.initAudio();
        if (!this.ctx) {
          resolve(null);
          return;
        }

        try {
          const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
          resolve(audioBuffer);
        } catch {
          resolve(null);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  // Audio File decoding from user upload
  public async decodeAudioFile(file: File): Promise<AudioBuffer> {
    await this.initAudio();
    if (!this.ctx) throw new Error('AudioContext not ready');

    const arrayBuffer = await file.arrayBuffer();
    return await this.ctx.decodeAudioData(arrayBuffer);
  }
}

// Global Audio Engine Instance
export const audioEngine = new DroidMPCAudioEngine();
