import React, { useState, forwardRef, Ref } from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    TouchableOpacity,
    ViewStyle,
    TextStyle,
    KeyboardTypeOptions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, motion } from '@/design/tokens';

export interface EnhancedTextFieldProps {
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
    onFocus?: () => void;
    keyboardType?: KeyboardTypeOptions;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    focusRingColor?: string;
    showPasswordToggle?: boolean;
}

const EnhancedTextField = forwardRef<TextInput, EnhancedTextFieldProps>(
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
            onFocus,
            keyboardType,
            autoCapitalize,
            focusRingColor = colors.focusRing,
            showPasswordToggle = false,
        },
        ref
    ) => {
        const [isFocused, setIsFocused] = useState(false);
        const [isPasswordVisible, setIsPasswordVisible] = useState(false);

        const hasError = !!error;
        const isSecure = secureTextEntry && !isPasswordVisible;

        const borderColor = hasError
            ? colors.error
            : isFocused
                ? focusRingColor
                : colors.divider;

        const backgroundColor = disabled ? colors.disabledBg : colors.surface;

        const handleFocus = () => {
            setIsFocused(true);
            onFocus && onFocus();
        };

        const handleBlur = () => {
            setIsFocused(false);
            onBlur && onBlur();
        };

        const togglePasswordVisibility = () => {
            setIsPasswordVisible(!isPasswordVisible);
        };

        return (
            <View style={[styles.container, containerStyle]}>
                <Text style={[styles.label, hasError && styles.labelError]}>
                    {label}
                </Text>
                <View
                    style={[
                        styles.inputContainer,
                        { borderColor, backgroundColor },
                        isFocused && styles.inputContainerFocused,
                        hasError && styles.inputContainerError,
                        disabled && styles.disabled,
                    ]}
                >
                    {leftIcon && (
                        <Ionicons
                            name={leftIcon}
                            size={20}
                            color={colors.primary}
                            style={styles.icon}
                        />
                    )}
                    <TextInput
                        ref={ref}
                        style={[styles.input, disabled && styles.inputTextDisabled, inputStyle]}
                        value={value}
                        onChangeText={onChangeText}
                        placeholder={placeholder}
                        placeholderTextColor={colors.textSecondary}
                        secureTextEntry={isSecure}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        editable={!disabled}
                        keyboardType={keyboardType}
                        autoCapitalize={autoCapitalize}
                    />
                    {showPasswordToggle && secureTextEntry && (
                        <TouchableOpacity
                            onPress={togglePasswordVisibility}
                            style={styles.passwordToggle}
                        >
                            <Ionicons
                                name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                                size={20}
                                color={colors.textSecondary}
                            />
                        </TouchableOpacity>
                    )}
                    {rightIcon && !showPasswordToggle && (
                        <TouchableOpacity
                            onPress={onRightIconPress}
                            disabled={!onRightIconPress}
                            style={styles.rightIconContainer}
                        >
                            <Ionicons
                                name={rightIcon}
                                size={20}
                                color={colors.textSecondary}
                                style={styles.icon}
                            />
                        </TouchableOpacity>
                    )}
                </View>
                {(helperText || error) && (
                    <Text style={[styles.helperText, hasError && styles.errorText]}>
                        {error || helperText}
                    </Text>
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
        ...typography.label,
        color: colors.text,
        marginBottom: spacing.xs,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    labelError: {
        color: colors.error,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.divider,
        paddingHorizontal: spacing.md,
        paddingVertical: 4,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    inputContainerFocused: {
        shadowColor: colors.focusRing,
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    inputContainerError: {
        borderColor: colors.error,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: colors.text,
        paddingVertical: 12,
        fontWeight: '500',
    },
    inputTextDisabled: {
        color: colors.disabledText,
    },
    icon: {
        marginRight: spacing.sm,
    },
    passwordToggle: {
        padding: spacing.xs,
        marginLeft: spacing.xs,
    },
    rightIconContainer: {
        padding: spacing.xs,
        marginLeft: spacing.xs,
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

EnhancedTextField.displayName = 'EnhancedTextField';

export default EnhancedTextField;
