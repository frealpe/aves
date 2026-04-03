/**
 * HomeScreen.jsx — Rediseño completo del Smart Badge Terminal.
 *
 * Características:
 * - Diseño cohesivo en ScrollView (no partido)
 * - Menú hamburguesa lateral (Drawer)
 * - Escáner de red: escanea IPs automáticas (192.168.x.x) para encontrar el ESP32
 * - Panel de Smart Badge: selección y envío de imagen
 * - Telemetría en tiempo real via WebSocket
 */
import React, { useState, useRef, useCallback } from 'react';
import {
    StyleSheet, View, Text, SafeAreaView, StatusBar,
    TouchableOpacity, TextInput, ScrollView, Modal,
    Animated, ActivityIndicator, Image,
    Platform, Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
    Wifi, Cpu, Menu, X, Image as ImageIcon,
    Send, Zap, Battery, Signal, RefreshCw,
    CheckCircle, AlertCircle, ChevronRight, Link, Link2,
    Activity, Layout,
} from 'lucide-react-native';
import { Theme } from '../styles/Theme';
import useAppWebSocket, { wsManager } from '../hook/useAppWebSocket';
import useDeviceStore from '../store/useDeviceStore';
import useBadge from '../hook/useBadge';

const XENON_IMG = require('../../assets/xenon_04.png');

const { width: SCREEN_W } = Dimensions.get('window');
const DRAWER_W = SCREEN_W * 0.78;

// ─────────────────────────────────────────────
// Constantes y Utilidades (Top-level para evitar race conditions)
// ─────────────────────────────────────────────
const COMMON_PORTS = ['192.168.1.198', '192.168.4.1', '192.168.1.1', '192.168.0.1'];

async function probeIP(ip) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 800);
    try {
        const res = await fetch(`http://${ip}/api/index`, { method: 'GET', signal: controller.signal });
        clearTimeout(timer);
        if (res.ok) return ip;
    } catch (_) {
        clearTimeout(timer);
    }
    return null;
}

