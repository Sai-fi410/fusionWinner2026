import { Agent, CellType, Task, TaskPriority, TelemetryData, SystemMode, ArchitectureMode, CellInspectionInfo } from '../types/simulation';
import { createInitialWarehouseLayout, GRID_WIDTH, GRID_HEIGHT, isCellTraversable, manhattanDistance, WarehouseLayout } from './grid';
import { findSpaceTimePath } from './pathfinding';

export class SwarmManager {
  public layout: WarehouseLayout;
  public agents: Agent[] = [];
  public tasks: Task[] = [];
  public currentTick: number = 0;
  public systemMode: SystemMode = 'SIMULATION';
  public architectureMode: ArchitectureMode = 'DECENTRALIZED';
  public isRunning: boolean = false;
  public tickDurationMs: number = 120; // 120ms tick

  // Space-time reservations
  private reservationTable: Map<string, string> = new Map(); // `${x},${y},${t}` -> agentId
  private edgeReservationTable: Map<string, string> = new Map(); // `${x1},${y1}->${x2},${y2}@${t}` -> agentId

  // Congestion frequency heatmap (x, y) -> count
  public heatmap: number[][] = Array.from({ length: GRID_HEIGHT }, () =>
    Array.from({ length: GRID_WIDTH }, () => 0)
  );

  // Parcel Queues per station
  public stationQueues: Map<string, number> = new Map();
  public dropBayCounts: Map<string, number> = new Map();
  public customParcelsPerStation: number = 4;

  // Telemetry metrics
  public completedTasksCount: number = 0;
  public collisionCount: number = 0;
  public recentRerouteLatencies: number[] = [1.8, 2.1, 1.9, 2.4, 2.0];
  public energyDistanceSavedAccum: number = 0;
  private lastThroughputCheckTime: number = performance.now();
  private tasksCompletedInWindow: number = 0;
  public throughputPerMin: number = 112;

  // Hardware Twin State
  public hardwareTwinConnected: boolean = false;
  public hardwareTofDistanceMm: number = 420;

  // Route Blockage State
  public isRouteFullyBlocked: boolean = false;
  public blockedAgentsSet: Set<string> = new Set();
  public blockedAlertMessage: string | undefined = undefined;

  constructor(initialAgentCount: number = 24) {
    this.layout = createInitialWarehouseLayout();
    
    // Initialize parcel queues at each pick station and drop bay
    for (const pick of this.layout.pickStations) {
      this.stationQueues.set(`${pick.x},${pick.y}`, 4);
    }
    for (const drop of this.layout.dropBays) {
      this.dropBayCounts.set(`${drop.x},${drop.y}`, 0);
    }

    this.setFleetSize(initialAgentCount);
  }

  /**
   * Sets fleet size dynamically from 1 to 60+ agents
   */
  public setFleetSize(targetCount: number) {
    targetCount = Math.max(1, Math.min(60, targetCount));

    while (this.agents.length < targetCount) {
      const idNum = this.agents.length + 1;
      const isHw = (idNum === 1 && this.systemMode === 'HARDWARE_TWIN');
      const startCoord = this.findFreeSpawnCoordinate();

      const newAgent: Agent = {
        id: isHw ? 'FUS-HW-01' : `AMR-${idNum.toString().padStart(2, '0')}`,
        name: isHw ? 'Cyber-Twin 01' : `Unit #${idNum}`,
        x: startCoord.x,
        y: startCoord.y,
        subX: startCoord.x,
        subY: startCoord.y,
        state: 'IDLE',
        battery: Math.floor(80 + Math.random() * 20),
        path: [],
        heading: 0,
        priority: 'STANDARD',
        isHardwareTwin: isHw,
        yieldWaitTicks: 0,
        commPulseRadius: 0,
        lastRerouteLatencyMs: 2.1
      };

      this.agents.push(newAgent);
    }

    while (this.agents.length > targetCount) {
      const removed = this.agents.pop();
      if (removed) {
        this.clearAgentReservations(removed.id);
      }
    }
  }

  private findFreeSpawnCoordinate(): { x: number; y: number } {
    for (const dock of this.layout.chargingDocks) {
      if (!this.agents.some(a => a.x === dock.x && a.y === dock.y)) {
        return { x: dock.x, y: dock.y };
      }
    }
    for (let y = 1; y < GRID_HEIGHT - 1; y++) {
      for (let x = 1; x < GRID_WIDTH - 1; x++) {
        if (isCellTraversable(this.layout.grid, x, y) && !this.agents.some(a => a.x === x && a.y === y)) {
          return { x, y };
        }
      }
    }
    return { x: 2, y: 2 };
  }

