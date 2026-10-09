#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>

// ============================================================================
// Compatibility Defs for ESPAsyncWebServer & ArduinoJson 6 / 7
// ============================================================================
// ESPAsyncWebServer defines WS_TEXT for text frame opcodes.
// Provide safe fallbacks so this compiles across all library versions and forks.
#ifndef WS_TEXT
  #define WS_TEXT 0x01
#endif
#ifndef WS_OPCODE_TEXT
  #define WS_OPCODE_TEXT 0x01
#endif

// ArduinoJson 7 removed StaticJsonDocument in favor of unified JsonDocument.
// This macro guarantees 100% error-free compilation in both ArduinoJson 6 & 7.
#if defined(ARDUINOJSON_VERSION_MAJOR) && (ARDUINOJSON_VERSION_MAJOR >= 7)
  #define ALLOCATE_JSON_DOC(doc, size) JsonDocument doc
#else
  #define ALLOCATE_JSON_DOC(doc, size) StaticJsonDocument<size> doc
#endif

// ============================================================================
// Fusionistic (IOT-04) — Option 1: ESP32 Access Point + Custom Web Dashboard
// Wi-Fi Access Point Credentials
// Connect your PC/Laptop Wi-Fi to "ESP32-Car" (Password: 12345678Password)
// The ESP32 is hosted at: 192.168.4.1
// WebSocket endpoint: ws://192.168.4.1/ws
// ============================================================================
const char* ssid = "ESP32-Car";
const char* password = "12345678Password";

// Hardware Pins (Ultrasonic, IR Sensor, Servos / Gear Motors)
#define TRIG_PIN 5
#define ECHO_PIN 18
#define IR_PIN 4
#define SERVO1_PIN 12 // Left Motor / Servo
#define SERVO2_PIN 13 // Right Motor / Servo

// Web & WebSocket Servers
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

// Servos & Navigation State Variables
Servo servoLeft;
Servo servoRight;

float currentX = 50.0, currentY = 50.0;
float targetX = 550.0, targetY = 350.0;
bool isNavigating = false;
bool obstacleDetected = false;

// Read Ultrasonic Sensor Distance in Centimeters
float getUltrasonicDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout (~5 meters max)
  if (duration == 0) return 400.0; // Clear path / no wall detected
  return (duration * 0.0343) / 2.0;
}

// Broadcast Real-Time Telemetry to all Connected Web Clients
void broadcastTelemetry() {
  ALLOCATE_JSON_DOC(doc, 256);
  doc["x"] = currentX;
  doc["y"] = currentY;
  doc["targetX"] = targetX;
  doc["targetY"] = targetY;
  doc["ir"] = (digitalRead(IR_PIN) == LOW); // LOW indicates active optical trigger
  doc["obstacle"] = obstacleDetected;
  doc["status"] = isNavigating ? (obstacleDetected ? "DETOURING" : "NAVIGATING") : "IDLE";

  String output;
  serializeJson(doc, output);
  ws.textAll(output);
}

// WebSocket Event Handler (Receives Point A, Point B, or STOP commands)
void onWsEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
  if (type == WS_EVT_CONNECT) {
    Serial.printf("[WebSocket] Client #%u connected from %s\n", client->id(), client->remoteIP().toString().c_str());
    broadcastTelemetry();
  } else if (type == WS_EVT_DISCONNECT) {
    Serial.printf("[WebSocket] Client #%u disconnected\n", client->id());
  } else if (type == WS_EVT_DATA) {
    AwsFrameInfo *info = (AwsFrameInfo*)arg;
    // Check for Text frame using WS_TEXT (standard in ESPAsyncWebServer)
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
          Serial.printf("[Command] SET_POINTS -> Start:(%.1f, %.1f) Goal:(%.1f, %.1f)\n", currentX, currentY, targetX, targetY);
        } else if (action == "STOP") {
          isNavigating = false;
          servoLeft.write(90);  // Neutral stop
          servoRight.write(90);
          Serial.println("[Command] STOP received. Motors halted.");
        }
        broadcastTelemetry();
      }
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== Fusionistic ESP32 Car Access Point Starting ===");

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(IR_PIN, INPUT_PULLUP);

  servoLeft.attach(SERVO1_PIN);
  servoRight.attach(SERVO2_PIN);
  servoLeft.write(90);  // Stop motors at boot
  servoRight.write(90);

  // Setup Wi-Fi Access Point
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid, password);
  IPAddress IP = WiFi.softAPIP();
  Serial.print("[Wi-Fi AP] SSID: ");
  Serial.println(ssid);
  Serial.print("[Wi-Fi AP] IP Address: ");
  Serial.println(IP);

  // Setup WebSocket & HTTP Server
  ws.onEvent(onWsEvent);
  server.addHandler(&ws);

  // Serve simple status page directly from ESP32
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request){
    String html = "<html><head><title>Fusionistic ESP32 AP</title></head>"
                  "<body style='font-family:sans-serif;padding:2rem;text-align:center;'>"
                  "<h2>Fusionistic ESP32 Car AP Active</h2>"
                  "<p>IP: 192.168.4.1 | Port 80 HTTP | Port 80/ws WebSocket</p>"
                  "<p>Connect your Fusionistic Dashboard to <b>ws://192.168.4.1/ws</b></p>"
                  "</body></html>";
    request->send(200, "text/html", html);
  });

  server.begin();
  Serial.println("[HTTP/WS] Server listening on port 80");
}

void loop() {
  ws.cleanupClients();

  if (isNavigating) {
    float dist = getUltrasonicDistance();
    bool irTrigger = (digitalRead(IR_PIN) == LOW);

    // Obstacle Check: distance under 15cm or IR triggered
    if (dist < 15.0 || irTrigger) {
      obstacleDetected = true;
      // Tangent Detour / Bug Algorithm: Steer right to clear obstacle
      servoLeft.write(120);
      servoRight.write(60);
      currentX += 0.5; // Simulate step sideways away from obstacle
      Serial.printf("[Obstacle Alert] Dist: %.1f cm, IR: %d -> Detouring\n", dist, irTrigger);
    } else {
      obstacleDetected = false;
      // Step towards Target B
      float dx = targetX - currentX;
      float dy = targetY - currentY;
      float distanceToTarget = sqrt(dx * dx + dy * dy);

      if (distanceToTarget < 2.0) {
        isNavigating = false; // Goal reached!
        servoLeft.write(90);  // Stop motors
        servoRight.write(90);
        Serial.println("[Goal] Reached Target B destination successfully!");
      } else {
        // Move Forward towards Goal
        servoLeft.write(180);
        servoRight.write(0);
        currentX += (dx / distanceToTarget) * 0.8;
        currentY += (dy / distanceToTarget) * 0.8;
      }
    }

    broadcastTelemetry();
    delay(100); // 10 Hz Telemetry update
  } else {
    delay(50);
  }
}