// ─────────────────────────────────────────────
// Estilos (Definidos al inicio para evitar ReferenceError en Bridgeless)
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Theme.colors.bg },

    // ── Header ──
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Theme.spacing.lg,
        paddingTop: Platform.OS === 'ios' ? 0 : 12,
        paddingBottom: 20,
        backgroundColor: Theme.colors.bg,
    },
    hamburger: { padding: 4 },
    headerCenter: { flex: 1, alignItems: 'flex-start', paddingLeft: 20 },
    headerTitle: {
        color: Theme.colors.primary,
        fontSize: 10,
        fontFamily: Theme.fonts.headline,
        letterSpacing: 4,
        marginBottom: 2,
    },
    headerSub: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusIndicator: { width: 4, height: 4, borderRadius: 2 },
    headerIp: {
        color: Theme.colors.textSecondary,
        fontSize: 8,
        fontFamily: Theme.fonts.mono,
        letterSpacing: 1,
        opacity: 0.6
    },
    headerAction: { padding: 4 },

    // ── Pet Card (HUD Center) ──
    petCard: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: Theme.colors.surfaceLow,
        borderRadius: Theme.borderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Theme.colors.outlineVariant,
        position: 'relative',
    },
    petImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    petOverlay: {
        ...StyleSheet.absoluteFillObject,
        padding: Theme.spacing.lg,
        justifyContent: 'space-between',
    },
    petTag: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        borderLeftWidth: 2,
        borderLeftColor: Theme.colors.primary,
    },
    petTagTxt: {
        color: Theme.colors.primary,
        fontSize: 8,
        fontFamily: Theme.fonts.mono,
        letterSpacing: 1,
    },
    petStatus: {
        alignSelf: 'flex-end',
        alignItems: 'flex-end',
    },
    petName: {
        color: Theme.colors.text,
        fontSize: 24,
        fontFamily: Theme.fonts.headline,
        letterSpacing: 2,
    },
    petLink: {
        color: '#00e676',
        fontSize: 9,
        fontFamily: Theme.fonts.headline,
        letterSpacing: 1,
        marginTop: 2,
    },

    // ── Progress Bar ──
    progressOuter: {
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.05)',
        width: '100%',
        marginTop: 10,
    },
    progressInner: {
        height: '100%',
        backgroundColor: Theme.colors.primary,
        // Bloom
        shadowColor: Theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },

    // ── Scroll ──
    scroll: { flex: 1 },
    scrollContent: { padding: Theme.spacing.md, gap: 24, paddingBottom: 60 },

    // ── Sections ──
    section: {
        backgroundColor: Theme.colors.surfaceLow,
        borderRadius: Theme.borderRadius.md,
        padding: Theme.spacing.lg,
        gap: 20,
    },
    sectionTitle: {
        color: Theme.colors.primary,
        fontSize: 10,
        fontFamily: Theme.fonts.headline,
        letterSpacing: 3,
        opacity: 0.5,
        textAlign: 'right', // Asimetría HUD
    },
    divider: { height: 0, backgroundColor: 'transparent', marginVertical: 12 }, // Rule: No-Line

    // ── Conexión ──
    connectionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    pulseContainer: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
    pulseRing: {
        position: 'absolute',
        width: 50, height: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: Theme.colors.error,
        opacity: 0.1,
    },
    pulseRingActive: { borderColor: Theme.colors.success, opacity: 0.15 },
    pulseDot: { width: 12, height: 12, borderRadius: 6 },

    connectionInfo: { flex: 1 },
    connectionLabel: {
        color: Theme.colors.textSecondary,
        fontSize: 10,
        fontFamily: Theme.fonts.headline,
        letterSpacing: 2,
        textTransform: 'uppercase'
    },
    connectionIp: {
        fontSize: 22,
        fontFamily: Theme.fonts.mono,
        color: Theme.colors.text,
        marginTop: 4,
        letterSpacing: 1,
    },
    connectionState: {
        fontSize: 11,
        fontFamily: Theme.fonts.headline,
        marginTop: 6,
        letterSpacing: 1,
        textTransform: 'uppercase'
    },

    scanQuickBtn: {
        backgroundColor: Theme.colors.surfaceHigh,
        padding: 12,
        borderRadius: Theme.borderRadius.md,
    },

    // ── Telemetría ──
    metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    metricCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: Theme.colors.surfaceHigh,
        borderRadius: Theme.borderRadius.md,
        padding: Theme.spacing.md,
        gap: 8,
    },
    metricHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    metricDot: { width: 3, height: 3, borderRadius: 1.5, opacity: 0.8 },
    metricValue: {
        fontSize: 24,
        fontFamily: Theme.fonts.mono,
        letterSpacing: -1,
    },
    metricLabel: {
        color: Theme.colors.textSecondary,
        fontSize: 9,
        fontFamily: Theme.fonts.headline,
        letterSpacing: 2,
        textTransform: 'uppercase',
        opacity: 0.6,
    },
    offlineHint: { color: Theme.colors.textSecondary, fontSize: 11, textAlign: 'center', opacity: 0.5, marginTop: 10 },

    // ── Comandos (Bottom HUD Actions) ──
    cmdGrid: { flexDirection: 'row', gap: 12 },
    cmdBtn: {
        flex: 1,
        height: 50,
        borderRadius: Theme.borderRadius.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Theme.colors.surfaceHigh,
        borderWidth: 1,
    },
    cmdBtnActive: {
        backgroundColor: 'rgba(153, 247, 255, 0.1)',
        borderColor: Theme.colors.primary,
    },
    cmdBtnText: {
        fontSize: 10,
        fontFamily: Theme.fonts.headline,
        letterSpacing: 1,
        textTransform: 'uppercase'
    },

    // ── Smart Badge ──
    badgeRow: { flexDirection: 'row', gap: 20, alignItems: 'center' },
    badgeThumb: {
        width: 90, height: 90,
        borderRadius: Theme.borderRadius.md,
        backgroundColor: Theme.colors.surfaceHigh,
    },
    badgeImgContainer: {
        width: '100%', height: '100%',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        borderRadius: Theme.borderRadius.md
    },
    badgeImg: { width: '100%', height: '100%' },
    badgePlaceholder: { alignItems: 'center', gap: 8 },
    badgePlaceholderText: { color: Theme.colors.textSecondary, fontSize: 8, fontWeight: '900', letterSpacing: 2 },
    badgeActions: { flex: 1, gap: 12 },
    badgePickBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        paddingVertical: 12,
        borderRadius: Theme.borderRadius.xs,
        backgroundColor: Theme.colors.surfaceHigh,
    },
    badgeSendBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        paddingVertical: 14,
        borderRadius: Theme.borderRadius.xs,
        backgroundColor: Theme.colors.primary,
        // Bloom Effect
        shadowColor: Theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
        elevation: 6,
    },
    badgeClearBtn: {
        position: 'absolute', top: -6, right: -6,
        padding: 5,
        borderRadius: Theme.borderRadius.round,
        backgroundColor: Theme.colors.surfaceBright,
        zIndex: 10,
    },
    badgeBtnTxt: {
        color: '#000',
        fontSize: 10,
        fontFamily: Theme.fonts.headline,
        letterSpacing: 2
    },
    btnDisabled: { opacity: 0.2 },
    feedbackRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
    feedbackTxt: { fontSize: 11, color: Theme.colors.textSecondary, flex: 1, textTransform: 'uppercase', letterSpacing: 1 },

    // ── Drawer ──
    drawerBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    drawer: {
        position: 'absolute',
        top: 0, left: 0, bottom: 0,
        width: DRAWER_W,
        backgroundColor: 'transparent',
        overflow: 'hidden',
    },
    drawerInner: {
        flex: 1,
        padding: Theme.spacing.xl,
        paddingTop: Platform.OS === 'android' ? 60 : 80,
        gap: 24,
    },
    drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    drawerBrand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    drawerBrandText: {
        color: Theme.colors.primary,
        fontSize: 18,
        fontFamily: Theme.fonts.headline,
        letterSpacing: 4
    },
    drawerSection: {
        color: Theme.colors.primary,
        fontSize: 10,
        fontFamily: Theme.fonts.headline,
        letterSpacing: 3,
        opacity: 0.4,
        textTransform: 'uppercase'
    },
    drawerStatusRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 16,
        borderRadius: Theme.borderRadius.md
    },
    drawerStatusText: { fontSize: 10, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
    ipRow: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: Theme.borderRadius.md,
        paddingHorizontal: 16, paddingVertical: 14,
    },
    drawerInput: {
        flex: 1, color: Theme.colors.primary,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 15,
        letterSpacing: 2,
    },
    drawerBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
        paddingVertical: 18,
        borderRadius: Theme.borderRadius.md,
    },
    scanBtn: { backgroundColor: 'rgba(255,255,255,0.05)' },
    connectBtn: {
        backgroundColor: Theme.colors.primary,
        // Bloom Effect
        shadowColor: Theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
    },
    disconnectBtn: { backgroundColor: 'rgba(255,113,108,0.1)' },
    drawerBtnText: { fontSize: 12, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
    drawerHint: {
        color: Theme.colors.textSecondary,
        fontSize: 9,
        lineHeight: 18,
        opacity: 0.5,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        textTransform: 'uppercase'
    },

    // ── StatusDot & Dots ──
    dot: { width: 6, height: 6, borderRadius: 3 },

    // ── Scan Quick Button Text ──
    scanQuickTxt: {
        color: Theme.colors.primary,
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 2,
        marginTop: 4,
        textAlign: 'center',
    },
});

