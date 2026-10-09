import { CellType, WarehouseLayoutId } from '../types/simulation';

export const GRID_WIDTH = 32;
export const GRID_HEIGHT = 20;

export interface WarehouseLayout {
  id: WarehouseLayoutId;
  name: string;
  tag: string;
  description: string;
  grid: CellType[][];
  pickStations: { x: number; y: number }[];
  dropBays: { x: number; y: number }[];
  chargingDocks: { x: number; y: number }[];
  recessBays: { x: number; y: number }[];
  loadingZone?: { x: number; y: number; width: number; height: number };
  entranceZone?: { x: number; y: number };
  aisleSegments?: { x1: number; y1: number; x2: number; y2: number }[];
  waypoints?: { x: number; y: number }[];
}

/**
 * WAREHOUSE 1: Standard Multi-Aisle Logistics Hub
 * 4 dense central pod blocks with vertical/horizontal transit avenues
 */
export function createWarehouse1Layout(): WarehouseLayout {
  const grid: CellType[][] = Array.from({ length: GRID_HEIGHT }, () =>
    Array.from({ length: GRID_WIDTH }, () => 'EMPTY' as CellType)
  );

  const pickStations: { x: number; y: number }[] = [];
  const dropBays: { x: number; y: number }[] = [];
  const chargingDocks: { x: number; y: number }[] = [];
  const recessBays: { x: number; y: number }[] = [];

  // 1. Storage Rack Clusters
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

  // 2. Pick Stations (West edge: x = 1)
  const pickYs = [3, 7, 11, 15];
  for (const py of pickYs) {
    grid[py][1] = 'PICK_STATION';
    pickStations.push({ x: 1, y: py });
  }

  // 3. Drop Bays (East edge: x = 30)
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

  // 5. Dedicated Recess Bays
  const recessCoords = [
    { x: 4, y: 5 }, { x: 12, y: 5 }, { x: 14, y: 5 }, { x: 22, y: 5 },
    { x: 4, y: 13 }, { x: 12, y: 13 }, { x: 14, y: 13 }, { x: 22, y: 13 },
    { x: 13, y: 9 }, { x: 23, y: 9 }
  ];
  for (const rc of recessCoords) {
    grid[rc.y][rc.x] = 'RECESS_BAY';
    recessBays.push(rc);
  }

  // Standard Yellow Highway Grid Lines & Waypoints
  const waypoints = [
    { x: 3, y: 2 }, { x: 13, y: 2 }, { x: 23, y: 2 }, { x: 29, y: 2 },
    { x: 3, y: 9 }, { x: 13, y: 9 }, { x: 23, y: 9 }, { x: 29, y: 9 },
    { x: 3, y: 17 }, { x: 13, y: 17 }, { x: 23, y: 17 }, { x: 29, y: 17 }
  ];

  return {
    id: 'WH_1',
    name: 'Warehouse 01: Standard Logistics Hub',
    tag: 'HUB-STANDARD',
    description: 'High-density multi-aisle warehouse with dual-tier storage pod arrays, West induction, and East shipping bays.',
    grid,
    pickStations,
    dropBays,
    chargingDocks,
    recessBays,
    waypoints
  };
}

/**
 * WAREHOUSE 2: Perimeter Fulfillment Center
 * Exactly modeled on the reference architecture:
 * - Perimeter wall racks lining North, South, West, East borders
 * - Top-Right ENTRANCE gateway
 * - Bottom-Right LOADING / UNLOADING zone with dashed boundary
 * - Bottom Center CHARGING bank with 3 dedicated fast-charge pads
 * - Interconnected yellow guide aisles with cyan waypoint nodes
 */
