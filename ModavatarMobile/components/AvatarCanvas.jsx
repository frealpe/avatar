import React, { useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';

// Malla HMR Anny (Simulada proceduralmente mediante agrupaciones para demostrar respuesta a escala)
function AnnyHumanBody({ measurements, isTryingOn }) {
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

    // Color: Rosa si está desnudo, Azul metalizado si se está probando ropa
    const bodyColor = isTryingOn ? '#9D00FF' : '#00F2FF';

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
                <meshStandardMaterial color="#00F2FF" />
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

export default function AvatarCanvas({ avatarData }) {
    const [clothIndex, setClothIndex] = useState(0);

    const handleTryOn = () => {
        setClothIndex((prev) => (prev === 0 ? 1 : 0)); // Toggle Try-On
    };

    return (
        <View style={styles.container}>
            {/* Top Bar Status */}
            <View style={styles.header}>
                <Text style={styles.title}>Model: {avatarData?.modelType || 'Anny 3D'}</Text>
                <Text style={styles.subtitle}>ID: {avatarData?._id?.substring(0, 8)}</Text>
            </View>

            {/* Canvas 3D Space */}
            <View style={styles.canvasContainer}>
                <Canvas camera={{ position: [0, 0, 6], fov: 60 }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1} color="#00F2FF" />
                    <pointLight position={[-10, 5, -10]} intensity={0.5} color="#9D00FF" />

                    <AnnyHumanBody
                        measurements={avatarData?.measurements}
                        isTryingOn={clothIndex > 0}
                    />
                </Canvas>
            </View>

            {/* HUD Inferior - Controles Try On */}
            <View style={styles.footerWrap}>
                <View style={styles.metricsPanel}>
                    <Text style={styles.metricText}>ALTURA: {avatarData?.measurements?.height} cm</Text>
                    <Text style={styles.metricText}>ÚLTIMA PRENDA: {clothIndex > 0 ? "V-TRY ON (Activo)" : "Ninguna"}</Text>
                </View>
                <TouchableOpacity style={styles.actionBtn} onPress={handleTryOn}>
                    <Text style={styles.actionBtnTxt}>{clothIndex > 0 ? "QUITAR PRENDA" : "PROBAR ROPA"}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0b0e11' },
    header: { padding: 20, paddingTop: 50, backgroundColor: 'rgba(22, 26, 30, 0.8)', borderBottomWidth: 1, borderBottomColor: '#22262b' },
    title: { color: '#00F2FF', fontFamily: 'monospace', fontWeight: 'bold', fontSize: 18 },
    subtitle: { color: '#a9abaf', fontSize: 12 },
    canvasContainer: { flex: 1 },
    footerWrap: { padding: 20, backgroundColor: '#161a1e', borderTopWidth: 1, borderTopColor: '#22262b' },
    metricsPanel: { marginBottom: 15, padding: 10, backgroundColor: '#101417', borderRadius: 8 },
    metricText: { color: '#00F2FF', fontFamily: 'monospace', fontSize: 12, marginBottom: 5 },
    actionBtn: { backgroundColor: 'rgba(157, 0, 255, 0.2)', padding: 15, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#9D00FF' },
    actionBtnTxt: { color: '#9D00FF', fontWeight: 'bold' }
});
