import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const mockClothes = [
    {
        id: '1',
        name: 'Oversized Hoodie',
        collection: 'CORE COLLECTION',
        price: '€89',
    },
    {
        id: '2',
        name: 'Tapered Denim',
        collection: 'ESSENTIAL FIT',
        price: '€120',
    },
    {
        id: '3',
        name: 'Puffer Jacket',
        collection: 'THERMAL TECH',
        price: '€210',
    }
];

export default function ClothingCatalog() {
    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.sectionSubtitle}>DIGITAL WARDROBE</Text>
                    <Text style={styles.sectionTitle}>Catálogo de Ropa</Text>
                </View>
                <TouchableOpacity style={styles.filterButton}>
                    <Ionicons name="options-outline" size={20} color="#a9abaf" />
                </TouchableOpacity>
            </View>

            <View style={styles.gridContainer}>
                {mockClothes.map((item) => (
                    <TouchableOpacity key={item.id} style={styles.gridItem}>
                        <View style={styles.imagePlaceholder} />
                        <View style={styles.itemDetails}>
                            <View>
                                <Text style={styles.itemName}>{item.name}</Text>
                                <Text style={styles.itemCollection}>{item.collection}</Text>
                            </View>
                            <Text style={styles.itemPrice}>{item.price}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionSubtitle: {
        color: '#9D00FF', // Purple from the design
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
    filterButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#161a1e',
        justifyContent: 'center',
        alignItems: 'center',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 16, // Assuming gap is supported, otherwise fallback to margin
    },
    gridItem: {
        width: '47%', // Slightly less than 50% to account for gap
        marginBottom: 16,
    },
    imagePlaceholder: {
        width: '100%',
        aspectRatio: 1, // Square image
        backgroundColor: '#161a1e',
        borderRadius: 16,
        marginBottom: 12,
    },
    itemDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    itemName: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    itemCollection: {
        color: '#a9abaf',
        fontSize: 10,
    },
    itemPrice: {
        color: '#00F2FF',
        fontSize: 14,
        fontWeight: 'bold',
    }
});
