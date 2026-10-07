import React, { useState, useEffect, useRef } from 'react';
import { PadConfig, PadBank, SixteenLevelsMode, KeyboardSettings, PadGridSize } from '../types';
import { audioEngine } from '../audio/engine';
import { formatKeyDisplay, getGridOrder } from '../audio/keyboardService';
import { VolumeX, Volume2, Sparkles, Sliders, Repeat, Layers, Keyboard, LayoutGrid } from 'lucide-react';

interface PadMatrixProps {
  pads: PadConfig[];
  activeBank: PadBank;
  setActiveBank: (bank: PadBank) => void;
  selectedPadId: number;
  setSelectedPadId: (id: number) => void;
  onOpenSampler: (padId: number) => void;
  sixteenLevelsMode: SixteenLevelsMode;
  setSixteenLevelsMode: (mode: SixteenLevelsMode) => void;
  fullLevel: boolean;
  setFullLevel: (val: boolean) => void;
  noteRepeat: boolean;
  setNoteRepeat: (val: boolean) => void;
  noteRepeatRate: number; // e.g. 1/8, 1/16, 1/32
  setNoteRepeatRate: (rate: number) => void;
  padMuteMode: boolean;
  setPadMuteMode: (val: boolean) => void;
  onTogglePadMute: (padId: number) => void;
  onTogglePadSolo: (padId: number) => void;
  keyboardSettings: KeyboardSettings;
  onOpenKeyboardSettings: () => void;
  onSelectGridSize: (size: PadGridSize) => void;
  externalHitPadId?: number | null;
}

