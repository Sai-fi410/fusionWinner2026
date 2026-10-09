import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cpu, 
  Sparkles, 
  Radio, 
  Zap, 
  Activity, 
  CheckCircle2,
  Clock
} from 'lucide-react';

interface HardwareEdgePanelProps {
  isOpen: boolean;
  onClose: () => void;
  robotState?: any;
  csvRows?: any[];
  isConnected?: boolean;
  onDownloadCsv?: () => void;
  onResetCsv?: () => void;
  onSendCommand?: (cmd: string, speed?: number, durationMs?: number) => void;
  onInjectObstacle?: () => void;
  onResetPosition?: () => void;
}

export const HardwareEdgePanel: React.FC<HardwareEdgePanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeCell, setActiveCell] = useState<{ x: number; y: number }>({ x: 2, y: 2 });
  const [scanTick, setScanTick] = useState<number>(0);
  const [clickedCell, setClickedCell] = useState<string | null>(null);

  // Animated 5x5 radar scan pulse
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setScanTick(prev => (prev + 1) % 25);
    }, 400);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-2xl bg-white/98 border border-white/80 rounded-[36px] shadow-[0_20px_70px_rgba(0,0,0,0.12)] p-7 sm:p-9 flex flex-col items-center gap-6 relative overflow-hidden text-slate-800 transition-all">
        
        {/* Subtle decorative background glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-gradient-to-br from-sky-200/50 via-purple-200/30 to-emerald-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-gradient-to-tr from-amber-200/40 via-sky-200/30 to-purple-200/40 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Pill Bar */}
        <div className="w-full flex items-center justify-between z-10">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100/90 border border-slate-200/80 text-xs font-semibold text-slate-600 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-700">ESP32 Hardware Twin</span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] text-slate-500">5x5 Edge Matrix</span>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Center Banner: EXACT MESSAGE REQUESTED BY USER */}
        <div className="flex flex-col items-center text-center gap-3 z-10 max-w-lg">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25 border-2 border-white">
            <Cpu className="w-7 h-7 text-white animate-pulse" />
          </div>

          <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight leading-snug">
            connecting soon judges, we are making something crazy so its taking little more time, stay tuned!!!!!
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 font-sans leading-relaxed">
            Our ESP32 dual gear-motor &amp; ultrasonic servo sensor mesh is synchronizing live coordinates. Explore the interactive 5×5 hardware grid below!
          </p>
        </div>

        {/* THE 5x5 INTERACTIVE HARDWARE GRID - ZERO SHARP EDGES */}
        <div className="z-10 flex flex-col items-center gap-2">
          <div className="p-4 rounded-[28px] bg-slate-50/90 border border-slate-200/70 shadow-inner">
            <div className="grid grid-cols-5 gap-2.5 sm:gap-3">
              {Array.from({ length: 25 }).map((_, idx) => {
                const x = idx % 5;
                const y = Math.floor(idx / 5);
                const isCenter = x === 2 && y === 2;
                const isScanning = scanTick === idx;
                const isClicked = clickedCell === `${x},${y}`;

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveCell({ x, y });
                      setClickedCell(`${x},${y}`);
                      setTimeout(() => setClickedCell(null), 1200);
                    }}
                    className={`w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 font-mono text-[10px] relative cursor-pointer active:scale-90 ${
                      isCenter
                        ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white font-bold shadow-md shadow-sky-500/30 border border-sky-400 scale-105'
                        : isScanning || isClicked
                        ? 'bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/30 scale-105 border border-emerald-400'
                        : activeCell.x === x && activeCell.y === y
                        ? 'bg-purple-100 border-2 border-purple-400 text-purple-800 font-bold'
                        : 'bg-white hover:bg-slate-100/90 border border-slate-200/80 text-slate-500 hover:text-slate-800 shadow-xs'
                    }`}
                    title={`Grid Node (${x}, ${y})`}
                  >
                    <span className="text-[10px]">{x},{y}</span>
                    {isCenter && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping absolute -top-1 -right-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Cell Info Pill */}
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mt-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Active Probe Node: <strong className="text-slate-800 font-bold">({activeCell.x}, {activeCell.y})</strong> • 20 Hz Wi-Fi Sweep</span>
          </div>
        </div>

        {/* Bottom Action Pill */}
        <div className="z-10 w-full flex items-center justify-center pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <span>Return to Warehouse Dashboard</span>
          </button>
        </div>

      </div>
    </div>
  );
};