export function createWarehouse2Layout(): WarehouseLayout {
  const grid: CellType[][] = Array.from({ length: GRID_HEIGHT }, () =>
    Array.from({ length: GRID_WIDTH }, () => 'EMPTY' as CellType)
  );

  const pickStations: { x: number; y: number }[] = [];
  const dropBays: { x: number; y: number }[] = [];
  const chargingDocks: { x: number; y: number }[] = [];
  const recessBays: { x: number; y: number }[] = [];

  // 1. Perimeter Storage Racks (North wall racks: c = 2 to 24)
  for (let c = 2; c <= 23; c++) {
    grid[1][c] = 'RACK';
  }

  // West wall racks (r = 2 to 17)
  for (let r = 2; r <= 17; r++) {
    grid[r][1] = 'RACK';
  }

  // East wall racks (r = 2 to 14)
  for (let r = 2; r <= 14; r++) {
    grid[r][30] = 'RACK';
  }

  // South wall racks (c = 2 to 14, and c = 18 to 22)
  for (let c = 2; c <= 14; c++) {
    grid[18][c] = 'RACK';
  }
  for (let c = 18; c <= 22; c++) {
    grid[18][c] = 'RACK';
  }

  // Additional interior pallet stacks (from reference image)
  grid[13][20] = 'RACK';
  grid[13][21] = 'RACK';
  grid[16][20] = 'RACK';
  grid[16][21] = 'RACK';
  grid[10][28] = 'RACK';
  grid[11][28] = 'RACK';

  // 2. Pick Stations (West aisle access)
  const pickCoords = [{ x: 2, y: 5 }, { x: 2, y: 10 }, { x: 2, y: 15 }];
  for (const p of pickCoords) {
    grid[p.y][p.x] = 'PICK_STATION';
    pickStations.push(p);
  }

  // 3. Drop Bays (Inside/Near Loading Zone at bottom right)
  const dropCoords = [{ x: 25, y: 16 }, { x: 27, y: 16 }, { x: 29, y: 16 }];
  for (const d of dropCoords) {
    grid[d.y][d.x] = 'DROP_BAY';
    dropBays.push(d);
  }

  // 4. Dedicated CHARGING Bank (Bottom center: x = 15, 16, 17; y = 17)
  const chargeBank = [{ x: 15, y: 17 }, { x: 16, y: 17 }, { x: 17, y: 17 }];
  for (const cb of chargeBank) {
    grid[cb.y][cb.x] = 'CHARGING_DOCK';
    chargingDocks.push(cb);
  }

  // 5. Waypoints matching reference layout grid intersections
  const waypoints = [
    { x: 6, y: 6 },  { x: 14, y: 6 },  { x: 18, y: 6 },  { x: 23, y: 6 },  { x: 27, y: 6 },
    { x: 6, y: 10 }, { x: 14, y: 10 }, { x: 18, y: 10 }, { x: 23, y: 10 },
    { x: 6, y: 14 }, { x: 14, y: 14 }, { x: 18, y: 14 }, { x: 23, y: 14 }
  ];

  // Recess bays
  const recesses = [{ x: 6, y: 8 }, { x: 18, y: 8 }, { x: 14, y: 12 }, { x: 23, y: 12 }];
  for (const rc of recesses) {
    grid[rc.y][rc.x] = 'RECESS_BAY';
    recessBays.push(rc);
  }

  return {
    id: 'WH_2',
    name: 'Warehouse 02: Perimeter Fulfillment Center',
    tag: 'HUB-PERIMETER',
    description: 'Reference architecture featuring perimeter pallet walls, central battery depot, top-right transit portal, and bottom-right staging area.',
    grid,
    pickStations,
    dropBays,
    chargingDocks,
    recessBays,
    waypoints,
    loadingZone: { x: 24, y: 14, width: 7, height: 5 },
    entranceZone: { x: 28, y: 1 }
  };
}

/**
 * WAREHOUSE 3: High-Throughput Sortation Terminal
 * Dual-spine cross-dock arrangement with vertical sorting fingers
 */
export function createWarehouse3Layout(): WarehouseLayout {
  const grid: CellType[][] = Array.from({ length: GRID_HEIGHT }, () =>
    Array.from({ length: GRID_WIDTH }, () => 'EMPTY' as CellType)
  );

  const pickStations: { x: number; y: number }[] = [];
  const dropBays: { x: number; y: number }[] = [];
  const chargingDocks: { x: number; y: number }[] = [];
  const recessBays: { x: number; y: number }[] = [];

  // Vertical Sorting Finger Racks
  const fingerCols = [6, 12, 18, 24];
  for (const fc of fingerCols) {
    for (let r = 2; r <= 8; r++) {
      grid[r][fc] = 'RACK';
      grid[r][fc + 1] = 'RACK';
    }
    for (let r = 11; r <= 17; r++) {
      grid[r][fc] = 'RACK';
      grid[r][fc + 1] = 'RACK';
    }
  }

  // Pick Stations at West entry corridor
  for (const py of [4, 7, 12, 15]) {
    grid[py][2] = 'PICK_STATION';
    pickStations.push({ x: 2, y: py });
  }

  // Drop Bays at East outbound terminal
  for (const dy of [4, 7, 12, 15]) {
    grid[dy][29] = 'DROP_BAY';
    dropBays.push({ x: 29, y: dy });
  }

  // Central charging lane
  for (const cx of [9, 15, 21]) {
    grid[9][cx] = 'CHARGING_DOCK';
    chargingDocks.push({ x: cx, y: 9 });
    grid[10][cx] = 'CHARGING_DOCK';
    chargingDocks.push({ x: cx, y: 10 });
  }

  // Highway waypoints
  const waypoints = [
    { x: 4, y: 9 }, { x: 9, y: 9 }, { x: 15, y: 9 }, { x: 21, y: 9 }, { x: 27, y: 9 },
    { x: 4, y: 1 }, { x: 15, y: 1 }, { x: 27, y: 1 },
    { x: 4, y: 18 }, { x: 15, y: 18 }, { x: 27, y: 18 }
  ];

  return {
    id: 'WH_3',
    name: 'Warehouse 03: Cross-Dock Sorting Terminal',
    tag: 'HUB-SORTATION',
    description: 'High-throughput cross-dock configuration with vertical finger sorting lanes, high-speed central transit spine, and dual-side induction.',
    grid,
    pickStations,
    dropBays,
    chargingDocks,
    recessBays,
    waypoints
  };
}

