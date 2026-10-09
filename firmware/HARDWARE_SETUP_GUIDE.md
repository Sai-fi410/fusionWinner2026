# Fusionistic (IOT-04) — ESP32 Hardware Twin Setup & Wiring Guide

This document details the complete hardware-to-backend integration pipeline for the physical warehouse robot, including wiring pinouts, Arduino IDE library installation, motor calibration, and two-way testing instructions.

---

## 1. Hardware Bill of Materials (BOM)

| Component | Quantity | Purpose |
| :--- | :---: | :--- |
| **ESP32 Dev Module** (30 or 38 pins) | 1 | Microcontroller with Wi-Fi & WebSockets |
| **Dual DC Gear Motors + Wheels** (Yellow TT Motors, 3-6V) | 2 | Left & Right Differential Drive |
| **L298N Dual H-Bridge Motor Driver** (or TB6612FNG) | 1 | Motor speed (PWM) and direction control |
| **HC-SR04 Ultrasonic Distance Sensor** | 1 | Real-time obstacle detection & distance measurement |
| **SG90 Micro Servo Motor** | 1 | Sweeps ultrasonic sensor (45° Left, 90° Center, 135° Right) |
| **Castor Wheel / Ball Caster** | 1 | Front or rear balance support |
| **Battery Pack** (2x 18650 Li-ion 7.4V or 4x AA) | 1 | Power for motors and ESP32 |
| **LM2596 Buck Converter** (or 5V regulator) | 1 | Steps battery down to clean 5V for ESP32 & Servo |
| **Jumper Wires & Breadboard/PCB** | — | Interconnections |

---

## 2. Complete Circuit Pinout & Wiring Table

> [!CAUTION]
> Always share a **Common Ground (GND)** between the ESP32, L298N motor driver, and the battery pack. Never power DC motors directly from ESP32 3.3V or 5V pins!

### A. L298N Motor Driver $\longleftrightarrow$ ESP32

| L298N Motor Driver Pin | ESP32 GPIO Pin | Function |
| :--- | :---: | :--- |
| **ENA** (Left Motor PWM) | **GPIO 13** | Left wheel speed modulation (0–255) |
| **IN1** (Left Motor Dir 1) | **GPIO 12** | Left wheel forward direction |
| **IN2** (Left Motor Dir 2) | **GPIO 14** | Left wheel reverse direction |
| **IN3** (Right Motor Dir 1) | **GPIO 27** | Right wheel forward direction |
| **IN4** (Right Motor Dir 2) | **GPIO 26** | Right wheel reverse direction |
| **ENB** (Right Motor PWM) | **GPIO 25** | Right wheel speed modulation (0–255) |
| **12V / VCC** | Battery Positive (+7.4V) | Motor power supply |
| **GND** | Battery Negative & ESP32 GND | **Common Ground** |

*(Note: Remove the 2-pin jumpers on ENA and ENB on the L298N board so ESP32 can send PWM speed signals).*

### B. HC-SR04 Ultrasonic Sensor $\longleftrightarrow$ ESP32

| HC-SR04 Pin | ESP32 GPIO Pin | Details |
| :--- | :---: | :--- |
| **VCC** | 5V Output (Buck converter / 5V rail) | Sensor power |
| **TRIG** | **GPIO 32** | Trigger pulse sent by ESP32 |
| **ECHO** | **GPIO 35** | Pulse return measured by ESP32 |
| **GND** | ESP32 GND | Ground |

### C. SG90 Micro Servo $\longleftrightarrow$ ESP32

| SG90 Servo Wire | Connection | Details |
| :--- | :---: | :--- |
| **Brown / Black** | ESP32 GND | Ground |
| **Red** | 5V Rail | Power (do not draw from ESP32 pin!) |
| **Orange / Yellow** | **GPIO 33** | PWM Control Signal |

---

## 3. Arduino IDE Setup (For Hardware Team)

1. Open **Arduino IDE** (v2.x recommended).
2. Go to **File $\rightarrow$ Preferences** and add the ESP32 board URL:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Go to **Tools $\rightarrow$ Board $\rightarrow$ Boards Manager**, search for `esp32` by Espressif Systems, and click **Install**.
4. Install the following libraries via **Tools $\rightarrow$ Manage Libraries**:
   - `WebSockets` by Markus Sattler (v2.4+)
   - `ArduinoJson` by Benoit Blanchon (v6.x or v7.x)
   - `ESP32Servo` by Kevin Harrington (v1.x+)
5. Open the firmware sketch located at:
   `firmware/esp32_warehouse_robot/esp32_warehouse_robot.ino`
6. Update lines 27–34 with your local Wi-Fi SSID, Password, and your computer's local IP address:
   ```cpp
   const char* WIFI_SSID     = "YOUR_HOME_OR_HOTSPOT_NAME";
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
   const char* WS_SERVER_HOST = "192.168.1.100"; // Your PC's IPv4 address
   const int   WS_SERVER_PORT = 5000;
   ```
