import { SoundKit, PadConfig, PadBank } from '../types';
import {
  generateKick,
  generateSnare,
  generateClap,
  generateHiHat,
  generatePerc,
  generateChord,
  generateBass,
  generateVocalChop,
  generateFx
} from './synthSounds';

// Color palette for classic Akai MPC RGB backlight pads
export const PAD_COLORS: Record<string, string> = {
  kick: '#ef4444',    // Punch Red
  snare: '#3b82f6',   // Electric Blue
  clap: '#06b6d4',    // Cyan
  hihat: '#eab308',   // Amber Gold
  perc: '#84cc16',    // Lime Green
  bass: '#a855f7',    // Purple Violet
  chord: '#ec4899',   // Magenta Pink
  vocal: '#10b981',   // Emerald
  fx: '#f97316',      // Orange
};

export function createDefaultKitPads(ctx: AudioContext, genre: 'trap' | 'boombap' | 'lofi' | 'neosoul' | 'electro' = 'trap'): PadConfig[] {
  const pads: PadConfig[] = [];

  const banks: PadBank[] = ['A', 'B', 'C', 'D'];

  banks.forEach((bank, bankIdx) => {
    for (let i = 0; i < 16; i++) {
      const padIndex = bankIdx * 16 + i;
      let pad: PadConfig;

      if (bank === 'A') {
        // Core 16 Performance Pads
        switch (i) {
          case 0:
            pad = {
              id: 0,
              bank: 'A',
              name: genre === 'trap' ? '808 Sub Kick' : 'Fat Vinyl Kick',
              category: 'kick',
              color: PAD_COLORS.kick,
              audioBuffer: generateKick(ctx, genre === 'trap' ? '808' : (genre === 'boombap' ? 'vintage' : 'punch')),
              sampleName: 'Kick_Main.wav',
              volume: 1.0,
              pan: 0,
              pitch: 0,
              trimStart: 0,
              trimEnd: 1,
              reverse: false,
              loop: false,
            };
            break;
          case 1:
            pad = {
              id: 1,
              bank: 'A',
              name: genre === 'trap' ? 'Trap Snare Crisp' : 'Boom Bap Snare',
              category: 'snare',
              color: PAD_COLORS.snare,
              audioBuffer: generateSnare(ctx, genre === 'trap' ? 'trap' : (genre === 'lofi' ? 'lofi' : 'boombap')),
              sampleName: 'Snare_Main.wav',
              volume: 0.95,
              pan: 0,
              pitch: 0,
              trimStart: 0,
              trimEnd: 1,
              reverse: false,
              loop: false,
            };
            break;
          case 2:
            pad = {
              id: 2,
              bank: 'A',
              name: 'Closed Hat Tick',
              category: 'hihat',
              color: PAD_COLORS.hihat,
              audioBuffer: generateHiHat(ctx, false),
              sampleName: 'Hat_Closed.wav',
              volume: 0.85,
              pan: -0.15,
              pitch: 0,
              trimStart: 0,
              trimEnd: 1,
              reverse: false,
              loop: false,
              muteGroup: 1, // Mute group with open hat!
            };
            break;
          case 3:
            pad = {
              id: 3,
              bank: 'A',
              name: 'Open Hat Sizzle',
              category: 'hihat',
              color: PAD_COLORS.hihat,
              audioBuffer: generateHiHat(ctx, true),
              sampleName: 'Hat_Open.wav',
              volume: 0.85,
              pan: 0.2,
              pitch: 0,
              trimStart: 0,
              trimEnd: 1,
              reverse: false,
              loop: false,
              muteGroup: 1,
            };
            break;
          case 4:
            pad = {
              id: 4,
              bank: 'A',
              name: 'Studio Hand Clap',
              category: 'clap',
              color: PAD_COLORS.clap,
              audioBuffer: generateClap(ctx),
              sampleName: 'Clap_Punch.wav',
              volume: 0.9,
              pan: 0.05,
              pitch: 0,
              trimStart: 0,
              trimEnd: 1,
              reverse: false,
              loop: false,
            };
            break;
          case 5:
            pad = {
              id: 5,
              bank: 'A',
              name: 'Deep Sub 808 Bass',
              category: 'bass',
              color: PAD_COLORS.bass,
              audioBuffer: generateBass(ctx, 43.65), // F1 sub
              sampleName: '808_Sub_F.wav',
              volume: 1.0,
              pan: 0,
              pitch: 0,
              trimStart: 0,
              trimEnd: 1,
              reverse: false,
              loop: false,
            };
            break;
          case 6:
            pad = {
              id: 6,
              bank: 'A',
              name: 'Rimshot Tight',
              category: 'perc',
              color: PAD_COLORS.perc,
              audioBuffer: generatePerc(ctx, 'rim'),
              sampleName: 'Perc_Rim.wav',
              volume: 0.85,
              pan: -0.25,
              pitch: 0,
              trimStart: 0,
              trimEnd: 1,
              reverse: false,
              loop: false,
            };
            break;
          case 7:
            pad = {
              id: 7,
              bank: 'A',
              name: 'Shaker Groove',
              category: 'perc',
              color: PAD_COLORS.perc,
              audioBuffer: generatePerc(ctx, 'shaker'),
              sampleName: 'Perc_Shaker.wav',
              volume: 0.75,
              pan: 0.3,
              pitch: 0,
              trimStart: 0,
              trimEnd: 1,
              reverse: false,
              loop: false,
            };
            break;
          case 8:
            pad = {
              id: 8,
              bank: 'A',
              name: 'Rhodes Fm9 Chord',
              category: 'chord',
              color: PAD_COLORS.chord,
              audioBuffer: generateChord(ctx, 'Fm9'),
              sampleName: 'Rhodes_Fm9.wav',
              volume: 0.95,
              pan: -0.1,
              pitch: 0,
              trimStart: 0,
              trimEnd: 1,
              reverse: false,
              loop: false,
            };
            break;
          case 9:
            pad = {
              id: 9,
              bank: 'A',
              name: 'Rhodes Cm7 Chord',
              category: 'chord',
              color: PAD_COLORS.chord,
              audioBuffer: generateChord(ctx, 'Cm7'),
              sampleName: 'Rhodes_Cm7.wav',
              volume: 0.95,
              pan: 0.1,
              pitch: 0,
              trimStart: 0,
              trimEnd: 1,
              reverse: false,
              loop: false,
            };
            break;
          case 10:
            pad = {
              id: 10,
              bank: 'A',
              name: 'Rhodes Ebmaj7 Chord',
              category: 'chord',
              color: PAD_COLORS.chord,
              audioBuffer: generateChord(ctx, 'Ebmaj7'),
              sampleName: 'Rhodes_Ebmaj7.wav',
              volume: 0.95,
              pan: 0.2,
              pitch: 0,
              trimStart: 0,
              trimEnd: 1,
              reverse: false,
              loop: false,
            };
            break;
          case 11:
            pad = {
              id: 11,
              bank: 'A',
              name: 'Synth Bass Pluck',
              category: 'bass',
              color: PAD_COLORS.bass,
              audioBuffer: generateBass(ctx, 65.41), // C2
              sampleName: 'Bass_Pluck_C.wav',
              volume: 0.9,
              pan: 0,
              pitch: 0,
              trimStart: 0,
              trimEnd: 1,
              reverse: false,
              loop: false,
            };
            break;
          case 12:
            pad = {
              id: 12,
              bank: 'A',
              name: 'Vocal Chant "Hey!"',
              category: 'vocal',
              color: PAD_COLORS.vocal,
              audioBuffer: generateVocalChop(ctx, 'hey'),
              sampleName: 'Vocal_Hey.wav',
              volume: 0.9,
              pan: 0,
              pitch: 0,
              trimStart: 0,
              trimEnd: 1,
              reverse: false,
              loop: false,
            };
            break;
          case 13:
            pad = {
              id: 13,
              bank: 'A',
              name: 'Vocal "Ooh" Harm',
              category: 'vocal',
              color: PAD_COLORS.vocal,
              audioBuffer: generateVocalChop(ctx, 'ooh'),
              sampleName: 'Vocal_Ooh.wav',
              volume: 0.85,
              pan: 0.15,
              pitch: 0,
              trimStart: 0,
              trimEnd: 1,
              reverse: false,
              loop: false,
            };
            break;
          case 14:
            pad = {
              id: 14,
              bank: 'A',
              name: 'Turntable Scratch',
              category: 'fx',
              color: PAD_COLORS.fx,
              audioBuffer: generateFx(ctx, 'scratch'),
              sampleName: 'FX_Scratch.wav',
              volume: 0.8,
              pan: -0.2,
              pitch: 0,
              trimStart: 0,
              trimEnd: 1,
              reverse: false,
              loop: false,
            };
            break;
          case 15:
          default:
            pad = {
              id: 15,
              bank: 'A',
              name: 'Laser Beam Drop',
              category: 'fx',
              color: PAD_COLORS.fx,
              audioBuffer: generateFx(ctx, 'laser'),
              sampleName: 'FX_Laser.wav',
              volume: 0.8,
              pan: 0.1,
              pitch: 0,
              trimStart: 0,
              trimEnd: 1,
              reverse: false,
              loop: false,
            };
            break;
        }
      } else {
        // Banks B, C, D: Extra percussion, low toms, cowbells, risers, alternate pitches
        const catList: Array<PadConfig['category']> = ['kick', 'snare', 'hihat', 'perc', 'bass', 'chord', 'vocal', 'fx'];
        const cat = catList[(i + bankIdx) % catList.length];
        
        let buf: AudioBuffer;
        if (cat === 'kick') buf = generateKick(ctx, 'deep');
        else if (cat === 'snare') buf = generateSnare(ctx, 'lofi');
        else if (cat === 'hihat') buf = generateHiHat(ctx, i % 2 === 0);
        else if (cat === 'perc') buf = generatePerc(ctx, i % 3 === 0 ? 'cowbell' : (i % 3 === 1 ? 'tom' : 'shaker'));
        else if (cat === 'bass') buf = generateBass(ctx, 40 + i * 4);
        else if (cat === 'chord') buf = generateChord(ctx, 'Abmaj9');
        else if (cat === 'vocal') buf = generateVocalChop(ctx, 'chant');
        else buf = generateFx(ctx, 'riser');

        pad = {
          id: i,
          bank: bank,
          name: `${bank}${i + 1} ${cat.toUpperCase()}`,
          category: cat,
          color: PAD_COLORS[cat] || '#94a3b8',
          audioBuffer: buf,
          sampleName: `${bank}_Pad_${i + 1}.wav`,
          volume: 0.9,
          pan: 0,
          pitch: 0,
          trimStart: 0,
          trimEnd: 1,
          reverse: false,
          loop: false,
        };
      }

      pads.push(pad);
    }
  });

  return pads;
}

