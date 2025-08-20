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

export interface EmptyStateProps {
    title?: string;
    message?: string;
    buttonText?: string;
    onAction?: () => void;
    icon?: keyof typeof Ionicons.glyphMap;
    style?: ViewStyle;
}

export default function EmptyState({
    title = '아직 데이터가 없어요',
    message = '새로운 항목을 추가해 보세요.',
    buttonText,
    onAction,
    icon = 'folder-open-outline',
    style,
}: EmptyStateProps) {
    const containerStyle: ViewStyle = {
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing['3xl'],
        flex: 1,
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
        <View style={[containerStyle, style]} accessibilityLabel={`빈 상태: ${title}`}>
            <Ionicons
                name={icon}
                size={64}
                color={colors.textWeak}
                style={iconStyle}
            />

            <Text style={titleStyle}>
                {title}
            </Text>

            <Text style={messageStyle}>
                {message}
            </Text>

            {buttonText && onAction && (
                <Button
                    title={buttonText}
                    onPress={onAction}
                    variant="primary"
                    size="medium"
                />
            )}
        </View>
    );
} 