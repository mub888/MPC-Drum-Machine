import { KeyboardLayoutPreset, PadGridSize, KeyboardSettings } from '../types';

export function getDefaultKeyMap(preset: KeyboardLayoutPreset, gridSize: PadGridSize): Record<number, string> {
  const map: Record<number, string> = {};

  if (gridSize === 9) {
    if (preset === 'numpad') {
      map[0] = 'Numpad1';
      map[1] = 'Numpad2';
      map[2] = 'Numpad3';
      map[3] = 'Numpad4';
      map[4] = 'Numpad5';
      map[5] = 'Numpad6';
      map[6] = 'Numpad7';
      map[7] = 'Numpad8';
      map[8] = 'Numpad9';
    } else {
      // QWERTY or Compact
      map[0] = 'KeyZ';
      map[1] = 'KeyX';
      map[2] = 'KeyC';
      map[3] = 'KeyA';
      map[4] = 'KeyS';
      map[5] = 'KeyD';
      map[6] = 'KeyQ';
      map[7] = 'KeyW';
      map[8] = 'KeyE';
    }
  } else if (gridSize === 12) {
    if (preset === 'numpad') {
      // 4 rows of 3
      map[0] = 'Numpad0';
      map[1] = 'NumpadDecimal';
      map[2] = 'NumpadEnter';
      map[3] = 'Numpad1';
      map[4] = 'Numpad2';
      map[5] = 'Numpad3';
      map[6] = 'Numpad4';
      map[7] = 'Numpad5';
      map[8] = 'Numpad6';
      map[9] = 'Numpad7';
      map[10] = 'Numpad8';
      map[11] = 'Numpad9';
    } else {
      // 3 rows of 4: Z-V, A-F, Q-R
      map[0] = 'KeyZ';
      map[1] = 'KeyX';
      map[2] = 'KeyC';
      map[3] = 'KeyV';
      map[4] = 'KeyA';
      map[5] = 'KeyS';
      map[6] = 'KeyD';
      map[7] = 'KeyF';
      map[8] = 'KeyQ';
      map[9] = 'KeyW';
      map[10] = 'KeyE';
      map[11] = 'KeyR';
    }
  } else if (gridSize === 15) {
    // 3 rows of 5: Z-B, A-G, Q-T
    map[0] = 'KeyZ';
    map[1] = 'KeyX';
    map[2] = 'KeyC';
    map[3] = 'KeyV';
    map[4] = 'KeyB';
    map[5] = 'KeyA';
    map[6] = 'KeyS';
    map[7] = 'KeyD';
    map[8] = 'KeyF';
    map[9] = 'KeyG';
    map[10] = 'KeyQ';
    map[11] = 'KeyW';
    map[12] = 'KeyE';
    map[13] = 'KeyR';
    map[14] = 'KeyT';
  } else {
    // 16 Pads (4x4)
    if (preset === 'numpad') {
      map[0] = 'Numpad0';
      map[1] = 'NumpadDecimal';
      map[2] = 'NumpadEnter';
      map[3] = 'NumpadAdd';
      map[4] = 'Numpad1';
      map[5] = 'Numpad2';
      map[6] = 'Numpad3';
      map[7] = 'NumpadSubtract';
      map[8] = 'Numpad4';
      map[9] = 'Numpad5';
      map[10] = 'Numpad6';
      map[11] = 'NumpadMultiply';
      map[12] = 'Numpad7';
      map[13] = 'Numpad8';
      map[14] = 'Numpad9';
      map[15] = 'NumpadDivide';
    } else if (preset === 'compact') {
      map[0] = 'KeyA';
      map[1] = 'KeyS';
      map[2] = 'KeyD';
      map[3] = 'KeyF';
      map[4] = 'KeyG';
      map[5] = 'KeyH';
      map[6] = 'KeyJ';
      map[7] = 'KeyK';
      map[8] = 'KeyQ';
      map[9] = 'KeyW';
      map[10] = 'KeyE';
      map[11] = 'KeyR';
      map[12] = 'KeyT';
      map[13] = 'KeyY';
      map[14] = 'KeyU';
      map[15] = 'KeyI';
    } else {
      // Default QWERTY 4x4
      // Row 1 (Pads 1-4): Z, X, C, V
      map[0] = 'KeyZ';
      map[1] = 'KeyX';
      map[2] = 'KeyC';
      map[3] = 'KeyV';
      // Row 2 (Pads 5-8): A, S, D, F
      map[4] = 'KeyA';
      map[5] = 'KeyS';
      map[6] = 'KeyD';
      map[7] = 'KeyF';
      // Row 3 (Pads 9-12): Q, W, E, R
      map[8] = 'KeyQ';
      map[9] = 'KeyW';
      map[10] = 'KeyE';
      map[11] = 'KeyR';
      // Row 4 (Pads 13-16): 1, 2, 3, 4
      map[12] = 'Digit1';
      map[13] = 'Digit2';
      map[14] = 'Digit3';
      map[15] = 'Digit4';
    }
  }

  return map;
}

