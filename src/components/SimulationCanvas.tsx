import React, { useRef, useEffect, useState, useCallback } from 'react';
import { SwarmManager } from '../engine/swarmManager';
import { Agent, ToolMode, CellInspectionInfo } from '../types/simulation';
import { GRID_WIDTH, GRID_HEIGHT } from '../engine/grid';
import { Play, Pause, X } from 'lucide-react';

interface SimulationCanvasProps {
  manager: SwarmManager;
  selectedAgent: Agent | null;
  onSelectAgent: (agent: Agent | null) => void;
  selectedCell: CellInspectionInfo | null;
  onSelectCell: (cell: CellInspectionInfo | null) => void;
  toolMode: ToolMode;
  onSetToolMode: (mode: ToolMode) => void;
  showHeatmap: boolean;
  showPathVectors: boolean;
  showCommRings: boolean;
  isRunning: boolean;
  onTogglePlay: () => void;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  manager,
  selectedAgent,
  onSelectAgent,
  selectedCell,
  onSelectCell,
  toolMode,
  onSetToolMode,
  showHeatmap,
  showPathVectors,
  showCommRings,
  isRunning,
  onTogglePlay,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);
  const [showPauseToast, setShowPauseToast] = useState<boolean>(true);

  // Subpixel render interpolation with NaN guards
  const interpolatedAgents = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Main 60 FPS Render Loop
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const cellSize = width / GRID_WIDTH;

      // 1. Clear background (Clean light gray architectural drafting theme)
      ctx.fillStyle = '#F8FAFC'; // Tailwind slate-50
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Clean Grid Lines
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)'; // slate-300 light
      ctx.lineWidth = 1;
      for (let x = 0; x <= GRID_WIDTH; x++) {
        ctx.beginPath();
        ctx.moveTo(x * cellSize, 0);
        ctx.lineTo(x * cellSize, height);
        ctx.stroke();
      }
      for (let y = 0; y <= GRID_HEIGHT; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * cellSize);
        ctx.lineTo(width, y * cellSize);
        ctx.stroke();
      }

      // 3. Draw Static Warehouse Infrastructure
      const grid = manager.layout.grid;
      for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
          const type = grid[y][x];
          const px = x * cellSize;
          const py = y * cellSize;

          if (type === 'RACK') {
            // Storage Pod (Crisp modular slate racks)
            ctx.fillStyle = '#334155'; // slate-700
            ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
            ctx.strokeStyle = '#1E293B'; // slate-800
            ctx.lineWidth = 1.2;
            ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4);

            // Tech rack vents / shelf lines
            ctx.fillStyle = 'rgba(226, 232, 240, 0.25)';
            ctx.fillRect(px + 5, py + 6, cellSize - 10, 2);
            ctx.fillRect(px + 5, py + 12, cellSize - 10, 2);
          } else if (type === 'PICK_STATION') {
            // Pick Bay (Clean amber induction bay)
            ctx.fillStyle = '#FFF7ED'; // orange-50
            ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
            ctx.strokeStyle = '#EA580C'; // orange-600
            ctx.lineWidth = 1.5;
            ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

            ctx.fillStyle = '#C2410C';
            ctx.font = 'bold 9px monospace';
            ctx.fillText('PICK', px + 4, py + cellSize / 2 + 3);
          } else if (type === 'DROP_BAY') {
            // Drop Bay (Soft lavender packing bay)
            ctx.fillStyle = '#FAF5FF'; // purple-50
            ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
            ctx.strokeStyle = '#9333EA'; // purple-600
            ctx.lineWidth = 1.5;
            ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

            ctx.fillStyle = '#7E22CE';
            ctx.font = 'bold 9px monospace';
            ctx.fillText('PACK', px + 4, py + cellSize / 2 + 3);
          } else if (type === 'CHARGING_DOCK') {
            // Charging Dock (Soft blue inductive pad)
            ctx.fillStyle = '#F0F9FF'; // sky-50
            ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
            ctx.strokeStyle = '#0284C7'; // sky-600
            ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4);

            ctx.fillStyle = '#0369A1';
            ctx.font = 'bold 9px monospace';
            ctx.fillText('PWR', px + 5, py + cellSize / 2 + 3);
          } else if (type === 'RECESS_BAY') {
            // Recess / Deadlock Yield Bay (Soft mint alcove)
            ctx.fillStyle = '#F0FDF4'; // emerald-50
            ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
            ctx.strokeStyle = '#059669'; // emerald-600
            ctx.setLineDash([2, 2]);
            ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
            ctx.setLineDash([]);
          } else if (type === 'OBSTACLE') {
            // Dynamic Blockage (Light red hazard box with red cross)
            ctx.fillStyle = '#FEE2E2'; // red-100
            ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
            ctx.strokeStyle = '#DC2626'; // red-600
            ctx.lineWidth = 2;
            ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

            ctx.beginPath();
            ctx.moveTo(px + 4, py + 4);
            ctx.lineTo(px + cellSize - 4, py + cellSize - 4);
            ctx.moveTo(px + cellSize - 4, py + 4);
            ctx.lineTo(px + 4, py + cellSize - 4);
            ctx.stroke();
          }
        }
      }

      // 4. Draw Graphical Parcel Queues at Pick Stations (Left Margin)
      for (const pick of manager.layout.pickStations) {
        const qCount = manager.stationQueues.get(`${pick.x},${pick.y}`) || 0;
        const px = 0 * cellSize; // Column 0 on left
        const py = pick.y * cellSize;

        if (qCount > 0) {
          // Draw mini stack of isometric cargo boxes
          const boxCount = Math.min(4, qCount);
          for (let b = 0; b < boxCount; b++) {
            const bx = px + 6 + (b % 2) * 11;
            const by = py + 6 + Math.floor(b / 2) * 11;

            ctx.fillStyle = '#D97706'; // Kraft parcel cardboard
            ctx.fillRect(bx, by, 9, 9);
            ctx.strokeStyle = '#B45309';
            ctx.lineWidth = 1;
            ctx.strokeRect(bx, by, 9, 9);

            // Package tape stripe
            ctx.fillStyle = '#FDE047';
            ctx.fillRect(bx + 3, by, 3, 9);
          }

          // Count badge
          ctx.fillStyle = '#EA580C';
          ctx.font = 'bold 8px monospace';
          ctx.fillText(`x${qCount}`, px + 2, py + cellSize - 2);
        }
      }

      // 5. Draw Dynamic Congestion Heatmap Overlay
      if (showHeatmap) {
        for (let y = 0; y < GRID_HEIGHT; y++) {
          for (let x = 0; x < GRID_WIDTH; x++) {
            const count = manager.heatmap[y][x];
            if (count > 0) {
              const alpha = Math.min(0.55, count / 25);
              const px = x * cellSize;
              const py = y * cellSize;
              if (count > 15) {
                ctx.fillStyle = `rgba(220, 38, 38, ${alpha})`; // Red
              } else if (count > 6) {
                ctx.fillStyle = `rgba(217, 119, 6, ${alpha})`; // Amber
              } else {
                ctx.fillStyle = `rgba(16, 185, 129, ${alpha})`; // Emerald
              }
              ctx.fillRect(px, py, cellSize, cellSize);
            }
          }
        }
      }

      // 6. Draw Planned Path Vectors
      if (showPathVectors) {
        for (const agent of manager.agents) {
          if (agent.path.length > 0 && agent.state !== 'CRITICAL_FAILURE') {
            const color = agent.priority === 'EXPRESS' ? '#CA8A04' : '#0284C7';
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(agent.x * cellSize + cellSize / 2, agent.y * cellSize + cellSize / 2);
            for (const step of agent.path) {
              ctx.lineTo(step.x * cellSize + cellSize / 2, step.y * cellSize + cellSize / 2);
            }
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }

      // 7. Draw Robots (New Appearance: 1 Wheel, 1 Eye, Articulated Arms holding parcel)
      for (const agent of manager.agents) {
        // Safe Subpixel Interpolation (Guarded against NaN)
        const targetX = Number.isFinite(agent.x) ? agent.x : 2;
        const targetY = Number.isFinite(agent.y) ? agent.y : 2;

        let prev = interpolatedAgents.current.get(agent.id);
        if (!prev || !Number.isFinite(prev.x) || !Number.isFinite(prev.y)) {
          prev = { x: targetX, y: targetY };
        }

        const lerpFactor = 0.28;
        const currentInterp = {
          x: prev.x + (targetX - prev.x) * lerpFactor,
          y: prev.y + (targetY - prev.y) * lerpFactor
        };
        interpolatedAgents.current.set(agent.id, currentInterp);

        const centerX = currentInterp.x * cellSize + cellSize / 2;
        const centerY = currentInterp.y * cellSize + cellSize / 2;
        const radius = cellSize * 0.38;

        // Semantic state color (Light/White theme optimized)
        let stateColor = '#0284C7'; // Blue Cruising
        if (agent.state === 'CARRYING_TASK') stateColor = '#059669'; // Emerald Carrying
        else if (agent.state === 'TOWING_RECOVERY') stateColor = '#EA580C'; // Orange Rescuer Towing
        else if (agent.state === 'PARKED_REPAIR') stateColor = '#64748B'; // Slate Parked Repair at Charging Dock
        else if (agent.state === 'IDLE') stateColor = '#D97706'; // Amber Idle
        else if (agent.state === 'CRITICAL_FAILURE') stateColor = '#DC2626'; // Red Failed
        else if (agent.state === 'CHARGING') stateColor = '#7C3AED'; // Purple Charging
        else if (agent.priority === 'EXPRESS') stateColor = '#CA8A04'; // Gold Priority

        // Draw physical dynamic tow cable if towing a disabled robot
        if (agent.towedAgentId) {
          const towedRobot = manager.agents.find(a => a.id === agent.towedAgentId);
          if (towedRobot) {
            const towedInterp = interpolatedAgents.current.get(towedRobot.id) || { x: towedRobot.x, y: towedRobot.y };
            const tx = towedInterp.x * cellSize + cellSize / 2;
            const ty = towedInterp.y * cellSize + cellSize / 2;
            ctx.save();
            ctx.strokeStyle = '#EA580C';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(tx, ty);
            ctx.stroke();
            ctx.restore();
          }
        }

        // Compact Proximity / Communication Ring
        if (showCommRings) {
          ctx.strokeStyle = stateColor;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Selected halo
        if (selectedAgent && selectedAgent.id === agent.id) {
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 2.2;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius + 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Target reticle if Kill Mode is active
        if (toolMode === 'KILL' && hoverCoord && hoverCoord.x === agent.x && hoverCoord.y === agent.y) {
          ctx.strokeStyle = '#DC2626';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius + 10, 0, Math.PI * 2);
          ctx.moveTo(centerX - radius - 14, centerY);
          ctx.lineTo(centerX + radius + 14, centerY);
          ctx.moveTo(centerX, centerY - radius - 14);
          ctx.lineTo(centerX, centerY + radius + 14);
          ctx.stroke();
        }

        ctx.save();
        ctx.translate(centerX, centerY);

        const w = radius * 1.35;
        const h = radius * 1.6;

        // --- 1. SINGLE WHEEL AT BASE ---
        ctx.fillStyle = '#0F172A'; // Dark tire rubber
        ctx.fillRect(-4, h * 0.36, 8, 5.5);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.strokeRect(-4, h * 0.36, 8, 5.5);

        // Center hubpin
        ctx.fillStyle = '#94A3B8';
        ctx.beginPath();
        ctx.arc(0, h * 0.36 + 2.75, 1.4, 0, Math.PI * 2);
        ctx.fill();

        // --- 2. CHASSIS BODY (Sleek White/Silver Capsule) ---
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = stateColor;
        ctx.lineWidth = 2;

        ctx.beginPath();
        // Dome head
        ctx.arc(0, -h * 0.22, w * 0.5, Math.PI, 0, false);
        // Right side
        ctx.lineTo(w * 0.5, h * 0.32);
        // Rounded bottom base
        ctx.arcTo(w * 0.5, h * 0.38, 0, h * 0.38, 3);
        ctx.arcTo(-w * 0.5, h * 0.38, -w * 0.5, h * 0.32, 3);
        ctx.lineTo(-w * 0.5, -h * 0.22);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // --- 3. SINGLE CYCLOPS OPTICAL EYE ---
        const eyeOffset = 2.2;
        const eyeX = Math.cos(agent.heading) * eyeOffset;
        const eyeY = -h * 0.18 + Math.sin(agent.heading) * eyeOffset;

        // Outer sensor bezel
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 4.2, 0, Math.PI * 2);
        ctx.fill();

        // Glowing camera iris (state colored)
        ctx.fillStyle = stateColor;
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 2.8, 0, Math.PI * 2);
        ctx.fill();

        // Center pupil
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Specular highlight
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(eyeX - 0.8, eyeY - 0.8, 0.7, 0, Math.PI * 2);
        ctx.fill();

        // --- 4. ARTICULATED MECHANICAL ARMS ---
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';

        if (agent.state === 'CARRYING_TASK') {
          // ARMS RAISED HOLDING PARCEL IN HANDS!
          // Left Arm gripping parcel
          ctx.beginPath();
          ctx.moveTo(-w * 0.45, -h * 0.02);
          ctx.lineTo(-w * 0.32, -h * 0.38);
          ctx.lineTo(-w * 0.12, -h * 0.42);
          ctx.stroke();

          // Right Arm gripping parcel
          ctx.beginPath();
          ctx.moveTo(w * 0.45, -h * 0.02);
          ctx.lineTo(w * 0.32, -h * 0.38);
          ctx.lineTo(w * 0.12, -h * 0.42);
          ctx.stroke();

          // Parcel Box held in hands
          ctx.fillStyle = '#D97706'; // Kraft Cardboard
          ctx.fillRect(-5.5, -h * 0.65, 11, 10);
          ctx.strokeStyle = '#B45309';
          ctx.lineWidth = 1;
          ctx.strokeRect(-5.5, -h * 0.65, 11, 10);

          // Parcel tape stripe
          ctx.fillStyle = '#FDE047';
          ctx.fillRect(-1.5, -h * 0.65, 3, 10);
        } else {
          // ARMS DOWN AT SIDES (IDLE / CRUISING)
          // Left Arm down
          ctx.beginPath();
          ctx.moveTo(-w * 0.48, -h * 0.05);
          ctx.lineTo(-w * 0.48, h * 0.28);
          ctx.lineTo(-w * 0.35, h * 0.32);
          ctx.stroke();

          // Right Arm down
          ctx.beginPath();
          ctx.moveTo(w * 0.48, -h * 0.05);
          ctx.lineTo(w * 0.48, h * 0.28);
          ctx.lineTo(w * 0.35, h * 0.32);
          ctx.stroke();
        }

        // --- 5. BLOCKED ROUTE ALERT SIGN ---
        if (agent.isRouteBlocked) {
          ctx.fillStyle = '#DC2626';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('BLOCKED', 0, -h * 0.85);

          ctx.fillStyle = '#EF4444';
          ctx.beginPath();
          ctx.arc(0, -h * 0.85 - 7, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.textAlign = 'start';
        } else if (agent.state === 'TOWING_RECOVERY') {
          ctx.fillStyle = '#EA580C';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(agent.towedAgentId ? 'TOWING' : 'RESCUING', 0, -h * 0.85);
          ctx.textAlign = 'start';
        } else if (agent.state === 'PARKED_REPAIR') {
          ctx.fillStyle = '#64748B';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('PARKED', 0, -h * 0.85);
          ctx.textAlign = 'start';
        } else if (agent.towedByAgentId) {
          ctx.fillStyle = '#DC2626';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('TOWED', 0, -h * 0.85);
          ctx.textAlign = 'start';
        }

        ctx.restore();
      }

      // 8. Hover Reticle & Selected Cell Halo
      if (hoverCoord) {
        ctx.strokeStyle = toolMode === 'OBSTACLE' ? 'rgba(220, 38, 38, 0.7)' : 'rgba(2, 132, 199, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(
          hoverCoord.x * cellSize + 1,
          hoverCoord.y * cellSize + 1,
          cellSize - 2,
          cellSize - 2
        );
      }

      if (selectedCell) {
        ctx.strokeStyle = '#0284C7';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          selectedCell.x * cellSize + 1,
          selectedCell.y * cellSize + 1,
          cellSize - 2,
          cellSize - 2
        );
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [manager, selectedAgent, selectedCell, showHeatmap, showPathVectors, showCommRings, hoverCoord, toolMode]);

  // Click Handler based on Tool Mode
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const xRatio = canvas.width / rect.width;
    const yRatio = canvas.height / rect.height;
    const clientX = (e.clientX - rect.left) * xRatio;
    const clientY = (e.clientY - rect.top) * yRatio;

    const cellSize = canvas.width / GRID_WIDTH;
    const gridX = Math.floor(clientX / cellSize);
    const gridY = Math.floor(clientY / cellSize);

    if (gridX < 0 || gridX >= GRID_WIDTH || gridY < 0 || gridY >= GRID_HEIGHT) return;

    // 1. KILL AGENT TOOL
    if (toolMode === 'KILL') {
      const clickedAgent = manager.agents.find(a => a.x === gridX && a.y === gridY);
      if (clickedAgent) {
        manager.killAgent(clickedAgent.id);
        onSelectAgent(clickedAgent);
        onSetToolMode('INSPECT');
      }
      return;
    }

    // 2. ADD OBSTACLE TOOL (Only adds obstacle when this mode is active!)
    if (toolMode === 'OBSTACLE') {
      manager.toggleObstacle(gridX, gridY);
      return;
    }

    // 3. DEFAULT INSPECT TOOL
    const clickedAgent = manager.agents.find(a => a.x === gridX && a.y === gridY);
    if (clickedAgent) {
      onSelectAgent(clickedAgent);
      onSelectCell(null);
    } else {
      onSelectAgent(null);
      onSelectCell(manager.inspectCell(gridX, gridY));
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const xRatio = canvas.width / rect.width;
    const yRatio = canvas.height / rect.height;
    const clientX = (e.clientX - rect.left) * xRatio;
    const clientY = (e.clientY - rect.top) * yRatio;

    const cellSize = canvas.width / GRID_WIDTH;
    const gridX = Math.floor(clientX / cellSize);
    const gridY = Math.floor(clientY / cellSize);

    if (gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT) {
      setHoverCoord({ x: gridX, y: gridY });
    } else {
      setHoverCoord(null);
    }
  };

  // Cursor style based on active tool
  const getCursorClass = () => {
    if (toolMode === 'KILL') {
      return "cursor-[url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"28\" height=\"28\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%23DC2626\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m14.5 4.5 5 5L7 22l-5-5L14.5 4.5z\"/><path d=\"m18.5 8.5-3-3\"/></svg>'),_crosshair]";
    }
    if (toolMode === 'OBSTACLE') {
      return "cursor-crosshair";
    }
    return "cursor-pointer";
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center p-2">
      <canvas
        ref={canvasRef}
        width={1280}
        height={800}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverCoord(null)}
        className={`w-full h-auto max-h-[82vh] rounded-[28px] border border-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.04)] object-contain bg-white ${getCursorClass()}`}
      />

      {/* COMPACT FLOATING PAUSE TOAST WITH 'X' CLOSE BUTTON - ZERO SHARP EDGES */}
      {!isRunning && showPauseToast && (
        <div className="absolute top-4 right-6 z-20 flex items-center gap-3 px-5 py-3 rounded-full bg-white/95 border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.06)] backdrop-blur-md transition-all">
          <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Pause className="w-4 h-4 fill-current" />
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-bold font-mono text-slate-800">
              SWARM IN STANDBY
            </span>
            <span className="text-[10px] text-slate-500 font-sans">
              Robots waiting for start signal
            </span>
          </div>

          <button
            onClick={onTogglePlay}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs shadow-md shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer ml-1"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>START</span>
          </button>

          <button
            onClick={() => setShowPauseToast(false)}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors ml-1 cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
