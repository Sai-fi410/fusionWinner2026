/**
 * Hardware Twin Navigation Engine
 * Coordinates real-time two-way communication between the ESP32 differential-drive robot
 * and the warehouse route planner.
 */

const GRID_WIDTH = 32;
const GRID_HEIGHT = 20;

// Obstacle threshold: any reading below this in cm is flagged as a physical barrier
const OBSTACLE_DISTANCE_THRESHOLD_CM = 18.0;

// Direction angles (degrees)
// 0: East (+X), 90: South (+Y), 180: West (-X), 270: North (-Y)
const DIR_EAST = 0;
const DIR_SOUTH = 90;
const DIR_WEST = 180;
const DIR_NORTH = 270;

export class NavigationEngine {
  constructor() {
    this.robotId = 'FUS-HW-01';
    
    // Robot Real-Time State
    this.x = 1.0;
    this.y = 3.0;
    this.heading = DIR_EAST;
    
    // Targets
    this.targetPickup = { x: 1, y: 3 };
    this.targetDropoff = { x: 30, y: 16 };
    this.currentTarget = { ...this.targetDropoff };
    
    // Mission Phase
    this.missionState = 'TO_DROPOFF'; // 'TO_PICKUP' | 'AT_PICKUP' | 'TO_DROPOFF' | 'AT_DROPOFF' | 'OBSTACLE_AVOIDING' | 'IDLE'
    
    // Ultrasonic & Sensor State
    this.lastUltrasonicCm = 999.0;
    this.lastServoAngle = 90; // 90 is straight ahead, 45 is left, 135 is right
    this.obstacleDetected = false;
    this.blockedObstacles = new Set(); // Set of `${x},${y}` coordinates
    
    // Path Buffer
    this.currentPath = [];
    
    // Motor Speeds and Parameters
    this.motorLeftPwm = 0;
    this.motorRightPwm = 0;
    this.defaultForwardSpeed = 180; // PWM (0-255)
    this.defaultTurnSpeed = 195;    // PWM for turning
    this.gridStepDurationMs = 700;  // Milliseconds to traverse 1 grid cell
    this.turn90DurationMs = 450;    // Milliseconds to pivot 90 degrees
    
    // Compute initial route
    this.recalculatePath();
  }

  /**
   * Set custom mission pickup and dropoff points
   */
  setTargets(pickup, dropoff) {
    if (pickup) this.targetPickup = { ...pickup };
    if (dropoff) this.targetDropoff = { ...dropoff };
    this.currentTarget = { ...this.targetDropoff };
    this.missionState = 'TO_DROPOFF';
    this.recalculatePath();
  }

  /**
   * Reset robot to start coordinate
   */
  resetPosition(x = 1, y = 3, heading = DIR_EAST) {
    this.x = x;
    this.y = y;
    this.heading = heading;
    this.blockedObstacles.clear();
    this.obstacleDetected = false;
    this.missionState = 'TO_DROPOFF';
    this.currentTarget = { ...this.targetDropoff };
    this.recalculatePath();
  }

  /**
   * Calculate cell directly ahead of robot
   */
  getFrontCell(distCells = 1) {
    let fx = Math.round(this.x);
    let fy = Math.round(this.y);

    if (this.heading === DIR_EAST) fx += distCells;
    else if (this.heading === DIR_SOUTH) fy += distCells;
    else if (this.heading === DIR_WEST) fx -= distCells;
    else if (this.heading === DIR_NORTH) fy -= distCells;

    return {
      x: Math.max(0, Math.min(GRID_WIDTH - 1, fx)),
      y: Math.max(0, Math.min(GRID_HEIGHT - 1, fy))
    };
  }

