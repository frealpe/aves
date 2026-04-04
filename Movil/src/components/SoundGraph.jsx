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

            // Generar nuevo nodo si hay sonido suficiente (Ganancia x4)
            if (maxVal > 0.05) {
                const intensity = Math.min(maxVal / 1.5, 1.0);
                const newNode = {
                    id: Date.now() + Math.random(),
                    x: 0,
                    // Spread vertical total (2.2x) para ocupar toda la pantalla
                    y: (dominantIdx / BANDS_COUNT - 0.5) * SCREEN_H * 2.2 + (Math.random() - 0.5) * 100,
                    z: (Math.random() - 0.5) * 500,
                    bandIdx: dominantIdx,
                    intensity,
                    // Rotar colores para que no sea solo azul si el tono es bajo
                    color: getColorForBand((dominantIdx + Math.floor(Date.now() / 1000)) % BANDS_COUNT),
                    age: 0,
                    dir: Math.random() > 0.5 ? 1 : -1 // Dirección aleatoria para centrar
                };
                nodes.unshift(newNode);
                if (nodes.length > 180) nodes.pop(); // Líite 180 para 60fps
            }

            // Actualizar posiciones (Scroll Simétrico)
            for (let i = 0; i < nodes.length; i++) {
                nodes[i].x += 4.0 * nodes[i].dir; // Se abren desde el centro
                nodes[i].age += 1;
            }

            setRenderTick(performance.now());
            frameId = requestAnimationFrame(loop);
        };

        console.log("[SoundGraph] Seeing Birdsong 2.0: Expansión Total");
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

        // A. Proyectar Nodos (Ultra-Wide + Ultra-Tall)
        nodes.forEach((n, i) => {
            const rx = (n.x * 1.25) * cosA - n.z * sinA;
            const rz = (n.x * 1.25) * sinA + n.z * cosA;

            const scale = FOCAL_LENGTH / (FOCAL_LENGTH + rz + 650);
            const px = SCREEN_W / 2 + rx * scale;
            const py = SCREEN_H / 2 + (n.y * 1.8 + Math.sin(n.id) * 20) * scale; // Proyección más alta y orgánica

            const opacity = Math.max(0, 1 - n.age / 180);
            if (opacity <= 0.01) return;

            proj.push({ ...n, px, py, scale, opacity });
        });

        // B. Formación de Red (OPTIMIZADA)
        for (let i = 0; i < proj.length; i++) {
            const nodeA = proj[i];
            let connCount = 0;
            const maxConns = 6;

            const limit = Math.min(i + 45, proj.length); // SCAN_DEPTH ligero (45)
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
                    if (distSq < 25000 && connCount < 2) { // Rango distSq más amplio
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