export function formatKeyDisplay(code: string): string {
  if (!code) return '';
  if (code.startsWith('Key')) return code.replace('Key', '');
  if (code.startsWith('Digit')) return code.replace('Digit', '');
  if (code.startsWith('Numpad')) {
    const rest = code.replace('Numpad', '');
    if (rest === 'Divide') return 'Num /';
    if (rest === 'Multiply') return 'Num *';
    if (rest === 'Subtract') return 'Num -';
    if (rest === 'Add') return 'Num +';
    if (rest === 'Decimal') return 'Num .';
    if (rest === 'Enter') return 'Num ↵';
    return `N${rest}`;
  }
  if (code === 'Space') return 'Space';
  if (code === 'Enter') return '↵';
  if (code === 'Backspace') return '⌫';
  if (code === 'Tab') return 'Tab';
  return code;
}

export function getGridOrder(gridSize: PadGridSize): number[][] {
  if (gridSize === 9) {
    // 3 rows of 3: Row 3 (6,7,8), Row 2 (3,4,5), Row 1 (0,1,2)
    return [
      [6, 7, 8],
      [3, 4, 5],
      [0, 1, 2],
    ];
  } else if (gridSize === 12) {
    // 3 rows of 4: Row 3 (8..11), Row 2 (4..7), Row 1 (0..3)
    return [
      [8, 9, 10, 11],
      [4, 5, 6, 7],
      [0, 1, 2, 3],
    ];
  } else if (gridSize === 15) {
    // 3 rows of 5: Row 3 (10..14), Row 2 (5..9), Row 1 (0..4)
    return [
      [10, 11, 12, 13, 14],
      [5, 6, 7, 8, 9],
      [0, 1, 2, 3, 4],
    ];
  } else {
    // 16 pads: 4 rows of 4
    return [
      [12, 13, 14, 15],
      [8, 9, 10, 11],
      [4, 5, 6, 7],
      [0, 1, 2, 3],
    ];
  }
}

// Minimal MIDI types for browser compatibility without external type packages
interface MIDIMessageEventLike {
  data: Uint8Array;
}

interface MIDIInputLike {
  name?: string;
  onmidimessage: ((event: MIDIMessageEventLike) => void) | null;
}

interface MIDIAccessLike {
  inputs: {
    values(): IterableIterator<MIDIInputLike>;
  };
  onstatechange: (() => void) | null;
}

// Web MIDI Manager
export class WebMIDIManager {
  private midiAccess: MIDIAccessLike | null = null;
  public connectedDevices: string[] = [];
  public isSupported: boolean = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;

  public async init(onNoteOn: (padIndex: number, velocity: number) => void): Promise<boolean> {
    if (!this.isSupported) return false;

    try {
      const nav = navigator as unknown as { requestMIDIAccess: (opt?: { sysex?: boolean }) => Promise<MIDIAccessLike> };
      this.midiAccess = await nav.requestMIDIAccess({ sysex: false });
      this.updateConnectedDevices();

      // Listen for device connects/disconnects
      this.midiAccess.onstatechange = () => {
        this.updateConnectedDevices();
      };

      // Bind input message listeners
      for (const input of this.midiAccess.inputs.values()) {
        input.onmidimessage = (msg: MIDIMessageEventLike) => {
          this.handleMidiMessage(msg, onNoteOn);
        };
      }

      return true;
    } catch (err) {
      console.warn('Web MIDI access not granted:', err);
      return false;
    }
  }

  private updateConnectedDevices() {
    if (!this.midiAccess) return;
    const names: string[] = [];
    for (const input of this.midiAccess.inputs.values()) {
      if (input.name) names.push(input.name);
    }
    this.connectedDevices = names;
  }

  private handleMidiMessage(
    event: MIDIMessageEventLike,
    onNoteOn: (padIndex: number, velocity: number) => void
  ) {
    const data = event.data;
    if (!data || data.length < 3) return;

    const status = data[0] & 0xf0;
    const note = data[1];
    const rawVelocity = data[2];

    // Note On message (status 0x90) with velocity > 0
    if (status === 0x90 && rawVelocity > 0) {
      let padIndex = note - 36;
      if (padIndex < 0 || padIndex >= 16) {
        padIndex = ((note % 16) + 16) % 16;
      }
      const normVelocity = rawVelocity / 127.0;
      onNoteOn(padIndex, normVelocity);
    }
  }
}

export const webMidiManager = new WebMIDIManager();
