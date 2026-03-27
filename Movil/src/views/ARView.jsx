import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Button } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Canvas, useFrame } from '@react-three/fiber';
import { useWebSocket } from '../hook/useWebSocket';

export default function ARView() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scannedIp, setScannedIp] = useState(null);
    const [isARMode, setIsARMode] = useState(false);

    // Web socket logic handled in next step but we keep track of the IP
    const handleBarcodeScanned = ({ type, data }) => {
        // e.g. "192.168.4.1"
        const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
        if (ipRegex.test(data) && !isARMode) {
            console.log("Scanned IP:", data);
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

    const wsUrl = isARMode && scannedIp ? `ws://${scannedIp}/ws` : null;
    const { isConnected, sendAnimation, controlLed } = useWebSocket(wsUrl);

    const [animationState, setAnimationState] = useState('idle');

    // Enhanced Avatar component using distinct geometry and movement to simulate animation states
    const EnhancedAvatar = (props) => {
        const meshRef = useRef(null);
        const [color, setColor] = useState('gray');

        useEffect(() => {
            if (!isConnected) {
                setColor('red'); // "error"
                setAnimationState('error');
            } else {
                setColor('green');
                setAnimationState('idle');
            }
        }, [isConnected]);

        useFrame((state, delta) => {
            if (meshRef.current) {
                if (animationState === 'idle') {
                    // Gentle floating
                    meshRef.current.position.y = props.position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
                    meshRef.current.rotation.y += delta * 0.5;
                } else if (animationState === 'saludar') {
                    // Wiggle/Wave effect
                    meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 10) * 0.5;
                    meshRef.current.rotation.y += delta * 2;
                } else if (animationState === 'hablar') {
                    // Bouncing effect
                    meshRef.current.position.y = props.position[1] + Math.abs(Math.sin(state.clock.elapsedTime * 8)) * 0.5;
                } else if (animationState === 'error') {
                    // Shaking
                    meshRef.current.position.x = props.position[0] + Math.sin(state.clock.elapsedTime * 20) * 0.1;
                }
            }
        });

        return (
            <mesh {...props} ref={meshRef}>
                {/* Use a TorusKnot to look a bit more complex than a box */}
                <torusKnotGeometry args={[0.6, 0.2, 100, 16]} />
                <meshStandardMaterial color={color} />
            </mesh>
        );
    };

    const handleAnimation = (anim) => {
        setAnimationState(anim);
        sendAnimation(anim);

        // Return to idle after animation finishes
        if (anim !== 'idle' && anim !== 'error') {
            setTimeout(() => {
                if (isConnected) setAnimationState('idle');
            }, 3000);
        }
    };

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
                        <Text style={styles.overlayText}>Scan QR to Connect</Text>
                    </View>
                </CameraView>
            ) : (
                <View style={styles.container}>
                    {/* Background Camera */}
                    <CameraView style={StyleSheet.absoluteFillObject} />

                    {/* 3D Overlay */}
                    <View style={StyleSheet.absoluteFillObject}>
                        <Canvas camera={{ position: [0, 0, 5] }} gl={{ alpha: true }}>
                            <ambientLight intensity={0.5} />
                            <pointLight position={[10, 10, 10]} />
                            <EnhancedAvatar position={[0, 0, 0]} />
                        </Canvas>
                    </View>

                    {/* UI Overlay */}
                    <View style={styles.uiOverlay}>
                        <Text style={styles.statusText}>
                            Status: {isConnected ? 'Connected' : 'Connecting...'} ({scannedIp})
                        </Text>

                        <View style={styles.buttonRow}>
                            <TouchableOpacity style={styles.button} onPress={() => handleAnimation('saludar')}>
                                <Text style={styles.buttonText}>Saludar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.button} onPress={() => handleAnimation('hablar')}>
                                <Text style={styles.buttonText}>Hablar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.button} onPress={() => controlLed(true)}>
                                <Text style={styles.buttonText}>LED On</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.button} onPress={() => controlLed(false)}>
                                <Text style={styles.buttonText}>LED Off</Text>
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
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
        justifyContent: 'center',
    },
    text: {
        color: '#fff',
        textAlign: 'center',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center'
    },
    overlayText: {
        fontSize: 24,
        color: 'white',
        fontWeight: 'bold',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 10,
        borderRadius: 5
    },
    uiOverlay: {
        position: 'absolute',
        bottom: 50,
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 20
    },
    statusText: {
        fontSize: 18,
        color: 'white',
        fontWeight: 'bold',
        marginBottom: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 5,
        borderRadius: 5
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 10
    },
    button: {
        backgroundColor: '#2196f3',
        padding: 10,
        borderRadius: 5,
        flex: 1,
        marginHorizontal: 5,
        alignItems: 'center'
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold'
    }
});