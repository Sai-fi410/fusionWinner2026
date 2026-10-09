/*
 * =========================================================================================
 * FUSIONISTIC (IOT-04) — ESP32 WAREHOUSE SWARM ROBOT FIRMWARE
 * Organization: Amazon Robotics Hackathon Problem Statement
 * 
 * Hardware Architecture:
 * - Microcontroller: ESP32 Dev Module (WROOM-32)
 * - Drive System: 2x DC Gear Motors with Differential Steering (L298N / TB6612FNG)
 * - Obstacle Sensor: HC-SR04 Ultrasonic Distance Sensor
 * - Scanner Actuator: SG90 Micro Servo (Sweeping 45° -> 90° -> 135°)
 * - Connectivity: Full-Duplex WebSockets over Wi-Fi (ws://<SERVER_IP>:5000/ws)
 * 
 * Required Arduino Libraries:
 * 1. WebSockets by Markus Sattler (install via Library Manager: "WebSockets")
 * 2. ArduinoJson by Benoit Blanchon (version 6.x or 7.x)
 * 3. ESP32Servo by Kevin Harrington (install via Library Manager: "ESP32Servo")
 * =========================================================================================
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>

// =========================================================================================
// 1. NETWORK & BACKEND CONFIGURATION (EDIT THESE FOR YOUR ROUTER & PC)
// =========================================================================================
const char* WIFI_SSID     = "YOUR_WIFI_NAME";        // Replace with your Wi-Fi SSID
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";    // Replace with your Wi-Fi Password

// Your Computer's Local IP Address running the Fusionistic backend (e.g. 192.168.1.100)
// Run `ipconfig` on Windows command prompt to see your IPv4 address
const char* WS_SERVER_HOST = "192.168.1.100";
const int   WS_SERVER_PORT = 5000;
const char* WS_SERVER_PATH = "/ws";

const char* ROBOT_ID = "FUS-HW-01";

// =========================================================================================
// 2. PIN ASSIGNMENTS (ESP32 GPIOs)
// =========================================================================================

// --- Motor Driver Pins (L298N / TB6612) ---
#define MOTOR_LEFT_ENA   13  // Speed PWM Left
#define MOTOR_LEFT_IN1   12  // Direction Left 1
#define MOTOR_LEFT_IN2   14  // Direction Left 2

#define MOTOR_RIGHT_ENB  25  // Speed PWM Right
#define MOTOR_RIGHT_IN3  27  // Direction Right 1
#define MOTOR_RIGHT_IN4  26  // Direction Right 2

// --- Ultrasonic Sensor (HC-SR04) ---
#define ULTRASONIC_TRIG  32
#define ULTRASONIC_ECHO  35  // Input only on ESP32

// --- Servo Motor (SG90) ---
#define SERVO_PIN        33

// =========================================================================================
// 3. GLOBAL OBJECTS & STATE
// =========================================================================================
WebSocketsClient webSocket;
Servo scanServo;

int currentServoAngle = 90;
int servoDirection = 1; // 1 for sweeping right, -1 for left
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 300; // 3.3 Hz update rate

bool isExecutingCommand = false;
unsigned long commandEndTime = 0;

// =========================================================================================
// 4. MOTOR CONTROL FUNCTIONS
// =========================================================================================

void setupMotors() {
  pinMode(MOTOR_LEFT_ENA, OUTPUT);
  pinMode(MOTOR_LEFT_IN1, OUTPUT);
  pinMode(MOTOR_LEFT_IN2, OUTPUT);
  
  pinMode(MOTOR_RIGHT_ENB, OUTPUT);
  pinMode(MOTOR_RIGHT_IN3, OUTPUT);
  pinMode(MOTOR_RIGHT_IN4, OUTPUT);

  // Set default state to STOP
  stopMotors();
}

void driveForward(int speed) {
  speed = constrain(speed, 0, 255);
  // Left Motor Forward
  digitalWrite(MOTOR_LEFT_IN1, HIGH);
  digitalWrite(MOTOR_LEFT_IN2, LOW);
  analogWrite(MOTOR_LEFT_ENA, speed);

  // Right Motor Forward
  digitalWrite(MOTOR_RIGHT_IN3, HIGH);
  digitalWrite(MOTOR_RIGHT_IN4, LOW);
  analogWrite(MOTOR_RIGHT_ENB, speed);
}

void driveBackward(int speed) {
  speed = constrain(speed, 0, 255);
  // Left Motor Backward
  digitalWrite(MOTOR_LEFT_IN1, LOW);
  digitalWrite(MOTOR_LEFT_IN2, HIGH);
  analogWrite(MOTOR_LEFT_ENA, speed);

  // Right Motor Backward
  digitalWrite(MOTOR_RIGHT_IN3, LOW);
  digitalWrite(MOTOR_RIGHT_IN4, HIGH);
  analogWrite(MOTOR_RIGHT_ENB, speed);
}

void turnLeft(int speed) {
  speed = constrain(speed, 0, 255);
  // Left Motor Reverse, Right Motor Forward (Pivoting in place)
  digitalWrite(MOTOR_LEFT_IN1, LOW);
  digitalWrite(MOTOR_LEFT_IN2, HIGH);
  analogWrite(MOTOR_LEFT_ENA, speed);

  digitalWrite(MOTOR_RIGHT_IN3, HIGH);
  digitalWrite(MOTOR_RIGHT_IN4, LOW);
  analogWrite(MOTOR_RIGHT_ENB, speed);
}

void turnRight(int speed) {
  speed = constrain(speed, 0, 255);
  // Left Motor Forward, Right Motor Reverse (Pivoting in place)
  digitalWrite(MOTOR_LEFT_IN1, HIGH);
  digitalWrite(MOTOR_LEFT_IN2, LOW);
  analogWrite(MOTOR_LEFT_ENA, speed);

  digitalWrite(MOTOR_RIGHT_IN3, LOW);
  digitalWrite(MOTOR_RIGHT_IN4, HIGH);
  analogWrite(MOTOR_RIGHT_ENB, speed);
}

void stopMotors() {
  digitalWrite(MOTOR_LEFT_IN1, LOW);
  digitalWrite(MOTOR_LEFT_IN2, LOW);
  analogWrite(MOTOR_LEFT_ENA, 0);

  digitalWrite(MOTOR_RIGHT_IN3, LOW);
  digitalWrite(MOTOR_RIGHT_IN4, LOW);
  analogWrite(MOTOR_RIGHT_ENB, 0);
}

// =========================================================================================
// 5. ULTRASONIC SENSOR & SERVO SWEEP
// =========================================================================================

void setupSensors() {
  pinMode(ULTRASONIC_TRIG, OUTPUT);
  pinMode(ULTRASONIC_ECHO, INPUT);
  digitalWrite(ULTRASONIC_TRIG, LOW);

  // Initialize Servo
  scanServo.setPeriodHertz(50); // standard 50hz servo
  scanServo.attach(SERVO_PIN, 500, 2400); // us pulses
  scanServo.write(currentServoAngle);
}

/**
 * Reads distance from HC-SR04 in centimeters with timeout
 */
