import React from 'react';
import {
    View,
    Text,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../design/tokens';
import Button from './Button';

export interface ErrorStateProps {
    title?: string;
    message?: string;
    buttonText?: string;
    onRetry?: () => void;
    icon?: keyof typeof Ionicons.glyphMap;
    style?: ViewStyle;
}

export default function ErrorState({
    title = '문제가 발생했어요',
    message = '잠시 후 다시 시도해 주세요.',
    buttonText = '다시 시도',
    onRetry,
    icon = 'alert-circle-outline',
    style,
}: ErrorStateProps) {
    const containerStyle: ViewStyle = {
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing['3xl'],
    };

    const iconStyle = {
        marginBottom: spacing.lg,
    };

    const titleStyle: TextStyle = {
        ...typography.h3,
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.sm,
    };

    const messageStyle: TextStyle = {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing['2xl'],
        lineHeight: 22,
    };

    return (
        <View style={[containerStyle, style]} accessibilityLabel={`오류: ${title}`}>
            <Ionicons
                name={icon}
                size={48}
                color={colors.textWeak}
                style={iconStyle}
            />

            <Text style={titleStyle}>
                {title}
            </Text>

            <Text style={messageStyle}>
                {message}
            </Text>

            {onRetry && (
                <Button
                    title={buttonText}
                    onPress={onRetry}
                    variant="secondary"
                    size="medium"
                />
            )}
        </View>
    );
} 