/**
 * WAREHOUSE 4: Cold-Storage & Hazardous Materials Matrix
 * Quad-chamber isolation layout with buffer safety corridors and cryogenic charging vaults
 */
export function createWarehouse4Layout(): WarehouseLayout {
  const grid: CellType[][] = Array.from({ length: GRID_HEIGHT }, () =>
    Array.from({ length: GRID_WIDTH }, () => 'EMPTY' as CellType)
  );

  const pickStations: { x: number; y: number }[] = [];
  const dropBays: { x: number; y: number }[] = [];
  const chargingDocks: { x: number; y: number }[] = [];
  const recessBays: { x: number; y: number }[] = [];

  // 4 Hermetic Chamber Clusters with double walls
  // Chamber NW
  for (let r = 2; r <= 7; r++) {
    for (let c = 3; c <= 12; c++) {
      if (r === 2 || r === 7 || c === 3 || c === 12) {
        if (!(r === 4 && c === 12)) grid[r][c] = 'RACK'; // airlock door at r=4
      }
    }
  }

  // Chamber NE
  for (let r = 2; r <= 7; r++) {
    for (let c = 19; c <= 28; c++) {
      if (r === 2 || r === 7 || c === 19 || c === 28) {
        if (!(r === 4 && c === 19)) grid[r][c] = 'RACK';
      }
    }
  }

  // Chamber SW
  for (let r = 12; r <= 17; r++) {
    for (let c = 3; c <= 12; c++) {
      if (r === 12 || r === 17 || c === 3 || c === 12) {
        if (!(r === 14 && c === 12)) grid[r][c] = 'RACK';
      }
    }
  }

  // Chamber SE
  for (let r = 12; r <= 17; r++) {
    for (let c = 19; c <= 28; c++) {
      if (r === 12 || r === 17 || c === 19 || c === 28) {
        if (!(r === 14 && c === 19)) grid[r][c] = 'RACK';
      }
    }
  }

  // Pick Stations inside containment corridors
  for (const py of [4, 14]) {
    grid[py][1] = 'PICK_STATION';
    pickStations.push({ x: 1, y: py });
    grid[py][7] = 'PICK_STATION';
    pickStations.push({ x: 7, y: py });
  }

  // Drop Bays
  for (const dy of [4, 14]) {
    grid[dy][30] = 'DROP_BAY';
    dropBays.push({ x: 30, y: dy });
    grid[dy][24] = 'DROP_BAY';
    dropBays.push({ x: 24, y: dy });
  }

  // Central Cryogenic Charging Pods
  for (const py of [8, 9, 10, 11]) {
    grid[py][15] = 'CHARGING_DOCK';
    chargingDocks.push({ x: 15, y: py });
    grid[py][16] = 'CHARGING_DOCK';
    chargingDocks.push({ x: 16, y: py });
  }

  // Waypoints for central containment junction
  const waypoints = [
    { x: 15, y: 1 }, { x: 16, y: 1 }, { x: 15, y: 18 }, { x: 16, y: 18 },
    { x: 1, y: 9 },  { x: 15, y: 9 }, { x: 16, y: 9 },  { x: 30, y: 9 }
  ];

  return {
    id: 'WH_4',
    name: 'Warehouse 04: Cold-Storage & Hazmat Containment Matrix',
    tag: 'HUB-CONTAINMENT',
    description: 'Quad-chamber containment architecture featuring hermetic airlocks, central cryogenic battery pads, and wide buffer safety lanes.',
    grid,
    pickStations,
    dropBays,
    chargingDocks,
    recessBays,
    waypoints
  };
}

/**
 * Returns the requested warehouse layout by ID
 */
export function getWarehouseLayout(id: WarehouseLayoutId): WarehouseLayout {
  switch (id) {
    case 'WH_1': return createWarehouse1Layout();
    case 'WH_2': return createWarehouse2Layout();
    case 'WH_3': return createWarehouse3Layout();
    case 'WH_4': return createWarehouse4Layout();
    default: return createWarehouse1Layout();
  }
}

/**
 * Backward compatibility alias
 */
export function createInitialWarehouseLayout(): WarehouseLayout {
  return createWarehouse1Layout();
}

export function manhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

export function isCellTraversable(grid: CellType[][], x: number, y: number): boolean {
  if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return false;
  const cell = grid[y][x];
  return cell !== 'RACK' && cell !== 'OBSTACLE';
}