float readUltrasonicDistanceCm() {
  digitalWrite(ULTRASONIC_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(ULTRASONIC_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(ULTRASONIC_TRIG, LOW);

  // Read pulse echo (timeout after 25ms ~ 400cm)
  long duration = pulseIn(ULTRASONIC_ECHO, HIGH, 25000);
  if (duration == 0) {
    return 999.0; // Out of range or no obstacle
  }

  // Speed of sound: 343 m/s = 0.0343 cm/microsecond
  float distanceCm = (duration * 0.0343) / 2.0;
  return distanceCm;
}

/**
 * Sweeps servo between Left (45°), Center (90°), and Right (135°)
 */
void updateServoSweep() {
  if (currentServoAngle >= 135) {
    servoDirection = -1;
  } else if (currentServoAngle <= 45) {
    servoDirection = 1;
  }
  currentServoAngle += (servoDirection * 45);
  scanServo.write(currentServoAngle);
}

// =========================================================================================
// 6. WEBSOCKET TWO-WAY EVENT HANDLER
// =========================================================================================

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected from Fusionistic Server.");
      stopMotors();
      break;

    case WStype_CONNECTED:
      Serial.printf("[WS] Connected to Server at %s:%d%s\n", WS_SERVER_HOST, WS_SERVER_PORT, WS_SERVER_PATH);
      
      // Register with backend
      {
        StaticJsonDocument<200> regDoc;
        regDoc["role"] = "ESP32";
        regDoc["robotId"] = ROBOT_ID;
        regDoc["firmware"] = "v2.0-esp32-swarm";
        String regStr;
        serializeJson(regDoc, regStr);
        webSocket.sendTXT(regStr);
      }
      break;

    case WStype_TEXT:
      {
        // Parse JSON command from server
        StaticJsonDocument<384> doc;
        DeserializationError error = deserializeJson(doc, payload);
        if (error) {
          Serial.print("[WS] JSON Deserialization failed: ");
          Serial.println(error.f_str());
          return;
        }

        const char* cmd = doc["cmd"] | "STOP";
        int speed = doc["speed"] | 180;
        int durationMs = doc["durationMs"] | 600;

        Serial.printf("[COMMAND RECEIVED] -> %s | Speed: %d | Duration: %d ms\n", cmd, speed, durationMs);

        // Execute Motion Command
        if (strcmp(cmd, "MOVE_FORWARD") == 0) {
          driveForward(speed);
        } else if (strcmp(cmd, "TURN_LEFT") == 0) {
          turnLeft(speed);
        } else if (strcmp(cmd, "TURN_RIGHT") == 0) {
          turnRight(speed);
        } else if (strcmp(cmd, "TURN_AROUND") == 0) {
          turnRight(speed);
        } else if (strcmp(cmd, "STOP") == 0) {
          stopMotors();
          isExecutingCommand = false;
          return;
        }

        // Schedule timed stop after durationMs
        if (durationMs > 0) {
          isExecutingCommand = true;
          commandEndTime = millis() + durationMs;
        } else {
          isExecutingCommand = false;
        }
      }
      break;

    case WStype_BIN:
    case WStype_ERROR:
      break;
  }
}

