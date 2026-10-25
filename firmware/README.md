# LifeLink AI — Wearable Hardware & ESP32 Firmware Guide

This directory contains the firmware and hardware integration specifications for connecting a physical IoT wearable to the LifeLink AI emergency response platform.

---

## 1. Hardware Bill of Materials (BOM)

| Component | Function | Interface | Operating Voltage |
| :--- | :--- | :--- | :--- |
| **ESP32 DevKit V1** | Microcontroller & WiFi transceiver | USB / 3.3V Logic | 5V via Micro-USB or 3.7V LiPo |
| **MPU-6050** | 6-DOF IMU (Accelerometer & Gyroscope) | I2C (SDA=GPIO21, SCL=GPIO22) | 3.3V |
| **SIM800L GSM/GPRS** | Cellular SMS / GPRS Fallback Modem | UART (RX=GPIO16, TX=GPIO17) | 3.7V–4.2V (2A Peak current) |
| **Tactile Push Button** | Emergency Manual SOS Trigger | Active-low GPIO14 with pullup | 3.3V Logic |
| **Dual LEDs (Green / Red)** | Status & Emergency Flash Indicator | GPIO2 (Green), GPIO4 (Red) | 3.3V via 220Ω resistor |
| **3.7V 1200mAh LiPo** | Wearable Battery Power Source | JST / Voltage Divider to GPIO34 | 3.7V nominal |

---

## 2. Wiring & Pinout Table

```
ESP32 DevKit V1        MPU-6050
----------------       --------
3V3           ------>  VCC
GND           ------>  GND
GPIO 21 (SDA) ------>  SDA
GPIO 22 (SCL) ------>  SCL

ESP32 DevKit V1        SIM800L GSM Modem
----------------       -----------------
GND           ------>  GND (Common Ground is Critical!)
GPIO 16 (RX2) ------>  SIM800L TXD
GPIO 17 (TX2) ------>  SIM800L RXD (via 1k/2k voltage divider if 3.3V tolerant)
External 4V 2A ------>  SIM800L VCC (Do NOT power SIM800L directly from ESP32 3.3V pin)

ESP32 DevKit V1        SOS Button & Indicators
----------------       -----------------------
GPIO 14       ------>  SOS Button (Other pin to GND, software pullup enabled)
GPIO 2        ------>  Green LED (through 220Ω to GND)
GPIO 4        ------>  Red Emergency LED (through 220Ω to GND)
GPIO 34 (ADC) ------>  Center of 100k/100k Voltage divider across Battery + and GND
```

> [!CAUTION]
> **SIM800L Power Supply Warning**: GSM transmission bursts draw up to 2.0A of instantaneous current. Powering the SIM800L directly from the ESP32 3.3V pin will cause voltage sags, brownout resets, and network drops. Use a dedicated 3.7V–4.2V LiPo battery or buck converter with at least a 1000µF low-ESR electrolytic capacitor across VCC and GND.

---

## 3. Telemetry Ingestion Contract (HTTP REST)

The ESP32 firmware transmits JSON telemetry to `POST /api/telemetry` at 1Hz or immediately upon SOS interrupt:

```json
{
  "device_code": "LL-ESP32-HARDWARE-01",
  "ax": 0.045,
  "ay": 0.082,
  "az": 0.985,
  "gx": 1.2,
  "gy": -0.8,
  "gz": 0.4,
  "heart_rate": 74.0,
  "spo2": 98.2,
  "battery_level": 88,
  "connectivity_status": "ONLINE",
  "source_type": "PHYSICAL_ESP32",
  "is_sos_pressed": false,
  "latitude": 40.7128,
  "longitude": -74.0060
}
```

### Key Contract Flags:
- `is_sos_pressed`: When `true`, the LifeLink AI backend instantly creates a `MANUAL_SOS` event bypassing the fall-detection sliding window classifier.
- `source_type`: Set to `"PHYSICAL_ESP32"` to distinguish genuine hardware telemetry from the web dashboard simulator.
- `connectivity_status`: If WiFi fails, the ESP32 automatically attempts a cellular SMS directly to the caregiver number using the SIM800L AT commands (`AT+CMGS`).

---

## 4. Arduino IDE Setup Instructions

1. Install **ESP32 Board Support** in Arduino IDE (Boards Manager -> `esp32` by Espressif Systems).
2. Select Board: **ESP32 Dev Module**.
3. Install Libraries:
   - `Wire` (Built-in)
   - `WiFi` (Built-in)
   - `HTTPClient` (Built-in)
4. Open `lifelink_esp32.ino`. Update `WIFI_SSID`, `WIFI_PASS`, and your local PC's IP address in `BACKEND_URL` (e.g. `http://192.168.1.150:8000/api/telemetry`).
5. Upload with baud rate `115200`.