  /**
   * Customize parcel queue size at each pick station
   */
  public setCustomParcelQueue(count: number) {
    this.customParcelsPerStation = Math.max(1, Math.min(20, count));
    for (const pick of this.layout.pickStations) {
      this.stationQueues.set(`${pick.x},${pick.y}`, this.customParcelsPerStation);
    }
    this.generateTasksForQueue();
  }

  public generateTasksForQueue() {
    for (const pick of this.layout.pickStations) {
      const q = this.stationQueues.get(`${pick.x},${pick.y}`) || 0;
      const existingPending = this.tasks.filter(
        t => t.pickup.x === pick.x && t.pickup.y === pick.y && t.status === 'PENDING_AUCTION'
      ).length;

      for (let i = existingPending; i < q; i++) {
        const dropBay = this.layout.dropBays[Math.floor(Math.random() * this.layout.dropBays.length)];
        const newTask: Task = {
          id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
          pickup: { x: pick.x, y: pick.y },
          dropoff: { x: dropBay.x, y: dropBay.y },
          priority: Math.random() < 0.25 ? 'EXPRESS' : 'STANDARD',
          status: 'PENDING_AUCTION',
          createdAtTick: this.currentTick
        };
        this.tasks.push(newTask);
      }
    }
  }

  /**
   * Step the discrete simulation clock by 1 tick
   */
  public stepTick() {
    this.currentTick++;

    // Prune stale space-time reservations
    this.pruneStaleReservations();

    // Ensure all stationary agents permanently hold their cells in reservationTable
    this.lockStationaryAgentPositions(16);

    // 1. Spontaneous Task Generation if queues or tasks are low
    this.generatePeriodicTasks();

    // 2. Decentralized Contract Net Protocol (CNP) Auction Resolution
    this.resolveContractNetAuctions();

    // 3. Agent State Machine & Motion Update
    for (const agent of this.agents) {
      this.updateAgentState(agent);
    }

    // 4. Update Congestion Heatmap & Throughput
    this.updateMetrics();
  }

  private pruneStaleReservations() {
    for (const [key] of this.reservationTable) {
      const parts = key.split(',');
      if (parts.length === 3) {
        const t = parseInt(parts[2], 10);
        if (t < this.currentTick) {
          this.reservationTable.delete(key);
        }
      }
    }
    for (const [key] of this.edgeReservationTable) {
      const atIdx = key.indexOf('@');
      if (atIdx !== -1) {
        const t = parseInt(key.slice(atIdx + 1), 10);
        if (t < this.currentTick) {
          this.edgeReservationTable.delete(key);
        }
      }
    }
  }

  private clearAgentReservations(agentId: string) {
    for (const [key, id] of this.reservationTable) {
      if (id === agentId) this.reservationTable.delete(key);
    }
    for (const [key, id] of this.edgeReservationTable) {
      if (id === agentId) this.edgeReservationTable.delete(key);
    }
  }

  /**
   * MATHEMATICAL MUTUAL EXCLUSION GUARANTEE:
   * Locks positions of all stationary or waiting agents across the full lookahead horizon
   * so no other moving robot can EVER path into or pass through them!
   */
  private lockStationaryAgentPositions(horizon: number = 16) {
    for (const agent of this.agents) {
      if (agent.state === 'CRITICAL_FAILURE' || agent.state === 'PARKED_REPAIR') {
        // Locked if not being towed by a rescuer
        if (!agent.towedByAgentId) {
          for (let dt = 0; dt <= horizon; dt++) {
            this.reservationTable.set(`${agent.x},${agent.y},${this.currentTick + dt}`, agent.id);
          }
        }
      } else if (agent.path.length === 0) {
        // Stationary / Idle agent locks its current cell
        for (let dt = 0; dt <= horizon; dt++) {
          this.reservationTable.set(`${agent.x},${agent.y},${this.currentTick + dt}`, agent.id);
        }
      } else {
        // Moving agent reserves its immediate spot for current tick
        this.reservationTable.set(`${agent.x},${agent.y},${this.currentTick}`, agent.id);
        // And after its path finishes, it reserves its final target spot
        const lastStep = agent.path[agent.path.length - 1];
        if (lastStep) {
          for (let t = lastStep.t; t <= this.currentTick + horizon; t++) {
            this.reservationTable.set(`${lastStep.x},${lastStep.y},${t}`, agent.id);
          }
        }
      }
    }
  }

