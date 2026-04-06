import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Canvas } from '@react-three/fiber';
import AnnyHumanBody from './AnnyHumanBody';

const CATEGORIES = ['Body', 'Hair', 'Eyes', 'Nose', 'Mouth', 'Facial Hair', 'Outfit', 'Accessories'];
const COLORS = [
    '#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#3D2210',
    '#FFC0CB', '#FF69B4', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#800080', '#FFA500', '#00FFFF', '#FFFFFF', '#000000'
];

export default function CreateAvatarScreen({ onBack, onSave }) {
    const [activeCategory, setActiveCategory] = useState('Body');
    const [bodyColor, setBodyColor] = useState('#F1C27D');
    // More state here for other categories as needed...

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack}>
                    <Ionicons name="arrow-back" size={24} color="#f8f9fe" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Avatar</Text>
                <TouchableOpacity onPress={() => onSave(bodyColor)}>
                    <Ionicons name="checkmark" size={24} color="#f8f9fe" />
                </TouchableOpacity>
            </View>

            {/* 3D Viewer */}
            <View style={styles.canvasContainer}>
                <Canvas camera={{ position: [0, 0, 6], fov: 60 }}>
                    <ambientLight intensity={0.6} />
                    <pointLight position={[10, 10, 10]} intensity={0.8} color="#ffffff" />
                    <pointLight position={[-10, 5, -10]} intensity={0.5} color="#ffffff" />

                    <AnnyHumanBody
                        isTryingOn={false}
                        bodyColorOverride={activeCategory === 'Body' ? bodyColor : '#F1C27D'}
                    />
                </Canvas>
            </View>

            {/* Editing Panel */}
            <View style={styles.editingPanel}>
                {/* Categories */}
                <View style={styles.categoriesContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
                        {CATEGORIES.map((category) => {
                            const isActive = activeCategory === category;
                            return (
                                <TouchableOpacity
                                    key={category}
                                    style={[styles.categoryBtn, isActive && styles.categoryBtnActive]}
                                    onPress={() => setActiveCategory(category)}
                                >
                                    <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                                        {category}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Colors */}
                <View style={styles.colorsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorsScroll}>
                        {COLORS.map((color, index) => {
                            const isSelected = bodyColor === color;
                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.colorCircle,
                                        { backgroundColor: color },
                                        isSelected && styles.colorCircleSelected
                                    ]}
                                    onPress={() => {
                                        if (activeCategory === 'Body') setBodyColor(color);
                                        // Handle other categories if needed
                                    }}
                                />
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Save Button */}
                <View style={styles.saveBtnContainer}>
                    <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(bodyColor)}>
                        <Text style={styles.saveBtnText}>Save Avatar</Text>
                    </TouchableOpacity>
                </View>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 15,
        backgroundColor: '#0b0e11',
    },
    headerTitle: {
        color: '#f8f9fe',
        fontSize: 18,
        fontWeight: 'bold',
    },
    canvasContainer: {
        flex: 1,
        backgroundColor: '#0b0e11',
    },
    editingPanel: {
        backgroundColor: '#161a1e',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        paddingBottom: 30, // For bottom safe area
    },
    categoriesContainer: {
        marginBottom: 20,
    },
    categoriesScroll: {
        paddingHorizontal: 15,
    },
    categoryBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        marginHorizontal: 5,
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    categoryBtnActive: {
        backgroundColor: '#22262b',
    },
    categoryText: {
        color: '#a9abaf',
        fontSize: 14,
        fontWeight: '600',
    },
    categoryTextActive: {
        color: '#f8f9fe',
    },
    colorsContainer: {
        marginBottom: 30,
    },
    colorsScroll: {
        paddingHorizontal: 15,
    },
    colorCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginHorizontal: 10,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorCircleSelected: {
        borderColor: '#f8f9fe',
        transform: [{ scale: 1.1 }],
    },
    saveBtnContainer: {
        paddingHorizontal: 20,
    },
    saveBtn: {
        backgroundColor: '#2a5bd7',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    saveBtnText: {
        color: '#f8f9fe',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