// =========================================================================================
// 7. SETUP & MAIN LOOP
// =========================================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n--- FUSIONISTIC ESP32 HARDWARE TWIN INITIALIZING ---");

  setupMotors();
  setupSensors();

  // Connect to Wi-Fi
  Serial.printf("Connecting to Wi-Fi: %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected successfully!");
    Serial.print("[WiFi] IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WiFi] Connection failed! Running in offline sensor diagnostic mode.");
  }

  // Initialize WebSocket Client
  webSocket.begin(WS_SERVER_HOST, WS_SERVER_PORT, WS_SERVER_PATH);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(2000); // Reconnect every 2 seconds if disconnected
}

void loop() {
  webSocket.loop();

  // 1. Check if current timed motion command has elapsed
  if (isExecutingCommand && millis() >= commandEndTime) {
    stopMotors();
    isExecutingCommand = false;
  }

  // 2. Hardware Emergency Failsafe:
  // If sensor is pointing forward and detects an obstacle within 10 cm, immediately halt!
  if (currentServoAngle == 90) {
    float immediateDist = readUltrasonicDistanceCm();
    if (immediateDist > 0.5 && immediateDist < 10.0) {
      stopMotors();
      isExecutingCommand = false;
      Serial.printf("🛑 [HARDWARE EMERGENCY STOP] Obstacle detected at %.1f cm!\n", immediateDist);
    }
  }

  // 3. Periodic Sensor Scan and Telemetry Broadcast to Backend
  unsigned long now = millis();
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = now;

    // Sweep servo
    updateServoSweep();
    delay(40); // Settle servo

    // Read distance
    float distanceCm = readUltrasonicDistanceCm();

    // Send Telemetry JSON to Fusionistic Server
    StaticJsonDocument<256> telemetryDoc;
    telemetryDoc["type"] = "TELEMETRY";
    telemetryDoc["robotId"] = ROBOT_ID;
    telemetryDoc["ultrasonicDistanceCm"] = distanceCm;
    telemetryDoc["servoAngle"] = currentServoAngle;
    telemetryDoc["battery"] = 96.0; // Battery ADC can be wired to GPIO34
    telemetryDoc["timestamp"] = now;

    String jsonStr;
    serializeJson(telemetryDoc, jsonStr);
    webSocket.sendTXT(jsonStr);

    Serial.printf("[TELEMETRY SENT] Dist: %.1f cm | Servo: %d deg\n", distanceCm, currentServoAngle);
  }
}
