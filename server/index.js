import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import os from 'os';
import { CsvLogger } from './csvLogger.js';
import { NavigationEngine } from './navigationEngine.js';

const PORT = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Initialize Singletons
const csvLogger = new CsvLogger();
const navEngine = new NavigationEngine();

// Connected Client Tracking
let esp32Socket = null;
const frontendSockets = new Set();

/**
 * Utility: Get local LAN IP addresses (so user knows what IP to flash into ESP32)
 */
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ interface: name, ip: iface.address });
      }
    }
  }
  return addresses;
}

// -------------------------------------------------------------
// REST API ENDPOINTS
// -------------------------------------------------------------

// 1. Health & Status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ONLINE',
    esp32Connected: esp32Socket !== null && esp32Socket.readyState === WebSocket.OPEN,
    frontendClientsCount: frontendSockets.size,
    robotState: navEngine.getState(),
    localIps: getLocalIpAddresses(),
    csvPath: csvLogger.getFilePath()
  });
});

// 2. Download CSV Telemetry Log
app.get('/api/telemetry/csv', (req, res) => {
  const filePath = csvLogger.getFilePath();
  res.download(filePath, 'hardware_telemetry.csv', (err) => {
    if (err) {
      console.error('[Server] Error downloading CSV:', err);
      res.status(500).json({ error: 'Failed to download CSV' });
    }
  });
});

// 3. Get Recent Telemetry Log Rows (JSON)
app.get('/api/telemetry/recent', (req, res) => {
  const limit = parseInt(req.query.limit || '50', 10);
  const rows = csvLogger.getRecentLogs(limit);
  res.json({
    totalRows: rows.length,
    rows
  });
});

// 4. Reset / Clear CSV Log
app.post('/api/telemetry/reset-csv', (req, res) => {
  const result = csvLogger.resetLog();
  // Broadcast reset event to frontend
  broadcastToFrontends({ type: 'CSV_RESET' });
  res.json(result);
});

// 5. REST Telemetry Ingestion (Alternative to WebSocket for Hardware Team)
app.post('/api/telemetry', (req, res) => {
  const t0 = performance.now();
  const data = req.body; // { robotId, ultrasonicDistanceCm, servoAngle, battery, ... }

  // Process through navigation engine
  const command = navEngine.processTelemetry(data);
  const latencyMs = performance.now() - t0;

  // Log to CSV
  const loggedRow = csvLogger.logTelemetry({
    timestamp: Date.now(),
    robotId: data.robotId || 'FUS-HW-01',
    x: navEngine.x,
    y: navEngine.y,
    heading: navEngine.heading,
    ultrasonicDistanceCm: data.ultrasonicDistanceCm ?? data.dist ?? 999,
    servoAngle: data.servoAngle ?? data.servo ?? 90,
    obstacleDetected: navEngine.obstacleDetected,
    targetX: navEngine.currentTarget.x,
    targetY: navEngine.currentTarget.y,
    taskState: navEngine.missionState,
    motorLeftPwm: navEngine.motorLeftPwm,
    motorRightPwm: navEngine.motorRightPwm,
    commandIssued: command.cmd,
    latencyMs
  });

  // Broadcast to frontend
  broadcastToFrontends({
    type: 'HARDWARE_UPDATE',
    robotState: navEngine.getState(),
    csvRow: loggedRow,
    command
  });

  // Return command immediately to ESP32 HTTP client
  res.json({
    success: true,
    command,
    robotState: navEngine.getState(),
    latencyMs
  });
});

