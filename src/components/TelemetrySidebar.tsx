import React from 'react';
import { TelemetryData, ArchitectureMode, Agent } from '../types/simulation';
import { 
  Users, 
  Gauge, 
  ShieldCheck, 
  Clock, 
  BatteryCharging, 
  Layers,
  Activity,
  Radio,
  AlertTriangle,
  Package,
  Wrench,
  LifeBuoy,
  X
} from 'lucide-react';

interface TelemetrySidebarProps {
  telemetry: TelemetryData;
  fleetSize: number;
  onFleetSizeChange: (size: number) => void;
  architectureMode: ArchitectureMode;
  agents: Agent[];
  onClearObstacles?: () => void;
  onOpenParcelModal?: () => void;
  isHardwareConnected?: boolean;
  onOpenHardwarePanel?: () => void;
  isDarkMode?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const TelemetrySidebar: React.FC<TelemetrySidebarProps> = ({
  telemetry,
  fleetSize,
  onFleetSizeChange,
  architectureMode,
  agents,
  onClearObstacles,
  onOpenParcelModal,
  isHardwareConnected = false,
  onOpenHardwarePanel,
  isDarkMode = true,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  // Count states
  const carryingCount = agents.filter(a => a.state === 'CARRYING_TASK').length;
  const transitCount = agents.filter(a => a.state === 'EN_ROUTE_PICKUP').length;
  const idleCount = agents.filter(a => a.state === 'IDLE').length;
  const failedCount = agents.filter(a => a.state === 'CRITICAL_FAILURE').length;
  const towingCount = agents.filter(a => a.state === 'TOWING_RECOVERY').length;
  const parkedCount = agents.filter(a => a.state === 'PARKED_REPAIR').length;
  const chargingCount = agents.filter(a => a.state === 'CHARGING').length;

  const cardBg = isDarkMode ? 'bg-[#1E293B]/70 border-slate-700/60' : 'bg-[#F8FAFC] border-slate-100';
  const innerCardBg = isDarkMode ? 'bg-[#0F172A] border-slate-700/60' : 'bg-white border-slate-200/80';
  const textPrimary = isDarkMode ? 'text-white' : 'text-slate-900';
  const textSecondary = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <aside className={`${isMobileOpen ? 'fixed inset-y-20 left-3 z-40 flex w-[min(20rem,calc(100vw-1.5rem))] shadow-2xl' : 'hidden'} lg:relative lg:inset-auto lg:z-auto lg:flex lg:w-80 h-full rounded-[24px] p-4 lg:p-5 flex-col gap-4 overflow-y-auto select-none border transition-colors duration-200 ${
      isDarkMode 
        ? 'bg-[#0F172A] border-slate-800 text-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.35)]' 
        : 'bg-white border-slate-100 text-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.03)]'
    }`}>
      <div className="flex items-center justify-between lg:hidden">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Live telemetry</span>
        <button type="button" onClick={onCloseMobile} className="rounded-full p-2 text-slate-400 hover:bg-slate-700/60 hover:text-white" aria-label="Close telemetry panel">
          <X className="h-4 w-4" />
        </button>
      </div>
      {/* Fleet Density Slider */}
      <div className={`${cardBg} border p-4 rounded-3xl flex flex-col gap-2.5 shadow-xs`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
            <Users className="w-4 h-4 text-sky-500" />
            <span className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>SWARM DENSITY SLIDER</span>
          </div>
          <span className={`font-mono font-bold text-xs px-2.5 py-1 rounded-full border ${
            isDarkMode ? 'text-sky-400 bg-sky-950/60 border-sky-800' : 'text-sky-700 bg-sky-50 border-sky-200'
          }`}>
            {fleetSize} UNITS
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="60"
          value={fleetSize}
          onChange={(e) => onFleetSizeChange(Number(e.target.value))}
          className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-700 rounded-full"
        />
        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>1 Solo</span>
          <span>24 Standard</span>
          <span>60 Scaled</span>
        </div>
      </div>

      {/* Critical Impasse / Blocked Corridors Warning Card */}
      {telemetry.isRouteFullyBlocked && (
        <div className="p-4 rounded-3xl flex flex-col gap-2 border border-rose-500/40 bg-rose-950/50 text-rose-200 shadow-sm animate-pulse">
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>CORRIDOR IMPASSE DETECTED</span>
          </div>
          <p className="text-[11px] leading-tight text-rose-300 font-sans font-medium">
            The whole route is blocked! {telemetry.blockedAgentCount} robot(s) cannot proceed because obstacles seal the corridor.
          </p>
          {onClearObstacles && (
            <button
              onClick={onClearObstacles}
              className="w-full py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs font-mono tracking-wide transition-all shadow-sm cursor-pointer"
            >
              REMOVE OBSTACLES
            </button>
          )}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Throughput */}
        <div className={`${cardBg} border p-3.5 rounded-3xl flex flex-col gap-1 shadow-xs`}>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <Gauge className="w-3.5 h-3.5 text-emerald-500" />
            <span>THROUGHPUT</span>
          </div>
          <div className={`font-mono text-xl font-extrabold ${textPrimary}`}>
            {telemetry.throughputPerMin}
            <span className="text-xs font-normal text-slate-400 ml-1">ord/m</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono font-medium">↑ Optimal Velocity</span>
        </div>

        {/* Reroute Latency */}
        <div className={`${cardBg} border p-3.5 rounded-3xl flex flex-col gap-1 shadow-xs`}>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>REROUTE TIME</span>
          </div>
          <div className={`font-mono text-xl font-extrabold ${textPrimary}`}>
            {architectureMode === 'DECENTRALIZED' ? telemetry.avgLatencyMs : telemetry.centralizedLatencyLagMs}
            <span className="text-xs font-normal text-slate-400 ml-1">ms</span>
          </div>
          <span className={`text-[10px] font-mono font-medium ${
            architectureMode === 'DECENTRALIZED' ? 'text-sky-400' : 'text-amber-400 font-bold'
          }`}>
            {architectureMode === 'DECENTRALIZED' ? '<3ms Peer Token' : 'Central Lag!'}
          </span>
        </div>

        {/* Collision Counter */}
        <div className={`${cardBg} border p-3.5 rounded-3xl flex flex-col gap-1 shadow-xs`}>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>COLLISIONS</span>
          </div>
          <div className="font-mono text-xl font-extrabold text-emerald-400">
            {telemetry.collisionCount}
          </div>
          <span className="text-[10px] text-emerald-400 font-mono font-medium">100% Invariant Zero</span>
        </div>

        {/* Energy & Distance Saved */}
        <div className={`${cardBg} border p-3.5 rounded-3xl flex flex-col gap-1 shadow-xs`}>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <BatteryCharging className="w-3.5 h-3.5 text-amber-500" />
            <span>ENERGY SAVED</span>
          </div>
          <div className={`font-mono text-xl font-extrabold ${textPrimary}`}>
            +{telemetry.energySavedPct}%
          </div>
          <span className="text-[10px] text-amber-400 font-mono font-medium">Yield Bay Gains</span>
        </div>
      </div>

      {/* Parcel Queue Status Card */}
      <div className={`${cardBg} border p-4 rounded-3xl flex flex-col gap-2.5 shadow-xs`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <Package className="w-4 h-4 text-amber-500" />
            <span className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>PARCEL QUEUE PIPELINE</span>
          </div>
          {onOpenParcelModal && (
            <button
              onClick={onOpenParcelModal}
              className="text-[10px] font-mono font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
            >
              Adjust
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className={`${innerCardBg} p-2.5 rounded-2xl border`}>
            <span className="text-[10px] text-slate-400 block">QUEUED AT PICK</span>
            <span className="font-bold text-amber-400 text-sm">
              {telemetry.totalQueuedParcels !== undefined ? telemetry.totalQueuedParcels : 30} boxes
            </span>
          </div>
          <div className={`${innerCardBg} p-2.5 rounded-2xl border`}>
            <span className="text-[10px] text-slate-400 block">DELIVERED CARGO</span>
            <span className="font-bold text-emerald-400 text-sm">
              {telemetry.completedTasksCount} units
            </span>
          </div>
        </div>
      </div>

      {/* Fleet Live State Distribution */}
      <div className={`${cardBg} border p-4 rounded-3xl flex flex-col gap-2.5 shadow-xs`}>
        <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
          <Layers className="w-4 h-4 text-sky-500" />
          <span className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>SWARM STATE TELEMETRY</span>
        </div>
        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between items-center text-emerald-400">
            <span className="flex items-center gap-2 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Carrying Parcel
            </span>
            <span className="font-bold">{carryingCount}</span>
          </div>
          <div className="flex justify-between items-center text-sky-400">
            <span className="flex items-center gap-2 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              Transit to Induction
            </span>
            <span className="font-bold">{transitCount}</span>
          </div>
          <div className="flex justify-between items-center text-amber-400">
            <span className="flex items-center gap-2 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Idle in Depot
            </span>
            <span className="font-bold">{idleCount}</span>
          </div>
          
          {/* TOWING RESCUE ACTIVE */}
          {towingCount > 0 && (
            <div className="flex justify-between items-center text-orange-400 font-bold animate-pulse">
              <span className="flex items-center gap-2 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                Towing Dead Robot
              </span>
              <span>{towingCount}</span>
            </div>
          )}

          {/* PARKED REPAIR AT DOCK */}
          {parkedCount > 0 && (
            <div className="flex justify-between items-center text-purple-400">
              <span className="flex items-center gap-2 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                Parked at Repair Dock
              </span>
              <span className="font-bold">{parkedCount}</span>
            </div>
          )}

          {failedCount > 0 && (
            <div className="flex justify-between items-center text-rose-400 font-bold animate-pulse">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                Awaiting Recovery
              </span>
              <span>{failedCount}</span>
            </div>
          )}

          {/* DROPPED CRATES AWAITING SALVAGE */}
          {telemetry.droppedParcelsCount > 0 && (
            <div className="flex justify-between items-center text-amber-300 font-bold bg-amber-950/60 px-2 py-1 rounded-xl border border-amber-800">
              <span className="flex items-center gap-1.5 font-medium text-[11px]">
                <Package className="w-3 h-3 text-amber-400" />
                Dropped Crate (Salvage)
              </span>
              <span>{telemetry.droppedParcelsCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Cyber-Twin Hardware Edge Status Card */}
      <div className={`${cardBg} border p-4 rounded-3xl flex flex-col gap-2.5 shadow-xs`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <Radio className="w-4 h-4 text-emerald-500" />
            <span className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>ESP32 HARDWARE TWIN</span>
          </div>
          <span className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full border font-bold ${
            isDarkMode ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
          }`}>
            5×5 MATRIX
          </span>
        </div>
        <div className="text-[11px] font-mono text-slate-400 space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Sensor Array:</span>
            <span className={textPrimary}>HC-SR04 on ESP32 AP</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Drive System:</span>
            <span className={textPrimary}>Dual DC Gear Motors</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Connection:</span>
            <span className="text-emerald-400 font-bold">Two-Way WebSockets</span>
          </div>
        </div>

        {onOpenHardwarePanel && (
          <button
            onClick={onOpenHardwarePanel}
            className="mt-1 w-full py-2.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-mono font-bold text-xs tracking-wide transition-all shadow-md shadow-sky-500/25 active:scale-95 cursor-pointer text-center"
          >
            OPEN 5×5 HARDWARE GRID
          </button>
        )}
      </div>
    </aside>
  );
};
