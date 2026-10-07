import React, { useState, useEffect, useRef } from 'react';
import { PadConfig, PadBank } from '../types';
import { audioEngine } from '../audio/engine';
import {
  Mic,
  Square,
  Play,
  RotateCcw,
  Scissors,
  Upload,
  Volume2,
  Maximize2,
  ArrowRight,
  Sliders,
  Check
} from 'lucide-react';

interface SamplerEditorProps {
  pad: PadConfig;
  onUpdatePad: (updatedPad: PadConfig) => void;
  onChopToPads: (slices: AudioBuffer[]) => void;
  onClose: () => void;
}

export const SamplerEditor: React.FC<SamplerEditorProps> = ({
  pad,
  onUpdatePad,
  onChopToPads,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlayingAudition, setIsPlayingAudition] = useState(false);
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [sliceCount, setSliceCount] = useState<4 | 8 | 16>(8);
  const [trimStart, setTrimStart] = useState(pad.trimStart ?? 0);
  const [trimEnd, setTrimEnd] = useState(pad.trimEnd ?? 1);
  const [pitch, setPitch] = useState(pad.pitch ?? 0);
  const [volume, setVolume] = useState(pad.volume ?? 1.0);
  const [pan, setPan] = useState(pad.pan ?? 0);
  const [loop, setLoop] = useState(pad.loop ?? false);
  const [sampleName, setSampleName] = useState(pad.sampleName);
  const [chopSuccessMsg, setChopSuccessMsg] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const auditionSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Sync state if pad changes
  useEffect(() => {
    setTrimStart(pad.trimStart ?? 0);
    setTrimEnd(pad.trimEnd ?? 1);
    setPitch(pad.pitch ?? 0);
    setVolume(pad.volume ?? 1.0);
    setPan(pad.pan ?? 0);
    setLoop(pad.loop ?? false);
    setSampleName(pad.sampleName);
  }, [pad]);

  // Draw AudioBuffer Waveform on Canvas with Trim Markers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pad.audioBuffer) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const buffer = pad.audioBuffer;
    const channelData = buffer.getChannelData(0);
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Background grid
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, width, height);

    // Center guideline
    ctx.strokeStyle = '#1e2433';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Waveform rendering
    const step = Math.ceil(channelData.length / width);
    const amp = height / 2;

    ctx.fillStyle = '#38bdf8'; // Sky blue waveform

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = channelData[i * step + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }

      // Dim out areas outside trim markers
      const normalizedPos = i / width;
      const isInsideTrim = normalizedPos >= trimStart && normalizedPos <= trimEnd;
      ctx.fillStyle = isInsideTrim ? '#38bdf8' : '#334155';

      const y1 = Math.max(0, (1 + min) * amp);
      const y2 = Math.min(height, (1 + max) * amp);
      ctx.fillRect(i, y1, 1, Math.max(1, y2 - y1));
    }

    // Draw Trim Start marker
    const startX = trimStart * width;
    ctx.strokeStyle = '#10b981'; // Green
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(startX, height);
    ctx.stroke();

    // Draw Trim End marker
    const endX = trimEnd * width;
    ctx.strokeStyle = '#ef4444'; // Red
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(endX, 0);
    ctx.lineTo(endX, height);
    ctx.stroke();

    // Slice vertical tick marks if previewing
    const sliceStep = (trimEnd - trimStart) / sliceCount;
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    for (let s = 1; s < sliceCount; s++) {
      const sliceX = (trimStart + s * sliceStep) * width;
      ctx.beginPath();
      ctx.moveTo(sliceX, 0);
      ctx.lineTo(sliceX, height);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }, [pad.audioBuffer, trimStart, trimEnd, sliceCount]);

  // Audition playback
  const handleAudition = async () => {
    await audioEngine.initAudio();
    if (!audioEngine.ctx || !pad.audioBuffer) return;

    if (isPlayingAudition) {
      if (auditionSourceRef.current) {
        auditionSourceRef.current.stop();
        auditionSourceRef.current = null;
      }
      setIsPlayingAudition(false);
      return;
    }

    const src = audioEngine.ctx.createBufferSource();
    src.buffer = pad.audioBuffer;
    src.playbackRate.value = Math.pow(2, pitch / 12);

    const gain = audioEngine.ctx.createGain();
    gain.gain.value = volume;

    src.connect(gain);
    gain.connect(audioEngine.masterBus || audioEngine.ctx.destination);

    const dur = pad.audioBuffer.duration;
    const offset = Math.max(0, trimStart * dur);
    const length = Math.max(0.01, (trimEnd - trimStart) * dur);

    src.start(0, offset, length);
    auditionSourceRef.current = src;
    setIsPlayingAudition(true);

    src.onended = () => {
      setIsPlayingAudition(false);
    };
  };

  // Mic Recording
  const handleMicToggle = async () => {
    if (!isRecordingMic) {
      try {
        await audioEngine.startMicRecording();
        setIsRecordingMic(true);
      } catch {
        alert('Microphone access was denied or is unavailable on this device.');
      }
    } else {
      setIsRecordingMic(false);
      const newBuffer = await audioEngine.stopMicRecording();
      if (newBuffer) {
        const updated: PadConfig = {
          ...pad,
          audioBuffer: newBuffer,
          sampleName: `Mic_Rec_${Date.now().toString().slice(-4)}.wav`,
          trimStart: 0,
          trimEnd: 1,
        };
        onUpdatePad(updated);
      }
    }
  };

  // File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await audioEngine.decodeAudioFile(file);
      const updated: PadConfig = {
        ...pad,
        audioBuffer: buffer,
        sampleName: file.name,
        trimStart: 0,
        trimEnd: 1,
      };
      onUpdatePad(updated);
    } catch {
      alert('Could not decode audio file. Please try a standard WAV, MP3, or M4A file.');
    }
  };

  // Normalize audio buffer to peak 0dB
  const handleNormalize = () => {
    if (!pad.audioBuffer || !audioEngine.ctx) return;
    const buffer = pad.audioBuffer;
    let maxPeak = 0;
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < data.length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > maxPeak) maxPeak = abs;
      }
    }

    if (maxPeak === 0 || maxPeak >= 0.99) return;
    const factor = 0.98 / maxPeak;

    const newBuffer = audioEngine.ctx.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );

    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const src = buffer.getChannelData(c);
      const dest = newBuffer.getChannelData(c);
      for (let i = 0; i < src.length; i++) {
        dest[i] = src[i] * factor;
      }
    }

    onUpdatePad({ ...pad, audioBuffer: newBuffer });
  };

  // Reverse audio buffer
  const handleReverse = () => {
    if (!pad.audioBuffer || !audioEngine.ctx) return;
    const buffer = pad.audioBuffer;
    const newBuffer = audioEngine.ctx.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );

    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const src = buffer.getChannelData(c);
      const dest = newBuffer.getChannelData(c);
      for (let i = 0; i < src.length; i++) {
        dest[i] = src[src.length - 1 - i];
      }
    }

    onUpdatePad({ ...pad, audioBuffer: newBuffer, reverse: !pad.reverse });
  };

  // Slice & Chop to Pads (Iconic MPC workflow)
  const handleChop = () => {
    if (!pad.audioBuffer || !audioEngine.ctx) return;
    const buffer = pad.audioBuffer;
    const dur = buffer.duration;
    const startSec = trimStart * dur;
    const endSec = trimEnd * dur;
    const regionDur = endSec - startSec;
    const sliceDur = regionDur / sliceCount;

    const slices: AudioBuffer[] = [];

    for (let s = 0; s < sliceCount; s++) {
      const sStart = Math.floor((startSec + s * sliceDur) * buffer.sampleRate);
      const sEnd = Math.floor((startSec + (s + 1) * sliceDur) * buffer.sampleRate);
      const sliceLength = Math.max(1, sEnd - sStart);

      const sliceBuffer = audioEngine.ctx.createBuffer(
        buffer.numberOfChannels,
        sliceLength,
        buffer.sampleRate
      );

      for (let c = 0; c < buffer.numberOfChannels; c++) {
        const srcData = buffer.getChannelData(c);
        const destData = sliceBuffer.getChannelData(c);
        for (let i = 0; i < sliceLength; i++) {
          destData[i] = srcData[sStart + i] || 0;
        }
      }

      slices.push(sliceBuffer);
    }

    onChopToPads(slices);
    setChopSuccessMsg(true);
    setTimeout(() => setChopSuccessMsg(false), 2400);
  };

  // Save current pad settings
  const handleSaveParams = () => {
    onUpdatePad({
      ...pad,
      trimStart,
      trimEnd,
      pitch,
      volume,
      pan,
      loop,
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#12141a] rounded-xl border border-[#232733] p-3 sm:p-4 text-slate-200 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#232733] mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3.5 h-3.5 rounded-full"
            style={{ backgroundColor: pad.color || '#3b82f6' }}
          />
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>SAMPLER & WAVEFORM</span>
              <span className="text-xs font-mono text-slate-400 font-normal">
                [{pad.bank}{pad.id + 1}: {pad.name}]
              </span>
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">{sampleName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="audio/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#1e222c] hover:bg-[#282d3b] text-xs font-semibold text-slate-300 border border-[#2c3242] transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import</span>
          </button>

          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
          >
            Back to Pads
          </button>
        </div>
      </div>

      {/* Waveform Canvas Viewport */}
      <div className="relative w-full h-36 sm:h-48 bg-[#0a0c10] rounded-lg border border-[#1f2430] overflow-hidden mb-3">
        <canvas
          ref={canvasRef}
          width={800}
          height={200}
          className="w-full h-full cursor-crosshair"
        />

        {/* Live status badge */}
        {isRecordingMic && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 bg-red-600/90 text-white font-mono text-xs rounded-full animate-pulse shadow-md">
            <span className="w-2 h-2 rounded-full bg-white" />
            <span>RECORDING LIVE MIC...</span>
          </div>
        )}

        {chopSuccessMsg && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white font-semibold text-xs rounded shadow-lg animate-bounce">
            <Check className="w-3.5 h-3.5" />
            <span>Chopped {sliceCount} slices to Bank A!</span>
          </div>
        )}
      </div>

      {/* Waveform Scrub & Trim Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 bg-[#181a22] p-3 rounded-lg border border-[#262a36]">
        <div>
          <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
            <span className="text-emerald-400 font-bold">START TRIM</span>
            <span>{Math.round(trimStart * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="0.95"
            step="0.005"
            value={trimStart}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (val < trimEnd) {
                setTrimStart(val);
                onUpdatePad({ ...pad, trimStart: val });
              }
            }}
            className="w-full accent-emerald-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
            <span className="text-rose-400 font-bold">END TRIM</span>
            <span>{Math.round(trimEnd * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="1"
            step="0.005"
            value={trimEnd}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (val > trimStart) {
                setTrimEnd(val);
                onUpdatePad({ ...pad, trimEnd: val });
              }
            }}
            className="w-full accent-rose-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Primary Action Buttons: Audition Play, Record Mic, Chop Slices */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Audition Play */}
        <button
          onClick={handleAudition}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs transition-all active:scale-95 shadow-md ${
            isPlayingAudition
              ? 'bg-amber-500 text-black shadow-amber-500/30'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
          }`}
        >
          {isPlayingAudition ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          <span>{isPlayingAudition ? 'STOP' : 'TEST SAMPLE'}</span>
        </button>

        {/* Record Mic */}
        <button
          onClick={handleMicToggle}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs transition-all active:scale-95 shadow-md ${
            isRecordingMic
              ? 'bg-red-600 text-white animate-pulse shadow-red-600/40'
              : 'bg-[#222631] hover:bg-[#2b303e] text-red-400 border border-red-500/30'
          }`}
        >
          <Mic className="w-4 h-4" />
          <span>{isRecordingMic ? 'STOP RECORDING' : 'RECORD MIC'}</span>
        </button>

        {/* Audio Processing Tools: Normalize, Reverse */}
        <button
          onClick={handleNormalize}
          className="px-3 py-2 rounded-lg bg-[#1f222b] hover:bg-[#282d38] text-xs font-semibold text-slate-300 border border-[#2b303e]"
          title="Normalize to 0dB Peak"
        >
          Normalize
        </button>

        <button
          onClick={handleReverse}
          className="px-3 py-2 rounded-lg bg-[#1f222b] hover:bg-[#282d38] text-xs font-semibold text-slate-300 border border-[#2b303e]"
          title="Reverse Sample Audio"
        >
          Reverse
        </button>

        {/* CHOP TO PADS (Akai MPC Signature feature) */}
        <div className="flex items-center gap-1.5 ml-auto bg-[#1b1e27] p-1 rounded-lg border border-[#2a2f3e]">
          <span className="text-[11px] font-mono text-slate-400 font-semibold px-1">SLICES:</span>
          {([4, 8, 16] as const).map(num => (
            <button
              key={num}
              onClick={() => setSliceCount(num)}
              className={`px-2 py-1 text-xs font-bold rounded ${
                sliceCount === num ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleChop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-xs shadow-md transition-all active:scale-95"
            title="Split slices across Bank A pads"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>CHOP TO PADS</span>
          </button>
        </div>
      </div>

      {/* Fine-Tuning Controls: Pitch Transpose, Volume, Pan */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 bg-[#161820] p-3 rounded-lg border border-[#242733]">
        {/* Pitch */}
        <div>
          <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
            <span>PITCH</span>
            <span className="text-amber-400 tabular-nums">{pitch > 0 ? `+${pitch}` : pitch} semitones</span>
          </div>
          <input
            type="range"
            min="-24"
            max="24"
            step="1"
            value={pitch}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setPitch(val);
              onUpdatePad({ ...pad, pitch: val });
            }}
            className="w-full accent-amber-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
          />
        </div>

        {/* Volume */}
        <div>
          <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
            <span>GAIN</span>
            <span className="text-sky-400 tabular-nums">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={volume}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setVolume(val);
              onUpdatePad({ ...pad, volume: val });
            }}
            className="w-full accent-sky-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
          />
        </div>

        {/* Pan */}
        <div>
          <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
            <span>PAN</span>
            <span className="text-purple-400 tabular-nums">
              {pan === 0 ? 'C' : pan < 0 ? `L${Math.abs(Math.round(pan * 100))}` : `R${Math.round(pan * 100)}`}
            </span>
          </div>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.05"
            value={pan}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setPan(val);
              onUpdatePad({ ...pad, pan: val });
            }}
            className="w-full accent-purple-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
