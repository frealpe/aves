import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Line } from '@react-three/drei';
import * as THREE from 'three';

const NUM_NODES = 8;

const getColorForFrequency = (freq) => {
    if (freq < 200) return '#9b59b6'; // Purple
    if (freq < 2000) return '#f1c40f'; // Yellow
    return '#e74c3c'; // Red
};

const NetworkNodes = ({ features }) => {
    const nodes = useRef(Array.from({ length: NUM_NODES }).map(() => ({
        position: new THREE.Vector3((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 2),
        velocity: new THREE.Vector3((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05),
        radius: 0.1,
        targetRadius: 0.1,
        color: '#3498db'
    })));

    useFrame(() => {
        const targetRad = features ? Math.min(Math.max((features.amplitude || 0) / 1000, 0.1), 0.8) : 0.1;
        const newColor = features ? getColorForFrequency(features.dominant_freq || 0) : '#3498db';

        nodes.current[0].targetRadius = targetRad;
        nodes.current[0].color = newColor;

        for (let i = 0; i < NUM_NODES; i++) {
            const node = nodes.current[i];

            node.position.add(node.velocity);

            // Bounds
            if (node.position.x > 2 || node.position.x < -2) node.velocity.x *= -1;
            if (node.position.y > 2 || node.position.y < -2) node.velocity.y *= -1;
            if (node.position.z > 1 || node.position.z < -1) node.velocity.z *= -1;

            // Radius transition
            node.radius += (node.targetRadius - node.radius) * 0.1;

            // Physics propagation
            if (i > 0) {
                node.targetRadius = nodes.current[0].targetRadius * 0.8;
                node.color = nodes.current[0].color;

                const prev = nodes.current[i - 1];
                const dx = prev.position.x - node.position.x;
                const dy = prev.position.y - node.position.y;
                const dz = prev.position.z - node.position.z;

                node.velocity.x += dx * 0.002;
                node.velocity.y += dy * 0.002;
                node.velocity.z += dz * 0.002;

                node.velocity.multiplyScalar(0.98);
            }
        }
    });

    const lines = useMemo(() => {
        const result = [];
        for (let i = 0; i < NUM_NODES; i++) {
            for (let j = i + 1; j < NUM_NODES; j++) {
                result.push([i, j]);
            }
        }
        return result;
    }, []);

    return (
        <group>
            {nodes.current.map((node, i) => (
                <Sphere key={i} position={node.position} args={[node.radius, 16, 16]}>
                    <meshStandardMaterial color={node.color} emissive={node.color} emissiveIntensity={0.5} roughness={0.2} metalness={0.8} />
                </Sphere>
            ))}
            {lines.map(([i, j], idx) => {
                const distance = nodes.current[i].position.distanceTo(nodes.current[j].position);
                if (distance < 1.5) {
                    return (
                        <Line
                            key={`line-${idx}`}
                            points={[nodes.current[i].position, nodes.current[j].position]}
                            color={nodes.current[i].color}
                            lineWidth={1}
                            transparent
                            opacity={1 - (distance / 1.5)}
                        />
                    );
                }
                return null;
            })}
        </group>
    );
};

const NetworkGraph = ({ features }) => {
    return (
        <Canvas camera={{ position: [0, 0, 5], fov: 60 }} style={{ height: 300, width: '100%', borderRadius: 16, overflow: 'hidden', backgroundColor: '#111' }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <NetworkNodes features={features} />
        </Canvas>
    );
};

export default NetworkGraph;
