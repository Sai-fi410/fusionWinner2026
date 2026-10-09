# Phases: Build Plan for the Swarm System

The project is built in eight phases. Each phase has a goal, tasks, a deliverable and an exit check. A phase is finished only when its exit check passes, so later work never stands on something untested. Durations are given as relative effort, because the real calendar depends on the event date and team availability. Work on the hardware track (phases 5 and 6) can overlap with the software track once phase 3 is stable.

## Phase 0: Foundations and decisions

**Goal:** agree on scope, tools and the numbers everything else depends on.

**Tasks:**
- Fix the grid size, tick rate, R_comm, reservation window, heartbeat interval and aging step in one config file.
- Choose the stack: React with Canvas or PixiJS, Web Workers, an MQTT broker, ESP32 firmware.
- Create the repository with the `sim`, `agent`, `ui` and `firmware` folders.
- Split roles: simulation lead, agent algorithm lead, hardware lead, and presentation and design lead.
- Write the first version of the rules and architecture documents.

**Deliverable:** repository skeleton and a signed-off config file.

**Exit check:** every member can run the empty app and knows which folder they own.

## Phase 1: Static world and rendering

**Goal:** see a grid and robots on screen at 60 FPS.

**Tasks:**
- Build the world model: free cells, walls, side bays, pick-up and drop-off points.
- Render the grid on canvas with pan and zoom.
- Draw robots as simple shapes with the four status colours.
- Add the robot-count slider and place robots at start positions.

**Deliverable:** a page where 60 stationary robots render smoothly.

**Exit check:** frame rate stays near 60 FPS at 60 robots on a mid-range laptop.

## Phase 2: Single-agent navigation

**Goal:** one robot can pick up a parcel and deliver it.

**Tasks:**
- Implement the agent state machine and the sense, decide, act loop.
- Implement local A* with a cost grid.
- Add pick-up and drop-off task assignment, initially from a simple queue.
- Add obstacle injection and instant local detour.

**Deliverable:** a robot completes repeated deliveries and detours around a clicked obstacle.

**Exit check:** 100 consecutive deliveries without a stuck state, with a seeded run that reproduces exactly.

## Phase 3: Multi-agent coordination

**Goal:** many robots move without collisions and without a central planner.

**Tasks:**
- Add the communication ring and the message types.
- Implement the space-time reservation engine with windowed planning.
- Implement priority, tie-breaking, side-bay yielding and aging.
- Move agents into Web Workers and batch updates to the UI.
- Write the automated scenario suite: corridor swap, junction, crowded lane.

**Deliverable:** 20 robots running a continuous workload.

**Exit check:** zero same-cell, same-tick collisions across 1,000 seeded runs, and no deadlock lasting beyond a set number of ticks.

## Phase 4: Resilience and chaos features

**Goal:** make failure handling visible and convincing.

**Tasks:**
- Implement fault broadcast and the Judge Mode Kill button.
- Implement bidding for dropped parcels.
- Implement the traffic heatmap and feed it back into route cost.
- Build the rest of the Judge Mode panel: obstacle placement, priority spike and slider.
- Scale the fleet from 20 up to 60+ and tune performance.

**Deliverable:** a full simulation demo with Kill, obstacles and heatmap.

**Exit check:** killing a loaded robot leads to parcel recovery by another robot in every seeded scenario, and 60 robots hold interactive frame rates.

## Phase 5: Hardware robot build

**Goal:** a single ESP32 robot drives reliably on the arena.

**Tasks:**
- Assemble the chassis, motors, drivers, encoders and distance sensors.
- Write firmware for motor control, encoder reading and a closed-loop PID.
- Mark the arena grid and add grid or line sensing for position correction.
- Implement the hard stop distance and the Wi-Fi loss timeout.
- Test on a stand first, then on the floor at low speed.

**Deliverable:** a robot that drives to commanded cells and stops safely.

**Exit check:** it reaches 20 commanded cells in a row within a set position tolerance.

## Phase 6: Hardware-to-sim bridge

**Goal:** the physical robot joins the swarm as a peer.

**Tasks:**
- Define the telemetry and command messages over MQTT or WebSockets.
- Map the robot to a virtual twin on the grid.
- Mirror position, state and sensor data, and show drift between real and virtual.
- Let the real robot receive neighbour messages and respond to yields.
- Measure round-trip latency and log it.

**Deliverable:** a live demo where the real robot and virtual robots share the grid.

**Exit check:** the real robot completes a delivery while virtual robots yield to it, and measured round-trip latency is logged.

## Phase 7: Analytics, polish and branding

**Goal:** turn the working system into a convincing presentation.

**Tasks:**
- Add charts for throughput, latency and congestion over time.
- Apply the ghost-tech visual style and glowing status indicators.
- Run the benchmark comparison against a baseline and record results.
- Replace every target figure in the slides with a measured one, or label it as a target.
- Finish the slide deck and the judge question sheet.

**Deliverable:** a polished dashboard and a benchmark report.

**Exit check:** each number on the slides can be traced to a logged run.

## Phase 8: Rehearsal and event readiness

**Goal:** walk onto the stage with no surprises.

**Tasks:**
- Rehearse the full demo three times, timing each.
- Record a fallback video of the physical robot.
- Prepare an offline setup: local broker, hotspot, spare battery, spare cables and a charged laptop.
- Run a mock judging session where a teammate asks hard questions.
- Freeze the code two days before the event and tag the release.

**Deliverable:** a release tag, a demo script and a packed kit.

**Exit check:** the team completes a full demo, including a Kill and an injected obstacle, without help.

## Cross-phase tracking

| Phase | Primary owner | Depends on | Risk level |
| --- | --- | --- | --- |
| 0 | Whole team | None | Low |
| 1 | Simulation lead | 0 | Low |
| 2 | Algorithm lead | 1 | Medium |
| 3 | Algorithm lead | 2 | High |
| 4 | Simulation and algorithm leads | 3 | Medium |
| 5 | Hardware lead | 0 | High |
| 6 | Hardware and simulation leads | 3, 5 | High |
| 7 | Design lead | 4, 6 | Medium |
| 8 | Whole team | 7 | Medium |

## Main risks and responses

- **Reservation deadlocks in one-cell corridors:** add side bays early and test the corridor scenario in phase 3, not at the end.
- **Encoder drift and latency on hardware:** add grid sensing and closed-loop correction in phase 5, and measure drift in phase 6.
- **Scope creep:** anything not needed for the demo goes onto a "later" list. Phases 7 and 8 are protected.
- **Hardware failure close to the event:** keep a spare board and the fallback video.
- **Claims outrunning evidence:** phase 7 exists to make sure every figure is backed by data.

## Minimum viable demo

If time runs short, the minimum that still tells the story is: phases 0 to 4 complete, a working Kill and obstacle demo in simulation, and the hardware robot driving to a few cells with a recorded video. Everything else is a bonus.