  /**
   * Core Two-Way Decision Loop:
   * Consumes ESP32 telemetry (ultrasonic distance, servo angle, battery)
   * and returns the exact motion instruction for the hardware robot.
   */
  processTelemetry(telemetry) {
    const rawDist = Number(telemetry.ultrasonicDistanceCm ?? telemetry.dist ?? 999);
    const servoAngle = Number(telemetry.servoAngle ?? telemetry.servo ?? 90);
    
    this.lastUltrasonicCm = rawDist;
    this.lastServoAngle = servoAngle;

    // 1. Evaluate Obstacle Sensor
    // Only consider obstacles directly in the robot's forward path (servo 70° to 110°)
    const isScanningForward = servoAngle >= 70 && servoAngle <= 110;
    const isTooClose = rawDist > 0.5 && rawDist <= OBSTACLE_DISTANCE_THRESHOLD_CM;

    let rerouteNeeded = false;

    if (isScanningForward && isTooClose) {
      this.obstacleDetected = true;
      const frontCell = this.getFrontCell(1);
      const cellKey = `${frontCell.x},${frontCell.y}`;

      if (!this.blockedObstacles.has(cellKey)) {
        this.blockedObstacles.add(cellKey);
        rerouteNeeded = true;
        console.log(`[NavEngine] Sensed obstacle at (${frontCell.x}, ${frontCell.y}) | Dist: ${rawDist}cm! Re-routing...`);
      }
    } else if (rawDist > (OBSTACLE_DISTANCE_THRESHOLD_CM + 8.0)) {
      this.obstacleDetected = false;
    }

    // 2. If an obstacle blocked our path, re-plan immediately
    if (rerouteNeeded) {
      this.missionState = 'OBSTACLE_AVOIDING';
      this.recalculatePath();
    }

    // 3. Check Mission Completion
    const distToTarget = Math.hypot(this.x - this.currentTarget.x, this.y - this.currentTarget.y);
    if (distToTarget < 0.6) {
      if (this.missionState === 'TO_PICKUP') {
        this.missionState = 'AT_PICKUP';
        this.currentTarget = { ...this.targetDropoff };
        this.recalculatePath();
        return {
          cmd: 'ARRIVED_PICKUP',
          motorLeftPwm: 0,
          motorRightPwm: 0,
          durationMs: 1500,
          message: 'Reached Pickup Station. Transferring Parcel...',
          nextPhase: 'TO_DROPOFF',
          pathRemaining: this.currentPath.length
        };
      } else if (this.missionState === 'TO_DROPOFF' || this.missionState === 'OBSTACLE_AVOIDING') {
        this.missionState = 'AT_DROPOFF';
        return {
          cmd: 'STOP',
          motorLeftPwm: 0,
          motorRightPwm: 0,
          durationMs: 0,
          message: 'Successfully reached Dropoff Bay! Task Completed.',
          missionComplete: true,
          pathRemaining: 0
        };
      }
    }

    // 4. Generate Next Motor Step
    return this.generateNextInstruction();
  }

  /**
   * Generates discrete differential motor commands to step towards target
   */
  generateNextInstruction() {
    // If no path available or arrived
    if (this.currentPath.length === 0) {
      this.recalculatePath();
      if (this.currentPath.length === 0) {
        return {
          cmd: 'STOP',
          motorLeftPwm: 0,
          motorRightPwm: 0,
          durationMs: 500,
          message: 'No traversable path. Waiting for clear corridor.'
        };
      }
    }

    const nextWaypoint = this.currentPath[0];
    const dx = nextWaypoint.x - Math.round(this.x);
    const dy = nextWaypoint.y - Math.round(this.y);

    // If already at next waypoint, pop it
    if (dx === 0 && dy === 0) {
      this.currentPath.shift();
      return this.generateNextInstruction();
    }

    // Determine required heading
    let desiredHeading = this.heading;
    if (dx > 0) desiredHeading = DIR_EAST;
    else if (dx < 0) desiredHeading = DIR_WEST;
    else if (dy > 0) desiredHeading = DIR_SOUTH;
    else if (dy < 0) desiredHeading = DIR_NORTH;

    // Angle difference
    const angleDiff = (desiredHeading - this.heading + 360) % 360;

    // If heading does not match, pivot the robot
    if (angleDiff === 90) {
      // Turn Right
      this.heading = desiredHeading;
      this.motorLeftPwm = this.defaultTurnSpeed;
      this.motorRightPwm = -this.defaultTurnSpeed;
      return {
        cmd: 'TURN_RIGHT',
        speed: this.defaultTurnSpeed,
        durationMs: this.turn90DurationMs,
        heading: this.heading,
        targetX: nextWaypoint.x,
        targetY: nextWaypoint.y,
        pathRemaining: this.currentPath.length
      };
    } else if (angleDiff === 270) {
      // Turn Left
      this.heading = desiredHeading;
      this.motorLeftPwm = -this.defaultTurnSpeed;
      this.motorRightPwm = this.defaultTurnSpeed;
      return {
        cmd: 'TURN_LEFT',
        speed: this.defaultTurnSpeed,
        durationMs: this.turn90DurationMs,
        heading: this.heading,
        targetX: nextWaypoint.x,
        targetY: nextWaypoint.y,
        pathRemaining: this.currentPath.length
      };
    } else if (angleDiff === 180) {
      // U-Turn (Pivot 180)
      this.heading = desiredHeading;
      this.motorLeftPwm = this.defaultTurnSpeed;
      this.motorRightPwm = -this.defaultTurnSpeed;
      return {
        cmd: 'TURN_AROUND',
        speed: this.defaultTurnSpeed,
        durationMs: this.turn90DurationMs * 2,
        heading: this.heading,
        targetX: nextWaypoint.x,
        targetY: nextWaypoint.y,
        pathRemaining: this.currentPath.length
      };
    }

    // Heading matches! Move forward 1 grid cell
    this.x = nextWaypoint.x;
    this.y = nextWaypoint.y;
    this.currentPath.shift(); // Consumed waypoint
    this.motorLeftPwm = this.defaultForwardSpeed;
    this.motorRightPwm = this.defaultForwardSpeed;

    return {
      cmd: 'MOVE_FORWARD',
      speed: this.defaultForwardSpeed,
      durationMs: this.gridStepDurationMs,
      heading: this.heading,
      x: this.x,
      y: this.y,
      pathRemaining: this.currentPath.length
    };
  }

