import React from 'react';
import {
    View,
    TouchableOpacity,
    ViewStyle,
    TouchableOpacityProps,
    ViewProps,
} from 'react-native';
import { colors, spacing, radius, elevation } from '@/design/tokens';

export interface CardProps extends ViewProps {
    pressable?: boolean;
    onPress?: () => void;
    variant?: 'elevated' | 'outlined' | 'filled';
    padding?: keyof typeof spacing;
    touchableProps?: Omit<TouchableOpacityProps, 'style' | 'onPress'>;
}

export default function Card({
    children,
    pressable = false,
    onPress,
    variant = 'elevated',
    padding = 'md',
    style,
    touchableProps,
    ...props
}: CardProps) {
    const baseStyle: ViewStyle = {
        borderRadius: radius.card,
        padding: spacing[padding],
        backgroundColor: colors.surface,
    };

    const getVariantStyle = (): ViewStyle => {
        switch (variant) {
            case 'elevated':
                return { ...elevation.level1 } as any;
            case 'outlined':
                return { borderWidth: 1, borderColor: colors.border };
            case 'filled':
                return { backgroundColor: colors.surfaceAlt };
            default:
                return {};
        }
    };

    const cardStyle = [baseStyle, getVariantStyle(), style];

    if (pressable && onPress) {
        return (
            <TouchableOpacity
                {...touchableProps}
                onPress={onPress}
                style={cardStyle}
                activeOpacity={0.9}
                accessibilityRole="button"
            >
                {children}
            </TouchableOpacity>
        );
    }

    return (
        <View {...props} style={cardStyle}>
            {children}
        </View>
    );
} 