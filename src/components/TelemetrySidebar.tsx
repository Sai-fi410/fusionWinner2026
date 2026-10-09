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
  LifeBuoy
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
}) => {
  // Count states
  const carryingCount = agents.filter(a => a.state === 'CARRYING_TASK').length;
  const transitCount = agents.filter(a => a.state === 'EN_ROUTE_PICKUP').length;
  const idleCount = agents.filter(a => a.state === 'IDLE').length;
  const failedCount = agents.filter(a => a.state === 'CRITICAL_FAILURE').length;
  const towingCount = agents.filter(a => a.state === 'TOWING_RECOVERY').length;
  const parkedCount = agents.filter(a => a.state === 'PARKED_REPAIR').length;
  const chargingCount = agents.filter(a => a.state === 'CHARGING').length;

  return (
    <aside className="w-80 h-full rounded-[32px] bg-white border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.03)] p-5 flex flex-col gap-4 overflow-y-auto select-none text-slate-800 transition-all">
      {/* Fleet Density Slider - ZERO SHARP EDGES */}
      <div className="bg-[#F8FAFC] border border-slate-100 p-4 rounded-3xl flex flex-col gap-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Users className="w-4 h-4 text-sky-600" />
            <span>SWARM DENSITY SLIDER</span>
          </div>
          <span className="font-mono font-bold text-xs text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
            {fleetSize} UNITS
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="60"
          value={fleetSize}
          onChange={(e) => onFleetSizeChange(Number(e.target.value))}
          className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-full"
        />
        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>1 Solo</span>
          <span>24 Standard</span>
          <span>60 Scaled</span>
        </div>
      </div>

      {/* Critical Impasse / Blocked Corridors Warning Card */}
      {telemetry.isRouteFullyBlocked && (
        <div className="p-4 rounded-3xl flex flex-col gap-2 border border-rose-300 bg-rose-50/90 text-rose-900 shadow-sm animate-pulse">
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>CORRIDOR IMPASSE DETECTED</span>
          </div>
          <p className="text-[11px] leading-tight text-rose-800 font-sans font-medium">
            The whole route is blocked! {telemetry.blockedAgentCount} robot(s) cannot proceed because obstacles seal the aisle corridor.
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

      {/* KPI Cards Grid - Inspired by Clinexa Stat Panels */}
      <div className="grid grid-cols-2 gap-3">
        {/* Throughput */}
        <div className="bg-[#F8FAFC] border border-slate-100 p-3.5 rounded-3xl flex flex-col gap-1 shadow-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <Gauge className="w-3.5 h-3.5 text-emerald-600" />
            <span>THROUGHPUT</span>
          </div>
          <div className="font-mono text-xl font-extrabold text-slate-900">
            {telemetry.throughputPerMin}
            <span className="text-xs font-normal text-slate-500 ml-1">ord/m</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-mono font-medium">↑ Optimal Velocity</span>
        </div>

        {/* Reroute Latency */}
        <div className="bg-[#F8FAFC] border border-slate-100 p-3.5 rounded-3xl flex flex-col gap-1 shadow-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            <span>REROUTE TIME</span>
          </div>
          <div className="font-mono text-xl font-extrabold text-slate-900">
            {architectureMode === 'DECENTRALIZED' ? telemetry.avgLatencyMs : telemetry.centralizedLatencyLagMs}
            <span className="text-xs font-normal text-slate-500 ml-1">ms</span>
          </div>
          <span className={`text-[10px] font-mono font-medium ${
            architectureMode === 'DECENTRALIZED' ? 'text-sky-700' : 'text-amber-700 font-bold'
          }`}>
            {architectureMode === 'DECENTRALIZED' ? '<3ms Peer Token' : 'Central Lag!'}
          </span>
        </div>

        {/* Collision Counter */}
        <div className="bg-[#F8FAFC] border border-slate-100 p-3.5 rounded-3xl flex flex-col gap-1 shadow-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>COLLISIONS</span>
          </div>
          <div className="font-mono text-xl font-extrabold text-emerald-600">
            {telemetry.collisionCount}
          </div>
          <span className="text-[10px] text-emerald-700 font-mono font-medium">100% Invariant Zero</span>
        </div>

        {/* Energy & Distance Saved */}
        <div className="bg-[#F8FAFC] border border-slate-100 p-3.5 rounded-3xl flex flex-col gap-1 shadow-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <BatteryCharging className="w-3.5 h-3.5 text-amber-600" />
            <span>ENERGY SAVED</span>
          </div>
          <div className="font-mono text-xl font-extrabold text-slate-900">
            +{telemetry.energySavedPct}%
          </div>
          <span className="text-[10px] text-amber-700 font-mono font-medium">Yield Bay Gains</span>
        </div>
      </div>

      {/* Parcel Queue Status Card */}
      <div className="bg-[#F8FAFC] border border-slate-100 p-4 rounded-3xl flex flex-col gap-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Package className="w-4 h-4 text-amber-600" />
            <span>PARCEL QUEUE PIPELINE</span>
          </div>
          {onOpenParcelModal && (
            <button
              onClick={onOpenParcelModal}
              className="text-[10px] font-mono font-bold text-amber-700 hover:text-amber-800 underline cursor-pointer"
            >
              Adjust
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] text-slate-400 block">QUEUED AT PICK</span>
            <span className="font-bold text-amber-700 text-sm">
              {telemetry.totalQueuedParcels !== undefined ? telemetry.totalQueuedParcels : 30} boxes
            </span>
          </div>
          <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] text-slate-400 block">DELIVERED CARGO</span>
            <span className="font-bold text-emerald-700 text-sm">
              {telemetry.completedTasksCount} units
            </span>
          </div>
        </div>
      </div>

      {/* Fleet Live State Distribution - Including Towing and Parked Recovery */}
      <div className="bg-[#F8FAFC] border border-slate-100 p-4 rounded-3xl flex flex-col gap-2.5 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Layers className="w-4 h-4 text-sky-600" />
          <span>SWARM STATE TELEMETRY</span>
        </div>
        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between items-center text-emerald-700">
            <span className="flex items-center gap-2 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Carrying Parcel
            </span>
            <span className="font-bold">{carryingCount}</span>
          </div>
          <div className="flex justify-between items-center text-sky-700">
            <span className="flex items-center gap-2 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              Transit to Induction
            </span>
            <span className="font-bold">{transitCount}</span>
          </div>
          <div className="flex justify-between items-center text-amber-700">
            <span className="flex items-center gap-2 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Idle in Depot
            </span>
            <span className="font-bold">{idleCount}</span>
          </div>
          
          {/* TOWING RESCUE ACTIVE */}
          {towingCount > 0 && (
            <div className="flex justify-between items-center text-orange-700 font-bold animate-pulse">
              <span className="flex items-center gap-2 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                Towing Dead Robot
              </span>
              <span>{towingCount}</span>
            </div>
          )}

          {/* PARKED REPAIR AT DOCK */}
          {parkedCount > 0 && (
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center gap-2 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                Parked at Repair Dock
              </span>
              <span className="font-bold">{parkedCount}</span>
            </div>
          )}

          {failedCount > 0 && (
            <div className="flex justify-between items-center text-rose-700 font-bold animate-pulse">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                Awaiting Recovery
              </span>
              <span>{failedCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Cyber-Twin Hardware Edge Status Card - Rounded Pills */}
      <div className="bg-[#F8FAFC] border border-slate-100 p-4 rounded-3xl flex flex-col gap-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Radio className="w-4 h-4 text-emerald-600" />
            <span>ESP32 HARDWARE TWIN</span>
          </div>
          <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
            5×5 MATRIX
          </span>
        </div>
        <div className="text-[11px] font-mono text-slate-600 space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400">Sensor Array:</span>
            <span className="text-slate-900 font-bold">HC-SR04 on SG90 Servo</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Drive System:</span>
            <span className="text-slate-900 font-bold">Dual DC Gear Motors</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Connection:</span>
            <span className="text-emerald-700 font-bold">Two-Way WebSockets</span>
          </div>
        </div>

        {onOpenHardwarePanel && (
          <button
            onClick={onOpenHardwarePanel}
            className="mt-1 w-full py-2.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-mono font-bold text-xs tracking-wide transition-all shadow-md shadow-sky-500/20 active:scale-95 cursor-pointer text-center"
          >
            OPEN 5×5 HARDWARE GRID
          </button>
        )}
      </div>
    </aside>
  );
};
