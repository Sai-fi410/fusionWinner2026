# Architecture: Hybrid Decentralized Swarm System

## 1. Purpose and scope

This document describes how the Hybrid Decentralized Swarm System is put together: which components exist, what each one owns, how they talk to each other, and what happens when something breaks. The system coordinates a fleet of warehouse robots without a central route planner. It runs in two modes that share one algorithm:

- **Mode 1, Simulation Engine:** a browser application that runs from a few up to 50-60+ virtual robots on an interactive X-Y grid.
- **Mode 2, Physical Hardware:** one custom ESP32 robot driving on a fixed X-Y arena, linked to a virtual twin on the grid.

The guiding principle is that **every robot decides for itself using only local information and messages from nearby peers**. The server, where one exists, observes and visualizes. It never plans routes.

## 2. High-level layers

The system is split into five layers. Each layer only depends on the one beneath it.

1. **Presentation layer:** the React dashboard, the canvas renderer, the heatmap overlay, the analytics charts and the Judge Mode controls.
2. **Simulation layer:** the world model (grid, walls, parcels, pick-up and drop-off points), the tick clock and the Web Worker pool that runs agents in parallel.
3. **Agent layer:** the autonomous robot logic, identical for virtual and physical robots. It holds the state machine, the local planner, the reservation engine and the yield logic.
4. **Communication layer:** the proximity-ring model in simulation, and MQTT or WebSockets between real devices and the dashboard.
5. **Hardware layer:** the ESP32 firmware, motor drivers, wheel encoders and distance sensors.

## 3. Components

### 3.1 World model

The world is a rectangular grid of cells. Each cell has coordinates (X, Y) and a type: free, wall, side bay, pick-up point, drop-off point or injected obstacle. The world model owns the ground truth, but agents never read it directly. They only perceive cells inside their sensing radius, which keeps the simulation honest about decentralization.

### 3.2 Agent runtime

Every robot runs the same loop on each tick:

1. **Sense:** read nearby cells and any messages received since the last tick.
2. **Update beliefs:** merge neighbour positions, reservations and fault signals into a local view.
3. **Decide:** choose the next cell using local A* over costs, subject to reservations.
4. **Negotiate:** request the next (X, Y, t) reservation from neighbours, or yield if a higher-priority robot claims it.
5. **Act:** move, wait, pick up, drop off or step into a side bay.
6. **Broadcast:** send position, intent, priority and status within the communication ring.

### 3.3 Agent state machine

Robots move between these states: `IDLE`, `MOVING_TO_PICKUP`, `CARRYING`, `YIELDING`, `REROUTING` and `FAILED`. The status colours on screen map directly to states: cyan for moving, green for carrying, yellow for idle and red for failed. A robot in `FAILED` stops planning and broadcasts a fault message once, then repeats it at a low rate so late neighbours still learn about it.

### 3.4 Communication ring

Each robot has a communication radius, written **R_comm**. Any robot inside that radius is a neighbour. Neighbours exchange short messages: heartbeat, reservation request, reservation grant or deny, yield request, fault and parcel-claim. In the simulation, the ring is a distance check. On hardware, it is a topic structure on MQTT where a robot subscribes to the cells near it.

### 3.5 Space-time reservation engine

A reservation is a tuple (X, Y, t), meaning "this robot will occupy this cell at this tick". Reservations are held as short local tables and expire after a small window. A robot may enter a cell only if no neighbour holds a conflicting reservation. This removes head-on collisions without a shared database. Windowed reservation (WHCA*-style) limits how far ahead a robot plans, which keeps computation small.

### 3.6 Priority and yield logic

Each task carries a priority. When two robots want the same cell, the higher priority wins, and ties are broken by a fixed rule such as the lower robot ID. The loser picks the nearest free side bay, steps in and waits until the corridor clears. An aging rule slowly raises the priority of waiting tasks so low-priority work is never starved.

### 3.7 Failure detection and parcel recovery

Failure has two sources: a hardware fault, or a deliberate Kill from Judge Mode. The failed robot broadcasts a fault with its position and any parcel it held. Neighbours treat the cell as an obstacle and recompute routes. Free robots bid for the dropped parcel, with cost based on distance, and the best bidder reroutes to claim it. This is a lightweight form of the Contract Net Protocol.

### 3.8 Traffic heatmap

Each cell keeps a decayed counter of how often it was occupied or contested. The counter maps to a colour from green (calm) to red (congested). The same value feeds back into route cost, so agents raise the price of busy cells and spread out on their own. The heatmap is both a visualization and a real input to planning.

### 3.9 Hardware-to-sim bridge

The physical robot reports its encoder-based position and sensor readings over MQTT or WebSockets. The dashboard assigns it a virtual agent and mirrors that data on the grid. The virtual twin also receives the same neighbour messages, so the real robot behaves as a member of the swarm. Drift between the real and the virtual position is measured and shown.

### 3.10 Judge Mode

Judge Mode is a control panel for live chaos testing. It can kill any robot, place or remove obstacles (virtual or physical markers), change the robot count with a slider, and spike the priority of a task. It writes only to the world model and to robot fault flags. It cannot reach into a robot's planner, which proves resilience rather than faking it.

## 4. Data flow

- **Perception flow:** world model, then local sensing, then agent belief.
- **Coordination flow:** agent to neighbours over the ring, then back as grants, denies and yields.
- **Telemetry flow:** each agent to the dashboard, then to the analytics store and charts. This flow is one-way and read-only so a dashboard crash cannot affect robots.
- **Control flow:** Judge Mode to the world model and fault flags only.

## 5. Message format

Messages are small JSON objects, kept under about 100 bytes of payload where possible:

```json
{ "id": "R12", "t": 482, "pos": [14, 7], "next": [15, 7],
  "pri": 2, "state": "CARRYING", "type": "reserve" }
```

Types are `hb`, `reserve`, `grant`, `deny`, `yield`, `fault` and `claim`. Every message carries the sender ID and tick so stale messages can be discarded.

## 6. Technology mapping

| Concern | Choice |
| --- | --- |
| UI and state | React |
| Rendering | HTML5 Canvas or PixiJS at 60 FPS |
| Parallel agents | Web Workers |
| Optional backend | Node.js or Python FastAPI |
| Messaging | MQTT broker, WebSockets for the dashboard |
| Microcontroller | ESP32 or Arduino-class board |
| Sensors | ToF or ultrasonic, wheel encoders |
| Charts | Recharts or Chart.js |

## 7. Resilience properties

- **No central planner:** loss of the server stops only visualization.
- **Graceful degradation:** a robot with no messages falls back to slow, conservative movement and keeps its last reservation until it expires.
- **Bounded computation:** windowed planning keeps per-tick cost roughly proportional to the number of neighbours, not the fleet size.
- **Observable failures:** every fault is logged with tick, robot and cause.

## 8. Scaling and limits

Computation scales with local density, so 60+ virtual agents are feasible when Web Workers split the fleet. The honest limits are radio congestion on real hardware, one-cell corridors at high density, and the fact that only one physical robot exists. Claims about larger fleets should be framed as simulation results.

## 9. Open architectural questions

- Whether to run an MQTT broker locally on a laptop or a Raspberry Pi for the demo.
- How aggressively reservations should expire under lossy links.
- Whether the bidding step for parcel recovery needs a timeout and a tie-break beyond distance.
