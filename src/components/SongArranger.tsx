import React, { useState } from 'react';
import { SongBlock, Pattern, AudioStemClip } from '../types';
import { audioEngine } from '../audio/engine';
import { Plus, Trash2, Copy, Play, Square, Mic, Layers, Music, ChevronRight } from 'lucide-react';

interface SongArrangerProps {
  songBlocks: SongBlock[];
  setSongBlocks: (blocks: SongBlock[]) => void;
  patterns: Pattern[];
  currentPatternId: string;
  setCurrentPatternId: (id: string) => void;
  audioStems: AudioStemClip[];
  setAudioStems: (stems: AudioStemClip[]) => void;
  isPlaying: boolean;
  onPlaySong: () => void;
  onStop: () => void;
}

export const SongArranger: React.FC<SongArrangerProps> = ({
  songBlocks,
  setSongBlocks,
  patterns,
  currentPatternId,
  setCurrentPatternId,
  audioStems,
  setAudioStems,
  isPlaying,
  onPlaySong,
  onStop,
}) => {
  const [isRecordingVocalStem, setIsRecordingVocalStem] = useState(false);

  const patternMap = new Map<string, Pattern>();
  patterns.forEach(p => patternMap.set(p.id, p));

  const handleAddBlock = (patternId: string) => {
    const pat = patternMap.get(patternId) || patterns[0];
    const newBlock: SongBlock = {
      id: `block-${Date.now()}`,
      patternId: pat.id,
      repeats: 2,
      name: `${pat.name} (Part ${songBlocks.length + 1})`,
    };
    setSongBlocks([...songBlocks, newBlock]);
  };

  const handleRemoveBlock = (blockId: string) => {
    setSongBlocks(songBlocks.filter(b => b.id !== blockId));
  };

  const handleUpdateRepeats = (blockId: string, delta: number) => {
    setSongBlocks(
      songBlocks.map(b => {
        if (b.id === blockId) {
          const next = Math.max(1, Math.min(16, b.repeats + delta));
          return { ...b, repeats: next };
        }
        return b;
      })
    );
  };

  // Record live vocal stem on timeline
  const handleToggleVocalRecord = async () => {
    if (!isRecordingVocalStem) {
      try {
        await audioEngine.startMicRecording();
        setIsRecordingVocalStem(true);
        // Also start playback so user can sing/rap over the beat
        if (!isPlaying) onPlaySong();
      } catch {
        alert('Could not access microphone for stem recording.');
      }
    } else {
      setIsRecordingVocalStem(false);
      const buffer = await audioEngine.stopMicRecording();
      if (isPlaying) onStop();

      if (buffer) {
        const newStem: AudioStemClip = {
          id: `stem-${Date.now()}`,
          name: `Vocal Take ${audioStems.length + 1}`,
          startBar: 1,
          durationBars: 4,
          audioBuffer: buffer,
          volume: 0.9,
          pan: 0,
          isMuted: false,
          color: '#ec4899',
        };
        setAudioStems([...audioStems, newStem]);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#101217] rounded-xl border border-[#21242e] p-3 text-slate-200 select-none overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1f222b]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-rose-500" />
          <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
            SONG TIMELINE & AUDIO STEMS
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Record Vocal Stem */}
          <button
            onClick={handleToggleVocalRecord}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
              isRecordingVocalStem
                ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-600/40'
                : 'bg-[#1b1f2b] text-rose-400 hover:bg-[#232838] border border-rose-500/30'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{isRecordingVocalStem ? 'STOP RECORDING' : 'RECORD VOCAL STEM'}</span>
          </button>
        </div>
      </div>

      {/* Song Arrangement Blocks Grid */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-300 font-mono">
            SEQUENCE TIMELINE CHAIN:
          </span>
          <span className="text-[11px] text-slate-400">
            Total Blocks: {songBlocks.length}
          </span>
        </div>

        {songBlocks.length === 0 ? (
          <div className="bg-[#14161f] border border-dashed border-[#282d3d] rounded-xl p-6 text-center">
            <Music className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400 mb-3">No sequence blocks added to the song yet.</p>
            <button
              onClick={() => handleAddBlock(patterns[0]?.id || '')}
              className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md transition-colors"
            >
              Add First Pattern to Song
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {songBlocks.map((block, idx) => {
              const pat = patternMap.get(block.patternId) || patterns[0];
              return (
                <div
                  key={block.id}
                  className="flex items-center justify-between gap-2 p-2.5 bg-[#161822] hover:bg-[#1a1d29] rounded-lg border border-[#242838] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-red-500 w-5">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-white leading-tight">
                        {block.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {pat?.length || 16} Steps / 1 Bar · Pattern: {pat?.name}
                      </div>
                    </div>
                  </div>

                  {/* Repeats Counter */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-[#0e1015] rounded border border-[#242836] p-0.5 font-mono text-xs">
                      <button
                        onClick={() => handleUpdateRepeats(block.id, -1)}
                        className="px-2 py-0.5 text-slate-400 hover:text-white"
                      >
                        -
                      </button>
                      <span className="px-2 font-bold text-white">{block.repeats}x</span>
                      <button
                        onClick={() => handleUpdateRepeats(block.id, 1)}
                        className="px-2 py-0.5 text-slate-400 hover:text-white"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemoveBlock(block.id)}
                      className="p-1.5 rounded bg-transparent hover:bg-rose-950 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Remove Block"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => handleAddBlock(patterns[0]?.id || '')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1c202c] hover:bg-[#252a3b] text-xs font-bold text-slate-200 border border-[#2c3244]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Next Pattern Block</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Audio Stems / Vocal Takes Section */}
      <div className="pt-3 border-t border-[#1f222b]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-300 font-mono">
            VOCAL & AUDIO STEM TRACKS ({audioStems.length})
          </span>
          <span className="text-[11px] text-slate-400">
            Recorded audio synced with beat
          </span>
        </div>

        {audioStems.length === 0 ? (
          <div className="bg-[#14161f] rounded-lg p-3 text-center border border-[#202432]">
            <p className="text-xs text-slate-500">
              No audio stems recorded yet. Tap "RECORD VOCAL STEM" to record your live voice or instrument over the drum beat!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {audioStems.map((stem) => (
              <div
                key={stem.id}
                className="flex items-center justify-between p-2.5 bg-[#171924] rounded-lg border border-[#262b3a]"
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-pink-500" />
                  <div>
                    <div className="text-xs font-bold text-white">{stem.name}</div>
                    <div className="text-[10px] font-mono text-slate-400">
                      Duration: {stem.audioBuffer ? `${stem.audioBuffer.duration.toFixed(1)}s` : '0s'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (stem.audioBuffer && audioEngine.ctx) {
                        const src = audioEngine.ctx.createBufferSource();
                        src.buffer = stem.audioBuffer;
                        src.connect(audioEngine.masterGain || audioEngine.ctx.destination);
                        src.start();
                      }
                    }}
                    className="px-2.5 py-1 rounded bg-[#202534] hover:bg-[#2c3348] text-xs font-semibold text-slate-200"
                  >
                    Play Take
                  </button>
                  <button
                    onClick={() => setAudioStems(audioStems.filter(s => s.id !== stem.id))}
                    className="p-1 rounded text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
