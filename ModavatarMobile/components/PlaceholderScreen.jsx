import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PlaceholderScreen({ stepName, onBack }) {
    const title = stepName ? stepName.replace('_', ' ').toUpperCase() : 'EN CONSTRUCCIÓN';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack}>
                    <Ionicons name="arrow-back" size={28} color="#00F2FF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{title}</Text>
                <TouchableOpacity style={{ width: 28 }} />
            </View>
            <View style={styles.content}>
                <Ionicons name="construct-outline" size={80} color="#a9abaf" />
                <Text style={styles.message}>
                    Esta sección está en desarrollo. ¡Pronto habrá más novedades!
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0b0e11',
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
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    message: {
        color: '#a9abaf',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
        lineHeight: 24,
    }
});
