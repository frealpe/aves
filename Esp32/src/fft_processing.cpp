#include "fft_processing.hpp"
#include "arduinoFFT.h"
#include <Arduino.h>

extern void log(String msg);

static ArduinoFFT<double> *fft = nullptr;
static double *vReal = nullptr;
static double *vImag = nullptr;
static size_t numSamples = 0;
static float sampleRate = 0;

bool fft_init(size_t samples, float s_rate) {
  numSamples = samples;
  sampleRate = s_rate;

  vReal = (double *)malloc(samples * sizeof(double));
  vImag = (double *)malloc(samples * sizeof(double));

  if (vReal == nullptr || vImag == nullptr) {
    log("[ ERROR ] Failed to allocate FFT buffers");
    return false;
  }

  fft = new ArduinoFFT<double>(vReal, vImag, samples, sampleRate);
  log("[ INFO ] FFT Initialized");
  return true;
}

AudioFeatures process_audio_fft(int16_t *audio_in, size_t num_samples) {
  AudioFeatures features = {0.0f, 0.0f, 0.0f};

  if (fft == nullptr || vReal == nullptr || vImag == nullptr ||
      num_samples != numSamples) {
    return features;
  }

  float sum_amplitude = 0;

  for (size_t i = 0; i < num_samples; i++) {
    vReal[i] = audio_in[i];
    vImag[i] = 0.0;
    sum_amplitude += abs(audio_in[i]);
  }

  features.amplitude = sum_amplitude / num_samples;

  fft->windowing(FFT_WIN_TYP_HAMMING, FFT_FORWARD);
  fft->compute(FFT_FORWARD);
  fft->complexToMagnitude();

  float dominant_freq = 0;
  double peak_magnitude = 0;
  float total_energy = 0;

  // Start from 2 to avoid DC offset
  for (size_t i = 2; i < num_samples / 2; i++) {
    total_energy += vReal[i];
    if (vReal[i] > peak_magnitude) {
      peak_magnitude = vReal[i];
      dominant_freq = (i * sampleRate) / num_samples;
    }
  }

  features.dominant_freq = dominant_freq;
  features.spectral_energy = total_energy;

  return features;
}
