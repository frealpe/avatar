import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export default function AnnyHumanBody({ measurements, isTryingOn, bodyColorOverride }) {
    const group = useRef();

    useFrame((state, delta) => {
        if (group.current && !isTryingOn) {
            // Rotación suave de exhibición
            group.current.rotation.y += delta * 0.5;
        }
    });

    // Escalado adaptativo basado en parámetros Anny recibidos del Backend
    // Altura base 170cm -> escala 1.0
    const heightScale = measurements ? measurements.height / 170 : 1;
    // Ancho base pecho 90cm -> escala 1.0
    const widthScale = measurements ? measurements.chest / 90 : 1;

    // Color: Rosa si está desnudo, Azul metalizado si se está probando ropa, override del selector
    const baseColor = isTryingOn ? '#9D00FF' : '#00F2FF';
    const bodyColor = bodyColorOverride || baseColor;

    return (
        <group ref={group} position={[0, -2 * heightScale, 0]} scale={[widthScale, heightScale, widthScale]}>
            {/* Torso */}
            <mesh position={[0, 2, 0]}>
                <boxGeometry args={[1.2, 1.5, 0.6]} />
                <meshStandardMaterial color={bodyColor} wireframe={!isTryingOn} opacity={0.8} transparent />
            </mesh>

            {/* Cabeza */}
            <mesh position={[0, 3.2, 0]}>
                <sphereGeometry args={[0.4, 32, 32]} />
                <meshStandardMaterial color={bodyColorOverride || "#00F2FF"} />
            </mesh>

            {/* Piernas */}
            <mesh position={[-0.3, 0.5, 0]}>
                <cylinderGeometry args={[0.25, 0.2, 1.5, 32]} />
                <meshStandardMaterial color={bodyColor} wireframe={!isTryingOn} opacity={0.8} transparent />
            </mesh>
            <mesh position={[0.3, 0.5, 0]}>
                <cylinderGeometry args={[0.25, 0.2, 1.5, 32]} />
                <meshStandardMaterial color={bodyColor} wireframe={!isTryingOn} opacity={0.8} transparent />
            </mesh>

            {/* Brazos */}
            <mesh position={[-0.8, 2, 0]} rotation={[0, 0, 0.2]}>
                <cylinderGeometry args={[0.15, 0.15, 1.2, 32]} />
                <meshStandardMaterial color={bodyColor} wireframe={!isTryingOn} opacity={0.8} transparent />
            </mesh>
            <mesh position={[0.8, 2, 0]} rotation={[0, 0, -0.2]}>
                <cylinderGeometry args={[0.15, 0.15, 1.2, 32]} />
                <meshStandardMaterial color={bodyColor} wireframe={!isTryingOn} opacity={0.8} transparent />
            </mesh>
        </group>
    );
}
