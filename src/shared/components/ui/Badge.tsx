import React from 'react';
import {
    View,
    Text,
    ViewStyle,
    TextStyle,
    ViewProps,
} from 'react-native';
import { colors, typography, spacing, radius } from '@/design/tokens';

export interface BadgeProps extends ViewProps {
    variant?: 'dot' | 'number' | 'status';
    type?: 'online' | 'offline' | 'uploaded' | 'local' | 'high' | 'critical' | 'success' | 'warning' | 'error';
    label?: string | number;
    size?: 'small' | 'medium' | 'large';
}

export default function Badge({
    variant = 'status',
    type = 'success',
    label,
    size = 'medium',
    style,
    ...props
}: BadgeProps) {
    const getBadgeColor = () => {
        switch (type) {
            case 'online':
            case 'uploaded':
            case 'success':
                return colors.success;
            case 'offline':
                return colors.offline;
            case 'local':
            case 'warning':
                return colors.warning;
            case 'high':
            case 'error':
                return colors.error;
            case 'critical':
                return colors.statusCritical;
            default:
                return colors.success;
        }
    };

    const getSize = () => {
        switch (size) {
            case 'small':
                return variant === 'dot' ? 6 : 16;
            case 'medium':
                return variant === 'dot' ? 8 : 20;
            case 'large':
                return variant === 'dot' ? 10 : 24;
            default:
                return variant === 'dot' ? 8 : 20;
        }
    };

    const badgeStyle: ViewStyle = {
        backgroundColor: getBadgeColor(),
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
    };

    // Dot 배지
    if (variant === 'dot') {
        const dotSize = getSize();
        return (
            <View
                {...props}
                style={[
                    badgeStyle,
                    {
                        width: dotSize,
                        height: dotSize,
                    },
                    style,
                ]}
                accessibilityLabel={`상태: ${type}`}
            />
        );
    }

    // Number 배지
    if (variant === 'number') {
        const badgeSize = getSize();
        const textStyle: TextStyle = {
            ...typography.caption,
            color: colors.surface,
            fontWeight: '600',
            fontSize: size === 'small' ? 10 : 12,
        };

        const minWidth = badgeSize;
        const height = badgeSize;
        const paddingHorizontal = label && label.toString().length > 1 ? spacing.xs : 0;

        return (
            <View
                {...props}
                style={[
                    badgeStyle,
                    {
                        minWidth,
                        height,
                        paddingHorizontal,
                    },
                    style,
                ]}
                accessibilityLabel={`알림 ${label}개`}
            >
                <Text style={textStyle} numberOfLines={1}>
                    {label}
                </Text>
            </View>
        );
    }

    // Status 배지
    const statusStyle: ViewStyle = {
        ...badgeStyle,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs / 2,
        minHeight: getSize(),
    };

    const statusTextStyle: TextStyle = {
        ...typography.caption,
        color: colors.surface,
        fontWeight: '600',
        fontSize: size === 'small' ? 10 : 11,
    };

    const getStatusLabel = () => {
        switch (type) {
            case 'online':
                return '온라인';
            case 'offline':
                return '오프라인';
            case 'uploaded':
                return '업로드됨';
            case 'local':
                return '로컬';
            case 'high':
                return '높음';
            case 'critical':
                return '위험';
            case 'success':
                return '성공';
            case 'warning':
                return '경고';
            case 'error':
                return '오류';
            default:
                return label?.toString() || '상태';
        }
    };

    return (
        <View
            {...props}
            style={[statusStyle, style]}
            accessibilityLabel={`상태: ${getStatusLabel()}`}
        >
            <Text style={statusTextStyle} numberOfLines={1}>
                {label?.toString() || getStatusLabel()}
            </Text>
        </View>
    );
} 