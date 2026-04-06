import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function BottomNavigation({ currentTab, onTabPress }) {
    const tabs = [
        { id: 'home', label: 'HOME', icon: 'home' },
        { id: 'scan', label: 'SCAN', icon: 'scan' },
        { id: 'wardrobe', label: 'WARDROBE', icon: 'shirt-outline' }, // closest to clothes hanger
        { id: 'profile', label: 'PROFILE', icon: 'person' },
    ];

    return (
        <View style={styles.container}>
            {tabs.map((tab) => {
                const isActive = currentTab === tab.id;
                return (
                    <TouchableOpacity
                        key={tab.id}
                        style={styles.tabItem}
                        onPress={() => onTabPress(tab.id)}
                    >
                        <Ionicons
                            name={isActive ? tab.icon : `${tab.icon}-outline`}
                            size={24}
                            color={isActive ? '#00F2FF' : '#a9abaf'}
                        />
                        <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#0b0e11',
        paddingVertical: 16,
        paddingBottom: 30, // Extra padding for devices with safe area insets
        borderTopWidth: 1,
        borderTopColor: '#161a1e',
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    tabLabel: {
        color: '#a9abaf',
        fontSize: 10,
        marginTop: 6,
        letterSpacing: 1,
    },
    activeTabLabel: {
        color: '#00F2FF',
        fontWeight: 'bold',
    }
});
