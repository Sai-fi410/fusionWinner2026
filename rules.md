# Fusionistic: System Rules & Operational Specifications
**Project Codename**: Fusionistic  
**Document**: System Operational Rules, Behavioral Invariants & Constraint Protocols  
**Version**: 1.0.0-PROD  
**Applicability**: Swarm Simulation Core, Web Worker Engine, Microcontroller Firmware, Frontend HUD  

---

## 1. Scope, Purpose & Normative Language

This document establishes the exhaustive set of behavioral rules, mathematical invariants, state transition constraints, and collision-avoidance axioms governing the **Fusionistic** Decentralized Swarm Warehouse Robot Fleet System.

All implementations of the system—whether executing in JavaScript Web Workers, native C++ on the physical ESP32 edge microcontroller, or rendering on the HTML5 Canvas UI—**MUST** adhere strictly to the rules codified herein. 

The key words **"MUST"**, **"MUST NOT"**, **"REQUIRED"**, **"SHALL"**, **"SHALL NOT"**, **"SHOULD"**, and **"MAY"** in this document are to be interpreted as described in RFC 2119.

---

## 2. Core Topological & Spatial Grid Rules

### Rule 2.1: Coordinate System Definition
1. The simulated warehouse environment **MUST** be modeled as an orthogonal two-dimensional discrete space-time grid:
   $$\mathcal{G} = \{ (x, y) \in \mathbb{Z}^2 \mid 0 \le x < W, \; 0 \le y < H \}$$
   where $W$ is the grid width and $H$ is the grid height.
2. Coordinates are zero-indexed from the top-left origin $(0, 0)$, where increasing $x$ represents rightward motion along the east-west axis and increasing $y$ represents downward motion along the north-south axis.
3. Sub-pixel positions for visual interpolation and physical odometry **MUST** be mapped into discrete grid cells using standard floor truncation:
   $$x_{grid} = \lfloor x_{real} + 0.5 \rfloor, \quad y_{grid} = \lfloor y_{real} + 0.5 \rfloor$$

### Rule 2.2: Cell Classifications & Permitted Traversal
Each grid cell $C(x, y)$ **MUST** belong to exactly one of the following immutable or mutable topological classifications:
- **Type 0: Traversable Aisle Lane (`AISLE_LANE`)**: Standard floor area traversable by all agents in any cardinal direction.
- **Type 1: Permanent Storage Pod / Rack (`STORAGE_RACK`)**: Static physical infrastructure containing inventory pods. Non-traversable at all times ($\text{Cost} = \infty$).
- **Type 2: Pick / Replenishment Station (`PICK_STATION`)**: Designated peripheral bays where parcels originate. Traversable only during task induction.
- **Type 3: Packing / Drop-off Bay (`DROP_BAY`)**: Designated delivery sinks where parcels are deposited to fulfill customer orders.
- **Type 4: Inductive Charging Dock (`CHARGING_DOCK`)**: Designated rest cells where depleted agents dock for battery replenishment.
- **Type 5: Dedicated Recess / Side Bay (`RECESS_BAY`)**: Specifically allocated single-cell alcoves distributed along narrow corridors, reserved strictly for yielding maneuvers during deadlock resolution.
- **Type 6: Dynamic Obstacle (`DYNAMIC_BLOCKED`)**: Cells temporarily marked impassable due to dropped parcels, physical debris, broken-down agents, or judge-injected obstacles.

### Rule 2.3: Grid Boundaries & Out-of-Bounds Prohibition
No agent, physical or virtual, **SHALL** ever plan, reserve, or execute a movement beyond the outer perimeter coordinates $[0, W-1] \times [0, H-1]$. Any trajectory violating grid boundaries **MUST** be rejected instantly by the local trajectory validator.

---

## 3. Kinematic & Movement Rules

