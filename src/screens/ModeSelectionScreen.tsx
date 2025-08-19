import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius, elevation } from '../design/tokens';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ModeSelectionScreenProps {
    navigation: any;
}

export default function ModeSelectionScreen({ navigation }: ModeSelectionScreenProps) {
    const [selectedMode, setSelectedMode] = useState<'viewer' | 'camera' | null>(null);

    const handleModeSelect = (mode: 'viewer' | 'camera') => {
        setSelectedMode(mode);

        // 모드에 따라 다른 화면으로 이동
        if (mode === 'viewer') {
            navigation.replace('Main'); // 뷰어 모드 - 메인 화면
        } else {
            navigation.replace('CameraMode'); // 카메라 모드 - 카메라 전용 화면
        }
    };

    return (
        <>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <View style={styles.container}>
                {/* Background Gradient */}
                <LinearGradient
                    colors={[colors.background, colors.surfaceAlt]}
                    style={styles.gradientBackground}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />

                {/* Floating Elements */}
                <View style={styles.floatingElement1} />
                <View style={styles.floatingElement2} />
                <View style={styles.floatingElement3} />

                <SafeAreaView style={styles.safeArea}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>MIMO</Text>
                        <Text style={styles.subtitle}>사용 모드를 선택해주세요</Text>
                    </View>

                    {/* Mode Selection Cards */}
                    <View style={styles.modeContainer}>
                        {/* Viewer Mode Card */}
                        <TouchableOpacity
                            style={[
                                styles.modeCard,
                                selectedMode === 'viewer' && styles.modeCardSelected
                            ]}
                            onPress={() => handleModeSelect('viewer')}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={selectedMode === 'viewer'
                                    ? [colors.primary + '20', colors.primaryLight + '20']
                                    : [colors.surface, colors.surfaceAlt]
                                }
                                style={styles.modeCardGradient}
                            >
                                <View style={styles.modeIconContainer}>
                                    <LinearGradient
                                        colors={[colors.primary, colors.accent]}
                                        style={styles.modeIcon}
                                    >
                                        <Ionicons name="eye-outline" size={48} color={colors.surface} />
                                    </LinearGradient>
                                </View>

                                <Text style={styles.modeTitle}>뷰어 모드</Text>
                                <Text style={styles.modeDescription}>
                                    공기계 카메라의 영상을 실시간으로 확인하고 녹화된 영상을 재생합니다
                                </Text>

                                <View style={styles.modeFeatures}>
                                    <View style={styles.featureItem}>
                                        <Ionicons name="videocam-outline" size={16} color={colors.primary} />
                                        <Text style={styles.featureText}>실시간 스트리밍</Text>
                                    </View>
                                    <View style={styles.featureItem}>
                                        <Ionicons name="play-circle-outline" size={16} color={colors.primary} />
                                        <Text style={styles.featureText}>녹화 영상 재생</Text>
                                    </View>
                                    <View style={styles.featureItem}>
                                        <Ionicons name="notifications-outline" size={16} color={colors.primary} />
                                        <Text style={styles.featureText}>이벤트 알림</Text>
                                    </View>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Camera Mode Card */}
                        <TouchableOpacity
                            style={[
                                styles.modeCard,
                                selectedMode === 'camera' && styles.modeCardSelected
                            ]}
                            onPress={() => handleModeSelect('camera')}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={selectedMode === 'camera'
                                    ? [colors.accent + '20', colors.warning + '20']
                                    : [colors.surface, colors.surfaceAlt]
                                }
                                style={styles.modeCardGradient}
                            >
                                <View style={styles.modeIconContainer}>
                                    <LinearGradient
                                        colors={[colors.accent, colors.warning]}
                                        style={styles.modeIcon}
                                    >
                                        <Ionicons name="camera-outline" size={48} color={colors.surface} />
                                    </LinearGradient>
                                </View>

                                <Text style={styles.modeTitle}>카메라 모드</Text>
                                <Text style={styles.modeDescription}>
                                    이 기기를 홈캠으로 사용하여 영상을 녹화하고 스트리밍합니다
                                </Text>

                                <View style={styles.modeFeatures}>
                                    <View style={styles.featureItem}>
                                        <Ionicons name="record-circle-outline" size={16} color={colors.accent} />
                                        <Text style={styles.featureText}>자동 녹화</Text>
                                    </View>
                                    <View style={styles.featureItem}>
                                        <Ionicons name="wifi-outline" size={16} color={colors.accent} />
                                        <Text style={styles.featureText}>실시간 스트리밍</Text>
                                    </View>
                                    <View style={styles.featureItem}>
                                        <Ionicons name="qr-code-outline" size={16} color={colors.accent} />
                                        <Text style={styles.featureText}>연결 코드 제공</Text>
                                    </View>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* Info Section */}
                    <View style={styles.infoSection}>
                        <View style={styles.infoCard}>
                            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                            <Text style={styles.infoText}>
                                모드는 언제든지 설정에서 변경할 수 있습니다
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
    gradientBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    floatingElement1: {
        position: 'absolute',
        top: 100,
        right: -30,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.accent + '30',
        opacity: 0.6,
    },
    floatingElement2: {
        position: 'absolute',
        top: 300,
        left: -40,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primary + '20',
        opacity: 0.4,
    },
    floatingElement3: {
        position: 'absolute',
        bottom: 150,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.accent + '40',
        opacity: 0.3,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        alignItems: 'center',
        paddingTop: spacing['3xl'],
        paddingBottom: spacing['2xl'],
    },
    title: {
        fontSize: 42,
        fontWeight: '800',
        color: colors.primary,
        marginBottom: spacing.sm,
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 18,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    modeContainer: {
        flex: 1,
        paddingHorizontal: spacing.xl,
        gap: spacing.xl,
    },
    modeCard: {
        borderRadius: 24,
        overflow: 'hidden',
        ...elevation['3'],
        borderWidth: 2,
        borderColor: 'transparent',
    },
    modeCardSelected: {
        borderColor: colors.primary,
        ...elevation['4'],
    },
    modeCardGradient: {
        padding: spacing['2xl'],
        alignItems: 'center',
    },
    modeIconContainer: {
        marginBottom: spacing.xl,
    },
    modeIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        ...elevation['2'],
    },
    modeTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    modeDescription: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.md,
    },
    modeFeatures: {
        gap: spacing.sm,
        width: '100%',
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    featureText: {
        fontSize: 14,
        color: colors.text,
        fontWeight: '500',
    },
    infoSection: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xl,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.lg,
        backgroundColor: colors.primaryLight,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.primary + '30',
    },
    infoText: {
        fontSize: 14,
        color: colors.text,
        flex: 1,
        lineHeight: 20,
    },
}); 