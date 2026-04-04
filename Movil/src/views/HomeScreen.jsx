/**
 * HomeScreen.jsx — Rediseño Inmersivo "Seeing Birdsong".
 * 
 * Se ha eliminado la dependencia de WebSocket para funcionar en modo 
 * puramente local con el procesador de audio Skia.
 */
import React, { useState, useCallback } from 'react';
import {
    StyleSheet, View, Text, SafeAreaView, StatusBar,
    TouchableOpacity, Platform, Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
    Menu, RefreshCw, Activity,
    Cpu, X
} from 'lucide-react-native';
import { Theme } from '../styles/Theme';
import useMicrophoneFFT from '../hook/useMicrophoneFFT';
import SoundGraph from '../components/SoundGraph';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const HomeScreen = () => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [fftSize, setFftSize] = useState(1024);

    // El micrófono siempre activo para la visualización inmersiva
    const micFeatures = useMicrophoneFFT(true, fftSize);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            {/* ── Visualización Inmersiva (Fondo Completo) ── */}
            <View style={StyleSheet.absoluteFill}>
                <SoundGraph features={micFeatures} />
            </View>

            {/* ── Header HUD minimalista ── */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.hamburger}
                    onPress={() => setDrawerOpen(true)}
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                    <Menu size={20} color={Theme.colors.primary} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>SEEING_BIRDSONG_v1</Text>
                    <View style={styles.headerSub}>
                        <View style={styles.statusIndicator} />
                        <Text style={styles.headerStatus}>FFT_ENGINE_ACTIVE</Text>
                    </View>
                </View>

                <View style={styles.headerAction}>
                    <Activity size={14} color={Theme.colors.primary} />
                </View>
            </View>

            {/* ── Overlay de Ajustes (Minimalista) ── */}
            {drawerOpen && (
                <View style={StyleSheet.absoluteFill}>
                    <TouchableOpacity
                        style={styles.backdrop}
                        activeOpacity={1}
                        onPress={() => setDrawerOpen(false)}
                    />
                    <View style={styles.settingsPanel}>
                        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={styles.panelInner}>
                            <View style={styles.panelHeader}>
                                <Text style={styles.panelTitle}>CONFIG_SENSORY</Text>
                                <TouchableOpacity onPress={() => setDrawerOpen(false)}>
                                    <X size={20} color={Theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.divider} />

                            <Text style={styles.label}>RESOLUCIÓN ESPECTRAL</Text>
                            <View style={styles.optionsRow}>
                                {[256, 1024, 4096].map(size => (
                                    <TouchableOpacity
                                        key={size}
                                        style={[styles.optBtn, fftSize === size && styles.optBtnActive]}
                                        onPress={() => setFftSize(size)}
                                    >
                                        <Text style={[styles.optText, fftSize === size && styles.optTextActive]}>
                                            {size}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.infoBox}>
                                <Cpu size={14} color={Theme.colors.primary} />
                                <Text style={styles.infoText}>
                                    La malla nodal 3D se genera procesando 16 bandas espectrales en tiempo real mediante JSI/Fabric.
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 25,
        paddingTop: Platform.OS === 'ios' ? 0 : 20,
        height: 80,
        zIndex: 10,
    },
    hamburger: { padding: 5 },
    headerCenter: { flex: 1, marginLeft: 20 },
    headerTitle: {
        color: Theme.colors.primary,
        fontSize: 10,
        fontFamily: Theme.fonts.headline,
        letterSpacing: 4,
    },
    headerSub: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    statusIndicator: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: Theme.colors.success },
    headerStatus: { color: Theme.colors.textSecondary, fontSize: 8, fontFamily: Theme.fonts.mono, opacity: 0.7 },
    headerAction: { opacity: 0.5 },

    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    settingsPanel: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: 350,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
    },
    panelInner: { flex: 1, padding: 30 },
    panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    panelTitle: { color: Theme.colors.primary, fontSize: 12, fontFamily: Theme.fonts.headline, letterSpacing: 2 },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 25 },
    label: { color: Theme.colors.textSecondary, fontSize: 10, fontFamily: Theme.fonts.headline, letterSpacing: 2, marginBottom: 15 },
    optionsRow: { flexDirection: 'row', gap: 10, marginBottom: 30 },
    optBtn: {
        flex: 1, height: 50, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'transparent'
    },
    optBtnActive: { backgroundColor: 'rgba(153, 247, 255, 0.1)', borderColor: Theme.colors.primary },
    optText: { color: Theme.colors.textSecondary, fontSize: 12, fontFamily: Theme.fonts.mono },
    optTextActive: { color: Theme.colors.primary, fontWeight: 'bold' },
    infoBox: {
        flexDirection: 'row', gap: 15, padding: 20,
        backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 15,
        alignItems: 'center'
    },
    infoText: { color: Theme.colors.textSecondary, fontSize: 10, lineHeight: 16, flex: 1, opacity: 0.6 }
});

export default HomeScreen;
