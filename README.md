# Fusionistic — Swarm Coordination for Warehouse Robot Fleets
**Organization**: Amazon Robotics  
**Problem Statement**: IOT-04  
**Benchmark**: [Moving AI MAPF Benchmarks](https://movingai.com/benchmarks/mapf.html)  

Fusionistic is a next-generation decentralized multi-agent warehouse robot fleet coordination platform featuring an interactive 2D cybernetic grid simulator and a physical hardware edge digital twin (ESP32).

---

## Key Features

1. **Dual-Mode Cyber-Physical Architecture**:
   - **Mode 1 (Virtual Swarm Simulator)**: Smooth 60 FPS HTML5 Canvas engine scaling from 1 to 60+ autonomous AMR agents with dynamic slider controls.
   - **Mode 2 (Physical Hardware Execution)**: Real-world ESP32 robot with front-facing VL53L0X Time-of-Flight Laser LiDAR, optical wheel encoders, and bidirectional MQTT/WebSocket telemetry syncing with its digital twin.
2. **Decentralized Multi-Agent Coordination**:
   - **Windowed Space-Time A* (WHCA*)**: Rolling 12-tick horizon search preventing $O(N \cdot B^D)$ exponential lag.
   - **4D Space-Time Reservation Mesh**: Mutual exclusion preventing vertex collisions, edge/swap collisions, and cycle deadlocks.
   - **Contract Net Protocol (CNP)**: Distributed market-based auctioning for task induction without central dispatchers.
   - **Yield & Recess Protocol**: Automatic routing of lower-priority agents into side alcoves to eliminate narrow corridor head-on deadlocks.
   - **Dynamic Parcel Salvage Handover**: Automatic peer recovery when an agent breaks down mid-delivery.
3. **Interactive Chaos Engineering ("Judge Mode")**:
   - **Click-to-Block**: Click any grid aisle to drop physical obstructions and watch the swarm reroute in real time (<4ms).
   - **Judge Kill Switch**: Instantly terminate any robot to trigger dynamic parcel salvage and emergency peer failover.
   - **Emergency Order Surge**: Inject 15+ express orders to stress-test fleet throughput.
   - **Decentralized vs. Centralized Benchmark Switch**: Compare real-time flat latency against exponential central server lag.
4. **Signature Visual Identity**:
   - "Tech-Ghost" AMR avatars inspired by playful cybernetic ghost silhouettes with state-reactive neon visors and glowing pulse communication rings.
   - Real-time congestion heatmap overlay transitioning from green (low traffic) to red (high bottleneck).

---

## Technical Specifications & Documentation

The complete architectural specifications (each exceeding 2,000 words) are available directly in this repository and viewable via the in-app **"System Specs"** modal:

- [`architecture.md`](./architecture.md) — System topology, algorithms, network payloads, and hardware schematics.
- [`rules.md`](./rules.md) — Operational constraints, RFC 2119 invariants, collision prevention axioms, and E-Stop safety.
- [`phases.md`](./phases.md) — 8-phase engineering roadmap, deliverables, test suites, and stage pitch scenarios.
- [`design.md`](./design.md) — UI/UX design system, Obsidian Void tokens, Tech-Ghost procedural canvas engine, and 60 FPS budgets.
- [`memory.md`](./memory.md) — Living project memory, Architecture Decision Records (ADRs), and changelog ledger.

---

## Running the Application Locally

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Build for production
npm run build
```
