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
}) => {
  return (
    <footer className="h-16 px-6 mx-5 mb-4 rounded-full bg-white/95 border border-slate-100 shadow-[0_6px_25px_rgba(0,0,0,0.03)] backdrop-blur-md flex items-center justify-between z-20 select-none text-slate-800 transition-all">
      {/* Simulation Playback Controls - Pill Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={onTogglePlay}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-mono font-bold transition-all shadow-xs cursor-pointer active:scale-95 ${
            isRunning
              ? 'bg-amber-100 border border-amber-300 text-amber-800 hover:bg-amber-200'
              : 'bg-emerald-600 border border-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20 animate-pulse'
          }`}
        >
          {isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{isRunning ? 'PAUSE SWARM' : 'START SWARM'}</span>
        </button>

        <button
          onClick={onStepTick}
          disabled={isRunning}
          className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-xs"
          title="Step 1 simulation tick"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* Speed Slider */}
        <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <span className="text-[11px] font-mono text-slate-400 font-semibold">TICK:</span>
          <input
            type="range"
            min="50"
            max="250"
            step="10"
            value={tickSpeedMs}
            onChange={(e) => onTickSpeedChange(Number(e.target.value))}
            className="w-24 accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-full"
          />
          <span className="text-[11px] font-mono text-sky-700 font-bold w-12">{tickSpeedMs}ms</span>
        </div>
      </div>

      {/* Visual Layer Toggles - Rounded Pills */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleHeatmap}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-xs ${
            showHeatmap
              ? 'border-orange-300 bg-orange-50 text-orange-800 font-bold'
              : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
          }`}
          title="Toggle Congestion Frequency Heatmap Layer"
        >
          <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'text-orange-600' : 'text-slate-400'}`} />
          <span className="hidden md:inline">Heatmap</span>
        </button>

        <button
          onClick={onTogglePathVectors}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-xs ${
            showPathVectors
              ? 'border-sky-300 bg-sky-50 text-sky-800 font-bold'
              : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
          }`}
          title="Toggle Agent Planned Path Trajectory Vectors"
        >
          <Navigation className={`w-3.5 h-3.5 ${showPathVectors ? 'text-sky-600' : 'text-slate-400'}`} />
          <span className="hidden md:inline">Vectors</span>
        </button>

        <button
          onClick={onToggleCommRings}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-mono transition-all cursor-pointer shadow-xs ${
            showCommRings
              ? 'border-purple-300 bg-purple-50 text-purple-800 font-bold'
              : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
          }`}
          title="Toggle Robot Communication & Proximity Rings ON or OFF (Press 'R')"
        >
          <Radio className={`w-3.5 h-3.5 ${showCommRings ? 'text-purple-600' : 'text-slate-400'}`} />
          <span className="hidden md:inline">Rings: {showCommRings ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* State Legend - Rounded Pills */}
      <div className="hidden xl:flex items-center gap-3 text-[11px] font-mono text-slate-500 pl-4 border-l border-slate-200">
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
