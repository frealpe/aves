import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Canvas, Circle, Line, Group, vec, Rect, Text, matchFont } from '@shopify/react-native-skia';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const FONT = matchFont({ fontSize: 10, fontStyle: { fontWeight: "bold" } });
const FOCAL_LENGTH = 500;
const NUM_NODES = 150;
const BANDS_COUNT = 16;

const SPECTRAL_PALETTE = [
    '#3a86ff', // Azul (Bajo)
    '#00b4d8', // Cian
    '#00f5d4', // Menta
    '#55ff00', // Verde Lima
    '#ccff00', // Amarillo Lima
    '#fee440', // Amarillo
    '#ffbe0b', // Ambar
    '#fb5607', // Naranja
    '#ff006e', // Magenta
    '#d90429', // Rojo
    '#ffffff'  // Blanco (Alto)
];

const getColorForBand = (idx) => {
    const paletteIdx = Math.floor((idx / BANDS_COUNT) * SPECTRAL_PALETTE.length);
    return SPECTRAL_PALETTE[Math.min(paletteIdx, SPECTRAL_PALETTE.length - 1)];
};

const COLOR_GRID = 'rgba(255, 255, 255, 0.05)';

const MAX_NODES = 300;
const SCROLL_SPEED = 1.8;
const SCAN_DEPTH = 60; // Cuántos nodos hacia atrás buscar conexiones

