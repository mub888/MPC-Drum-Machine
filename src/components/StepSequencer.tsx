import React, { useState } from 'react';
import { Pattern, PadConfig, TrackSequence, StepEvent } from '../types';
import { audioEngine } from '../audio/engine';
import { Trash2, Shuffle, Copy, Check, SlidersHorizontal, Volume2, VolumeX } from 'lucide-react';

interface StepSequencerProps {
  pattern: Pattern;
  pads: PadConfig[];
  currentStep: number;
  onUpdatePattern: (updatedPattern: Pattern) => void;
  selectedPadId: number;
  setSelectedPadId: (id: number) => void;
  onTogglePadMute: (padId: number) => void;
}

export const StepSequencer: React.FC<StepSequencerProps> = ({
  pattern,
  pads,
  currentStep,
  onUpdatePattern,
  selectedPadId,
  setSelectedPadId,
  onTogglePadMute,
}) => {
  const [selectedTrackPadId, setSelectedTrackPadId] = useState<number>(selectedPadId % 16);
  const [showVelocityEditor, setShowVelocityEditor] = useState<boolean>(false);
  const [copiedTrack, setCopiedTrack] = useState<TrackSequence | null>(null);

  // Sync selected track if pad selection changes outside
  React.useEffect(() => {
    setSelectedTrackPadId(selectedPadId % 16);
  }, [selectedPadId]);

  const patternLength = pattern.length || 16;
  const padMap = new Map<number, PadConfig>();
  pads.slice(0, 16).forEach(p => padMap.set(p.id, p));

  const currentTrack = pattern.tracks[selectedTrackPadId] || {
    padId: selectedTrackPadId,
    steps: Array.from({ length: patternLength }, () => ({ active: false, velocity: 0.8 })),
  };

  const handleToggleStep = (padId: number, stepIndex: number) => {
    const existingTrack = pattern.tracks[padId] || {
      padId,
      steps: Array.from({ length: patternLength }, () => ({ active: false, velocity: 0.8 })),
    };

    const newSteps = [...existingTrack.steps];
    while (newSteps.length < patternLength) {
      newSteps.push({ active: false, velocity: 0.8 });
    }

    const currentActive = newSteps[stepIndex]?.active ?? false;
    newSteps[stepIndex] = {
      ...newSteps[stepIndex],
      active: !currentActive,
      velocity: !currentActive ? 0.9 : 0,
    };

    const updatedPattern: Pattern = {
      ...pattern,
      tracks: {
        ...pattern.tracks,
        [padId]: {
          ...existingTrack,
          steps: newSteps,
        },
      },
    };

    onUpdatePattern(updatedPattern);

    // If activating step, trigger preview sound
    if (!currentActive) {
      const pad = padMap.get(padId);
      if (pad) {
        audioEngine.triggerPad(pad, 0.85);
      }
    }
  };

  const handleVelocityChange = (stepIndex: number, velocity: number) => {
    const newSteps = [...currentTrack.steps];
    newSteps[stepIndex] = {
      ...newSteps[stepIndex],
      velocity,
      active: velocity > 0,
    };

    onUpdatePattern({
      ...pattern,
      tracks: {
        ...pattern.tracks,
        [selectedTrackPadId]: {
          ...currentTrack,
          steps: newSteps,
        },
      },
    });
  };

  const handleClearTrack = (padId: number) => {
    const newSteps = Array.from({ length: patternLength }, () => ({ active: false, velocity: 0.8 }));
    onUpdatePattern({
      ...pattern,
      tracks: {
        ...pattern.tracks,
        [padId]: { padId, steps: newSteps },
      },
    });
  };

  const handleFillTrack = (padId: number, interval: 2 | 4) => {
    const newSteps = Array.from({ length: patternLength }, (_, i) => ({
      active: i % interval === 0,
      velocity: i % 4 === 0 ? 0.95 : 0.75,
    }));
    onUpdatePattern({
      ...pattern,
      tracks: {
        ...pattern.tracks,
        [padId]: { padId, steps: newSteps },
      },
    });
  };

  const handleRandomizeTrack = (padId: number) => {
    const newSteps = Array.from({ length: patternLength }, () => ({
      active: Math.random() > 0.65,
      velocity: 0.5 + Math.random() * 0.5,
    }));
    onUpdatePattern({
      ...pattern,
      tracks: {
        ...pattern.tracks,
        [padId]: { padId, steps: newSteps },
      },
    });
  };

  const handleCopyTrack = (padId: number) => {
    const track = pattern.tracks[padId];
    if (track) setCopiedTrack(track);
  };

  const handlePasteTrack = (padId: number) => {
    if (!copiedTrack) return;
    onUpdatePattern({
      ...pattern,
      tracks: {
        ...pattern.tracks,
        [padId]: { padId, steps: [...copiedTrack.steps] },
      },
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#101217] rounded-xl border border-[#21242e] p-2 sm:p-3 text-slate-200 select-none overflow-hidden">
      {/* Top Sequencer Controls */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#1f222b] overflow-x-auto no-scrollbar">
        {/* Pattern length toggle & selected track banner */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs uppercase tracking-wider text-slate-300">
            SEQUENCE: <span className="text-white">{pattern.name}</span>
          </span>

          <div className="flex items-center bg-[#171920] p-0.5 rounded border border-[#272a36] text-[11px] font-mono">
            <button
              onClick={() => onUpdatePattern({ ...pattern, length: 16 })}
              className={`px-2 py-0.5 rounded ${patternLength === 16 ? 'bg-red-600 text-white font-bold' : 'text-slate-400'}`}
            >
              16 STEPS
            </button>
            <button
              onClick={() => onUpdatePattern({ ...pattern, length: 32 })}
              className={`px-2 py-0.5 rounded ${patternLength === 32 ? 'bg-red-600 text-white font-bold' : 'text-slate-400'}`}
            >
              32 STEPS
            </button>
          </div>
        </div>

        {/* Selected track action shortcuts */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowVelocityEditor(!showVelocityEditor)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border transition-all ${
              showVelocityEditor
                ? 'bg-amber-500 text-black border-amber-400 font-bold'
                : 'bg-[#181a22] text-slate-300 border-[#282d39] hover:bg-[#20232c]'
            }`}
            title="Toggle Velocity Sliders"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span className="hidden sm:inline">Velocity</span>
          </button>

          <button
            onClick={() => handleFillTrack(selectedTrackPadId, 2)}
            className="px-2 py-1 rounded bg-[#181a22] hover:bg-[#20232c] text-xs font-semibold text-slate-300 border border-[#282d39]"
            title="Fill 8th notes"
          >
            Fill 1/8
          </button>

          <button
            onClick={() => handleRandomizeTrack(selectedTrackPadId)}
            className="p-1.5 rounded bg-[#181a22] hover:bg-[#20232c] text-slate-300 border border-[#282d39]"
            title="Randomize groove"
          >
            <Shuffle className="w-3 h-3" />
          </button>

          <button
            onClick={() => handleClearTrack(selectedTrackPadId)}
            className="p-1.5 rounded bg-[#181a22] hover:bg-rose-950/80 text-rose-400 border border-[#282d39]"
            title="Clear track steps"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Multi-Track Step Grid */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
        {Array.from({ length: 16 }, (_, padId) => {
          const pad = padMap.get(padId);
          const track = pattern.tracks[padId] || {
            padId,
            steps: Array.from({ length: patternLength }, () => ({ active: false, velocity: 0.8 })),
          };
          const isSelected = selectedTrackPadId === padId;

          return (
            <div
              key={padId}
              className={`flex items-center gap-1.5 p-1 rounded-lg transition-colors ${
                isSelected ? 'bg-[#1a1d26] ring-1 ring-slate-600' : 'bg-[#13151b] hover:bg-[#161821]'
              }`}
            >
              {/* Track Label & Pad Trigger */}
              <div
                onClick={() => {
                  setSelectedTrackPadId(padId);
                  setSelectedPadId(padId);
                  if (pad) audioEngine.triggerPad(pad, 0.9);
                }}
                className="w-24 sm:w-32 shrink-0 flex items-center justify-between px-2 py-1.5 rounded bg-[#1d202a] hover:bg-[#242836] cursor-pointer border border-[#2b303e] text-left"
              >
                <div className="truncate">
                  <div className="text-[11px] font-bold text-white truncate leading-tight">
                    {pad?.name || `Pad ${padId + 1}`}
                  </div>
                  <div className="text-[9px] font-mono text-slate-400 uppercase">
                    A{String(padId + 1).padStart(2, '0')}
                  </div>
                </div>

                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0 ml-1"
                  style={{ backgroundColor: pad?.color || '#ef4444' }}
                />
              </div>

              {/* Steps (16 or 32 steps) */}
              <div className="flex items-center gap-0.5 sm:gap-1 flex-1 overflow-x-auto no-scrollbar py-0.5">
                {Array.from({ length: patternLength }, (_, s) => {
                  const step = track.steps[s] || { active: false, velocity: 0.8 };
                  const isCurrent = currentStep === s;
                  const isBeatQuarter = s % 4 === 0;

                  return (
                    <button
                      key={s}
                      onClick={() => handleToggleStep(padId, s)}
                      className={`h-7 sm:h-9 flex-1 min-w-[16px] sm:min-w-[20px] rounded transition-all active:scale-90 flex items-center justify-center relative ${
                        step.active
                          ? 'shadow-sm brightness-110'
                          : isBeatQuarter
                          ? 'bg-[#232733] hover:bg-[#2b3040]'
                          : 'bg-[#181a22] hover:bg-[#20232c]'
                      } ${
                        isCurrent ? 'ring-2 ring-white ring-offset-1 ring-offset-black z-10' : ''
                      }`}
                      style={{
                        backgroundColor: step.active ? (pad?.color || '#ef4444') : undefined,
                        opacity: step.active ? Math.max(0.4, step.velocity) : 1,
                      }}
                    >
                      {/* Quarter note tick dot */}
                      {isBeatQuarter && !step.active && (
                        <span className="w-1 h-1 rounded-full bg-slate-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Velocity Editor Drawer for Selected Track */}
      {showVelocityEditor && (
        <div className="mt-2 pt-2 border-t border-[#1f222b] bg-[#14161e] p-2 rounded-lg">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 mb-1.5">
            <span className="font-bold text-amber-400">
              STEP VELOCITY: {padMap.get(selectedTrackPadId)?.name}
            </span>
            <span className="text-slate-400">Drag to adjust hit dynamic (0 - 127)</span>
          </div>

          <div className="flex items-end gap-1 h-16 bg-[#0c0e12] p-1.5 rounded border border-[#212532]">
            {Array.from({ length: patternLength }, (_, s) => {
              const step = currentTrack.steps[s] || { active: false, velocity: 0.8 };
              const vel = step.active ? step.velocity : 0;
              const isCurrent = currentStep === s;

              return (
                <div key={s} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={vel}
                    onChange={(e) => handleVelocityChange(s, parseFloat(e.target.value))}
                    className="w-full accent-amber-500 h-full opacity-0 cursor-pointer absolute z-20"
                  />
                  <div
                    className={`w-full rounded-t transition-all ${
                      step.active ? 'bg-amber-500 group-hover:bg-amber-400' : 'bg-slate-800'
                    } ${isCurrent ? 'brightness-150' : ''}`}
                    style={{ height: `${Math.round(vel * 100)}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
