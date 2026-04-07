import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;

export default function DrawerMenu({ isOpen, onClose, onNavigate }) {
    const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isOpen) {
            // Instantly make it opaque before sliding in
            opacityAnim.setValue(1);
        }

        Animated.timing(slideAnim, {
            toValue: isOpen ? 0 : -DRAWER_WIDTH,
            duration: 300,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (!isOpen && finished) {
                // Hide completely only after slide out is done
                opacityAnim.setValue(0);
            }
        });
    }, [isOpen]);

    return (
        <Animated.View style={[styles.overlayContainer, { opacity: opacityAnim }]} pointerEvents={isOpen ? 'auto' : 'none'}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.backdrop} />
            </TouchableWithoutFeedback>
            <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
                <View style={styles.header}>
                    <Text style={styles.headerText}>ETHÉREAL</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={28} color="#00F2FF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.menuItems}>
                    {[
                        { id: 'home', label: 'Inicio', icon: 'home-outline' },
                        { id: 'create', label: 'Crear Avatar', icon: 'person-add-outline' },
                        { id: 'probador', label: 'Probador Virtual', icon: 'shirt-outline' },
                        { id: 'my_avatar', label: 'My Avatar', icon: 'person-outline' },
                        { id: 'measurements', label: 'Measurements', icon: 'body-outline' },
                        { id: 'collection', label: 'Collection', icon: 'grid-outline' },
                        { id: 'settings', label: 'Settings', icon: 'settings-outline' },
                        { id: 'support', label: 'Support', icon: 'help-circle-outline' }
                    ].map((item) => {
                        if (item.id === 'create') {
                            return (
                                <View key={item.id} style={styles.heroCardContainer}>
                                    <View style={styles.heroCardContent}>
                                        <Text style={styles.heroDescriptionText}>
                                            Escaneo de precisión sub-milimétrica para una experiencia de probador virtual sin precedentes.
                                        </Text>

                                        <TouchableOpacity
                                            style={styles.heroButtonContainer}
                                            onPress={() => {
                                                onClose();
                                                onNavigate(item.id);
                                            }}
                                        >
                                            <LinearGradient
                                                colors={['#00F2FF', '#00D4FF']}
                                                style={styles.heroGradientButton}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                            >
                                                <Text style={styles.heroButtonText}>CREAR MI AVATAR</Text>
                                                <Ionicons name="scan-outline" size={24} color="#000" style={{ marginLeft: 10 }} />
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        }
                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.menuItem}
                                onPress={() => {
                                    onClose();
                                    onNavigate(item.id);
                                }}
                            >
                                <Ionicons name={item.icon} size={24} color="#00F2FF" />
                                <Text style={styles.menuText}>{item.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    overlayContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: width,
        height: height,
        zIndex: 100,
        elevation: 100, // For Android
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: width,
        height: height,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    drawer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: DRAWER_WIDTH,
        height: height,
        backgroundColor: '#161a1e',
        borderRightWidth: 1,
        borderColor: '#00F2FF',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 30,
    },
    headerText: {
        color: '#00F2FF',
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    menuItems: {
        flex: 1,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#22262b',
    },
    menuText: {
        color: '#f8f9fe',
        fontSize: 18,
        marginLeft: 15,
    },
    heroCardContainer: {
        marginVertical: 15,
        borderRadius: 16,
        backgroundColor: '#12161A',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0, 242, 255, 0.1)',
    },
    heroCardContent: {
        padding: 16,
        alignItems: 'center',
    },
    heroDescriptionText: {
        color: '#a9abaf',
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 18,
    },
    heroButtonContainer: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
    },
    heroGradientButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
    },
    heroButtonText: {
        color: '#000000',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 1,
    }
});
