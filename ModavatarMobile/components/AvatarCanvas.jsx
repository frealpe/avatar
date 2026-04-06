import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Canvas } from '@react-three/fiber';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_URL } from '../config';
import AnnyHumanBody from './AnnyHumanBody';

export default function AvatarCanvas({ avatarData, onBack }) {
    const [clothIndex, setClothIndex] = useState(0);
    const [isSimulating, setIsSimulating] = useState(false);

    const handleTryOn = async () => {
        if (clothIndex === 0) {
            setIsSimulating(true);
            try {
                // Simulate Virtual Try-On API Call
                const response = await fetch(`${BACKEND_URL}/try-on`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ avatarId: avatarData?._id || 'mock', prendaId: 1 })
                });
                const data = await response.json();
                if (data.ok) setClothIndex(1);
            } catch (error) {
                console.error("Error doing try-on", error);
            } finally {
                setIsSimulating(false);
            }
        } else {
            setClothIndex(0);
        }
    };

    return (
        <View style={styles.container}>
            {/* Top Bar Status */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#00F2FF" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>Model: {avatarData?.modelType || 'Anny 3D'}</Text>
                    <Text style={styles.subtitle}>ID: {avatarData?._id?.substring(0, 8)}</Text>
                </View>
                <View style={{ width: 24 }} />
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
                    <Text style={styles.metricText}>ESTADO: {isSimulating ? "Simulando tela..." : (clothIndex > 0 ? "V-TRY ON (Activo)" : "Ninguna Prenda")}</Text>
                </View>
                <TouchableOpacity style={styles.actionBtn} onPress={handleTryOn} disabled={isSimulating}>
                    <Text style={styles.actionBtnTxt}>{isSimulating ? "PROCESANDO..." : (clothIndex > 0 ? "QUITAR PRENDA" : "PROBAR ROPA")}</Text>
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
