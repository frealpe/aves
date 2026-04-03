#include "visualization.hpp"
#include <vector>

static TFT_eSPI *tft_display = nullptr;

struct Node {
  float x;
  float y;
  float vx;
  float vy;
  uint16_t color;
  uint16_t radius;
  uint16_t target_radius;
};

static std::vector<Node> nodes;
static const size_t NUM_NODES = 8;
static const int WIDTH = 240;
static const int HEIGHT = 240;

uint16_t get_color_for_frequency(float freq) {
  if (freq < 200) {
    return TFT_PURPLE; // Low freq
  } else if (freq < 2000) {
    return TFT_YELLOW; // Mid freq
  } else {
    return TFT_RED; // High freq
  }
}

void visualization_init(TFT_eSPI *display) {
  tft_display = display;
  nodes.clear();
  for (size_t i = 0; i < NUM_NODES; i++) {
    Node n;
    n.x = random(20, WIDTH - 20);
    n.y = random(20, HEIGHT - 20);
    n.vx = (random(-10, 10) / 10.0f);
    n.vy = (random(-10, 10) / 10.0f);
    n.color = TFT_BLUE;
    n.radius = 5;
    n.target_radius = 5;
    nodes.push_back(n);
  }
}

void update_audio_visualization(AudioFeatures features) {
  if (tft_display == nullptr)
    return;

  // We map the amplitude to the target radius of the primary node (index 0)
  float target_rad = map(features.amplitude, 0, 5000, 5, 30);
  if (target_rad > 30) target_rad = 30;
  if (target_rad < 5) target_rad = 5;

  uint16_t new_color = get_color_for_frequency(features.dominant_freq);

  // Simple physics update and drawing
  // For performance on ESP32, we don't clear the whole screen, but draw over old lines,
  // or we can use a sprite, but let's try direct drawing first for memory efficiency.

  // In a real app, you might want to use a sprite to avoid flicker.
  tft_display->fillScreen(TFT_BLACK);

  // Update primary node based on audio
  nodes[0].target_radius = target_rad;
  nodes[0].color = new_color;

  for (size_t i = 0; i < nodes.size(); i++) {
    nodes[i].x += nodes[i].vx;
    nodes[i].y += nodes[i].vy;

    // Bounce off walls
    if (nodes[i].x < 10 || nodes[i].x > WIDTH - 10) nodes[i].vx *= -1;
    if (nodes[i].y < 10 || nodes[i].y > HEIGHT - 10) nodes[i].vy *= -1;

    // Smooth radius transition
    if (nodes[i].radius < nodes[i].target_radius) {
      nodes[i].radius++;
    } else if (nodes[i].radius > nodes[i].target_radius) {
      nodes[i].radius--;
    }

    // Pass energy to neighbors
    if (i > 0) {
      nodes[i].target_radius = nodes[0].target_radius * 0.8f;
      nodes[i].color = nodes[0].color;

      // Attraction to center or previous node
      float dx = nodes[i-1].x - nodes[i].x;
      float dy = nodes[i-1].y - nodes[i].y;
      nodes[i].vx += dx * 0.01f;
      nodes[i].vy += dy * 0.01f;

      // Dampening
      nodes[i].vx *= 0.95f;
      nodes[i].vy *= 0.95f;
    }

    // Draw connections
    for (size_t j = i + 1; j < nodes.size(); j++) {
      float dist = sqrt(pow(nodes[i].x - nodes[j].x, 2) + pow(nodes[i].y - nodes[j].y, 2));
      if (dist < 80) {
        tft_display->drawLine(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y, nodes[i].color);
      }
    }
  }

  // Draw nodes
  for (size_t i = 0; i < nodes.size(); i++) {
    tft_display->fillCircle(nodes[i].x, nodes[i].y, nodes[i].radius, nodes[i].color);
  }
}
