/**
 * QRCodeGeneratorScreen - QR 코드 생성 및 표시 화면
 * 
 * Features:
 * - QR 코드 생성 및 실시간 표시
 * - PIN 코드 대체 옵션
 * - 만료 시간 카운트다운
 * - 복사 및 공유 기능
 * - 자동 갱신 기능
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Dimensions,
    StatusBar,
    Share,
    Platform,
    Pressable,
    ScrollView,
    RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

// Design Tokens
import { colors, spacing, radius, elevation, typography } from '@/design/tokens';

// Navigation Types
import { CameraStackParamList } from '@/app/navigation/AppNavigator';

// Hooks
import { useCameraConnection } from '../../connection/hooks/useCameraConnection';
import { getApiBaseUrl, getWsBaseUrl } from '@/app/config';

// Components
import LoadingState from '@/shared/components/feedback/LoadingState';
import ErrorState from '@/shared/components/feedback/ErrorState';

// Constants
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const QR_SIZE = Math.min(SCREEN_WIDTH * 0.7, 280);
const EXPIRY_TIME = 10 * 60 * 1000; // 10분

// Types
interface QRCodeGeneratorScreenProps {
    navigation: NativeStackNavigationProp<CameraStackParamList, 'QRCodeGenerator'>;
    route: {
        params: {
            cameraId: string;
            cameraName: string;
        };
    };
}

interface QRData {
    type: 'MIMO_CAMERA';
    cameraId: string;
    cameraName: string;
    pinCode: string;
    connectionId: string;
    timestamp: number;
    version: string;
    expiresAt: number;
    apiUrl?: string;
    wsUrl?: string;
}

const QRCodeGeneratorScreen: React.FC<QRCodeGeneratorScreenProps> = ({ navigation, route }) => {
    const { cameraId, cameraName } = route.params;
    const [connectionState, connectionActions] = useCameraConnection(cameraId, cameraName);

    // State
    const [qrData, setQrData] = useState<QRData | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(EXPIRY_TIME);
    const [isGenerating, setIsGenerating] = useState(false);

    // QR 코드 생성 (원래 로직 유지)
    const generateQRCode = useCallback(async () => {
        setIsGenerating(true);
        try {
            const pin = await connectionActions.generatePinCode();
            if (pin) {
                const now = Date.now();
                const newQrData: QRData = {
                    type: 'MIMO_CAMERA',
                    cameraId,
                    cameraName,
                    pinCode: pin,
                    connectionId: pin,
                    timestamp: now,
                    version: '1.0',
                    expiresAt: now + EXPIRY_TIME,
                    apiUrl: getApiBaseUrl(),
                    wsUrl: `${getWsBaseUrl()}/ws`
                };

                setQrData(newQrData);
                setTimeLeft(EXPIRY_TIME);
            }
        } catch (error) {
            Alert.alert('오류', 'QR 코드를 생성할 수 없습니다.');
        } finally {
            setIsGenerating(false);
        }
    }, [connectionActions, cameraId, cameraName]);

    // 시간 카운트다운
    useEffect(() => {
        if (!qrData) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const remaining = qrData.expiresAt - now;

            if (remaining <= 0) {
                setTimeLeft(0);
                clearInterval(interval);
            } else {
                setTimeLeft(remaining);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [qrData]);

    // 초기 QR 코드 생성 (마운트 보장 + 재시도)
    useEffect(() => {
        let cancelled = false;

        const init = async () => {
            try {
                // 약간의 지연 후 생성 (네비게이션 전환/토큰 준비 시간 확보)
                await new Promise(r => setTimeout(r, 50));
                if (!cancelled) {
                    await generateQRCode();
                }
                // PIN 미생성 시 1회 자동 재시도
                if (!cancelled && !qrData) {
                    await new Promise(r => setTimeout(r, 300));
                    if (!cancelled) {
                        await generateQRCode();
                    }
                }
            } catch { }
        };

        init();
        return () => { cancelled = true; };
    }, []);

    // 시간 포맷팅
    const formatTime = (milliseconds: number): string => {
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // 복사 기능
    const copyToClipboard = useCallback(async (text: string, type: string) => {
        try {
            await Clipboard.setStringAsync(text);
            Alert.alert('복사 완료', `${type}이(가) 클립보드에 복사되었습니다.`);
            if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
        } catch (error) {
            Alert.alert('오류', '복사에 실패했습니다.');
        }
    }, []);

    // 공유 기능
    const shareQRData = useCallback(async () => {
        if (!qrData) return;

        try {
            await Share.share({
                message: `MIMO 홈캠 연결\n\n카메라: ${cameraName}\nPIN 코드: ${qrData.pinCode}\n\n뷰어 앱에서 이 PIN 코드를 입력하거나 QR 코드를 스캔하세요.`,
                title: 'MIMO 홈캠 연결 정보'
            });
        } catch (error) {
            console.error('Share failed:', error);
        }
    }, [qrData, cameraName]);

    // 로딩 상태
    if (isGenerating && !qrData) {
        return <LoadingState message="QR 코드 생성 중..." />;
    }

    // 에러 상태
    if (connectionState.error && !qrData) {
        return (
            <ErrorState
                message={connectionState.error}
                onRetry={generateQRCode}
                buttonText="다시 시도"
            />
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <LinearGradient
                colors={[colors.background, colors.surfaceAlt]}
                style={styles.backgroundGradient}
            />

            <SafeAreaView style={styles.safeArea}>
                {/* Header - 홈캠 목록 스타일 */}
                <View style={styles.header}>
                    <Pressable
                        style={({ pressed }) => [
                            styles.headerButton,
                            pressed && styles.headerButtonPressed,
                        ]}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </Pressable>
                    <Text style={styles.headerTitle}>QR 코드 연결</Text>
                    <Pressable
                        style={({ pressed }) => [
                            styles.headerButton,
                            pressed && styles.headerButtonPressed,
                        ]}
                        onPress={generateQRCode}
                        disabled={isGenerating}
                    >
                        <Ionicons
                            name="refresh"
                            size={20}
                            color={isGenerating ? colors.textSecondary : colors.primary}
                        />
                    </Pressable>
                </View>

                {/* Content */}
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces={true}
                    scrollEventThrottle={16}
                    refreshControl={
                        <RefreshControl
                            refreshing={isGenerating}
                            onRefresh={generateQRCode}
                            tintColor={colors.textSecondary}
                        />
                    }
                >
                    {!qrData ? (
                        <ErrorState
                            message="QR/PIN 정보를 불러오지 못했습니다. 다시 시도해 주세요."
                            onRetry={generateQRCode}
                            buttonText="다시 시도"
                        />
                    ) : (
                        <>
                            {/* Status Card - 홈캠 스타일 */}
                            <View style={styles.statusCard}>
                                <View style={styles.statusHeader}>
                                    <View style={styles.statusInfo}>
                                        <View style={styles.statusIndicator}>
                                            <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                                            <Text style={styles.statusText}>{cameraName}</Text>
                                        </View>
                                        <Text style={styles.statusSubtext}>
                                            {connectionState.viewerCount > 0
                                                ? `${connectionState.viewerCount}명 연결됨`
                                                : '연결 대기 중'}
                                        </Text>
                                    </View>
                                    <View style={styles.connectionStatus}>
                                        <View style={[styles.connectionDot, { backgroundColor: colors.success }]} />
                                        <Text style={styles.connectionText}>온라인</Text>
                                    </View>
                                </View>
                            </View>

                            {/* QR Code Card - 메인 카드 */}
                            <View style={styles.mainCard}>
                                <View style={styles.cardHeader}>
                                    <LinearGradient
                                        colors={[colors.primary + '20', colors.accent + '15']}
                                        style={styles.cardIcon}
                                    >
                                        <Ionicons name="qr-code" size={24} color={colors.primary} />
                                    </LinearGradient>
                                    <View style={styles.cardInfo}>
                                        <Text style={styles.cardTitle}>QR 코드</Text>
                                        <Text style={styles.cardSubtitle}>뷰어 앱에서 스캔하세요</Text>
                                    </View>
                                    <View style={[
                                        styles.timerBadge,
                                        timeLeft <= 0 && styles.timerBadgeExpired,
                                        timeLeft < 120000 && timeLeft > 0 && styles.timerBadgeWarning,
                                    ]}>
                                        <Ionicons name="time" size={12} color="white" />
                                        <Text style={styles.timerText}>
                                            {timeLeft <= 0 ? '만료됨' : formatTime(timeLeft)}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.qrContainer}>
                                    <QRCode
                                        value={JSON.stringify(qrData)}
                                        size={QR_SIZE}
                                        backgroundColor="white"
                                        color={colors.text}
                                        logoSize={30}
                                        logoMargin={4}
                                        logoBorderRadius={6}
                                    />
                                </View>
                            </View>

                            {/* PIN Code Card */}
                            <View style={styles.pinCard}>
                                <View style={styles.cardHeader}>
                                    <LinearGradient
                                        colors={[colors.accent + '20', colors.primary + '15']}
                                        style={styles.cardIcon}
                                    >
                                        <Ionicons name="keypad" size={24} color={colors.accent} />
                                    </LinearGradient>
                                    <View style={styles.cardInfo}>
                                        <Text style={styles.cardTitle}>PIN 코드</Text>
                                        <Text style={styles.cardSubtitle}>6자리 숫자를 입력하세요</Text>
                                    </View>
                                </View>

                                <View style={styles.pinDisplay}>
                                    <Text style={styles.pinCode}>{qrData.pinCode}</Text>
                                </View>
                            </View>

                            {/* Action Cards - 홈캠 스타일 */}
                            <View style={styles.actionsContainer}>
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.actionCard,
                                        styles.primaryAction,
                                        pressed && styles.actionCardPressed,
                                    ]}
                                    onPress={() => copyToClipboard(qrData.pinCode, 'PIN 코드')}
                                >
                                    <LinearGradient
                                        colors={[colors.primary, '#5AC8FA']}
                                        style={styles.actionGradient}
                                    >
                                        <View style={styles.actionIcon}>
                                            <Ionicons name="copy" size={20} color="white" />
                                        </View>
                                        <View style={styles.actionInfo}>
                                            <Text style={styles.actionTitle}>PIN 복사</Text>
                                            <Text style={styles.actionSubtitle}>클립보드에 복사하기</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
                                    </LinearGradient>
                                </Pressable>

                                <Pressable
                                    style={({ pressed }) => [
                                        styles.actionCard,
                                        styles.secondaryAction,
                                        pressed && styles.actionCardPressed,
                                    ]}
                                    onPress={shareQRData}
                                >
                                    <View style={styles.actionContent}>
                                        <LinearGradient
                                            colors={[colors.accent + '20', colors.accent + '10']}
                                            style={styles.actionIconSecondary}
                                        >
                                            <Ionicons name="share" size={20} color={colors.accent} />
                                        </LinearGradient>
                                        <View style={styles.actionInfo}>
                                            <Text style={styles.actionTitleSecondary}>연결 정보 공유</Text>
                                            <Text style={styles.actionSubtitleSecondary}>다른 앱으로 공유하기</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                    </View>
                                </Pressable>
                            </View>

                            {/* Help Section */}
                            {timeLeft < 120000 && (
                                <View style={styles.helpSection}>
                                    <Text style={styles.helpTitle}>빠른 액세스</Text>
                                    <View style={styles.helpCard}>
                                        <Pressable
                                            style={styles.helpItem}
                                            onPress={generateQRCode}
                                            disabled={isGenerating}
                                        >
                                            <LinearGradient
                                                colors={[colors.warning + '20', colors.warning + '10']}
                                                style={styles.helpIcon}
                                            >
                                                <Ionicons name="refresh" size={16} color={colors.warning} />
                                            </LinearGradient>
                                            <Text style={styles.helpText}>
                                                {isGenerating ? '새 코드 생성 중...' : '새 QR/PIN 코드 생성하기'}
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>
                            )}
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

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

    // Header - 홈캠 목록 스타일
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerButton: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: colors.background,
        minWidth: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerButtonPressed: {
        backgroundColor: colors.border,
        transform: [{ scale: 0.95 }],
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },

    // Content
    scroll: {
        flex: 1,
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: spacing.container,
        paddingTop: spacing.xl,
        paddingBottom: spacing['3xl'],
        minHeight: '100%',
    },

    // Status Card - 홈캠 스타일
    statusCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        width: '100%',
    },
    statusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusInfo: {
        flex: 1,
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    statusText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    statusSubtext: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    connectionStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    connectionDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    connectionText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },

    // Main QR Card
    mainCard: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
        width: '100%',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    cardInfo: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    cardSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    qrContainer: {
        backgroundColor: 'white',
        padding: spacing.lg,
        borderRadius: radius.lg,
        alignItems: 'center',
        ...elevation["1"],
    },

    // PIN Code Card
    pinCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        width: '100%',
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.success,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    timerBadgeWarning: {
        backgroundColor: colors.warning,
    },
    timerBadgeExpired: {
        backgroundColor: colors.error,
    },
    timerText: {
        fontSize: 12,
        fontWeight: '600',
        color: 'white',
    },
    pinDisplay: {
        alignItems: 'center',
        backgroundColor: colors.background,
        padding: spacing.xl,
        borderRadius: radius.md,
        marginTop: 12,
    },
    pinCode: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.primary,
        letterSpacing: 8,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },

    // Action Cards - 홈캠 스타일
    actionsContainer: {
        gap: 12,
        marginBottom: 24,
        width: '100%',
    },
    actionCard: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    actionCardPressed: {
        transform: [{ scale: 0.98 }],
    },
    primaryAction: {
        marginBottom: 4,
    },
    secondaryAction: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    actionGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 16,
    },
    actionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 16,
    },
    actionIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionIconSecondary: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionInfo: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: 'white',
        marginBottom: 2,
    },
    actionSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
    },
    actionTitleSecondary: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    actionSubtitleSecondary: {
        fontSize: 14,
        color: colors.textSecondary,
    },

    // Help Section
    helpSection: {
        marginTop: 8,
        width: '100%',
    },
    helpTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    helpCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    helpItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    helpIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    helpText: {
        flex: 1,
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
});

export default QRCodeGeneratorScreen;