### Rule 3.1: Discrete Simulation Clock & Tick Quantization
1. The global simulation runs on a discrete temporal tick sequence $t \in \mathbb{N}_0 = \{0, 1, 2, \dots\}$.
2. The standard simulation tick duration **SHALL** default to $\Delta t = 100 \text{ ms}$ (configurable between $50 \text{ ms}$ and $250 \text{ ms}$ via the UI simulation speed control).
3. At each time tick $t$, an agent $A_i$ located at $P_i(t) = (x_t, y_t)$ **MAY** transition only to an immediately adjacent Manhattan cell or remain stationary:
   $$P_i(t+1) \in \{ (x_t, y_t), (x_t \pm 1, y_t), (x_t, y_t \pm 1) \}$$

### Rule 3.2: Diagonal Movement Prohibition
Diagonal transitions $(x \pm 1, y \pm 1)$ are strictly **FORBIDDEN** across all software algorithms and physical hardware maneuvers. All agent movement **MUST** follow strict 4-connected Manhattan topology to prevent corner-cutting collisions through storage rack boundaries.

### Rule 3.3: Smooth Visual Interpolation (Lerp) Rule
While the algorithmic state evolves in discrete integer steps at each tick $t$, the rendering pipeline **MUST** interpolate agent visual positions between tick $t$ and tick $t+1$ using linear interpolation:
$$\mathbf{P}_{render}(\alpha) = (1 - \alpha) \cdot \mathbf{P}(t) + \alpha \cdot \mathbf{P}(t+1), \quad \alpha = \frac{t_{clock} - t_{tick\_start}}{\Delta t}$$
This guarantees a continuous 60 FPS visual aesthetic regardless of the discrete simulation tick rate.

---

## 4. Space-Time Collision Prevention Axioms

To guarantee an absolute **Zero-Collision Rate (0.00%)** without a centralized supervisor, all agent trajectory reservations **MUST** satisfy three non-negotiable geometric axioms:

```
+---------------------------------------------------------------------------------------------------+
|                            SPACE-TIME COLLISION PREVENTION AXIOMS                                 |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  1. VERTEX CONFLICT (Prohibited)          2. EDGE / SWAP CONFLICT (Prohibited)                    |
|     Tick t: Agent A -> (X, Y)                Tick t:   Agent A at (X, Y), Agent B at (X+1, Y)     |
|     Tick t: Agent B -> (X, Y)                Tick t+1: Agent A -> (X+1, Y), Agent B -> (X, Y)     |
|     ==> MUTUAL DESTRUCTION!                  ==> HEAD-ON IMPACT!                                  |
|                                                                                                   |
|  3. TRAILING CONFLICT (Permitted only with +1 time delay)                                         |
|     Tick t:   Agent A at (X, Y)                                                                   |
|     Tick t+1: Agent A -> (X+1, Y)                                                                 |
|     Tick t+1: Agent B -> (X, Y)              ==> ALLOWED (Agent B safely trails behind Agent A)   |
|                                                                                                   |
+---------------------------------------------------------------------------------------------------+
```

### Rule 4.1: Vertex Conflict Prohibition (Strict Spatial Exclusivity)
At any discrete time tick $t$, no two distinct agents $A_i$ and $A_j$ ($i \neq j$) shall occupy the same spatial coordinate:
$$\forall i \neq j, \quad P_i(t) \neq P_j(t)$$
Any reservation request for $(x, y, t)$ where an existing reservation already exists **MUST** be rejected immediately with a `RESERVATION_CONFLICT_VERTEX` status.

### Rule 4.2: Edge / Swap Conflict Prohibition (Head-On Collision Prevention)
No two distinct agents $A_i$ and $A_j$ shall traverse the exact same spatial edge in opposite directions across the same temporal step $t \to t+1$:
$$\forall i \neq j, \quad \neg \Big( P_i(t) = P_j(t+1) \;\land\; P_i(t+1) = P_j(t) \Big)$$
When agent $A_i$ reserves the transition $(x_1, y_1) \to (x_2, y_2)$ over interval $[t, t+1]$, it **MUST** simultaneously lock $(x_1, y_1, t)$, $(x_2, y_2, t+1)$, and register a directional transit token preventing any opposite transit $(x_2, y_2) \to (x_1, y_1)$ over the exact same interval.

