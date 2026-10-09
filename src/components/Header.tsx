import React from 'react';
import { SystemMode, ArchitectureMode, ToolMode, WarehouseLayoutId, CanvasViewMode } from '../types/simulation';
import { 
  Bot, 
  Cpu, 
  RotateCcw, 
  FileText, 
  SlidersHorizontal,
  Play,
  Pause,
  Radio,
  MousePointer,
  ShieldAlert,
  Package,
  Zap,
  Building2,
  Activity,
  Layers,
  Box
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
  activeWarehouse: WarehouseLayoutId;
  onSelectWarehouse: (id: WarehouseLayoutId) => void;
  viewMode: CanvasViewMode;
  onToggleViewMode: () => void;
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
  activeWarehouse,
  onSelectWarehouse,
  viewMode,
  onToggleViewMode,
}) => {
  return (
    <header className="h-18 px-5 lg:px-6 flex items-center justify-between z-30 select-none bg-[#EFF3F8] border-b border-slate-200/80 gap-2 overflow-x-auto scrollbar-none">
      {/* 1. LEFT: Brand & View Mode Switcher (2D / 3D) */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-md shadow-indigo-500/15 border border-white">
          <Bot className="w-5 h-5 text-white" />
        </div>
        
        <div className="hidden sm:block">
          <div className="flex items-center gap-1.5">
            <h1 className="font-display font-extrabold text-base tracking-tight text-slate-900 leading-none">
              Fusionistic
            </h1>
            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full border border-sky-300 bg-sky-100 text-sky-800 font-bold">
              3D
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-sans tracking-tight font-medium mt-0.5">
            Swarm Coordination Engine
          </p>
        </div>

        {/* 2D TACTICAL VS 3D ISOMETRIC VIEW SWITCHER */}
        <div className="flex items-center bg-white p-1 rounded-full border border-slate-200 shadow-xs ml-1">
          <button
            onClick={() => viewMode !== '2D' && onToggleViewMode()}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              viewMode === '2D'
                ? 'bg-slate-900 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="2D Tactical Map View (Top-Down Orthographic)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2D Map</span>
          </button>

          <button
            onClick={() => viewMode !== '3D' && onToggleViewMode()}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              viewMode === '3D'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="3D Isometric Simulation View (Photorealistic Warehouse Perspective)"
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D View</span>
          </button>
        </div>
      </div>

      {/* 2. CENTER: Clean Warehouse Selector, Swarm Play, and Tool Modes */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* WAREHOUSE STRUCTURE SELECTOR */}
        <div className="hidden md:flex items-center bg-white p-1 rounded-full border border-slate-200 shadow-xs">
          <div className="flex items-center gap-1 pl-2 pr-1 text-[11px] font-bold text-slate-400">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden xl:inline">Grid:</span>
          </div>

          <button
            onClick={() => onSelectWarehouse('WH_1')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeWarehouse === 'WH_1'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="WH-01: Standard Logistics Hub"
          >
            WH-1
          </button>

          <button
            onClick={() => onSelectWarehouse('WH_2')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeWarehouse === 'WH_2'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="WH-02: Perimeter Fulfillment Hub"
          >
            WH-2
          </button>

          <button
            onClick={() => onSelectWarehouse('WH_3')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeWarehouse === 'WH_3'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="WH-03: Sortation Terminal"
          >
            WH-3
          </button>

          <button
            onClick={() => onSelectWarehouse('WH_4')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeWarehouse === 'WH_4'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="WH-04: Cold Storage Matrix"
          >
            WH-4
          </button>
        </div>

        {/* PRIMARY START / PAUSE BUTTON */}
        <button
          onClick={onTogglePlay}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold font-mono tracking-wide transition-all shadow-xs active:scale-95 cursor-pointer shrink-0 ${
            isRunning
              ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300'
              : 'bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-600 shadow-md shadow-emerald-600/25 animate-pulse'
          }`}
          title={isRunning ? 'Pause swarm' : 'Start autonomous movement'}
        >
          {isRunning ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>PAUSE</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>START</span>
            </>
          )}
        </button>

        {/* POINTER TOOLS SEGMENTED PILL */}
        <div className="flex items-center bg-white p-1 rounded-full border border-slate-300 shadow-xs">
          {/* Inspect Tool */}
          <button
            onClick={() => onSetToolMode('INSPECT')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              toolMode === 'INSPECT'
                ? 'bg-slate-900 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Inspect Mode: Click any cell or robot to view real-time parameters"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Inspect</span>
          </button>

          {/* Obstacle Tool */}
          <button
            onClick={() => onSetToolMode('OBSTACLE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              toolMode === 'OBSTACLE'
                ? 'bg-amber-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Obstacle Mode: Click corridor floor cells to add or remove blockades"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Obstacle</span>
          </button>

          {/* Kill Agent Tool */}
          <button
            onClick={() => onSetToolMode('KILL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              toolMode === 'KILL'
                ? 'bg-rose-600 text-white shadow-xs font-bold animate-pulse'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Kill Agent Tool: Click any robot with the knife cursor to simulate breakdown"
          >
            <span className="text-xs">🔪</span>
            <span className="hidden sm:inline">Kill</span>
          </button>
        </div>
      </div>

      {/* 3. RIGHT: Fleet Tools & Actions (Never Overlaps) */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Hardware Twin 5x5 Matrix */}
        <button
          onClick={onOpenHardwarePanel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-xs font-bold transition-all cursor-pointer shadow-xs"
          title="Open Hardware Mode (5x5 Edge Grid)"
        >
          <Cpu className="w-3.5 h-3.5 text-sky-600" />
          <span className="hidden xl:inline">Hardware Twin</span>
        </button>

        {/* Custom Parcels Queue */}
        <button
          onClick={onOpenParcelModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-amber-50 border border-slate-200 text-slate-700 hover:text-amber-800 text-xs font-semibold transition-all cursor-pointer shadow-xs"
          title="Adjust Parcel Queue Load"
        >
          <Package className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden xl:inline">Parcels</span>
        </button>

        {/* Comm Rings On/Off */}
        <button
          onClick={onToggleCommRings}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer ${
            showCommRings
              ? 'bg-purple-100 border-purple-200 text-purple-800 font-bold'
              : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
          }`}
          title="Toggle robot communication and radar rings (Press 'R')"
        >
          <Radio className={`w-3.5 h-3.5 ${showCommRings ? 'text-purple-600' : 'text-slate-400'}`} />
          <span className="hidden xl:inline">Rings: {showCommRings ? 'ON' : 'OFF'}</span>
        </button>

        {/* Architecture Mode Toggle */}
        <button
          onClick={onToggleArchitectureMode}
          className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-mono font-semibold transition-colors cursor-pointer"
          title="Toggle Decentralized Swarm vs Centralized Controller"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{architectureMode}</span>
        </button>

        {/* Quick Chaos Actions Pill */}
        <div className="flex items-center bg-white p-1 rounded-full border border-slate-200 shadow-xs gap-1">
          <button
            onClick={onInjectSurge}
            className="p-1.5 rounded-full hover:bg-amber-50 text-amber-700 transition-all cursor-pointer"
            title="Inject 15 Priority Orders"
          >
            <Zap className="w-3.5 h-3.5 text-amber-600" />
          </button>

          <button
            onClick={onClearObstacles}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            title="Clear all manual obstacles"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onOpenDocs}
            className="p-1.5 rounded-full hover:bg-sky-50 text-sky-700 transition-colors cursor-pointer"
            title="System Specifications Docs"
          >
            <FileText className="w-3.5 h-3.5 text-sky-600" />
          </button>
        </div>

        {/* Enterprise Fleet Status Badge (No Amazon Robotics mention) */}
        <div className="hidden lg:flex items-center pl-1">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-xs">
            <div className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[9px] flex items-center justify-center">
              <Activity className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-bold text-slate-800 leading-none">Commander</span>
              <span className="text-[9px] text-emerald-600 font-mono leading-tight font-semibold">Online</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
