import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';

const mockAvatars = [
    {
        id: '1',
        name: 'Anny Model 01',
        status: 'V-TRY ON READY',
        precision: 'PRECISIÓN 98.4%',
        image: null // We will use a fallback style for now
    },
    {
        id: '2',
        name: 'Marc Prime v2',
        status: 'CALIBRATED',
        precision: '',
        image: null
    }
];

export default function AvatarCarousel() {
    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.sectionSubtitle}>MIS AVATARS</Text>
                    <Text style={styles.sectionTitle}>Modelos Activos</Text>
                </View>
                <TouchableOpacity>
                    <Text style={styles.viewAllText}>VER TODOS</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {mockAvatars.map((avatar) => (
                    <TouchableOpacity key={avatar.id} style={styles.cardContainer}>
                        <View style={styles.cardContent}>
                            {avatar.precision ? (
                                <View style={styles.badgeContainer}>
                                    <Text style={styles.badgeText}>{avatar.precision}</Text>
                                </View>
                            ) : null}

                            <View style={styles.cardFooter}>
                                <Text style={styles.avatarName}>{avatar.name}</Text>
                                <Text style={styles.avatarStatus}>{avatar.status}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 30,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionSubtitle: {
        color: '#00F2FF',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 4,
    },
    sectionTitle: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: 'bold',
    },
    viewAllText: {
        color: '#00F2FF',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        gap: 16,
    },
    cardContainer: {
        width: 200,
        height: 280,
        borderRadius: 20,
        backgroundColor: '#161a1e', // Fallback background
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#22262b',
    },
    cardContent: {
        flex: 1,
        justifyContent: 'space-between',
        padding: 16,
    },
    badgeContainer: {
        alignSelf: 'flex-end',
        backgroundColor: 'rgba(0, 242, 255, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    badgeText: {
        color: '#00F2FF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    cardFooter: {
        // Positioned at the bottom by justifyContent: space-between on cardContent
    },
    avatarName: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    avatarStatus: {
        color: '#00F2FF',
        fontSize: 12,
    }
});
