import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Cpu, 
  Sparkles, 
  Radio, 
  Zap, 
  Activity, 
  CheckCircle2,
  Clock,
  Play,
  Square,
  Download,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  Compass,
  Navigation,
  FileSpreadsheet,
  Code2,
  Wifi,
  WifiOff
} from 'lucide-react';

interface HardwareEdgePanelProps {
  isOpen: boolean;
  onClose: () => void;
  robotState?: any;
  csvRows?: any[];
  isConnected?: boolean;
  onDownloadCsv?: () => void;
  onResetCsv?: () => void;
  onSendCommand?: (cmd: string, speed?: number, durationMs?: number) => void;
  onInjectObstacle?: () => void;
  onResetPosition?: () => void;
  isDarkMode?: boolean;
  onRegisterSimulationObstacle?: (x: number, y: number) => void;
}

interface CsvRecord {
  timestamp: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  obstacleDetected: boolean;
  status: string;
  irTriggered: boolean;
}

const ESP32_SKETCH_CODE = `#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>

// Compatibility definitions across ESPAsyncWebServer versions
#ifndef WS_TEXT
  #define WS_TEXT 0x01
#endif
#ifndef WS_OPCODE_TEXT
  #define WS_OPCODE_TEXT 0x01
#endif

// ArduinoJson 6 and 7 dual-compatibility macro
#if defined(ARDUINOJSON_VERSION_MAJOR) && (ARDUINOJSON_VERSION_MAJOR >= 7)
  #define ALLOCATE_JSON_DOC(doc, size) JsonDocument doc
#else
  #define ALLOCATE_JSON_DOC(doc, size) StaticJsonDocument<size> doc
#endif

// Wi-Fi Access Point Credentials
const char* ssid = "ESP32-Car";
const char* password = "12345678Password";

// Hardware Pins
#define TRIG_PIN 5
#define ECHO_PIN 18
#define IR_PIN 4
#define SERVO1_PIN 12 // Left Motor/Servo
#define SERVO2_PIN 13 // Right Motor/Servo

// Servers
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

Servo servoLeft;
Servo servoRight;

float currentX = 50.0, currentY = 50.0;
float targetX = 550.0, targetY = 350.0;
bool isNavigating = false;
bool obstacleDetected = false;

// Read Ultrasonic Sensor Distance
float getUltrasonicDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return 400.0;
  return (duration * 0.0343) / 2.0;
}

// Broadcast Telemetry to Connected Web Clients
void broadcastTelemetry() {
  ALLOCATE_JSON_DOC(doc, 256);
  doc["x"] = currentX;
  doc["y"] = currentY;
  doc["targetX"] = targetX;
  doc["targetY"] = targetY;
  doc["ir"] = (digitalRead(IR_PIN) == LOW);
  doc["obstacle"] = obstacleDetected;
  doc["status"] = isNavigating ? (obstacleDetected ? "DETOURING" : "NAVIGATING") : "IDLE";

  String output;
  serializeJson(doc, output);
  ws.textAll(output);
}

// WebSocket Event Handler
void onWsEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
  if (type == WS_EVT_DATA) {
    AwsFrameInfo *info = (AwsFrameInfo*)arg;
    if (info->opcode == WS_TEXT || info->opcode == WS_OPCODE_TEXT) {
      ALLOCATE_JSON_DOC(doc, 256);
      DeserializationError error = deserializeJson(doc, data, len);
      if (!error) {
        String action = doc["action"] | "";
        if (action == "SET_POINTS") {
          currentX = doc["aX"] | currentX;
          currentY = doc["aY"] | currentY;
          targetX = doc["bX"] | targetX;
          targetY = doc["bY"] | targetY;
          isNavigating = true;
          obstacleDetected = false;
        } else if (action == "STOP") {
          isNavigating = false;
          servoLeft.write(90);
          servoRight.write(90);
        }
        broadcastTelemetry();
      }
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(IR_PIN, INPUT_PULLUP);

  servoLeft.attach(SERVO1_PIN);
  servoRight.attach(SERVO2_PIN);
  servoLeft.write(90);
  servoRight.write(90);

  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid, password);
  Serial.print("Access Point Started. IP: ");
  Serial.println(WiFi.softAPIP());

  ws.onEvent(onWsEvent);
  server.addHandler(&ws);
  server.begin();
}

void loop() {
  ws.cleanupClients();

  if (isNavigating) {
    float dist = getUltrasonicDistance();
    bool irTrigger = (digitalRead(IR_PIN) == LOW);

    if (dist < 15.0 || irTrigger) {
      obstacleDetected = true;
      // Tangent Detour / Bug Algorithm: Turn right to clear object
      servoLeft.write(120);
      servoRight.write(60);
      currentX += 0.5;
    } else {
      obstacleDetected = false;
      float dx = targetX - currentX;
      float dy = targetY - currentY;
      float distanceToTarget = sqrt(dx * dx + dy * dy);

      if (distanceToTarget < 2.0) {
        isNavigating = false;
        servoLeft.write(90);
        servoRight.write(90);
      } else {
        servoLeft.write(180);
        servoRight.write(0);
        currentX += (dx / distanceToTarget) * 0.8;
        currentY += (dy / distanceToTarget) * 0.8;
      }
    }

    broadcastTelemetry();
    delay(100);
  }
}`;

