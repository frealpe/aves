import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Canvas, Circle, Line, Group, vec, Rect } from '@shopify/react-native-skia';

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
            const bands = featuresRef.current?.bands || [];
            const nodes = nodesRef.current;

            // Encontrar banda dominante (Frecuencia)
            let maxVal = 0;
            let dominantIdx = -1;
            for (let i = 0; i < BANDS_COUNT; i++) {
                if (bands[i] > maxVal) {
                    maxVal = bands[i];
                    dominantIdx = i;
                }
            }

            // Generar nuevo nodo si hay sonido suficiente (Sensibilidad Máxima: 0.005)
            if (maxVal > 0.005) {
                const intensity = Math.min((maxVal * 4.0) / 1.5, 1.0);
                const newNode = {
                    id: Date.now() + Math.random(),
                    x: 0,
                    // Spread vertical total para ocupar toda la pantalla
                    y: (dominantIdx / BANDS_COUNT - 0.5) * SCREEN_H * 2.2 + (Math.random() - 0.5) * 60,
                    z: (Math.random() - 0.5) * 500,
                    bandIdx: dominantIdx,
                    intensity,
                    // Color espectral vibrante
                    color: getColorForBand(dominantIdx),
                    age: 0,
                    side: Math.random() > 0.5 ? 1 : -1 // Amplitud en ambos lados
                };
                nodes.unshift(newNode);
                if (nodes.length > 300) nodes.pop();
            }

            // Actualizar posiciones (Scroll Orgánico y Lento)
            for (let i = 0; i < nodes.length; i++) {
                nodes[i].x += 2.5; // Un poco más lento para que duren más en pantalla
                nodes[i].age += 1;
            }

            setRenderTick(performance.now());
            frameId = requestAnimationFrame(loop);
        };

        console.log("[SoundGraph] Seeing Birdsong 2.0: Rescate de Visibilidad");
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

        if (nodes.length < 5) {
            // Nodo de DEPURAICON FORCE
            proj.push({ id: 'debug', px: SCREEN_W / 2, py: SCREEN_H / 2, scale: 2, opacity: 1, color: 'red', intensity: 1 });
        }

        // A. Proyectar Nodos (Wide Panoramic Balanceado)
        nodes.forEach((n, i) => {
            // Factor 0.8 es mucho más conservador para 1080p
            const rx = (n.x * 0.8 * n.side) * cosA - n.z * sinA;
            const rz = (n.x * 0.8 * n.side) * sinA + n.z * cosA;

            const scale = FOCAL_LENGTH / (FOCAL_LENGTH + rz + 650);
            const px = SCREEN_W / 2 + rx * scale;
            const py = SCREEN_H / 2 + (n.y + Math.sin(n.id) * 20) * scale;

            const opacity = Math.max(0, 1 - n.age / 300);
            if (opacity <= 0.01) return;

            proj.push({ ...n, px, py, scale, opacity });
        });

        // B. Formación de Red (OPTIMIZADA)
        for (let i = 0; i < proj.length; i++) {
            const nodeA = proj[i];
            let connCount = 0;
            const maxConns = 8;

            const limit = Math.min(i + 45, proj.length); // SCAN_DEPTH equilibrado (60)
            for (let j = i + 1; j < limit; j++) {
                const nodeB = proj[j];
                let shouldConnect = false;
                let strokeW = 1.0;

                if (j === i + 1) {
                    shouldConnect = true;
                    strokeW = 2.4;
                }
                else if (Math.abs(nodeA.bandIdx - nodeB.bandIdx) <= 1 && connCount < 3) {
                    shouldConnect = true;
                    strokeW = 1.2;
                }
                else {
                    const dx = nodeA.px - nodeB.px;
                    const dy = nodeA.py - nodeB.py;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < 20000 && connCount < 3) {
                        shouldConnect = true;
                        strokeW = 0.8;
                    }
                }

                if (shouldConnect) {
                    lines.push({
                        p1: vec(nodeA.px, nodeA.py),
                        p2: vec(nodeB.px, nodeB.py),
                        color: nodeA.color,
                        opacity: Math.min(nodeA.opacity, nodeB.opacity) * 0.5,
                        strokeW
                    });
                    connCount++;
                }
                if (connCount > maxConns) break;
            }
        }

        if (renderTick % 100 < 1) {
            console.log(`[SoundGraph] Telemetría: Nodos=${nodes.length}, Proyectados=${proj.length}, Conexiones=${lines.length}, W=${SCREEN_W}, H=${SCREEN_H}, yMid=${nodes[0]?.y.toFixed(0)}`);
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
                        color={l.color} opacity={l.opacity}
                        strokeWidth={l.strokeW}
                    />
                ))}

                {/* Nodos (Diseño Réplica) */}
                {projectedNodes.map(n => {
                    // Tamaño más agresivo (Réplica imagen)
                    const size = (10 + n.intensity * 25) * n.scale;
                    const labelVal = n.intensity.toFixed(2);

                    return (
                        <Group key={`n-${n.id}`} opacity={n.opacity}>
                            {/* Cuadrado Exterior (Borde Blanco) */}
                            <Rect
                                x={n.px - size / 2}
                                y={n.py - size / 2}
                                width={size}
                                height={size}
                                color="white"
                                style="stroke"
                                strokeWidth={1.5}
                            />
                            {/* Centro de Color (Réplica) */}
                            <Rect
                                x={n.px - size / 4}
                                y={n.py - size / 4}
                                width={size / 2}
                                height={size / 2}
                                color={n.color}
                                opacity={0.85}
                            />
                            {/* Indicador de Datos Sutil (Sin fuente externa) */}
                            <Rect
                                x={n.px + size / 2 + 2}
                                y={n.py - size / 2}
                                width={size * 0.4}
                                height={2}
                                color="white"
                                opacity={0.3}
                            />
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
