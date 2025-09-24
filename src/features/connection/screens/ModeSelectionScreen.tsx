import React, { useState, useCallback } from 'react';

// 홈캠 목록과 일치하는 색상 팔레트 (Android에서도 동일 렌더링되도록 누락 키 추가)
const SCREEN_COLORS = {
    primary: '#007AFF',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    surfaceAlt: '#F7F4EF',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#C6C6C8',
    divider: '#E5E5EA',
    accent: '#F5C572',
} as const;
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

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/app/navigation/AppNavigator';
import Button from '@/shared/components/ui/Button';
import { typography, radius } from '@/design/tokens';

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
                    borderColor: isSelected ? SCREEN_COLORS.primary : SCREEN_COLORS.divider,
                    borderWidth: isSelected ? 2 : 1,
                }
            ]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <LinearGradient
                colors={isSelected
                    ? [gradientColors[0] + '15', gradientColors[1] + '08']
                    : [SCREEN_COLORS.surface, SCREEN_COLORS.surfaceAlt]
                }
                style={styles.modeCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Header Section */}
                <View style={styles.cardHeader}>
                    <View style={styles.iconSection}>
                        <LinearGradient
                            colors={isSelected ? gradientColors : [SCREEN_COLORS.primary + '20', SCREEN_COLORS.primary + '10']}
                            style={styles.iconContainer}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Ionicons
                                name={icon as any}
                                size={28}
                                color={isSelected ? SCREEN_COLORS.surface : SCREEN_COLORS.primary}
                            />
                        </LinearGradient>
                        {isSelected && (
                            <View style={styles.selectedIndicator}>
                                <Ionicons name="checkmark" size={14} color={SCREEN_COLORS.surface} />
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
                                        : SCREEN_COLORS.surfaceAlt
                                }
                            ]}>
                                <Ionicons
                                    name={feature.icon as any}
                                    size={16}
                                    color={isSelected ? feature.color : SCREEN_COLORS.textSecondary}
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

    const handleContinue = useCallback(async () => {
        if (!selectedMode) return;

        if (Platform.OS === 'ios' && Haptics) {
            try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch (error) {
                console.log('Haptic feedback failed');
            }
        }

        if (selectedMode === 'viewer') {
            // 뷰어 모드: 항상 뷰어 대시보드로 이동
            navigation.replace('ViewerDashboard');

            // 디버깅용: API 응답 구조 확인
            try {
                const { api } = await import('@/shared/services/api/api');
                const response = await api.get('/cameras');
                console.log('[ModeSelection] Camera API test response:', response.data);
            } catch (error) {
                // 개발 시 네트워크 미설정으로 실패할 수 있으므로 경고로만 기록
                console.warn('[ModeSelection] Camera API test failed (non-blocking):', error);
            }
        } else if (selectedMode === 'camera') {
            navigation.replace('CameraHome');
        } else if (selectedMode === 'websocket') {
            navigation.navigate('WebSocketTest');
        }
    }, [selectedMode, navigation]);

    const viewerFeatures = [
        { icon: 'videocam-outline', text: '실시간 영상 확인', color: SCREEN_COLORS.primary },
        { icon: 'play-circle-outline', text: '저장된 영상 재생', color: SCREEN_COLORS.primary },
        { icon: 'notifications-outline', text: '이벤트 알림 수신', color: SCREEN_COLORS.primary },
    ];

    const cameraFeatures = [
        { icon: 'radio-button-on', text: '자동 영상 녹화', color: SCREEN_COLORS.accent },
        { icon: 'wifi-outline', text: '실시간 영상 전송', color: SCREEN_COLORS.accent },
        { icon: 'qr-code-outline', text: '연결 QR 코드', color: SCREEN_COLORS.accent },
    ];

    const websocketFeatures = [
        { icon: 'wifi-outline', text: '실시간 연결 테스트', color: SCREEN_COLORS.warning },
        { icon: 'chatbubble-outline', text: '메시지 송수신', color: SCREEN_COLORS.warning },
        { icon: 'analytics-outline', text: '통신 상태 모니터링', color: SCREEN_COLORS.warning },
    ];

    return (
        <>
            <StatusBar barStyle="dark-content" backgroundColor={SCREEN_COLORS.background} />
            <View style={styles.container}>
                <LinearGradient
                    colors={[SCREEN_COLORS.background, SCREEN_COLORS.surfaceAlt]}
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
                                gradientColors={[SCREEN_COLORS.primary, '#4A5F5D']}
                                onPress={() => handleModeSelect('viewer')}
                                isSelected={selectedMode === 'viewer'}
                            />

                            <ModeCard
                                title="홈캠 모드"
                                description="이 기기를 카메라로 사용해 영상을 녹화하고 다른 기기로 스트리밍합니다."
                                icon="camera-outline"
                                features={cameraFeatures}
                                gradientColors={[SCREEN_COLORS.accent, '#E6B85C']}
                                onPress={() => handleModeSelect('camera')}
                                isSelected={selectedMode === 'camera'}
                            />

                            <ModeCard
                                title="개발자 도구"
                                description="실시간 통신 연결을 테스트하고 메시지 송수신을 확인합니다."
                                icon="bug-outline"
                                features={websocketFeatures}
                                gradientColors={[SCREEN_COLORS.warning, '#FF9500']}
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
        backgroundColor: SCREEN_COLORS.background,
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
        paddingTop: 16,
        paddingBottom: 20,
        paddingHorizontal: 24,
    },
    subtitle: {
        ...typography.h2,
        color: SCREEN_COLORS.text,
        textAlign: 'center',
    },
    modeContainer: {
        paddingHorizontal: 20,
        gap: 16,
    },
    modeCard: {
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: SCREEN_COLORS.surface,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
    },
    modeCardGradient: {
        padding: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconSection: {
        position: 'relative',
        marginRight: 16,
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
        backgroundColor: SCREEN_COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: SCREEN_COLORS.surface,
    },
    titleSection: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    modeTitle: {
        ...typography.h3,
        color: SCREEN_COLORS.text,
    },
    modeTitleSelected: {
        color: SCREEN_COLORS.primary,
    },
    modeDescription: {
        ...typography.bodySm,
        color: SCREEN_COLORS.textSecondary,
        lineHeight: 18,
    },
    modeDescriptionSelected: {
        color: SCREEN_COLORS.text,
    },
    featuresSection: {
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: SCREEN_COLORS.divider,
        paddingTop: 16,
        gap: 12,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
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
        color: SCREEN_COLORS.textSecondary,
        flex: 1,
    },
    featureTextSelected: {
        color: SCREEN_COLORS.text,
        fontWeight: '500',
    },
    continueButtonContainer: {
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 24 : 20,
        backgroundColor: SCREEN_COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: SCREEN_COLORS.divider,
    },
    developmentBadge: {
        backgroundColor: SCREEN_COLORS.accent,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    developmentText: {
        ...typography.caption,
        color: SCREEN_COLORS.surface,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
}); 