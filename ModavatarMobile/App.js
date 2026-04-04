import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import Scanner from './components/Scanner';
import AvatarCanvas from './components/AvatarCanvas';
import { MobileAvatarAI } from './helpers/AvatarModel';

export default function App() {
  const [step, setStep] = useState('loading'); // loading, scan, process, render
  const [ai, setAi] = useState(null);
  const [smplParams, setSmplParams] = useState(null);

  useEffect(() => {
    async function initAI() {
      const model = new MobileAvatarAI();
      await model.loadModel();
      setAi(model);
      setStep('scan');
    }
    initAI();
  }, []);

  const handleCapture = async (photo) => {
    setStep('processing');
    const params = await ai.generateAvatarParameters(photo.base64);
    setSmplParams(params);
    setStep('render');
  };

  if (step === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.textWhite}>Initializing AI HMR Model...</Text>
      </View>
    );
  }

  if (step === 'processing') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ff00ff" />
        <Text style={styles.textWhite}>Extracting Body Mesh Parameters...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {step === 'scan' && <Scanner onCapture={handleCapture} />}
      {step === 'render' && <AvatarCanvas smplParams={smplParams} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  textWhite: { color: 'white', marginTop: 10 }
});
