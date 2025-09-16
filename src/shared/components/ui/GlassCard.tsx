import React from 'react';
import {
    View,
    ViewStyle,
    TouchableOpacity,
    TouchableOpacityProps,
    ViewProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, elevation } from '@/design/tokens';

export interface GlassCardProps extends ViewProps {
    pressable?: boolean;
    onPress?: () => void;
    variant?: 'morphism' | 'subtle' | 'elevated';
    padding?: keyof typeof spacing;
    touchableProps?: Omit<TouchableOpacityProps, 'style' | 'onPress'>;
    children?: React.ReactNode;
}

const GlassCard: React.FC<GlassCardProps> = ({
    children,
    pressable = false,
    onPress,
    variant = 'morphism',
    padding = 'lg',
    style,
    touchableProps,
    ...props
}) => {
    const getVariantStyle = (): ViewStyle => {
        switch (variant) {
            case 'morphism':
                return {
                    backgroundColor: 'transparent',
                    borderRadius: radius.xl,
                    shadowColor: colors.text,
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.12,
                    shadowRadius: 20,
                    elevation: 10,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                };
            case 'subtle':
                return {
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: radius.lg,
                    shadowColor: colors.text,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.08,
                    shadowRadius: 12,
                    elevation: 4,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                };
            case 'elevated':
                return {
                    backgroundColor: colors.surface,
                    borderRadius: radius.lg,
                    ...elevation.level1,
                };
            default:
                return {};
        }
    };

    const getGradientColors = (): [string, string] => {
        switch (variant) {
            case 'morphism':
                return ['rgba(255, 255, 255, 0.95)', 'rgba(251, 249, 244, 0.9)'];
            case 'subtle':
                return ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)'];
            case 'elevated':
                return [colors.surface, colors.surface];
            default:
                return [colors.surface, colors.surface];
        }
    };

    const cardStyle: ViewStyle = [
        getVariantStyle(),
        { padding: spacing[padding] },
        style,
    ];

    const gradientColors = getGradientColors();

    const CardContent = () => (
        <LinearGradient
            colors={gradientColors}
            style={[
                {
                    borderRadius: variant === 'morphism' ? radius.xl : radius.lg,
                    padding: spacing[padding],
                },
            ]}
        >
            {children}
        </LinearGradient>
    );

    if (pressable && onPress) {
        return (
            <TouchableOpacity
                {...touchableProps}
                onPress={onPress}
                style={cardStyle}
                activeOpacity={0.9}
                accessibilityRole="button"
            >
                <CardContent />
            </TouchableOpacity>
        );
    }

    return (
        <View {...props} style={cardStyle}>
            <CardContent />
        </View>
    );
};

export default GlassCard;
