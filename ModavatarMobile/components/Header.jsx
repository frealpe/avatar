import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Header() {
    return (
        <View style={styles.container}>
            <TouchableOpacity>
                <Ionicons name="menu" size={28} color="#00F2FF" />
            </TouchableOpacity>

            <Text style={styles.logoText}>ETHÉREAL</Text>

            <TouchableOpacity style={styles.profileContainer}>
                <Image
                    source={require('../assets/adaptive-icon.png')} // Using an available asset as placeholder
                    style={styles.profileImage}
                />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
        backgroundColor: '#0b0e11',
    },
    logoText: {
        color: '#00F2FF',
        fontSize: 24,
        fontWeight: 'bold',
        letterSpacing: 2,
        textShadowColor: 'rgba(0, 242, 255, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    profileContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#00F2FF',
        overflow: 'hidden',
    },
    profileImage: {
        width: '100%',
        height: '100%',
    }
});