  /**
   * Recalculate A* path to current target
   */
  recalculatePath() {
    const start = { x: Math.round(this.x), y: Math.round(this.y) };
    const goal = { x: Math.round(this.currentTarget.x), y: Math.round(this.currentTarget.y) };

    this.currentPath = this.aStar(start, goal);
    // Remove the current node if it is at the start
    if (this.currentPath.length > 0 && this.currentPath[0].x === start.x && this.currentPath[0].y === start.y) {
      this.currentPath.shift();
    }
  }

  /**
   * Grid A* Pathfinding avoiding permanent racks and dynamic obstacles
   */
  aStar(start, goal) {
    if (start.x === goal.x && start.y === goal.y) return [];

    const openSet = [{ ...start, g: 0, f: this.heuristic(start, goal) }];
    const cameFrom = new Map();
    const gScore = new Map();
    gScore.set(`${start.x},${start.y}`, 0);

    const key = (c) => `${c.x},${c.y}`;

    while (openSet.length > 0) {
      // Node with lowest f
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();

      if (current.x === goal.x && current.y === goal.y) {
        // Reconstruct path
        const path = [{ x: current.x, y: current.y }];
        let currKey = key(current);
        while (cameFrom.has(currKey)) {
          const prev = cameFrom.get(currKey);
          path.unshift(prev);
          currKey = key(prev);
        }
        return path;
      }

      // Check 4 orthogonal neighbors
      const neighbors = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 }
      ];

      for (const n of neighbors) {
        if (!this.isTraversable(n.x, n.y) && !(n.x === goal.x && n.y === goal.y)) {
          continue;
        }

        const tentativeG = (gScore.get(key(current)) ?? Infinity) + 1;
        const neighborKey = key(n);

        if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
          cameFrom.set(neighborKey, { x: current.x, y: current.y });
          gScore.set(neighborKey, tentativeG);
          const f = tentativeG + this.heuristic(n, goal);

          if (!openSet.some(o => o.x === n.x && o.y === n.y)) {
            openSet.push({ ...n, g: tentativeG, f });
          }
        }
      }
    }

    return []; // No path found
  }

  heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  /**
   * Checks if cell is traversable (within bounds, not a rack, not blocked)
   */
  isTraversable(x, y) {
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return false;
    
    // Check dynamic sensed obstacles
    if (this.blockedObstacles.has(`${x},${y}`)) return false;

    // Check static rack layout:
    // Columns x=4..7, 10..13, 16..19, 22..25, rows y=3..7, 11..15 are racks
    const isRackCol = (x >= 4 && x <= 7) || (x >= 10 && x <= 13) || (x >= 16 && x <= 19) || (x >= 22 && x <= 25);
    const isRackRow = (y >= 3 && y <= 7) || (y >= 11 && y <= 15);
    if (isRackCol && isRackRow) return false;

    return true;
  }

  /**
   * Get current state snapshot
   */
  getState() {
    return {
      robotId: this.robotId,
      x: this.x,
      y: this.y,
      heading: this.heading,
      missionState: this.missionState,
      targetPickup: this.targetPickup,
      targetDropoff: this.targetDropoff,
      currentTarget: this.currentTarget,
      lastUltrasonicCm: this.lastUltrasonicCm,
      lastServoAngle: this.lastServoAngle,
      obstacleDetected: this.obstacleDetected,
      blockedObstacles: Array.from(this.blockedObstacles),
      pathRemaining: this.currentPath.length,
      currentPath: this.currentPath,
      motorLeftPwm: this.motorLeftPwm,
      motorRightPwm: this.motorRightPwm
    };
  }
}
