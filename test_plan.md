1. **Analyze Requirements**:
    * Network where nodes are audio samples.
    * Node props: x=time, y=frequency, energy=intensity.
    * Connections: Temporal (node[i] to node[i-1]), Similarity (similar frequency), Spatial (close 2D distance), Energy (high energy = more connections).
    * Visuals: Line thickness ~ energy, Opacity ~ 1/distance, Color ~ frequency.
    * Behavior: Smooth scroll, fade out, circular buffer limit.
2. **Update `SoundGraph.jsx`**:
    * Modify node generation: Use `dominant_freq` and `amplitude` from `features`.
    * Map `y` to `freq` and `x` to `time` (horizontal scroll starting from right).
    * Simplify 3D to a 2.5D or pure 2D layered view to better match the "horizontal scroll over time" requirement while retaining a beautiful aesthetic.
    * Implement the 4 connection rules exactly as specified.
    * Ensure fluid rendering using Skia.