### Rule 4.3: Safe Trailing & Following Rule
An agent $A_j$ is permitted to move into cell $(x, y)$ at time $t+1$ if and only if:
1. Cell $(x, y)$ was occupied by agent $A_i$ at time $t$, and
2. Agent $A_i$ has a confirmed, non-revoked reservation to move out of cell $(x, y)$ at time $t+1$.
If agent $A_i$ stalls, fails, or cancels its departure, agent $A_j$ **MUST** immediately abort its advance into $(x, y)$ and remain at its previous cell.

---

## 5. Yield & Recess Deadlock Protocol Rules

Narrow warehouse corridors frequently create opposing transit requests where two agents face each other head-on. Centralized planners resolve this by re-planning the entire system, causing massive latency. Fusionistic enforces the **Yield & Recess Protocol**:

```
+---------------------------------------------------------------------------------------------------+
|                                  YIELD & RECESS PROTOCOL FLOW                                     |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|   Step 1: Prediction       Agent A (Priority 1)  ----->   <-----  Agent B (Priority 2)           |
|                            [Conflict predicted within H = 8 ticks]                                |
|                                                                                                   |
|   Step 2: Negotiation      Agent B detects lower priority (Priority 2 > Priority 1)              |
|                            Agent B designates itself as YIELDING AGENT                            |
|                                                                                                   |
|   Step 3: Side-Bay Maneuver                                                                       |
|                            Agent B pulls into nearest designated RECESS_BAY (X_rec, Y_rec)        |
|                            Agent B waits K ticks:                                                 |
|                                                                                                   |
|                            [  RECESS BAY  ]                                                       |
|                                   ^                                                               |
|                                   |  (Agent B yields)                                             |
|                            ========================================                               |
|                            -------> Agent A cruises through unimpeded                             |
|                            ========================================                               |
|                                                                                                   |
|   Step 4: Corridor Re-entry                                                                       |
|                            Agent A passes clear zone; Agent B re-enters main aisle                |
|                                                                                                   |
+---------------------------------------------------------------------------------------------------+
```

### Rule 5.1: Priority Determination
When two agents identify an impending trajectory conflict within their rolling horizon $H$, priority **SHALL** be calculated according to the following deterministic ranking hierarchy:
1. **Mission Priority Tier**: Express Orders (Tier 1) strictly outrank Standard Orders (Tier 2), which strictly outrank Empty Transit / Idle (Tier 3).
2. **State Hierarchy**: `CARRYING_TASK` strictly outranks `EN_ROUTE_PICKUP`, which strictly outranks `IDLE`.
3. **Distance to Goal**: If tiers and states are identical, the agent closer to its immediate destination (smaller Manhattan distance $D_{dest}$) holds right-of-way.
4. **Deterministic Tie-Breaker**: If all above metrics are equal, the agent with the lower numeric `Agent_ID` holds right-of-way.

### Rule 5.2: Yielding Maneuver Execution
The agent identified as lower priority ($A_{yield}$) **MUST**:
1. Scan its local topological map within a radius of 3 grid units for the nearest available `RECESS_BAY` or perpendicular empty corridor node.
2. Calculate a temporary diversion path into the recess cell.
3. Reserve the recess cell for $K$ ticks, where:
   $$K = \text{TicksToConflict} + \text{HighPriorityTransitTicks} + 1$$
4. Transmit a `YIELD_CONFIRMATION` packet to the high-priority agent with its holding coordinates.

### Rule 5.3: Deadlock Detection & Escape Heuristic
If an agent remains stationary for more than 4 consecutive ticks while in a transit state (`EN_ROUTE_PICKUP` or `CARRYING_TASK`) due to an unresolved lock:
1. The agent **MUST** flag a `LOCAL_STALL_DETECTED` state.
2. It **MUST** broadcast a 2-hop radius wake-up ping requesting neighbor space-time state tables.
3. If a circular dependency is detected ($A_1 \to A_2 \to A_3 \to A_1$), the agent with the highest numeric ID **MUST** initiate an active backtrack maneuver, stepping into an available empty adjacent aisle to break the cycle.

