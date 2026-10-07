import React, { useState, useEffect } from 'react';
import { KeyboardSettings, PadGridSize, KeyboardLayoutPreset, PadConfig } from '../types';
import { getDefaultKeyMap, formatKeyDisplay, webMidiManager } from '../audio/keyboardService';
import { Keyboard, Cpu, Check, X, RotateCcw, Sliders, Radio, Music, HelpCircle } from 'lucide-react';

interface KeyboardSettingsModalProps {
  settings: KeyboardSettings;
  onUpdateSettings: (newSettings: KeyboardSettings) => void;
  pads: PadConfig[];
  onTriggerPad: (padId: number, velocity: number) => void;
  onClose: () => void;
}

export const KeyboardSettingsModal: React.FC<KeyboardSettingsModalProps> = ({
  settings,
  onUpdateSettings,
  pads,
  onTriggerPad,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'grid' | 'keys' | 'midi'>('keys');
  const [remappingPadIndex, setRemappingPadIndex] = useState<number | null>(null);
  const [activeTestPad, setActiveTestPad] = useState<number | null>(null);
  const [midiDevices, setMidiDevices] = useState<string[]>(webMidiManager.connectedDevices);

  // Listen for keypress when remapping a pad
  useEffect(() => {
    if (remappingPadIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Don't map Escape (cancel)
      if (e.code === 'Escape') {
        setRemappingPadIndex(null);
        return;
      }

      const updatedKeyMap = {
        ...settings.keyMap,
        [remappingPadIndex]: e.code,
      };

      onUpdateSettings({
        ...settings,
        preset: 'custom',
        keyMap: updatedKeyMap,
      });

      // Flash test
      setActiveTestPad(remappingPadIndex);
      setTimeout(() => setActiveTestPad(null), 300);
      setRemappingPadIndex(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [remappingPadIndex, settings, onUpdateSettings]);

  // Connect MIDI
  const handleConnectMidi = async () => {
    const success = await webMidiManager.init((padIdx, vel) => {
      onTriggerPad(padIdx, vel);
      setActiveTestPad(padIdx);
      setTimeout(() => setActiveTestPad(null), 200);
    });
    if (success) {
      setMidiDevices([...webMidiManager.connectedDevices]);
      onUpdateSettings({
        ...settings,
        midiEnabled: true,
        midiDeviceName: webMidiManager.connectedDevices.join(', ') || 'Connected',
      });
    }
  };

  const handleSelectGridSize = (size: PadGridSize) => {
    const newKeyMap = getDefaultKeyMap(settings.preset, size);
    onUpdateSettings({
      ...settings,
      gridSize: size,
      keyMap: newKeyMap,
    });
  };

  const handleSelectPreset = (preset: KeyboardLayoutPreset) => {
    const newKeyMap = getDefaultKeyMap(preset, settings.gridSize);
    onUpdateSettings({
      ...settings,
      preset,
      keyMap: newKeyMap,
    });
  };

  const handleResetDefaults = () => {
    const defaultMap = getDefaultKeyMap('qwerty', settings.gridSize);
    onUpdateSettings({
      ...settings,
      preset: 'qwerty',
      keyMap: defaultMap,
    });
  };

  const padCount = settings.gridSize;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150">
      <div className="bg-[#14161f] border border-[#272b3b] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#242838]">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="font-bold text-white text-base">KEYBOARD & PAD SETTINGS</h3>
              <p className="text-xs text-slate-400">Configure PC/laptop keyboard, pad grid size & external MIDI</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#1f2230] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center px-4 pt-3 pb-2 gap-2 border-b border-[#1f2330] bg-[#11131a]">
          <button
            onClick={() => setActiveTab('keys')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'keys' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Keyboard Mapping
          </button>
          <button
            onClick={() => setActiveTab('grid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'grid' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pad Grid Size (9 / 12 / 15 / 16)
          </button>
          <button
            onClick={() => setActiveTab('midi')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'midi' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            External MIDI Controllers
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* TAB 1: KEYBOARD MAPPING */}
          {activeTab === 'keys' && (
            <div className="space-y-4">
              {/* Presets & Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#181b26] p-3 rounded-xl border border-[#272b3d]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">LAYOUT:</span>
                  {(['qwerty', 'numpad', 'compact'] as KeyboardLayoutPreset[]).map(preset => (
                    <button
                      key={preset}
                      onClick={() => handleSelectPreset(preset)}
                      className={`px-2.5 py-1 text-xs font-bold rounded capitalize transition-all ${
                        settings.preset === preset
                          ? 'bg-red-600 text-white'
                          : 'bg-[#222736] text-slate-400 hover:text-white'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showKeyLabels}
                      onChange={(e) => onUpdateSettings({ ...settings, showKeyLabels: e.target.checked })}
                      className="accent-red-500 w-4 h-4 rounded cursor-pointer"
                    />
                    <span>Show key badges on pads</span>
                  </label>

                  <button
                    onClick={handleResetDefaults}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white p-1 rounded"
                    title="Reset to default QWERTY mapping"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Remapping helper prompt */}
              {remappingPadIndex !== null && (
                <div className="bg-amber-500/20 border border-amber-500/50 p-2.5 rounded-xl text-center text-xs text-amber-300 font-bold animate-pulse">
                  Press any key on your keyboard to bind Pad {remappingPadIndex + 1} (or Escape to cancel)...
                </div>
              )}

              {/* Interactive Pad Key List */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
                  <span>KEY ASSIGNMENTS ({padCount} PADS):</span>
                  <span className="text-[11px] text-slate-400 font-normal">Click any key badge to rebind</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Array.from({ length: padCount }, (_, idx) => {
                    const pad = pads[idx];
                    const keyCode = settings.keyMap[idx] || '';
                    const displayKey = formatKeyDisplay(keyCode);
                    const isRemapping = remappingPadIndex === idx;
                    const isTesting = activeTestPad === idx;

                    return (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg border transition-all flex items-center justify-between ${
                          isTesting
                            ? 'bg-red-900/60 border-red-500 shadow-md ring-1 ring-red-400'
                            : isRemapping
                            ? 'bg-amber-950/60 border-amber-500 ring-2 ring-amber-400'
                            : 'bg-[#181a24] border-[#252938] hover:bg-[#1f2230]'
                        }`}
                      >
                        <div className="truncate mr-2">
                          <span className="text-[10px] font-mono text-slate-400 block">
                            PAD {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-white truncate block">
                            {pad?.name || `Sound ${idx + 1}`}
                          </span>
                        </div>

                        <button
                          onClick={() => setRemappingPadIndex(idx)}
                          className={`min-w-[36px] px-2 py-1 rounded text-xs font-mono font-bold transition-all ${
                            isRemapping
                              ? 'bg-amber-400 text-black animate-bounce'
                              : 'bg-[#272b3b] hover:bg-slate-700 text-amber-400 border border-slate-700'
                          }`}
                          title="Click to assign new key"
                        >
                          {isRemapping ? '...' : displayKey || '-'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Global Transport Shortcuts Info */}
              <div className="bg-[#11131a] p-3 rounded-xl border border-[#202434] text-xs text-slate-400 space-y-1">
                <span className="font-bold text-slate-300 block mb-1">GLOBAL KEYBOARD SHORTCUTS:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                  <div><span className="text-white font-bold">[Space]</span> Play / Stop</div>
                  <div><span className="text-white font-bold">[R]</span> Record Overdub</div>
                  <div><span className="text-white font-bold">[M]</span> Metronome</div>
                  <div><span className="text-white font-bold">[T]</span> Tap Tempo</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PAD GRID SIZE (9, 12, 15, 16) */}
          {activeTab === 'grid' && (
            <div className="space-y-4">
              <div className="bg-[#181b26] p-3 rounded-xl border border-[#272b3d]">
                <span className="text-xs font-bold text-white block mb-1">SELECT PAD GRID LAYOUT</span>
                <p className="text-xs text-slate-400 mb-3">
                  Choose the number of active performance pads to fit your device screen, controller, or workflow.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { size: 9 as PadGridSize, label: '9 PADS', desc: '3 x 3 Grid', icon: 'Compact' },
                    { size: 12 as PadGridSize, label: '12 PADS', desc: '3 x 4 Grid', icon: 'Vintage SP' },
                    { size: 15 as PadGridSize, label: '15 PADS', desc: '3 x 5 Grid', icon: 'Extended' },
                    { size: 16 as PadGridSize, label: '16 PADS', desc: '4 x 4 Grid', icon: 'MPC Classic' },
                  ].map(option => {
                    const isSelected = settings.gridSize === option.size;
                    return (
                      <button
                        key={option.size}
                        onClick={() => handleSelectGridSize(option.size)}
                        className={`p-3 rounded-xl border text-left transition-all relative ${
                          isSelected
                            ? 'bg-[#222838] border-red-500 shadow-md ring-1 ring-red-500/50'
                            : 'bg-[#151722] border-[#242838] hover:bg-[#1a1e2b] hover:border-slate-600'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-white">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                        <span className="font-extrabold text-sm text-white block">{option.label}</span>
                        <span className="text-xs font-mono text-red-400 block">{option.desc}</span>
                        <span className="text-[10px] text-slate-500 block mt-1">{option.icon}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visual preview of chosen layout */}
              <div className="bg-[#11131a] p-3 rounded-xl border border-[#202434]">
                <span className="text-xs font-bold text-slate-300 block mb-2">
                  GRID PREVIEW ({settings.gridSize} PADS):
                </span>
                <div
                  className="grid gap-1.5 p-2 bg-[#0c0e14] rounded-lg border border-[#1d212e] max-w-sm mx-auto"
                  style={{
                    gridTemplateColumns:
                      settings.gridSize === 9 ? 'repeat(3, minmax(0, 1fr))' :
                      settings.gridSize === 12 ? 'repeat(4, minmax(0, 1fr))' :
                      settings.gridSize === 15 ? 'repeat(5, minmax(0, 1fr))' :
                      'repeat(4, minmax(0, 1fr))',
                  }}
                >
                  {Array.from({ length: settings.gridSize }).map((_, i) => (
                    <div
                      key={i}
                      className="h-10 rounded bg-[#1e2230] border border-[#2c3246] flex flex-col items-center justify-center text-[10px] font-mono text-slate-300 font-bold"
                    >
                      <span>{i + 1}</span>
                      {settings.showKeyLabels && (
                        <span className="text-[8px] text-amber-400">{formatKeyDisplay(settings.keyMap[i])}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EXTERNAL MIDI CONTROLLERS */}
          {activeTab === 'midi' && (
            <div className="space-y-4">
              <div className="bg-[#181b26] p-4 rounded-xl border border-[#272b3d]">
                <div className="flex items-center gap-2 mb-2">
                  <Cpu className="w-5 h-5 text-red-500" />
                  <span className="font-bold text-white text-sm">WEB MIDI CONTROLLER SUPPORT</span>
                </div>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Plug in any external USB or Bluetooth MIDI pad controller (Akai MPD, MPK Mini, Novation Launchpad, Arturia, Korg padKONTROL).
                  DroidMPC Pro automatically receives MIDI velocity-sensitive note messages and maps notes 36–51 to Pads 1–16!
                </p>

                <div className="flex items-center justify-between p-3 bg-[#11131a] rounded-lg border border-[#212536] mb-3">
                  <div>
                    <span className="text-xs font-bold text-white block">HARDWARE STATUS</span>
                    <span className="text-[11px] font-mono text-emerald-400">
                      {midiDevices.length > 0 ? `Connected: ${midiDevices.join(', ')}` : 'No MIDI device detected yet'}
                    </span>
                  </div>

                  <button
                    onClick={handleConnectMidi}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md transition-colors"
                  >
                    Scan MIDI Devices
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#10121a] border-t border-[#222636] flex justify-between items-center">
          <span className="text-xs text-slate-500">
            {settings.gridSize} Pads · {settings.preset.toUpperCase()} Map
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition-colors"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
