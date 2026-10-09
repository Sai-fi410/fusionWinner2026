import { CellType } from '../types/simulation';
import { GRID_WIDTH, GRID_HEIGHT, isCellTraversable } from './grid';

export interface PathNode {
  x: number;
  y: number;
  t: number;
  g: number;
  h: number;
  f: number;
  parent?: PathNode;
}

export interface PathResult {
  path: { x: number; y: number; t: number }[];
  latencyMs: number;
  isBlocked: boolean;
  unreachable: boolean;
  isSurrounded: boolean;
}

const CARDINALS = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
  { dx: 0, dy: 0 } // wait in place
];

/**
 * Computes an exact Obstacle-Aware True Distance Map (Cost-to-Go Matrix)
 * using Reverse Breadth-First Search (BFS) from the goal coordinate.
 *
 * This mathematically guarantees:
 * 1. Exact detection of whether the goal is reachable or if the route is 100% blocked by obstacles.
 * 2. Perfect admissible heuristic (h = h*) that guides A* directly around storage pods and detours
 *    without falling into false local minima (unlike naive Manhattan distance).
 */
export function computeTrueDistanceMap(
  grid: CellType[][],
  goalX: number,
  goalY: number
): number[][] {
  const distMap: number[][] = Array.from({ length: GRID_HEIGHT }, () =>
    Array.from({ length: GRID_WIDTH }, () => -1)
  );

  // If goal itself is blocked
  if (!isCellTraversable(grid, goalX, goalY)) {
    return distMap;
  }

  const queue: { x: number; y: number; d: number }[] = [];
  queue.push({ x: goalX, y: goalY, d: 0 });
  distMap[goalY][goalX] = 0;

  let head = 0;
  while (head < queue.length) {
    const { x, y, d } = queue[head++];

    for (const move of CARDINALS.slice(0, 4)) {
      const nx = x + move.dx;
      const ny = y + move.dy;

      if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
        if (distMap[ny][nx] === -1 && isCellTraversable(grid, nx, ny)) {
          distMap[ny][nx] = d + 1;
          queue.push({ x: nx, y: ny, d: d + 1 });
        }
      }
    }
  }

  return distMap;
}

/**
 * Smart 3D Space-Time Windowed Hierarchical Cooperative A* (WHCA*)
 * 
 * Upgraded with:
 * - True Distance Heuristic from reverse BFS
 * - Absolute route blockage & dead-end detection
 * - Vertex & edge/swap collision exclusion
 * - Dynamic detour selection around obstacles
 */