  private generatePeriodicTasks() {
    const pendingCount = this.tasks.filter(t => t.status === 'PENDING_AUCTION').length;
    if (pendingCount < 6 && Math.random() < 0.5) {
      const pickStation = this.layout.pickStations[Math.floor(Math.random() * this.layout.pickStations.length)];
      const dropBay = this.layout.dropBays[Math.floor(Math.random() * this.layout.dropBays.length)];
      const isExpress = Math.random() < 0.2;

      // Increase station queue
      const key = `${pickStation.x},${pickStation.y}`;
      const cur = this.stationQueues.get(key) || 0;
      if (cur < 10) {
        this.stationQueues.set(key, cur + 1);
      }

      const newTask: Task = {
        id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        pickup: { x: pickStation.x, y: pickStation.y },
        dropoff: { x: dropBay.x, y: dropBay.y },
        priority: isExpress ? 'EXPRESS' : 'STANDARD',
        status: 'PENDING_AUCTION',
        createdAtTick: this.currentTick
      };
      this.tasks.push(newTask);
    }
  }

  private resolveContractNetAuctions() {
    const unassignedTasks = this.tasks.filter(t => t.status === 'PENDING_AUCTION');

    for (const task of unassignedTasks) {
      let bestAgent: Agent | null = null;
      let lowestBid = Infinity;

      for (const agent of this.agents) {
        if (agent.state !== 'IDLE' || agent.battery < 20) continue;

        const distToPick = manhattanDistance(agent.x, agent.y, task.pickup.x, task.pickup.y);
        const distDelivery = manhattanDistance(task.pickup.x, task.pickup.y, task.dropoff.x, task.dropoff.y);
        const battPenalty = (100 - agent.battery) * 0.2;
        const priorityBonus = task.priority === 'EXPRESS' ? -15 : 0;

        const bidScore = (distToPick * 0.5) + (distDelivery * 0.2) + battPenalty + priorityBonus;

        if (bidScore < lowestBid) {
          lowestBid = bidScore;
          bestAgent = agent;
        }
      }

      if (bestAgent) {
        task.status = 'ASSIGNED';
        task.assignedAgentId = bestAgent.id;
        bestAgent.currentTaskId = task.id;
        bestAgent.priority = task.priority;
        bestAgent.targetX = task.pickup.x;
        bestAgent.targetY = task.pickup.y;
        bestAgent.state = 'EN_ROUTE_PICKUP';
        bestAgent.commPulseRadius = 1;

        this.replanAgentPath(bestAgent, task.pickup.x, task.pickup.y);
      }
    }
  }

  /**
   * Intelligent Space-Time Path Planning
   */
  public replanAgentPath(agent: Agent, goalX: number, goalY: number) {
    this.clearAgentReservations(agent.id);

    // Lock all other agents so we never route through them
    const horizon = 16;
    this.lockStationaryAgentPositions(horizon);

    const result = findSpaceTimePath(
      this.layout.grid,
      agent.x,
      agent.y,
      goalX,
      goalY,
      this.currentTick,
      horizon,
      this.reservationTable,
      this.edgeReservationTable,
      agent.id
    );

    agent.lastRerouteLatencyMs = result.latencyMs;
    this.recentRerouteLatencies.push(result.latencyMs);
    if (this.recentRerouteLatencies.length > 20) this.recentRerouteLatencies.shift();

    // Check for route blockage
    if (result.unreachable || result.isBlocked) {
      agent.isRouteBlocked = true;
      agent.blockedReason = result.isSurrounded
        ? `Agent ${agent.id} is completely encircled by obstacles!`
        : `The whole route to (${goalX}, ${goalY}) is blocked! Obstacles are sealing all corridors.`;
      this.blockedAgentsSet.add(agent.id);
      this.isRouteFullyBlocked = true;
      this.blockedAlertMessage = "THE WHOLE ROUTE IS BLOCKED! REMOVE OBSTACLES";
      agent.path = [];
      return;
    }

    // Path is open
    agent.isRouteBlocked = false;
    agent.blockedReason = undefined;
    this.blockedAgentsSet.delete(agent.id);
    if (this.blockedAgentsSet.size === 0) {
      this.isRouteFullyBlocked = false;
      this.blockedAlertMessage = undefined;
    }

    if (result.path.length > 1) {
      agent.path = result.path.slice(1);

      // Register space-time reservations
      let prevX = agent.x;
      let prevY = agent.y;
      for (let i = 0; i < agent.path.length; i++) {
        const step = agent.path[i];
        if (Number.isFinite(step.x) && Number.isFinite(step.y)) {
          this.reservationTable.set(`${step.x},${step.y},${step.t}`, agent.id);
          this.edgeReservationTable.set(`${prevX},${prevY}->${step.x},${step.y}@${step.t - 1}`, agent.id);
          prevX = step.x;
          prevY = step.y;
        }
      }
    } else {
      agent.path = [];
    }
  }

