import { CellType } from '../types/simulation';

export const GRID_WIDTH = 32;
export const GRID_HEIGHT = 20;

export interface WarehouseLayout {
  grid: CellType[][];
  pickStations: { x: number; y: number }[];
  dropBays: { x: number; y: number }[];
  chargingDocks: { x: number; y: number }[];
  recessBays: { x: number; y: number }[];
}

/**
 * Initializes a realistic industrial fulfillment center layout with:
 * - 4 storage rack blocks with vertical/horizontal transit aisles
 * - West pick stations (induction)
 * - East drop bays (packing)
 * - North/South inductive charging docks
 * - Strategic recess bays for deadlock yielding
 */
export function createInitialWarehouseLayout(): WarehouseLayout {
  const grid: CellType[][] = Array.from({ length: GRID_HEIGHT }, () =>
    Array.from({ length: GRID_WIDTH }, () => 'EMPTY' as CellType)
  );

  const pickStations: { x: number; y: number }[] = [];
  const dropBays: { x: number; y: number }[] = [];
  const chargingDocks: { x: number; y: number }[] = [];
  const recessBays: { x: number; y: number }[] = [];

  // 1. Storage Rack Clusters
  // We place 4 large rack blocks with 2-cell corridors between them
  for (let r = 3; r <= 7; r++) {
    for (let c = 5; c <= 11; c++) grid[r][c] = 'RACK';
    for (let c = 15; c <= 21; c++) grid[r][c] = 'RACK';
    for (let c = 25; c <= 29; c++) grid[r][c] = 'RACK';
  }

  for (let r = 11; r <= 15; r++) {
    for (let c = 5; c <= 11; c++) grid[r][c] = 'RACK';
    for (let c = 15; c <= 21; c++) grid[r][c] = 'RACK';
    for (let c = 25; c <= 29; c++) grid[r][c] = 'RACK';
  }

  // 2. Pick Stations (West edge: x = 1, y = 4, 8, 12, 16)
  const pickYs = [3, 7, 11, 15];
  for (const py of pickYs) {
    grid[py][1] = 'PICK_STATION';
    pickStations.push({ x: 1, y: py });
  }

  // 3. Drop Bays (East edge: x = 30, y = 4, 8, 12, 16)
  const dropYs = [3, 7, 11, 15];
  for (const dy of dropYs) {
    grid[dy][30] = 'DROP_BAY';
    dropBays.push({ x: 30, y: dy });
  }

  // 4. Charging Docks (North edge: y = 1; South edge: y = 18)
  const chargeXs = [6, 10, 16, 20, 26];
  for (const cx of chargeXs) {
    grid[1][cx] = 'CHARGING_DOCK';
    chargingDocks.push({ x: cx, y: 1 });
    grid[18][cx] = 'CHARGING_DOCK';
    chargingDocks.push({ x: cx, y: 18 });
  }

  // 5. Dedicated Recess / Yield Bays (Aisle alcoves for deadlock resolution)
  const recessCoords = [
    { x: 4, y: 5 }, { x: 12, y: 5 }, { x: 14, y: 5 }, { x: 22, y: 5 },
    { x: 4, y: 13 }, { x: 12, y: 13 }, { x: 14, y: 13 }, { x: 22, y: 13 },
    { x: 13, y: 9 }, { x: 23, y: 9 }
  ];
  for (const rc of recessCoords) {
    grid[rc.y][rc.x] = 'RECESS_BAY';
    recessBays.push(rc);
  }

  return { grid, pickStations, dropBays, chargingDocks, recessBays };
}

export function manhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

export function isCellTraversable(grid: CellType[][], x: number, y: number): boolean {
  if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return false;
  const cell = grid[y][x];
  // Racks and Dynamic Obstacles cannot be entered
  return cell !== 'RACK' && cell !== 'OBSTACLE';
}
