import { Camera, CameraView } from 'expo-camera';
import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Scanner({ onCapture, onBack }) {
    const [hasPermission, setHasPermission] = useState(null);
    const cameraRef = useRef(null);

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

    if (hasPermission === null) return <View style={styles.container}><Text style={{ color: 'white' }}>Solicitando permisos...</Text></View>;
    if (hasPermission === false) return <View style={styles.container}><Text style={{ color: 'white' }}>No hay acceso a la cámara</Text></View>;

    const takePicture = async () => {
        if (cameraRef.current) {
            const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
            onCapture(photo);
        }
    };

    return (
        <View style={styles.container}>
            <CameraView style={styles.camera} facing="back" ref={cameraRef}>

                {/* Back Button */}
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
                </TouchableOpacity>

                {/* Overlay Guide for Body Scan */}
                <View style={styles.overlayContainer}>
                    <Text style={styles.instructionText}>Alinea tu cuerpo con la silueta</Text>
                    <View style={styles.silhouette}>
                        {/* Cabezal */}
                        <View style={styles.headOutline} />
                        {/* Torso */}
                        <View style={styles.torsoOutline} />
                        {/* Piernas */}
                        <View style={styles.legsOutline} />
                    </View>
                </View>

                {/* Bottom Controls */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                        <View style={styles.captureInner} />
                    </TouchableOpacity>
                </View>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0b0e11' },
    camera: { flex: 1 },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 10,
        borderRadius: 25,
    },
    overlayContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    instructionText: {
        color: '#00F2FF',
        fontFamily: 'monospace',
        fontSize: 16,
        marginBottom: 20,
        textShadowColor: 'rgba(0, 242, 255, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    silhouette: {
        width: 140,
        height: 380,
        alignItems: 'center',
    },
    headOutline: {
        width: 60, height: 70,
        borderRadius: 35,
        borderWidth: 2, borderColor: 'rgba(0, 242, 255, 0.4)',
        borderStyle: 'dashed',
        marginBottom: 10
    },
    torsoOutline: {
        width: 130, height: 160,
        borderRadius: 20,
        borderWidth: 2, borderColor: 'rgba(0, 242, 255, 0.4)',
        borderStyle: 'dashed',
        marginBottom: 10
    },
    legsOutline: {
        width: 90, height: 130,
        borderTopWidth: 0,
        borderWidth: 2, borderColor: 'rgba(0, 242, 255, 0.4)',
        borderStyle: 'dashed',
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 40,
        width: '100%',
        alignItems: 'center',
    },
    captureButton: {
        width: 70, height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(0, 242, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2, borderColor: '#00F2FF'
    },
    captureInner: {
        width: 50, height: 50,
        borderRadius: 25,
        backgroundColor: '#00F2FF'
    }
});
