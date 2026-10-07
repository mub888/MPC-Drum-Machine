import React from 'react';
import { SoundKit } from '../types';
import { audioEngine } from '../audio/engine';
import { Music, Check, X, Play } from 'lucide-react';

interface KitBrowserModalProps {
  kits: SoundKit[];
  currentKitId: string;
  onSelectKit: (kit: SoundKit) => void;
  onClose: () => void;
}

export const KitBrowserModal: React.FC<KitBrowserModalProps> = ({
  kits,
  currentKitId,
  onSelectKit,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150">
      <div className="bg-[#14161f] border border-[#272b3b] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#242838]">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-white text-base">SOUND KIT LIBRARY</h3>
              <p className="text-xs text-slate-400">Select a sound bank or preset kit</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#1f2230] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Kits List */}
        <div className="p-4 space-y-2.5 overflow-y-auto flex-1">
          {kits.map((kit) => {
            const isSelected = kit.id === currentKitId;
            return (
              <div
                key={kit.id}
                onClick={() => {
                  onSelectKit(kit);
                  onClose();
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-[#1e2333] border-amber-500/80 shadow-md ring-1 ring-amber-500/40'
                    : 'bg-[#181a24] border-[#262b3a] hover:bg-[#1d202d] hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-white">{kit.name}</span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#282d3e] text-amber-400">
                      {kit.genre}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {kit.bpm} BPM
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {kit.description}
                  </p>
                </div>

                <div className="shrink-0 ml-3">
                  {isSelected ? (
                    <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-black font-bold">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Audition kick & snare from kit
                        const kickPad = kit.pads[0];
                        if (kickPad) audioEngine.triggerPad(kickPad, 0.9);
                      }}
                      className="p-2 rounded-lg bg-[#222738] hover:bg-[#2b3147] text-slate-300"
                      title="Preview Kick"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#10121a] border-t border-[#222636] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
