import { Camera, CameraView } from 'expo-camera';
import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button } from 'react-native';

export default function Scanner({ onCapture }) {
    const [hasPermission, setHasPermission] = useState(null);

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

    if (hasPermission === null) return <View />;
    if (hasPermission === false) return <Text>No access to camera</Text>;

    let cameraRef = null;

    const takePicture = async () => {
        if (cameraRef) {
            const photo = await cameraRef.takePictureAsync({ base64: true });
            onCapture(photo);
        }
    };

    return (
        <View style={styles.container}>
            <CameraView style={styles.camera} facing="back" ref={(ref) => (cameraRef = ref)}>
                <View style={styles.buttonContainer}>
                    <Button title="Scan Body" onPress={takePicture} />
                </View>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center' },
    camera: { flex: 1 },
    buttonContainer: { flex: 1, backgroundColor: 'transparent', flexDirection: 'row', alignItems: 'flex-end', margin: 20 },
});
