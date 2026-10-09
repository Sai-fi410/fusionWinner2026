# Memory: Project Context for the Swarm System

This file is the shared memory of the project. It exists so that any teammate, or any AI assistant starting a fresh session, can get up to speed in a few minutes without re-asking the same questions. Read it first, update it whenever something important is decided, and keep facts separate from guesses.

## 1. Project in one paragraph

The Hybrid Decentralized Swarm System coordinates warehouse robots without a central route planner. Robots negotiate space and time with nearby peers, reroute around obstacles, recover parcels from failed robots, and give way to high-priority tasks. It runs as a browser simulation scaling to 50-60+ robots, and as one physical ESP32 robot on an X-Y arena that joins the swarm through a virtual twin. It is being built for the Fusion 2026 event.

## 2. Event and team

- **Event:** Fusion 2026, using the organizers' PPT template with three logos at the top, which must never be altered.
- **Problem statement ID:** IOT-04.
- **Problem statement title:** Swarm Coordination for Warehouse Robot Fleets.
- **Team name:** TechTitans.
- **Team leader:** Sai Dhapate.
- **Members:** Vibha Kute, Pranav Argade, Samyak Misal.
- **Deliverables:** a six-slide deck (title, problem and solution, technical approach, feasibility, impact, research), a live demo, and preparation for judge questions.

## 3. The problem being solved

1. **Central bottleneck latency:** a master server planning every route causes lag as the fleet grows, and the whole fleet fails if the connection drops.
2. **Dynamic edge chaos:** unexpected obstacles, dropped parcels, hardware failures and overlapping corridors create deadlocks.
3. **Priority disruption:** express orders wait behind standard ones under first-come, first-served pathing.

## 4. Decisions already made

| Decision | Choice | Reason |
| --- | --- | --- |
| Coordination model | Fully decentralized, peer-to-peer | Removes the single point of failure |
| Collision avoidance | Local space-time reservations, WHCA*-style windows | No shared database, bounded computation |
| Task recovery | Bidding for dropped parcels, inspired by the Contract Net Protocol | Simple and explainable |
| Deadlock handling | Yield and Recess Protocol into side bays | Directly addresses one-cell corridors |
| Congestion handling | Heatmap that feeds route cost | Visual and functional |
| Simulation scale | 50-60+ agents via slider and Web Workers | Keeps the browser responsive |
| Hardware | One ESP32 robot with distance sensors and encoders | Low cost, proves the algorithm |
| Link | MQTT or WebSockets | Low latency, lightweight |
| Demo feature | Judge Mode with Kill and obstacle tools | Proves resilience live |
| Status colours | Cyan moving, green carrying, yellow idle, red failed | Consistent across slides and dashboard |

## 5. Technology snapshot

- **Frontend:** React, HTML5 Canvas or PixiJS, 60 FPS rendering.
- **Concurrency:** Web Workers for parallel pathfinding.
- **Backend (optional):** Node.js or Python FastAPI.
- **Hardware:** ESP32 or Arduino-class board, ToF or ultrasonic sensors, wheel encoders, motor drivers.
- **Charts:** Recharts or Chart.js.

## 6. Glossary

- **R_comm:** the communication radius within which robots count as neighbours.
- **Reservation (X, Y, t):** a claim to occupy a cell at a tick.
- **WHCA*:** Windowed Hierarchical Cooperative A*, a pathfinding method using reservation tables.
- **MAPF:** multi-agent path finding.
- **Contract Net Protocol:** a bidding model for distributed task allocation.
- **Side bay:** a cell where a yielding robot waits.
- **Twin:** the virtual agent mirroring the physical robot.
- **Judge Mode:** the control panel for live chaos tests.
- **Tick:** one step of the simulation clock.

## 7. Claims register

This register prevents overclaiming. Update the status as results arrive.

| Claim | Current status | Needed evidence |
| --- | --- | --- |
| 100% uptime without central server | Design target | A logged run with the server stopped |
| Re-routing under 4 ms | Design target for local decision time | Timing logs per decision |
| 30-40% higher deliveries per minute | Design target | Benchmark against a named baseline |
| 60+ agents without browser freezing | Design target | Frame-rate log at 60 agents |
| Lower battery drain and distance | Expectation | Distance and energy counters on hardware |

Rule: until evidence exists, slides and speech say "target" or "in our simulation".

## 8. Known pitfalls

- The decision time and the Wi-Fi transit time are different things. Do not mix them in one number.
- A ghost-tech status glow uses the same green and red as the heatmap. Keep the heatmap as a cell tint, not a glow.
- One-cell corridors are the likeliest place for deadlocks, so test them early.
- Encoder drift grows over distance, so rely on grid correction rather than encoders alone.
- Venue Wi-Fi is unreliable. Bring a hotspot and run a local broker.
- Reference list: avoid citing tools that are unrelated to warehouse robots. Satellite-orbit and computer-vision libraries were removed from the draft for this reason.
- Do not describe the demo as 60 physical robots. It is 60+ simulated and one physical.

## 9. Preferences from the team

- Slides must keep the original template and all three logos unchanged.
- Text on slides should be large, never shrunk to fit.
- Only the most important points go on slides. Detail belongs in the speaker's answers.
- Judge questions and answers should be prepared in advance.

## 10. Working agreements

- Config values live in a single file. Do not scatter constants.
- Runs are seeded so any scenario can be reproduced for a judge.
- No change is merged if the no-collision regression test fails.
- Every important decision is added to section 4 with a reason.

## 11. Status log

Keep entries short, newest first.

- **Current:** slide deck filled in on the event template, judge Q&A drafted, and supporting documents written (architecture, rules, phases, design, memory).
- **Next:** confirm the build timeline against the event date, set the config values, and begin the static world and rendering work.
- **Not yet started:** simulation code, firmware, benchmark runs.

## 12. Open questions

1. What is the event date and demo slot length?
2. Is a projector available, and at what resolution?
3. Which MQTT broker will run on the day, and on which device?
4. Which baseline will the benchmark compare against: central A* or first-come, first-served?
5. How large is the physical arena, and how many cells does it contain?
6. Who owns each phase?
7. How long must the robot battery last during a full demo?

## 13. How to use this file

- At the start of every session, read sections 1, 4, 7, 8 and 11.
- When a decision changes, edit section 4 and add the reason, rather than keeping both versions.
- When evidence arrives, update section 7 with the run name and the measured value.
- Keep facts from the team separate from assumptions. Mark assumptions clearly with the word "assumed".
- Never store passwords, broker credentials or personal contact details in this file.

## 14. Reference list in use

- Moving AI MAPF benchmarks, movingai.com/benchmarks/mapf.html.
- Stern et al., Multi-Agent Pathfinding: Definitions, Variants and Benchmarks, SoCS 2019.
- Silver, Cooperative Pathfinding, 2005, for WHCA*.
- Smith, The Contract Net Protocol, 1980.
- MQTT, an OASIS standard.
- WebSockets, RFC 6455.

Verify each citation against the original source before presenting.
