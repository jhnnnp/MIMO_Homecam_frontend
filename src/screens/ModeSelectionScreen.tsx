import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, elevation } from '../design/tokens';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

// HapticFeedback 안전한 import
let Haptics: any = null;
try {
    Haptics = require('expo-haptics');
} catch (error) {
    console.log('expo-haptics not available');
}

type ModeSelectionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ModeSelection'>;

interface ModeSelectionScreenProps {
    navigation: ModeSelectionScreenNavigationProp;
}

interface ModeCardProps {
    title: string;
    description: string;
    icon: string;
    features: Array<{ icon: string; text: string; color: string }>;
    gradientColors: [string, string];
    onPress: () => void;
    isSelected: boolean;
    showDevelopmentBadge?: boolean;
}

const ModeCard: React.FC<ModeCardProps> = ({
    title,
    description,
    icon,
    features,
    gradientColors,
    onPress,
    isSelected,
    showDevelopmentBadge = false,
}) => {
    return (
        <TouchableOpacity
            style={[
                styles.modeCard,
                {
                    borderColor: isSelected ? colors.primary : colors.divider,
                    borderWidth: isSelected ? 2 : 1,
                }
            ]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <LinearGradient
                colors={isSelected
                    ? [gradientColors[0] + '15', gradientColors[1] + '08']
                    : [colors.surface, colors.surfaceAlt]
                }
                style={styles.modeCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Header Section */}
                <View style={styles.cardHeader}>
                    <View style={styles.iconSection}>
                        <LinearGradient
                            colors={isSelected ? gradientColors : [colors.primary + '20', colors.primary + '10']}
                            style={styles.iconContainer}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Ionicons
                                name={icon as any}
                                size={28}
                                color={isSelected ? colors.surface : colors.primary}
                            />
                        </LinearGradient>
                        {isSelected && (
                            <View style={styles.selectedIndicator}>
                                <Ionicons name="checkmark" size={14} color={colors.surface} />
                            </View>
                        )}
                    </View>

                    <View style={styles.titleSection}>
                        <View style={styles.titleRow}>
                            <Text style={[styles.modeTitle, isSelected && styles.modeTitleSelected]}>
                                {title}
                            </Text>
                            {showDevelopmentBadge && (
                                <View style={styles.developmentBadge}>
                                    <Text style={styles.developmentText}>개발 중</Text>
                                </View>
                            )}
                        </View>
                        <Text style={[styles.modeDescription, isSelected && styles.modeDescriptionSelected]}>
                            {description}
                        </Text>
                    </View>
                </View>

                {/* Features Section */}
                <View style={styles.featuresSection}>
                    {features.map((feature, index) => (
                        <View key={index} style={styles.featureItem}>
                            <View style={[
                                styles.featureIcon,
                                {
                                    backgroundColor: isSelected
                                        ? feature.color + '20'
                                        : colors.surfaceAlt
                                }
                            ]}>
                                <Ionicons
                                    name={feature.icon as any}
                                    size={16}
                                    color={isSelected ? feature.color : colors.textSecondary}
                                />
                            </View>
                            <Text style={[styles.featureText, isSelected && styles.featureTextSelected]}>
                                {feature.text}
                            </Text>
                        </View>
                    ))}
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
};

export default function ModeSelectionScreen({ navigation }: ModeSelectionScreenProps) {
    const [selectedMode, setSelectedMode] = useState<'viewer' | 'camera' | null>(null);

    const handleModeSelect = useCallback((mode: 'viewer' | 'camera') => {
        setSelectedMode(mode);
    }, []);

    const handleContinue = useCallback(() => {
        if (!selectedMode) return;

        if (Platform.OS === 'ios' && Haptics) {
            try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch (error) {
                console.log('Haptic feedback failed');
            }
        }

        if (selectedMode === 'viewer') {
            navigation.replace('ViewerMode');
        } else if (selectedMode === 'camera') {
            navigation.replace('CameraMode');
        }
    }, [selectedMode, navigation]);

    const viewerFeatures = [
        { icon: 'videocam-outline', text: '실시간 영상 확인', color: colors.primary },
        { icon: 'play-circle-outline', text: '저장된 영상 재생', color: colors.primary },
        { icon: 'notifications-outline', text: '이벤트 알림 수신', color: colors.primary },
    ];

    const cameraFeatures = [
        { icon: 'record-circle-outline', text: '자동 영상 녹화', color: colors.accent },
        { icon: 'wifi-outline', text: '실시간 영상 전송', color: colors.accent },
        { icon: 'qr-code-outline', text: '연결 QR 코드', color: colors.accent },
    ];

    return (
        <>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.background, colors.surfaceAlt]}
                    style={styles.backgroundGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />

                <SafeAreaView style={styles.safeArea}>
                    {/* Header Section */}
                    <View style={styles.header}>
                        <Text style={styles.subtitle}>사용 모드를 선택해주세요</Text>
                    </View>

                    {/* Mode Selection Cards */}
                    <View style={styles.modeContainer}>
                        <ModeCard
                            title="뷰어 모드"
                            description="다른 기기의 카메라 영상을 실시간으로 확인하고 녹화된 영상을 재생할 수 있습니다"
                            icon="eye-outline"
                            features={viewerFeatures}
                            gradientColors={[colors.primary, '#4A5F5D']}
                            onPress={() => handleModeSelect('viewer')}
                            isSelected={selectedMode === 'viewer'}
                        />

                        <ModeCard
                            title="홈캠 모드"
                            description="이 기기를 카메라로 사용하여 영상을 녹화하고 다른 기기로 스트리밍할 수 있습니다"
                            icon="camera-outline"
                            features={cameraFeatures}
                            gradientColors={[colors.accent, '#E6B85C']}
                            onPress={() => handleModeSelect('camera')}
                            isSelected={selectedMode === 'camera'}
                            showDevelopmentBadge={true}
                        />
                    </View>

                    {/* Continue Button */}
                    {selectedMode && (
                        <View style={styles.continueButtonContainer}>
                            <TouchableOpacity
                                style={styles.continueButton}
                                onPress={handleContinue}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={[colors.primary, '#4A5F5D']}
                                    style={styles.continueButtonGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <Text style={styles.continueButtonText}>계속하기</Text>
                                    <Ionicons name="arrow-forward" size={20} color={colors.surface} />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Info Section */}
                    <View style={styles.infoSection}>
                        <View style={styles.infoCard}>
                            <Ionicons name="information-circle" size={18} color={colors.primary} />
                            <Text style={styles.infoText}>
                                선택한 모드는 언제든지 설정에서 변경할 수 있습니다
                            </Text>
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    backgroundGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        alignItems: 'center',
        paddingTop: spacing.xl,
        paddingBottom: spacing.lg,
        paddingHorizontal: spacing.xl,
    },
    subtitle: {
        fontSize: 18,
        color: colors.primary,
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '600',
        letterSpacing: 1,
        fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Regular' : 'sans-serif-light',
        textShadowColor: colors.primary + '20',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    modeContainer: {
        flex: 1,
        paddingHorizontal: spacing.xl,
        gap: spacing.md,
        justifyContent: 'center',
        paddingVertical: spacing.md,
        paddingBottom: spacing.xl,
    },
    modeCard: {
        borderRadius: radius.xl,
        overflow: 'hidden',
        ...elevation['2'],
    },
    modeCardGradient: {
        padding: spacing.md,
        minHeight: 140,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: spacing.lg,
    },
    iconSection: {
        position: 'relative',
        marginRight: spacing.lg,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedIndicator: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleSection: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.xs,
    },
    modeTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: -0.5,
    },
    modeTitleSelected: {
        color: colors.primary,
    },
    modeDescription: {
        fontSize: 15,
        color: colors.textSecondary,
        lineHeight: 22,
        fontWeight: '400',
    },
    modeDescriptionSelected: {
        color: colors.text,
        fontWeight: '500',
    },
    featuresSection: {
        gap: spacing.sm,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    featureIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureText: {
        fontSize: 14,
        color: colors.text,
        fontWeight: '500',
        flex: 1,
        lineHeight: 20,
    },
    featureTextSelected: {
        fontWeight: '600',
    },
    continueButtonContainer: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
        paddingBottom: spacing.sm,
        marginTop: 'auto',
    },
    continueButton: {
        borderRadius: radius.lg,
        overflow: 'hidden',
        ...elevation['2'],
    },
    continueButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        gap: spacing.sm,
    },
    continueButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.surface,
        letterSpacing: 0.5,
    },
    infoSection: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.md,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.primary + '10',
        ...elevation['1'],
    },
    infoText: {
        fontSize: 13,
        color: colors.text,
        flex: 1,
        lineHeight: 18,
        fontWeight: '500',
    },
    developmentBadge: {
        backgroundColor: colors.accent,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.sm,
    },
    developmentText: {
        fontSize: 10,
        color: colors.surface,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
}); 