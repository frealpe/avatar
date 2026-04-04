import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

function DummyMesh({ smplParams }) {
    const mesh = useRef();
    useFrame((state, delta) => (mesh.current.rotation.y += delta));
    return (
        <mesh ref={mesh}>
            {/* Representing the initial 3D human shape before physics */}
            <boxGeometry args={[1, 2, 1]} />
            <meshStandardMaterial color="hotpink" />
        </mesh>
    );
}

export default function AvatarCanvas({ smplParams }) {
    return (
        <Canvas style={{ flex: 1 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <DummyMesh smplParams={smplParams} />
        </Canvas>
    );
}
