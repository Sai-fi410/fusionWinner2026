import React from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  Flame, 
  Navigation, 
  Radio, 
} from 'lucide-react';

interface ControlBarProps {
  isRunning: boolean;
  onTogglePlay: () => void;
  onStepTick: () => void;
  tickSpeedMs: number;
  onTickSpeedChange: (speed: number) => void;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  showPathVectors: boolean;
  onTogglePathVectors: () => void;
  showCommRings: boolean;
  onToggleCommRings: () => void;
  isDarkMode?: boolean;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  isRunning,
  onTogglePlay,
  onStepTick,
  tickSpeedMs,
  onTickSpeedChange,
  showHeatmap,
  onToggleHeatmap,
  showPathVectors,
  onTogglePathVectors,
  showCommRings,
  onToggleCommRings,
  isDarkMode = true,
}) => {
  return (
    <footer className={`h-16 px-6 mx-5 mb-4 rounded-full border shadow-lg backdrop-blur-md flex items-center justify-between z-20 select-none transition-colors duration-200 shrink-0 ${
      isDarkMode 
        ? 'bg-[#0F172A]/95 border-slate-800 text-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.4)]' 
        : 'bg-white/95 border-slate-200 text-slate-800 shadow-[0_6px_25px_rgba(0,0,0,0.03)]'
    }`}>
      {/* Simulation Playback Controls - Pill Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={onTogglePlay}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-mono font-bold transition-all shadow-xs cursor-pointer active:scale-95 ${
            isRunning
              ? isDarkMode ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30' : 'bg-amber-100 border border-amber-300 text-amber-800 hover:bg-amber-200'
              : 'bg-emerald-600 border border-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/25 animate-pulse'
          }`}
        >
          {isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{isRunning ? 'PAUSE SWARM' : 'START SWARM'}</span>
        </button>

        <button
          onClick={onStepTick}
          disabled={isRunning}
          className={`p-2 rounded-full text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-xs ${
            isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
          title="Step 1 simulation tick"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* Speed Slider */}
        <div className={`hidden sm:flex items-center gap-2.5 pl-3 border-l ${
          isDarkMode ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <span className="text-[11px] font-mono text-slate-400 font-semibold">TICK:</span>
          <input
            type="range"
            min="50"
            max="250"
            step="10"
            value={tickSpeedMs}
            onChange={(e) => onTickSpeedChange(Number(e.target.value))}
            className="w-24 accent-blue-600 cursor-pointer h-1.5 bg-slate-700 rounded-full"
          />
          <span className="text-[11px] font-mono text-sky-400 font-bold w-12">{tickSpeedMs}ms</span>
        </div>
      </div>

      {/* Visual Layer Toggles */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleHeatmap}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-xs ${
            showHeatmap
              ? isDarkMode ? 'border-orange-500/50 bg-orange-950/60 text-orange-400 font-bold' : 'border-orange-300 bg-orange-50 text-orange-800 font-bold'
              : isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white' : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
          }`}
          title="Toggle Congestion Frequency Heatmap Layer"
        >
          <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'text-orange-500' : 'text-slate-400'}`} />
          <span className="hidden md:inline">Heatmap</span>
        </button>

        <button
          onClick={onTogglePathVectors}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-xs ${
            showPathVectors
              ? isDarkMode ? 'border-sky-500/50 bg-sky-950/60 text-sky-400 font-bold' : 'border-sky-300 bg-sky-50 text-sky-800 font-bold'
              : isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white' : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
          }`}
          title="Toggle Agent Planned Path Trajectory Vectors"
        >
          <Navigation className={`w-3.5 h-3.5 ${showPathVectors ? 'text-sky-400' : 'text-slate-400'}`} />
          <span className="hidden md:inline">Vectors</span>
        </button>

        <button
          onClick={onToggleCommRings}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-mono transition-all cursor-pointer shadow-xs ${
            showCommRings
              ? isDarkMode ? 'border-purple-500/50 bg-purple-950/60 text-purple-300 font-bold' : 'border-purple-300 bg-purple-50 text-purple-800 font-bold'
              : isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white' : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
          }`}
          title="Toggle Robot Communication & Proximity Rings (Press 'R')"
        >
          <Radio className={`w-3.5 h-3.5 ${showCommRings ? 'text-purple-400' : 'text-slate-400'}`} />
          <span className="hidden md:inline">Rings: {showCommRings ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* State Legend */}
      <div className={`hidden xl:flex items-center gap-3 text-[11px] font-mono text-slate-400 pl-4 border-l ${
        isDarkMode ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-500" />
          <span>Transit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Carrying</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Idle</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <span>Towing</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-600" />
          <span>Failed</span>
        </div>
      </div>
    </footer>
  );
};
