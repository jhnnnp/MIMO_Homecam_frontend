import React, { useState, forwardRef, Ref } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle, KeyboardTypeOptions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, motion } from '@/design/tokens';

export interface TextFieldProps {
    label: string;
    value?: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    error?: string;
    helperText?: string;
    secureTextEntry?: boolean;
    leftIcon?: keyof typeof Ionicons.glyphMap;
    rightIcon?: keyof typeof Ionicons.glyphMap;
    onRightIconPress?: () => void;
    disabled?: boolean;
    containerStyle?: ViewStyle;
    inputStyle?: TextStyle;
    onBlur?: () => void;
    keyboardType?: KeyboardTypeOptions;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

const TextField = forwardRef<TextInput, TextFieldProps>(
    (
        {
            label,
            value,
            onChangeText,
            placeholder,
            error,
            helperText,
            secureTextEntry,
            leftIcon,
            rightIcon,
            onRightIconPress,
            disabled,
            containerStyle,
            inputStyle,
            onBlur,
            keyboardType,
            autoCapitalize,
        },
        ref
    ) => {
        const [isFocused, setIsFocused] = useState(false);
        const hasError = !!error;

        const borderColor = hasError
            ? colors.error
            : isFocused
                ? colors.primary
                : colors.divider;

        const backgroundColor = disabled ? colors.disabledBg : colors.surface;

        return (
            <View style={[styles.container, containerStyle]}>
                <Text style={[styles.label, hasError && styles.labelError]}>{label}</Text>
                <View
                    style={[
                        styles.inputContainer,
                        { borderColor, backgroundColor },
                        isFocused && styles.inputContainerFocused,
                        hasError && styles.inputContainerError,
                        disabled && styles.disabled,
                    ]}
                >
                    {leftIcon && <Ionicons name={leftIcon} size={20} color={colors.textSecondary} style={styles.icon} />}
                    <TextInput
                        ref={ref}
                        style={[styles.input, disabled && styles.inputTextDisabled, inputStyle]}
                        value={value}
                        onChangeText={onChangeText}
                        placeholder={placeholder}
                        placeholderTextColor={colors.textSecondary}
                        secureTextEntry={secureTextEntry}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => { setIsFocused(false); onBlur && onBlur(); }}
                        editable={!disabled}
                        keyboardType={keyboardType}
                        autoCapitalize={autoCapitalize}
                    />
                    {rightIcon && (
                        <TouchableOpacity onPress={onRightIconPress} disabled={!onRightIconPress}>
                            <Ionicons name={rightIcon} size={20} color={colors.textSecondary} style={styles.icon} />
                        </TouchableOpacity>
                    )}
                </View>
                {(helperText || error) && (
                    <Text style={[styles.helperText, hasError && styles.errorText]}>{error || helperText}</Text>
                )}
            </View>
        );
    }
);

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    label: {
        ...typography.body,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    labelError: {
        color: colors.error,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 52,
        borderWidth: 1,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        // transitionProperty: 'border-color, box-shadow',
        // transitionDuration: `${motion.fast}ms`,
    },
    inputContainerFocused: {
        borderColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    inputContainerError: {
        borderColor: colors.error,
    },
    input: {
        flex: 1,
        ...typography.body,
        color: colors.text,
        height: '100%',
    },
    inputTextDisabled: {
        color: colors.disabledText,
    },
    icon: {
        marginHorizontal: spacing.xs,
    },
    helperText: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: spacing.xs,
        marginLeft: spacing.xs,
    },
    errorText: {
        color: colors.error,
    },
    disabled: {
        backgroundColor: colors.disabledBg,
    },
});

export default TextField; 