export const PadMatrix: React.FC<PadMatrixProps> = ({
  pads,
  activeBank,
  setActiveBank,
  selectedPadId,
  setSelectedPadId,
  onOpenSampler,
  sixteenLevelsMode,
  setSixteenLevelsMode,
  fullLevel,
  setFullLevel,
  noteRepeat,
  setNoteRepeat,
  noteRepeatRate,
  setNoteRepeatRate,
  padMuteMode,
  setPadMuteMode,
  onTogglePadMute,
  onTogglePadSolo,
  keyboardSettings,
  onOpenKeyboardSettings,
  onSelectGridSize,
  externalHitPadId,
}) => {
  // Visual hit flash states: map of padId -> timestamp
  const [activeHits, setActiveHits] = useState<Record<number, number>>({});
  const repeatIntervalRef = useRef<number | null>(null);
  const activeHeldPadRef = useRef<{ pad: PadConfig; velocity: number } | null>(null);

  // Flash when an external keyboard hit occurs
  useEffect(() => {
    if (externalHitPadId !== undefined && externalHitPadId !== null) {
      setActiveHits(prev => ({ ...prev, [externalHitPadId]: Date.now() }));
    }
  }, [externalHitPadId]);

  // Bank pads filtering: Bank A (0-15), B (16-31), C (32-47), D (48-63)
  const bankOffset = activeBank === 'A' ? 0 : activeBank === 'B' ? 16 : activeBank === 'C' ? 32 : 48;
  const currentBankPads = pads.slice(bankOffset, bankOffset + 16);

  // Handle Note Repeat loop
  useEffect(() => {
    if (!noteRepeat) {
      if (repeatIntervalRef.current) {
        window.clearInterval(repeatIntervalRef.current);
        repeatIntervalRef.current = null;
      }
      activeHeldPadRef.current = null;
      return;
    }

    // Interval in ms based on tempo and repeat rate
    // noteRepeatRate: 8 = 1/8 note, 16 = 1/16 note, 32 = 1/32 note
    const intervalMs = (60000 / audioEngine.bpm) * (4 / noteRepeatRate);

    if (repeatIntervalRef.current) {
      window.clearInterval(repeatIntervalRef.current);
    }

    repeatIntervalRef.current = window.setInterval(() => {
      const held = activeHeldPadRef.current;
      if (held && noteRepeat) {
        triggerPadAction(held.pad, held.velocity, false);
      }
    }, intervalMs);

    return () => {
      if (repeatIntervalRef.current) {
        window.clearInterval(repeatIntervalRef.current);
      }
    };
  }, [noteRepeat, noteRepeatRate]);

  // Flash decay
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setActiveHits(prev => {
        let changed = false;
        const next = { ...prev };
        for (const [k, v] of Object.entries(next)) {
          if (now - v > 140) {
            delete next[Number(k)];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 40);
    return () => clearInterval(timer);
  }, []);

  const triggerPadAction = (pad: PadConfig, inputVelocity: number = 1.0, isInitial: boolean = true) => {
    // If in Pad Mute mode, toggle mute instead of sounding
    if (padMuteMode) {
      onTogglePadMute(pad.id);
      return;
    }

    let finalVelocity = fullLevel ? 1.0 : inputVelocity;
    let pitchOffset = 0;

    // 16 Levels modulation
    if (sixteenLevelsMode === 'velocity') {
      const idx = pad.id % 16;
      finalVelocity = (idx + 1) / 16;
    } else if (sixteenLevelsMode === 'tune') {
      const idx = pad.id % 16;
      pitchOffset = idx - 12;
    }

    // Trigger in engine
    audioEngine.triggerPad(pad, finalVelocity, pitchOffset);

    // Visual feedback
    setActiveHits(prev => ({ ...prev, [pad.id]: Date.now() }));
    setSelectedPadId(pad.id);

    if (isInitial && noteRepeat) {
      activeHeldPadRef.current = { pad, velocity: finalVelocity };
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>, pad: PadConfig) => {
    e.preventDefault();
    audioEngine.initAudio();

    // Calculate velocity based on vertical touch position
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = (e.clientY - rect.top) / rect.height;
    let vel = 0.55 + relativeY * 0.45;
    if (fullLevel) vel = 1.0;

    triggerPadAction(pad, vel, true);
  };

  const handlePointerUp = (pad: PadConfig) => {
    if (activeHeldPadRef.current?.pad.id === pad.id) {
      activeHeldPadRef.current = null;
    }
  };

  const gridSize = keyboardSettings.gridSize;
  const gridRows = getGridOrder(gridSize);

  // Dynamic grid style
  const gridClass =
    gridSize === 9
      ? 'grid-cols-3 grid-rows-3'
      : gridSize === 12
      ? 'grid-cols-4 grid-rows-3'
      : gridSize === 15
      ? 'grid-cols-5 grid-rows-3'
      : 'grid-cols-4 grid-rows-4';

  return (
    <div className="flex flex-col h-full bg-[#101115] p-2 sm:p-3 rounded-lg border border-[#21242e] shadow-xl select-none">
      {/* MPC Bank and Performance Toolbar */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-2 pb-2 border-b border-[#1f222b] overflow-x-auto no-scrollbar">
        {/* Bank Selectors (A, B, C, D) */}
        <div className="flex items-center bg-[#171920] p-0.5 rounded-lg border border-[#2a2d39] shrink-0">
          {(['A', 'B', 'C', 'D'] as PadBank[]).map(bank => {
            const isActive = activeBank === bank;
            return (
              <button
                key={bank}
                onClick={() => setActiveBank(bank)}
                className={`px-2.5 sm:px-3 py-1 text-xs font-bold rounded transition-all ${
                  isActive
                    ? 'bg-gradient-to-b from-red-600 to-rose-700 text-white shadow-md shadow-red-900/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {bank}
              </button>
            );
          })}
        </div>

        {/* Pad Grid Size Selectors (9, 12, 15, 16) */}
        <div className="flex items-center bg-[#171920] p-0.5 rounded-lg border border-[#2a2d39] shrink-0">
          {([9, 12, 15, 16] as PadGridSize[]).map(size => {
            const isSelected = gridSize === size;
            return (
              <button
                key={size}
                onClick={() => onSelectGridSize(size)}
                className={`px-2 py-1 text-[11px] font-mono font-bold rounded transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-black shadow-sm font-extrabold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={`Switch to ${size} pads layout`}
              >
                {size}P
              </button>
            );
          })}
        </div>

        {/* MPC Hardware Buttons: FULL LEVEL, 16 LEVELS, NOTE REPEAT, PAD MUTE, KEYBOARD SETTING */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Keyboard / PC setting button */}
          <button
            onClick={onOpenKeyboardSettings}
            className={`px-2 py-1 text-[11px] font-bold rounded border transition-all whitespace-nowrap active:scale-95 flex items-center gap-1 ${
              keyboardSettings.enabled
                ? 'bg-[#1e2332] text-amber-300 border-amber-500/40 hover:bg-[#252b3d]'
                : 'bg-[#181a22] text-slate-400 border-[#282c38] hover:text-slate-200'
            }`}
            title="Configure PC/Laptop Keyboard & MIDI Settings"
          >
            <Keyboard className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline">KEYS</span>
          </button>

          {/* Full Level */}
          <button
            onClick={() => setFullLevel(!fullLevel)}
            className={`px-2 py-1 text-[11px] font-bold rounded border transition-all whitespace-nowrap active:scale-95 ${
              fullLevel
                ? 'bg-amber-500 text-black border-amber-400 font-extrabold shadow-sm shadow-amber-500/30'
                : 'bg-[#181a22] text-slate-400 border-[#282c38] hover:text-slate-200'
            }`}
            title="Full Level (127 velocity on all hits)"
          >
            FULL LVL
          </button>

          {/* 16 Levels */}
          <button
            onClick={() => {
              if (sixteenLevelsMode === 'none') setSixteenLevelsMode('tune');
              else if (sixteenLevelsMode === 'tune') setSixteenLevelsMode('velocity');
              else setSixteenLevelsMode('none');
            }}
            className={`px-2 py-1 text-[11px] font-bold rounded border transition-all whitespace-nowrap active:scale-95 ${
              sixteenLevelsMode !== 'none'
                ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-600/30'
                : 'bg-[#181a22] text-slate-400 border-[#282c38] hover:text-slate-200'
            }`}
            title="16 Levels Mode (Spread Tune or Velocity across pads)"
          >
            16 LVL
          </button>

          {/* Note Repeat */}
          <div className="flex items-center bg-[#181a22] rounded border border-[#282c38] p-0.5">
            <button
              onClick={() => setNoteRepeat(!noteRepeat)}
              className={`px-2 py-1 text-[11px] font-bold rounded transition-all whitespace-nowrap flex items-center gap-1 ${
                noteRepeat
                  ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Note Repeat (Hold pad to repeat hits)"
            >
              <Repeat className="w-3 h-3" />
              <span className="hidden sm:inline">REPEAT</span>
            </button>
            {noteRepeat && (
              <select
                value={noteRepeatRate}
                onChange={(e) => setNoteRepeatRate(Number(e.target.value))}
                className="bg-black/60 text-cyan-300 text-[10px] font-bold rounded px-1 py-0.5 ml-1 outline-none border border-cyan-800"
              >
                <option value={8}>1/8</option>
                <option value={16}>1/16</option>
                <option value={32}>1/32</option>
                <option value={64}>1/64</option>
              </select>
            )}
          </div>

          {/* Pad Mute */}
          <button
            onClick={() => setPadMuteMode(!padMuteMode)}
            className={`px-2 py-1 text-[11px] font-bold rounded border transition-all whitespace-nowrap active:scale-95 flex items-center gap-1 ${
              padMuteMode
                ? 'bg-rose-600 text-white border-rose-400 shadow-sm shadow-rose-600/30'
                : 'bg-[#181a22] text-slate-400 border-[#282c38] hover:text-slate-200'
            }`}
            title="Pad Mute Mode (Tap pads to mute/unmute)"
          >
            <VolumeX className="w-3 h-3" />
            <span className="hidden sm:inline">MUTE</span>
          </button>
        </div>
      </div>

      {/* Grid of MPC Pads (Configurable: 9, 12, 15, or 16 Pads) */}
      <div className={`grid ${gridClass} gap-2 sm:gap-2.5 flex-1 min-h-[320px] max-h-[580px] touch-none`}>
        {gridRows.flatMap((row) =>
          row.map((padIndex) => {
            const pad = currentBankPads[padIndex] || pads[padIndex];
            if (!pad) return null;

            const isHit = Boolean(activeHits[pad.id]);
            const isSelected = selectedPadId === pad.id;
            const displayNum = padIndex + 1;
            const keyLabel = keyboardSettings.showKeyLabels
              ? formatKeyDisplay(keyboardSettings.keyMap[padIndex])
              : null;

            return (
              <button
                key={pad.id}
                onPointerDown={(e) => handlePointerDown(e, pad)}
                onPointerUp={() => handlePointerUp(pad)}
                onPointerLeave={() => handlePointerUp(pad)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onOpenSampler(pad.id);
                }}
                className={`relative rounded-xl p-2 flex flex-col justify-between text-left transition-all overflow-hidden cursor-pointer select-none active:scale-[0.97] ${
                  isHit
                    ? 'bg-gradient-to-b from-[#3a3f4e] to-[#252933] shadow-inner brightness-125'
                    : isSelected
                    ? 'bg-[#222631] border-2 border-red-500/80 shadow-md'
                    : 'bg-[#1a1c24] border border-[#2e3342] hover:border-slate-500/50 hover:bg-[#20232c] shadow-sm'
                }`}
                style={{
                  boxShadow: isHit
                    ? `0 0 18px ${pad.color || '#ef4444'}, inset 0 2px 4px rgba(255,255,255,0.2)`
                    : undefined,
                }}
              >
                {/* Pad Active Glow Light Bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 transition-opacity"
                  style={{
                    backgroundColor: pad.color || '#ef4444',
                    opacity: isHit ? 1 : 0.45,
                    boxShadow: isHit ? `0 0 10px ${pad.color}` : 'none',
                  }}
                />

                {/* Top Pad Header: Number & Bank + Keyboard Shortcut Badge */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] sm:text-xs font-bold text-slate-400">
                      {activeBank}{String(displayNum).padStart(2, '0')}
                    </span>

                    {/* Keyboard Key Hint Badge */}
                    {keyLabel && (
                      <span className="px-1.5 py-0.2 rounded bg-black/60 border border-slate-700/80 text-[10px] font-mono font-bold text-amber-300 shadow-sm">
                        {keyLabel}
                      </span>
                    )}
                  </div>

                  {/* Mute Indicator or Category Dot */}
                  {pad.isMuted ? (
                    <span className="text-[9px] font-bold text-rose-400 uppercase bg-rose-950/80 px-1 rounded">
                      MUTED
                    </span>
                  ) : (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: pad.color || '#64748b' }}
                    />
                  )}
                </div>

                {/* Pad Center: Sound Name */}
                <div className="my-auto w-full">
                  <div className="text-xs sm:text-sm font-bold text-white tracking-tight truncate leading-tight">
                    {sixteenLevelsMode === 'tune'
                      ? `${padIndex - 12 > 0 ? '+' : ''}${padIndex - 12} Semi`
                      : pad.name}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider truncate">
                    {pad.category}
                  </div>
                </div>

                {/* Bottom Row: Quick Waveform Trigger / Velocity */}
                <div className="flex items-center justify-between w-full pt-1 border-t border-white/5 text-[9px] text-slate-400">
                  <span className="font-mono tabular-nums">
                    {sixteenLevelsMode === 'velocity'
                      ? `VEL ${Math.round(((padIndex + 1) / 16) * 127)}`
                      : `VOL ${Math.round((pad.volume ?? 1) * 100)}%`}
                  </span>

                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSampler(pad.id);
                    }}
                    className="hover:text-amber-400 text-slate-500 cursor-pointer font-sans"
                    title="Edit in Waveform Sampler"
                  >
                    CHOP
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
