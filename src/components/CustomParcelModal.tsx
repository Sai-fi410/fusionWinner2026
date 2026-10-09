import React, { useState } from 'react';
import { X, Package, Sliders, CheckCircle2 } from 'lucide-react';

interface CustomParcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCount: number;
  onApplyCustomQueue: (count: number) => void;
  stationCount: number;
}

export const CustomParcelModal: React.FC<CustomParcelModalProps> = ({
  isOpen,
  onClose,
  currentCount,
  onApplyCustomQueue,
  stationCount,
}) => {
  const [parcels, setParcels] = useState<number>(currentCount);

  if (!isOpen) return null;

  const handleApply = () => {
    onApplyCustomQueue(parcels);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-[36px] shadow-[0_20px_60px_rgba(0,0,0,0.1)] p-7 flex flex-col gap-5 text-slate-800 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-base text-slate-900">
                Custom Parcel Queue
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Set parcels to be placed at each pick induction station
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Slider Section - Rounded 3xl */}
        <div className="flex flex-col gap-3 bg-[#F8FAFC] p-4.5 rounded-3xl border border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              PARCELS PER PICK STATION
            </span>
            <span className="font-mono font-bold text-xs text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
              {parcels} BOXES
            </span>
          </div>

          <input
            type="range"
            min="1"
            max="15"
            value={parcels}
            onChange={(e) => setParcels(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 rounded-full"
          />

          <div className="flex justify-between text-[11px] font-mono text-slate-400">
            <span>1 Light</span>
            <span>5 Standard</span>
            <span>15 Heavy Load</span>
          </div>
        </div>

        {/* Calculation summary */}
        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-100">
            <span className="text-slate-400 text-[10px] block">PICK STATIONS</span>
            <span className="font-bold text-slate-800 text-sm">{stationCount} Induction Bays</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-100">
            <span className="text-slate-400 text-[10px] block">TOTAL QUEUED CARGO</span>
            <span className="font-bold text-amber-700 text-sm">{parcels * stationCount} Parcels</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed font-sans">
          When robots retrieve a package from any station, one box will visually pop off the physical queue on the grid.
        </p>

        {/* Action Buttons - Rounded Full */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-6 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Apply Custom Queue</span>
          </button>
        </div>
      </div>
    </div>
  );
};
