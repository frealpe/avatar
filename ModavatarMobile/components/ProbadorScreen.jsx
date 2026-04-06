import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { htmlContent } from './ProbadorTemplate';

const ProbadorScreen = ({ onBack }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={28} color="#00F2FF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Probador Virtual</Text>
        <TouchableOpacity style={{ width: 28 }} />
      </View>
      <WebView
        originWhitelist={['*']}
      source={{ html: htmlContent }}
      style={styles.webview}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      allowFileAccess={true}
      allowUniversalAccessFromFileURLs={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0e11', // Match surface background color
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#161a1e',
  },
  headerTitle: {
    color: '#00F2FF',
    fontSize: 18,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default ProbadorScreen;
