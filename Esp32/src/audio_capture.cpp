#include "audio_capture.hpp"
#include <Arduino.h>

extern void log(String msg);

bool audio_capture_init() {
  i2s_config_t i2s_config = {
      .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
      .sample_rate = SAMPLE_RATE,
      .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
      .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
      .communication_format = I2S_COMM_FORMAT_STAND_I2S,
      .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
      .dma_buf_count = 4,
      .dma_buf_len = 512,
      .use_apll = false,
      .tx_desc_auto_clear = false,
      .fixed_mclk = 0};

  i2s_pin_config_t pin_config = {.bck_io_num = I2S_BCLK,
                                 .ws_io_num = I2S_LRC,
                                 .data_out_num = I2S_PIN_NO_CHANGE,
                                 .data_in_num = I2S_DOUT};

  esp_err_t err = i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  if (err != ESP_OK) {
    log("[ ERROR ] i2s_driver_install fail");
    return false;
  }

  err = i2s_set_pin(I2S_PORT, &pin_config);
  if (err != ESP_OK) {
    log("[ ERROR ] i2s_set_pin fail");
    return false;
  }

  log("[ INFO ] Audio Capture I2S Initialized");
  return true;
}

size_t capture_audio_buffer(int16_t *buffer, size_t size) {
  size_t bytes_read = 0;
  esp_err_t result = i2s_read(I2S_PORT, buffer, size * sizeof(int16_t),
                              &bytes_read, portMAX_DELAY);
  if (result == ESP_OK) {
    return bytes_read / sizeof(int16_t);
  }
  return 0;
}