// 6. Manual Override Commands
app.post('/api/hardware/command', (req, res) => {
  const { command, speed = 180, durationMs = 500 } = req.body;

  const payload = {
    type: 'COMMAND',
    cmd: command,
    speed,
    durationMs,
    timestamp: Date.now()
  };

  // Send to ESP32 if connected
  if (esp32Socket && esp32Socket.readyState === WebSocket.OPEN) {
    esp32Socket.send(JSON.stringify(payload));
  }

  // Update engine if simulated
  if (command === 'STOP') {
    navEngine.motorLeftPwm = 0;
    navEngine.motorRightPwm = 0;
  }

  // Log manual action in CSV
  csvLogger.logTelemetry({
    timestamp: Date.now(),
    robotId: navEngine.robotId,
    x: navEngine.x,
    y: navEngine.y,
    heading: navEngine.heading,
    ultrasonicDistanceCm: navEngine.lastUltrasonicCm,
    servoAngle: navEngine.lastServoAngle,
    obstacleDetected: navEngine.obstacleDetected,
    targetX: navEngine.currentTarget.x,
    targetY: navEngine.currentTarget.y,
    taskState: 'MANUAL_OVERRIDE',
    motorLeftPwm: command === 'STOP' ? 0 : speed,
    motorRightPwm: command === 'STOP' ? 0 : speed,
    commandIssued: `MANUAL_${command}`,
    latencyMs: 1.0
  });

  broadcastToFrontends({
    type: 'MANUAL_COMMAND_ISSUED',
    command: payload,
    robotState: navEngine.getState()
  });

  res.json({ success: true, command: payload });
});

// 7. Set Custom Mission Targets (Pick & Dropoff)
app.post('/api/hardware/set-targets', (req, res) => {
  const { pickup, dropoff } = req.body;
  navEngine.setTargets(pickup, dropoff);

  broadcastToFrontends({
    type: 'TARGETS_UPDATED',
    robotState: navEngine.getState()
  });

  res.json({ success: true, robotState: navEngine.getState() });
});

// 8. Reset Robot Coordinate
app.post('/api/hardware/reset-position', (req, res) => {
  const { x = 1, y = 3, heading = 0 } = req.body;
  navEngine.resetPosition(x, y, heading);

  broadcastToFrontends({
    type: 'POSITION_RESET',
    robotState: navEngine.getState()
  });

  res.json({ success: true, robotState: navEngine.getState() });
});

// 9. Inject Test Obstacle (For Debugging Without Hardware)
app.post('/api/hardware/inject-obstacle', (req, res) => {
  const front = navEngine.getFrontCell(1);
  const cellKey = `${front.x},${front.y}`;
  navEngine.blockedObstacles.add(cellKey);
  navEngine.obstacleDetected = true;
  navEngine.missionState = 'OBSTACLE_AVOIDING';
  navEngine.recalculatePath();

  csvLogger.logTelemetry({
    timestamp: Date.now(),
    robotId: navEngine.robotId,
    x: navEngine.x,
    y: navEngine.y,
    heading: navEngine.heading,
    ultrasonicDistanceCm: 12.0,
    servoAngle: 90,
    obstacleDetected: true,
    targetX: navEngine.currentTarget.x,
    targetY: navEngine.currentTarget.y,
    taskState: 'OBSTACLE_AVOIDING',
    motorLeftPwm: 0,
    motorRightPwm: 0,
    commandIssued: 'OBSTACLE_INJECTED',
    latencyMs: 1.0
  });

  broadcastToFrontends({
    type: 'OBSTACLE_INJECTED',
    obstacle: front,
    robotState: navEngine.getState()
  });

  res.json({ success: true, obstacle: front, robotState: navEngine.getState() });
});

// -------------------------------------------------------------
// WEBSOCKET TWO-WAY REAL-TIME COMMUNICATION
// -------------------------------------------------------------