export function createSoundKits(ctx: AudioContext): SoundKit[] {
  return [
    {
      id: 'kit-trap-808',
      name: '808 Street Heat',
      description: 'Heavy sub 808s, sizzling rolling hats, crisp layered snares, and vocal chants.',
      genre: 'Trap / Drill',
      bpm: 140,
      pads: createDefaultKitPads(ctx, 'trap'),
    },
    {
      id: 'kit-mpc-60',
      name: 'MPC 60 Golden Era',
      description: 'Classic 12-bit gritty boom bap crunch, warm vinyl kicks, jazz Rhodes stabs, and vinyl cuts.',
      genre: 'Boom Bap',
      bpm: 92,
      pads: createDefaultKitPads(ctx, 'boombap'),
    },
    {
      id: 'kit-lofi-chill',
      name: 'Lo-Fi Midnight Chill',
      description: 'Muffled warm kicks, dusty hats, Rhodes electric piano chords, and soothing ambient layers.',
      genre: 'Lo-Fi Beats',
      bpm: 84,
      pads: createDefaultKitPads(ctx, 'lofi'),
    },
    {
      id: 'kit-neosoul',
      name: 'Neo-Soul & Future R&B',
      description: 'Organic percussions, lush 9th chords, tight syncopated snap snares, and soulful chops.',
      genre: 'Neo-Soul / R&B',
      bpm: 96,
      pads: createDefaultKitPads(ctx, 'neosoul'),
    },
    {
      id: 'kit-electro-909',
      name: 'Night Club 909',
      description: 'Pumping four-on-the-floor dance kicks, 909 open hats, laser stabs, and club energy.',
      genre: 'Electronic / House',
      bpm: 124,
      pads: createDefaultKitPads(ctx, 'electro'),
    },
  ];
}
