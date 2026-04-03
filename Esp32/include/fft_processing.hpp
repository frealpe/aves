#pragma once

#include <Arduino.h>

struct AudioFeatures {
  float dominant_freq;
  float amplitude;
  float spectral_energy;
};

// Initialize FFT structures
bool fft_init(size_t samples, float sample_rate);

// Process the audio and extract features
AudioFeatures process_audio_fft(int16_t *audio_in, size_t num_samples);
