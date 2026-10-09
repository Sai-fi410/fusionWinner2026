import React, { useState } from 'react';
import { X, BookOpen, ShieldCheck, Milestone, Palette, Database, ExternalLink } from 'lucide-react';

interface PresentationDocViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

type DocTab = 'architecture' | 'rules' | 'phases' | 'design' | 'memory';

export const PresentationDocViewer: React.FC<PresentationDocViewerProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<DocTab>('architecture');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 select-text">
      <div className="w-full max-w-5xl h-[88vh] bg-slate-900/95 border border-slate-700/60 rounded-[32px] flex flex-col shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* Modal Header */}
        <div className="h-18 px-7 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-slate-100">
                FUSIONISTIC — System Specifications & Technical Blueprints
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Amazon Robotics IOT-04 Hackathon Documentation Suite
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center px-7 bg-slate-950/70 border-b border-slate-800 overflow-x-auto gap-2.5 py-3">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold font-mono transition-all cursor-pointer ${
              activeTab === 'architecture'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>architecture.md</span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold font-mono transition-all cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>rules.md</span>
          </button>

          <button
            onClick={() => setActiveTab('phases')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold font-mono transition-all cursor-pointer ${
              activeTab === 'phases'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Milestone className="w-4 h-4" />
            <span>phases.md</span>
          </button>

          <button
            onClick={() => setActiveTab('design')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold font-mono transition-all cursor-pointer ${
              activeTab === 'design'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>design.md</span>
          </button>

          <button
            onClick={() => setActiveTab('memory')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold font-mono transition-all cursor-pointer ${
              activeTab === 'memory'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>memory.md</span>
          </button>
        </div>

        {/* Markdown Content Pane */}
        <div className="flex-1 overflow-y-auto p-6 text-sm text-slate-300 leading-relaxed font-sans space-y-6">
          {activeTab === 'architecture' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30">
                <h3 className="text-cyan-400 font-bold font-display text-base">architecture.md (~3,018 words)</h3>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Full system topology, dual-mode cyber-physical architecture, Windowed Space-Time A* (WHCA*), Contract Net Protocol, and ESP32 hardware bridge.
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="text-slate-100 font-bold text-base font-display">1. Dual-Mode Cyber-Physical Topology</h4>
                <p>
                  Fusionistic bridges simulated theory and physical execution:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li><strong>Mode 1 (Virtual Swarm Simulator):</strong> Multithreaded HTML5 Canvas 2D engine executing discrete simulation ticks for 1 to 60+ autonomous AMR agents at locked 60 FPS.</li>
                  <li><strong>Mode 2 (Physical Hardware Execution):</strong> Real-world ESP32 differential drive robot with front-mounted VL53L0X Laser ToF LiDAR and optical wheel encoders syncing with digital twin Agent #0 over WebSockets/MQTT.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="text-slate-100 font-bold text-base font-display">2. Decentralized Coordination Protocols</h4>
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 font-mono text-xs">
                  <div>• Windowed Space-Time A* (WHCA*): Sliding horizon H = 12 ticks; O(1) bounded calculation.</div>
                  <div>• 4D Reservation Tuples (x, y, t): Eliminates vertex collisions and edge/swap collisions.</div>
                  <div>• Contract Net Protocol: Pickup stations broadcast order auctions; idle agents bid based on distance and battery.</div>
                  <div>• Yield & Recess Deadlock Protocol: Lower-priority agent steps into designated side bay during head-on corridor conflicts.</div>
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="text-slate-100 font-bold text-base font-display">3. Performance Comparison</h4>
                <p className="text-slate-400">
                  Centralized CBS planners scale exponentially $O(N \cdot B^D)$ causing multi-second freezes. Fusionistic maintains flat bounded latency (&lt;4ms) across 60 agents.
                </p>
              </section>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                <h3 className="text-emerald-400 font-bold font-display text-base">rules.md (~2,966 words)</h3>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  RFC 2119 operational constraints, space-time collision invariants, priority preemption, and physical hardware E-Stop rules.
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="text-slate-100 font-bold text-base font-display">1. Space-Time Collision Prevention Axioms</h4>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li><strong>Rule 4.1 (Vertex Safety):</strong> No two agents shall occupy the same coordinate $(X, Y)$ at time tick $t$.</li>
                  <li><strong>Rule 4.2 (Edge / Swap Safety):</strong> No two agents shall traverse the same edge in opposite directions at step $t \to t+1$.</li>
                  <li><strong>Rule 4.3 (Trailing Delay):</strong> Trailing is permitted only after leading agent confirms reservation release.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="text-slate-100 font-bold text-base font-display">2. Yield & Recess Deadlock Rules</h4>
                <p className="text-slate-400">
                  When opposing transit is detected in a 1-cell corridor, the lower priority agent MUST maneuver into the nearest designated recess alcove and hold for $K$ ticks.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-slate-100 font-bold text-base font-display">3. Robot Failure & Parcel Salvage Handover</h4>
                <p className="text-slate-400">
                  When an agent suffers a hardware failure (or judge kill switch), it MUST detach its carried parcel, mark itself as an obstacle, and trigger a salvage auction for nearby idle peers.
                </p>
              </section>
            </div>
          )}

          {activeTab === 'phases' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30">
                <h3 className="text-purple-400 font-bold font-display text-base">phases.md (~2,260 words)</h3>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  8-phase development roadmap, technical milestones, testing criteria, and presentation walkthrough rehearsals.
                </p>
              </div>

              <div className="space-y-3">
                <div className="border-l-2 border-cyan-400 pl-3">
                  <div className="font-bold text-slate-100 text-xs font-mono">PHASE 1: Core Scaffolding & 60 FPS Canvas Infrastructure</div>
                  <p className="text-xs text-slate-400">React 18, Tailwind, Lucide, Dual-buffer HTML5 Canvas, Tech-Ghost AMR avatars.</p>
                </div>
                <div className="border-l-2 border-emerald-400 pl-3">
                  <div className="font-bold text-slate-100 text-xs font-mono">PHASE 2: Simulation Engine & Space-Time Graph Navigation</div>
                  <p className="text-xs text-slate-400">Discrete 100ms tick loop, 3D WHCA* search, Manhattan turn penalties.</p>
                </div>
                <div className="border-l-2 border-purple-400 pl-3">
                  <div className="font-bold text-slate-100 text-xs font-mono">PHASE 3: Decentralized Reservation Mesh & CNP Bidding</div>
                  <p className="text-xs text-slate-400">Distributed market auctioning, P2P mesh radio broadcast simulation, fleet slider (1-60).</p>
                </div>
                <div className="border-l-2 border-amber-400 pl-3">
                  <div className="font-bold text-slate-100 text-xs font-mono">PHASE 4: Self-Healing Resilience & Salvage Handover</div>
                  <p className="text-xs text-slate-400">Yield & Recess protocol, dynamic in-transit rerouting, parcel salvage recovery.</p>
                </div>
                <div className="border-l-2 border-rose-400 pl-3">
                  <div className="font-bold text-slate-100 text-xs font-mono">PHASE 5: Chaos Engineering Suite ("Judge Mode")</div>
                  <p className="text-xs text-slate-400">Click-to-block, Kill Agent button, order surge injector, centralized vs decentralized toggle.</p>
                </div>
                <div className="border-l-2 border-blue-400 pl-3">
                  <div className="font-bold text-slate-100 text-xs font-mono">PHASE 6: Cyber-Physical IoT Edge Integration</div>
                  <p className="text-xs text-slate-400">ESP32 dual-core FreeRTOS firmware, VL53L0X ToF laser sensor, WebSocket twin gateway.</p>
                </div>
                <div className="border-l-2 border-teal-400 pl-3">
                  <div className="font-bold text-slate-100 text-xs font-mono">PHASE 7: Live Operational Analytics & Heatmap</div>
                  <p className="text-xs text-slate-400">Dynamic congestion frequency heatmap, real-time KPI HUD, Moving AI benchmarks.</p>
                </div>
                <div className="border-l-2 border-indigo-400 pl-3">
                  <div className="font-bold text-slate-100 text-xs font-mono">PHASE 8: Production Polish & Stage Rehearsals</div>
                  <p className="text-xs text-slate-400">Bundle optimization, 5 guided pitch demo scenarios, zero-lag offline readiness.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'design' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30">
                <h3 className="text-amber-400 font-bold font-display text-base">design.md (~2,055 words)</h3>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  UI/UX visual architecture, Obsidian Void color tokens, Tech-Ghost AMR procedural geometry, and 60 FPS budgets.
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="text-slate-100 font-bold text-base font-display">1. Iconic Visual Identity</h4>
                <p className="text-slate-400">
                  The signature <strong>"Tech-Ghost" AMR</strong> avatar blends the friendly Snapchat ghost silhouette with high-tech carbon plates, glowing directional visors, micro-treads, and state-reactive underglows.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-slate-100 font-bold text-base font-display">2. Color Semantics</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs">
                  <div className="p-2 rounded bg-cyan-950/40 border border-cyan-500/40 text-cyan-400">#00F0FF Transit Empty</div>
                  <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-400">#00FF66 Carrying Task</div>
                  <div className="p-2 rounded bg-amber-950/40 border border-amber-500/40 text-amber-300">#FFB800 Idle Standby</div>
                  <div className="p-2 rounded bg-rose-950/40 border border-rose-500/40 text-rose-400">#FF0055 Hardware Fault</div>
                  <div className="p-2 rounded bg-yellow-950/40 border border-yellow-500/40 text-yellow-300">#FFD700 Priority Tier 1</div>
                  <div className="p-2 rounded bg-purple-950/40 border border-purple-500/40 text-purple-400">#B026FF Charging Dock</div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'memory' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30">
                <h3 className="text-rose-400 font-bold font-display text-base">memory.md (~2,014 words)</h3>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Living project memory, Architecture Decision Records (ADRs), hardware pinout registers, and master file changelog.
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="text-slate-100 font-bold text-base font-display">1. Architecture Decision Records (ADRs)</h4>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li><strong>ADR-001:</strong> Windowed Space-Time A* over CBS for bounded O(1) latency.</li>
                  <li><strong>ADR-002:</strong> Contract Net Protocol for serverless task bidding.</li>
                  <li><strong>ADR-003:</strong> Yield & Recess Protocol for zero-deadlock narrow corridors.</li>
                  <li><strong>ADR-004:</strong> ESP32 Dual-Core FreeRTOS for simultaneous Wi-Fi and 50Hz ToF LiDAR control.</li>
                  <li><strong>ADR-005:</strong> HTML5 Canvas 2D dual-buffer engine for locked 60 FPS rendering.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="text-slate-100 font-bold text-base font-display">2. Physical Robot Hardware Pinout (ESP32)</h4>
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 space-y-1">
                  <div>• GPIO 21 (SDA) / GPIO 22 (SCL): VL53L0X Time-of-Flight Laser Sensor</div>
                  <div>• GPIO 16, 17, 18: TB6612FNG Left Motor Driver & PWM</div>
                  <div>• GPIO 19, 23, 5: TB6612FNG Right Motor Driver & PWM</div>
                  <div>• GPIO 34, 35: TCRT5000 IR Floor Line Grid Reflectance Sensors</div>
                  <div>• GPIO 32, 33: Optical Wheel Encoders (Interrupt driven)</div>
                  <div>• GPIO 4: WS2812B NeoPixel RGB Visual State Strobe</div>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="h-14 px-6 border-t border-surface-border bg-slate-900/80 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            Files stored in project root: architecture.md, rules.md, phases.md, design.md, memory.md
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-void font-bold text-xs transition-colors"
          >
            Close Specs
          </button>
        </div>
      </div>
    </div>
  );
};