---

## 6. Task Allocation & Contract Net Protocol (CNP) Rules

All task allocation across the Fusionistic swarm operates via a distributed, market-based auction system based on the Contract Net Protocol (Smith, 1980).

```
+---------------------------------------------------------------------------------------------------+
|                                CONTRACT NET PROTOCOL (CNP) TIMELINE                               |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|     Pick Station                 Agent #04 (Idle)            Agent #12 (Idle)    Agent #22 (Busy) |
|          |                              |                           |                   |         |
|          |--- TASK_ANNOUNCE ----------->|                           |                   |         |
|          |    (Pick, Drop, Priority)    |                           |                   |         |
|          |                              |                           |                   | (Ignores|
|          |                              |-- Compute Bid: 14.2 --    |-- Compute Bid: 9.1|   busy) |
|          |                              |                           |                   |         |
|          |<-- CNP_BID (Cost: 14.2) -----|                           |                   |         |
|          |<-- CNP_BID (Cost: 9.1) ----------------------------------|                   |         |
|          |                                                                              |         |
|          | [Auction Closes at 50ms Deadline]                                            |         |
|          | Lowest Bid Winner: Agent #12                                                 |         |
|          |                                                                              |         |
|          |--- TASK_AWARD --------------> (Agent #12 Wins!)                              |         |
|          |--- TASK_REJECT -------------> (Agent #04 Cleared)                            |         |
|          |                                                                              |         |
|          |<-- TASK_ACCEPT_CONFIRM ------ (Agent #12 transitions to EN_ROUTE_PICKUP)     |         |
|          |                                                                              |         |
+---------------------------------------------------------------------------------------------------+
```

### Rule 6.1: Auction Announcement Broadcast
When a new delivery order $O_k$ is induced at pick station $P_{pick}$, the induction manager **MUST** broadcast a `TASK_ANNOUNCEMENT` payload containing:
- `task_id`: Globally unique identifier string.
- `pickup_coords`: $(X_{pick}, Y_{pick})$
- `dropoff_coords`: $(X_{drop}, Y_{drop})$
- `priority_tier`: Tier 1 (Express) or Tier 2 (Standard).
- `bidding_deadline_ms`: Current timestamp $+ 50 \text{ ms}$.

### Rule 6.2: Bid Eligibility & Scoring Formula
Only agents meeting all of the following criteria are eligible to submit bids:
1. Current agent state **MUST** be `IDLE`.
2. Battery percentage **MUST** be $\ge 25\%$.
3. Hardware status **MUST NOT** be `CRITICAL_FAILURE`.

Eligible agents **MUST** evaluate their bid score $C_{bid}$ using the normalized cost function:
$$C_{bid} = w_{dist} \cdot \left( \frac{\text{ManhattanDist}(P_{agent}, P_{pick})}{\text{MaxGridDim}} \right) + w_{deliv} \cdot \left( \frac{\text{ManhattanDist}(P_{pick}, P_{drop})}{\text{MaxGridDim}} \right) + w_{batt} \cdot \left( \frac{100 - \text{BatteryPct}}{100} \right)$$
*Default Calibration Weights*: $w_{dist} = 0.50$, $w_{deliv} = 0.20$, $w_{batt} = 0.30$. Lower bid score wins.

### Rule 6.3: Tie-Breaking & Award Finalization
1. The auction manager **SHALL** award the task to the bidder submitting the lowest $C_{bid}$.
2. In the event of an exact mathematical tie ($\Delta C_{bid} < 0.001$), the award **SHALL** go to the agent with the higher remaining battery.
3. The winning agent **MUST** return a `TASK_ACCEPT_CONFIRM` packet within 2 simulation ticks; otherwise, the task **MUST** be re-auctioned immediately.

