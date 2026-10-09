import React from 'react';
import { SystemMode, ArchitectureMode, ToolMode } from '../types/simulation';
import { 
  Bot, 
  Cpu, 
  Skull, 
  Zap, 
  RotateCcw, 
  FileText, 
  SlidersHorizontal,
  Layers,
  Play,
  Pause,
  Radio,
  MousePointer,
  ShieldAlert,
  Package,
  User,
  Sparkles
} from 'lucide-react';

interface HeaderProps {
  systemMode: SystemMode;
  onSetSystemMode: (mode: SystemMode) => void;
  architectureMode: ArchitectureMode;
  onToggleArchitectureMode: () => void;
  isRunning: boolean;
  onTogglePlay: () => void;
  showCommRings: boolean;
  onToggleCommRings: () => void;
  toolMode: ToolMode;
  onSetToolMode: (mode: ToolMode) => void;
  onOpenParcelModal: () => void;
  onKillRandom: () => void;
  onInjectSurge: () => void;
  onClearObstacles: () => void;
  onOpenDocs: () => void;
  isHardwareConnected?: boolean;
  onOpenHardwarePanel?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  systemMode,
  onSetSystemMode,
  architectureMode,
  onToggleArchitectureMode,
  isRunning,
  onTogglePlay,
  showCommRings,
  onToggleCommRings,
  toolMode,
  onSetToolMode,
  onOpenParcelModal,
  onKillRandom,
  onInjectSurge,
  onClearObstacles,
  onOpenDocs,
  isHardwareConnected = false,
  onOpenHardwarePanel,
}) => {
  return (
    <header className="h-20 px-6 flex items-center justify-between z-30 select-none gap-4">
      {/* Brand Identity - Inspired by Clinexa Dashboard Header */}
      <div className="flex items-center gap-3.5 shrink-0">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 border-2 border-white">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-xl tracking-tight text-slate-900">
              Fusionistic
            </h1>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-sky-200 bg-sky-50 text-sky-700 font-bold">
              IOT-04
            </span>
          </div>
          <p className="text-xs text-slate-400 font-sans tracking-tight hidden lg:block font-medium">
            Autonomous Swarm Warehouse Fleet Coordination
          </p>
        </div>
      </div>

      {/* Center Interactive Controls Bar - ZERO SHARP EDGES */}
      <div className="flex items-center gap-2.5">
        {/* PRIMARY START / PAUSE PILL BUTTON */}
        <button
          onClick={onTogglePlay}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold font-mono tracking-wide transition-all shadow-sm active:scale-95 cursor-pointer ${
            isRunning
              ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300'
              : 'bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-600 shadow-md shadow-emerald-600/25 animate-pulse'
          }`}
          title={isRunning ? 'Pause autonomous swarm movement' : 'Start autonomous swarm movement'}
        >
          {isRunning ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>PAUSE SWARM</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>START SWARM</span>
            </>
          )}
        </button>

        {/* INTERACTIVE TOOL MODES SEGMENTED PILL BAR */}
        <div className="flex items-center bg-white p-1 rounded-full border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
          {/* Inspect Tool */}
          <button
            onClick={() => onSetToolMode('INSPECT')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              toolMode === 'INSPECT'
                ? 'bg-slate-900 text-white shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Inspect Mode: Click any cell or robot to view real-time parameters"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Inspect</span>
          </button>

          {/* Obstacle Tool */}
          <button
            onClick={() => onSetToolMode('OBSTACLE')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              toolMode === 'OBSTACLE'
                ? 'bg-amber-500 text-white shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Obstacle Mode: Click aisle grid cells to add or remove physical blockades"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Obstacle Mode</span>
          </button>

          {/* Kill Agent Tool with Knife Cursor */}
          <button
            onClick={() => onSetToolMode('KILL')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              toolMode === 'KILL'
                ? 'bg-rose-600 text-white shadow-sm font-bold animate-pulse'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Kill Agent Tool: Click any robot with the knife cursor to simulate hardware failure"
          >
            <span className="text-xs">🔪</span>
            <span className="hidden md:inline">Kill Tool</span>
          </button>
        </div>

        {/* CUSTOM PARCELS PILL BUTTON */}
        <button
          onClick={onOpenParcelModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-amber-200 bg-white hover:bg-amber-50 text-amber-800 text-xs font-semibold transition-all cursor-pointer shadow-xs"
          title="Customize Pick Station Parcel Load & Physical Cargo Queue"
        >
          <Package className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden lg:inline">Custom Parcels</span>
        </button>

        {/* HARDWARE TWIN 5X5 CONSOLE PILL BUTTON */}
        <button
          onClick={onOpenHardwarePanel}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold transition-all cursor-pointer shadow-xs animate-pulse"
          title="Open Hardware Mode (5x5 Edge Grid)"
        >
          <Cpu className="w-3.5 h-3.5 text-sky-600" />
          <span>Hardware Mode</span>
        </button>

        {/* PROXIMITY / COMM RING TOGGLE PILL */}
        <button
          onClick={onToggleCommRings}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-mono transition-all cursor-pointer ${
            showCommRings
              ? 'border-purple-200 bg-purple-50 text-purple-700 shadow-xs font-bold'
              : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800'
          }`}
          title="Toggle robot communication and proximity rings ON or OFF (Press 'R')"
        >
          <Radio className={`w-3.5 h-3.5 ${showCommRings ? 'text-purple-600' : 'text-slate-400'}`} />
          <span className="hidden sm:inline">Rings: {showCommRings ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Right Controls: User Profile Pill (Inspired by Clinexa 'Edem Medicover' Pill) */}
      <div className="flex items-center gap-2.5">
        {/* Architecture Benchmark Mode */}
        <button
          onClick={onToggleArchitectureMode}
          className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono font-semibold transition-colors cursor-pointer ${
            architectureMode === 'DECENTRALIZED'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}
          title="Toggle between Decentralized Swarm vs Centralized Controller"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{architectureMode}</span>
        </button>

        {/* Chaos: Surge Injector */}
        <button
          onClick={onInjectSurge}
          className="p-2 rounded-full bg-white hover:bg-amber-50 border border-slate-200 text-amber-700 text-xs font-semibold transition-all cursor-pointer shadow-xs"
          title="Inject 15 Priority Orders"
        >
          <Zap className="w-4 h-4 text-amber-600" />
        </button>

        {/* Clear Obstacles */}
        <button
          onClick={onClearObstacles}
          className="p-2 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors cursor-pointer shadow-xs"
          title="Clear manual obstacles"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* View Specs & Docs Modal */}
        <button
          onClick={onOpenDocs}
          className="p-2 rounded-full bg-white hover:bg-sky-50 border border-slate-200 text-sky-700 transition-colors cursor-pointer shadow-xs"
          title="System Architecture Docs"
        >
          <FileText className="w-4 h-4 text-sky-600" />
        </button>

        {/* User Pill Matching Clinexa Reference */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200/80">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/80 shadow-xs">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
              AR
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800 leading-none">Amazon Robotics</span>
              <span className="text-[10px] text-slate-400 font-sans leading-tight">Judge Demo Track</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
