import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, elevation } from '../../design/tokens';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

const { width: screenWidth } = Dimensions.get('window');
const qrSize = Math.min(screenWidth - spacing.xl * 2, 280);

type CameraQRCodeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CameraQRCode'>;

interface CameraQRCodeScreenProps {
    navigation: CameraQRCodeScreenNavigationProp;
}

export default function CameraQRCodeScreen({ navigation }: CameraQRCodeScreenProps) {
    const [qrCodeData, setQrCodeData] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(true);
    const [connectionStatus, setConnectionStatus] = useState<'waiting' | 'connected' | 'error'>('waiting');
    const [connectedDevices, setConnectedDevices] = useState<string[]>([]);

    useEffect(() => {
        generateQRCode();
    }, []);

    const generateQRCode = async () => {
        setIsGenerating(true);

        try {
            // 실제로는 서버에서 고유한 연결 코드를 생성
            const deviceId = `MIMO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const qrData = JSON.stringify({
                type: 'mimo_camera_connect',
                deviceId: deviceId,
                timestamp: Date.now(),
                version: '1.0.0'
            });

            setQrCodeData(qrData);

            // 연결 대기 시작
            startConnectionListener(deviceId);
        } catch (error) {
            Alert.alert('오류', 'QR 코드 생성에 실패했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    const startConnectionListener = (deviceId: string) => {
        // 실제로는 WebSocket이나 서버 폴링으로 연결 상태 확인
        console.log('연결 대기 중...', deviceId);

        // 시뮬레이션: 5초 후 연결됨
        setTimeout(() => {
            setConnectionStatus('connected');
            setConnectedDevices(['iPhone 14 Pro (김철수)']);
        }, 5000);
    };

    const handleRefreshQR = () => {
        generateQRCode();
        setConnectionStatus('waiting');
        setConnectedDevices([]);
    };

    const handleStopSharing = () => {
        Alert.alert(
            '공유 중지',
            'QR 코드 공유를 중지하시겠어요?',
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '중지',
                    style: 'destructive',
                    onPress: () => {
                        setConnectionStatus('waiting');
                        setConnectedDevices([]);
                        navigation.goBack();
                    },
                },
            ]
        );
    };

    const renderQRCode = () => {
        if (isGenerating) {
            return (
                <View style={styles.qrLoadingContainer}>
                    <Ionicons name="qr-code" size={80} color={colors.primary} />
                    <Text style={styles.qrLoadingText}>QR 코드 생성 중...</Text>
                </View>
            );
        }

        return (
            <View style={styles.qrCodeContainer}>
                <View style={styles.qrCodeWrapper}>
                    <LinearGradient
                        colors={[colors.surface, colors.surfaceAlt]}
                        style={styles.qrCodeBackground}
                    >
                        <View style={styles.qrCodePlaceholder}>
                            <Ionicons name="qr-code" size={120} color={colors.primary} />
                        </View>
                        <View style={styles.qrCodeOverlay}>
                            <Ionicons name="camera" size={40} color={colors.primary} />
                        </View>
                    </LinearGradient>
                </View>
                <Text style={styles.qrCodeText}>뷰어 앱에서 이 QR 코드를 스캔하세요</Text>
            </View>
        );
    };

    const renderConnectionStatus = () => {
        switch (connectionStatus) {
            case 'waiting':
                return (
                    <View style={styles.statusContainer}>
                        <View style={styles.statusIndicator}>
                            <View style={[styles.statusDot, styles.waitingDot]} />
                            <Text style={styles.statusText}>연결 대기 중...</Text>
                        </View>
                        <Text style={styles.statusDescription}>
                            뷰어 기기에서 QR 코드를 스캔하면 자동으로 연결됩니다
                        </Text>
                    </View>
                );
            case 'connected':
                return (
                    <View style={styles.statusContainer}>
                        <View style={styles.statusIndicator}>
                            <View style={[styles.statusDot, styles.connectedDot]} />
                            <Text style={styles.statusText}>연결됨</Text>
                        </View>
                        <Text style={styles.statusDescription}>
                            {connectedDevices.length}개의 기기가 연결되었습니다
                        </Text>
                        {connectedDevices.map((device, index) => (
                            <View key={index} style={styles.connectedDevice}>
                                <Ionicons name="phone-portrait" size={16} color={colors.success} />
                                <Text style={styles.deviceText}>{device}</Text>
                            </View>
                        ))}
                    </View>
                );
            case 'error':
                return (
                    <View style={styles.statusContainer}>
                        <View style={styles.statusIndicator}>
                            <View style={[styles.statusDot, styles.errorDot]} />
                            <Text style={styles.statusText}>연결 오류</Text>
                        </View>
                        <Text style={styles.statusDescription}>
                            연결에 실패했습니다. 다시 시도해주세요
                        </Text>
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor={colors.background} />
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.background, colors.surfaceAlt]}
                    style={styles.backgroundGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />

                <SafeAreaView style={styles.safeArea}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={24} color={colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>QR 코드 공유</Text>
                        <TouchableOpacity onPress={handleStopSharing}>
                            <Ionicons name="close" size={24} color={colors.error} />
                        </TouchableOpacity>
                    </View>

                    {/* QR Code Section */}
                    <View style={styles.qrSection}>
                        <Text style={styles.sectionTitle}>연결 QR 코드</Text>
                        {renderQRCode()}
                    </View>

                    {/* Connection Status */}
                    <View style={styles.statusSection}>
                        {renderConnectionStatus()}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionSection}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={handleRefreshQR}
                        >
                            <LinearGradient
                                colors={[colors.primary, colors.accent]}
                                style={styles.actionButtonGradient}
                            >
                                <Ionicons name="refresh" size={20} color={colors.surface} />
                                <Text style={styles.actionButtonText}>QR 코드 새로고침</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => Alert.alert('도움말', '뷰어 앱을 열고 QR 코드 스캔 기능을 사용하세요.')}
                        >
                            <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
                            <Text style={styles.secondaryButtonText}>연결 방법 보기</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Info Card */}
                    <View style={styles.infoSection}>
                        <View style={styles.infoCard}>
                            <Ionicons name="information-circle" size={18} color={colors.primary} />
                            <Text style={styles.infoText}>
                                이 QR 코드는 5분간 유효합니다. 연결이 완료되면 자동으로 홈캠 모드로 전환됩니다.
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    qrSection: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.lg,
        textAlign: 'center',
    },
    qrLoadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
    },
    qrLoadingText: {
        fontSize: 16,
        color: colors.textSecondary,
        marginTop: spacing.lg,
        fontWeight: '500',
    },
    qrCodeContainer: {
        alignItems: 'center',
    },
    qrCodeWrapper: {
        borderRadius: radius.xl,
        overflow: 'hidden',
        ...elevation['3'],
    },
    qrCodeBackground: {
        width: qrSize,
        height: qrSize,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    qrCodePlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    qrCodeOverlay: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -20 }, { translateY: -20 }],
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        ...elevation['2'],
    },
    qrCodeText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: spacing.lg,
        textAlign: 'center',
        fontWeight: '500',
    },
    statusSection: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    statusContainer: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        ...elevation['1'],
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: spacing.sm,
    },
    waitingDot: {
        backgroundColor: colors.warning,
    },
    connectedDot: {
        backgroundColor: colors.success,
    },
    errorDot: {
        backgroundColor: colors.error,
    },
    statusText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    statusDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    connectedDevice: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.success + '10',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.md,
        marginTop: spacing.xs,
    },
    deviceText: {
        fontSize: 14,
        color: colors.text,
        marginLeft: spacing.sm,
        fontWeight: '500',
    },
    actionSection: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    actionButton: {
        borderRadius: radius.lg,
        overflow: 'hidden',
        marginBottom: spacing.md,
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
        fontSize: 16,
        fontWeight: '600',
        color: colors.surface,
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        gap: spacing.sm,
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.primary,
    },
    infoSection: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.lg,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.primary + '20',
        ...elevation['1'],
    },
    infoText: {
        fontSize: 13,
        color: colors.text,
        flex: 1,
        lineHeight: 18,
        fontWeight: '500',
    },
}); 