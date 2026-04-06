import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function EntryScreen({ onNext }) {
    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Image
                    source={require('../assets/male-silhouette.png')}
                    style={styles.image}
                    resizeMode="contain"
                />

                <Text style={styles.title}>
                    Te ayudamos a conocer tu Indice de Masa Corporal y tus calorias diarias.
                </Text>

                <TouchableOpacity style={styles.button} onPress={onNext} testID="entry-next-button" accessibilityRole="button">
                    <Ionicons name="arrow-forward" size={32} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0b0e11', // Matching the app's dark background
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 30,
        padding: 40,
        alignItems: 'center',
        width: '100%',
        maxWidth: 400,
        // Shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        // Elevation for Android
        elevation: 10,
    },
    image: {
        width: 150,
        height: 300,
        marginBottom: 30,
    },
    title: {
        fontSize: 18,
        color: '#000000',
        textAlign: 'center',
        fontWeight: 'bold',
        marginBottom: 40,
        lineHeight: 26,
    },
    button: {
        backgroundColor: '#FF1493', // Deep pink
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        // Shadow for the button
        shadowColor: '#FF1493',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 8,
    }
});