---

## 7. Robot Breakdown, Parcel Drop & Fault Recovery Rules

Resilience in the face of dynamic catastrophic events is the ultimate differentiator of the Fusionistic swarm.

```
+---------------------------------------------------------------------------------------------------+
|                                  ROBOT FAILURE & HANDOVER FLOW                                    |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|   1. FAILURE EVENT              Agent #08 experiences hardware motor stall / Judge clicks "Kill"  |
|                                 - State transitions immediately to CRITICAL_FAILURE               |
|                                 - Underglow turns pulsating CRIMSON RED                           |
|                                 - Drops parcel at current coordinate (X_fail, Y_fail)             |
|                                                                                                   |
|   2. FAULT BROADCAST            Agent #08 broadcasts emergency packet:                            |
|                                 CRITICAL_FAILURE_ALERT { loc: (X_fail, Y_fail), parcel: "ORD-94" } |
|                                                                                                   |
|   3. GRID TOPOLOGY MUTATION     All agents within mesh radius update local maps:                  |
|                                 Cell (X_fail, Y_fail) marked DYNAMIC_BLOCKED                      |
|                                 All planned paths through (X_fail, Y_fail) cancelled              |
|                                                                                                   |
|   4. AUTONOMOUS RESCUE          Orphan parcel "ORD-94" re-enters emergency auction                |
|                                 Nearby idle Agent #15 wins auction                                |
|                                 Agent #15 navigates to adjacent cell, retrieves parcel,           |
|                                 and completes delivery to destination drop bay!                   |
|                                                                                                   |
+---------------------------------------------------------------------------------------------------+
```

### Rule 7.1: Failure State Transition
When an agent experiences a critical fault (via manual "Kill Agent" button, simulated motor burnout, or physical hardware watchdog trigger):
1. The agent **MUST** immediately cease all drive wheel actuation.
2. The agent's state **MUST** lock to `CRITICAL_FAILURE`.
3. Its LED / Canvas underglow indicator **MUST** shift to pulsating Crimson Red (`#FF0055`).
4. Its space-time reservation tokens for all subsequent ticks $t > t_{fail}$ **MUST** be revoked immediately.
5. Its current coordinate $(X_f, Y_f)$ **MUST** be designated a static obstacle (`DYNAMIC_BLOCKED`) with infinite traversal cost across the localized mesh.

### Rule 7.2: Dropped Parcel Handover Protocol
If the failed agent was carrying an active parcel (`CARRYING_TASK`) at the time of failure:
1. The parcel **MUST** be detached from the agent and registered as a grounded salvage item at coordinate $(X_f, Y_f)$.
2. An emergency `SALVAGE_TASK_ANNOUNCE` packet **MUST** be emitted across the local mesh.
3. A neighboring operational agent **MUST** bid on the salvage task.
4. The winning rescue agent **SHALL** route to an adjacent traversable neighbor cell of $(X_f, Y_f)$, execute a parcel transfer maneuver, update its own payload pointer to the salvaged order, and complete delivery to the original destination drop bay.

---

## 8. Chaos Engineering & "Judge Mode" Interactivity Rules

To empower competition judges to rigorously stress-test the system, the platform exposes specialized interactive controls governed by deterministic rules:

### Rule 8.1: Click-to-Block Aisle Rule
1. When a judge clicks on any traversable aisle cell $(X_b, Y_b)$ on the canvas grid, that cell **MUST** instantly transition to `DYNAMIC_BLOCKED`.
2. Any robot with a planned trajectory passing through $(X_b, Y_b)$ **MUST** initiate a local WHCA* replan within $\le 5 \text{ ms}$.
3. If an agent is currently occupying cell $(X_b, Y_b)$ at the moment of the click, the blockage **MUST NOT** crush the agent; instead, the agent **MUST** be granted 1 tick of emergency clearance to evacuate to the nearest free adjacent cell.

