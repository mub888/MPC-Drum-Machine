/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PadConfig,
  PadBank,
  SixteenLevelsMode,
  Pattern,
  SongBlock,
  AudioStemClip,
  MasterEffectsConfig,
  ProjectState,
  SoundKit
} from './types';
import { audioEngine } from './audio/engine';
import { createSoundKits } from './audio/sampleLibrary';
import { createTrapPattern, createBoomBapPattern, createHousePattern, createEmptyPattern } from './audio/defaultPatterns';
import { TopTransport } from './components/TopTransport';
import { PadMatrix } from './components/PadMatrix';
import { StepSequencer } from './components/StepSequencer';
import { SamplerEditor } from './components/SamplerEditor';
import { MixerRack } from './components/MixerRack';
import { SongArranger } from './components/SongArranger';
import { KitBrowserModal } from './components/KitBrowserModal';
import { ExportModal } from './components/ExportModal';
import { Grid, Sliders, Music, Disc, Layers, Mic } from 'lucide-react';

export default function App() {
  // App views
  type ViewMode = 'pads' | 'steps' | 'sampler' | 'mixer' | 'song';
  const [activeView, setActiveView] = useState<ViewMode>('pads');

  // Kits & Audio initialization
  const [kits, setKits] = useState<SoundKit[]>([]);
  const [currentKitId, setCurrentKitId] = useState<string>('kit-trap-808');
  const [pads, setPads] = useState<PadConfig[]>([]);

  // Project state
  const [bpm, setBpm] = useState<number>(140);
  const [swing, setSwing] = useState<number>(54);
  const [activeBank, setActiveBank] = useState<PadBank>('A');
  const [selectedPadId, setSelectedPadId] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [metronome, setMetronome] = useState<boolean>(false);

  // Pad performance modes
  const [sixteenLevelsMode, setSixteenLevelsMode] = useState<SixteenLevelsMode>('none');
  const [fullLevel, setFullLevel] = useState<boolean>(false);
  const [noteRepeat, setNoteRepeat] = useState<boolean>(false);
  const [noteRepeatRate, setNoteRepeatRate] = useState<number>(16);
  const [padMuteMode, setPadMuteMode] = useState<boolean>(false);

  // Sequencer & Patterns
  const [patterns, setPatterns] = useState<Pattern[]>([createTrapPattern()]);
  const [currentPatternId, setCurrentPatternId] = useState<string>('pat-trap-1');
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [currentBar, setCurrentBar] = useState<number>(1);
  const [currentBeat, setCurrentBeat] = useState<number>(1);

  // Song mode blocks & audio stems
  const [songBlocks, setSongBlocks] = useState<SongBlock[]>([
    { id: 'sb-1', patternId: 'pat-trap-1', repeats: 4, name: 'Intro & Drop' },
  ]);
  const [audioStems, setAudioStems] = useState<AudioStemClip[]>([]);

  // Master Effects
  const [effects, setEffects] = useState<MasterEffectsConfig>({
    vintageMode: 'clean',
    filterType: 'lowpass',
    filterCutoff: 20000,
    filterResonance: 1.0,
    delayEnabled: false,
    delayTime: 0.25,
    delayFeedback: 0.35,
    delayMix: 0.25,
    reverbEnabled: false,
    reverbDecay: 1.8,
    reverbMix: 0.25,
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
    compressorThreshold: -6,
    compressorRatio: 3,
    masterVolume: 1.0,
  });

  // Modals
  const [isKitBrowserOpen, setIsKitBrowserOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Initialize Audio & Sound Kits on startup
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        const ctx = await audioEngine.initAudio();
        const loadedKits = createSoundKits(ctx);
        if (!isMounted) return;
        setKits(loadedKits);
        const defaultKit = loadedKits[0];
        if (defaultKit) {
          setPads(defaultKit.pads);
          setBpm(defaultKit.bpm);
        }
      } catch (err) {
        console.warn('AudioContext autoplay policy: waiting for user gesture', err);
      }
    };

    init();
    return () => { isMounted = false; };
  }, []);

  // Sync Audio Engine values
  useEffect(() => {
    audioEngine.bpm = bpm;
  }, [bpm]);

  useEffect(() => {
    audioEngine.swing = swing;
  }, [swing]);

  useEffect(() => {
    audioEngine.metronomeEnabled = metronome;
  }, [metronome]);

  // Sync active pattern to audio engine
  const activePattern = useMemo(() => {
    return patterns.find(p => p.id === currentPatternId) || patterns[0];
  }, [patterns, currentPatternId]);

  useEffect(() => {
    if (activePattern && pads.length > 0) {
      audioEngine.setPattern(activePattern, pads);
    }
  }, [activePattern, pads]);

  // Sequencer Clock sync callbacks
  useEffect(() => {
    audioEngine.setCallbacks(
      (step, bar, beat) => {
        setCurrentStep(step);
        setCurrentBar(bar);
        setCurrentBeat(beat);
      },
      (padId, step, velocity) => {
        // Real-time overdub: record note event onto pattern
        setPatterns(prevPatterns => {
          return prevPatterns.map(pat => {
            if (pat.id === currentPatternId) {
              const track = pat.tracks[padId] || {
                padId,
                steps: Array.from({ length: pat.length }, () => ({ active: false, velocity: 0.8 })),
              };
              const updatedSteps = [...track.steps];
              updatedSteps[step] = { active: true, velocity };

              return {
                ...pat,
                tracks: {
                  ...pat.tracks,
                  [padId]: { ...track, steps: updatedSteps },
                },
              };
            }
            return pat;
          });
        });
      }
    );
  }, [currentPatternId]);

  // Playback handlers
  const handlePlayToggle = async () => {
    await audioEngine.initAudio();
    if (isPlaying) {
      audioEngine.stopPlayback();
      setIsPlaying(false);
      setIsRecording(false);
    } else {
      audioEngine.isRecording = isRecording;
      audioEngine.startPlayback(currentStep);
      setIsPlaying(true);
    }
  };

  const handleRecordToggle = async () => {
    await audioEngine.initAudio();
    const nextRec = !isRecording;
    setIsRecording(nextRec);
    audioEngine.isRecording = nextRec;
    if (!isPlaying && nextRec) {
      audioEngine.startPlayback(0);
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    audioEngine.stopPlayback();
    setIsPlaying(false);
    setIsRecording(false);
    setCurrentStep(0);
  };

  // Sound Kit Selection
  const handleSelectKit = (kit: SoundKit) => {
    setCurrentKitId(kit.id);
    setPads(kit.pads);
    setBpm(kit.bpm);
  };

  // Pad updates from Sampler / Mixer
  const handleUpdatePad = (updatedPad: PadConfig) => {
    setPads(prev => prev.map(p => p.id === updatedPad.id && p.bank === updatedPad.bank ? updatedPad : p));
  };

  // Pad Mute & Solo
  const handleTogglePadMute = (padId: number) => {
    setPads(prev => prev.map(p => p.id === padId ? { ...p, isMuted: !p.isMuted } : p));
  };

  const handleTogglePadSolo = (padId: number) => {
    const isCurrentlySolo = pads.find(p => p.id === padId)?.isSolo;
    setPads(prev => prev.map(p => {
      if (p.id === padId) return { ...p, isSolo: !isCurrentlySolo, isMuted: false };
      return { ...p, isMuted: !isCurrentlySolo };
    }));
  };

  // Chop to Pads algorithm
  const handleChopToPads = (slices: AudioBuffer[]) => {
    setPads(prev => {
      const updated = [...prev];
      slices.forEach((slice, idx) => {
        if (idx < 16) {
          updated[idx] = {
            ...updated[idx],
            audioBuffer: slice,
            sampleName: `Chop_Slice_${idx + 1}.wav`,
            name: `CHOP ${idx + 1}`,
            trimStart: 0,
            trimEnd: 1,
            pitch: 0,
          };
        }
      });
      return updated;
    });
  };

  // Pattern updates
  const handleUpdatePattern = (updatedPattern: Pattern) => {
    setPatterns(prev => prev.map(p => p.id === updatedPattern.id ? updatedPattern : p));
  };

  // Current Sound Kit Name
  const currentKitName = kits.find(k => k.id === currentKitId)?.name || '808 Street Heat';

  // Selected Pad for Sampler
  const selectedPad = pads.find(p => p.id === selectedPadId && p.bank === activeBank) || pads[0];

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0e0f14] text-slate-100 overflow-hidden font-sans">
      {/* Top LCD Transport Bar */}
      <TopTransport
        bpm={bpm}
        setBpm={setBpm}
        swing={swing}
        setSwing={setSwing}
        isPlaying={isPlaying}
        isRecording={isRecording}
        onPlayToggle={handlePlayToggle}
        onRecordToggle={handleRecordToggle}
        onStop={handleStop}
        metronome={metronome}
        setMetronome={setMetronome}
        currentStep={currentStep}
        currentBar={currentBar}
        currentBeat={currentBeat}
        currentKitName={currentKitName}
        onOpenKitBrowser={() => setIsKitBrowserOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        masterVolume={effects.masterVolume}
        setMasterVolume={(vol) => {
          setEffects(prev => ({ ...prev, masterVolume: vol }));
          audioEngine.updateEffects({ ...effects, masterVolume: vol });
        }}
      />

      {/* Main Studio Viewport */}
      <main className="flex-1 p-2 sm:p-3 overflow-hidden flex flex-col min-h-0">
        {activeView === 'pads' && (
          <PadMatrix
            pads={pads}
            activeBank={activeBank}
            setActiveBank={setActiveBank}
            selectedPadId={selectedPadId}
            setSelectedPadId={setSelectedPadId}
            onOpenSampler={(padId) => {
              setSelectedPadId(padId);
              setActiveView('sampler');
            }}
            sixteenLevelsMode={sixteenLevelsMode}
            setSixteenLevelsMode={setSixteenLevelsMode}
            fullLevel={fullLevel}
            setFullLevel={setFullLevel}
            noteRepeat={noteRepeat}
            setNoteRepeat={setNoteRepeat}
            noteRepeatRate={noteRepeatRate}
            setNoteRepeatRate={setNoteRepeatRate}
            padMuteMode={padMuteMode}
            setPadMuteMode={setPadMuteMode}
            onTogglePadMute={handleTogglePadMute}
            onTogglePadSolo={handleTogglePadSolo}
          />
        )}

        {activeView === 'steps' && (
          <StepSequencer
            pattern={activePattern}
            pads={pads}
            currentStep={currentStep}
            onUpdatePattern={handleUpdatePattern}
            selectedPadId={selectedPadId}
            setSelectedPadId={setSelectedPadId}
            onTogglePadMute={handleTogglePadMute}
          />
        )}

        {activeView === 'sampler' && selectedPad && (
          <SamplerEditor
            pad={selectedPad}
            onUpdatePad={handleUpdatePad}
            onChopToPads={handleChopToPads}
            onClose={() => setActiveView('pads')}
          />
        )}

        {activeView === 'mixer' && (
          <MixerRack
            effects={effects}
            setEffects={setEffects}
            pads={pads}
            onUpdatePad={handleUpdatePad}
            onTogglePadMute={handleTogglePadMute}
            onTogglePadSolo={handleTogglePadSolo}
          />
        )}

        {activeView === 'song' && (
          <SongArranger
            songBlocks={songBlocks}
            setSongBlocks={setSongBlocks}
            patterns={patterns}
            currentPatternId={currentPatternId}
            setCurrentPatternId={setCurrentPatternId}
            audioStems={audioStems}
            setAudioStems={setAudioStems}
            isPlaying={isPlaying}
            onPlaySong={handlePlayToggle}
            onStop={handleStop}
          />
        )}
      </main>

      {/* Bottom Ergonomic Navigation Bar (Thumb Reach Zone) */}
      <nav className="h-14 sm:h-16 bg-[#121319] border-t border-[#232733] grid grid-cols-5 items-center px-1 shrink-0 select-none shadow-2xl">
        <button
          onClick={() => setActiveView('pads')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
            activeView === 'pads' ? 'text-red-500 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Grid className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">PADS</span>
        </button>

        <button
          onClick={() => setActiveView('steps')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
            activeView === 'steps' ? 'text-red-500 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Music className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">STEPS</span>
        </button>

        <button
          onClick={() => setActiveView('sampler')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
            activeView === 'sampler' ? 'text-red-500 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Disc className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">SAMPLER</span>
        </button>

        <button
          onClick={() => setActiveView('mixer')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
            activeView === 'mixer' ? 'text-red-500 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">MIXER & FX</span>
        </button>

        <button
          onClick={() => setActiveView('song')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
            activeView === 'song' ? 'text-red-500 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">SONG</span>
        </button>
      </nav>

      {/* Modals */}
      {isKitBrowserOpen && (
        <KitBrowserModal
          kits={kits}
          currentKitId={currentKitId}
          onSelectKit={handleSelectKit}
          onClose={() => setIsKitBrowserOpen(false)}
        />
      )}

      {isExportModalOpen && (
        <ExportModal
          project={{
            version: '1.0',
            name: currentKitName,
            bpm,
            swing,
            activeBank,
            currentKitId,
            patterns,
            currentPatternId,
            songBlocks,
            audioStems,
            effects,
          }}
          pads={pads}
          onLoadProject={(loaded) => {
            setBpm(loaded.bpm);
            setSwing(loaded.swing);
            setPatterns(loaded.patterns);
            setCurrentPatternId(loaded.currentPatternId);
            setSongBlocks(loaded.songBlocks);
            setEffects(loaded.effects);
          }}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}
    </div>
  );
}
