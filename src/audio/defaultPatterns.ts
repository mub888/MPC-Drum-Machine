import { Pattern, TrackSequence } from '../types';

export function createEmptyPattern(id: string, name: string, length: number = 16): Pattern {
  const tracks: Record<number, TrackSequence> = {};
  for (let p = 0; p < 16; p++) {
    tracks[p] = {
      padId: p,
      steps: Array.from({ length }, () => ({ active: false, velocity: 0.8 })),
    };
  }
  return { id, name, length, tracks };
}

export function createTrapPattern(): Pattern {
  const pat = createEmptyPattern('pat-trap-1', 'Main Trap Groove', 16);

  // Pad 0: Kick
  [0, 10].forEach(s => { pat.tracks[0].steps[s] = { active: true, velocity: 0.95 }; });

  // Pad 1: Snare
  [4, 12].forEach(s => { pat.tracks[1].steps[s] = { active: true, velocity: 0.9 }; });

  // Pad 2: Hi-Hat (rolling trap hats with velocity dynamics)
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].forEach(s => {
    const isAccent = s % 4 === 0;
    const isRoll = s >= 10 && s <= 12;
    pat.tracks[2].steps[s] = {
      active: true,
      velocity: isAccent ? 0.9 : (isRoll ? 0.85 : 0.6),
    };
  });

  // Pad 3: Open Hat
  [2, 14].forEach(s => { pat.tracks[3].steps[s] = { active: true, velocity: 0.75 }; });

  // Pad 4: Clap
  [4, 12].forEach(s => { pat.tracks[4].steps[s] = { active: true, velocity: 0.7 }; });

  // Pad 5: 808 Sub
  [0, 6, 8, 11].forEach(s => { pat.tracks[5].steps[s] = { active: true, velocity: 1.0 }; });

  // Pad 8: Rhodes Fm9
  [0].forEach(s => { pat.tracks[8].steps[s] = { active: true, velocity: 0.85 }; });

  // Pad 9: Rhodes Cm7
  [8].forEach(s => { pat.tracks[9].steps[s] = { active: true, velocity: 0.85 }; });

  // Pad 12: Vocal Chant
  [14].forEach(s => { pat.tracks[12].steps[s] = { active: true, velocity: 0.8 }; });

  return pat;
}

export function createBoomBapPattern(): Pattern {
  const pat = createEmptyPattern('pat-boombap-1', 'Golden Era Beat', 16);

  // Kick
  [0, 3, 6, 10].forEach(s => { pat.tracks[0].steps[s] = { active: true, velocity: 0.95 }; });

  // Snare
  [4, 12].forEach(s => { pat.tracks[1].steps[s] = { active: true, velocity: 0.95 }; });

  // Hats with swing feel
  [0, 2, 4, 6, 8, 10, 12, 14].forEach(s => {
    pat.tracks[2].steps[s] = { active: true, velocity: 0.8 };
  });

  // Shaker on ghost notes
  [1, 3, 5, 7, 9, 11, 13, 15].forEach(s => {
    pat.tracks[7].steps[s] = { active: true, velocity: 0.5 };
  });

  // Rhodes Fm9
  [0, 6].forEach(s => { pat.tracks[8].steps[s] = { active: true, velocity: 0.85 }; });

  // Rhodes Ebmaj7
  [8, 14].forEach(s => { pat.tracks[10].steps[s] = { active: true, velocity: 0.85 }; });

  // Scratch
  [14].forEach(s => { pat.tracks[14].steps[s] = { active: true, velocity: 0.7 }; });

  return pat;
}

export function createHousePattern(): Pattern {
  const pat = createEmptyPattern('pat-house-1', 'Club 4x4 Groove', 16);

  // 4-on-the-floor Kick
  [0, 4, 8, 12].forEach(s => { pat.tracks[0].steps[s] = { active: true, velocity: 1.0 }; });

  // Clap on 4 & 12
  [4, 12].forEach(s => { pat.tracks[4].steps[s] = { active: true, velocity: 0.9 }; });

  // Open Hat on offbeats
  [2, 6, 10, 14].forEach(s => { pat.tracks[3].steps[s] = { active: true, velocity: 0.85 }; });

  // Closed Hats on 16ths
  for (let s = 0; s < 16; s++) {
    pat.tracks[2].steps[s] = { active: true, velocity: s % 2 === 0 ? 0.7 : 0.5 };
  }

  // Bass
  [2, 6, 10, 14].forEach(s => { pat.tracks[5].steps[s] = { active: true, velocity: 0.9 }; });

  return pat;
}
