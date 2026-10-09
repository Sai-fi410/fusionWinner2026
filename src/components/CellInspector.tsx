import React from 'react';
import { CellInspectionInfo } from '../types/simulation';
import { X, Grid, Layers, Activity, Package, Battery } from 'lucide-react';

interface CellInspectorProps {
  info: CellInspectionInfo;
  onClose: () => void;
}

export const CellInspector: React.FC<CellInspectorProps> = ({ info, onClose }) => {
  return (
    <div className="absolute right-6 top-24 w-84 bg-white border border-slate-100 rounded-[32px] p-5 z-40 shadow-[0_15px_45px_rgba(0,0,0,0.08)] select-none flex flex-col gap-3.5 text-slate-800 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
            <Grid className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-sm text-slate-900">
              Cell Inspector
            </h3>
            <span className="font-mono text-[10px] text-slate-400">
              Grid Coordinate ({info.x}, {info.y})
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

      {/* Primary Parameters */}
      <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
        <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-slate-100">
          <span className="text-[10px] text-slate-400 uppercase">CLASSIFICATION</span>
          <div className="font-bold text-slate-800 mt-0.5 truncate">
            {info.type.replace('_', ' ')}
          </div>
        </div>

        <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-slate-100">
          <span className="text-[10px] text-slate-400 uppercase">TRAVERSABLE</span>
          <div className={`font-bold mt-0.5 ${info.traversable ? 'text-emerald-600' : 'text-rose-600'}`}>
            {info.traversable ? 'YES (Open)' : 'NO (Blocked)'}
          </div>
        </div>

        <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-slate-100">
          <span className="text-[10px] text-slate-400 uppercase">CONGESTION INDEX</span>
          <div className="font-bold text-sky-700 mt-0.5">
            {info.congestionScore} visits
          </div>
        </div>

        <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-slate-100">
          <span className="text-[10px] text-slate-400 uppercase">PARCEL QUEUE</span>
          <div className="font-bold text-amber-700 mt-0.5">
            {info.parcelQueueCount !== undefined ? `${info.parcelQueueCount} boxes` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Occupying Robot details */}
      {info.occupantAgent ? (
        <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/80 flex flex-col gap-1.5 text-xs font-mono">
          <div className="flex items-center justify-between text-sky-900 font-bold">
            <span>OCCUPANT: {info.occupantAgent.name}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-200 text-sky-800">
              {info.occupantAgent.state}
            </span>
          </div>
          <div className="flex justify-between text-slate-600 text-[11px]">
            <span>Battery: {Math.round(info.occupantAgent.battery)}%</span>
            <span>Task: {info.occupantAgent.currentTaskId || 'None'}</span>
          </div>
        </div>
      ) : (
        <div className="p-2.5 rounded-2xl bg-[#F8FAFC] border border-slate-100 text-center text-[11px] font-mono text-slate-400">
          Cell is currently vacant
        </div>
      )}
    </div>
  );
};
