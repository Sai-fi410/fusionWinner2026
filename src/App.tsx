import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SwarmManager } from './engine/swarmManager';
import { 
  Agent, 
  ArchitectureMode, 
  SystemMode, 
  TelemetryData, 
  ToolMode, 
  CellInspectionInfo,
  HardwareRobotState,
  HardwareCsvRow,
  CanvasViewMode
} from './types/simulation';
import { Header } from './components/Header';
import { SimulationCanvas } from './components/SimulationCanvas';
import { TelemetrySidebar } from './components/TelemetrySidebar';
import { ControlBar } from './components/ControlBar';
import { RobotInspector } from './components/RobotInspector';
import { CellInspector } from './components/CellInspector';
import { CustomParcelModal } from './components/CustomParcelModal';
import { HardwareEdgePanel } from './components/HardwareEdgePanel';
import { PresentationDocViewer } from './components/PresentationDocViewer';
import { AlertTriangle } from 'lucide-react';

export function App() {
  // Swarm Engine Singleton
  const managerRef = useRef<SwarmManager>(new SwarmManager(24));
  const manager = managerRef.current;

  // React State - Robots DO NOT start walking unless told to!
  const [systemMode, setSystemMode] = useState<SystemMode>('SIMULATION');
  const [architectureMode, setArchitectureMode] = useState<ArchitectureMode>('DECENTRALIZED');
  const [fleetSize, setFleetSize] = useState<number>(24);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedCell, setSelectedCell] = useState<CellInspectionInfo | null>(null);
  const [toolMode, setToolMode] = useState<ToolMode>('INSPECT');
  const [isParcelModalOpen, setIsParcelModalOpen] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [tickSpeedMs, setTickSpeedMs] = useState<number>(120);

  // Hardware Twin WebSockets & Telemetry State
  const [isHardwarePanelOpen, setIsHardwarePanelOpen] = useState<boolean>(false);
  const [isHardwareConnected, setIsHardwareConnected] = useState<boolean>(false);
  const [hardwareRobotState, setHardwareRobotState] = useState<HardwareRobotState | null>(null);
  const [hardwareCsvRows, setHardwareCsvRows] = useState<HardwareCsvRow[]>([]);

  // Visual Overlays & 2D/3D View Mode - User can turn off and on rings & switch to 3D Isometric View
  const [viewMode, setViewMode] = useState<CanvasViewMode>('2D');
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [showPathVectors, setShowPathVectors] = useState<boolean>(true);
  const [showCommRings, setShowCommRings] = useState<boolean>(true);
  const [isDocsOpen, setIsDocsOpen] = useState<boolean>(false);

  // Telemetry Snapshot
  const [telemetry, setTelemetry] = useState<TelemetryData>(manager.getTelemetry());

  // Step simulation tick
  const stepTick = useCallback(() => {
    manager.stepTick();
    setTelemetry(manager.getTelemetry());
    // Refresh selected agent if open
    if (selectedAgent) {
      const refreshed = manager.agents.find(a => a.id === selectedAgent.id);
      setSelectedAgent(refreshed || null);
    }
    // Refresh selected cell if open
    if (selectedCell) {
      setSelectedCell(manager.inspectCell(selectedCell.x, selectedCell.y));
    }
  }, [manager, selectedAgent, selectedCell]);

  // Main Simulation Tick Timer
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      stepTick();
    }, tickSpeedMs);

    return () => clearInterval(interval);
  }, [isRunning, tickSpeedMs, stepTick]);

  // WebSocket Client for ESP32 Hardware Bridge Backend
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;

    const connectToBackend = () => {
      try {
        ws = new WebSocket('ws://localhost:5000/ws');

        ws.onopen = () => {
          setIsHardwareConnected(true);
          ws?.send(JSON.stringify({ role: 'FRONTEND' }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'INIT_STATE') {
              if (data.robotState) setHardwareRobotState(data.robotState);
              if (data.recentCsvRows) setHardwareCsvRows(data.recentCsvRows);
            } else if (data.type === 'HARDWARE_UPDATE') {
              if (data.robotState) {
                setHardwareRobotState(data.robotState);
                
                // If in Hardware Twin mode, sync physical robot coordinates onto virtual AMR-01 / Cyber-Twin 01
                if (manager.agents.length > 0) {
                  const hwAgent = manager.agents[0];
                  hwAgent.x = data.robotState.x;
                  hwAgent.y = data.robotState.y;
                  hwAgent.subX = data.robotState.x;
                  hwAgent.subY = data.robotState.y;
                  hwAgent.heading = (data.robotState.heading * Math.PI) / 180;
                  if (data.command?.latencyMs) {
                    hwAgent.lastRerouteLatencyMs = data.command.latencyMs;
                  }
                  if (data.robotState.obstacleDetected) {
                    hwAgent.isRouteBlocked = true;
                    hwAgent.blockedReason = `Ultrasonic obstacle detected at ${data.robotState.lastUltrasonicCm}cm. Rerouting...`;
                  } else {
                    hwAgent.isRouteBlocked = false;
                  }
                  setTelemetry(manager.getTelemetry());
                }
              }

              if (data.csvRow) {
                setHardwareCsvRows(prev => [data.csvRow, ...prev.slice(0, 49)]);
              }
            } else if (data.type === 'CSV_RESET') {
              setHardwareCsvRows([]);
            } else if (data.type === 'ESP32_STATUS') {
              // Received status packet
            }
          } catch (err) {
            console.error('[App] Failed to parse hardware WS message', err);
          }
        };

        ws.onclose = () => {
          setIsHardwareConnected(false);
          reconnectTimer = setTimeout(connectToBackend, 3000);
        };

        ws.onerror = () => {
          setIsHardwareConnected(false);
          ws?.close();
        };
      } catch (e) {
        setIsHardwareConnected(false);
        reconnectTimer = setTimeout(connectToBackend, 3000);
      }
    };

    connectToBackend();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [manager]);

  // Hardware Console Action Handlers
  const handleDownloadCsv = () => {
    window.open('http://localhost:5000/api/telemetry/csv', '_blank');
  };

  const handleResetCsv = async () => {
    try {
      await fetch('http://localhost:5000/api/telemetry/reset-csv', { method: 'POST' });
      setHardwareCsvRows([]);
    } catch (e) {
      console.error('Failed to reset CSV', e);
    }
  };

  const handleSendHardwareCommand = async (command: string, speed = 180, durationMs = 500) => {
    try {
      await fetch('http://localhost:5000/api/hardware/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, speed, durationMs })
      });
    } catch (e) {
      console.error('Failed to send hardware command', e);
    }
  };

  const handleInjectHardwareObstacle = async () => {
    try {
      await fetch('http://localhost:5000/api/hardware/inject-obstacle', { method: 'POST' });
    } catch (e) {
      console.error('Failed to inject hardware obstacle', e);
    }
  };

  const handleResetHardwarePosition = async () => {
    try {
      await fetch('http://localhost:5000/api/hardware/reset-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x: 1, y: 3, heading: 0 })
      });
    } catch (e) {
      console.error('Failed to reset hardware position', e);
    }
  };

  // Mode Switch Handlers
  const handleSetSystemMode = (mode: SystemMode) => {
    setSystemMode(mode);
    manager.systemMode = mode;
    if (mode === 'HARDWARE_TWIN') {
      manager.hardwareTwinConnected = true;
      if (manager.agents.length > 0) {
        manager.agents[0].isHardwareTwin = true;
        manager.agents[0].name = 'Cyber-Twin 01';
        manager.agents[0].id = 'FUS-HW-01';
      }
      // Auto-open hardware console when switching to hardware mode
      setIsHardwarePanelOpen(true);
    } else {
      manager.hardwareTwinConnected = false;
      if (manager.agents.length > 0) {
        manager.agents[0].isHardwareTwin = false;
        manager.agents[0].name = 'Unit #01';
        manager.agents[0].id = 'AMR-01';
      }
    }
    setTelemetry(manager.getTelemetry());
  };

  const handleToggleArchitectureMode = () => {
    const nextMode = architectureMode === 'DECENTRALIZED' ? 'CENTRALIZED' : 'DECENTRALIZED';
    setArchitectureMode(nextMode);
    manager.architectureMode = nextMode;
    setTelemetry(manager.getTelemetry());
  };

  const handleFleetSizeChange = (size: number) => {
    setFleetSize(size);
    manager.setFleetSize(size);
    setTelemetry(manager.getTelemetry());
  };

  const handleKillAgent = (agentId: string) => {
    manager.killAgent(agentId);
    setTelemetry(manager.getTelemetry());
    if (selectedAgent && selectedAgent.id === agentId) {
      const updated = manager.agents.find(a => a.id === agentId);
      setSelectedAgent(updated || null);
    }
  };

  const handleKillRandom = () => {
    manager.killRandomAgent();
    setTelemetry(manager.getTelemetry());
  };

  const handleInjectSurge = () => {
    manager.injectSurgeOrders(15);
    setTelemetry(manager.getTelemetry());
  };

  const handleClearObstacles = () => {
    manager.clearAllObstacles();
    setTelemetry(manager.getTelemetry());
    if (selectedCell) {
      setSelectedCell(manager.inspectCell(selectedCell.x, selectedCell.y));
    }
  };

  // Keyboard Shortcuts for Stage Pitch
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsRunning(prev => !prev);
      } else if (e.key === 'k' || e.key === 'K') {
        setToolMode(prev => prev === 'KILL' ? 'INSPECT' : 'KILL');
      } else if (e.key === 'o' || e.key === 'O') {
        setToolMode(prev => prev === 'OBSTACLE' ? 'INSPECT' : 'OBSTACLE');
      } else if (e.key === 'i' || e.key === 'I') {
        setToolMode('INSPECT');
      } else if (e.key === 'e' || e.key === 'E') {
        setIsHardwarePanelOpen(prev => !prev);
      } else if (e.key === 's' || e.key === 'S') {
        handleInjectSurge();
      } else if (e.key === 'c' || e.key === 'C') {
        handleClearObstacles();
      } else if (e.key === 'h' || e.key === 'H') {
        setShowHeatmap(prev => !prev);
      } else if (e.key === 'r' || e.key === 'R') {
        setShowCommRings(prev => !prev);
      } else if (e.key === 'v' || e.key === 'V') {
        setViewMode(prev => prev === '2D' ? '3D' : '2D');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#EFF3F8] text-slate-800 font-sans">
      {/* Top Header */}
      <Header
        systemMode={systemMode}
        onSetSystemMode={handleSetSystemMode}
        architectureMode={architectureMode}
        onToggleArchitectureMode={handleToggleArchitectureMode}
        isRunning={isRunning}
        onTogglePlay={() => setIsRunning(prev => !prev)}
        showCommRings={showCommRings}
        onToggleCommRings={() => setShowCommRings(prev => !prev)}
        toolMode={toolMode}
        onSetToolMode={setToolMode}
        onOpenParcelModal={() => setIsParcelModalOpen(true)}
        onKillRandom={handleKillRandom}
        onInjectSurge={handleInjectSurge}
        onClearObstacles={handleClearObstacles}
        onOpenDocs={() => setIsDocsOpen(true)}
        isHardwareConnected={isHardwareConnected}
        onOpenHardwarePanel={() => setIsHardwarePanelOpen(true)}
        activeWarehouse={manager.activeWarehouseId}
        onSelectWarehouse={(id) => {
          manager.switchWarehouse(id);
          setTelemetry(manager.getTelemetry());
          setSelectedAgent(null);
          setSelectedCell(null);
        }}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode(prev => prev === '2D' ? '3D' : '2D')}
      />

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Telemetry Sidebar */}
        <TelemetrySidebar
          telemetry={telemetry}
          fleetSize={fleetSize}
          onFleetSizeChange={handleFleetSizeChange}
          architectureMode={architectureMode}
          agents={manager.agents}
          onClearObstacles={handleClearObstacles}
          onOpenParcelModal={() => setIsParcelModalOpen(true)}
          isHardwareConnected={isHardwareConnected}
          onOpenHardwarePanel={() => setIsHardwarePanelOpen(true)}
        />

        {/* Central 2D Simulation Arena */}
        <main className="flex-1 relative flex flex-col items-center justify-center p-3 sm:p-4 overflow-hidden bg-[#EFF3F8]">
          <SimulationCanvas
            manager={manager}
            selectedAgent={selectedAgent}
            onSelectAgent={(agent) => {
              setSelectedAgent(agent);
              if (agent) setSelectedCell(null);
            }}
            selectedCell={selectedCell}
            onSelectCell={(cell) => {
              setSelectedCell(cell);
              if (cell) setSelectedAgent(null);
            }}
            toolMode={toolMode}
            onSetToolMode={setToolMode}
            showHeatmap={showHeatmap}
            showPathVectors={showPathVectors}
            showCommRings={showCommRings}
            isRunning={isRunning}
            onTogglePlay={() => setIsRunning(prev => !prev)}
            viewMode={viewMode}
            onToggleViewMode={() => setViewMode(prev => prev === '2D' ? '3D' : '2D')}
          />

          {/* CRITICAL ROUTE FULLY BLOCKED ERROR BANNER - ONLY SHOWN WHEN ACTUALLY BLOCKED */}
          {telemetry.isRouteFullyBlocked && (
            <div className="absolute top-5 z-30 flex items-center gap-3.5 px-6 py-3.5 rounded-full bg-white/95 border border-rose-200 shadow-xl text-slate-800 animate-bounce backdrop-blur-md">
              <div className="w-9 h-9 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="font-display font-bold text-sm tracking-wide text-rose-600">
                  THE WHOLE ROUTE IS BLOCKED!
                </div>
                <div className="text-xs text-slate-500 font-sans">
                  {telemetry.blockedAgentCount} robot(s) cannot reach destination. Remove obstacles to open corridor.
                </div>
              </div>
              <button
                onClick={handleClearObstacles}
                className="ml-3 px-5 py-2 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs tracking-wide shadow-md transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
              >
                REMOVE OBSTACLES
              </button>
            </div>
          )}
        </main>

        {/* Selected Robot Inspector Overlay */}
        {selectedAgent && (
          <RobotInspector
            agent={selectedAgent}
            onClose={() => setSelectedAgent(null)}
            onKillAgent={handleKillAgent}
            onClearObstacles={handleClearObstacles}
          />
        )}

        {/* Selected Cell Inspector Overlay */}
        {selectedCell && !selectedAgent && (
          <CellInspector
            info={selectedCell}
            onClose={() => setSelectedCell(null)}
          />
        )}
      </div>

      {/* Bottom Controls Bar */}
      <ControlBar
        isRunning={isRunning}
        onTogglePlay={() => setIsRunning(!isRunning)}
        onStepTick={stepTick}
        tickSpeedMs={tickSpeedMs}
        onTickSpeedChange={setTickSpeedMs}
        showHeatmap={showHeatmap}
        onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
        showPathVectors={showPathVectors}
        onTogglePathVectors={() => setShowPathVectors(!showPathVectors)}
        showCommRings={showCommRings}
        onToggleCommRings={() => setShowCommRings(!showCommRings)}
      />

      {/* Custom Parcel Queue Config Modal */}
      <CustomParcelModal
        isOpen={isParcelModalOpen}
        onClose={() => setIsParcelModalOpen(false)}
        currentCount={manager.customParcelsPerStation}
        onApplyCustomQueue={(count) => {
          manager.setCustomParcelQueue(count);
          setTelemetry(manager.getTelemetry());
        }}
        stationCount={manager.layout.pickStations.length}
      />

      {/* Hardware Twin Real-Time Console & CSV Modal */}
      <HardwareEdgePanel
        isOpen={isHardwarePanelOpen}
        onClose={() => setIsHardwarePanelOpen(false)}
        robotState={hardwareRobotState}
        csvRows={hardwareCsvRows}
        isConnected={isHardwareConnected}
        onDownloadCsv={handleDownloadCsv}
        onResetCsv={handleResetCsv}
        onSendCommand={handleSendHardwareCommand}
        onInjectObstacle={handleInjectHardwareObstacle}
        onResetPosition={handleResetHardwarePosition}
      />

      {/* Comprehensive System Documentation Viewer Modal */}
      <PresentationDocViewer
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />
    </div>
  );
}

export default App;
