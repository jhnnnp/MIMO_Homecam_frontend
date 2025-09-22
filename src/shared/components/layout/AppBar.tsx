import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ViewStyle,
    TextStyle,
    StatusBar,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, layout, radius, elevation } from '@/design/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface AppBarAction {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    accessibilityLabel: string;
    badge?: number;
}

export interface AppBarProps {
    title: string;
    showBackButton?: boolean;
    onBackPress?: () => void;
    actions?: AppBarAction[];
    variant?: 'default' | 'primary' | 'transparent';
    compressed?: boolean;
}

export default function AppBar({
    title,
    showBackButton = false,
    onBackPress,
    actions = [],
    variant = 'default',
    compressed = false,
}: AppBarProps) {
    const insets = useSafeAreaInsets();

    const getBackgroundColor = () => {
        switch (variant) {
            case 'primary':
                return colors.primary;
            case 'transparent':
                return 'transparent';
            default:
                return colors.surface;
        }
    };

    const getTextColor = () => {
        return variant === 'primary' ? colors.surface : colors.text;
    };

    const getIconColor = () => {
        return variant === 'primary' ? colors.surface : colors.text;
    };

    const containerStyle: ViewStyle = {
        backgroundColor: getBackgroundColor(),
        paddingTop: Math.max(insets.top - 8, 0),
        paddingHorizontal: spacing.md,
        height: (compressed ? layout.appBarHeightCompressed : layout.appBarHeight) + Math.max(insets.top - 8, 0),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: variant === 'transparent' ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: colors.divider,
        ...(variant === 'default' ? elevation.level1 : {}),
    };

    const titleStyle: TextStyle = {
        fontSize: 18,
        lineHeight: 24,
        fontWeight: '600',
        color: getTextColor(),
        marginLeft: showBackButton ? spacing.md : 0,
        flex: 1,
    };

    const leftSectionStyle: ViewStyle = {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    };

    const rightSectionStyle: ViewStyle = {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        minWidth: 100,
    };

    const actionButtonStyle: ViewStyle = {
        padding: spacing.sm,
        marginLeft: spacing.xs,
        borderRadius: radius.md,
    };

    return (
        <>
            <StatusBar
                barStyle={variant === 'primary' ? 'light-content' : 'dark-content'}
                backgroundColor={getBackgroundColor()}
                translucent={false}
            />
            <View style={containerStyle}>
                <View style={leftSectionStyle}>
                    {showBackButton && (
                        <TouchableOpacity
                            onPress={onBackPress}
                            style={actionButtonStyle}
                            accessibilityRole="button"
                            accessibilityLabel="뒤로 가기"
                        >
                            <Ionicons
                                name="arrow-back"
                                size={24}
                                color={getIconColor()}
                            />
                        </TouchableOpacity>
                    )}
                    <Text style={titleStyle} numberOfLines={1}>
                        {title}
                    </Text>
                </View>

                <View style={rightSectionStyle}>
                    {actions.map((action, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={action.onPress}
                            style={actionButtonStyle}
                            accessibilityRole="button"
                            accessibilityLabel={action.accessibilityLabel}
                        >
                            <View>
                                <Ionicons
                                    name={action.icon}
                                    size={24}
                                    color={getIconColor()}
                                />
                                {action.badge && action.badge > 0 && (
                                    <View style={styles.badgeContainer}>
                                        <Text style={styles.badgeText}>
                                            {action.badge > 99 ? '99+' : action.badge}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    badgeContainer: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: colors.error,
        borderRadius: radius.full,
        minWidth: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: colors.surface,
        fontSize: 10,
        lineHeight: 12,
        fontWeight: '600',
    },
}); 