import React, { useEffect, useRef, useState } from 'react';
import { Play, Square, Circle, Volume2, Music2, Download, Save, Mic, RotateCcw, Keyboard } from 'lucide-react';
import { audioEngine } from '../audio/engine';

interface TopTransportProps {
  bpm: number;
  setBpm: (bpm: number) => void;
  swing: number;
  setSwing: (swing: number) => void;
  isPlaying: boolean;
  isRecording: boolean;
  onPlayToggle: () => void;
  onRecordToggle: () => void;
  onStop: () => void;
  metronome: boolean;
  setMetronome: (val: boolean) => void;
  currentStep: number;
  currentBar: number;
  currentBeat: number;
  currentKitName: string;
  onOpenKitBrowser: () => void;
  onOpenExportModal: () => void;
  onOpenKeyboardSettings: () => void;
  masterVolume: number;
  setMasterVolume: (vol: number) => void;
}

export const TopTransport: React.FC<TopTransportProps> = ({
  bpm,
  setBpm,
  swing,
  setSwing,
  isPlaying,
  isRecording,
  onPlayToggle,
  onRecordToggle,
  onStop,
  metronome,
  setMetronome,
  currentStep,
  currentBar,
  currentBeat,
  currentKitName,
  onOpenKitBrowser,
  onOpenExportModal,
  onOpenKeyboardSettings,
  masterVolume,
  setMasterVolume,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [isEditingBpm, setIsEditingBpm] = useState(false);
  const [tempBpm, setTempBpm] = useState(bpm.toString());

  // Oscilloscope visualization on LCD screen
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(128);

    const render = () => {
      animId = requestAnimationFrame(render);
      if (!audioEngine.analyser) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      audioEngine.analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = 'rgba(15, 23, 20, 0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#34d399'; // Retro phosphor cyan/emerald
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#10b981';

      ctx.beginPath();
      const sliceWidth = (canvas.width * 1.0) / 128;
      let x = 0;

      for (let i = 0; i < 128; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.stroke();
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  // Tap Tempo calculation
  const handleTapTempo = () => {
    const now = performance.now();
    const newTaps = [...tapTimes, now].filter(t => now - t < 3000).slice(-4);
    setTapTimes(newTaps);

    if (newTaps.length >= 2) {
      const intervals = [];
      for (let i = 1; i < newTaps.length; i++) {
        intervals.push(newTaps[i] - newTaps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      if (calculatedBpm >= 40 && calculatedBpm <= 240) {
        setBpm(calculatedBpm);
        setTempBpm(calculatedBpm.toString());
      }
    }
  };

  const handleBpmSubmit = () => {
    const val = parseInt(tempBpm, 10);
    if (!isNaN(val) && val >= 40 && val <= 240) {
      setBpm(val);
    } else {
      setTempBpm(bpm.toString());
    }
    setIsEditingBpm(false);
  };

  return (
    <header className="bg-[#14151a] border-b border-[#242731] px-2.5 sm:px-4 py-2 select-none shadow-md">
      {/* Top Main Row */}
      <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
        {/* Brand & Kit Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center font-black text-[11px] text-white tracking-tighter shadow-sm">
              MPC
            </div>
            <span className="font-bold text-sm sm:text-base tracking-tight text-white hidden xs:inline">
              Droid<span className="text-red-500">PRO</span>
            </span>
          </div>

          {/* Current Sound Kit trigger */}
          <button
            onClick={onOpenKitBrowser}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#1f222b] hover:bg-[#282c38] border border-[#2f3442] text-xs text-slate-200 transition-colors active:scale-95"
            title="Browse Drum Kits"
          >
            <Music2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate max-w-[90px] sm:max-w-[130px] font-medium">{currentKitName}</span>
          </button>
        </div>

        {/* Central MPC Retro LCD Screen */}
        <div className="flex items-center bg-[#0d1411] border border-[#1d3326] rounded-md px-2 sm:px-3 py-1 shadow-inner overflow-hidden">
          {/* LCD Data Readout */}
          <div className="flex items-center gap-2 sm:gap-4 font-mono text-[11px] sm:text-xs text-emerald-400">
            {/* Position Display */}
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-emerald-700 font-sans uppercase tracking-wider font-semibold">POS</span>
              <span className="font-bold tabular-nums">
                {String(currentBar).padStart(2, '0')}:{String(currentBeat).padStart(2, '0')}:{String((currentStep % 4) + 1).padStart(2, '0')}
              </span>
            </div>

            {/* Tempo readout */}
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-emerald-700 font-sans uppercase tracking-wider font-semibold">BPM</span>
              {isEditingBpm ? (
                <input
                  type="number"
                  min="40"
                  max="240"
                  value={tempBpm}
                  onChange={(e) => setTempBpm(e.target.value)}
                  onBlur={handleBpmSubmit}
                  onKeyDown={(e) => e.key === 'Enter' && handleBpmSubmit()}
                  autoFocus
                  className="w-12 bg-black text-emerald-300 text-center font-bold outline-none rounded"
                />
              ) : (
                <span
                  onClick={() => setIsEditingBpm(true)}
                  className="font-bold tabular-nums cursor-pointer hover:underline"
                  title="Click to edit BPM"
                >
                  {bpm}
                </span>
              )}
            </div>

            {/* Swing readout */}
            <div className="flex flex-col items-center hidden sm:flex">
              <span className="text-[9px] text-emerald-700 font-sans uppercase tracking-wider font-semibold">SWING</span>
              <span className="font-bold tabular-nums">{swing}%</span>
            </div>

            {/* Mini Oscilloscope */}
            <div className="relative w-16 sm:w-24 h-6 bg-[#07100b] rounded overflow-hidden border border-emerald-950/60 hidden xs:block">
              <canvas ref={canvasRef} width={96} height={24} className="w-full h-full" />
            </div>
          </div>
        </div>

        {/* Transport & Primary Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Keyboard / Controller settings button */}
          <button
            onClick={onOpenKeyboardSettings}
            className="px-2 py-1.5 rounded bg-[#1e222c] hover:bg-[#2b303e] border border-[#2e3444] text-[11px] font-semibold text-amber-300 hover:text-amber-200 active:scale-95 transition-all flex items-center gap-1"
            title="Laptop/PC Keyboard & External Pad Settings"
          >
            <Keyboard className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">KEYS</span>
          </button>

          {/* Tap Tempo Button */}
          <button
            onClick={handleTapTempo}
            className="px-2 py-1.5 rounded bg-[#1e222c] hover:bg-[#2b303e] border border-[#2e3444] text-[11px] font-semibold text-slate-300 active:scale-95 transition-all active:bg-amber-500 active:text-black hidden sm:block"
          >
            TAP
          </button>

          {/* Metronome toggle */}
          <button
            onClick={() => setMetronome(!metronome)}
            className={`px-2 py-1.5 rounded text-[11px] font-semibold border transition-all active:scale-95 flex items-center gap-1 ${
              metronome
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20'
                : 'bg-[#1e222c] text-slate-400 border-[#2e3444] hover:text-slate-200'
            }`}
            title="Metronome Click"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${metronome ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
            <span className="hidden md:inline">METRO</span>
          </button>

          {/* Transport Buttons: REC, PLAY, STOP */}
          <div className="flex items-center bg-[#0d0e12] p-0.5 rounded-md border border-[#232631]">
            {/* Record / Overdub */}
            <button
              onClick={onRecordToggle}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded transition-all active:scale-90 flex items-center justify-center ${
                isRecording
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/40 animate-pulse'
                  : 'text-red-500/80 hover:text-red-400 hover:bg-white/5'
              }`}
              title="Record / Overdub (Notes recorded onto pattern)"
            >
              <Circle className="w-4 h-4 fill-current" />
            </button>

            {/* Play */}
            <button
              onClick={onPlayToggle}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded transition-all active:scale-90 flex items-center justify-center ${
                isPlaying
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/40'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-white/5'
              }`}
              title="Play / Pause"
            >
              <Play className="w-4 h-4 fill-current" />
            </button>

            {/* Stop */}
            <button
              onClick={onStop}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-white/5 active:scale-90 transition-all"
              title="Stop"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          </div>

          {/* Export / Share WAV */}
          <button
            onClick={onOpenExportModal}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs transition-all shadow-sm active:scale-95 shrink-0"
            title="Export WAV / Save Project"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>
    </header>
  );
};
