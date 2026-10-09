export type CellType = 
  | 'EMPTY'           // 0: Walkable corridor
  | 'RACK'            // 1: Permanent storage pod
  | 'PICK_STATION'    // 2: Induction / Pick Bay
  | 'DROP_BAY'        // 3: Pack / Delivery Bay
  | 'CHARGING_DOCK'   // 4: Battery Charger
  | 'RECESS_BAY'      // 5: Deadlock Yield Alcove
  | 'OBSTACLE';       // 6: Dynamic Blockage / Spilled Pallet

export type AgentState = 
  | 'IDLE' 
  | 'BIDDING' 
  | 'EN_ROUTE_PICKUP' 
  | 'CARRYING_TASK' 
  | 'YIELDING' 
  | 'CHARGING' 
  | 'CRITICAL_FAILURE'
  | 'TOWING_RECOVERY'
  | 'PARKED_REPAIR';

export type TaskPriority = 'STANDARD' | 'EXPRESS';

export type ToolMode = 'INSPECT' | 'OBSTACLE' | 'KILL';

export interface Task {
  id: string;
  pickup: { x: number; y: number };
  dropoff: { x: number; y: number };
  priority: TaskPriority;
  status: 'PENDING_AUCTION' | 'ASSIGNED' | 'IN_TRANSIT' | 'COMPLETED' | 'DROPPED_SALVAGE';
  assignedAgentId?: string;
  createdAtTick: number;
}

export interface Agent {
  id: string;
  name: string;
  x: number;
  y: number;
  subX: number;
  subY: number;
  targetX?: number;
  targetY?: number;
  state: AgentState;
  battery: number;
  currentTaskId?: string;
  path: { x: number; y: number; t: number }[];
  heading: number; // in radians
  priority: TaskPriority;
  isHardwareTwin: boolean;
  yieldWaitTicks: number;
  commPulseRadius: number;
  lastRerouteLatencyMs: number;
  isRouteBlocked?: boolean;
  blockedReason?: string;
  towedAgentId?: string;
  towedByAgentId?: string;
  needsRecovery?: boolean;
  rescueAssignedAgentId?: string;
}

export interface SpaceTimeSlot {
  x: number;
  y: number;
  t: number;
  agentId: string;
}

export type SystemMode = 'SIMULATION' | 'HARDWARE_TWIN';
export type ArchitectureMode = 'DECENTRALIZED' | 'CENTRALIZED';

export interface CellInspectionInfo {
  x: number;
  y: number;
  type: CellType;
  traversable: boolean;
  congestionScore: number;
  occupantAgent?: Agent;
  isPickStation?: boolean;
  isDropBay?: boolean;
  parcelQueueCount?: number;
}

export interface TelemetryData {
  activeFleet: number;
  throughputPerMin: number;
  avgLatencyMs: number;
  collisionCount: number;
  energySavedPct: number;
  completedTasksCount: number;
  centralizedLatencyLagMs: number;
  hardwareTwinConnected: boolean;
  hardwareTofDistanceMm: number;
  isRouteFullyBlocked: boolean;
  blockedAgentCount: number;
  blockedAlertMessage?: string;
  stationQueues: Record<string, number>;
  totalQueuedParcels: number;
}

export interface GridConfig {
  width: number;
  height: number;
  cellSize: number;
}

export interface HardwareCsvRow {
  timestamp: number;
  iso_time: string;
  robot_id: string;
  x: number;
  y: number;
  heading: number;
  ultrasonic_distance_cm: number;
  servo_angle: number;
  obstacle_detected: boolean;
  target_x: number;
  target_y: number;
  task_state: string;
  motor_left_pwm: number;
  motor_right_pwm: number;
  command_issued: string;
  latency_ms: number;
}

export interface HardwareRobotState {
  robotId: string;
  x: number;
  y: number;
  heading: number;
  missionState: string;
  targetPickup: { x: number; y: number };
  targetDropoff: { x: number; y: number };
  currentTarget: { x: number; y: number };
  lastUltrasonicCm: number;
  lastServoAngle: number;
  obstacleDetected: boolean;
  blockedObstacles: string[];
  pathRemaining: number;
  currentPath: { x: number; y: number }[];
  motorLeftPwm: number;
  motorRightPwm: number;
}
