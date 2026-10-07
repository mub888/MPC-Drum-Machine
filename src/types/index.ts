export type PadBank = 'A' | 'B' | 'C' | 'D';

export type SixteenLevelsMode = 'none' | 'velocity' | 'tune';

export interface PadConfig {
  id: number; // 0 to 15 (per bank) or 0 to 63 overall
  bank: PadBank;
  name: string;
  category: 'kick' | 'snare' | 'clap' | 'hihat' | 'perc' | 'bass' | 'chord' | 'vocal' | 'fx';
  color: string; // Hex or Tailwind color for pad LED
  audioBuffer: AudioBuffer | null;
  sampleName: string;
  volume: number; // 0 to 1.5 (default 1.0)
  pan: number; // -1 to 1 (default 0)
  pitch: number; // semitones: -24 to +24 (default 0)
  trimStart: number; // 0 to 1 normalized
  trimEnd: number; // 0 to 1 normalized
  reverse: boolean;
  loop: boolean;
  muteGroup?: number;
  isMuted?: boolean;
  isSolo?: boolean;
}

export interface StepEvent {
  active: boolean;
  velocity: number; // 0.1 to 1.0
  pitchOffset?: number; // Semitones
}

export interface TrackSequence {
  padId: number; // 0 to 15
  steps: StepEvent[]; // 16 or 32 steps
}

export interface Pattern {
  id: string;
  name: string;
  length: number; // 16 or 32
  tracks: Record<number, TrackSequence>; // key: padId (0-15)
}

export interface SongBlock {
  id: string;
  patternId: string;
  repeats: number;
  name: string;
}

export interface AudioStemClip {
  id: string;
  name: string;
  startBar: number;
  durationBars: number;
  audioBuffer: AudioBuffer | null;
  volume: number;
  pan: number;
  isMuted: boolean;
  color: string;
}

export interface MasterEffectsConfig {
  vintageMode: 'clean' | 'mpc60' | 'mpc3000'; // MPC 60 = 12-bit crunch, MPC 3000 = warm punch
  filterType: 'lowpass' | 'bandpass' | 'highpass';
  filterCutoff: number; // 20 to 20000 Hz
  filterResonance: number; // 0 to 15
  delayEnabled: boolean;
  delayTime: number; // seconds or synced division (0.125 to 0.5)
  delayFeedback: number; // 0 to 0.8
  delayMix: number; // 0 to 1
  reverbEnabled: boolean;
  reverbDecay: number; // 0.2 to 5.0
  reverbMix: number; // 0 to 0.8
  eqLow: number; // dB -12 to +12
  eqMid: number; // dB -12 to +12
  eqHigh: number; // dB -12 to +12
  compressorThreshold: number; // dB -40 to 0
  compressorRatio: number; // 1 to 20
  masterVolume: number; // 0 to 1.5
}

export type PadGridSize = 9 | 12 | 15 | 16;

export type KeyboardLayoutPreset = 'qwerty' | 'numpad' | 'compact' | 'custom';

export interface KeyboardSettings {
  enabled: boolean;
  showKeyLabels: boolean;
  preset: KeyboardLayoutPreset;
  keyMap: Record<number, string>; // padIndex (0 to 15) -> KeyboardEvent.code
  gridSize: PadGridSize;
  midiEnabled: boolean;
  midiDeviceName?: string;
}

export interface SoundKit {
  id: string;
  name: string;
  description: string;
  genre: string;
  bpm: number;
  pads: PadConfig[];
}

export interface ProjectState {
  version: string;
  name: string;
  bpm: number;
  swing: number; // 50 to 75
  activeBank: PadBank;
  currentKitId: string;
  patterns: Pattern[];
  currentPatternId: string;
  songBlocks: SongBlock[];
  audioStems: AudioStemClip[];
  effects: MasterEffectsConfig;
}
