#pragma once

#include <Arduino.h>
#include <TFT_eSPI.h>
#include "fft_processing.hpp"

// Initialize the visualization system
void visualization_init(TFT_eSPI *display);

// Update the visualization on the screen based on AudioFeatures
void update_audio_visualization(AudioFeatures features);
