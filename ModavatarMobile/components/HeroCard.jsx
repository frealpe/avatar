import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function HeroCard({ onScanPress }) {
    return (
        <View style={styles.container}>
            <View style={styles.contentContainer}>
                <Text style={styles.descriptionText}>
                    Escaneo de precisión sub-milimétrica para una experiencia de probador virtual sin precedentes.
                </Text>

                <TouchableOpacity style={styles.buttonContainer} onPress={onScanPress}>
                    <LinearGradient
                        colors={['#00F2FF', '#00D4FF']}
                        style={styles.gradientButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.buttonText}>CREAR MI AVATAR</Text>
                        <Ionicons name="scan-outline" size={24} color="#000" style={styles.buttonIcon} />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 30,
        borderRadius: 20,
        backgroundColor: '#12161A',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0, 242, 255, 0.1)',
        // Shadow for iOS
        shadowColor: '#00F2FF',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        // Elevation for Android
        elevation: 5,
    },
    contentContainer: {
        padding: 24,
        alignItems: 'center',
    },
    descriptionText: {
        color: '#a9abaf',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
        paddingHorizontal: 10,
    },
    buttonContainer: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
    },
    gradientButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    buttonText: {
        color: '#000000',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    buttonIcon: {
        marginLeft: 10,
    }
});
