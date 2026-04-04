import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { Canvas, Circle, Line, Group, vec, Rect, LinearGradient, BlurMask } from '@shopify/react-native-skia';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
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

const MAX_NODES = 120; // Reduced for performance
const DRIFT_SPEED = 0.5;
const CONNECTION_MAX_DIST = 150;

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

                const boundedFreq = Math.min(Math.max(freq, 20), MAX_FREQ);

                const newNode = {
                    id: Date.now() + Math.random(),
                    // Colocación central para look de cerebro
                    x: (Math.random() - 0.5) * 500,
                    y: (Math.random() - 0.5) * 500,
                    z: (Math.random() - 0.5) * 500,
                    freq: boundedFreq,
                    energy: energy,
                    intensity: Math.min(energy * 3.0, 1.0),
                    color: getColorForBand(Math.floor((boundedFreq / MAX_FREQ) * BANDS_COUNT)),
                    age: 0,
                    drift: {
                        x: (Math.random() - 0.5) * DRIFT_SPEED,
                        y: (Math.random() - 0.5) * DRIFT_SPEED,
                        z: (Math.random() - 0.5) * DRIFT_SPEED
                    }
                };
                nodes.unshift(newNode);
                if (nodes.length > MAX_NODES) {
                    nodes.pop();
                }
            }

            // Deriva orgánica (Cerebro)
            for (let i = nodes.length - 1; i >= 0; i--) {
                nodes[i].x += nodes[i].drift.x;
                nodes[i].y += nodes[i].drift.y;
                nodes[i].z += nodes[i].drift.z;
                nodes[i].age += 1;

                if (nodes[i].age > 240) { // Cycle memory faster
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
    const { projectedNodes, connections, topNodes } = useMemo(() => {
        const nodes = nodesRef.current;
        const proj = [];
        const lines = [];

        const angle = renderTick * 0.0003;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        // A. Proyectar Nodos (Cúmulo Central - Cerebro)
        nodes.forEach((n, i) => {
            const rx = n.x * cosA - n.z * sinA;
            const rz = n.x * sinA + n.z * cosA;

            const scale = FOCAL_LENGTH / (FOCAL_LENGTH + rz + 700);
            const px = SCREEN_W / 2 + rx * scale;
            const py = SCREEN_H / 2 + n.y * scale;

            const opacity = Math.max(0, 1 - n.age / 240);
            if (opacity <= 0.01) return;

            proj.push({ ...n, px, py, scale, opacity });
        });

        // B. Formación de Red (Basado en Reglas)
        for (let i = 0; i < proj.length; i++) {
            const nodeA = proj[i];
            let connCount = 0;

            // Dinamical limit on connections based on energy
            // HIGH ENERGY = MORE CONNECTIONS
            let maxConns = nodeA.energy > 0.5 ? 5 : 2;

            const limit = Math.min(i + 20, proj.length); // Reducir complejidad O(n^2)
            for (let j = i + 1; j < limit; j++) {
                const nodeB = proj[j];
                let shouldConnect = false;
                let strokeW = 0.2;

                const dx = nodeA.x - nodeB.x;
                const dy = nodeA.y - nodeB.y;
                const dz = nodeA.z - nodeB.z;
                const distSq = dx * dx + dy * dy + dz * dz;
                const distance3D = Math.sqrt(distSq);

                // Conexiones por proximidad 3D (Cerebro)
                if (distance3D < CONNECTION_MAX_DIST) {
                    shouldConnect = true;
                    strokeW = Math.max(0.1, nodeA.intensity * 0.5);
                }

                if (shouldConnect) {
                    const distOpacity = Math.max(0.1, 1 - (distance3D / CONNECTION_MAX_DIST));

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
        // Sort nodes to pick the most active ones for numerical labels
        const highlights = proj
            .filter(n => n.intensity > 0.4 && n.px > 0 && n.px < SCREEN_W)
            .sort((a, b) => b.intensity - a.intensity)
            .slice(0, 5);

        return { projectedNodes: proj, connections: lines, topNodes: highlights };
    }, [renderTick]);

    const paletteYStart = SCREEN_H * 0.1;
    const paletteHeight = SCREEN_H * 0.8;

    const labels = [
        { freq: "8k", pos: 0 },
        { freq: "4k", pos: 0.25 },
        { freq: "2k", pos: 0.5 },
        { freq: "500", pos: 0.75 },
        { freq: "20Hz", pos: 1 },
    ];

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

                {/* Nodos (Neuronas Brillantes Simplificadas) */}
                {projectedNodes.map(n => {
                    const size = (1.5 + n.intensity * 3) * n.scale;

                    return (
                        <Group key={`n-${n.id}`} opacity={n.opacity}>
                            <Rect
                                x={n.px - size / 2}
                                y={n.py - size / 2}
                                width={size}
                                height={size}
                                color={n.color}
                            />
                            {/* Halo simplificado */}
                            <Circle
                                cx={n.px}
                                cy={n.py}
                                r={size * 1.2}
                                color={n.color}
                                opacity={0.3}
                            />
                        </Group>
                    );
                })}

                {/* Paleta de Colores Lateral (Derecha) */}
                <Group>
                    <Rect
                        x={SCREEN_W - 15}
                        y={paletteYStart}
                        width={3}
                        height={paletteHeight}
                        opacity={0.8}
                    >
                        <LinearGradient
                            start={vec(0, paletteYStart)}
                            end={vec(0, paletteYStart + paletteHeight)}
                            colors={[...SPECTRAL_PALETTE].reverse()}
                        />
                    </Rect>
                </Group>
            </Canvas>

            {/* Etiquetas de Frecuencia */}
            <View style={styles.labelContainer}>
                {/* Etiquetas fijas de escala */}
                {labels.map((lbl, idx) => (
                    <View
                        key={idx}
                        style={[
                            styles.labelWrapper,
                            { top: paletteYStart + (lbl.pos * paletteHeight) - 8 }
                        ]}
                    >
                        <Text style={styles.labelText}>{lbl.freq}</Text>
                        <View style={styles.labelTick} />
                    </View>
                ))}
            </View>

            {/* Valores Telemetría dinámicos sobre los nodos más activos */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                {topNodes.map(n => (
                    <View
                        key={`lbl-${n.id}`}
                        style={[styles.nodeLabel, { left: n.px + 10, top: n.py - 10 }]}
                    >
                        <Text style={styles.nodeLabelText}>
                            {(n.freq / 100).toFixed(2)}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    canvasContainer: { width: SCREEN_W, height: SCREEN_H },
    labelContainer: {
        position: 'absolute',
        right: 20,
        height: SCREEN_H,
        justifyContent: 'flex-start',
    },
    labelWrapper: {
        position: 'absolute',
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
    },
    labelText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 10,
        marginRight: 8,
        fontWeight: '300',
    },
    labelTick: {
        width: 10,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    nodeLabel: {
        position: 'absolute',
        padding: 2,
        borderLeftWidth: 1,
        borderBottomWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    nodeLabelText: {
        color: 'white',
        fontSize: 9,
        fontWeight: 'bold',
        textShadowColor: 'black',
        textShadowRadius: 2,
    }
});

export default SoundGraph;
