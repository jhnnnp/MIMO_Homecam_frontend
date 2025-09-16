import React, { forwardRef } from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    View,
    ViewStyle,
    TextStyle,
    Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, motion } from '@/design/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps {
    title?: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    onPress?: () => void;
    loading?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
    leftIcon?: keyof typeof Ionicons.glyphMap;
    rightIcon?: keyof typeof Ionicons.glyphMap;
    style?: ViewStyle;
    textStyle?: TextStyle;
    accessibilityLabel?: string;
}

const Button = forwardRef<TouchableOpacity, ButtonProps>(
    (
        {
            title,
            variant = 'primary',
            size = 'md',
            onPress,
            loading = false,
            disabled = false,
            fullWidth = false,
            leftIcon,
            rightIcon,
            style,
            textStyle,
            accessibilityLabel,
        },
        ref
    ) => {
        const isIconOnly = size === 'icon';

        const buttonStyles: ViewStyle[] = [
            styles.base,
            styles[`size_${size}`],
            styles[`variant_${variant}`],
            fullWidth && styles.fullWidth,
            (disabled || loading) && styles.disabled,
            isIconOnly && styles.iconOnly,
            style,
        ];

        const textStyles: TextStyle[] = [
            styles.textBase,
            styles[`text_size_${size}`],
            styles[`text_variant_${variant}`],
            (disabled || loading) && styles.textDisabled,
            textStyle,
        ];

        const iconColor = styles[`text_variant_${variant}`]?.color || colors.text;
        const iconSize = size === 'lg' ? 20 : 16;

        return (
            <Pressable
                onPress={onPress}
                disabled={disabled || loading}
                accessibilityLabel={accessibilityLabel || title}
                accessibilityRole="button"
                accessibilityState={{ disabled: disabled || loading }}
                style={({ pressed }) => [
                    ...buttonStyles,
                    pressed && !disabled && !loading && styles[`pressed_${variant}`],
                ]}
            >
                {loading ? (
                    <ActivityIndicator size="small" color={iconColor as string} />
                ) : (
                    <>
                        {leftIcon && !isIconOnly && <Ionicons name={leftIcon} size={iconSize} color={iconColor as string} style={styles.iconLeft} />}
                        {isIconOnly && leftIcon && <Ionicons name={leftIcon} size={iconSize} color={iconColor as string} />}
                        {title && !isIconOnly && <Text style={textStyles}>{title}</Text>}
                        {rightIcon && !isIconOnly && <Ionicons name={rightIcon} size={iconSize} color={iconColor as string} style={styles.iconRight} />}
                    </>
                )}
            </Pressable>
        );
    }
);

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.full,
        borderWidth: 1,
        paddingHorizontal: spacing.lg,
        // transitionProperty: 'background-color, border-color',
        // transitionDuration: `${motion.fast}ms`,
    },
    fullWidth: {
        width: '100%',
    },
    disabled: {
        opacity: 0.6,
    },
    iconOnly: {
        aspectRatio: 1,
        paddingHorizontal: 0,
    },

    // Sizes
    size_sm: { height: 36, paddingHorizontal: spacing.md },
    size_md: { height: 44, paddingHorizontal: spacing.lg },
    size_lg: { height: 52, paddingHorizontal: spacing.xl },
    size_icon: { width: 44, height: 44, borderRadius: radius.full },

    // Variants
    variant_primary: { backgroundColor: colors.primary, borderColor: colors.primary },
    variant_secondary: { backgroundColor: colors.surface, borderColor: colors.divider },
    variant_tertiary: { backgroundColor: colors.primaryLight, borderColor: colors.primaryLight },
    variant_ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
    variant_destructive: { backgroundColor: colors.error, borderColor: colors.error },

    // Pressed states
    pressed_primary: { backgroundColor: '#4A615F' }, // Darker primary
    pressed_secondary: { backgroundColor: colors.disabledBg },
    pressed_tertiary: { backgroundColor: '#C8D4D3' }, // Darker primaryLight
    pressed_ghost: { backgroundColor: colors.disabledBg },
    pressed_destructive: { backgroundColor: '#C06565' }, // Darker error

    // Text Base
    textBase: {
        ...typography.body,
        fontWeight: '600',
        textAlign: 'center',
    },
    textDisabled: {},

    // Text Sizes
    text_size_sm: { ...typography.bodySm, fontWeight: '600' },
    text_size_md: { ...typography.body, fontWeight: '600' },
    text_size_lg: { ...typography.bodyLg, fontWeight: '600' },
    text_size_icon: {},

    // Text Variants
    text_variant_primary: { color: colors.textOnPrimary },
    text_variant_secondary: { color: colors.text },
    text_variant_tertiary: { color: colors.primary },
    text_variant_ghost: { color: colors.text },
    text_variant_destructive: { color: colors.textOnPrimary },

    // Icons
    iconLeft: { marginRight: spacing.xs },
    iconRight: { marginLeft: spacing.xs },
});

export default Button; 