import React from 'react';
import { CellInspectionInfo } from '../types/simulation';
import { X, Grid, Layers, Activity, Package, Battery } from 'lucide-react';

interface CellInspectorProps {
  info: CellInspectionInfo;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const CellInspector: React.FC<CellInspectorProps> = ({ info, onClose, isDarkMode = true }) => {
  return (
    <div className={`absolute right-6 top-24 w-84 rounded-[32px] p-5 z-40 select-none flex flex-col gap-3.5 transition-all shadow-[0_15px_45px_rgba(0,0,0,0.35)] border ${
      isDarkMode ? 'bg-[#0F172A] border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-800'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border ${
            isDarkMode ? 'bg-sky-500/20 border-sky-500/40 text-sky-400' : 'bg-sky-50 border-sky-200 text-sky-600'
          }`}>
            <Grid className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`font-display font-extrabold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Cell Inspector
            </h3>
            <span className="font-mono text-[10px] text-slate-400">
              Grid Coordinate ({info.x}, {info.y})
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Parameters */}
      <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
        <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#1E293B]/70 border-slate-700/60' : 'bg-[#F8FAFC] border-slate-100'}`}>
          <span className="text-[10px] text-slate-400 uppercase">CLASSIFICATION</span>
          <div className={`font-bold mt-0.5 truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            {info.type.replace('_', ' ')}
          </div>
        </div>

        <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#1E293B]/70 border-slate-700/60' : 'bg-[#F8FAFC] border-slate-100'}`}>
          <span className="text-[10px] text-slate-400 uppercase">TRAVERSABLE</span>
          <div className={`font-bold mt-0.5 ${info.traversable ? 'text-emerald-400' : 'text-rose-400'}`}>
            {info.traversable ? 'YES (Open)' : 'NO (Blocked)'}
          </div>
        </div>

        <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#1E293B]/70 border-slate-700/60' : 'bg-[#F8FAFC] border-slate-100'}`}>
          <span className="text-[10px] text-slate-400 uppercase">CONGESTION INDEX</span>
          <div className={`font-bold mt-0.5 ${isDarkMode ? 'text-sky-400' : 'text-sky-700'}`}>
            {info.congestionScore} visits
          </div>
        </div>

        <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#1E293B]/70 border-slate-700/60' : 'bg-[#F8FAFC] border-slate-100'}`}>
          <span className="text-[10px] text-slate-400 uppercase">PARCEL QUEUE</span>
          <div className={`font-bold mt-0.5 ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
            {info.parcelQueueCount !== undefined ? `${info.parcelQueueCount} boxes` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Occupying Robot details */}
      {info.occupantAgent ? (
        <div className={`p-3.5 rounded-2xl border flex flex-col gap-1.5 text-xs font-mono ${
          isDarkMode ? 'bg-sky-950/40 border-sky-800/60 text-sky-200' : 'bg-sky-50/70 border-sky-200/80 text-sky-900'
        }`}>
          <div className="flex items-center justify-between font-bold">
            <span>OCCUPANT: {info.occupantAgent.name}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
              isDarkMode ? 'bg-sky-800 text-sky-200' : 'bg-sky-200 text-sky-800'
            }`}>
              {info.occupantAgent.state}
            </span>
          </div>
          <div className={`flex justify-between text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            <span>Battery: {Math.round(info.occupantAgent.battery)}%</span>
            <span>Task: {info.occupantAgent.currentTaskId || 'None'}</span>
          </div>
        </div>
      ) : (
        <div className={`p-2.5 rounded-2xl border text-center text-[11px] font-mono text-slate-400 ${
          isDarkMode ? 'bg-[#1E293B]/50 border-slate-800' : 'bg-[#F8FAFC] border-slate-100'
        }`}>
          Cell is currently vacant
        </div>
      )}
    </div>
  );
};