// ─────────────────────────────────────────────
// Utilidades de UI
// ─────────────────────────────────────────────
const Divider = () => <View style={styles.divider} />;

const StatusDot = ({ online }) => (
    <View style={{
        width: 6, height: 6, borderRadius: 3,
        backgroundColor: online ? Theme.colors.success : Theme.colors.error
    }} />
);

const MetricCard = ({ label, value, color = Theme.colors.primary }) => (
    <View style={styles.metricCard}>
        <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>{label}</Text>
            <View style={[styles.metricDot, { backgroundColor: color }]} />
        </View>
        <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
);

// ─────────────────────────────────────────────
// Drawer (menú hamburguesa lateral)
// ─────────────────────────────────────────────
const DrawerMenu = ({ visible, onClose, ip, onIpChange, isOnline, onConnect, onDisconnect, onScan, scanning }) => {
    const translateX = useRef(new Animated.Value(-DRAWER_W)).current;

    React.useEffect(() => {
        Animated.spring(translateX, {
            toValue: visible ? 0 : -DRAWER_W,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
        }).start();
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            {/* Backdrop */}
            <TouchableOpacity style={styles.drawerBackdrop} activeOpacity={1} onPress={onClose} />

            {/* Panel */}
            <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
                <BlurView intensity={60} style={StyleSheet.absoluteFill} tint="dark" />
                <View style={styles.drawerInner}>
                    {/* Drawer Header */}
                    <View style={styles.drawerHeader}>
                        <View style={styles.drawerBrand}>
                            <Cpu size={18} color={Theme.colors.primary} />
                            <Text style={styles.drawerBrandText}>THERIAN_CTRL</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <X size={20} color={Theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <Divider />

                    {/* Conexión ESP32 */}
                    <Text style={styles.drawerSection}>CONEXIÓN_PUERTO</Text>

                    {/* Status */}
                    <View style={styles.drawerStatusRow}>
                        <StatusDot online={isOnline} />
                        <Text style={[styles.drawerStatusText, { color: isOnline ? Theme.colors.success : Theme.colors.textSecondary }]}>
                            {isOnline ? 'ENLACE_ACTIVO' : 'SISTEMA_OFFLINE'}
                        </Text>
                    </View>

                    {/* Campo IP */}
                    <View style={styles.ipRow}>
                        <Wifi size={14} color={Theme.colors.primary} />
                        <TextInput
                            style={styles.drawerInput}
                            value={ip}
                            onChangeText={onIpChange}
                            placeholder="192.168.x.x"
                            placeholderTextColor={Theme.colors.textSecondary}
                            keyboardType="numeric"
                            autoCapitalize="none"
                        />
                    </View>

                    {/* Botón Scan */}
                    <TouchableOpacity
                        style={[styles.drawerBtn, styles.scanBtn]}
                        onPress={onScan}
                        disabled={scanning}
                        activeOpacity={0.8}
                    >
                        {scanning ? (
                            <ActivityIndicator size="small" color={Theme.colors.primary} />
                        ) : (
                            <RefreshCw size={14} color={Theme.colors.primary} />
                        )}
                        <Text style={[styles.drawerBtnText, { color: Theme.colors.primary }]}>
                            {scanning ? 'ESCAN_MAPPING...' : 'ESCANEAR_RED'}
                        </Text>
                    </TouchableOpacity>

                    {/* Botón Connect/Disconnect */}
                    <TouchableOpacity
                        style={[styles.drawerBtn, isOnline ? styles.disconnectBtn : styles.connectBtn]}
                        onPress={isOnline ? onDisconnect : onConnect}
                        activeOpacity={0.8}
                    >
                        {isOnline ? (
                            <Link2 size={14} color={Theme.colors.error} />
                        ) : (
                            <Link size={14} color="#000" />
                        )}
                        <Text style={[styles.drawerBtnText, { color: isOnline ? Theme.colors.error : '#000' }]}>
                            {isOnline ? 'TERMINAR_SESION' : 'INICIAR_ENLACE'}
                        </Text>
                    </TouchableOpacity>

                    <Divider />

                    {/* Info */}
                    <Text style={styles.drawerSection}>CORE_KERNEL_INFO</Text>
                    <Text style={styles.drawerHint}>
                        TRÁFICO: WebSockets (JSON) → ws://{ip}/ws{"\n"}
                        CARGA: HTTP (MULTIPART) → http://{ip}/api/badge/image
                    </Text>
                </View>
            </Animated.View>
        </Modal>
    );
};

// ─────────────────────────────────────────────
// Panel Smart Badge
// ─────────────────────────────────────────────
const BadgePanel = ({ ip, onImageUploaded }) => {
    const { preview, loading, error, success, hasImage, pickImage, sendBadge, reset } = useBadge();

    const handleSend = useCallback(async () => {
        await sendBadge(ip);
        if (onImageUploaded) onImageUploaded();
    }, [ip, sendBadge, onImageUploaded]);

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>SMART_BADGE — ENVÍO DE IMAGEN</Text>

            <View style={styles.badgeRow}>
                {/* Miniatura */}
                <View style={styles.badgeThumb}>
                    <TouchableOpacity
                        onPress={loading ? undefined : pickImage}
                        activeOpacity={0.75}
                        style={styles.badgeImgContainer}
                    >
                        {preview ? (
                            <Image source={{ uri: preview }} style={styles.badgeImg} />
                        ) : (
                            <View style={styles.badgePlaceholder}>
                                <ImageIcon size={24} color={Theme.colors.textSecondary} />
                                <Text style={styles.badgePlaceholderText}>TAP</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {hasImage && !loading && (
                        <TouchableOpacity style={styles.badgeClearBtn} onPress={reset} activeOpacity={0.8}>
                            <X size={12} color={Theme.colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Acciones */}
                <View style={styles.badgeActions}>
                    <TouchableOpacity style={styles.badgePickBtn} onPress={pickImage} disabled={loading} activeOpacity={0.8}>
                        <ImageIcon size={13} color={Theme.colors.primary} />
                        <Text style={[styles.badgeBtnTxt, { color: Theme.colors.primary }]}>GALERÍA</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.badgeSendBtn, (!hasImage || loading) && styles.btnDisabled]}
                        onPress={handleSend}
                        disabled={!hasImage || loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#000" />
                        ) : (
                            <>
                                <Send size={13} color="#000" />
                                <Text style={styles.badgeBtnTxt}>ENVIAR</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Feedback */}
            {success && (
                <View style={styles.feedbackRow}>
                    <CheckCircle size={13} color="#00e676" />
                    <Text style={[styles.feedbackTxt, { color: '#00e676' }]}>Imagen enviada al ESP32 ✓</Text>
                </View>
            )}
            {error && (
                <View style={styles.feedbackRow}>
                    <AlertCircle size={13} color={Theme.colors.secondary} />
                    <Text style={[styles.feedbackTxt, { color: Theme.colors.secondary }]} numberOfLines={2}>{error}</Text>
                </View>
            )}
        </View>
    );
};


// ─────────────────────────────────────────────
// Pantalla principal
// ─────────────────────────────────────────────
const HomeScreen = () => {
    const isOnline = useDeviceStore((s) => s.isConnected);
    const telemetry = useDeviceStore((s) => s.telemetry) || {};

    const [ip, setIp] = useState('192.168.1.198');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [scanResults, setScanResults] = useState([]);
    // Timestamp para forzar recarga de imagen sin recopilar el cache de React Native
    const [imageTs, setImageTs] = useState(Date.now());
    const [imageError, setImageError] = useState(false);

    // Una sola instancia del hook — pasa la URL completa
    const wsUrl = `ws://${ip}/ws`;
    const { sendCommand } = useAppWebSocket(wsUrl);

    // Recargar imagen cuando cambia la IP
    React.useEffect(() => {
        setImageTs(Date.now());
        setImageError(false);
    }, [ip]);

    // ── Conexión ──────────────────────────────
    const handleConnect = useCallback(() => {
        // Forzar reconexión aunque haya fallback activo
        wsManager.isFallbackMode = false;
        wsManager.reconnectAttempts = 0;
        wsManager.setUrl(`ws://${ip}/ws`);
    }, [ip]);

    const handleDisconnect = useCallback(() => {
        if (wsManager.ws) {
            wsManager.url = null; // Evita reconexión automática
            wsManager.ws.close();
        }
    }, []);

    // ── Escaneo de red ────────────────────────
    const handleScan = useCallback(async () => {
        setScanning(true);
        setScanResults([]);
        const found = [];

        // Probar IPs comunes primero
        for (const candidate of COMMON_PORTS) {
            const result = await probeIP(candidate);
            if (result) found.push(result);
        }

        // Escaneo del rango 192.168.1.x paralelo (lotes de 10)
        const baseSubnet = ip.split('.').slice(0, 3).join('.');
        const batch = [];
        for (let i = 1; i <= 254; i++) {
            batch.push(`${baseSubnet}.${i}`);
        }
        for (let i = 0; i < batch.length; i += 10) {
            const slice = batch.slice(i, i + 10);
            const results = await Promise.all(slice.map(probeIP));
            results.forEach((r) => { if (r && !found.includes(r)) found.push(r); });
        }

        setScanResults(found);
        if (found.length > 0) setIp(found[0]); // auto-selecciona el primero encontrado
        setScanning(false);
    }, [ip]);

    const bat = telemetry?.bat ?? '--';
    const signal = telemetry?.signal ?? '--';
    const heap = telemetry?.free_heap ? `${Math.round(telemetry.free_heap / 1024)}KB` : '--';
    const uptime = telemetry?.uptime ? `${Math.round(telemetry.uptime / 1000)}s` : '--';

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Theme.colors.bg} />

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.hamburger} onPress={() => setDrawerOpen(true)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Menu size={22} color={Theme.colors.text} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>THERIAN_WALK</Text>
                    <View style={styles.headerSub}>
                        <View style={[styles.statusIndicator, { backgroundColor: isOnline ? Theme.colors.success : Theme.colors.error }]} />
                        <Text style={styles.headerIp}>{ip}</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.headerAction} onPress={() => setDrawerOpen(true)}>
                    <RefreshCw size={16} color={isOnline ? Theme.colors.primary : Theme.colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* ── Contenido principal en scroll ── */}
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Pet HUD Center ── */}
                <View style={styles.petCard}>
                    <Image
                        source={imageError ? XENON_IMG : { uri: `http://${ip}/api/badge/serve?t=${imageTs}` }}
                        style={styles.petImage}
                        onError={() => setImageError(true)}
                    />
                </View>

                {/* ── HUD Telemetría ── */}
                <View style={styles.metricsGrid}>
                    <MetricCard label="VOLTAGE" value={isOnline ? '4.2V' : '--'} color={Theme.colors.primary} />
                    <MetricCard label="RESERVE" value={isOnline ? `${bat}%` : '--'} color={Theme.colors.primary} />
                    <MetricCard label="SIGNAL" value={isOnline ? `${signal}dBm` : '--'} color={Theme.colors.primary} />
                </View>

                {/* ── HUD Botones de Acción ── */}
                <View style={styles.cmdGrid}>
                    {[
                        { label: 'FEED', action: 'FEED', icon: <Layout size={14} color={Theme.colors.primary} /> },
                        { label: 'PLAY', action: 'JUMP', icon: <Activity size={14} color={Theme.colors.primary} /> },
                        { label: 'LED ON', action: 'LED_ON', icon: <Zap size={14} color={Theme.colors.primary} /> },
                    ].map((cmd) => (
                        <TouchableOpacity
                            key={cmd.action}
                            style={[styles.cmdBtn, { borderColor: Theme.colors.outlineVariant }]}
                            onPress={() => sendCommand('esp32', cmd.action)}
                            activeOpacity={0.75}
                        >
                            {cmd.icon}
                            <Text style={[styles.cmdBtnText, { color: Theme.colors.primary, marginTop: 4 }]}>{cmd.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Smart Badge (Auxiliary) ── */}
                <BadgePanel
                    ip={ip}
                    onImageUploaded={() => {
                        setImageError(false);
                        setImageTs(Date.now());
                    }}
                />

                {/* Espaciado inferior */}
                <View style={{ height: 24 }} />
            </ScrollView>

            {/* ── Drawer menú hamburguesa ── */}
            <DrawerMenu
                visible={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                ip={ip}
                onIpChange={setIp}
                isOnline={isOnline}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onScan={handleScan}
                scanning={scanning}
            />
        </SafeAreaView>
    );
};


export default HomeScreen;
