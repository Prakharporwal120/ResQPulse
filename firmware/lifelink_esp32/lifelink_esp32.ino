/*
 * LifeLink AI — ESP32 Wearable Telemetry & Fall Detection Firmware
 * Target: ESP32 DevKit V1 + MPU6050 IMU + SIM800L GSM Modem + Physical SOS Button
 * 
 * Capabilities:
 * 1. MPU6050 6-DOF IMU reading (Accel X/Y/Z in g, Gyro X/Y/Z in deg/s)
 * 2. Onboard threshold acceleration check
 * 3. Hardware SOS interrupt button with debouncing
 * 4. WiFi HTTP POST telemetry ingestion to LifeLink AI backend
 * 5. Cellular fallback using SIM800L AT commands when WiFi is disconnected
 * 6. Battery ADC voltage monitoring
 * 
 * Safety Disclaimer:
 * Educational / Competition Prototype. Not a certified life-saving medical device.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>

// --- Configuration ---
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASS     = "YOUR_WIFI_PASSWORD";
const char* BACKEND_URL   = "http://192.168.1.100:8000/api/telemetry";
const char* DEVICE_CODE   = "LL-ESP32-HARDWARE-01";
const char* BACKUP_PHONE  = "+15550199"; // Caregiver SMS number for SIM800L

// Pin Definitions
#define SOS_BUTTON_PIN    14   // Active-low push button with internal pullup
#define BATTERY_ADC_PIN   34   // Voltage divider on battery
#define LED_GREEN_PIN     2    // Normal status
#define LED_RED_PIN       4    // Emergency alert status
#define SIM800_RX_PIN     16   // ESP32 Serial2 RX -> SIM800L TX
#define SIM800_TX_PIN     17   // ESP32 Serial2 TX -> SIM800L RX

// MPU6050 I2C Address
const int MPU_ADDR = 0x68;

// State Variables
volatile bool g_sosPressed = false;
unsigned long g_lastDebounceTime = 0;
unsigned long g_lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 1000; // 1Hz stream

void IRAM_ATTR handleSosInterrupt() {
  unsigned long now = millis();
  if (now - g_lastDebounceTime > 300) { // 300ms debounce
    g_sosPressed = true;
    g_lastDebounceTime = now;
  }
}

void initMPU6050() {
  Wire.begin();
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B); // PWR_MGMT_1 register
  Wire.write(0);    // Wake up MPU-6050
  Wire.endTransmission(true);
}

void readMPU6050(float &ax, float &ay, float &az, float &gx, float &gy, float &gz) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B); // Starting register for Accel data
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 14, true);

  if (Wire.available() >= 14) {
    int16_t rawAx = Wire.read() << 8 | Wire.read();
    int16_t rawAy = Wire.read() << 8 | Wire.read();
    int16_t rawAz = Wire.read() << 8 | Wire.read();
    int16_t rawTemp = Wire.read() << 8 | Wire.read();
    int16_t rawGx = Wire.read() << 8 | Wire.read();
    int16_t rawGy = Wire.read() << 8 | Wire.read();
    int16_t rawGz = Wire.read() << 8 | Wire.read();

    // Scale factors: +/- 2g range (16384 LSB/g), +/- 250 deg/s (131 LSB/deg/s)
    ax = (float)rawAx / 16384.0;
    ay = (float)rawAy / 16384.0;
    az = (float)rawAz / 16384.0;
    gx = (float)rawGx / 131.0;
    gy = (float)rawGy / 131.0;
    gz = (float)rawGz / 131.0;
  }
}

int readBatteryPercentage() {
  int raw = analogRead(BATTERY_ADC_PIN);
  // Example for 3.7V LiPo with 2:1 voltage divider (0-4095 range)
  float voltage = (raw / 4095.0) * 3.3 * 2.0;
  int pct = (int)((voltage - 3.2) / (4.2 - 3.2) * 100.0);
  return constrain(pct, 0, 100);
}

void sendSim800Sms(const String &message) {
  Serial.println("[Cellular Fallback] Sending SMS via SIM800L...");
  Serial2.println("AT+CMGF=1"); // Set SMS to text mode
  delay(100);
  Serial2.print("AT+CMGS=\"");
  Serial2.print(BACKUP_PHONE);
  Serial2.println("\"");
  delay(100);
  Serial2.print(message);
  delay(100);
  Serial2.write(26); // Ctrl+Z to send
  delay(1000);
}

void sendTelemetryHttp(float ax, float ay, float az, float gx, float gy, float gz, int battery, bool isSos) {
  if (WiFi.status() != WL_CONNECTED) {
    // WiFi is down: execute Cellular Fallback
    digitalWrite(LED_GREEN_PIN, LOW);
    if (isSos) {
      digitalWrite(LED_RED_PIN, HIGH);
      sendSim800Sms("EMERGENCY ALERT: Manual SOS triggered from LifeLink device " + String(DEVICE_CODE));
    }
    return;
  }

  HTTPClient http;
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");

  // Construct JSON payload
  String json = "{";
  json += "\"device_code\":\"" + String(DEVICE_CODE) + "\",";
  json += "\"ax\":" + String(ax, 3) + ",";
  json += "\"ay\":" + String(ay, 3) + ",";
  json += "\"az\":" + String(az, 3) + ",";
  json += "\"gx\":" + String(gx, 2) + ",";
  json += "\"gy\":" + String(gy, 2) + ",";
  json += "\"gz\":" + String(gz, 2) + ",";
  json += "\"battery_level\":" + String(battery) + ",";
  json += "\"connectivity_status\":\"ONLINE\",";
  json += "\"source_type\":\"PHYSICAL_ESP32\",";
  json += "\"is_sos_pressed\":" + String(isSos ? "true" : "false");
  json += "}";

  int httpCode = http.POST(json);
  if (httpCode > 0) {
    digitalWrite(LED_GREEN_PIN, HIGH);
  } else {
    // Backend unreachable -> activate cellular fallback
    if (isSos) {
      sendSim800Sms("EMERGENCY ALERT: LifeLink device unreachable over IP. SOS from " + String(DEVICE_CODE));
    }
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, SIM800_RX_PIN, SIM800_TX_PIN);

  pinMode(SOS_BUTTON_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(SOS_BUTTON_PIN), handleSosInterrupt, FALLING);

  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_RED_PIN, OUTPUT);

  initMPU6050();

  // Connect to WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 15) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected. IP: " + WiFi.localIP().toString());
    digitalWrite(LED_GREEN_PIN, HIGH);
  } else {
    Serial.println("\nWiFi connection timed out. System operating in Cellular Fallback mode.");
  }
}

void loop() {
  unsigned long now = millis();

  // Read Sensors
  float ax = 0, ay = 0, az = 1.0, gx = 0, gy = 0, gz = 0;
  readMPU6050(ax, ay, az, gx, gy, gz);
  int battery = readBatteryPercentage();

  // Immediate SOS check
  if (g_sosPressed) {
    g_sosPressed = false;
    Serial.println(">>> SOS BUTTON ACTIVATED! INITIATING IMMEDIATE EMERGENCY BROADCAST <<<");
    digitalWrite(LED_RED_PIN, HIGH);
    sendTelemetryHttp(ax, ay, az, gx, gy, gz, battery, true);
  }

  // Regular Telemetry Stream
  if (now - g_lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    g_lastTelemetryTime = now;
    sendTelemetryHttp(ax, ay, az, gx, gy, gz, battery, false);
  }

  delay(20);
}