### Rule 8.2: Judge Kill Switch Rule
1. Clicking the "Simulate Robot Failure" button or clicking directly on an active robot icon **MUST** trigger the instantaneous failure protocol specified in Section 7.
2. The system **MUST NOT** crash, freeze, or drop frame rates during or after the execution of the kill switch.

### Rule 8.3: Emergency Order Surge Rule
1. Clicking "Inject Priority Order" **MUST** spawn 10 to 50 express delivery tasks simultaneously.
2. The swarm **MUST** process the surge purely through distributed Contract Net Protocol auctions without centralized queue bottlenecking.
3. Priority Tier 1 orders **MUST** preempt Tier 2 tasks, with lower-priority agents dynamically yielding into side bays.

---

## 9. Physical Edge Hardware Integration Rules

```
+---------------------------------------------------------------------------------------------------+
|                                 PHYSICAL HARDWARE SAFETY SYSTEM                                   |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|    +-----------------------------+                     +-----------------------------+            |
|    |    VL53L0X LASER ToF        |                     |     ESP32 SAFETY WATCHDOG   |            |
|    |  Continuous distance check  |                     |  - Missed Heartbeat > 150ms |            |
|    |  Sample rate: 50 Hz         |                     |  - Roll / Pitch Tilt > 25°  |            |
|    +--------------+--------------+                     +--------------+--------------+            |
|                   |                                                   |                           |
|                   v (Distance < 150mm)                                v (Fault Condition)         |
|    +---------------------------------------------------------------------------------+            |
|    |                         EMERGENCY HARDWARE STOP (E-STOP)                        |            |
|    |  - Cut PWM drive to TB6612FNG H-Bridge motor driver within < 10 ms              |            |
|    |  - Engage active motor dynamic braking                                          |            |
|    |  - Illuminate Crimson Red NeoPixel strobe                                       |            |
|    |  - Emit CELL_BLOCKED_ALERT over WebSocket to Fusionistic Dashboard             |            |
|    +---------------------------------------------------------------------------------+            |
|                                                                                                   |
+---------------------------------------------------------------------------------------------------+
```

### Rule 9.1: Proximity Emergency Stop (E-Stop)
1. The physical robot's front-facing VL53L0X laser ToF sensor **MUST** poll range data at a minimum frequency of $50 \text{ Hz}$.
2. If the measured distance to a forward obstacle drops below $150 \text{ mm}$, the ESP32 firmware **MUST** cut motor PWM drive within $\le 10 \text{ ms}$.
3. The robot **MUST** transmit an asynchronous `CELL_BLOCKED_ALERT` to the Fusionistic bridge containing the calculated $(X, Y)$ coordinate of the physical obstruction.

### Rule 9.2: Physical-to-Virtual Coordinate Synchronization
1. The physical robot **MUST** stream its sub-pixel position and discrete grid coordinate to the web dashboard at a minimum rate of $20 \text{ Hz}$.
2. If optical wheel encoder drift accumulates beyond $0.5$ grid units, the robot **MUST** recalibrate its spatial state upon detecting the next black-line grid intersection via its TCRT5000 infrared floor sensors.

---

## 10. Performance, Telemetry & Evaluation Metric Rules

### Rule 10.1: Collision Count Invariant
The recorded collision count metric displayed on the telemetry dashboard **MUST REMAIN STRICTLY ZERO (0)** under all operational conditions, including during heavy chaos injections and agent killings. A non-zero collision count represents a catastrophic failure of the space-time reservation invariants.

### Rule 10.2: Rerouting Latency Bound
Under dynamic obstacle injection or agent breakdown, the average swarm rerouting latency metric **MUST** remain below $10.0 \text{ ms}$ for fleets of up to 60 agents (with a target performance of $<4.0 \text{ ms}$).

### Rule 10.3: Telemetry Update Rate
The dashboard HUD **MUST** update operational metrics (throughput, active agents, average latency, and energy savings) at a steady interval of $1.0 \text{ second}$ to provide smooth, legible real-time analytics for evaluators.
