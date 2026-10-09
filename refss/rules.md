# Rules: Hybrid Decentralized Swarm System

These rules apply to everyone building the project, human or AI assistant. They are grouped into protocol rules (how robots behave), engineering rules (how code is written), demo rules (how we present) and honesty rules (what we may claim). When two rules conflict, the earlier group wins.

## 1. Core principle rules

1. **No central planner.** No component may compute or assign another robot's route. The dashboard and any server only observe, display and log.
2. **Local information only.** An agent may use its own sensors and messages from neighbours inside R_comm. It must never read the world model's ground truth or another agent's internal state.
3. **One algorithm, two bodies.** The virtual agent and the physical robot run the same decision logic. Hardware-specific code lives only in a thin adapter.
4. **Judge Mode may only cause events.** It can kill a robot, place an obstacle or change the robot count. It must never steer a robot or edit its plan.

## 2. Protocol rules (robot behaviour)

### 2.1 Reservation

- A robot may enter a cell only if it holds an (X, Y, t) reservation for it.
- Reservations are requested for a short window ahead, never the whole route.
- A reservation expires if its tick passes without the robot arriving. Expired reservations are free for anyone.
- A denied request means wait, detour or yield. It never means force entry.
- Two robots may not hold overlapping reservations for the same cell and tick. If this ever happens, both must treat it as a conflict and re-request, with the lower priority backing off.

### 2.2 Priority and yielding

- Every task has an integer priority. Higher wins.
- Equal priority is broken by the lower robot ID, so the outcome is deterministic.
- A yielding robot goes to the nearest free side bay, announces `yield`, and waits until the conflicting robot has passed.
- Aging: a task's priority rises by one step after a fixed number of ticks spent waiting, up to a cap just below express priority. This prevents starvation.
- Express orders may claim right-of-way. They broadcast a priority signal early so others can clear the corridor in time.

### 2.3 Failure and recovery

- A robot that detects its own fault, or receives a Kill, enters `FAILED`, stops moving and broadcasts one `fault` with position and carried parcel.
- Neighbours treat the failed robot's cell as an obstacle immediately and recompute.
- A dropped parcel is claimed by bidding. Each free robot in range computes a cost, mainly distance, and the lowest cost wins. Ties go to the lower ID.
- A robot must not claim a parcel while carrying another one.
- If no robot claims a parcel within a timeout, the nearest idle robot is asked again with a wider radius.

### 2.4 Communication

- Messages must carry sender ID and tick. Messages older than a small tick window are ignored.
- Heartbeats run at a fixed low rate. A neighbour missing several heartbeats is treated as unreliable, and its reservations are honoured only until expiry.
- Payloads stay small. No robot sends its full map.
- On lost connectivity, a robot slows down, keeps only its current reservation, and rejoins by announcing itself when the link returns.

### 2.5 Safety on hardware

- The physical robot has a hard stop distance. If a sensor reads closer than this, it stops regardless of any plan.
- Motor speed is capped during demos.
- Loss of the Wi-Fi link stops the robot after a short timeout rather than letting it continue blind.
- The robot must be testable on a stand, with wheels off the ground, before every drive test.

## 3. Engineering rules

### 3.1 Code structure

- Keep agent logic in pure functions where possible: state in, decision out. This makes behaviour testable without a canvas.
- Separate three folders at minimum: `sim` (world and workers), `agent` (decision logic) and `ui` (React). The agent folder must not import from ui.
- Constants such as R_comm, window length, aging step, heartbeat interval and grid size live in one config file, never as magic numbers.
- Use a seeded random number generator so any run can be reproduced exactly.

### 3.2 Performance

- The render loop targets 60 FPS. Agent planning never runs on the main thread.
- Pathfinding runs in Web Workers. Messages between workers and the UI are batched per tick.
- Avoid allocating objects inside per-tick inner loops where a reusable buffer will do.
- Measure before optimizing. Log tick time and planning time per agent.

### 3.3 Testing

- Every protocol rule above has at least one automated scenario: head-on swap in a corridor, three robots meeting at a junction, kill during carry, express order through a crowded lane, and message loss.
- A regression test fails if any two robots occupy the same cell on the same tick.
- Scenarios are saved as seed plus configuration so a judge's request can be replayed.

### 3.4 Version control

- Small commits with plain messages: what changed and why.
- Main branch always runs. Experimental work goes on branches.
- No secrets, Wi-Fi passwords or broker credentials in the repository. Use an environment file that is ignored by git.

### 3.5 Firmware

- Firmware exposes a small, documented command and telemetry set. Anything else is rejected.
- Use a watchdog timer so a hung loop resets the board.
- Calibrate encoders on boot and report calibration status in telemetry.

## 4. Demo rules

1. The demo must run offline-capable. Have a local MQTT broker and a hotspot ready, never depend on venue Wi-Fi.
2. Keep a recorded fallback video of the physical robot working, in case hardware fails on stage.
3. Always open with the Judge Mode kill, because it shows resilience in seconds.
4. Show the heatmap before and after congestion so the effect on routing is visible.
5. Keep status colours consistent everywhere: cyan moving, green carrying, yellow idle, red failed.
6. Rehearse the full path three times. Time it, and cut anything that exceeds the slot.
7. One person drives the demo, another narrates, so no one is typing while talking.

## 5. Honesty rules

- Figures such as 100% uptime, under 4 ms re-routing and 30-40% throughput gain are **targets** until measured. Say "target" or "in our simulation" unless a logged run supports them.
- State the baseline in every comparison: for example central A* or first-come-first-served.
- Distinguish decision time from network latency. Local decision time may be under 4 ms, while Wi-Fi transit on hardware can be longer.
- Do not claim 60 physical robots. Say 60+ simulated and one physical.
- Cite only references we have actually read.
- If something fails during the demo, say so and explain the fallback.

## 6. Prohibited actions

- Adding a hidden global planner "just for the demo".
- Letting the UI write robot positions directly.
- Hard-coding outcomes to make a scenario look good.
- Hiding failed runs when reporting results.
- Merging code that breaks the no-collision regression test.

## 7. Change control

Any change to a protocol rule needs three things: a short written reason, an updated test, and an update to this file. Keep this document short enough that the whole team can read it before each work session.