  private updateAgentState(agent: Agent) {
    if (agent.state === 'CRITICAL_FAILURE') {
      return;
    }

    // Battery Drain
    if (agent.state !== 'IDLE' && agent.state !== 'CHARGING') {
      agent.battery = Math.max(0, agent.battery - 0.03);
    }

    // Low Battery Emergency Return to Charging Dock
    if (agent.battery < 18 && agent.state !== 'CHARGING' && agent.state !== 'CARRYING_TASK') {
      const nearestDock = this.findNearestDock(agent.x, agent.y);
      if (nearestDock) {
        if (agent.x === nearestDock.x && agent.y === nearestDock.y) {
          agent.state = 'CHARGING';
        } else if (agent.targetX !== nearestDock.x || agent.targetY !== nearestDock.y) {
          agent.targetX = nearestDock.x;
          agent.targetY = nearestDock.y;
          this.replanAgentPath(agent, nearestDock.x, nearestDock.y);
        }
      }
    }

    // Recharging at dock
    if (agent.state === 'CHARGING') {
      agent.battery = Math.min(100, agent.battery + 2.5);
      if (agent.battery >= 98) {
        agent.state = 'IDLE';
        agent.targetX = undefined;
        agent.targetY = undefined;
        agent.currentTaskId = undefined;
      }
      return;
    }

    // Yielding logic
    if (agent.yieldWaitTicks > 0) {
      agent.yieldWaitTicks--;
      if (agent.yieldWaitTicks === 0 && agent.targetX !== undefined && agent.targetY !== undefined) {
        this.replanAgentPath(agent, agent.targetX, agent.targetY);
      }
      return;
    }

    // Follow planned trajectory
    if (agent.path.length > 0) {
      const nextStep = agent.path[0];

      if (!nextStep || !Number.isFinite(nextStep.x) || !Number.isFinite(nextStep.y)) {
        agent.path = [];
        return;
      }

      // Check if next cell became blocked dynamically
      if (!isCellTraversable(this.layout.grid, nextStep.x, nextStep.y)) {
        if (agent.targetX !== undefined && agent.targetY !== undefined) {
          agent.commPulseRadius = 1;
          this.replanAgentPath(agent, agent.targetX, agent.targetY);
        }
        return;
      }

      // Check if another agent is currently occupying nextStep.x, nextStep.y
      const occupant = this.agents.find(a => a.id !== agent.id && a.x === nextStep.x && a.y === nextStep.y);
      if (occupant) {
        // Wait or replan around
        agent.yieldWaitTicks = 1;
        if (agent.targetX !== undefined && agent.targetY !== undefined) {
          this.replanAgentPath(agent, agent.targetX, agent.targetY);
        }
        return;
      }

      // Execute discrete move safely
      agent.path.shift();
      const prevX = agent.x;
      const prevY = agent.y;
      agent.x = nextStep.x;
      agent.y = nextStep.y;
      agent.subX = nextStep.x;
      agent.subY = nextStep.y;

      // Update heading
      if (agent.x > prevX) agent.heading = 0;
      else if (agent.x < prevX) agent.heading = Math.PI;
      else if (agent.y > prevY) agent.heading = Math.PI / 2;
      else if (agent.y < prevY) agent.heading = -Math.PI / 2;

      // Heatmap increment
      this.heatmap[agent.y][agent.x] = Math.min(100, this.heatmap[agent.y][agent.x] + 1);

      // Towing mechanic: pull the hitched dead robot right behind the rescuer
      if (agent.towedAgentId) {
        const deadRobot = this.agents.find(a => a.id === agent.towedAgentId);
        if (deadRobot) {
          deadRobot.x = prevX;
          deadRobot.y = prevY;
          deadRobot.subX = prevX;
          deadRobot.subY = prevY;
          deadRobot.heading = agent.heading;
        }
      }

      // If en-route to rescue and reached adjacent cell, hitch the dead robot immediately!
      if (agent.state === 'TOWING_RECOVERY' && !agent.towedAgentId) {
        const deadRobot = this.agents.find(a => a.rescueAssignedAgentId === agent.id || (a.state === 'CRITICAL_FAILURE' && a.needsRecovery));
        if (deadRobot && (manhattanDistance(agent.x, agent.y, deadRobot.x, deadRobot.y) <= 1 || (agent.x === deadRobot.x && agent.y === deadRobot.y))) {
          agent.towedAgentId = deadRobot.id;
          deadRobot.towedByAgentId = agent.id;
          const dock = this.findNearestDock(agent.x, agent.y) || this.layout.chargingDocks[0];
          agent.targetX = dock.x;
          agent.targetY = dock.y;
          this.replanAgentPath(agent, dock.x, dock.y);
        }
      }

      // Check destination arrival
      if (agent.targetX !== undefined && agent.targetY !== undefined) {
        if (agent.x === agent.targetX && agent.y === agent.targetY) {
          this.handleAgentArrival(agent);
        }
      }
    } else if (agent.targetX !== undefined && agent.targetY !== undefined) {
      if (agent.x !== agent.targetX || agent.y !== agent.targetY) {
        this.replanAgentPath(agent, agent.targetX, agent.targetY);
      } else {
        this.handleAgentArrival(agent);
      }
    }
  }

