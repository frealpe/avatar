import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function EntryScreen({ onNext }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.cardContainer}>
        {/* Background Gradient for the card */}
        <LinearGradient
          colors={['rgba(0, 242, 255, 0.1)', 'rgba(0, 0, 0, 0.8)']}
          style={styles.cardBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <View style={styles.cardContent}>
          {/* Avatar Section */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarInner}>
              <Ionicons name="person-outline" size={60} color="#00F2FF" />
            </View>
            <View style={styles.statusBadge} />
          </View>

          {/* Info Section */}
          <Text style={styles.nameText}>Modavatar User</Text>
          <Text style={styles.titleText}>3D Body Profile</Text>

          <View style={styles.tagsContainer}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>ID: MD-2024</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>STATUS: ONLINE</Text>
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            onPress={onNext}
            activeOpacity={0.8}
            testID="entry-next-button"
            style={styles.buttonWrapper}
          >
            <LinearGradient
              colors={['#00F2FF', '#00D4FF']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.buttonText}>CONNECT</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A', // Deep dark background
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    borderColor: 'rgba(0, 242, 255, 0.2)',
    borderWidth: 1,
    shadowColor: '#00F2FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    backgroundColor: '#12161A',
  },
  cardBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  cardContent: {
    padding: 30,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  avatarInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#00F2FF',
    backgroundColor: 'rgba(0, 242, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00F2FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  statusBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#00F2FF',
    borderWidth: 3,
    borderColor: '#12161A',
  },
  nameText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
    letterSpacing: 1,
  },
  titleText: {
    fontSize: 16,
    color: '#00F2FF',
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 30,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 242, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 255, 0.2)',
  },
  tagText: {
    color: '#A0AEC0',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  buttonWrapper: {
    width: '100%',
    shadowColor: '#00F2FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#0A0A0A',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});
