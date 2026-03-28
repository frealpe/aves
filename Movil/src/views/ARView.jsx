import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Button } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Canvas } from '@react-three/fiber/native';
import useAppWebSocket from '../hook/useAppWebSocket';
import useDeviceStore from '../store/useDeviceStore';

// Polyfill for Three.js to prevent "Cannot read property 'S' of undefined" (DOM access)
if (typeof document === 'undefined') {
    global.document = {
        createElement: () => ({
            style: {},
            addEventListener: () => { },
            removeEventListener: () => { },
        }),
    };
}

export default function ARView() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scannedIp, setScannedIp] = useState(null);
    const [isARMode, setIsARMode] = useState(false);

    // Using the new WebSocket hook from the git pull
    const wsUrl = isARMode && scannedIp ? `ws://${scannedIp}/ws` : null;
    const { isOnline, sendCommand } = useAppWebSocket(wsUrl);
    const telemetry = useDeviceStore(state => state.telemetry);

    const handleBarcodeScanned = ({ type, data }) => {
        const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
        if (ipRegex.test(data) && !isARMode) {
            setScannedIp(data);
            setIsARMode(true);
        }
    };

    if (!permission) {
        return <View style={styles.container}><Text style={styles.text}>Requesting camera permission...</Text></View>;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>No access to camera</Text>
                <Button title="Grant Permission" onPress={requestPermission} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {!isARMode ? (
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    barcodeScannerSettings={{
                        barcodeTypes: ["qr"],
                    }}
                    onBarcodeScanned={handleBarcodeScanned}
                >
                    <View style={styles.overlay}>
                        <Text style={styles.overlayText}>Scan QR (TherianWalk)</Text>
                        <TouchableOpacity
                            style={styles.manualButton}
                            onPress={() => {
                                setScannedIp('192.168.4.1'); // Default ESP32 AP IP
                                setIsARMode(true);
                            }}
                        >
                            <Text style={styles.buttonText}>Conexión Manual (Test)</Text>
                        </TouchableOpacity>
                    </View>
                </CameraView>
            ) : (
                <View style={styles.container}>
                    {/* Background Camera */}
                    <CameraView style={StyleSheet.absoluteFillObject} />

                    {/* 3D Overlay */}
                    <View style={StyleSheet.absoluteFillObject}>
                        <Canvas camera={{ position: [0, 0, 5] }}>
                            <ambientLight intensity={0.5} />
                            <pointLight position={[10, 10, 10]} />
                            <mesh position={[0, 0, 0]}>
                                <torusKnotGeometry args={[0.6, 0.2, 100, 16]} />
                                <meshStandardMaterial color={isOnline ? "green" : "orange"} />
                            </mesh>
                        </Canvas>
                    </View>

                    {/* UI Overlay */}
                    <View style={styles.uiOverlay}>
                        <Text style={styles.statusText}>
                            IoT: {isOnline ? 'CONECTADO 📡' : 'CONECTANDO... ⏳'}
                        </Text>

                        {telemetry && (
                            <Text style={styles.telemetryText}>
                                V: {telemetry.v} | {telemetry.msg || ''}
                            </Text>
                        )}

                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                style={[styles.button, !isOnline && styles.buttonDisabled]}
                                onPress={() => sendCommand('avatar', 'saludar')}
                                disabled={!isOnline}
                            >
                                <Text style={styles.buttonText}>Saludar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, !isOnline && styles.buttonDisabled]}
                                onPress={() => sendCommand('device', 'led_on')}
                                disabled={!isOnline}
                            >
                                <Text style={styles.buttonText}>LED ON</Text>
                            </TouchableOpacity>
                        </View>

                        <Button title="Desconectar" onPress={() => {
                            setIsARMode(false);
                            setScannedIp(null);
                        }} />
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    text: { color: 'white', textAlign: 'center' },
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
    overlayText: { fontSize: 24, color: 'white', fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, marginBottom: 20 },
    manualButton: { backgroundColor: 'white', padding: 15, borderRadius: 10, alignItems: 'center' },
    uiOverlay: { position: 'absolute', bottom: 50, width: '100%', alignItems: 'center', paddingHorizontal: 20 },
    statusText: { fontSize: 20, color: 'white', fontWeight: 'bold', marginBottom: 10, padding: 5, borderRadius: 5, backgroundColor: 'rgba(0,0,0,0.6)' },
    telemetryText: { color: '#00ff00', fontSize: 16, marginBottom: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 5 },
    buttonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 10 },
    button: { backgroundColor: '#2196f3', padding: 15, borderRadius: 10, flex: 1, marginHorizontal: 5, alignItems: 'center' },
    buttonDisabled: { backgroundColor: '#555' },
    buttonText: { color: 'white', fontWeight: 'bold' }
});