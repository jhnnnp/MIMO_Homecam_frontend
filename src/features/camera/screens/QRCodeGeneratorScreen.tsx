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
    Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

// Design System
import { colors, spacing, radius } from '@/design/tokens';

// Navigation Types
import { CameraStackParamList } from '@/app/navigation/AppNavigator';

// Hooks
import { useCameraConnection } from '../../connection/hooks/useCameraConnection';

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
}

const QRCodeGeneratorScreen: React.FC<QRCodeGeneratorScreenProps> = ({ navigation, route }) => {
    const { cameraId, cameraName } = route.params;
    const [connectionState, connectionActions] = useCameraConnection(cameraId, cameraName);

    // State
    const [qrData, setQrData] = useState<QRData | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(EXPIRY_TIME);
    const [isGenerating, setIsGenerating] = useState(false);

    // QR 코드 생성
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
                    expiresAt: now + EXPIRY_TIME
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

    // 초기 QR 코드 생성
    useEffect(() => {
        generateQRCode();
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
                showRetryButton
            />
        );
    }

    return (
        <>
            <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
            <LinearGradient
                colors={['#f8f9fa', '#e9ecef']}
                style={styles.container}
            >
                <SafeAreaView style={styles.safeArea}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="arrow-back" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>QR 코드 연결</Text>
                        <TouchableOpacity
                            style={styles.refreshButton}
                            onPress={generateQRCode}
                            activeOpacity={0.7}
                            disabled={isGenerating}
                        >
                            <Ionicons name="refresh" size={24} color="#007AFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        {qrData && (
                            <>
                                {/* QR Code */}
                                <View style={styles.qrContainer}>
                                    <QRCode
                                        value={JSON.stringify(qrData)}
                                        size={QR_SIZE}
                                        backgroundColor="white"
                                        color="#333"
                                        logoSize={40}
                                        logoMargin={4}
                                        logoBorderRadius={8}
                                    />
                                </View>

                                {/* Camera Info */}
                                <View style={styles.infoContainer}>
                                    <Text style={styles.cameraName}>{cameraName}</Text>
                                    <Text style={styles.pinCode}>{qrData.pinCode}</Text>
                                    <Text style={styles.pinLabel}>6자리 PIN 코드</Text>
                                </View>

                                {/* Timer */}
                                <View style={[
                                    styles.timerContainer,
                                    { backgroundColor: timeLeft < 60000 ? '#ff6b6b' : '#4ecdc4' }
                                ]}>
                                    <Ionicons name="time" size={16} color="white" />
                                    <Text style={styles.timerText}>
                                        {timeLeft > 0 ? `${formatTime(timeLeft)} 남음` : '만료됨'}
                                    </Text>
                                </View>

                                {/* Instructions */}
                                <Text style={styles.instructions}>
                                    📱 뷰어 앱에서 위 QR 코드를 스캔하거나{'\n'}
                                    PIN 코드를 직접 입력하세요
                                </Text>

                                {/* Action Buttons */}
                                <View style={styles.buttonContainer}>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.primaryButton]}
                                        onPress={() => copyToClipboard(qrData.pinCode, 'PIN 코드')}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="copy" size={20} color="white" />
                                        <Text style={styles.buttonText}>PIN 복사</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.secondaryButton]}
                                        onPress={shareQRData}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="share" size={20} color="#007AFF" />
                                        <Text style={[styles.buttonText, { color: '#007AFF' }]}>공유</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Regenerate Button */}
                                {timeLeft < 120000 && ( // 2분 남았을 때 표시
                                    <TouchableOpacity
                                        style={styles.regenerateButton}
                                        onPress={generateQRCode}
                                        activeOpacity={0.8}
                                        disabled={isGenerating}
                                    >
                                        <Ionicons name="refresh-circle" size={20} color="#ff6b6b" />
                                        <Text style={styles.regenerateText}>새 코드 생성</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </View>
                </SafeAreaView>
            </LinearGradient>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    backButton: {
        padding: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: 'rgba(255,255,255,0.8)',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
    },
    refreshButton: {
        padding: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: 'rgba(255,255,255,0.8)',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
    },
    qrContainer: {
        backgroundColor: 'white',
        padding: spacing.lg,
        borderRadius: radius.xl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        marginBottom: spacing.xl,
    },
    infoContainer: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    cameraName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: spacing.sm,
    },
    pinCode: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#007AFF',
        letterSpacing: 4,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        marginBottom: spacing.xs,
    },
    pinLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        marginBottom: spacing.lg,
    },
    timerText: {
        color: 'white',
        fontWeight: '600',
        marginLeft: spacing.xs,
        fontSize: 14,
    },
    instructions: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.md,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: spacing.md,
        width: '100%',
        marginBottom: spacing.lg,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
        borderRadius: radius.lg,
        gap: spacing.sm,
    },
    primaryButton: {
        backgroundColor: '#007AFF',
    },
    secondaryButton: {
        backgroundColor: 'white',
        borderWidth: 2,
        borderColor: '#007AFF',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    regenerateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.lg,
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        gap: spacing.sm,
    },
    regenerateText: {
        color: '#ff6b6b',
        fontWeight: '600',
        fontSize: 16,
    },
});

export default QRCodeGeneratorScreen;