const SoundGraph = ({ features }) => {
    // 1. Buffer Circular de Nodos Dinámicos (Refs para 60fps)
    const nodesRef = useRef([]);
    const featuresRef = useRef(features);
    const [renderTick, setRenderTick] = useState(0);

    useEffect(() => {
        featuresRef.current = features;
    }, [features]);

    useEffect(() => {
        let frameId;

        const loop = () => {
            const features = featuresRef.current;
            const nodes = nodesRef.current;

            // Limit on number of active nodes
            const maxNodes = 300;
            const MAX_FREQ = 8000; // max expected freq to normalise

            // Create a node based on real time audio
            if (features && features.amplitude > 0.005) {
                const energy = features.amplitude;
                const freq = features.dominant_freq || 0;

                // Normalise freq to screen Y
                // Using log scale mapping can feel more natural, but simple linear bounded first:
                const boundedFreq = Math.min(Math.max(freq, 20), MAX_FREQ);
                // Invert so high frequency is higher up (y = 0)
                const yPos = (1 - (boundedFreq / MAX_FREQ)) * SCREEN_H * 0.8 + (SCREEN_H * 0.1);

                // Color based on frequency
                const bandIdx = Math.floor((boundedFreq / MAX_FREQ) * BANDS_COUNT);
                const finalColorIdx = Math.min(bandIdx, BANDS_COUNT - 1);

                const newNode = {
                    id: Date.now() + Math.random(),
                    x: 0, // start at right or left? In projection, positive x goes right.
                    y: yPos - SCREEN_H / 2, // Centered around 0 for projection
                    z: 0, // simplified 3D
                    freq: boundedFreq,
                    energy: energy,
                    intensity: Math.min(energy * 2.0, 1.0),
                    color: getColorForBand(finalColorIdx),
                    age: 0
                };
                nodes.unshift(newNode);
                if (nodes.length > maxNodes) {
                    nodes.pop();
                }
            }

            // Scroll x positions
            for (let i = nodes.length - 1; i >= 0; i--) {
                // move left (simulate scroll over time)
                nodes[i].x -= SCROLL_SPEED * 2.0;
                nodes[i].age += 1;

                // Auto cleanup old nodes
                if (nodes[i].age > 300) {
                    nodes.splice(i, 1);
                }
            }

            setRenderTick(performance.now());
            frameId = requestAnimationFrame(loop);
        };

        console.log("[SoundGraph] Seeing Birdsong 2.0: Explosión de Color y Centrado");
        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, []);

    // 2. Proyección 3D y Conexiones (Malla Viva)
    const { projectedNodes, connections } = useMemo(() => {
        const nodes = nodesRef.current;
        const proj = [];
        const lines = [];

        const angle = renderTick * 0.0002;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        // A. Proyectar Nodos (Wide Panoramic Balanceado)
        nodes.forEach((n, i) => {
            // Simply use x and y without heavy rotation to keep the scroll feel
            const rx = n.x;
            const rz = 0;

            const scale = FOCAL_LENGTH / (FOCAL_LENGTH + rz + 650);
            const px = SCREEN_W / 2 + rx * scale;
            const py = SCREEN_H / 2 + (n.y + 250) * scale;

            const opacity = Math.max(0, 1 - n.age / 300);
            if (opacity <= 0.01) return;

            proj.push({ ...n, px, py, scale, opacity });
        });

        // B. Formación de Red (Basado en Reglas)
        for (let i = 0; i < proj.length; i++) {
            const nodeA = proj[i];
            let connCount = 0;

            // Dinamical limit on connections based on energy
            // HIGH ENERGY = MORE CONNECTIONS
            let maxConns = nodeA.energy > 0.5 ? 8 : 4;

            const limit = Math.min(i + 45, proj.length);
            for (let j = i + 1; j < limit; j++) {
                const nodeB = proj[j];
                let shouldConnect = false;
                let strokeW = 1.0;

                const dx = nodeA.px - nodeB.px;
                const dy = nodeA.py - nodeB.py;
                const distSq = dx * dx + dy * dy;
                const distance = Math.sqrt(distSq);

                // 1. CONEXIÓN TEMPORAL (BASE)
                // node[i] -> node[i+1] (since nodes are unshifted)
                if (j === i + 1) {
                    shouldConnect = true;
                    strokeW = Math.max(1.0, nodeA.energy * 5);
                }
                // 2. CONEXIONES POR SIMILITUD
                else if (Math.abs(nodeA.freq - nodeB.freq) < 300 && connCount < maxConns - 1) {
                    shouldConnect = true;
                    strokeW = Math.max(0.5, nodeA.energy * 3);
                }
                // 3. CONEXIONES POR PROXIMIDAD ESPACIAL
                else if (distance < 100 && connCount < maxConns) {
                    shouldConnect = true;
                    strokeW = Math.max(0.2, nodeA.energy * 2);
                }
                // 4. CONEXIONES POR ENERGÍA (EVENTOS) - ya manejado permitiendo maxConns mayor

                if (shouldConnect) {
                    // Opacity inversamente proporcional a la distancia
                    const distOpacity = Math.max(0.1, 1 - (distance / 250));

                    lines.push({
                        p1: vec(nodeA.px, nodeA.py),
                        p2: vec(nodeB.px, nodeB.py),
                        color: nodeA.color,
                        opacity: Math.min(nodeA.opacity, nodeB.opacity) * distOpacity,
                        strokeW
                    });
                    connCount++;
                }
                if (connCount >= maxConns) break;
            }
        }

        if (renderTick % 100 < 1) {
            console.log(`[SoundGraph] Telemetría: Nodos=${nodes.length}, Proyectados=${proj.length}, W=${SCREEN_W}, H=${SCREEN_H}, yOffs=250`);
        }

        return { projectedNodes: proj, connections: lines };
    }, [renderTick]);

    return (
        <View style={styles.container}>
            <Canvas style={styles.canvasContainer}>
                {/* Cuadrícula Sutil de Fondo (Perspectiva) */}
                <Group opacity={0.03}>
                    {[...Array(12)].map((_, i) => (
                        <Line
                            key={`h-${i}`}
                            p1={vec(0, (i + 1) * SCREEN_H / 12)}
                            p2={vec(SCREEN_W, (i + 1) * SCREEN_H / 12)}
                            color="white" strokeWidth={0.5}
                        />
                    ))}
                </Group>

                {/* Red de Conexiones Densa */}
                {connections.map((l, i) => (
                    <Line
                        key={`c-${i}`} p1={l.p1} p2={l.p2}
                        color={l.color}
                        opacity={l.opacity}
                        strokeWidth={l.strokeW}
                    />
                ))}

                {/* Nodos (Glowing Spheres) */}
                {projectedNodes.map(n => {
                    const radius = ((12 + n.intensity * 30) * n.scale) / 2;

                    return (
                        <Group key={`n-${n.id}`} opacity={n.opacity}>
                            {/* Glow halo */}
                            <Circle
                                cx={n.px}
                                cy={n.py}
                                r={radius * 1.5}
                                color={n.color}
                                opacity={0.3}
                            />
                            {/* Esfera central */}
                            <Circle
                                cx={n.px}
                                cy={n.py}
                                r={radius}
                                color={n.color}
                                opacity={1.0}
                            />
                            {/* Borde Blanco Sutil */}
                            <Circle
                                cx={n.px}
                                cy={n.py}
                                r={radius}
                                color="white"
                                style="stroke"
                                strokeWidth={1}
                                opacity={0.5}
                            />

                            {/* Floating technical label for high energy nodes */}
                            {n.energy > 0.4 && FONT && (
                                <Text
                                    x={n.px + radius + 5}
                                    y={n.py - radius - 5}
                                    text={`${(n.freq / 1000).toFixed(2)}K`}
                                    font={FONT}
                                    color="white"
                                    opacity={0.8}
                                />
                            )}
                        </Group>
                    );
                })}
            </Canvas>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    canvasContainer: { width: SCREEN_W, height: SCREEN_H }
});

export default SoundGraph;
