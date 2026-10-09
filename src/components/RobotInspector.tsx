import React from 'react';
import { Agent } from '../types/simulation';
import { 
  X, 
  Battery, 
  MapPin, 
  Activity, 
  Clock, 
  Skull, 
  Zap,
  Radio,
  Package,
  AlertTriangle,
  LifeBuoy
} from 'lucide-react';

interface RobotInspectorProps {
  agent: Agent;
  onClose: () => void;
  onKillAgent: (agentId: string) => void;
  onClearObstacles?: () => void;
}

export const RobotInspector: React.FC<RobotInspectorProps> = ({
  agent,
  onClose,
  onKillAgent,
  onClearObstacles,
}) => {
  return (
    <div className="absolute right-6 top-24 w-84 bg-white border border-slate-100 rounded-[32px] shadow-[0_15px_45px_rgba(0,0,0,0.08)] p-5 z-40 select-none flex flex-col gap-3.5 text-slate-800 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center">
            {agent.isHardwareTwin ? (
              <Radio className="w-4 h-4 text-emerald-600" />
            ) : (
              <Activity className="w-4 h-4 text-sky-600" />
            )}
          </div>
          <div>
            <h3 className="font-display font-extrabold text-sm text-slate-900">
              {agent.name}
            </h3>
            <span className="font-mono text-[10px] text-slate-400">
              ID: {agent.id}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* State & Priority Chips - Rounded Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
          agent.state === 'CRITICAL_FAILURE'
            ? 'bg-rose-100 text-rose-700 border border-rose-300'
            : agent.state === 'TOWING_RECOVERY'
            ? 'bg-orange-100 text-orange-800 border border-orange-300'
            : agent.state === 'PARKED_REPAIR'
            ? 'bg-slate-200 text-slate-700 border border-slate-300'
            : agent.state === 'CARRYING_TASK'
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            : agent.state === 'EN_ROUTE_PICKUP'
            ? 'bg-sky-100 text-sky-800 border border-sky-300'
            : 'bg-amber-100 text-amber-800 border border-amber-300'
        }`}>
          {agent.state.replace('_', ' ')}
        </span>

        {agent.priority === 'EXPRESS' && (
          <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-yellow-100 text-yellow-800 border border-yellow-300 flex items-center gap-1">
            <Zap className="w-3 h-3 text-yellow-600" /> Tier 1 Express
          </span>
        )}

        {agent.towedAgentId && (
          <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-orange-50 text-orange-700 border border-orange-200 flex items-center gap-1">
            <LifeBuoy className="w-3 h-3 text-orange-600" /> Towing Disabled Unit
          </span>
        )}
      </div>

      {/* Blocked Route Alert */}
      {agent.isRouteBlocked && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-mono flex flex-col gap-1.5 animate-pulse">
          <div className="flex items-center gap-1.5 font-bold text-rose-700">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>ROUTE IS FULLY BLOCKED</span>
          </div>
          <p className="text-[10px] text-rose-800 font-sans leading-tight font-medium">
            {agent.blockedReason || "All corridors to target destination are sealed by obstacles."}
          </p>
          {onClearObstacles && (
            <button
              onClick={onClearObstacles}
              className="mt-1 py-1.5 px-3 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] tracking-wide cursor-pointer transition-all shadow-xs"
            >
              REMOVE OBSTACLES
            </button>
          )}
        </div>
      )}

      {/* Primary Metrics Grid - Rounded Cards */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <MapPin className="w-3 h-3 text-sky-600" />
            <span>COORDINATE</span>
          </div>
          <div className="font-bold text-slate-900 mt-0.5">
            ({agent.x}, {agent.y})
          </div>
        </div>

        <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Battery className="w-3 h-3 text-emerald-600" />
            <span>BATTERY</span>
          </div>
          <div className="font-bold text-emerald-700 mt-0.5">
            {Math.round(agent.battery)}%
          </div>
        </div>

        <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Clock className="w-3.5 h-3 text-sky-600" />
            <span>REROUTE TIME</span>
          </div>
          <div className="font-bold text-sky-700 mt-0.5">
            {agent.lastRerouteLatencyMs.toFixed(1)} ms
          </div>
        </div>

        <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Package className="w-3 h-3 text-amber-600" />
            <span>ACTIVE TASK</span>
          </div>
          <div className="font-bold text-slate-800 mt-0.5 truncate">
            {agent.currentTaskId || 'None (Idle)'}
          </div>
        </div>
      </div>

      {/* Target & Path Trajectory Window */}
      <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-slate-100 flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
          <span>TRAJECTORY HORIZON (H=12)</span>
          <span>{agent.path.length} steps remaining</span>
        </div>
        {agent.path.length > 0 ? (
          <div className="flex gap-1.5 overflow-x-auto py-1">
            {agent.path.slice(0, 6).map((step, idx) => (
              <span
                key={idx}
                className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 whitespace-nowrap shadow-xs"
              >
                ({step.x},{step.y})
              </span>
            ))}
          </div>
        ) : (
          <span className="text-[10px] font-mono text-slate-400 italic">
            Trajectory buffer empty. Agent stationary.
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-1">
        {agent.state !== 'CRITICAL_FAILURE' && agent.state !== 'PARKED_REPAIR' ? (
          <button
            onClick={() => onKillAgent(agent.id)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
          >
            <Skull className="w-4 h-4" />
            <span>SIMULATE HARDWARE FAULT (KILL)</span>
          </button>
        ) : agent.state === 'PARKED_REPAIR' ? (
          <div className="w-full text-center py-2.5 text-xs font-mono font-semibold text-slate-700 bg-slate-100 rounded-full border border-slate-200">
            PARKED SAFELY AT CHARGING STATION
          </div>
        ) : (
          <div className="w-full text-center py-2.5 text-xs font-mono font-semibold text-rose-700 bg-rose-50 rounded-full border border-rose-200">
            CRITICAL FAULT ACTIVE | RESCUE TOW EN-ROUTE
          </div>
        )}
      </div>
    </div>
  );
};
