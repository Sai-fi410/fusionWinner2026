import React, { useState, useRef, useEffect } from 'react';
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
  Box,
  ChevronDown,
  Check,
  Moon,
  Sun
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
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

const WAREHOUSE_OPTIONS: { id: WarehouseLayoutId; code: string; label: string; desc: string }[] = [
  { id: 'WH_1', code: 'WH-1', label: 'Standard Logistics Hub', desc: 'Dense storage racks with central cross aisles' },
  { id: 'WH_2', code: 'WH-2', label: 'Perimeter Fulfillment Hub', desc: 'High-speed central corridor with perimeter staging' },
  { id: 'WH_3', code: 'WH-3', label: 'Sortation Terminal', desc: 'Automated clustering with dynamic parcel dispatch' },
  { id: 'WH_4', code: 'WH-4', label: 'Cold Storage Matrix', desc: 'Dual cross-docking bays with segregated aisles' },
];

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
  isDarkMode = true,
  onToggleDarkMode,
}) => {
  const [isWarehouseDropdownOpen, setIsWarehouseDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsWarehouseDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentWh = WAREHOUSE_OPTIONS.find(w => w.id === activeWarehouse) || WAREHOUSE_OPTIONS[0];

  return (
    <header className={`min-h-16 h-auto px-3 lg:px-6 py-2 flex flex-wrap items-center justify-start xl:justify-between z-30 select-none border-b transition-colors duration-200 gap-2 shrink-0 ${
      isDarkMode 
        ? 'bg-[#0F172A]/95 border-slate-800 text-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.35)]' 
        : 'bg-[#EFF3F8] border-slate-200/80 text-slate-800'
    }`}>
      {/* 1. LEFT: Brand & Primary View Mode Switcher (2D / 3D) */}
      <div className="flex items-center gap-3 shrink-0 mr-auto">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-md shadow-indigo-500/20 border border-white/20">
          <Bot className="w-5 h-5 text-white" />
        </div>
        
        <div className="hidden sm:block">
          <div className="flex items-center gap-1.5">
            <h1 className={`font-display font-extrabold text-base tracking-tight leading-none ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Fusionistic
            </h1>
            <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full border font-bold ${
              isDarkMode ? 'border-sky-500/40 bg-sky-950/60 text-sky-400' : 'border-sky-300 bg-sky-100 text-sky-800'
            }`}>
              3D
            </span>
          </div>
          <p className={`text-[10px] font-sans tracking-tight font-medium mt-0.5 ${
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Warehouse Swarm Engine
          </p>
        </div>

        {/* 2D TACTICAL VS 3D ISOMETRIC VIEW SWITCHER */}
        <div className={`flex items-center p-1 rounded-full border shadow-xs ml-1 ${
          isDarkMode ? 'bg-slate-800/90 border-slate-700/80' : 'bg-white border-slate-200'
        }`}>
          <button
            onClick={() => viewMode !== '2D' && onToggleViewMode()}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              viewMode === '2D'
                ? isDarkMode ? 'bg-blue-600 text-white shadow-xs font-bold' : 'bg-slate-900 text-white shadow-xs font-bold'
                : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="2D Tactical Map View (Top-Down Orthographic)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2D Map</span>
          </button>

          <button
            onClick={() => viewMode !== '3D' && onToggleViewMode()}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              viewMode === '3D'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-bold'
                : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="3D Isometric Simulation View (SimTool style)"
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D View</span>
          </button>
        </div>
      </div>

      {/* 2. CENTER: Clean Warehouse Dropdown, Swarm Play, and Pointer Tools */}
      <div className="flex items-center gap-2.5 shrink-0 max-w-full overflow-x-auto">
        {/* WAREHOUSE STRUCTURE DROPDOWN MENU */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsWarehouseDropdownOpen(prev => !prev)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-xs ${
              isDarkMode 
                ? 'bg-slate-800/90 border-slate-700 hover:bg-slate-700/80 text-slate-200' 
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
            title="Select Warehouse Layout Grid"
          >
            <Building2 className={`w-3.5 h-3.5 ${isDarkMode ? 'text-sky-400' : 'text-blue-600'}`} />
            <span className="font-bold">{currentWh.code}</span>
            <span className="hidden xl:inline text-slate-400 font-normal">| {currentWh.label}</span>
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isWarehouseDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Floating Dropdown Card */}
          {isWarehouseDropdownOpen && (
            <div className={`absolute top-full left-0 mt-2 w-72 rounded-2xl border shadow-2xl p-2 z-50 flex flex-col gap-1 backdrop-blur-md transition-all ${
              isDarkMode ? 'bg-slate-900/95 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <div className="px-3 py-1.5 text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider border-b border-slate-700/40">
                Warehouse Structure Matrix
              </div>

              {WAREHOUSE_OPTIONS.map(opt => {
                const isSelected = opt.id === activeWarehouse;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      onSelectWarehouse(opt.id);
                      setIsWarehouseDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? isDarkMode ? 'bg-blue-600/20 border border-blue-500/40 text-blue-400 font-bold' : 'bg-blue-50 border border-blue-200 text-blue-700 font-bold'
                        : isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <span className="font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px]">
                          {opt.code}
                        </span>
                        <span>{opt.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-sans mt-0.5 font-normal">
                        {opt.desc}
                      </span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* POINTER TOOLS SEGMENTED PILL */}
        <div className={`flex items-center p-1 rounded-full border shadow-xs ${
          isDarkMode ? 'bg-slate-800/90 border-slate-700/80' : 'bg-white border-slate-300'
        }`}>
          {/* Inspect Tool */}
          <button
            onClick={() => onSetToolMode('INSPECT')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              toolMode === 'INSPECT'
                ? isDarkMode ? 'bg-blue-600 text-white shadow-xs font-bold' : 'bg-slate-900 text-white shadow-xs font-bold'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Inspect Mode: Click any cell or robot to view real-time telemetry"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Inspect</span>
          </button>

          {/* Obstacle Tool */}
          <button
            onClick={() => onSetToolMode('OBSTACLE')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              toolMode === 'OBSTACLE'
                ? 'bg-amber-600 text-white shadow-xs font-bold'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Obstacle Mode: Click corridor floor cells to add or remove blockades"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Obstacle</span>
          </button>

          {/* Kill Agent Tool */}
          <button
            onClick={() => onSetToolMode('KILL')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              toolMode === 'KILL'
                ? 'bg-rose-600 text-white shadow-xs font-bold animate-pulse'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Kill Agent Tool: Click any robot with the knife cursor to simulate breakdown"
          >
            <span className="text-xs">🔪</span>
            <span className="hidden sm:inline">Kill</span>
          </button>
        </div>
      </div>

      {/* 3. RIGHT: Fleet Tools, Dark Mode, & Actions */}
      <div className="flex items-center gap-2 shrink-0 max-w-full overflow-x-auto">
        {/* Hardware Twin 5x5 Matrix */}
        <button
          onClick={onOpenHardwarePanel}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer shadow-xs ${
            isDarkMode 
              ? 'bg-sky-950/60 hover:bg-sky-900/60 border-sky-700/60 text-sky-400' 
              : 'bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-800'
          }`}
          title="Open Hardware Mode (ESP32 AP / Blynk Matrix)"
        >
          <Cpu className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden xl:inline">Hardware Twin</span>
        </button>

        {/* Custom Parcels Queue */}
        <button
          onClick={onOpenParcelModal}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-xs ${
            isDarkMode 
              ? 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-amber-400' 
              : 'bg-white hover:bg-amber-50 border-slate-200 text-slate-700 hover:text-amber-800'
          }`}
          title="Adjust Parcel Queue Load"
        >
          <Package className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden xl:inline">Parcels</span>
        </button>

        {/* Dark / Light Mode Switcher */}
        {onToggleDarkMode && (
          <button
            onClick={onToggleDarkMode}
            className={`p-2 rounded-full border transition-all cursor-pointer shadow-xs ${
              isDarkMode 
                ? 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-amber-400' 
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        )}

        {/* Quick Chaos Actions Pill */}
        <div className={`flex items-center p-1 rounded-full border shadow-xs gap-1 ${
          isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <button
            onClick={onInjectSurge}
            className={`p-1.5 rounded-full transition-all cursor-pointer ${
              isDarkMode ? 'hover:bg-amber-950/60 text-amber-400' : 'hover:bg-amber-50 text-amber-700'
            }`}
            title="Inject 15 Priority Orders"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </button>

          <button
            onClick={onClearObstacles}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Clear all manual obstacles"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onOpenDocs}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              isDarkMode ? 'hover:bg-sky-950/60 text-sky-400' : 'hover:bg-sky-50 text-sky-700'
            }`}
            title="System Specifications Docs"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
          </button>
        </div>

        {/* Fleet Status Badge */}
        <div className="hidden lg:flex items-center pl-1">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border shadow-xs ${
            isDarkMode ? 'bg-slate-800/90 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-bold leading-none">Fleet Active</span>
              <span className="text-[9px] text-emerald-400 font-mono leading-tight font-semibold">Decentralized</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
