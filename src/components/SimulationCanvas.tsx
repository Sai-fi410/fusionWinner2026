import React, { useRef, useEffect, useState } from 'react';
import { SwarmManager } from '../engine/swarmManager';
import { Agent, ToolMode, CellInspectionInfo, CanvasViewMode } from '../types/simulation';
import { GRID_WIDTH, GRID_HEIGHT } from '../engine/grid';
import { ZoomIn, ZoomOut } from 'lucide-react';

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
  isDarkMode?: boolean;
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
  isDarkMode = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);

  // 3D Isometric Zoom System (0.6x to 2.2x)
  const [zoom3D, setZoom3D] = useState<number>(1.0);

  // Subpixel render interpolation with NaN guards
  const interpolatedAgents = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Mouse wheel zoom handler for 3D Isometric Mode
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (viewMode === '3D') {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      setZoom3D(prev => Math.max(0.6, Math.min(2.2, +(prev + delta).toFixed(2))));
    }
  };

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
        const baseTileW = width / 34;
        const isoTileW = baseTileW * zoom3D;
        const isoTileH = isoTileW * 0.52;
        const isoOriginX = width * 0.5;
        const isoOriginY = height * 0.22 - (zoom3D - 1.0) * (height * 0.12);

        const toIso = (gx: number, gy: number, gz: number = 0) => ({
          x: isoOriginX + (gx - gy) * (isoTileW * 0.5),
          y: isoOriginY + (gx + gy) * (isoTileH * 0.5) - gz * zoom3D
        });

        // 1. Clear background (High-tech studio canvas)
        ctx.fillStyle = isDarkMode ? '#090D16' : '#CBD5E1';
        ctx.fillRect(0, 0, width, height);

        // 2. Concrete Warehouse Perimeter Walls
        const wallH = 68;

        // Back Wall (along y = 0, x: 0 -> 32)
        const bwP0 = toIso(0, 0, 0);
        const bwP1 = toIso(GRID_WIDTH, 0, 0);
        const bwT0 = toIso(0, 0, wallH);
        const bwT1 = toIso(GRID_WIDTH, 0, wallH);

        ctx.fillStyle = isDarkMode ? '#1E293B' : '#94A3B8';
        ctx.beginPath();
        ctx.moveTo(bwP0.x, bwP0.y);
        ctx.lineTo(bwP1.x, bwP1.y);
        ctx.lineTo(bwT1.x, bwT1.y);
        ctx.lineTo(bwT0.x, bwT0.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = isDarkMode ? '#334155' : '#64748B';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Left Wall (along x = 0, y: 0 -> 20)
        const lwP1 = toIso(0, GRID_HEIGHT, 0);
        const lwT1 = toIso(0, GRID_HEIGHT, wallH);

        ctx.fillStyle = isDarkMode ? '#162032' : '#64748B';
        ctx.beginPath();
        ctx.moveTo(bwP0.x, bwP0.y);
        ctx.lineTo(lwP1.x, lwP1.y);
        ctx.lineTo(lwT1.x, lwT1.y);
        ctx.lineTo(bwT0.x, bwT0.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = isDarkMode ? '#1E293B' : '#475569';
        ctx.stroke();

        // 3. Concrete Floor Diamond Plane
        const flP0 = toIso(0, 0, 0);
        const flP1 = toIso(GRID_WIDTH, 0, 0);
        const flP2 = toIso(GRID_WIDTH, GRID_HEIGHT, 0);
        const flP3 = toIso(0, GRID_HEIGHT, 0);

        ctx.fillStyle = isDarkMode ? '#1E293B' : '#E2E8F0';
        ctx.beginPath();
        ctx.moveTo(flP0.x, flP0.y);
        ctx.lineTo(flP1.x, flP1.y);
        ctx.lineTo(flP2.x, flP2.y);
        ctx.lineTo(flP3.x, flP3.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = isDarkMode ? '#334155' : '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Subtle floor diamond tiles
        ctx.strokeStyle = isDarkMode ? 'rgba(51, 65, 85, 0.4)' : 'rgba(203, 213, 225, 0.7)';
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
            ctx.ellipse(p.x, p.y, 4.5 * zoom3D, 2.4 * zoom3D, 0, 0, Math.PI * 2);
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
          | { kind: 'PICK_STATION'; ps: { x: number; y: number }; index: number; depth: number }
          | { kind: 'DROP_BAY'; db: { x: number; y: number }; index: number; depth: number }
          | { kind: 'DROPPED'; dp: any; depth: number }
          | { kind: 'AGENT'; agent: Agent; depth: number };

        const items: RenderItem[] = [];

        // Add Racks, Obstacles, Docks
        for (let y = 0; y < GRID_HEIGHT; y++) {
          for (let x = 0; x < GRID_WIDTH; x++) {
            const cellType = grid[y][x];
            if (cellType === 'RACK') items.push({ kind: 'RACK', x, y, depth: x + y });
            else if (cellType === 'OBSTACLE') items.push({ kind: 'OBSTACLE', x, y, depth: x + y });
            else if (cellType === 'CHARGING_DOCK') items.push({ kind: 'CHARGING', x, y, depth: x + y });
          }
        }

        // HIGH VISIBILITY: Add Pick Stations to depth-sorted items
        for (let i = 0; i < layout.pickStations.length; i++) {
          const ps = layout.pickStations[i];
          items.push({ kind: 'PICK_STATION', ps, index: i, depth: ps.x + ps.y + 0.05 });
        }

        // HIGH VISIBILITY: Add Drop Bays to depth-sorted items
        for (let i = 0; i < layout.dropBays.length; i++) {
          const db = layout.dropBays[i];
          items.push({ kind: 'DROP_BAY', db, index: i, depth: db.x + db.y + 0.05 });
        }

        // Add Dropped Parcels
        for (const dp of manager.droppedParcels) {
          items.push({ kind: 'DROPPED', dp, depth: dp.x + dp.y + 0.2 });
        }

        // Add Agents
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

        // Sort Back to Front
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
            // 3D Obstacle Cube
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
          } else if (item.kind === 'PICK_STATION') {
            // ==========================================
            // 3D INBOUND PICK-UP INDUCTION STATION
            // ==========================================
            const ps = item.ps;
            const qCount = manager.stationQueues.get(`${ps.x},${ps.y}`) || 0;
            const sH = 10;

            const p0 = toIso(ps.x, ps.y, 0);
            const p1 = toIso(ps.x + 1, ps.y, 0);
            const p2 = toIso(ps.x + 1, ps.y + 1, 0);
            const p3 = toIso(ps.x, ps.y + 1, 0);

            const t0 = toIso(ps.x, ps.y, sH);
            const t1 = toIso(ps.x + 1, ps.y, sH);
            const t2 = toIso(ps.x + 1, ps.y + 1, sH);
            const t3 = toIso(ps.x, ps.y + 1, sH);

            // Ground glowing emerald diamond halo
            ctx.save();
            ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y);
            ctx.closePath(); ctx.fill();

            // Metallic Emerald Pedestal Faces
            ctx.fillStyle = '#059669';
            ctx.beginPath();
            ctx.moveTo(p3.x, p3.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(t2.x, t2.y); ctx.lineTo(t3.x, t3.y);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#047857'; ctx.lineWidth = 1.2; ctx.stroke();

            ctx.fillStyle = '#047857';
            ctx.beginPath();
            ctx.moveTo(p2.x, p2.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(t1.x, t1.y); ctx.lineTo(t2.x, t2.y);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#065F46'; ctx.stroke();

            // Top Induction Platform
            ctx.fillStyle = '#10B981';
            ctx.beginPath();
            ctx.moveTo(t0.x, t0.y); ctx.lineTo(t1.x, t1.y); ctx.lineTo(t2.x, t2.y); ctx.lineTo(t3.x, t3.y);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#6EE7B7'; ctx.lineWidth = 1.5; ctx.stroke();

            // Elevated Holographic 3D Billboard Signage
            const tagPos = toIso(ps.x + 0.5, ps.y + 0.5, 42);
            const baseCenter = toIso(ps.x + 0.5, ps.y + 0.5, sH);

            // Laser tether guideline
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(baseCenter.x, baseCenter.y);
            ctx.lineTo(tagPos.x, tagPos.y + 8);
            ctx.stroke();

            // Floating Billboard Tag Pill
            ctx.font = 'bold 9px system-ui, sans-serif';
            const tagText = `📦 PICK-UP #${item.index + 1} (${qCount})`;
            const tw = ctx.measureText(tagText).width;

            ctx.fillStyle = isDarkMode ? 'rgba(6, 78, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)';
            ctx.strokeStyle = '#10B981';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(tagPos.x - (tw + 14) / 2, tagPos.y - 10, tw + 14, 18, 9);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = isDarkMode ? '#A7F3D0' : '#065F46';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(tagText, tagPos.x, tagPos.y);
            ctx.restore();
          } else if (item.kind === 'DROP_BAY') {
            // ==========================================
            // 3D OUTBOUND DROP-OFF SORTATION BAY
            // ==========================================
            const db = item.db;
            const doneCount = manager.dropBayCounts.get(`${db.x},${db.y}`) || 0;
            const sH = 10;

            const p0 = toIso(db.x, db.y, 0);
            const p1 = toIso(db.x + 1, db.y, 0);
            const p2 = toIso(db.x + 1, db.y + 1, 0);
            const p3 = toIso(db.x, db.y + 1, 0);

            const t0 = toIso(db.x, db.y, sH);
            const t1 = toIso(db.x + 1, db.y, sH);
            const t2 = toIso(db.x + 1, db.y + 1, sH);
            const t3 = toIso(db.x, db.y + 1, sH);

            // Ground glowing cyan diamond halo
            ctx.save();
            ctx.fillStyle = 'rgba(59, 130, 246, 0.35)';
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y);
            ctx.closePath(); ctx.fill();

            // Metallic Blue Pedestal Faces
            ctx.fillStyle = '#2563EB';
            ctx.beginPath();
            ctx.moveTo(p3.x, p3.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(t2.x, t2.y); ctx.lineTo(t3.x, t3.y);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#1D4ED8'; ctx.lineWidth = 1.2; ctx.stroke();

            ctx.fillStyle = '#1D4ED8';
            ctx.beginPath();
            ctx.moveTo(p2.x, p2.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(t1.x, t1.y); ctx.lineTo(t2.x, t2.y);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#1E40AF'; ctx.stroke();

            // Top Sortation Chute Platform
            ctx.fillStyle = '#3B82F6';
            ctx.beginPath();
            ctx.moveTo(t0.x, t0.y); ctx.lineTo(t1.x, t1.y); ctx.lineTo(t2.x, t2.y); ctx.lineTo(t3.x, t3.y);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#93C5FD'; ctx.lineWidth = 1.5; ctx.stroke();

            // Elevated Holographic 3D Billboard Signage
            const tagPos = toIso(db.x + 0.5, db.y + 0.5, 42);
            const baseCenter = toIso(db.x + 0.5, db.y + 0.5, sH);

            // Laser tether guideline
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(baseCenter.x, baseCenter.y);
            ctx.lineTo(tagPos.x, tagPos.y + 8);
            ctx.stroke();

            // Floating Billboard Tag Pill
            ctx.font = 'bold 9px system-ui, sans-serif';
            const tagText = `🚚 DROP-OFF #${item.index + 1} (${doneCount})`;
            const tw = ctx.measureText(tagText).width;

            ctx.fillStyle = isDarkMode ? 'rgba(30, 58, 138, 0.95)' : 'rgba(255, 255, 255, 0.95)';
            ctx.strokeStyle = '#3B82F6';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(tagPos.x - (tw + 14) / 2, tagPos.y - 10, tw + 14, 18, 9);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = isDarkMode ? '#BFDBFE' : '#1E40AF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(tagText, tagPos.x, tagPos.y);
            ctx.restore();
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
              const rx1 = (14 + rPhase * 16) * zoom3D;
              const ry1 = rx1 * 0.52;
              const rx2 = (14 + rPhase2 * 16) * zoom3D;
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
            const rH = 8 * zoom3D;
            const rRadius = 11 * zoom3D;
            const desat = agent.desaturation !== undefined ? agent.desaturation : (agent.state === 'CRITICAL_FAILURE' ? 1.0 : 0.0);

            // Shading
            const bodyColor = desat > 0.8 ? '#CBD5E1' : (isDarkMode ? '#F8FAFC' : '#FFFFFF');
            const rimColor = desat > 0.8 ? '#64748B' : (agent.state === 'CARRYING_TASK' ? '#10B981' : '#0284C7');

            // 3D Cylinder Base / Drive Wheels
            ctx.fillStyle = '#0F172A';
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
            const headAngle = agent.heading ?? 0;
            const eyeX = pBase.x + Math.cos(headAngle) * (rRadius * 0.65);
            const eyeY = (pBase.y - rH) + Math.sin(headAngle) * (rRadius * 0.35);
            ctx.fillStyle = desat > 0.8 ? '#64748B' : '#0284C7';
            ctx.beginPath();
            ctx.arc(eyeX, eyeY, 2.5 * zoom3D, 0, Math.PI * 2);
            ctx.fill();

            // 3D Carried Parcel Crate on AMR Platform
            if (agent.state === 'CARRYING_TASK') {
              const cWidth = 9 * zoom3D;
              const cHeight = 8 * zoom3D;
              const cElev = (rH + 1);

              const cp0 = toIso(interp.x + 0.3, interp.y + 0.3, cElev);
              const cp1 = toIso(interp.x + 0.7, interp.y + 0.3, cElev);
              const cp2 = toIso(interp.x + 0.7, interp.y + 0.7, cElev);
              const cp3 = toIso(interp.x + 0.3, interp.y + 0.7, cElev);

              ctx.fillStyle = '#D97706';
              ctx.beginPath();
              ctx.moveTo(cp0.x, cp0.y);
              ctx.lineTo(cp1.x, cp1.y);
              ctx.lineTo(cp2.x, cp2.y);
              ctx.lineTo(cp3.x, cp3.y);
              ctx.closePath();
              ctx.fill();

              // Parcel tape stripe
              ctx.fillStyle = '#FDE047';
              ctx.fillRect(pBase.x - 1.5, cp3.y - 1, 3, cHeight);
            }

            // Floating ID Label (A1, A2, etc.)
            const uName = agent.id.replace('AMR-', 'A').replace('FUS-HW-01', 'HW1');
            ctx.fillStyle = isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)';
            ctx.strokeStyle = isDarkMode ? '#475569' : '#94A3B8';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(pBase.x - 10, pBase.y - rH - 24, 20, 11, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = desat > 0.8 ? '#64748B' : (isDarkMode ? '#F8FAFC' : '#0F172A');
            ctx.font = 'bold 8px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(uName, pBase.x, pBase.y - rH - 16);
            ctx.textAlign = 'start';

            // 5s Charging Countdown in 3D
            if (agent.state === 'PARKED_REPAIR') {
              const secLeft = agent.repairCountdownSec !== undefined ? agent.repairCountdownSec.toFixed(1) : '5.0';
              ctx.fillStyle = '#A855F7';
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
          ctx.ellipse(hp.x, hp.y, 16 * zoom3D, 8 * zoom3D, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // 3D Isometric View Mode Watermark Tag
        ctx.fillStyle = isDarkMode ? 'rgba(148, 163, 184, 0.6)' : 'rgba(15, 23, 42, 0.8)';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`3D ISOMETRIC VIEWPORT (ZOOM: ${Math.round(zoom3D * 100)}%)`, 20, height - 20);

      } else {
        // ==========================================
        // MODE 2: 2D TACTICAL ORTHOGRAPHIC MAP
        // ==========================================

        // 1. Clear background
        ctx.fillStyle = isDarkMode ? '#0F172A' : '#CBD5E1';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = isDarkMode ? '#1E293B' : '#E2E8F0';
        ctx.fillRect(4, 4, width - 8, height - 8);

        // Grid joints
        ctx.strokeStyle = isDarkMode ? 'rgba(51, 65, 85, 0.5)' : 'rgba(203, 213, 225, 0.6)';
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
              ctx.fillStyle = isDarkMode ? '#334155' : '#475569';
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
              ctx.fillStyle = isDarkMode ? '#064E3B' : '#FEF3C7';
              ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
              ctx.strokeStyle = isDarkMode ? '#10B981' : '#D97706';
              ctx.lineWidth = 2;
              ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4);

              ctx.fillStyle = isDarkMode ? '#A7F3D0' : '#92400E';
              ctx.font = 'bold 9px monospace';
              ctx.fillText('PICK', px + 3, py + cellSize / 2 + 3);
            } else if (type === 'DROP_BAY') {
              ctx.fillStyle = isDarkMode ? '#1E3A8A' : '#EDE9FE';
              ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
              ctx.strokeStyle = isDarkMode ? '#3B82F6' : '#7C3AED';
              ctx.lineWidth = 2;
              ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4);

              ctx.fillStyle = isDarkMode ? '#BFDBFE' : '#5B21B6';
              ctx.font = 'bold 9px monospace';
              ctx.fillText('PACK', px + 3, py + cellSize / 2 + 3);
            } else if (type === 'CHARGING_DOCK') {
              ctx.fillStyle = isDarkMode ? '#1E293B' : '#1E293B';
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
              ctx.fillStyle = isDarkMode ? '#064E3B/40' : '#DCFCE7';
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

        // Heatmap Layer
        if (showHeatmap) {
          for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
              const val = manager.heatmap[y][x];
              if (val > 0) {
                const alpha = Math.min(0.65, val * 0.08);
                ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
              }
            }
          }
        }

        // Dropped Parcels in 2D
        for (const dp of manager.droppedParcels) {
          const dpx = dp.x * cellSize + cellSize / 2;
          const dpy = dp.y * cellSize + cellSize / 2;

          ctx.save();
          ctx.fillStyle = '#F59E0B';
          ctx.beginPath();
          ctx.arc(dpx, dpy, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#B45309';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#78350F';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('📦', dpx, dpy + 3);
          ctx.restore();
        }

        // Path Vectors
        if (showPathVectors) {
          for (const agent of manager.agents) {
            if (agent.path.length > 1 && agent.state !== 'CRITICAL_FAILURE' && agent.state !== 'PARKED_REPAIR') {
              ctx.beginPath();
              ctx.strokeStyle = agent.id === selectedAgent?.id ? '#2563EB' : 'rgba(100, 116, 139, 0.45)';
              ctx.lineWidth = agent.id === selectedAgent?.id ? 3 : 1.5;
              ctx.setLineDash([4, 4]);

              const startX = agent.x * cellSize + cellSize / 2;
              const startY = agent.y * cellSize + cellSize / 2;
              ctx.moveTo(startX, startY);

              for (let i = 1; i < agent.path.length; i++) {
                const pt = agent.path[i];
                ctx.lineTo(pt.x * cellSize + cellSize / 2, pt.y * cellSize + cellSize / 2);
              }
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }
        }

        // Agents in 2D
        for (const agent of manager.agents) {
          const targetX = Number.isFinite(agent.x) ? agent.x : 2;
          const targetY = Number.isFinite(agent.y) ? agent.y : 2;
          let prev = interpolatedAgents.current.get(agent.id) || { x: targetX, y: targetY };
          const interp = {
            x: prev.x + (targetX - prev.x) * 0.28,
            y: prev.y + (targetY - prev.y) * 0.28
          };
          interpolatedAgents.current.set(agent.id, interp);

          const cx = interp.x * cellSize + cellSize / 2;
          const cy = interp.y * cellSize + cellSize / 2;

          // Communication & Collision Warning Ring
          if (showCommRings && agent.state !== 'CRITICAL_FAILURE' && agent.state !== 'PARKED_REPAIR') {
            const isHazard = Boolean(agent.isNearHazard);
            const rPhase = (now % 1600) / 1600;
            const rPhase2 = ((now + 800) % 1600) / 1600;
            const r1 = 16 + rPhase * 18;
            const r2 = 16 + rPhase2 * 18;

            const ringColor = isHazard 
              ? 'rgba(220, 80, 80, 0.55)'
              : 'rgba(56, 189, 248, 0.4)';

            ctx.strokeStyle = ringColor;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(cx, cy, r1, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(cx, cy, r2, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Mechanical Tow Rope
          if (agent.towedAgentId) {
            const towedRobot = manager.agents.find(a => a.id === agent.towedAgentId);
            if (towedRobot) {
              const towedInterp = interpolatedAgents.current.get(towedRobot.id) || { x: towedRobot.x, y: towedRobot.y };
              const tX = towedInterp.x * cellSize + cellSize / 2;
              const tY = towedInterp.y * cellSize + cellSize / 2;

              ctx.save();
              ctx.strokeStyle = '#F97316';
              ctx.lineWidth = 3;
              ctx.setLineDash([5, 4]);
              ctx.beginPath();
              ctx.moveTo(cx, cy);
              ctx.lineTo(tX, tY);
              ctx.stroke();
              ctx.restore();
            }
          }

          // Robot Body
          const radius = 10;
          const desat = agent.desaturation !== undefined ? agent.desaturation : (agent.state === 'CRITICAL_FAILURE' ? 1.0 : 0.0);

          let baseFill = isDarkMode ? '#F8FAFC' : '#FFFFFF';
          let borderStroke = '#0284C7';

          if (desat > 0.8) {
            baseFill = '#94A3B8';
            borderStroke = '#64748B';
          } else if (agent.state === 'CARRYING_TASK') {
            baseFill = '#10B981';
            borderStroke = '#047857';
          }

          ctx.fillStyle = baseFill;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = borderStroke;
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Single Sensor Eye
          const eyeX = cx + Math.cos(agent.heading ?? 0) * 6;
          const eyeY = cy + Math.sin(agent.heading ?? 0) * 6;
          ctx.fillStyle = desat > 0.8 ? '#475569' : '#0284C7';
          ctx.beginPath();
          ctx.arc(eyeX, eyeY, 2.8, 0, Math.PI * 2);
          ctx.fill();

          // Label
          const uName = agent.id.replace('AMR-', 'A').replace('FUS-HW-01', 'HW1');
          ctx.fillStyle = isDarkMode ? '#F8FAFC' : '#0F172A';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(uName, cx, cy - radius - 3);
          ctx.textAlign = 'start';
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [manager, viewMode, showHeatmap, showPathVectors, showCommRings, selectedAgent, isDarkMode, zoom3D]);

  // Click handler with dynamic zoom un-projection
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
      const isoTileW = (canvas.width / 34) * zoom3D;
      const isoTileH = isoTileW * 0.52;
      const isoOriginX = canvas.width * 0.5;
      const isoOriginY = canvas.height * 0.22 - (zoom3D - 1.0) * (canvas.height * 0.12);

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

  // Mouse Move with dynamic zoom un-projection
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
      const isoTileW = (canvas.width / 34) * zoom3D;
      const isoTileH = isoTileW * 0.52;
      const isoOriginX = canvas.width * 0.5;
      const isoOriginY = canvas.height * 0.22 - (zoom3D - 1.0) * (canvas.height * 0.12);

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
        onWheel={handleWheel}
        className={`w-full h-auto max-h-[82vh] rounded-[28px] border shadow-[0_12px_40px_rgba(0,0,0,0.06)] object-contain transition-colors duration-200 ${
          isDarkMode ? 'bg-[#0B0F19] border-slate-800' : 'bg-white border-slate-200/80'
        } ${getCursorClass()}`}
      />

      {/* 3D ZOOM INTERACTIVE CONTROLLER (Only in 3D Mode, Clean Glassmorphism) */}
      {viewMode === '3D' && (
        <div className={`absolute bottom-5 right-6 z-20 flex items-center p-1 rounded-full border shadow-lg backdrop-blur-md transition-all ${
          isDarkMode 
            ? 'bg-slate-900/90 border-slate-700 text-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.4)]' 
            : 'bg-white/95 border-slate-200 text-slate-800'
        }`}>
          <button
            onClick={() => setZoom3D(z => Math.max(0.6, +(z - 0.15).toFixed(2)))}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Zoom Out 3D Warehouse"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            onClick={() => setZoom3D(1.0)}
            className={`px-2.5 py-1 text-xs font-mono font-bold rounded-full transition-all cursor-pointer ${
              isDarkMode ? 'hover:bg-slate-800 text-sky-400' : 'hover:bg-slate-100 text-blue-600'
            }`}
            title="Reset to 100% Zoom"
          >
            {Math.round(zoom3D * 100)}%
          </button>

          <button
            onClick={() => setZoom3D(z => Math.min(2.2, +(z + 0.15).toFixed(2)))}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Zoom In 3D Warehouse"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
};
