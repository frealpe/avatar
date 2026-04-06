import { useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import Scanner from './components/Scanner';
import AvatarCanvas from './components/AvatarCanvas';
import HomeScreen from './components/HomeScreen';
import BottomNavigation from './components/BottomNavigation';
import ProbadorScreen from './components/ProbadorScreen';
import DrawerMenu from './components/DrawerMenu';
import { BACKEND_URL } from './config';

export default function App() {
  const [step, setStep] = useState('home'); // home, scan, processing, render, probador
  const [avatarData, setAvatarData] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleCapture = async (photo) => {
    setStep('processing');
    
    try {
      // 1. Enviar foto capturada al backend Node.js que ejecuta el Pipeline IA (Anny)
      const response = await fetch(`${BACKEND_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: photo.base64, userId: 'modavatar_expo' })
      });

      const data = await response.json();

      if (data.ok) {
        // Guardamos los datos de la inferencia (Anny params y malla 3D)
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

  const handleTabPress = (tabId) => {
    if (tabId === 'home') setStep('home');
    if (tabId === 'scan') setStep('scan');
    // Implement other tabs as needed later
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
      <View style={styles.content}>
        {step === 'home' && <HomeScreen onScanPress={() => setStep('scan')} onMenuPress={() => setIsDrawerOpen(true)} />}
        {step === 'scan' && <Scanner onCapture={handleCapture} />}
        {step === 'render' && <AvatarCanvas avatarData={avatarData} />}
        {step === 'probador' && <ProbadorScreen />}
      </View>

      {/* Show Bottom Navigation only on specific screens if desired, or always */}
      {(step === 'home' || step === 'scan' || step === 'render') && (
         <BottomNavigation
            currentTab={step === 'home' ? 'home' : (step === 'scan' || step === 'render' ? 'scan' : 'home')}
            onTabPress={handleTabPress}
         />
      )}

      <DrawerMenu
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onNavigate={(newStep) => setStep(newStep)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0e11' },
  content: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b0e11' },
  textHighlight: { color: '#00F2FF', marginTop: 20, fontFamily: 'monospace', fontWeight: 'bold' },
  textSubtitle: { color: '#a9abaf', marginTop: 5, fontSize: 12 }
});
