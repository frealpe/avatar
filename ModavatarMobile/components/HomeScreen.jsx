import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Header from './Header';
import HeroCard from './HeroCard';
import AvatarCarousel from './AvatarCarousel';
import ClothingCatalog from './ClothingCatalog';

export default function HomeScreen({ onScanPress, onMenuPress }) {
    return (
        <View style={styles.container}>
            <Header onMenuPress={onMenuPress} />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <HeroCard onScanPress={onScanPress} />
                <AvatarCarousel />
                <ClothingCatalog />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0b0e11',
    },
    scrollContent: {
        paddingBottom: 20,
    }
});
