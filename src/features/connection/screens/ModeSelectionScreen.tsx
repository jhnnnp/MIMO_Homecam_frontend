import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Platform,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, elevation, typography } from '@/design/tokens';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/app/navigation/AppNavigator';
import Button from '@/shared/components/ui/Button';

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
    const [selectedMode, setSelectedMode] = useState<'viewer' | 'camera' | 'websocket' | null>(null);

    const handleModeSelect = useCallback((mode: 'viewer' | 'camera' | 'websocket') => {
        setSelectedMode(mode);
        if (Platform.OS === 'ios' && Haptics) {
            try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch (error) {
                // Haptic feedback failed, do nothing
            }
        }
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
            navigation.replace('ViewerHome');
        } else if (selectedMode === 'camera') {
            navigation.replace('CameraHome');
        } else if (selectedMode === 'websocket') {
            navigation.navigate('WebSocketTest');
        }
    }, [selectedMode, navigation]);

    const viewerFeatures = [
        { icon: 'videocam-outline', text: '실시간 영상 확인', color: colors.primary },
        { icon: 'play-circle-outline', text: '저장된 영상 재생', color: colors.primary },
        { icon: 'notifications-outline', text: '이벤트 알림 수신', color: colors.primary },
    ];

    const cameraFeatures = [
        { icon: 'radio-button-on', text: '자동 영상 녹화', color: colors.accent },
        { icon: 'wifi-outline', text: '실시간 영상 전송', color: colors.accent },
        { icon: 'qr-code-outline', text: '연결 QR 코드', color: colors.accent },
    ];

    const websocketFeatures = [
        { icon: 'wifi-outline', text: '실시간 연결 테스트', color: colors.warning },
        { icon: 'chatbubble-outline', text: '메시지 송수신', color: colors.warning },
        { icon: 'analytics-outline', text: '통신 상태 모니터링', color: colors.warning },
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
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        {/* Header Section */}
                        <View style={styles.header}>
                            <Text style={styles.subtitle}>어떤 용도로 사용하시겠어요?</Text>
                        </View>

                        {/* Mode Selection Cards */}
                        <View style={styles.modeContainer}>
                            <ModeCard
                                title="뷰어 모드"
                                description="다른 기기의 카메라 영상을 실시간으로 확인하고 녹화된 영상을 재생합니다."
                                icon="eye-outline"
                                features={viewerFeatures}
                                gradientColors={[colors.primary, '#4A5F5D']}
                                onPress={() => handleModeSelect('viewer')}
                                isSelected={selectedMode === 'viewer'}
                            />

                            <ModeCard
                                title="홈캠 모드"
                                description="이 기기를 카메라로 사용해 영상을 녹화하고 다른 기기로 스트리밍합니다."
                                icon="camera-outline"
                                features={cameraFeatures}
                                gradientColors={[colors.accent, '#E6B85C']}
                                onPress={() => handleModeSelect('camera')}
                                isSelected={selectedMode === 'camera'}
                            />

                            <ModeCard
                                title="개발자 도구"
                                description="실시간 통신 연결을 테스트하고 메시지 송수신을 확인합니다."
                                icon="bug-outline"
                                features={websocketFeatures}
                                gradientColors={[colors.warning, '#FF9500']}
                                onPress={() => handleModeSelect('websocket')}
                                isSelected={selectedMode === 'websocket'}
                                showDevelopmentBadge={true}
                            />
                        </View>
                    </ScrollView>

                    {/* Continue Button */}
                    <View style={styles.continueButtonContainer}>
                        <Button
                            title="선택 완료"
                            onPress={handleContinue}
                            disabled={!selectedMode}
                            size="lg"
                            rightIcon="arrow-forward"
                            fullWidth
                        />
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
        paddingTop: 0,
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
        paddingHorizontal: spacing.xl,
    },
    subtitle: {
        ...typography.h2,
        color: colors.text,
        textAlign: 'center',
    },
    modeContainer: {
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
    },
    modeCard: {
        borderRadius: radius.xl,
        overflow: 'hidden',
        backgroundColor: colors.surface,
        ...elevation['2'],
    },
    modeCardGradient: {
        padding: spacing.lg,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    iconSection: {
        position: 'relative',
        marginRight: spacing.md,
    },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedIndicator: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.surface,
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
        ...typography.h3,
        color: colors.text,
    },
    modeTitleSelected: {
        color: colors.primary,
    },
    modeDescription: {
        ...typography.bodySm,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    modeDescriptionSelected: {
        color: colors.text,
    },
    featuresSection: {
        marginTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        paddingTop: spacing.md,
        gap: spacing.sm,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    featureIcon: {
        width: 24,
        height: 24,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureText: {
        ...typography.body,
        color: colors.textSecondary,
        flex: 1,
    },
    featureTextSelected: {
        color: colors.text,
        fontWeight: '500',
    },
    continueButtonContainer: {
        padding: spacing.lg,
        paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
    },
    developmentBadge: {
        backgroundColor: colors.accent,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.sm,
    },
    developmentText: {
        ...typography.caption,
        color: colors.surface,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
}); 