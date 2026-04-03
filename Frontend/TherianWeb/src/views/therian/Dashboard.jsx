import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Float, MeshDistortMaterial } from '@react-three/drei';
import { Activity, Battery, Zap, Shield, ShoppingBag, Terminal, Wifi, WifiOff } from 'lucide-react';
import useDeviceStore from '../../store/useDeviceStore';
import wsManager from '../../lib/WebSocketManager';
import NetworkGraph from '../../components/NetworkGraph';

function TherianAvatar() {
    const isOnline = useDeviceStore((state) => state.isOnline);
    return (
        <>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#99f7ff" />
            <Float speed={2} rotationIntensity={1} floatIntensity={2}>
                <mesh>
                    <torusKnotGeometry args={[1, 0.3, 128, 32]} />
                    <MeshDistortMaterial
                        color={isOnline ? "#00f2ff" : "#ff0066"}
                        speed={3}
                        distort={0.4}
                        roughness={0.1}
                        metalness={0.8}
                        emissive={isOnline ? "#00f2ff" : "#ff0066"}
                        emissiveIntensity={isOnline ? 0.5 : 0.2}
                    />
                </mesh>
            </Float>
            <OrbitControls enableZoom={false} />
        </>
    );
}

function StatPanel({ title, value, icon: Icon, color }) {
    return (
        <div className="stat-card" style={{ borderLeftColor: color, background: 'rgba(28,32,40,0.5)', padding: '1rem', borderRadius: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', opacity: 0.7 }}>
                <Icon size={16} />
                <span>{title}</span>
            </div>
            <div className="stat-value neon-text" style={{ color, fontSize: '1.5rem', fontWeight: 'bold' }}>{value}</div>
        </div>
    );
}

const Dashboard = () => {
    const { isOnline, voltage, rssi, audioFeatures } = useDeviceStore();
    const [ip, setIp] = useState('192.168.4.1');

    const handleConnect = () => {
        if (isOnline) {
            wsManager.disconnect();
        } else {
            wsManager.connect(ip);
        }
    };

    const sendAnim = (type) => wsManager.sendCommand('anim', type);
    const sendControl = (cmd) => wsManager.sendCommand('control', cmd);

    return (
        <div className="dashboard-view" style={{ display: 'grid', gridTemplateColumns: '300px 1fr 300px', gap: '1rem', height: 'calc(100vh - 100px)' }}>
            {/* Left Panel */}
            <aside className="panel" style={{ background: 'rgba(22,26,33,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(153,247,255,0.15)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Activity className="neon-text" />
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', opacity: 0.8 }}>BIOMETRICS_DATA</h3>
                </div>
                <StatPanel title="CORE VOLTAGE" value={voltage > 0 ? `${voltage.toFixed(2)}V` : '-- V'} icon={Zap} color="#00f2ff" />
                <StatPanel title="SIGNAL STRENGTH" value={rssi !== 0 ? `${rssi}dBm` : '-- dBm'} icon={Shield} color="#99f7ff" />
                <StatPanel title="POWER STATUS" value={isOnline ? "85%" : "0%"} icon={Battery} color="#a1ffcf" />

                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{ fontSize: '10px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '-0.05em' }}>Quick Commands</p>
                    <button onClick={() => sendAnim('JUMP')} disabled={!isOnline} className="neon-button" style={{ fontSize: '10px', padding: '0.5rem' }}>JUMP_ANIM</button>
                    <button onClick={() => sendAnim('WALK')} disabled={!isOnline} className="neon-button" style={{ fontSize: '10px', padding: '0.5rem' }}>WALK_CYCLE</button>
                    <button onClick={() => sendControl('LED_ON')} disabled={!isOnline} className="neon-button" style={{ fontSize: '10px', padding: '0.5rem' }}>LED_ACTIVATE</button>
                </div>
            </aside>

            {/* Main View */}
            <main className="main-view" style={{ position: 'relative', background: 'radial-gradient(circle at center, #1c2028 0%, #0b0e14 100%)', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(153,247,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                        <TherianAvatar />
                    </Canvas>
                </div>

                <div style={{ flex: 1, padding: '1rem', borderTop: '1px solid rgba(153,247,255,0.1)' }}>
                    <span style={{ color: '#00f2ff', fontSize: '12px', fontFamily: 'monospace', marginBottom: '0.5rem', display: 'block' }}>SEEING BIRDSONG</span>
                    <NetworkGraph features={audioFeatures} />
                </div>

                <div style={{ position: 'absolute', top: '1rem', left: '1rem', right: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(0,0,0,0.6)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid rgba(153,247,255,0.2)' }}>
                        <Wifi size={14} className="neon-text" />
                        <input
                            type="text"
                            value={ip}
                            onChange={(e) => setIp(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: '#00f2ff', outline: 'none', width: '120px', fontFamily: 'monospace', fontSize: '12px' }}
                        />
                        <button onClick={handleConnect} className="neon-button" style={{ padding: '0.25rem 0.75rem', fontSize: '10px', marginLeft: '0.5rem' }}>
                            {isOnline ? 'OFF' : 'CONNECT'}
                        </button>
                    </div>
                </div>

                <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', padding: '0.5rem', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '8px', border: '1px solid rgba(153,247,255,0.2)' }}>
                    <p style={{ fontSize: '8px', opacity: 0.4, textTransform: 'uppercase' }}>Aether_Design_System</p>
                    <p style={{ fontSize: '10px', color: '#00f2ff', fontFamily: 'monospace' }}>NODE: {isOnline ? 'ACTIVE' : 'IDLE'}</p>
                </div>
            </main>

            {/* Right Panel */}
            <aside className="panel" style={{ background: 'rgba(22,26,33,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(153,247,255,0.15)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <ShoppingBag className="neon-text" />
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', opacity: 0.8 }}>THERIAN_MARKET</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ padding: '0.75rem', border: '1px solid rgba(255, 0, 102, 0.2)', borderRadius: '8px', backgroundColor: 'rgba(255, 0, 102, 0.05)' }}>
                        <div style={{ color: '#ff0066', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>ENERGY CORE X1</div>
                        <div style={{ fontSize: '9px', opacity: 0.7, marginBottom: '0.5rem' }}>Plasma unit (+2000 mAh).</div>
                        <button className="neon-button secondary" style={{ width: '100%', padding: '0.25rem', fontSize: '9px' }}>Buy (500 T-C)</button>
                    </div>
                    <div style={{ padding: '0.75rem', border: '1px solid rgba(153, 247, 255, 0.2)', borderRadius: '8px', backgroundColor: 'rgba(153, 247, 255, 0.05)' }}>
                        <div style={{ color: '#99f7ff', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>NEON_COATING(CYAN)</div>
                        <div style={{ fontSize: '9px', opacity: 0.7, marginBottom: '0.5rem' }}>Reflective cyber-paint.</div>
                        <button className="neon-button" style={{ width: '100%', padding: '0.25rem', fontSize: '9px' }}>Buy (200 T-C)</button>
                    </div>
                </div>
            </aside>
        </div>
    );
}

export default Dashboard;
