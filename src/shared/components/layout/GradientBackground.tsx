import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/design/tokens';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface FloatingElement {
    position: 'top-right' | 'left-center' | 'bottom-right' | 'top-left' | 'center-right' | 'bottom-left';
    color: string;
    opacity: number;
    size?: number;
}

interface GradientBackgroundProps {
    colors?: string[];
    floatingElements?: FloatingElement[];
    children?: React.ReactNode;
}

const defaultFloatingElements: FloatingElement[] = [
    { position: 'top-right', color: colors.accent, opacity: 0.25, size: 120 },
    { position: 'left-center', color: colors.primary, opacity: 0.20, size: 90 },
    { position: 'bottom-right', color: colors.accent, opacity: 0.35, size: 70 },
];

const GradientBackground: React.FC<GradientBackgroundProps> = ({
    colors: gradientColors = [colors.background, colors.surfaceAlt, '#F9F6F0'],
    floatingElements = defaultFloatingElements,
    children
}) => {
    const getFloatingElementStyle = (element: FloatingElement) => {
        const size = element.size || 100;
        const radius = size / 2;

        const positions = {
            'top-right': { top: 60, right: -15 },
            'left-center': { top: 200, left: -25 },
            'bottom-right': { bottom: 180, right: 40 },
            'top-left': { top: 60, left: -15 },
            'center-right': { top: screenHeight / 2 - radius, right: -25 },
            'bottom-left': { bottom: 180, left: 40 },
        };

        return {
            position: 'absolute' as const,
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: element.color + Math.round(element.opacity * 255).toString(16).padStart(2, '0'),
            shadowColor: element.color,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: element.opacity * 0.6,
            shadowRadius: 16,
            elevation: 8,
            ...positions[element.position],
        };
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={gradientColors}
                style={styles.gradientBackground}
            />
            {floatingElements.map((element, index) => (
                <View
                    key={index}
                    style={getFloatingElementStyle(element)}
                />
            ))}
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    gradientBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
});

export default GradientBackground;

