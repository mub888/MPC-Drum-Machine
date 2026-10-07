import React, { useRef, useState, useEffect } from 'react';
import { audioEngine } from '../audio/engine';
import { Sparkles, Lock, Unlock } from 'lucide-react';

export const XYPerformancePad: React.FC = () => {
  const padRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 0.8, y: 0.0 });
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isLatched, setIsLatched] = useState<boolean>(false);

  const updateFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rawX = (e.clientX - rect.left) / rect.width;
    const rawY = 1.0 - (e.clientY - rect.top) / rect.height; // Inverted Y: bottom 0, top 1

    const x = Math.max(0, Math.min(1, rawX));
    const y = Math.max(0, Math.min(1, rawY));

    setCoords({ x, y });
    audioEngine.setXYModulation(x, y, true);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    audioEngine.initAudio();
    setIsActive(true);
    updateFromPointer(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isActive) {
      updateFromPointer(e);
    }
  };

  const handlePointerUp = () => {
    if (!isLatched) {
      setIsActive(false);
      setCoords({ x: 0.8, y: 0.0 });
      audioEngine.setXYModulation(0.8, 0.0, false);
    }
  };

  return (
    <div className="flex flex-col bg-[#14161f] rounded-xl border border-[#242836] p-3 text-slate-200 shadow-lg select-none">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#222533]">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            XY FX TOUCH PAD
          </span>
        </div>

        <button
          onClick={() => {
            const next = !isLatched;
            setIsLatched(next);
            if (!next && !isActive) {
              audioEngine.setXYModulation(0.8, 0.0, false);
            }
          }}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${
            isLatched
              ? 'bg-cyan-600 text-white border-cyan-400'
              : 'bg-[#1b1e28] text-slate-400 border-[#282d3b]'
          }`}
          title="Latch position when released"
        >
          {isLatched ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          <span>{isLatched ? 'LATCH ON' : 'MOMENTARY'}</span>
        </button>
      </div>

      {/* Touch Surface Area */}
      <div
        ref={padRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="relative w-full h-44 sm:h-52 bg-[#090b0e] rounded-lg border border-[#1e2330] overflow-hidden cursor-crosshair touch-none shadow-inner"
      >
        {/* Grid lines */}
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none opacity-20">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="border border-cyan-500/30" />
          ))}
        </div>

        {/* Labels on edges */}
        <span className="absolute bottom-1 left-2 text-[10px] font-mono text-cyan-400/80 pointer-events-none">
          X: FILTER CUTOFF
        </span>
        <span className="absolute top-2 left-2 text-[10px] font-mono text-amber-400/80 pointer-events-none">
          Y: BEAT STUTTER & DELAY
        </span>

        {/* Cursor Reticle */}
        <div
          className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-2 border-cyan-400 pointer-events-none flex items-center justify-center transition-transform"
          style={{
            left: `${coords.x * 100}%`,
            top: `${(1 - coords.y) * 100}%`,
            backgroundColor: isActive ? 'rgba(6, 182, 212, 0.35)' : 'rgba(6, 182, 212, 0.1)',
            boxShadow: isActive ? '0 0 16px rgba(6, 182, 212, 0.8)' : 'none',
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2 px-1">
        <span>CUTOFF: {Math.round(coords.x * 100)}%</span>
        <span>REPEAT: {Math.round(coords.y * 100)}%</span>
      </div>
    </div>
  );
};
