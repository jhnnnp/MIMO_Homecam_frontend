import React from 'react';
import {
    View,
    Text,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { colors, typography, spacing } from '../design/tokens';

export interface LoadingStateProps {
    message?: string;
    size?: 'small' | 'large';
    overlay?: boolean;
    style?: ViewStyle;
}

export default function LoadingState({
    message = '로딩 중...',
    size = 'large',
    overlay = false,
    style,
}: LoadingStateProps) {
    const containerStyle: ViewStyle = {
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing['2xl'],
        ...(overlay && {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.dimOverlay,
            zIndex: 999,
        }),
    };

    const textStyle: TextStyle = {
        ...typography.bodyMedium,
        color: overlay ? colors.surface : colors.textSecondary,
        marginTop: spacing.md,
        textAlign: 'center',
    };

    return (
        <View style={[containerStyle, style]} accessibilityLabel={message}>
            <ActivityIndicator
                size={size}
                color={overlay ? colors.surface : colors.primary}
            />
            {message && (
                <Text style={textStyle}>
                    {message}
                </Text>
            )}
        </View>
    );
} 