7. Select **Board: ESP32 Dev Module**, select your COM port, and click **Upload**.

---

## 4. How to Find Your PC IP Address on Windows

1. Open PowerShell or Command Prompt.
2. Run:
   ```powershell
   ipconfig
   ```
3. Look for **IPv4 Address** under your active Wi-Fi or Ethernet adapter (e.g., `192.168.1.45` or `192.168.137.1` if using a mobile hotspot).
4. Put that IP into `WS_SERVER_HOST` in the Arduino code.

---

## 5. Running the Backend & CSV Telemetry Engine

In your project directory, launch the backend bridge server:

```powershell
npm run server
```

The server will print:
```
======================================================
🚀 FUSIONISTIC HARDWARE BRIDGE SERVER RUNNING ON PORT 5000
======================================================
Local Web API:     http://localhost:5000
WebSocket Stream:  ws://localhost:5000/ws
CSV Telemetry:     D:\personal website\fusionistic\data\hardware_telemetry.csv
```

### Structured CSV Columns Recorded:
All data points are automatically written to `data/hardware_telemetry.csv`:
```csv
timestamp,iso_time,robot_id,x,y,heading,ultrasonic_distance_cm,servo_angle,obstacle_detected,target_x,target_y,task_state,motor_left_pwm,motor_right_pwm,command_issued,latency_ms
```

You can view or download this file directly at:
- `http://localhost:5000/api/telemetry/csv` (Instant CSV file download)
- `http://localhost:5000/api/telemetry/recent` (JSON snapshot of last 50 entries)

---

## 6. Testing Without Hardware First (Simulator)

Before connecting the physical robot, you can verify the entire two-way flow and obstacle re-routing with our built-in mock client:

1. In Terminal 1: Run the backend:
   ```powershell
   npm run server
   ```
2. In Terminal 2: Run the mock client:
   ```powershell
   npm run test:hardware
   ```
3. Observe:
   - Telemetry packets stream every 350ms with servo scanning (45°, 90°, 135°).
   - At step 7, the simulator injects an obstacle (11.4 cm ahead).
   - The server detects the obstacle, logs it in CSV (`obstacle_detected = TRUE`), recalculates the A* bypass route, and issues dynamic turn and move commands to steer around it!
   - The robot successfully completes its journey to the dropoff station!

---

## 7. Two-Way Execution Flow: Pick Station $\rightarrow$ Dropoff

```
 [ESP32 Hardware]                               [Fusionistic Backend]
        │                                                  │
        │ 1. Sweep Servo + Ping Ultrasonic (e.g. 15cm)    │
        ├─────────────────────────────────────────────────►│
        │    WebSocket: { dist: 15, servo: 90, ... }       │ 2. Process Telemetry
        │                                                  │ 3. Obstacle Detected!
        │                                                  │ 4. Log row to CSV
        │                                                  │ 5. Calculate A* Bypass
        │ 6. Receive Motion Command                        │
        │◄─────────────────────────────────────────────────┤
        │    { cmd: "TURN_RIGHT", speed: 195, ms: 450 }    │
        │                                                  │
        │ 7. Drive Motors to Bypass Blockade               │
        │ 8. Ping Ultrasonic (e.g. 140cm, Clear!)          │
        ├─────────────────────────────────────────────────►│
        │    WebSocket: { dist: 140, servo: 90, ... }      │ 9. Sensed Clear
        │                                                  │ 10. Command Forward
        │◄─────────────────────────────────────────────────┤
        │    { cmd: "MOVE_FORWARD", speed: 180, ms: 700 }  │
        │                                                  │
        │ ... Repeat until Target Dropoff Bay reached ...  │
        │                                                  │
        │◄─────────────────────────────────────────────────┤
        │    { cmd: "STOP", missionComplete: true }        │
```

---

## 8. Calibration & Fine-Tuning Tips

1. **Straight-Line Drift**:
   - If the robot drifts slightly left or right when moving forward, adjust `analogWrite(MOTOR_LEFT_ENA, speed)` or `analogWrite(MOTOR_RIGHT_ENB, speed)` in the Arduino sketch by $\pm 10$ to compensate for slight motor gear differences.
2. **90-Degree Turn Calibration**:
   - In `server/navigationEngine.js`, adjust `this.turn90DurationMs` (default: `450ms`) and `this.defaultTurnSpeed` (default: `195`) until the robot makes a crisp 90° pivot on your floor surface.
3. **Obstacle Sensitivity**:
   - In `server/navigationEngine.js`, the default detection threshold is `18.0 cm`. If you want it to react sooner, increase it to `25.0 cm`.
