import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory inside root
const DATA_DIR = path.resolve(__dirname, '../data');
const CSV_FILE_PATH = path.join(DATA_DIR, 'hardware_telemetry.csv');

// Standardized CSV Column Headers
const CSV_HEADERS = [
  'timestamp',
  'iso_time',
  'robot_id',
  'x',
  'y',
  'heading',
  'ultrasonic_distance_cm',
  'servo_angle',
  'obstacle_detected',
  'target_x',
  'target_y',
  'task_state',
  'motor_left_pwm',
  'motor_right_pwm',
  'command_issued',
  'latency_ms'
].join(',');

export class CsvLogger {
  constructor() {
    this.ensureDirectoryAndHeaders();
  }

  /**
   * Ensure data directory exists and CSV file has correct headers
   */
  ensureDirectoryAndHeaders() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(CSV_FILE_PATH)) {
      fs.writeFileSync(CSV_FILE_PATH, CSV_HEADERS + '\n', 'utf8');
      console.log(`[CSV Logger] Created new telemetry log at: ${CSV_FILE_PATH}`);
    }
  }

  /**
   * Append a structured telemetry row
   * @param {Object} rowData 
   */
  logTelemetry(rowData) {
    const timestamp = rowData.timestamp || Date.now();
    const isoTime = rowData.isoTime || new Date(timestamp).toISOString();
    const robotId = rowData.robotId || 'FUS-HW-01';
    const x = Number(rowData.x ?? 0).toFixed(2);
    const y = Number(rowData.y ?? 0).toFixed(2);
    const heading = Math.round(rowData.heading ?? 0);
    const ultrasonicDistanceCm = Number(rowData.ultrasonicDistanceCm ?? 999).toFixed(1);
    const servoAngle = Math.round(rowData.servoAngle ?? 90);
    const obstacleDetected = rowData.obstacleDetected ? 'TRUE' : 'FALSE';
    const targetX = rowData.targetX ?? -1;
    const targetY = rowData.targetY ?? -1;
    const taskState = rowData.taskState || 'IDLE';
    const motorLeftPwm = Math.round(rowData.motorLeftPwm ?? 0);
    const motorRightPwm = Math.round(rowData.motorRightPwm ?? 0);
    const commandIssued = rowData.commandIssued || 'NONE';
    const latencyMs = Number(rowData.latencyMs ?? 0).toFixed(1);

    const line = [
      timestamp,
      isoTime,
      robotId,
      x,
      y,
      heading,
      ultrasonicDistanceCm,
      servoAngle,
      obstacleDetected,
      targetX,
      targetY,
      taskState,
      motorLeftPwm,
      motorRightPwm,
      commandIssued,
      latencyMs
    ].join(',');

    try {
      fs.appendFileSync(CSV_FILE_PATH, line + '\n', 'utf8');
    } catch (err) {
      console.error('[CSV Logger] Error writing to CSV file:', err);
    }

    return {
      timestamp,
      isoTime,
      robotId,
      x: Number(x),
      y: Number(y),
      heading,
      ultrasonicDistanceCm: Number(ultrasonicDistanceCm),
      servoAngle,
      obstacleDetected: rowData.obstacleDetected === true,
      targetX,
      targetY,
      taskState,
      motorLeftPwm,
      motorRightPwm,
      commandIssued,
      latencyMs: Number(latencyMs)
    };
  }

  /**
   * Get recent N rows as parsed JSON
   */
  getRecentLogs(limit = 50) {
    if (!fs.existsSync(CSV_FILE_PATH)) return [];

    try {
      const fileContent = fs.readFileSync(CSV_FILE_PATH, 'utf8');
      const lines = fileContent.trim().split('\n');
      if (lines.length <= 1) return [];

      const headers = lines[0].split(',');
      const dataLines = lines.slice(1).slice(-limit);

      return dataLines.map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((h, idx) => {
          let val = values[idx];
          if (val === 'TRUE') val = true;
          else if (val === 'FALSE') val = false;
          else if (!isNaN(Number(val)) && val !== '') val = Number(val);
          obj[h] = val;
        });
        return obj;
      }).reverse(); // Most recent first
    } catch (err) {
      console.error('[CSV Logger] Error reading CSV:', err);
      return [];
    }
  }

  /**
   * Reset the CSV log file (clears past entries, writes headers)
   */
  resetLog() {
    fs.writeFileSync(CSV_FILE_PATH, CSV_HEADERS + '\n', 'utf8');
    console.log('[CSV Logger] Telemetry log cleared and reset.');
    return { success: true, message: 'CSV log cleared' };
  }

  /**
   * Get absolute path of CSV file
   */
  getFilePath() {
    return CSV_FILE_PATH;
  }
}
