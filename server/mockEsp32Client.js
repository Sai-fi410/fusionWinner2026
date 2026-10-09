/**
 * Mock ESP32 Hardware Simulator Client
 * Simulates a real ESP32 microcontroller with 2 gear motors, an ultrasonic HC-SR04,
 * and a sweeping SG90 servo motor.
 * 
 * Run with: node server/mockEsp32Client.js
 */

import { WebSocket } from 'ws';

const SERVER_URL = process.env.WS_URL || 'ws://localhost:5000/ws';

console.log(`[Mock ESP32] Connecting to Fusionistic Backend at ${SERVER_URL}...`);

const ws = new WebSocket(SERVER_URL);

let stepIndex = 0;
let servoAngle = 90;
let servoDir = 1; // 1 for sweeping right, -1 for left
let simBattery = 98.4;
let obstacleEncounterTick = 7; // At step 7, simulate an obstacle 10cm ahead
let obstacleClearTick = 12;

ws.on('open', () => {
  console.log(`\n======================================================`);
  console.log(`🤖 MOCK ESP32 CLIENT CONNECTED OVER WEBSOCKET`);
  console.log(`======================================================`);

  // Register identity with backend
  ws.send(JSON.stringify({
    role: 'ESP32',
    robotId: 'FUS-HW-01',
    firmwareVersion: 'v2.1-esp32-hwtwin',
    hardware: {
      motors: '2x DC Gear Motors (L298N)',
      sensor: 'HC-SR04 Ultrasonic on SG90 Servo',
      mcu: 'ESP32-WROOM-32'
    }
  }));

  // Start periodic sensor telemetry loop (every 300ms)
  const timer = setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) {
      clearInterval(timer);
      return;
    }

    stepIndex++;

    // 1. Simulate Servo Sweep (45° -> 90° -> 135° -> 90° -> 45°)
    if (servoAngle >= 135) servoDir = -1;
    else if (servoAngle <= 45) servoDir = 1;
    servoAngle += (servoDir * 45);

    // 2. Simulate Ultrasonic Distance Sensor
    let ultrasonicCm = 150.0 + (Math.random() * 20.0); // Normal open corridor

    // Inject physical obstacle ahead at specific steps to test re-routing
    if (stepIndex >= obstacleEncounterTick && stepIndex <= obstacleClearTick) {
      if (servoAngle === 90) {
        ultrasonicCm = 11.4; // OBSTACLE DETECTED! (<18cm)
        console.log(`🚨 [Mock ESP32] Simulating Physical Obstacle! Distance: ${ultrasonicCm.toFixed(1)}cm ahead!`);
      } else {
        ultrasonicCm = 14.8;
      }
    }

    // Battery slow drain
    simBattery = Math.max(10, simBattery - 0.02);

    // Package telemetry packet
    const telemetryPacket = {
      type: 'TELEMETRY',
      robotId: 'FUS-HW-01',
      ultrasonicDistanceCm: Number(ultrasonicCm.toFixed(1)),
      servoAngle,
      battery: Number(simBattery.toFixed(1)),
      timestamp: Date.now()
    };

    console.log(`📤 [ESP32 -> Backend] Telemetry Sent: Dist=${telemetryPacket.ultrasonicDistanceCm}cm | Servo=${servoAngle}°`);
    ws.send(JSON.stringify(telemetryPacket));

  }, 350);
});

ws.on('message', (data) => {
  try {
    const response = JSON.parse(data.toString());
    if (response.type === 'COMMAND') {
      console.log(`📥 [Backend -> ESP32] Motor Command Received: [${response.cmd}] | Speed: ${response.speed} PWM | Duration: ${response.durationMs}ms | Target: (${response.nextX}, ${response.nextY})`);
      
      if (response.cmd === 'STOP' && response.pathRemaining === 0) {
        console.log(`\n🎉 [Mock ESP32] Mission Finished! Successfully reached dropoff bay!\n`);
      }
    }
  } catch (err) {
    console.error('[Mock ESP32] Error parsing server message:', err);
  }
});

ws.on('close', () => {
  console.log('[Mock ESP32] Connection closed.');
});

ws.on('error', (err) => {
  console.error('[Mock ESP32] Connection error:', err.message);
  console.log('Tip: Ensure the backend server is running (`npm run server`) before starting the mock client.');
});