export function findSpaceTimePath(
  grid: CellType[][],
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  currentTick: number,
  horizon: number,
  reservationTable: Map<string, string>, // `${x},${y},${t}` -> agentId
  edgeReservationTable: Map<string, string>, // `${x1},${y1}->${x2},${y2}@${t}` -> agentId
  agentId: string,
  localBroadcastRadius: number = 8,
  prevX?: number,
  prevY?: number
): PathResult {
  const startTime = performance.now();

  // 1. Check if agent is completely surrounded
  let openNeighbors = 0;
  for (const move of CARDINALS.slice(0, 4)) {
    const nx = startX + move.dx;
    const ny = startY + move.dy;
    if (isCellTraversable(grid, nx, ny)) {
      openNeighbors++;
    }
  }
  const isSurrounded = (openNeighbors === 0);

  // 2. Compute True Distance Map from Goal
  const distMap = computeTrueDistanceMap(grid, goalX, goalY);
  const startDistance = distMap[startY][startX];

  // If start is disconnected from goal, THE ROUTE IS COMPLETELY BLOCKED!
  if (startDistance === -1) {
    const latencyMs = Math.max(0.2, performance.now() - startTime);
    return {
      path: [],
      latencyMs,
      isBlocked: true,
      unreachable: true,
      isSurrounded
    };
  }

  // 3. True Space-Time A* Search
  const openList: PathNode[] = [];
  const closedSet = new Set<string>();

  const startNode: PathNode = {
    x: startX,
    y: startY,
    t: currentTick,
    g: 0,
    h: startDistance,
    f: startDistance
  };

  openList.push(startNode);
  let bestNode: PathNode = startNode;
  let maxNodesExplored = 1200; // Expanded search space for complex multi-corridor detours

  while (openList.length > 0 && maxNodesExplored-- > 0) {
    // Pop lowest f-score (tie-break on lower h-score)
    let lowestIdx = 0;
    for (let i = 1; i < openList.length; i++) {
      if (
        openList[i].f < openList[lowestIdx].f ||
        (openList[i].f === openList[lowestIdx].f && openList[i].h < openList[lowestIdx].h)
      ) {
        lowestIdx = i;
      }
    }
    const current = openList.splice(lowestIdx, 1)[0];

    // Goal reached or window horizon reached
    if ((current.x === goalX && current.y === goalY) || (current.t - currentTick >= horizon)) {
      bestNode = current;
      break;
    }

    if (current.h < bestNode.h) {
      bestNode = current;
    }

    const stateKey = `${current.x},${current.y},${current.t}`;
    closedSet.add(stateKey);

    // Expand cardinal moves + wait in place
    for (const move of CARDINALS) {
      const nextX = current.x + move.dx;
      const nextY = current.y + move.dy;
      const nextT = current.t + 1;

      // Must be physically traversable
      if (!isCellTraversable(grid, nextX, nextY)) continue;

      // Must have valid path to goal according to true distance map
      const nextH = distMap[nextY][nextX];
      if (nextH === -1) continue; // Leads to a dead-end blocked pocket!

      // Check space-time reservations
      const distFromStart = Math.abs(startX - nextX) + Math.abs(startY - nextY);
      if (distFromStart <= localBroadcastRadius) {
        // Vertex collision check
        const vertexKey = `${nextX},${nextY},${nextT}`;
        const occupant = reservationTable.get(vertexKey);
        if (occupant && occupant !== agentId) {
          continue; // Vertex reserved!
        }

        // Edge / Swap collision check
        const opposingEdgeKey = `${nextX},${nextY}->${current.x},${current.y}@${current.t}`;
        if (edgeReservationTable.has(opposingEdgeKey)) {
          continue; // Swap collision avoided!
        }
      }

      const nextStateKey = `${nextX},${nextY},${nextT}`;
      if (closedSet.has(nextStateKey)) continue;

      // Cost calculation with Anti-Oscillation Penalty:
      // Heavily penalizes immediately moving backwards into the cell just vacated,
      // which completely breaks the ping-pong / back-and-forth loop!
      const isWait = (move.dx === 0 && move.dy === 0);
      const isReverse = (current.t === currentTick && prevX !== undefined && prevY !== undefined && nextX === prevX && nextY === prevY);
      const reversePenalty = isReverse ? 4.0 : 0.0;
      const stepCost = (isWait ? 1.5 : 1.0) + reversePenalty;
      const nextG = current.g + stepCost;
      const nextF = nextG + nextH;

      const existingOpen = openList.find(n => n.x === nextX && n.y === nextY && n.t === nextT);
      if (existingOpen) {
        if (nextG < existingOpen.g) {
          existingOpen.g = nextG;
          existingOpen.f = nextF;
          existingOpen.parent = current;
        }
      } else {
        openList.push({
          x: nextX,
          y: nextY,
          t: nextT,
          g: nextG,
          h: nextH,
          f: nextF,
          parent: current
        });
      }
    }
  }

  // Reconstruct path
  const path: { x: number; y: number; t: number }[] = [];
  let curr: PathNode | undefined = bestNode;
  while (curr) {
    path.unshift({ x: curr.x, y: curr.y, t: curr.t });
    curr = curr.parent;
  }

  const latencyMs = Math.max(0.5, performance.now() - startTime);

  return {
    path,
    latencyMs,
    isBlocked: false,
    unreachable: false,
    isSurrounded
  };
}
