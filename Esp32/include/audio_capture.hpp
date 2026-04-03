#pragma once

#include <Arduino.h>
#include <driver/i2s.h>

#define I2S_PORT I2S_NUM_0

// INMP441 I2S pins (default for ESP32-C3)
#define I2S_BCLK 5
#define I2S_LRC 4
#define I2S_DOUT 8

#define SAMPLE_RATE 16000

bool audio_capture_init();
size_t capture_audio_buffer(int16_t *buffer, size_t size);
