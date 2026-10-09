import React, { useRef, useEffect, useState } from 'react';
import { SwarmManager } from '../engine/swarmManager';
import { Agent, ToolMode, CellInspectionInfo, CanvasViewMode } from '../types/simulation';
import { GRID_WIDTH, GRID_HEIGHT } from '../engine/grid';
import { Play, Pause, X, Layers, Box } from 'lucide-react';

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
  viewMode: CanvasViewMode;
  onToggleViewMode?: () => void;
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
  viewMode = '2D',
  onToggleViewMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);
  const [showPauseToast, setShowPauseToast] = useState<boolean>(true);

  // Subpixel render interpolation with NaN guards
  const interpolatedAgents = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Main 60 FPS Render Loop supporting both 2D and 3D Isometric View
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
      const now = performance.now();
      const layout = manager.layout;
      const grid = layout.grid;

      // ==========================================
      // MODE 1: 3D ISOMETRIC WAREHOUSE SIMULATION
      // ==========================================
      if (viewMode === '3D') {
        const isoOriginX = width * 0.5;
        const isoOriginY = height * 0.16;
        const isoTileW = width / 34;
        const isoTileH = isoTileW * 0.52;

        const toIso = (gx: number, gy: number, gz: number = 0) => ({
          x: isoOriginX + (gx - gy) * (isoTileW * 0.5),
          y: isoOriginY + (gx + gy) * (isoTileH * 0.5) - gz
        });

        // 1. Clear background (High-tech drafting studio)
        ctx.fillStyle = '#CBD5E1';
        ctx.fillRect(0, 0, width, height);

        // 2. Concrete Warehouse Perimeter Walls
        const wallH = 68;

        // Back Wall (along y = 0, x: 0 -> 32)
        const bwP0 = toIso(0, 0, 0);
        const bwP1 = toIso(GRID_WIDTH, 0, 0);
        const bwT0 = toIso(0, 0, wallH);
        const bwT1 = toIso(GRID_WIDTH, 0, wallH);

        ctx.fillStyle = '#94A3B8'; // Concrete back wall
        ctx.beginPath();
        ctx.moveTo(bwP0.x, bwP0.y);
        ctx.lineTo(bwP1.x, bwP1.y);
        ctx.lineTo(bwT1.x, bwT1.y);
        ctx.lineTo(bwT0.x, bwT0.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#64748B';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Left Wall (along x = 0, y: 0 -> 20)
        const lwP1 = toIso(0, GRID_HEIGHT, 0);
        const lwT1 = toIso(0, GRID_HEIGHT, wallH);

        ctx.fillStyle = '#64748B'; // Concrete side wall (shaded darker)
        ctx.beginPath();
        ctx.moveTo(bwP0.x, bwP0.y);
        ctx.lineTo(lwP1.x, lwP1.y);
        ctx.lineTo(lwT1.x, lwT1.y);
        ctx.lineTo(bwT0.x, bwT0.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.stroke();

        // 3. Concrete Floor Diamond Plane
        const flP0 = toIso(0, 0, 0);
        const flP1 = toIso(GRID_WIDTH, 0, 0);
        const flP2 = toIso(GRID_WIDTH, GRID_HEIGHT, 0);
        const flP3 = toIso(0, GRID_HEIGHT, 0);

        ctx.fillStyle = '#E2E8F0';
        ctx.beginPath();
        ctx.moveTo(flP0.x, flP0.y);
        ctx.lineTo(flP1.x, flP1.y);
        ctx.lineTo(flP2.x, flP2.y);
        ctx.lineTo(flP3.x, flP3.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Subtle floor diamond tiles
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.7)';
        ctx.lineWidth = 0.8;
        for (let x = 0; x <= GRID_WIDTH; x += 2) {
          const s = toIso(x, 0, 0);
          const e = toIso(x, GRID_HEIGHT, 0);
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(e.x, e.y);
          ctx.stroke();
        }
        for (let y = 0; y <= GRID_HEIGHT; y += 2) {
          const s = toIso(0, y, 0);
          const e = toIso(GRID_WIDTH, y, 0);
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(e.x, e.y);
          ctx.stroke();
        }

        // 4. Yellow Guide Aisle Paths on 3D Ground Plane
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';

        const hAisleYs = [6.5, 10.5, 14.5];
        for (const hy of hAisleYs) {
          const pS = toIso(5, hy, 0);
          const pE = toIso(27, hy, 0);
          ctx.beginPath();
          ctx.moveTo(pS.x, pS.y);
          ctx.lineTo(pE.x, pE.y);
          ctx.stroke();
        }

        const vAisleXs = [6.5, 14.5, 18.5, 23.5, 27.5];
        for (const vx of vAisleXs) {
          const pS = toIso(vx, 3, 0);
          const pE = toIso(vx, 17, 0);
          ctx.beginPath();
          ctx.moveTo(pS.x, pS.y);
          ctx.lineTo(pE.x, pE.y);
          ctx.stroke();
        }

        // Cyan Waypoint Discs on 3D Ground Plane
        if (layout.waypoints) {
          for (const wp of layout.waypoints) {
            const p = toIso(wp.x + 0.5, wp.y + 0.5, 0);
            ctx.fillStyle = '#06B6D4';
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, 4.5, 2.4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }

        // 5. Painter's Sorting: Sort all 3D entities by Depth (x + y)
        type RenderItem = 
          | { kind: 'RACK'; x: number; y: number; depth: number }
          | { kind: 'OBSTACLE'; x: number; y: number; depth: number }
          | { kind: 'CHARGING'; x: number; y: number; depth: number }
          | { kind: 'DROPPED'; dp: any; depth: number }
          | { kind: 'AGENT'; agent: Agent; depth: number };

        const items: RenderItem[] = [];

        for (let y = 0; y < GRID_HEIGHT; y++) {
          for (let x = 0; x < GRID_WIDTH; x++) {
            const cellType = grid[y][x];
            if (cellType === 'RACK') items.push({ kind: 'RACK', x, y, depth: x + y });
            else if (cellType === 'OBSTACLE') items.push({ kind: 'OBSTACLE', x, y, depth: x + y });
            else if (cellType === 'CHARGING_DOCK') items.push({ kind: 'CHARGING', x, y, depth: x + y });
          }
        }

        for (const dp of manager.droppedParcels) {
          items.push({ kind: 'DROPPED', dp, depth: dp.x + dp.y + 0.2 });
        }

        for (const agent of manager.agents) {
          const targetX = Number.isFinite(agent.x) ? agent.x : 2;
          const targetY = Number.isFinite(agent.y) ? agent.y : 2;
          let prev = interpolatedAgents.current.get(agent.id) || { x: targetX, y: targetY };
          const interp = {
            x: prev.x + (targetX - prev.x) * 0.28,
            y: prev.y + (targetY - prev.y) * 0.28
          };
          interpolatedAgents.current.set(agent.id, interp);
          items.push({ kind: 'AGENT', agent, depth: interp.x + interp.y + 0.5 });
        }

        items.sort((a, b) => a.depth - b.depth);

        // 6. Render 3D Entities Back-to-Front
        for (const item of items) {
          if (item.kind === 'RACK') {
            const rx = item.x;
            const ry = item.y;
            const rH = 32;

            const p0 = toIso(rx, ry, 0);
            const p1 = toIso(rx + 1, ry, 0);
            const p2 = toIso(rx + 1, ry + 1, 0);
            const p3 = toIso(rx, ry + 1, 0);

            const t0 = toIso(rx, ry, rH);
            const t1 = toIso(rx + 1, ry, rH);
            const t2 = toIso(rx + 1, ry + 1, rH);
            const t3 = toIso(rx, ry + 1, rH);

            // Left-Front Face (shaded Kraft)
            ctx.fillStyle = '#B45309';
            ctx.beginPath();
            ctx.moveTo(p3.x, p3.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(t2.x, t2.y);
            ctx.lineTo(t3.x, t3.y);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#78350F';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Right-Front Face (shaded darker)
            ctx.fillStyle = '#92400E';
            ctx.beginPath();
            ctx.moveTo(p2.x, p2.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.lineTo(t1.x, t1.y);
            ctx.lineTo(t2.x, t2.y);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#78350F';
            ctx.stroke();

            // Top Face (lighter Kraft with parcel tape)
            ctx.fillStyle = '#D97706';
            ctx.beginPath();
            ctx.moveTo(t0.x, t0.y);
            ctx.lineTo(t1.x, t1.y);
            ctx.lineTo(t2.x, t2.y);
            ctx.lineTo(t3.x, t3.y);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#B45309';
            ctx.stroke();

            // Box partition tape
            ctx.strokeStyle = '#FDE047';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo((t0.x + t3.x) / 2, (t0.y + t3.y) / 2);
            ctx.lineTo((t1.x + t2.x) / 2, (t1.y + t2.y) / 2);
            ctx.stroke();
          } else if (item.kind === 'OBSTACLE') {
            // 3D Green Obstacle Cube (from Reference Image)
            const ox = item.x;
            const oy = item.y;
            const oH = 16;

            const p1 = toIso(ox + 1, oy, 0);
            const p2 = toIso(ox + 1, oy + 1, 0);
            const p3 = toIso(ox, oy + 1, 0);

            const t0 = toIso(ox, oy, oH);
            const t1 = toIso(ox + 1, oy, oH);
            const t2 = toIso(ox + 1, oy + 1, oH);
            const t3 = toIso(ox, oy + 1, oH);

            // Left face
            ctx.fillStyle = '#16A34A';
            ctx.beginPath();
            ctx.moveTo(p3.x, p3.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(t2.x, t2.y);
            ctx.lineTo(t3.x, t3.y);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#14532D';
            ctx.stroke();

            // Right face
            ctx.fillStyle = '#15803D';
            ctx.beginPath();
            ctx.moveTo(p2.x, p2.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.lineTo(t1.x, t1.y);
            ctx.lineTo(t2.x, t2.y);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#14532D';
            ctx.stroke();

            // Top face
            ctx.fillStyle = '#22C55E';
            ctx.beginPath();
            ctx.moveTo(t0.x, t0.y);
            ctx.lineTo(t1.x, t1.y);
            ctx.lineTo(t2.x, t2.y);
            ctx.lineTo(t3.x, t3.y);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#16A34A';
            ctx.stroke();
          } else if (item.kind === 'DROPPED') {
            // 3D Dropped Crate on Floor
            const dp = item.dp;
            const dH = 12;
            const p0 = toIso(dp.x + 0.2, dp.y + 0.2, 0);
            const p1 = toIso(dp.x + 0.8, dp.y + 0.2, 0);
            const p2 = toIso(dp.x + 0.8, dp.y + 0.8, 0);
            const p3 = toIso(dp.x + 0.2, dp.y + 0.8, 0);

            const t0 = toIso(dp.x + 0.2, dp.y + 0.2, dH);
            const t1 = toIso(dp.x + 0.8, dp.y + 0.2, dH);
            const t2 = toIso(dp.x + 0.8, dp.y + 0.8, dH);
            const t3 = toIso(dp.x + 0.2, dp.y + 0.8, dH);

            ctx.fillStyle = '#B45309';
            ctx.beginPath();
            ctx.moveTo(p3.x, p3.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(t2.x, t2.y);
            ctx.lineTo(t3.x, t3.y);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#D97706';
            ctx.beginPath();
            ctx.moveTo(t0.x, t0.y);
            ctx.lineTo(t1.x, t1.y);
            ctx.lineTo(t2.x, t2.y);
            ctx.lineTo(t3.x, t3.y);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#FDE047';
            ctx.lineWidth = 1;
            ctx.stroke();
          } else if (item.kind === 'AGENT') {
            const agent = item.agent;
            const interp = interpolatedAgents.current.get(agent.id) || { x: agent.x, y: agent.y };
            const pBase = toIso(interp.x + 0.5, interp.y + 0.5, 0);

            // Ground Radar Rippling Ring (projected into 3D ellipse on ground plane)
            if (showCommRings && agent.state !== 'CRITICAL_FAILURE' && agent.state !== 'PARKED_REPAIR') {
              const rPhase = (now % 1600) / 1600;
              const rPhase2 = ((now + 800) % 1600) / 1600;
              const rx1 = 14 + rPhase * 16;
              const ry1 = rx1 * 0.52;
              const rx2 = 14 + rPhase2 * 16;
              const ry2 = rx2 * 0.52;

              const isHazard = Boolean(agent.isNearHazard);
              const ringCol = isHazard ? 'rgba(220, 80, 80, 0.45)' : 'rgba(56, 189, 248, 0.35)';

              ctx.strokeStyle = ringCol;
              ctx.lineWidth = 1.3;
              ctx.beginPath();
              ctx.ellipse(pBase.x, pBase.y, rx1, ry1, 0, 0, Math.PI * 2);
              ctx.stroke();
              ctx.beginPath();
              ctx.ellipse(pBase.x, pBase.y, rx2, ry2, 0, 0, Math.PI * 2);
              ctx.stroke();
            }

            // 3D Tow Cable
            if (agent.towedAgentId) {
              const towedRobot = manager.agents.find(a => a.id === agent.towedAgentId);
              if (towedRobot) {
                const towedInterp = interpolatedAgents.current.get(towedRobot.id) || { x: towedRobot.x, y: towedRobot.y };
                const tBase = toIso(towedInterp.x + 0.5, towedInterp.y + 0.5, 6);
                ctx.save();
                ctx.strokeStyle = '#F97316';
                ctx.lineWidth = 2.5;
                ctx.setLineDash([4, 3]);
                ctx.beginPath();
                ctx.moveTo(pBase.x, pBase.y - 6);
                ctx.lineTo(tBase.x, tBase.y);
                ctx.stroke();
                ctx.restore();
              }
            }

            // 3D AMR Robot Chassis
            const rH = 8;
            const rRadius = 11;
            const desat = agent.desaturation !== undefined ? agent.desaturation : (agent.state === 'CRITICAL_FAILURE' ? 1.0 : 0.0);

            // Shading
            const bodyColor = desat > 0.8 ? '#CBD5E1' : '#FFFFFF';
            const rimColor = desat > 0.8 ? '#64748B' : (agent.state === 'CARRYING_TASK' ? '#10B981' : '#0284C7');

            // 3D Cylinder / Rounded Block
            ctx.fillStyle = '#0F172A'; // Dark Base / Wheels
            ctx.beginPath();
            ctx.ellipse(pBase.x, pBase.y, rRadius + 1.5, (rRadius + 1.5) * 0.52, 0, 0, Math.PI * 2);
            ctx.fill();

            // Vertical Extrusion
            ctx.fillStyle = desat > 0.8 ? '#94A3B8' : '#E2E8F0';
            ctx.fillRect(pBase.x - rRadius, pBase.y - rH, rRadius * 2, rH);

            // Top Platform Plate
            ctx.fillStyle = bodyColor;
            ctx.strokeStyle = rimColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(pBase.x, pBase.y - rH, rRadius, rRadius * 0.52, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Optical Sensor at front
            ctx.fillStyle = rimColor;
            ctx.beginPath();
            ctx.arc(pBase.x + 3, pBase.y - rH, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // 3D Parcel Crate on Top if Carrying
            if (agent.state === 'CARRYING_TASK') {
              const cHeight = 14;
              const cW = 7;
              const cp0 = { x: pBase.x - cW, y: pBase.y - rH - 2 };
              const cp1 = { x: pBase.x + cW, y: pBase.y - rH - 2 };
              const cp2 = { x: pBase.x + cW, y: pBase.y - rH - cHeight };
              const cp3 = { x: pBase.x - cW, y: pBase.y - rH - cHeight };

              ctx.fillStyle = '#B45309';
              ctx.fillRect(cp0.x, cp3.y, cW * 2, cHeight);
              ctx.fillStyle = '#D97706';
              ctx.beginPath();
              ctx.ellipse(pBase.x, cp3.y, cW, cW * 0.5, 0, 0, Math.PI * 2);
              ctx.fill();

              // Parcel tape stripe
              ctx.fillStyle = '#FDE047';
              ctx.fillRect(pBase.x - 1.5, cp3.y - 1, 3, cHeight);
            }

            // Floating ID Label (A1, A2, etc.)
            const uName = agent.id.replace('AMR-', 'A').replace('FUS-HW-01', 'HW1');
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.strokeStyle = '#94A3B8';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(pBase.x - 10, pBase.y - rH - 24, 20, 11, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = desat > 0.8 ? '#64748B' : '#0F172A';
            ctx.font = 'bold 8px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(uName, pBase.x, pBase.y - rH - 16);
            ctx.textAlign = 'start';

            // 5s Charging Countdown in 3D
            if (agent.state === 'PARKED_REPAIR') {
              const secLeft = agent.repairCountdownSec !== undefined ? agent.repairCountdownSec.toFixed(1) : '5.0';
              ctx.fillStyle = '#7C3AED';
              ctx.font = 'bold 8px monospace';
              ctx.textAlign = 'center';
              ctx.fillText(`⚡ ${secLeft}s`, pBase.x, pBase.y - rH - 27);
              ctx.textAlign = 'start';
            }
          }
        }

        // 3D Hover & Selection Reticle
        if (hoverCoord) {
          const hp = toIso(hoverCoord.x + 0.5, hoverCoord.y + 0.5, 0);
          ctx.strokeStyle = toolMode === 'OBSTACLE' ? '#DC2626' : '#0284C7';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.ellipse(hp.x, hp.y, 16, 8, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // 3D Isometric View Mode Watermark Tag
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('3D ISOMETRIC VIEWPORT (SIMTOOL PERSPECTIVE)', 20, height - 20);

      } else {
        // ==========================================
        // MODE 2: 2D TACTICAL ORTHOGRAPHIC MAP
        // ==========================================

        // 1. Clear background (Industrial concrete warehouse floor #E2E8F0)
        ctx.fillStyle = '#CBD5E1';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#E2E8F0';
        ctx.fillRect(4, 4, width - 8, height - 8);

        // Grid joints
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.6)';
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

        // 2. Yellow Industrial Guide Aisles
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const horizontalAisleYs = [
          6 * cellSize + cellSize / 2,
          10 * cellSize + cellSize / 2,
          14 * cellSize + cellSize / 2
        ];
        for (const hy of horizontalAisleYs) {
          ctx.beginPath();
          ctx.moveTo(6 * cellSize, hy);
          ctx.lineTo(27 * cellSize, hy);
          ctx.stroke();
        }

        const verticalAisleXs = [
          6 * cellSize + cellSize / 2,
          14 * cellSize + cellSize / 2,
          18 * cellSize + cellSize / 2,
          23 * cellSize + cellSize / 2,
          27 * cellSize + cellSize / 2
        ];
        for (const vx of verticalAisleXs) {
          ctx.beginPath();
          ctx.moveTo(vx, 3 * cellSize);
          ctx.lineTo(vx, 17 * cellSize);
          ctx.stroke();
        }

        // 3. Static Infrastructure
        for (let y = 0; y < GRID_HEIGHT; y++) {
          for (let x = 0; x < GRID_WIDTH; x++) {
            const type = grid[y][x];
            const px = x * cellSize;
            const py = y * cellSize;

            if (type === 'RACK') {
              ctx.fillStyle = '#475569';
              ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
              ctx.fillStyle = '#D97706';
              ctx.fillRect(px + 3, py + 3, cellSize - 6, cellSize - 6);

              ctx.strokeStyle = '#B45309';
              ctx.lineWidth = 1.2;
              const half = (cellSize - 6) / 2;
              ctx.strokeRect(px + 3, py + 3, half, half);
              ctx.strokeRect(px + 3 + half, py + 3, half, half);
              ctx.strokeRect(px + 3, py + 3 + half, half, half);
              ctx.strokeRect(px + 3 + half, py + 3 + half, half, half);
            } else if (type === 'PICK_STATION') {
              ctx.fillStyle = '#FEF3C7';
              ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
              ctx.strokeStyle = '#D97706';
              ctx.lineWidth = 2;
              ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4);

              ctx.fillStyle = '#92400E';
              ctx.font = 'bold 9px monospace';
              ctx.fillText('PICK', px + 3, py + cellSize / 2 + 3);
            } else if (type === 'DROP_BAY') {
              ctx.fillStyle = '#EDE9FE';
              ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
              ctx.strokeStyle = '#7C3AED';
              ctx.lineWidth = 2;
              ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4);

              ctx.fillStyle = '#5B21B6';
              ctx.font = 'bold 9px monospace';
              ctx.fillText('PACK', px + 3, py + cellSize / 2 + 3);
            } else if (type === 'CHARGING_DOCK') {
              ctx.fillStyle = '#1E293B';
              ctx.fillRect(px + 3, py + 3, cellSize - 6, cellSize - 6);
              ctx.strokeStyle = '#FACC15';
              ctx.lineWidth = 1.5;
              ctx.strokeRect(px + 3, py + 3, cellSize - 6, cellSize - 6);

              ctx.fillStyle = '#FACC15';
              ctx.font = 'bold 12px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('⚡', px + cellSize / 2, py + cellSize / 2 + 4);
              ctx.textAlign = 'start';
            } else if (type === 'RECESS_BAY') {
              ctx.fillStyle = '#DCFCE7';
              ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
              ctx.strokeStyle = '#16A34A';
              ctx.setLineDash([3, 2]);
              ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
              ctx.setLineDash([]);
            } else if (type === 'OBSTACLE') {
              ctx.fillStyle = '#16A34A';
              ctx.fillRect(px + 5, py + 5, cellSize - 10, cellSize - 10);
              ctx.strokeStyle = '#14532D';
              ctx.lineWidth = 2;
              ctx.strokeRect(px + 5, py + 5, cellSize - 10, cellSize - 10);
            }
          }
        }

        // Cyan Waypoint Nodes
        if (layout.waypoints) {
          for (const wp of layout.waypoints) {
            const wpx = wp.x * cellSize + cellSize / 2;
            const wpy = wp.y * cellSize + cellSize / 2;

            ctx.fillStyle = '#06B6D4';
            ctx.beginPath();
            ctx.arc(wpx, wpy, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }

        // Dropped Parcels
        for (const dp of manager.droppedParcels) {
          const dpx = dp.x * cellSize + cellSize / 2;
          const dpy = dp.y * cellSize + cellSize / 2;

          ctx.save();
          ctx.translate(dpx, dpy);
          ctx.fillStyle = '#D97706';
          ctx.fillRect(-7, -7, 14, 14);
          ctx.strokeStyle = '#B45309';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-7, -7, 14, 14);

          ctx.fillStyle = '#FDE047';
          ctx.fillRect(-2, -7, 4, 14);
          ctx.restore();
        }

        // Planned Path Vectors
        if (showPathVectors) {
          for (const agent of manager.agents) {
            if (agent.path.length > 0 && agent.state !== 'CRITICAL_FAILURE') {
              const color = agent.priority === 'EXPRESS' ? '#CA8A04' : '#0284C7';
              ctx.strokeStyle = color;
              ctx.lineWidth = 1.8;
              ctx.setLineDash([4, 3]);
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

        // Draw 2D Robots
        for (const agent of manager.agents) {
          const targetX = Number.isFinite(agent.x) ? agent.x : 2;
          const targetY = Number.isFinite(agent.y) ? agent.y : 2;

          let prev = interpolatedAgents.current.get(agent.id) || { x: targetX, y: targetY };
          const interp = {
            x: prev.x + (targetX - prev.x) * 0.28,
            y: prev.y + (targetY - prev.y) * 0.28
          };
          interpolatedAgents.current.set(agent.id, interp);

          const centerX = interp.x * cellSize + cellSize / 2;
          const centerY = interp.y * cellSize + cellSize / 2;
          const radius = cellSize * 0.42;

          // Tow Cable
          if (agent.towedAgentId) {
            const towedRobot = manager.agents.find(a => a.id === agent.towedAgentId);
            if (towedRobot) {
              const tInterp = interpolatedAgents.current.get(towedRobot.id) || { x: towedRobot.x, y: towedRobot.y };
              const tx = tInterp.x * cellSize + cellSize / 2;
              const ty = tInterp.y * cellSize + cellSize / 2;
              ctx.save();
              ctx.strokeStyle = '#F97316';
              ctx.lineWidth = 2.5;
              ctx.setLineDash([4, 3]);
              ctx.beginPath();
              ctx.moveTo(centerX, centerY);
              ctx.lineTo(tx, ty);
              ctx.stroke();
              ctx.restore();
            }
          }

          // Rippling Radar Ring
          if (showCommRings && agent.state !== 'CRITICAL_FAILURE' && agent.state !== 'PARKED_REPAIR') {
            const rPhase = (now % 1600) / 1600;
            const rPhase2 = ((now + 800) % 1600) / 1600;
            const r1 = radius + 4 + rPhase * 18;
            const r2 = radius + 4 + rPhase2 * 18;

            const isHazard = Boolean(agent.isNearHazard);
            const ringColor = isHazard ? 'rgba(220, 80, 80, 0.42)' : 'rgba(56, 189, 248, 0.35)';

            ctx.strokeStyle = ringColor;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(centerX, centerY, r1, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(centerX, centerY, r2, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(agent.heading);

          const chW = radius * 1.5;
          const chH = radius * 1.3;

          // 2 Drive Wheels
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(-chW * 0.5 - 3.5, -chH * 0.42, 4, chH * 0.84);
          ctx.fillRect(chW * 0.5 - 0.5, -chH * 0.42, 4, chH * 0.84);

          const desat = agent.desaturation !== undefined ? agent.desaturation : (agent.state === 'CRITICAL_FAILURE' ? 1.0 : 0.0);
          const chassisBg = desat > 0.8 ? '#CBD5E1' : '#FFFFFF';
          const rimColor = desat > 0.8 ? '#64748B' : (agent.state === 'CARRYING_TASK' ? '#10B981' : '#0284C7');

          ctx.fillStyle = chassisBg;
          ctx.strokeStyle = rimColor;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.roundRect(-chW * 0.5, -chH * 0.5, chW, chH, 5);
          ctx.fill();
          ctx.stroke();

          // Heading Pointer
          ctx.fillStyle = desat > 0.8 ? '#94A3B8' : '#0284C7';
          ctx.beginPath();
          ctx.moveTo(chW * 0.35, 0);
          ctx.lineTo(chW * 0.15, -3);
          ctx.lineTo(chW * 0.15, 3);
          ctx.closePath();
          ctx.fill();

          // Parcel Crate on Top if Carrying
          if (agent.state === 'CARRYING_TASK') {
            const crW = chW * 0.65;
            const crH = chH * 0.7;

            ctx.fillStyle = '#D97706';
            ctx.fillRect(-crW * 0.5, -crH * 0.5, crW, crH);
            ctx.strokeStyle = '#B45309';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(-crW * 0.5, -crH * 0.5, crW, crH);

            ctx.fillStyle = '#FDE047';
            ctx.fillRect(-crW * 0.15, -crH * 0.5, crW * 0.3, crH);
          }

          ctx.restore();

          // Floating Unit ID Badge
          ctx.save();
          ctx.translate(centerX, centerY);
          const unitName = agent.id.replace('AMR-', 'A').replace('FUS-HW-01', 'HW1');
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.strokeStyle = '#CBD5E1';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(-10, radius + 3, 20, 11, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = desat > 0.8 ? '#64748B' : '#0F172A';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(unitName, 0, radius + 11);

          if (agent.state === 'PARKED_REPAIR') {
            const secLeft = agent.repairCountdownSec !== undefined ? agent.repairCountdownSec.toFixed(1) : '5.0';
            ctx.fillStyle = '#7C3AED';
            ctx.font = 'bold 8px monospace';
            ctx.fillText(`⚡ ${secLeft}s`, 0, -radius - 7);
          }
          ctx.restore();
        }

        // Hover reticle
        if (hoverCoord) {
          ctx.strokeStyle = toolMode === 'OBSTACLE' ? 'rgba(220, 38, 38, 0.7)' : 'rgba(2, 132, 199, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(hoverCoord.x * cellSize + 1, hoverCoord.y * cellSize + 1, cellSize - 2, cellSize - 2);
        }

        // 2D Tactical View Mode Watermark Tag
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('2D TACTICAL ORTHOGRAPHIC MAP', 20, height - 20);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [manager, selectedAgent, selectedCell, showHeatmap, showPathVectors, showCommRings, hoverCoord, toolMode, viewMode]);

  // Click Handler based on Tool Mode (Handles both 2D and 3D coordinate un-projection)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const xRatio = canvas.width / rect.width;
    const yRatio = canvas.height / rect.height;
    const clientX = (e.clientX - rect.left) * xRatio;
    const clientY = (e.clientY - rect.top) * yRatio;

    let gridX = 0;
    let gridY = 0;

    if (viewMode === '3D') {
      const isoOriginX = canvas.width * 0.5;
      const isoOriginY = canvas.height * 0.16;
      const isoTileW = canvas.width / 34;
      const isoTileH = isoTileW * 0.52;

      const dx = clientX - isoOriginX;
      const dy = clientY - isoOriginY;
      gridX = Math.round((dy / (isoTileH * 0.5) + dx / (isoTileW * 0.5)) * 0.5);
      gridY = Math.round((dy / (isoTileH * 0.5) - dx / (isoTileW * 0.5)) * 0.5);
    } else {
      const cellSize = canvas.width / GRID_WIDTH;
      gridX = Math.floor(clientX / cellSize);
      gridY = Math.floor(clientY / cellSize);
    }

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

    // 2. ADD OBSTACLE TOOL
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

    let gridX = 0;
    let gridY = 0;

    if (viewMode === '3D') {
      const isoOriginX = canvas.width * 0.5;
      const isoOriginY = canvas.height * 0.16;
      const isoTileW = canvas.width / 34;
      const isoTileH = isoTileW * 0.52;

      const dx = clientX - isoOriginX;
      const dy = clientY - isoOriginY;
      gridX = Math.round((dy / (isoTileH * 0.5) + dx / (isoTileW * 0.5)) * 0.5);
      gridY = Math.round((dy / (isoTileH * 0.5) - dx / (isoTileW * 0.5)) * 0.5);
    } else {
      const cellSize = canvas.width / GRID_WIDTH;
      gridX = Math.floor(clientX / cellSize);
      gridY = Math.floor(clientY / cellSize);
    }

    if (gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT) {
      setHoverCoord({ x: gridX, y: gridY });
    } else {
      setHoverCoord(null);
    }
  };

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
        className={`w-full h-auto max-h-[82vh] rounded-[28px] border border-slate-200/80 shadow-[0_12px_40px_rgba(0,0,0,0.04)] object-contain bg-white ${getCursorClass()}`}
      />

      {/* VIEWPORT MODE FLOATING PILL (Allows instant 2D / 3D toggle right from canvas) */}
      <div className="absolute top-4 left-6 z-20 flex items-center bg-white/95 p-1 rounded-full border border-slate-200 shadow-sm backdrop-blur-md">
        <button
          onClick={() => viewMode !== '2D' && onToggleViewMode && onToggleViewMode()}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            viewMode === '2D'
              ? 'bg-slate-900 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Switch to 2D Tactical Plan View"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>2D Tactical</span>
        </button>

        <button
          onClick={() => viewMode !== '3D' && onToggleViewMode && onToggleViewMode()}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            viewMode === '3D'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Switch to 3D Isometric View (SimTool style)"
        >
          <Box className="w-3.5 h-3.5" />
          <span>3D Isometric</span>
        </button>
      </div>

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
