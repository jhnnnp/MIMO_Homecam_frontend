import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
    Dimensions,
    Animated,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { colors, spacing, radius, elevation, typography } from '../../design/tokens';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useCameraConnection } from '../../hooks/useCameraConnection';

const { width: screenWidth } = Dimensions.get('window');

type CameraPinCodeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CameraPinCode'>;

interface CameraPinCodeScreenProps {
    navigation: CameraPinCodeScreenNavigationProp;
}

export default function CameraPinCodeScreen({ navigation }: CameraPinCodeScreenProps) {
    const cameraId = `MIMO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const cameraName = '홈캠';

    const [connectionState, connectionActions] = useCameraConnection(cameraId, cameraName);
    const { pinCode, isConnected, connectedViewers, error } = connectionState;

    const [isGenerating, setIsGenerating] = useState(true);
    const [displayPinCode, setDisplayPinCode] = useState<string>('');

    // 애니메이션 값들
    const [fadeAnim] = useState(new Animated.Value(0));
    const [slideAnim] = useState(new Animated.Value(50));
    const [pinScaleAnim] = useState(new Animated.Value(0.8));
    const [pulseAnim] = useState(new Animated.Value(1));

    useEffect(() => {
        // 화면 진입 애니메이션
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();

        generatePinCode();
    }, []);

    // PIN 코드가 생성되면 애니메이션
    useEffect(() => {
        if (displayPinCode) {
            Animated.sequence([
                Animated.timing(pinScaleAnim, {
                    toValue: 1.2,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(pinScaleAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]).start();

            // 펄스 애니메이션 시작
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.05,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, [displayPinCode]);

    const generatePinCode = async () => {
        setIsGenerating(true);
        console.log('🎯 [PIN 화면] PIN 코드 생성 시작');
        console.log('🎯 [PIN 화면] 카메라 ID:', cameraId);
        console.log('🎯 [PIN 화면] 카메라 이름:', cameraName);

        try {
            const pin = await connectionActions.generatePinCode();
            console.log('✅ [PIN 화면] PIN 코드 생성 성공:', pin);
            setDisplayPinCode(pin);
        } catch (error) {
            console.error('❌ [PIN 화면] PIN 코드 생성 실패:', error);
            Alert.alert('오류', 'PIN 코드 생성에 실패했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRefreshPin = () => {
        Animated.timing(pinScaleAnim, {
            toValue: 0.8,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            generatePinCode();
        });
    };

    const handleCopyPin = async () => {
        try {
            await Clipboard.setStringAsync(displayPinCode);

            // 복사 성공 애니메이션
            Animated.sequence([
                Animated.timing(pinScaleAnim, {
                    toValue: 1.1,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(pinScaleAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();

            Alert.alert('복사 완료! 📋', 'PIN 코드가 클립보드에 복사되었습니다.');
        } catch (error) {
            Alert.alert('오류', '클립보드 복사에 실패했습니다.');
        }
    };

    const handleStopSharing = () => {
        Alert.alert(
            '공유 중지',
            'PIN 코드 공유를 중지하시겠어요?',
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '중지',
                    style: 'destructive',
                    onPress: () => {
                        connectionActions.disconnect();
                        navigation.goBack();
                    },
                },
            ]
        );
    };

    const renderPinCodeCard = () => {
        if (isGenerating) {
            return (
                <Animated.View
                    style={[
                        styles.pinCard,
                        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                    ]}
                >
                    <LinearGradient
                        colors={[colors.surface, colors.surfaceAlt]}
                        style={styles.pinCardGradient}
                    >
                        <View style={styles.loadingContainer}>
                            <View style={styles.loadingIconContainer}>
                                <LinearGradient
                                    colors={[colors.primary, colors.accent]}
                                    style={styles.loadingIconGradient}
                                >
                                    <Ionicons name="key" size={48} color={colors.surface} />
                                </LinearGradient>
                            </View>
                            <Text style={styles.loadingTitle}>PIN 코드 생성 중...</Text>
                            <Text style={styles.loadingSubtitle}>잠시만 기다려주세요</Text>
                        </View>
                    </LinearGradient>
                </Animated.View>
            );
        }

        if (!displayPinCode) {
            return (
                <Animated.View
                    style={[
                        styles.pinCard,
                        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                    ]}
                >
                    <LinearGradient
                        colors={[colors.surface, colors.surfaceAlt]}
                        style={styles.pinCardGradient}
                    >
                        <View style={styles.errorContainer}>
                            <View style={styles.errorIconContainer}>
                                <LinearGradient
                                    colors={[colors.error, colors.warning]}
                                    style={styles.errorIconGradient}
                                >
                                    <Ionicons name="alert-circle" size={48} color={colors.surface} />
                                </LinearGradient>
                            </View>
                            <Text style={styles.errorTitle}>PIN 코드 생성 실패</Text>
                            <Text style={styles.errorSubtitle}>네트워크 연결을 확인해주세요</Text>

                            <TouchableOpacity
                                style={styles.retryButton}
                                onPress={handleRefreshPin}
                            >
                                <LinearGradient
                                    colors={[colors.primary, colors.accent]}
                                    style={styles.retryButtonGradient}
                                >
                                    <Ionicons name="refresh" size={20} color={colors.surface} />
                                    <Text style={styles.retryButtonText}>다시 시도</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </Animated.View>
            );
        }

        return (
            <Animated.View
                style={[
                    styles.pinCard,
                    {
                        opacity: fadeAnim,
                        transform: [
                            { translateY: slideAnim },
                            { scale: pulseAnim }
                        ]
                    }
                ]}
            >
                <LinearGradient
                    colors={[colors.surface, colors.surfaceAlt]}
                    style={styles.pinCardGradient}
                >
                    <View style={styles.pinHeader}>
                        <View style={styles.pinIconContainer}>
                            <LinearGradient
                                colors={[colors.primary, colors.accent]}
                                style={styles.pinIconGradient}
                            >
                                <Ionicons name="key" size={32} color={colors.surface} />
                            </LinearGradient>
                        </View>
                        <View style={styles.pinTitleContainer}>
                            <Text style={styles.pinTitle}>🔑 연결 PIN 코드</Text>
                            <Text style={styles.pinSubtitle}>뷰어 앱에서 입력하세요</Text>
                        </View>
                    </View>

                    <Animated.View
                        style={[
                            styles.pinDisplayContainer,
                            { transform: [{ scale: pinScaleAnim }] }
                        ]}
                    >
                        <LinearGradient
                            colors={[colors.primary + '15', colors.accent + '15']}
                            style={styles.pinDisplayGradient}
                        >
                            <Text style={styles.pinCodeText}>{displayPinCode}</Text>
                        </LinearGradient>
                    </Animated.View>

                    <View style={styles.pinInfoGrid}>
                        <View style={styles.pinInfoItem}>
                            <Ionicons name="time" size={20} color={colors.warning} />
                            <Text style={styles.pinInfoText}>10분간 유효</Text>
                        </View>
                        <View style={styles.pinInfoItem}>
                            <Ionicons name="wifi" size={20} color={colors.primary} />
                            <Text style={styles.pinInfoText}>같은 Wi-Fi 필요</Text>
                        </View>
                        <View style={styles.pinInfoItem}>
                            <Ionicons name="eye" size={20} color={colors.success} />
                            <Text style={styles.pinInfoText}>일회용 코드</Text>
                        </View>
                        <View style={styles.pinInfoItem}>
                            <Ionicons name="shield-checkmark" size={20} color={colors.accent} />
                            <Text style={styles.pinInfoText}>안전한 연결</Text>
                        </View>
                    </View>
                </LinearGradient>
            </Animated.View>
        );
    };

    const renderConnectionStatus = () => (
        <Animated.View
            style={[
                styles.statusCard,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
        >
            <LinearGradient
                colors={[colors.surface, colors.surfaceAlt]}
                style={styles.statusCardGradient}
            >
                <View style={styles.statusHeader}>
                    <View style={styles.statusIconContainer}>
                        <LinearGradient
                            colors={isConnected ? [colors.success, colors.primary] : [colors.warning, colors.error]}
                            style={styles.statusIconGradient}
                        >
                            <Ionicons
                                name={isConnected ? "wifi" : "close-circle"}
                                size={24}
                                color={colors.surface}
                            />
                        </LinearGradient>
                    </View>
                    <View style={styles.statusTitleContainer}>
                        <Text style={styles.statusTitle}>연결 상태</Text>
                        <Text style={styles.statusSubtitle}>
                            {isConnected ? '서버 연결됨' : '연결 확인 중...'}
                        </Text>
                    </View>
                    <View style={[
                        styles.statusIndicator,
                        { backgroundColor: isConnected ? colors.success : colors.warning }
                    ]} />
                </View>

                {connectedViewers.length > 0 && (
                    <View style={styles.viewersContainer}>
                        <View style={styles.viewersHeader}>
                            <Ionicons name="people" size={20} color={colors.primary} />
                            <Text style={styles.viewersTitle}>연결된 뷰어</Text>
                        </View>
                        <Text style={styles.viewersCount}>
                            👥 {connectedViewers.length}명이 시청 중
                        </Text>
                    </View>
                )}

                {error && (
                    <View style={styles.errorInfo}>
                        <Ionicons name="alert-circle" size={16} color={colors.error} />
                        <Text style={styles.errorInfoText}>{error}</Text>
                    </View>
                )}
            </LinearGradient>
        </Animated.View>
    );

    const renderActionButtons = () => (
        <Animated.View
            style={[
                styles.actionsCard,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
        >
            <LinearGradient
                colors={[colors.surface, colors.surfaceAlt]}
                style={styles.actionsCardGradient}
            >
                <Text style={styles.actionsTitle}>🎛️ 제어 패널</Text>

                <View style={styles.actionsGrid}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleCopyPin}
                        disabled={!displayPinCode}
                    >
                        <LinearGradient
                            colors={displayPinCode ? [colors.primary, colors.accent] : [colors.disabledBg, colors.disabledBg]}
                            style={styles.actionButtonGradient}
                        >
                            <Ionicons
                                name="copy"
                                size={24}
                                color={displayPinCode ? colors.surface : colors.disabledText}
                            />
                            <Text style={[
                                styles.actionButtonText,
                                !displayPinCode && styles.actionButtonTextDisabled
                            ]}>
                                복사하기
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleRefreshPin}
                        disabled={isGenerating}
                    >
                        <LinearGradient
                            colors={!isGenerating ? [colors.accent, colors.primary] : [colors.disabledBg, colors.disabledBg]}
                            style={styles.actionButtonGradient}
                        >
                            <Ionicons
                                name="refresh"
                                size={24}
                                color={!isGenerating ? colors.surface : colors.disabledText}
                            />
                            <Text style={[
                                styles.actionButtonText,
                                isGenerating && styles.actionButtonTextDisabled
                            ]}>
                                새 코드
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate('CameraSettings')}
                    >
                        <LinearGradient
                            colors={[colors.surface, colors.surfaceAlt]}
                            style={styles.actionButtonGradient}
                        >
                            <Ionicons name="settings" size={24} color={colors.text} />
                            <Text style={[styles.actionButtonText, { color: colors.text }]}>
                                설정
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleStopSharing}
                    >
                        <LinearGradient
                            colors={[colors.error, colors.warning]}
                            style={styles.actionButtonGradient}
                        >
                            <Ionicons name="stop" size={24} color={colors.surface} />
                            <Text style={styles.actionButtonText}>
                                중지
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </Animated.View>
    );

    return (
        <>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.background, colors.surfaceAlt]}
                    style={styles.backgroundGradient}
                />

                <SafeAreaView style={styles.safeArea}>
                    {/* Header */}
                    <Animated.View
                        style={[
                            styles.header,
                            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                        ]}
                    >
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <LinearGradient
                                colors={[colors.surface, colors.surfaceAlt]}
                                style={styles.backButtonGradient}
                            >
                                <Ionicons name="arrow-back" size={24} color={colors.text} />
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.headerCenter}>
                            <Text style={styles.headerTitle}>🎥 뷰어 연결</Text>
                            <Text style={styles.headerSubtitle}>PIN 코드로 안전하게 연결</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.stopButton}
                            onPress={handleStopSharing}
                        >
                            <LinearGradient
                                colors={[colors.error + '20', colors.warning + '20']}
                                style={styles.stopButtonGradient}
                            >
                                <Ionicons name="close" size={24} color={colors.error} />
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {renderPinCodeCard()}
                        {renderConnectionStatus()}
                        {renderActionButtons()}
                    </ScrollView>
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    backButton: {
        padding: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        ...elevation['1'],
    },
    backButtonGradient: {
        padding: spacing.sm,
        borderRadius: radius.md,
        ...elevation['1'],
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        ...typography.h2,
        color: colors.text,
    },
    headerSubtitle: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    stopButton: {
        padding: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        ...elevation['1'],
    },
    stopButtonGradient: {
        padding: spacing.sm,
        borderRadius: radius.md,
        ...elevation['1'],
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        gap: spacing.lg,
    },
    pinCard: {
        borderRadius: radius.lg,
        overflow: 'hidden',
        ...elevation['2'],
    },
    pinCardGradient: {
        padding: spacing.lg,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
    },
    loadingIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        ...elevation['2'],
    },
    loadingIconGradient: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingTitle: {
        ...typography.h3,
        color: colors.text,
        fontWeight: 'bold',
        marginBottom: spacing.xs,
    },
    loadingSubtitle: {
        ...typography.body,
        color: colors.textSecondary,
    },
    errorContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
    },
    errorIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        ...elevation['2'],
    },
    errorIconGradient: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorTitle: {
        ...typography.h3,
        color: colors.error,
        fontWeight: 'bold',
        marginBottom: spacing.xs,
    },
    errorSubtitle: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    retryButton: {
        borderRadius: radius.lg,
        overflow: 'hidden',
        marginTop: spacing.md,
        ...elevation['2'],
    },
    retryButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        gap: spacing.sm,
    },
    retryButtonText: {
        ...typography.bodyLg,
        fontWeight: '600',
        color: colors.surface,
    },
    pinHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    pinIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
        ...elevation['1'],
    },
    pinIconGradient: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pinTitleContainer: {
        flex: 1,
    },
    pinTitle: {
        ...typography.h3,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    pinSubtitle: {
        ...typography.body,
        color: colors.textSecondary,
    },
    pinDisplayContainer: {
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        alignItems: 'center',
    },
    pinDisplayGradient: {
        width: '100%',
        borderRadius: radius.md,
        padding: spacing.md,
    },
    pinCodeText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: colors.primary,
        textAlign: 'center',
        fontFamily: 'monospace',
    },
    pinInfoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        marginTop: spacing.sm,
    },
    pinInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.xs,
    },
    pinInfoText: {
        ...typography.body,
        color: colors.textSecondary,
        marginLeft: spacing.sm,
    },
    statusCard: {
        borderRadius: radius.lg,
        overflow: 'hidden',
        ...elevation['2'],
    },
    statusCardGradient: {
        padding: spacing.lg,
    },
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    statusIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
        ...elevation['1'],
    },
    statusIconGradient: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusTitleContainer: {
        flex: 1,
    },
    statusTitle: {
        ...typography.h3,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    statusSubtitle: {
        ...typography.body,
        color: colors.textSecondary,
    },
    statusIndicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginLeft: spacing.sm,
    },
    viewersContainer: {
        marginTop: spacing.md,
    },
    viewersHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    viewersTitle: {
        ...typography.bodyLg,
        color: colors.text,
        marginLeft: spacing.sm,
    },
    viewersCount: {
        ...typography.h2,
        color: colors.primary,
        fontWeight: 'bold',
    },
    errorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.md,
    },
    errorInfoText: {
        ...typography.body,
        color: colors.error,
        marginLeft: spacing.sm,
    },
    actionsCard: {
        borderRadius: radius.lg,
        overflow: 'hidden',
        ...elevation['2'],
    },
    actionsCardGradient: {
        padding: spacing.lg,
    },
    actionsTitle: {
        ...typography.h3,
        color: colors.text,
        marginBottom: spacing.md,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        gap: spacing.md,
    },
    actionButton: {
        borderRadius: radius.lg,
        overflow: 'hidden',
        width: '45%', // 2 columns
        ...elevation['2'],
    },
    actionButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        gap: spacing.sm,
    },
    actionButtonText: {
        ...typography.bodyLg,
        fontWeight: '600',
    },
    actionButtonTextDisabled: {
        color: colors.disabledText,
    },
}); 