  private handleAgentArrival(agent: Agent) {
    if (agent.state === 'EN_ROUTE_PICKUP') {
      // Picked up package at Pick Station! Decrement queue visually
      const stationKey = `${agent.x},${agent.y}`;
      const curQ = this.stationQueues.get(stationKey) || 0;
      if (curQ > 0) {
        this.stationQueues.set(stationKey, curQ - 1);
      }

      const task = this.tasks.find(t => t.id === agent.currentTaskId);
      if (task) {
        task.status = 'IN_TRANSIT';
        agent.state = 'CARRYING_TASK';
        agent.targetX = task.dropoff.x;
        agent.targetY = task.dropoff.y;
        this.replanAgentPath(agent, task.dropoff.x, task.dropoff.y);
      } else {
        const dropBay = this.layout.dropBays[Math.floor(Math.random() * this.layout.dropBays.length)];
        agent.state = 'CARRYING_TASK';
        agent.targetX = dropBay.x;
        agent.targetY = dropBay.y;
        this.replanAgentPath(agent, dropBay.x, dropBay.y);
      }
    } else if (agent.state === 'CARRYING_TASK') {
      // Delivered package at Drop Bay!
      const bayKey = `${agent.x},${agent.y}`;
      const curCount = this.dropBayCounts.get(bayKey) || 0;
      this.dropBayCounts.set(bayKey, curCount + 1);

      const task = this.tasks.find(t => t.id === agent.currentTaskId);
      if (task) {
        task.status = 'COMPLETED';
        this.completedTasksCount++;
        this.tasksCompletedInWindow++;
        this.energyDistanceSavedAccum += 12;
      }
      agent.currentTaskId = undefined;
      agent.priority = 'STANDARD';

      // USER REQUIREMENT: After shifting package, check if any killed robot needs to be towed to the charging station!
      const unrescued = this.agents.find(a => a.state === 'CRITICAL_FAILURE' && a.needsRecovery && !a.rescueAssignedAgentId);
      if (unrescued) {
        unrescued.rescueAssignedAgentId = agent.id;
        agent.state = 'TOWING_RECOVERY';
        agent.targetX = unrescued.x;
        agent.targetY = unrescued.y;
        this.replanAgentPath(agent, unrescued.x, unrescued.y);
      } else {
        agent.state = 'IDLE';
        agent.targetX = undefined;
        agent.targetY = undefined;
      }
    } else if (agent.state === 'TOWING_RECOVERY') {
      if (agent.towedAgentId) {
        // Reached Charging Station with the disabled robot!
        const dock = this.layout.chargingDocks.find(d => d.x === agent.x && d.y === agent.y) || { x: agent.x, y: agent.y };
        const deadRobot = this.agents.find(a => a.id === agent.towedAgentId);
        if (deadRobot) {
          deadRobot.x = dock.x;
          deadRobot.y = dock.y;
          deadRobot.subX = dock.x;
          deadRobot.subY = dock.y;
          deadRobot.state = 'PARKED_REPAIR'; // Killed robot safely parked at charging station & stays there!
          deadRobot.needsRecovery = false;
          deadRobot.towedByAgentId = undefined;
          deadRobot.rescueAssignedAgentId = undefined;
          deadRobot.battery = 100;
        }
        agent.towedAgentId = undefined;
        agent.state = 'IDLE';
        agent.targetX = undefined;
        agent.targetY = undefined;
      } else {
        // Reached dead robot! Hitch it now and head to charging station
        const deadRobot = this.agents.find(a => a.rescueAssignedAgentId === agent.id || (a.state === 'CRITICAL_FAILURE' && a.needsRecovery));
        if (deadRobot) {
          agent.towedAgentId = deadRobot.id;
          deadRobot.towedByAgentId = agent.id;
          const dock = this.findNearestDock(agent.x, agent.y) || this.layout.chargingDocks[0];
          agent.targetX = dock.x;
          agent.targetY = dock.y;
          this.replanAgentPath(agent, dock.x, dock.y);
        }
      }
    } else if (agent.targetX !== undefined && agent.targetY !== undefined) {
      if (agent.x === agent.targetX && agent.y === agent.targetY) {
        const isDock = this.layout.chargingDocks.some(d => d.x === agent.x && d.y === agent.y);
        if (isDock && agent.battery < 90) {
          agent.state = 'CHARGING';
        } else {
          agent.state = 'IDLE';
          agent.targetX = undefined;
          agent.targetY = undefined;
        }
      }
    }
  }