export const HardwareEdgePanel: React.FC<HardwareEdgePanelProps> = ({
  isOpen,
  onClose,
  robotState,
  csvRows = [],
  isConnected = false,
  onDownloadCsv: parentDownloadCsv,
  onResetCsv: parentResetCsv,
  onSendCommand: parentSendCommand,
  onInjectObstacle: parentInjectObstacle,
  onResetPosition: parentResetPosition,
  isDarkMode = true,
  onRegisterSimulationObstacle
}) => {
  // Navigation Tabs: 'MISSION' | 'BLYNK' | 'MATRIX' | 'FIRMWARE'
  const [activeTab, setActiveTab] = useState<'MISSION' | 'BLYNK' | 'MATRIX' | 'FIRMWARE'>('MISSION');

  // Point A & Point B Selection Mode
  const [selectionMode, setSelectionMode] = useState<'A' | 'B'>('A');
  const [pointA, setPointA] = useState<{ x: number; y: number }>({ x: 60, y: 80 });
  const [pointB, setPointB] = useState<{ x: number; y: number }>({ x: 540, y: 320 });
  const [robotPos, setRobotPos] = useState<{ x: number; y: number }>({ x: 60, y: 80 });
  const [robotHeading, setRobotHeading] = useState<number>(0);
  const [trail, setTrail] = useState<{ x: number; y: number; obstacle: boolean }[]>([]);

  // Telemetry state
  const [robotStatus, setRobotStatus] = useState<string>('IDLE');
  const [obstacleDetected, setObstacleDetected] = useState<boolean>(false);
  const [irTriggered, setIrTriggered] = useState<boolean>(false);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);

  // Blynk Cloud V0 State
  const [blynkToken, setBlynkToken] = useState<string>('');
  const [isBlynkActive, setIsBlynkActive] = useState<boolean>(false);
  const [blynkDistanceCm, setBlynkDistanceCm] = useState<number | null>(null);
  const [blynkStatusMsg, setBlynkStatusMsg] = useState<string>('Ready to connect');
  const [lastBlynkPollTime, setLastBlynkPollTime] = useState<string>('');
  const [autoRegisterObstacle, setAutoRegisterObstacle] = useState<boolean>(true);
  const [lastRegisteredBlock, setLastRegisteredBlock] = useState<{ x: number; y: number } | null>(null);

  // Coordinate Conversion Helper: 600x360 canvas -> 32x20 warehouse grid
  const toGridX = (px: number) => Math.min(31, Math.max(0, Math.floor((px / 600) * 32)));
  const toGridY = (py: number) => Math.min(19, Math.max(0, Math.floor((py / 360) * 20)));

  // Manual Trigger to register obstacle at robot's front cell into warehouse simulation
  const handleRegisterObstacleAtRobot = (distCm = 12.0) => {
    setObstacleDetected(true);
    setBlynkDistanceCm(distCm);
    const obsPx = robotPos.x + Math.cos(robotHeading) * 35;
    const obsPy = robotPos.y + Math.sin(robotHeading) * 35;
    const gx = toGridX(obsPx);
    const gy = toGridY(obsPy);
    setLastRegisteredBlock({ x: gx, y: gy });
    if (onRegisterSimulationObstacle) {
      onRegisterSimulationObstacle(gx, gy);
    }
  };

  // WebSocket connection state
  const [wsUrl, setWsUrl] = useState<string>('ws://192.168.4.1/ws');
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [wsConnecting, setWsConnecting] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  // CSV Trajectory Log
  const [csvRecords, setCsvRecords] = useState<CsvRecord[]>([]);

  // Simulation fallback mode (for offline live pitch testing)
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const simTimerRef = useRef<any>(null);

  // 5x5 Matrix probe state
  const [activeCell, setActiveCell] = useState<{ x: number; y: number }>({ x: 2, y: 2 });
  const [scanTick, setScanTick] = useState<number>(0);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Real-time Blynk Cloud V0 Poller
  useEffect(() => {
    if (!isOpen || !isBlynkActive || !blynkToken.trim()) return;

    let isMounted = true;
    const pollBlynk = async () => {
      try {
        const url = `https://blynk.cloud/external/api/get?token=${encodeURIComponent(blynkToken.trim())}&v0`;
        const res = await fetch(url);
        if (!res.ok) {
          if (isMounted) setBlynkStatusMsg(`Blynk Cloud HTTP ${res.status}`);
          return;
        }
        const text = await res.text();
        const dist = parseFloat(text.trim());
        if (!isNaN(dist) && isMounted) {
          setBlynkDistanceCm(dist);
          setLastBlynkPollTime(new Date().toLocaleTimeString());
          setBlynkStatusMsg(`Streaming: ${dist.toFixed(1)} cm`);

          const isObs = dist > 0.5 && dist <= 18.0;
          setObstacleDetected(isObs);

          if (isObs && autoRegisterObstacle) {
            const obsPx = robotPos.x + Math.cos(robotHeading) * 35;
            const obsPy = robotPos.y + Math.sin(robotHeading) * 35;
            const gx = toGridX(obsPx);
            const gy = toGridY(obsPy);
            setLastRegisteredBlock({ x: gx, y: gy });
            if (onRegisterSimulationObstacle) {
              onRegisterSimulationObstacle(gx, gy);
            }
          }
        }
      } catch (err: any) {
        if (isMounted) setBlynkStatusMsg('Blynk connection failed (Check network/token)');
      }
    };

    pollBlynk();
    const interval = setInterval(pollBlynk, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, isBlynkActive, blynkToken, robotPos, robotHeading, autoRegisterObstacle, onRegisterSimulationObstacle]);

  // 5x5 radar scan pulse
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setScanTick(prev => (prev + 1) % 25);
    }, 400);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Connect to ESP32 WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    setWsConnecting(true);
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        setWsConnecting(false);
        console.log('[ESP32-AP] WebSocket connected to', wsUrl);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const x = typeof data.x === 'number' ? data.x : robotPos.x;
          const y = typeof data.y === 'number' ? data.y : robotPos.y;
          const isObs = Boolean(data.obstacle);
          const isIr = Boolean(data.ir);
          const status = data.status || (isNavigating ? 'NAVIGATING' : 'IDLE');

          setRobotPos({ x, y });
          setObstacleDetected(isObs);
          setIrTriggered(isIr);
          setRobotStatus(status);

          if (isObs && autoRegisterObstacle && onRegisterSimulationObstacle) {
            const obsPx = x + Math.cos(robotHeading) * 35;
            const obsPy = y + Math.sin(robotHeading) * 35;
            const gx = toGridX(obsPx);
            const gy = toGridY(obsPy);
            setLastRegisteredBlock({ x: gx, y: gy });
            onRegisterSimulationObstacle(gx, gy);
          }

          if (status === 'IDLE' || status === 'REACHED_GOAL') {
            setIsNavigating(false);
          } else {
            setIsNavigating(true);
          }

          // Record trail
          setTrail(prev => [...prev.slice(-300), { x, y, obstacle: isObs }]);

          // Record in CSV log
          setCsvRecords(prev => [
            {
              timestamp: new Date().toISOString(),
              x: Number(x.toFixed(2)),
              y: Number(y.toFixed(2)),
              targetX: Number((data.targetX ?? pointB.x).toFixed(2)),
              targetY: Number((data.targetY ?? pointB.y).toFixed(2)),
              obstacleDetected: isObs,
              status,
              irTriggered: isIr
            },
            ...prev.slice(0, 999)
          ]);
        } catch (e) {
          console.error('[ESP32-AP] Failed to parse telemetry', e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        setWsConnecting(false);
      };

      ws.onerror = () => {
        setWsConnected(false);
        setWsConnecting(false);
      };
    } catch (e) {
      setWsConnected(false);
      setWsConnecting(false);
    }
  }, [wsUrl, robotPos.x, robotPos.y, isNavigating, pointB.x, pointB.y, autoRegisterObstacle, onRegisterSimulationObstacle, robotHeading]);

  useEffect(() => {
    if (isOpen) {
      connectWebSocket();
    }
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, [isOpen, connectWebSocket]);

  // Handle Canvas Clicking to Set Point A and B
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = Math.round((e.clientX - rect.left) * scaleX);
    const clickY = Math.round((e.clientY - rect.top) * scaleY);

    if (selectionMode === 'A') {
      setPointA({ x: clickX, y: clickY });
      setRobotPos({ x: clickX, y: clickY });
      setTrail([{ x: clickX, y: clickY, obstacle: false }]);
      // Auto-toggle to Mode B for streamlined UX
      setSelectionMode('B');
    } else {
      setPointB({ x: clickX, y: clickY });
    }
  };

  // Start Navigation Command
  const handleStartDrive = () => {
    setIsNavigating(true);
    setRobotStatus('NAVIGATING');
    setObstacleDetected(false);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const payload = {
        action: 'SET_POINTS',
        aX: pointA.x,
        aY: pointA.y,
        bX: pointB.x,
        bY: pointB.y
      };
      wsRef.current.send(JSON.stringify(payload));
    } else {
      // Run in built-in simulation fallback so user can demo/pitch immediately!
      startSimulationLoop();
    }
  };

  // Stop Navigation Command
  const handleStopDrive = () => {
    setIsNavigating(false);
    setRobotStatus('STOPPED');
    if (simTimerRef.current) clearInterval(simTimerRef.current);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'STOP' }));
    }
  };

  // Built-in Simulator Loop (Demonstrates Bug Detour algorithm & live CSV logging)
  const startSimulationLoop = () => {
    if (simTimerRef.current) clearInterval(simTimerRef.current);
    setIsSimulating(true);

    let curX = pointA.x;
    let curY = pointA.y;
    const destX = pointB.x;
    const destY = pointB.y;

    // Synthetic obstacle placed midway for demonstration
    const midX = (pointA.x + pointB.x) / 2;
    const midY = (pointA.y + pointB.y) / 2;
    const obstacleRadius = 38;

    simTimerRef.current = setInterval(() => {
      const dx = destX - curX;
      const dy = destY - curY;
      const distToGoal = Math.sqrt(dx * dx + dy * dy);

      if (distToGoal < 3.0) {
        clearInterval(simTimerRef.current);
        setIsNavigating(false);
        setIsSimulating(false);
        setRobotStatus('REACHED GOAL');
        setObstacleDetected(false);
        return;
      }

      // Check distance to synthetic obstacle
      const distToObs = Math.hypot(curX - midX, curY - midY);
      let isObs = distToObs < obstacleRadius;
      let status = 'NAVIGATING';

      if (isObs) {
        status = 'DETOURING';
        setObstacleDetected(true);
        // Tangent Detour: Steer orthogonally around obstacle
        const angle = Math.atan2(dy, dx) + Math.PI / 2.2;
        curX += Math.cos(angle) * 2.2;
        curY += Math.sin(angle) * 2.2;

        if (autoRegisterObstacle && onRegisterSimulationObstacle) {
          const obsPx = curX + Math.cos(robotHeading) * 35;
          const obsPy = curY + Math.sin(robotHeading) * 35;
          const gx = toGridX(obsPx);
          const gy = toGridY(obsPy);
          setLastRegisteredBlock({ x: gx, y: gy });
          onRegisterSimulationObstacle(gx, gy);
        }
      } else {
        setObstacleDetected(false);
        const heading = Math.atan2(dy, dx);
        setRobotHeading(heading);
        curX += (dx / distToGoal) * 2.5;
        curY += (dy / distToGoal) * 2.5;
      }

      setRobotPos({ x: curX, y: curY });
      setRobotStatus(status);
      setTrail(prev => [...prev.slice(-300), { x: curX, y: curY, obstacle: isObs }]);

      // Record in CSV log
      setCsvRecords(prev => [
        {
          timestamp: new Date().toISOString(),
          x: Number(curX.toFixed(2)),
          y: Number(curY.toFixed(2)),
          targetX: destX,
          targetY: destY,
          obstacleDetected: isObs,
          status,
          irTriggered: isObs && distToObs < 20
        },
        ...prev.slice(0, 999)
      ]);
    }, 100);
  };

  // Download CSV File directly to PC
  const handleDownloadCsv = () => {
    if (csvRecords.length === 0) {
      // Create at least one baseline row
      const sampleRow: CsvRecord = {
        timestamp: new Date().toISOString(),
        x: robotPos.x,
        y: robotPos.y,
        targetX: pointB.x,
        targetY: pointB.y,
        obstacleDetected: false,
        status: 'READY',
        irTriggered: false
      };
      setCsvRecords([sampleRow]);
    }

    const header = ['Timestamp', 'X', 'Y', 'TargetX', 'TargetY', 'Obstacle_Detected', 'Status', 'IR_Triggered'];
    const rows = csvRecords.map(r => [
      `"${r.timestamp}"`,
      r.x,
      r.y,
      r.targetX,
      r.targetY,
      r.obstacleDetected ? 'TRUE' : 'FALSE',
      `"${r.status}"`,
      r.irTriggered ? 'TRUE' : 'FALSE'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `robot_trajectory_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Clear Canvas Trail & Reset
  const handleResetCanvas = () => {
    if (simTimerRef.current) clearInterval(simTimerRef.current);
    setIsNavigating(false);
    setIsSimulating(false);
    setRobotStatus('IDLE');
    setObstacleDetected(false);
    setRobotPos({ x: pointA.x, y: pointA.y });
    setTrail([{ x: pointA.x, y: pointA.y, obstacle: false }]);
  };

  // Render Canvas (Point A, Point B, Grid Lines, Robot, Trail)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Background
    ctx.fillStyle = isDarkMode ? '#0B1120' : '#F8FAFC';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = isDarkMode ? '#1E293B' : '#E2E8F0';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Direct trajectory guideline (dotted line between A and B)
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = isDarkMode ? '#475569' : '#94A3B8';
    ctx.lineWidth = 1.5;
    ctx.moveTo(pointA.x, pointA.y);
    ctx.lineTo(pointB.x, pointB.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Recorded Trajectory Trail
    if (trail.length > 1) {
      for (let i = 1; i < trail.length; i++) {
        const p1 = trail[i - 1];
        const p2 = trail[i];
        ctx.beginPath();
        ctx.strokeStyle = p2.obstacle ? '#EF4444' : '#3B82F6';
        ctx.lineWidth = p2.obstacle ? 3.5 : 2.5;
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    // Render Last Registered Obstacle Block on Canvas (if present)
    if (lastRegisteredBlock) {
      const bx = (lastRegisteredBlock.x / 32) * w + 9;
      const by = (lastRegisteredBlock.y / 20) * h + 9;
      ctx.save();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.fillRect(bx - 12, by - 12, 24, 24);
      ctx.strokeRect(bx - 12, by - 12, 24, 24);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('BLOCK', bx - 14, by + 3);
      ctx.restore();
    }

    // Point A (Start Point - Green)
    ctx.save();
    ctx.shadowColor = 'rgba(16, 185, 129, 0.4)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.arc(pointA.x, pointA.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = isDarkMode ? '#34D399' : '#065F46';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('Point A (Start)', pointA.x - 30, pointA.y - 14);
    ctx.restore();

    // Point B (Drop-off Point - Red)
    ctx.save();
    ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(pointB.x, pointB.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = isDarkMode ? '#F87171' : '#991B1B';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('Point B (Drop-off)', pointB.x - 38, pointB.y - 14);
    ctx.restore();

    // Obstacle radar ripple around robot if obstacle detected
    if (obstacleDetected) {
      ctx.save();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(robotPos.x, robotPos.y, 22, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('OBSTACLE!', robotPos.x - 28, robotPos.y + 26);
      ctx.restore();
    }

    // Robot Current Position (Blue AMR with Heading Arrow)
    ctx.save();
    ctx.shadowColor = 'rgba(37, 99, 235, 0.35)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#2563EB';
    ctx.beginPath();
    ctx.arc(robotPos.x, robotPos.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Heading indicator dot
    const headX = robotPos.x + Math.cos(robotHeading) * 12;
    const headY = robotPos.y + Math.sin(robotHeading) * 12;
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(robotPos.x, robotPos.y);
    ctx.lineTo(headX, headY);
    ctx.stroke();

    ctx.fillStyle = isDarkMode ? '#60A5FA' : '#1E3A8A';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('ESP32 AMR', robotPos.x - 24, robotPos.y - 13);
    ctx.restore();
  }, [pointA, pointB, robotPos, trail, obstacleDetected, robotHeading, isDarkMode, lastRegisteredBlock]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none overflow-y-auto">
      <div className={`w-full max-w-4xl rounded-[36px] border p-6 sm:p-8 flex flex-col gap-5 relative overflow-hidden transition-all max-h-[92vh] overflow-y-auto ${
        isDarkMode 
          ? 'bg-[#0F172A] border-slate-800 text-slate-100 shadow-[0_20px_70px_rgba(0,0,0,0.6)]' 
          : 'bg-white/98 border-white/80 text-slate-800 shadow-[0_20px_70px_rgba(0,0,0,0.14)]'
      }`}>
        
        {/* Decorative soft gradients */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-gradient-to-br from-sky-500/20 via-purple-500/10 to-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-gradient-to-tr from-amber-500/15 via-sky-500/10 to-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Pill Bar */}
        <div className="w-full flex items-center justify-between z-10 shrink-0">
          <div className={`flex items-center gap-2.5 px-4 py-1.5 rounded-full border text-xs font-semibold shadow-xs ${
            isDarkMode ? 'bg-slate-800/90 border-slate-700 text-slate-300' : 'bg-slate-100/90 border-slate-200/80 text-slate-600'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${wsConnected || isBlynkActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className={`font-mono text-[11px] uppercase tracking-wider ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>ESP32 Access Point &amp; Blynk Bridge</span>
            <span className="text-slate-500">•</span>
            <span className={`text-[11px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>SSID: ESP32-Car | IP: 192.168.4.1</span>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 ${
              isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200/80 text-slate-500 hover:text-slate-800'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Center Banner: EXACT MESSAGE REQUESTED FOR JUDGES */}
        <div className="flex flex-col items-center text-center gap-2.5 z-10 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-400 text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            Hardware Twin Live Interface
          </div>

          <h2 className={`font-display font-extrabold text-lg sm:text-xl tracking-tight leading-snug ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            connecting soon judges, we are making something crazy so its taking little more time, stay tuned!!!!!
          </h2>

          <p className={`text-xs font-sans max-w-lg leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Direct two-way ESP32 Access Point &amp; Blynk Cloud link. Set <strong>Point A (Start)</strong> &amp; <strong>Point B (Drop-off)</strong>, stream real-time ultrasonic sensor readings, auto-register sensed obstacles as blocks into the warehouse simulation, and export telemetry CSVs.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center justify-center gap-2 z-10">
          <button
            onClick={() => setActiveTab('MISSION')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'MISSION'
                ? isDarkMode ? 'bg-sky-500 text-white shadow-md' : 'bg-slate-900 text-white shadow-md'
                : isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Point A ➔ Point B Mission</span>
          </button>

          <button
            onClick={() => setActiveTab('BLYNK')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'BLYNK'
                ? isDarkMode ? 'bg-sky-500 text-white shadow-md' : 'bg-slate-900 text-white shadow-md'
                : isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Blynk V0 &amp; Sim Sync {isBlynkActive && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />}</span>
          </button>

          <button
            onClick={() => setActiveTab('MATRIX')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'MATRIX'
                ? isDarkMode ? 'bg-sky-500 text-white shadow-md' : 'bg-slate-900 text-white shadow-md'
                : isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>5×5 Matrix &amp; CSV Log ({csvRecords.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('FIRMWARE')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'FIRMWARE'
                ? isDarkMode ? 'bg-sky-500 text-white shadow-md' : 'bg-slate-900 text-white shadow-md'
                : isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Arduino C++ Firmware</span>
          </button>
        </div>

        {/* TAB 1: POINT A ➔ POINT B INTERACTIVE MISSION */}
        {activeTab === 'MISSION' && (
          <div className="flex flex-col gap-4 z-10">
            {/* Status & Control Pill Bar */}
            <div className={`flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border ${
              isDarkMode ? 'bg-[#1E293B]/80 border-slate-700/60' : 'bg-slate-50 border-slate-200/80'
            }`}>
              {/* Point Selection Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectionMode('A')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    selectionMode === 'A'
                      ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-300'
                      : isDarkMode ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-300" />
                  <span>1. Set Point A (Start)</span>
                </button>

                <button
                  onClick={() => setSelectionMode('B')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    selectionMode === 'B'
                      ? 'bg-rose-500 text-white shadow-sm ring-2 ring-rose-300'
                      : isDarkMode ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-300" />
                  <span>2. Set Point B (Drop-off)</span>
                </button>
              </div>

              {/* Real-time Status Badges */}
              <div className="flex items-center gap-2.5">
                <div className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-full border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <span className="text-slate-400">STATUS:</span>
                  <strong className={
                    robotStatus === 'NAVIGATING' ? 'text-blue-400' :
                    robotStatus === 'DETOURING' ? 'text-amber-400' :
                    robotStatus === 'REACHED GOAL' ? 'text-emerald-400' : 'text-slate-400'
                  }>
                    {robotStatus}
                  </strong>
                </div>

                <div className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-full border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <span className="text-slate-400">OBSTACLE:</span>
                  {obstacleDetected || irTriggered ? (
                    <span className="text-rose-500 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                      DETECTED!
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-bold">CLEAR</span>
                  )}
                </div>
              </div>
            </div>

            {/* Interactive 2D Grid Canvas */}
            <div className={`relative flex flex-col items-center rounded-2xl overflow-hidden border shadow-inner ${
              isDarkMode ? 'border-slate-700/80 bg-[#0B1120]' : 'border-slate-200 bg-white'
            }`}>
              <canvas
                ref={canvasRef}
                width={600}
                height={360}
                onClick={handleCanvasClick}
                className="w-full h-[280px] sm:h-[320px] cursor-crosshair block"
              />

              {/* Floating Helper Tip */}
              <div className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg border text-[10px] font-mono backdrop-blur-xs ${
                isDarkMode ? 'bg-slate-900/90 border-slate-700 text-slate-300' : 'bg-white/90 border-slate-200/80 text-slate-500'
              }`}>
                Active Mode: <strong className={selectionMode === 'A' ? 'text-emerald-400' : 'text-rose-400'}>Set Point {selectionMode}</strong> • Click anywhere to reposition
              </div>

              {/* Position & Obstacle Coordinates Readouts */}
              <div className={`w-full flex flex-wrap items-center justify-between px-4 py-2 border-t text-[11px] font-mono ${
                isDarkMode ? 'bg-[#1E293B]/90 border-slate-700/60 text-slate-300' : 'bg-slate-50/90 border-slate-200/70 text-slate-500'
              }`}>
                <span>Start A: ({pointA.x}, {pointA.y})</span>
                <span>AMR Pos: ({robotPos.x.toFixed(1)}, {robotPos.y.toFixed(1)}) → Grid [{toGridX(robotPos.x)}, {toGridY(robotPos.y)}]</span>
                <span>Drop-off B: ({pointB.x}, {pointB.y})</span>
                {lastRegisteredBlock ? (
                  <span className="text-rose-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-500" />
                    Block Registered: [{lastRegisteredBlock.x}, {lastRegisteredBlock.y}]
                  </span>
                ) : (
                  <span className="text-emerald-400 font-medium">Path Free</span>
                )}
              </div>
            </div>

            {/* Action Buttons: Start Drive, Stop, Register Sim Block, Download CSV, Reset */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleStartDrive}
                  disabled={isNavigating}
                  className="px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-xs tracking-wide shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Drive</span>
                </button>

                <button
                  onClick={handleStopDrive}
                  className="px-4 py-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs tracking-wide shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Stop / E-Brake</span>
                </button>

                <button
                  onClick={() => handleRegisterObstacleAtRobot(12.0)}
                  className="px-3.5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-sm"
                  title="Simulate Obstacle in front and register as block on Simulation Grid"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Register Sim Block</span>
                </button>

                <button
                  onClick={handleResetCanvas}
                  className={`px-3.5 py-2.5 rounded-full font-medium text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                    isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                  title="Reset positions and clear trajectory trail"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Trail</span>
                </button>
              </div>

              {/* CSV Downloader */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadCsv}
                  className="px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs tracking-wide shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download CSV Log</span>
                </button>
              </div>
            </div>

            {/* Wi-Fi Connection Bar & Helper */}
            <div className={`flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border text-xs ${
              isDarkMode ? 'bg-slate-800/60 border-slate-700/60 text-slate-300' : 'bg-slate-100/70 border-slate-200 text-slate-600'
            }`}>
              <div className="flex items-center gap-2">
                {wsConnected ? (
                  <Wifi className="w-4 h-4 text-emerald-400" />
                ) : (
                  <WifiOff className="w-4 h-4 text-slate-500" />
                )}
                <span className="font-mono text-[11px]">
                  {wsConnected ? 'Connected to ESP32-Car' : 'Offline / Standalone Simulator Active'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  onClick={() => { setWsUrl('ws://192.168.4.1/ws'); connectWebSocket(); }}
                  className={`px-2 py-0.5 rounded-md border cursor-pointer font-mono ${
                    isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ws://192.168.4.1/ws
                </button>
                <button
                  onClick={() => { setWsUrl('ws://localhost:5000/ws'); connectWebSocket(); }}
                  className={`px-2 py-0.5 rounded-md border cursor-pointer font-mono ${
                    isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ws://localhost:5000/ws
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BLYNK CLOUD V0 TELEMETRY & SIMULATION BLOCK REGISTRATION */}
        {activeTab === 'BLYNK' && (
          <div className="flex flex-col gap-4 z-10">
            {/* Blynk Cloud Connection Config */}
            <div className={`p-4 rounded-2xl border flex flex-col gap-3 ${
              isDarkMode ? 'bg-[#1E293B]/80 border-slate-700/60 text-slate-200' : 'bg-slate-50 border-slate-200/80 text-slate-700'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Blynk IoT Cloud Sensor Bridge</h3>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Streams live ultrasonic distance from Virtual Pin <strong>V0</strong> and registers obstacles as simulation blocks.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono px-3 py-1 rounded-full border ${
                    isBlynkActive 
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold'
                      : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
                  }`}>
                    {isBlynkActive ? 'POLLING BLYNK CLOUD (1s)' : 'STANDBY'}
                  </span>
                </div>
              </div>

              {/* Token Input & Connect Controls */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  type="text"
                  value={blynkToken}
                  onChange={(e) => setBlynkToken(e.target.value)}
                  placeholder="Paste Blynk Auth Token from Blynk App / Web Console..."
                  className={`flex-1 min-w-[260px] px-4 py-2 rounded-xl text-xs font-mono border focus:outline-hidden focus:ring-2 focus:ring-sky-500 ${
                    isDarkMode 
                      ? 'bg-[#0F172A] border-slate-700 text-slate-100 placeholder-slate-500' 
                      : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                  }`}
                />

                <button
                  onClick={() => setIsBlynkActive(prev => !prev)}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                    isBlynkActive
                      ? 'bg-rose-500 hover:bg-rose-600 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  }`}
                >
                  {isBlynkActive ? 'Stop Polling' : 'Connect Blynk V0'}
                </button>
              </div>

              {/* Status and quick test buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <span className={`font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Status: <strong>{blynkStatusMsg}</strong> {lastBlynkPollTime && `(${lastBlynkPollTime})`}
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">Quick Demo Test:</span>
                  <button
                    onClick={() => {
                      setBlynkDistanceCm(42.5);
                      setObstacleDetected(false);
                      setBlynkStatusMsg('Demo: 42.5 cm (Path Clear)');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] border cursor-pointer ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    Clear (42.5 cm)
                  </button>
                  <button
                    onClick={() => handleRegisterObstacleAtRobot(11.2)}
                    className="px-2.5 py-1 rounded-lg text-[11px] bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 font-bold cursor-pointer"
                  >
                    Simulate Obstacle (11.2 cm)
                  </button>
                </div>
              </div>
            </div>

            {/* Live Readouts Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Distance Gauge */}
              <div className={`p-4 rounded-2xl border flex flex-col gap-1.5 ${
                isDarkMode ? 'bg-[#1E293B]/70 border-slate-700/60' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[11px] uppercase tracking-wider font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Blynk V0 Ultrasonic Distance
                </span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-mono font-extrabold ${
                    blynkDistanceCm === null ? 'text-slate-400' :
                    blynkDistanceCm <= 18.0 ? 'text-rose-500 animate-pulse' : 'text-emerald-400'
                  }`}>
                    {blynkDistanceCm !== null ? blynkDistanceCm.toFixed(1) : '--'}
                  </span>
                  <span className="text-xs font-mono text-slate-400">cm</span>
                </div>
                <div className="text-[11px] font-mono mt-1">
                  {blynkDistanceCm === null ? (
                    <span className="text-slate-400">Waiting for data...</span>
                  ) : blynkDistanceCm <= 18.0 ? (
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Obstacle in front (&le; 18cm)
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-bold">Clear Corridor</span>
                  )}
                </div>
              </div>

              {/* Coordinates Translation */}
              <div className={`p-4 rounded-2xl border flex flex-col gap-1.5 ${
                isDarkMode ? 'bg-[#1E293B]/70 border-slate-700/60' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[11px] uppercase tracking-wider font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Live Coordinates Mapping
                </span>
                <div className="flex flex-col gap-1 text-xs font-mono mt-1">
                  <div>Hardware Robot: <strong>({robotPos.x.toFixed(1)}, {robotPos.y.toFixed(1)})</strong></div>
                  <div>Warehouse Grid: <strong className="text-sky-400">Cell [{toGridX(robotPos.x)}, {toGridY(robotPos.y)}]</strong></div>
                  <div>Drop-off Destination: <strong>Cell [{toGridX(pointB.x)}, {toGridY(pointB.y)}]</strong></div>
                </div>
              </div>

              {/* Simulation Block Registration */}
              <div className={`p-4 rounded-2xl border flex flex-col gap-1.5 ${
                isDarkMode ? 'bg-[#1E293B]/70 border-slate-700/60' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[11px] uppercase tracking-wider font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Simulation Block Registration
                </span>
                <div className="text-xs font-mono mt-1">
                  {lastRegisteredBlock ? (
                    <div className="flex flex-col gap-1 text-rose-400 font-bold">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Block Registered at [{lastRegisteredBlock.x}, {lastRegisteredBlock.y}]
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        Rendered on 2D/3D warehouse canvas &amp; swarm path replanned.
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400">No obstacle blocks registered yet. When distance &le; 18cm, block is automatically added.</span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 mt-auto">
                  <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRegisterObstacle}
                      onChange={(e) => setAutoRegisterObstacle(e.target.checked)}
                      className="rounded"
                    />
                    <span>Auto-Register to Grid</span>
                  </label>
                  <button
                    onClick={() => handleRegisterObstacleAtRobot(12.0)}
                    className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold cursor-pointer"
                  >
                    Register Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: 5x5 MATRIX & CSV LOG STREAM */}
        {activeTab === 'MATRIX' && (
          <div className="flex flex-col gap-5 z-10">
            {/* 5x5 Interactive Matrix Grid */}
            <div className="flex flex-col items-center gap-2">
              <div className={`p-4 rounded-[28px] border shadow-inner ${
                isDarkMode ? 'bg-[#1E293B]/80 border-slate-700/60' : 'bg-slate-50/90 border-slate-200/70'
              }`}>
                <div className="grid grid-cols-5 gap-2.5 sm:gap-3">
                  {Array.from({ length: 25 }).map((_, idx) => {
                    const x = idx % 5;
                    const y = Math.floor(idx / 5);
                    const isCenter = x === 2 && y === 2;
                    const isScanning = scanTick === idx;
                    const isSelected = activeCell.x === x && activeCell.y === y;

                    return (
                      <button
                        key={idx}
                        onClick={() => setActiveCell({ x, y })}
                        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 font-mono text-[10px] relative cursor-pointer active:scale-90 ${
                          isCenter
                            ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white font-bold shadow-md shadow-sky-500/30 border border-sky-400 scale-105'
                            : isScanning
                            ? 'bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/30 scale-105 border border-emerald-400'
                            : isSelected
                            ? isDarkMode ? 'bg-purple-900/60 border-2 border-purple-400 text-purple-200 font-bold' : 'bg-purple-100 border-2 border-purple-400 text-purple-800 font-bold'
                            : isDarkMode ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-100 shadow-xs' : 'bg-white hover:bg-slate-100/90 border border-slate-200/80 text-slate-500 hover:text-slate-800 shadow-xs'
                        }`}
                      >
                        <span>{x},{y}</span>
                        {isCenter && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping absolute -top-1 -right-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={`flex items-center gap-2 text-xs font-mono mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Selected Probe Node: <strong className={isDarkMode ? 'text-slate-100' : 'text-slate-800'}>({activeCell.x}, {activeCell.y})</strong> • 20 Hz Wi-Fi Sweep</span>
              </div>
            </div>

            {/* CSV Telemetry Stream Table */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold flex items-center gap-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                  Recent Telemetry Log Stream ({csvRecords.length} rows)
                </span>
                <button
                  onClick={handleDownloadCsv}
                  className="px-3 py-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>

              <div className={`max-h-48 overflow-y-auto rounded-xl border font-mono text-[11px] ${
                isDarkMode ? 'bg-[#1E293B]/70 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
              }`}>
                <table className="w-full text-left">
                  <thead className={`border-b sticky top-0 ${
                    isDarkMode ? 'bg-slate-800/90 text-slate-400 border-slate-700' : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}>
                    <tr>
                      <th className="p-2">Timestamp</th>
                      <th className="p-2">X</th>
                      <th className="p-2">Y</th>
                      <th className="p-2">Target</th>
                      <th className="p-2">Obstacle</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                    {csvRecords.slice(0, 15).map((row, idx) => (
                      <tr key={idx} className={isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
                        <td className="p-2 text-slate-500">{row.timestamp.split('T')[1]?.slice(0, 11)}</td>
                        <td className="p-2 font-bold">{row.x}</td>
                        <td className="p-2 font-bold">{row.y}</td>
                        <td className="p-2 text-slate-400">({row.targetX}, {row.targetY})</td>
                        <td className="p-2">
                          {row.obstacleDetected ? (
                            <span className="text-rose-400 font-bold">TRUE</span>
                          ) : (
                            <span className="text-slate-500">FALSE</span>
                          )}
                        </td>
                        <td className="p-2">{row.status}</td>
                      </tr>
                    ))}
                    {csvRecords.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-500">
                          No trajectory records yet. Tap 'Start Drive' in the Mission tab to record live telemetry!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ARDUINO C++ FIRMWARE CODE & SETUP */}
        {activeTab === 'FIRMWARE' && (
          <div className="flex flex-col gap-4 z-10">
            {/* Step-by-Step Connection Instructions */}
            <div className={`p-4 rounded-2xl border text-xs flex flex-col gap-2 ${
              isDarkMode ? 'bg-[#1E293B]/80 border-slate-700/60 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <h4 className={`font-bold text-sm flex items-center gap-1.5 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ESP32 Hardware Execution Steps
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                <li><strong>Flash ESP32</strong>: Install libraries (<code>ESPAsyncWebServer</code>, <code>AsyncTCP</code>, <code>ArduinoJson</code>, <code>ESP32Servo</code>) and flash the sketch below.</li>
                <li><strong>Connect PC Wi-Fi</strong>: Join Wi-Fi network <strong><code>ESP32-Car</code></strong> (Password: <code>12345678Password</code>).</li>
                <li><strong>Open Mission Tab</strong>: Click <em>1. Set Point A</em> to choose starting position, and <em>2. Set Point B</em> to set destination.</li>
                <li><strong>Start Navigation</strong>: Click <em>Start Drive</em>. The ESP32 moves towards Point B and executes detour evasions if obstacles are encountered.</li>
                <li><strong>Download CSV</strong>: Click <em>Download CSV Log</em> to save the live trajectory telemetry file directly to your PC.</li>
              </ol>
            </div>

            {/* Hardware Pinout Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-[#1E293B]/70 border-slate-700/60' : 'bg-white border-slate-200'}`}>
                <span className="text-slate-500 text-[10px] block">TRIG PIN</span>
                <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>GPIO 5</strong>
              </div>
              <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-[#1E293B]/70 border-slate-700/60' : 'bg-white border-slate-200'}`}>
                <span className="text-slate-500 text-[10px] block">ECHO PIN</span>
                <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>GPIO 18</strong>
              </div>
              <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-[#1E293B]/70 border-slate-700/60' : 'bg-white border-slate-200'}`}>
                <span className="text-slate-500 text-[10px] block">IR PIN</span>
                <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>GPIO 4</strong>
              </div>
              <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-[#1E293B]/70 border-slate-700/60' : 'bg-white border-slate-200'}`}>
                <span className="text-slate-500 text-[10px] block">LEFT / RIGHT MOTORS</span>
                <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>GPIO 12 / 13</strong>
              </div>
            </div>

            {/* Sketch Code Box */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  firmware/esp32_access_point_car/esp32_access_point_car.ino
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(ESP32_SKETCH_CODE);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                    isDarkMode ? 'bg-sky-600 hover:bg-sky-500 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied to Clipboard!' : 'Copy Arduino Sketch'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed border border-slate-800">
                <code>{ESP32_SKETCH_CODE}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Bottom Close Action */}
        <div className="z-10 w-full flex items-center justify-center pt-1 shrink-0">
          <button
            onClick={onClose}
            className={`px-6 py-2 rounded-full font-semibold text-xs transition-all shadow-xs active:scale-95 cursor-pointer ${
              isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Close Hardware Console
          </button>
        </div>

      </div>
    </div>
  );
};
