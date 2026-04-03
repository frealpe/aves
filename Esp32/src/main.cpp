// -------------------------------------------------------------------
// Librerías
// -------------------------------------------------------------------
#include <Arduino.h>
#include <ArduinoJson.h>
#include <EEPROM.h>
#include <SPIFFS.h>
#include <TimeLib.h>

// -------------------------------------------------------------------
// Archivos *.hpp - Fragmentar el Código
// -------------------------------------------------------------------
#include "iot32_functions.hpp"
#include "iot32_header.hpp"
#include "iot32_mqtt.hpp"
#include "iot32_server.hpp"
#include "iot32_settings.hpp"
#include "iot32_wifi.hpp"
#include "lv_mascot.hpp"
#include <TFT_eSPI.h>
#include <lvgl.h>
#include "audio_capture.hpp"
#include "fft_processing.hpp"
#include "visualization.hpp"

// -------------------------------------------------------------------
// Objetos y Variables Globales LVGL
// -------------------------------------------------------------------
TFT_eSPI tft = TFT_eSPI();
static lv_disp_draw_buf_t draw_buf;
static lv_color_t buf[240 * 10]; // Buffer para 10 líneas

/* Función para volcar el buffer de LVGL a la pantalla */
void my_disp_flush(lv_disp_drv_t *disp, const lv_area_t *area,
                   lv_color_t *color_p) {
  uint32_t w = (area->x2 - area->x1 + 1);
  uint32_t h = (area->y2 - area->y1 + 1);
  tft.startWrite();
  tft.setAddrWindow(area->x1, area->y1, w, h);
  tft.pushColors((uint16_t *)&color_p->full, w * h, true);
  tft.endWrite();
  lv_disp_flush_ready(disp);
}

// -------------------------------------------------------------------
// Setup
// -------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  setCpuFrequencyMhz(160);
  // Memoria EEPROM init
  EEPROM.begin(256);
  // Leer el valor de la memoria
  EEPROM.get(Restart_Address, device_restart);
  device_restart++;
  // Guardar el valor a la memoria
  EEPROM.put(Restart_Address, device_restart);
  EEPROM.commit();
  EEPROM.end();
  log("\n[ INFO ] Iniciando Setup");
  log("[ INFO ] MAC: " + WiFi.macAddress());
  log("[ INFO ] Reinicios " + String(device_restart));
  log("[ INFO ] Setup corriendo en el Core " + String(xPortGetCoreID()));
  // Iniciar el SPIFFS
  if (!SPIFFS.begin(true)) {
    log("[ ERROR ] Falló la inicialización del SPIFFS");
    while (true)
      ;
  }
  // Leer el Archivo settings.json
  if (!settingsRead()) {
    settingsSave();
  }

  // Verificar si las credenciales son las antiguas "DroneMaster" para forzar un
  // reset
  if (strcmp(device_old_user, "DroneMaster") == 0) {
    log("[ WARNING ] Credenciales antiguas detectadas. Forzando reset de "
        "fábrica...");
    settingsReset();
    settingsSave();
  }
  log("[ INFO ] AP Password: " + String(ap_password));
  log("[ INFO ] User: " + String(device_old_user));
  log("[ INFO ] Password: " + String(device_old_password));
  // Configuración de los LEDs
  settingPines();
  // Setup WIFI
  wifi_setup();
  // Inicializacion del Servidor WEB
  InitServer();

  // -----------------------------------------------------------------
  // Inicialización de Pantalla y LVGL
  // -----------------------------------------------------------------
  tft.begin();
  tft.setRotation(0); // Ajustar según orientación del GC9A01
  lv_init();
  lv_disp_draw_buf_init(&draw_buf, buf, NULL, 240 * 10);

  /* Inicializar el driver de la pantalla */
  static lv_disp_drv_t disp_drv;
  lv_disp_drv_init(&disp_drv);
  disp_drv.hor_res = 240;
  disp_drv.ver_res = 240;
  disp_drv.flush_cb = my_disp_flush;
  disp_drv.draw_buf = &draw_buf;
  lv_disp_drv_register(&disp_drv);

  /* Crear la Mascota o Avatar */
  if (lv_avatar_create(lv_scr_act()) == NULL) {
    // Si no hay avatar, mostramos la mascota animada
    lv_mascot_create(lv_scr_act(), &mascot_sprite_sheet, 64, 64, 4);
  }

  // Inicializar Smart Badge
  lv_badge_init(lv_scr_act());

  // Initialize Audio, FFT, and Visualization
  audio_capture_init();
  fft_init(512, SAMPLE_RATE);
  visualization_init(&tft);

  log("[ INFO ] Setup completado");
}
// -------------------------------------------------------------------
// Loop Principal
// -------------------------------------------------------------------
void loop() {
  /* LVGL Timer Handler */
  lv_timer_handler();

  /* LVGL Badge Refresh */
  if (badge_updated) {
    lv_badge_refresh();
  }

  /* WebSocket Cleanup */
  ws.cleanupClients();

  static unsigned long lastAudioProcess = 0;
  if (millis() - lastAudioProcess > 50) { // ~20fps
    lastAudioProcess = millis();
    int16_t audio_buffer[512];
    size_t bytes_read = capture_audio_buffer(audio_buffer, 512);
    if (bytes_read > 0) {
      AudioFeatures features = process_audio_fft(audio_buffer, 512);
      update_audio_visualization(features); // Uncomment to draw graph on screen
      broadcastAudioFeatures(features);
    }
  }

  /* Periodic System Status Broadcast (every 5 seconds) */
  static unsigned long lastWsBroadcast = 0;
  if (millis() - lastWsBroadcast > 5000) {
    lastWsBroadcast = millis();
    broadcastSystemStatus();
  }

  // -----------------------------------------------------------------
  // WIFI
  // -----------------------------------------------------------------
  if (wifi_mode == WIFI_STA) {
    wifiLoop();
  } else if (wifi_mode == WIFI_AP) {
    wifiAPLoop();
  }
  // -----------------------------------------------------------------
  // MQTT
  // -----------------------------------------------------------------
  if (mqtt_cloud_enable) {
    if (mqtt_server[0] != '\0') {
      // Función para el Loop principla de MQTT
      mqttLoop();
      if (mqttClient.connected() && mqtt_time_send) {
        // Funcion para enviar JSON por MQTT
        if (millis() - lastMsg > mqtt_time_interval) {
          lastMsg = millis();
          mqtt_publish();
        }
      }
    }
  }
}