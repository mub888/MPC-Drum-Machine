import React, { useState } from 'react';
import { ProjectState, PadConfig, Pattern, SongBlock, MasterEffectsConfig } from '../types';
import { renderOfflineSong, downloadBlob } from '../audio/wavExporter';
import { Download, Save, Upload, FileMusic, Check, Loader2, X } from 'lucide-react';

interface ExportModalProps {
  project: ProjectState;
  pads: PadConfig[];
  onLoadProject: (loadedProject: ProjectState) => void;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  project,
  pads,
  onLoadProject,
  onClose,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportMode, setExportMode] = useState<'loop' | 'song'>('loop');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  const handleExportWav = async () => {
    setIsExporting(true);
    try {
      const activePat = project.patterns.find(p => p.id === project.currentPatternId) || project.patterns[0];
      const blocksToRender: SongBlock[] = exportMode === 'song' && project.songBlocks.length > 0
        ? project.songBlocks
        : [{ id: 'loop-block', patternId: activePat.id, repeats: 4, name: 'Loop 4x' }];

      const wavBlob = await renderOfflineSong(
        project.patterns,
        blocksToRender,
        pads,
        project.bpm,
        project.swing,
        project.effects
      );

      const filename = `${project.name.replace(/\s+/g, '_')}_${exportMode}_${project.bpm}BPM.wav`;
      downloadBlob(wavBlob, filename);
    } catch (err) {
      console.error('WAV export error:', err);
      alert('Failed to export audio. Please check console.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveToLocalStorage = () => {
    try {
      // Exclude AudioBuffers from JSON serializable project
      const serializableProject = {
        ...project,
      };
      localStorage.setItem('droidmpc_last_project', JSON.stringify(serializableProject));
      setSaveSuccessMsg(true);
      setTimeout(() => setSaveSuccessMsg(false), 2000);
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const handleExportProjectJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', `${project.name.replace(/\s+/g, '_')}.droidmpc.json`);
    dl.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150">
      <div className="bg-[#14161f] border border-[#272b3b] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#242838]">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="font-bold text-white text-base">BOUNCE & EXPORT</h3>
              <p className="text-xs text-slate-400">Export high-quality 16-bit 44.1kHz audio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#1f2230] text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* WAV Export Section */}
          <div className="bg-[#191c27] p-3.5 rounded-xl border border-[#272c3d]">
            <span className="text-xs font-bold text-white block mb-2">AUDIO BOUNCE (WAV)</span>

            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setExportMode('loop')}
                className={`flex-1 py-1.5 text-xs font-bold rounded ${
                  exportMode === 'loop'
                    ? 'bg-red-600 text-white'
                    : 'bg-[#222636] text-slate-400 hover:text-white'
                }`}
              >
                Current Pattern Loop
              </button>
              <button
                onClick={() => setExportMode('song')}
                className={`flex-1 py-1.5 text-xs font-bold rounded ${
                  exportMode === 'song'
                    ? 'bg-red-600 text-white'
                    : 'bg-[#222636] text-slate-400 hover:text-white'
                }`}
              >
                Full Song Arrangement
              </button>
            </div>

            <button
              onClick={handleExportWav}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-md active:scale-98 transition-all disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>RENDERING MASTER AUDIO...</span>
                </>
              ) : (
                <>
                  <FileMusic className="w-4 h-4" />
                  <span>DOWNLOAD WAV FILE</span>
                </>
              )}
            </button>
          </div>

          {/* Project Management Section */}
          <div className="bg-[#191c27] p-3.5 rounded-xl border border-[#272c3d] space-y-2">
            <span className="text-xs font-bold text-white block">PROJECT BACKUP</span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveToLocalStorage}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#222636] hover:bg-[#2b3044] text-xs font-bold text-slate-200 border border-[#2d3246]"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save to Browser</span>
              </button>

              <button
                onClick={handleExportProjectJson}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#222636] hover:bg-[#2b3044] text-xs font-bold text-slate-200 border border-[#2d3246]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Backup JSON</span>
              </button>
            </div>

            {saveSuccessMsg && (
              <div className="flex items-center gap-1 text-emerald-400 text-xs font-mono justify-center pt-1">
                <Check className="w-3.5 h-3.5" />
                <span>Project saved locally!</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#10121a] border-t border-[#222636] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
