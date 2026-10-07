import React, { useState } from 'react';
import { MasterEffectsConfig, PadConfig } from '../types';
import { audioEngine } from '../audio/engine';
import { XYPerformancePad } from './XYPerformancePad';
import { Sliders, Disc, Sparkles, Volume2, Activity, Radio } from 'lucide-react';

interface MixerRackProps {
  effects: MasterEffectsConfig;
  setEffects: (cfg: MasterEffectsConfig) => void;
  pads: PadConfig[];
  onUpdatePad: (pad: PadConfig) => void;
  onTogglePadMute: (padId: number) => void;
  onTogglePadSolo: (padId: number) => void;
}

export const MixerRack: React.FC<MixerRackProps> = ({
  effects,
  setEffects,
  pads,
  onUpdatePad,
  onTogglePadMute,
  onTogglePadSolo,
}) => {
  const [activeTab, setActiveTab] = useState<'channels' | 'effects' | 'xypad'>('channels');

  const updateEffects = (changes: Partial<MasterEffectsConfig>) => {
    const updated = { ...effects, ...changes };
    setEffects(updated);
    audioEngine.updateEffects(updated);
  };

  return (
    <div className="flex flex-col h-full bg-[#111319] rounded-xl border border-[#21242e] p-2 sm:p-3 text-slate-200 select-none overflow-hidden">
      {/* Top Navigation Tabs */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1f222b] overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 bg-[#171922] p-0.5 rounded-lg border border-[#282d3b]">
          <button
            onClick={() => setActiveTab('channels')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${
              activeTab === 'channels'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>MIXER CHANNELS</span>
          </button>

          <button
            onClick={() => setActiveTab('effects')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${
              activeTab === 'effects'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Disc className="w-3.5 h-3.5" />
            <span>STUDIO FX RACK</span>
          </button>

          <button
            onClick={() => setActiveTab('xypad')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${
              activeTab === 'xypad'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>XY TOUCH FX</span>
          </button>
        </div>

        {/* Vintage MPC Converter Mode (Roger Linn Heritage) */}
        <div className="flex items-center gap-1 bg-[#171922] p-1 rounded-lg border border-[#282d3b]">
          <span className="text-[10px] font-mono text-slate-400 font-bold px-1 hidden sm:inline">
            MPC ENGINE:
          </span>
          {(['clean', 'mpc60', 'mpc3000'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => updateEffects({ vintageMode: mode })}
              className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded transition-colors uppercase ${
                effects.vintageMode === mode
                  ? 'bg-amber-500 text-black shadow-sm font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {mode === 'clean' ? '24-BIT' : mode === 'mpc60' ? 'MPC 60' : 'MPC 3K'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Channels Strips */}
      {activeTab === 'channels' && (
        <div className="flex-1 overflow-x-auto overflow-y-hidden flex gap-2 pb-1 pr-2">
          {pads.slice(0, 16).map((pad) => {
            const vol = pad.volume ?? 1.0;
            const pan = pad.pan ?? 0;

            return (
              <div
                key={pad.id}
                className="w-18 sm:w-20 shrink-0 bg-[#161821] rounded-xl border border-[#232733] p-2 flex flex-col justify-between items-center shadow-sm"
              >
                {/* Track Header */}
                <div className="w-full text-center mb-1">
                  <div
                    className="w-full h-1 rounded-full mb-1"
                    style={{ backgroundColor: pad.color || '#ef4444' }}
                  />
                  <div className="text-[11px] font-bold text-white truncate px-0.5">
                    {pad.name}
                  </div>
                  <div className="text-[9px] font-mono text-slate-400">
                    A{String(pad.id + 1).padStart(2, '0')}
                  </div>
                </div>

                {/* Pan Mini Knob / Slider */}
                <div className="w-full text-center my-1">
                  <span className="text-[9px] font-mono text-slate-400 block">
                    {pan === 0 ? 'C' : pan < 0 ? `L${Math.abs(Math.round(pan * 100))}` : `R${Math.round(pan * 100)}`}
                  </span>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.05"
                    value={pan}
                    onChange={(e) => onUpdatePad({ ...pad, pan: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400 h-1 bg-slate-700 rounded cursor-pointer"
                  />
                </div>

                {/* Vertical Volume Fader */}
                <div className="flex-1 flex items-center justify-center py-2 relative my-1">
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={vol}
                    onChange={(e) => onUpdatePad({ ...pad, volume: parseFloat(e.target.value) })}
                    className="h-28 accent-red-500 cursor-pointer -rotate-90 origin-center w-28 bg-slate-800 rounded"
                  />
                </div>

                <div className="text-[10px] font-mono text-slate-300 font-bold mb-1">
                  {Math.round(vol * 100)}%
                </div>

                {/* Mute and Solo Buttons */}
                <div className="flex items-center gap-1 w-full">
                  <button
                    onClick={() => onTogglePadMute(pad.id)}
                    className={`flex-1 py-1 text-[10px] font-bold rounded ${
                      pad.isMuted
                        ? 'bg-rose-600 text-white'
                        : 'bg-[#212532] text-slate-400 hover:text-white'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => onTogglePadSolo(pad.id)}
                    className={`flex-1 py-1 text-[10px] font-bold rounded ${
                      pad.isSolo
                        ? 'bg-amber-500 text-black font-extrabold'
                        : 'bg-[#212532] text-slate-400 hover:text-white'
                    }`}
                  >
                    S
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Studio FX Rack (Parametric EQ, Filter, Delay, Reverb, Compressor) */}
      {activeTab === 'effects' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {/* Master Resonant Filter */}
          <div className="bg-[#161821] p-3 rounded-xl border border-[#242836]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-red-500" />
                <span>MASTER RESONANT FILTER</span>
              </span>

              <div className="flex items-center gap-1 bg-[#111319] p-0.5 rounded text-[10px] font-mono">
                {(['lowpass', 'bandpass', 'highpass'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => updateEffects({ filterType: t })}
                    className={`px-2 py-0.5 rounded uppercase ${
                      effects.filterType === t ? 'bg-red-600 text-white font-bold' : 'text-slate-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                  <span>CUTOFF</span>
                  <span className="text-red-400">{Math.round(effects.filterCutoff)} Hz</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="20000"
                  step="10"
                  value={effects.filterCutoff}
                  onChange={(e) => updateEffects({ filterCutoff: parseFloat(e.target.value) })}
                  className="w-full accent-red-500 h-1.5 bg-slate-700 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                  <span>RESONANCE (Q)</span>
                  <span className="text-red-400">{effects.filterResonance.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="12"
                  step="0.1"
                  value={effects.filterResonance}
                  onChange={(e) => updateEffects({ filterResonance: parseFloat(e.target.value) })}
                  className="w-full accent-red-500 h-1.5 bg-slate-700 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 3-Band Parametric EQ */}
          <div className="bg-[#161821] p-3 rounded-xl border border-[#242836]">
            <span className="text-xs font-bold text-white block mb-2">3-BAND MASTER EQ</span>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                  <span>LOW (100Hz)</span>
                  <span className="text-amber-400">{effects.eqLow > 0 ? `+${effects.eqLow}` : effects.eqLow} dB</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={effects.eqLow}
                  onChange={(e) => updateEffects({ eqLow: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500 h-1.5 bg-slate-700 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                  <span>MID (1kHz)</span>
                  <span className="text-amber-400">{effects.eqMid > 0 ? `+${effects.eqMid}` : effects.eqMid} dB</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={effects.eqMid}
                  onChange={(e) => updateEffects({ eqMid: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500 h-1.5 bg-slate-700 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                  <span>HIGH (7kHz)</span>
                  <span className="text-amber-400">{effects.eqHigh > 0 ? `+${effects.eqHigh}` : effects.eqHigh} dB</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={effects.eqHigh}
                  onChange={(e) => updateEffects({ eqHigh: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500 h-1.5 bg-slate-700 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Delay & Reverb Dual Rack */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Delay */}
            <div className="bg-[#161821] p-3 rounded-xl border border-[#242836]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white">STEREO DELAY</span>
                <input
                  type="checkbox"
                  checked={effects.delayEnabled}
                  onChange={(e) => updateEffects({ delayEnabled: e.target.checked })}
                  className="accent-cyan-500 w-4 h-4 cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                    <span>TIME</span>
                    <span className="text-cyan-400">{Math.round(effects.delayTime * 1000)}ms</span>
                  </div>
                  <input
                    type="range"
                    min="0.08"
                    max="0.8"
                    step="0.02"
                    value={effects.delayTime}
                    onChange={(e) => updateEffects({ delayTime: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-500 h-1.5 bg-slate-700 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                    <span>MIX</span>
                    <span className="text-cyan-400">{Math.round(effects.delayMix * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={effects.delayMix}
                    onChange={(e) => updateEffects({ delayMix: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-500 h-1.5 bg-slate-700 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Reverb */}
            <div className="bg-[#161821] p-3 rounded-xl border border-[#242836]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white">STUDIO REVERB</span>
                <input
                  type="checkbox"
                  checked={effects.reverbEnabled}
                  onChange={(e) => updateEffects({ reverbEnabled: e.target.checked })}
                  className="accent-purple-500 w-4 h-4 cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                    <span>DECAY</span>
                    <span className="text-purple-400">{effects.reverbDecay.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="4.0"
                    step="0.1"
                    value={effects.reverbDecay}
                    onChange={(e) => updateEffects({ reverbDecay: parseFloat(e.target.value) })}
                    className="w-full accent-purple-500 h-1.5 bg-slate-700 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                    <span>WET MIX</span>
                    <span className="text-purple-400">{Math.round(effects.reverbMix * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.8"
                    step="0.05"
                    value={effects.reverbMix}
                    onChange={(e) => updateEffects({ reverbMix: parseFloat(e.target.value) })}
                    className="w-full accent-purple-500 h-1.5 bg-slate-700 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Interactive XY Pad */}
      {activeTab === 'xypad' && (
        <div className="flex-1 flex flex-col justify-center">
          <XYPerformancePad />
        </div>
      )}
    </div>
  );
};