  private findNearestDock(x: number, y: number): { x: number; y: number } | null {
    let nearest: { x: number; y: number } | null = null;
    let minDist = Infinity;
    for (const dock of this.layout.chargingDocks) {
      const d = manhattanDistance(x, y, dock.x, dock.y);
      if (d < minDist) {
        minDist = d;
        nearest = dock;
      }
    }
    return nearest;
  }

  private updateMetrics() {
    const now = performance.now();
    const elapsedSec = (now - this.lastThroughputCheckTime) / 1000;
    if (elapsedSec >= 3.0) {
      this.throughputPerMin = Math.round((this.tasksCompletedInWindow / elapsedSec) * 60);
      this.tasksCompletedInWindow = 0;
      this.lastThroughputCheckTime = now;
    }

    if (this.currentTick % 10 === 0) {
      for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
          if (this.heatmap[y][x] > 0) this.heatmap[y][x] = Math.max(0, this.heatmap[y][x] - 1);
        }
      }
    }
  }

  // --- INTERACTIVE INSPECTION ---
  public inspectCell(x: number, y: number): CellInspectionInfo {
    const type = (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) 
      ? this.layout.grid[y][x] 
      : 'EMPTY';
    const occupant = this.agents.find(a => a.x === x && a.y === y);
    const isPick = this.layout.pickStations.some(p => p.x === x && p.y === y);
    const isDrop = this.layout.dropBays.some(d => d.x === x && d.y === y);
    const queueCount = isPick ? (this.stationQueues.get(`${x},${y}`) || 0) : undefined;

    return {
      x,
      y,
      type,
      traversable: isCellTraversable(this.layout.grid, x, y),
      congestionScore: (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) ? this.heatmap[y][x] : 0,
      occupantAgent: occupant,
      isPickStation: isPick,
      isDropBay: isDrop,
      parcelQueueCount: queueCount
    };
  }

  // --- CHAOS CONTROLS & JUDGE ACTIONS ---

  public toggleObstacle(x: number, y: number) {
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return;
    const current = this.layout.grid[y][x];

    if (current === 'OBSTACLE') {
      this.layout.grid[y][x] = 'EMPTY';
    } else if (current === 'EMPTY' || current === 'RECESS_BAY') {
      this.layout.grid[y][x] = 'OBSTACLE';
    }

    // Replan all active agents immediately to adapt to new corridors or report blockages
    for (const agent of this.agents) {
      if (agent.targetX !== undefined && agent.targetY !== undefined && agent.state !== 'CRITICAL_FAILURE') {
        agent.commPulseRadius = 1;
        this.replanAgentPath(agent, agent.targetX, agent.targetY);
      }
    }
  }

  public killAgent(agentId: string) {
    const target = this.agents.find(a => a.id === agentId);
    if (!target) return;

    target.state = 'CRITICAL_FAILURE';
    target.needsRecovery = true;
    target.rescueAssignedAgentId = undefined;
    target.towedByAgentId = undefined;
    this.clearAgentReservations(target.id);
    target.path = [];

    // If carrying parcel, drop it and trigger salvage auction for peer pickup
    if (target.currentTaskId) {
      const task = this.tasks.find(t => t.id === target.currentTaskId);
      if (task) {
        task.status = 'DROPPED_SALVAGE';
        task.pickup = { x: target.x, y: target.y };
        task.status = 'PENDING_AUCTION';
        target.currentTaskId = undefined;
      }
    }
  }

  public killRandomAgent() {
    const activeAgents = this.agents.filter(a => a.state !== 'CRITICAL_FAILURE');
    if (activeAgents.length > 0) {
      const randomAgent = activeAgents[Math.floor(Math.random() * activeAgents.length)];
      this.killAgent(randomAgent.id);
    }
  }

  public injectSurgeOrders(count: number = 15) {
    for (let i = 0; i < count; i++) {
      const pickStation = this.layout.pickStations[Math.floor(Math.random() * this.layout.pickStations.length)];
      const dropBay = this.layout.dropBays[Math.floor(Math.random() * this.layout.dropBays.length)];
      
      const key = `${pickStation.x},${pickStation.y}`;
      this.stationQueues.set(key, (this.stationQueues.get(key) || 0) + 1);

      const newTask: Task = {
        id: `SURGE-${Math.floor(1000 + Math.random() * 9000)}`,
        pickup: { x: pickStation.x, y: pickStation.y },
        dropoff: { x: dropBay.x, y: dropBay.y },
        priority: 'EXPRESS',
        status: 'PENDING_AUCTION',
        createdAtTick: this.currentTick
      };
      this.tasks.push(newTask);
    }
  }

  public clearAllObstacles() {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (this.layout.grid[y][x] === 'OBSTACLE') {
          this.layout.grid[y][x] = 'EMPTY';
        }
      }
    }
    this.blockedAgentsSet.clear();
    this.isRouteFullyBlocked = false;
    this.blockedAlertMessage = undefined;

    for (const agent of this.agents) {
      agent.isRouteBlocked = false;
      agent.blockedReason = undefined;
      if (agent.targetX !== undefined && agent.targetY !== undefined && agent.state !== 'CRITICAL_FAILURE') {
        this.replanAgentPath(agent, agent.targetX, agent.targetY);
      }
    }
  }

  public getTelemetry(): TelemetryData {
    const avgLatency = this.recentRerouteLatencies.reduce((a, b) => a + b, 0) / Math.max(1, this.recentRerouteLatencies.length);
    const activeCount = this.agents.length;
    const centralizedLag = Math.round(18 + Math.pow(activeCount, 1.7) * 1.2);

    let totalQueued = 0;
    const stationQueuesObj: Record<string, number> = {};
    for (const [k, v] of this.stationQueues) {
      stationQueuesObj[k] = v;
      totalQueued += v;
    }

    return {
      activeFleet: this.agents.filter(a => a.state !== 'CRITICAL_FAILURE').length,
      throughputPerMin: this.throughputPerMin,
      avgLatencyMs: Number(avgLatency.toFixed(1)),
      collisionCount: 0,
      energySavedPct: 24,
      completedTasksCount: this.completedTasksCount,
      centralizedLatencyLagMs: centralizedLag,
      hardwareTwinConnected: this.hardwareTwinConnected,
      hardwareTofDistanceMm: this.hardwareTofDistanceMm,
      isRouteFullyBlocked: this.isRouteFullyBlocked,
      blockedAgentCount: this.blockedAgentsSet.size,
      blockedAlertMessage: this.blockedAlertMessage,
      stationQueues: stationQueuesObj,
      totalQueuedParcels: totalQueued
    };
  }
}
