import { useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import Scanner from './components/Scanner';
import AvatarCanvas from './components/AvatarCanvas';

// Dirección IP local del servidor de desarrollo Node.js
// En emulador de Android AVD se puede usar 10.0.2.2 o la IP WiFi en dispositivos físicos.
const BACKEND_URL = 'http://192.168.0.10:8080/api/avatar';

export default function App() {
  const [step, setStep] = useState('scan'); // scan, processing, render
  const [avatarData, setAvatarData] = useState(null);

  const handleCapture = async (photo) => {
    setStep('processing');
    
    try {
      // 1. Enviar foto capturada al backend Node.js
      const response = await fetch(`${BACKEND_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: photo.base64, userId: 'modavatar_expo' })
      });

      const data = await response.json();

      if (data.ok) {
        // Guardamos los datos de la inferencia (Anny params)
        setAvatarData(data.avatar);
        setStep('render');
      } else {
        console.error('Error generando avatar:', data.msg);
        setStep('scan'); // Volver a interfaz de captura si falla
      }
    } catch (error) {
      console.error('Error enviando la foto al servidor:', error);
      setStep('scan');
    }
  };

  if (step === 'processing') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00F2FF" />
        <Text style={styles.textHighlight}>Procesando con Anny IA Pipeline...</Text>
        <Text style={styles.textSubtitle}>Conectado al Servidor (Express)</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {step === 'scan' && <Scanner onCapture={handleCapture} />}
      {step === 'render' && <AvatarCanvas avatarData={avatarData} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0e11' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b0e11' },
  textHighlight: { color: '#00F2FF', marginTop: 20, fontFamily: 'monospace', fontWeight: 'bold' },
  textSubtitle: { color: '#a9abaf', marginTop: 5, fontSize: 12 }
});