function broadcastToFrontends(payload) {
  const messageStr = JSON.stringify(payload);
  for (const client of frontendSockets) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  }
}

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`[WebSocket] New client connection from: ${clientIp}`);

  // Send initial state upon connect
  ws.send(JSON.stringify({
    type: 'INIT_STATE',
    robotState: navEngine.getState(),
    recentCsvRows: csvLogger.getRecentLogs(20)
  }));

  ws.on('message', (messageBuffer) => {
    try {
      const msg = JSON.parse(messageBuffer.toString());

      // 1. Client Identification
      if (msg.role === 'ESP32' || msg.client === 'ESP32') {
        esp32Socket = ws;
        console.log(`[WebSocket] Registered ESP32 Hardware Robot: ${msg.robotId || 'FUS-HW-01'}`);
        broadcastToFrontends({ type: 'ESP32_STATUS', connected: true });
        return;
      }

      if (msg.role === 'FRONTEND') {
        frontendSockets.add(ws);
        return;
      }

      // 2. Incoming ESP32 Sensor Telemetry
      if (msg.type === 'TELEMETRY' || msg.ultrasonicDistanceCm !== undefined || msg.dist !== undefined) {
        const t0 = performance.now();
        esp32Socket = ws; // Mark as ESP32

        // Run navigation decision loop
        const command = navEngine.processTelemetry(msg);
        const latencyMs = performance.now() - t0;

        // Structured CSV Logging
        const loggedRow = csvLogger.logTelemetry({
          timestamp: Date.now(),
          robotId: msg.robotId || navEngine.robotId,
          x: navEngine.x,
          y: navEngine.y,
          heading: navEngine.heading,
          ultrasonicDistanceCm: msg.ultrasonicDistanceCm ?? msg.dist ?? 999,
          servoAngle: msg.servoAngle ?? msg.servo ?? 90,
          obstacleDetected: navEngine.obstacleDetected,
          targetX: navEngine.currentTarget.x,
          targetY: navEngine.currentTarget.y,
          taskState: navEngine.missionState,
          motorLeftPwm: navEngine.motorLeftPwm,
          motorRightPwm: navEngine.motorRightPwm,
          commandIssued: command.cmd,
          latencyMs
        });

        // 3. IMMEDIATE TWO-WAY REPLY TO ESP32
        const responsePayload = {
          type: 'COMMAND',
          cmd: command.cmd,
          speed: command.speed ?? 180,
          durationMs: command.durationMs ?? 600,
          heading: navEngine.heading,
          nextX: navEngine.x,
          nextY: navEngine.y,
          pathRemaining: navEngine.currentPath.length,
          obstacleDetected: navEngine.obstacleDetected,
          latencyMs
        };

        ws.send(JSON.stringify(responsePayload));

        // 4. Real-time broadcast to all web frontend clients
        broadcastToFrontends({
          type: 'HARDWARE_UPDATE',
          robotState: navEngine.getState(),
          csvRow: loggedRow,
          command: responsePayload
        });
      }

      // 5. Frontend Command Forwarding
      if (msg.type === 'FRONTEND_COMMAND' && msg.command) {
        if (esp32Socket && esp32Socket.readyState === WebSocket.OPEN) {
          esp32Socket.send(JSON.stringify(msg.command));
        }
      }
    } catch (err) {
      console.error('[WebSocket] Error handling message:', err);
    }
  });

  ws.on('close', () => {
    if (ws === esp32Socket) {
      console.log('[WebSocket] ESP32 disconnected.');
      esp32Socket = null;
      broadcastToFrontends({ type: 'ESP32_STATUS', connected: false });
    }
    frontendSockets.delete(ws);
  });
});

// Start listening
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 FUSIONISTIC HARDWARE BRIDGE SERVER RUNNING ON PORT ${PORT}`);
  console.log(`======================================================`);
  console.log(`Local Web API:     http://localhost:${PORT}`);
  console.log(`WebSocket Stream:  ws://localhost:${PORT}/ws`);
  console.log(`CSV Telemetry:     ${csvLogger.getFilePath()}`);
  console.log(`\n📡 Available Network Interfaces for ESP32 Wi-Fi Config:`);
  const ips = getLocalIpAddresses();
  if (ips.length === 0) {
    console.log(`   (No active external Wi-Fi / Ethernet adapter detected)`);
  } else {
    ips.forEach(i => console.log(`   • [${i.interface}] -> http://${i.ip}:${PORT}`));
  }
  console.log(`======================================================\n`);
});
