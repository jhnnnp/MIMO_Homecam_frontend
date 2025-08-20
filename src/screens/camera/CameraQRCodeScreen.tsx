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
import * as Clipboard from 'expo-clipboard';
import { colors, spacing, radius, elevation } from '../../design/tokens';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useCameraConnection } from '../../hooks/useCameraConnection';

const { width: screenWidth } = Dimensions.get('window');
const qrSize = Math.min(screenWidth - spacing.xl * 2, 280);

type CameraQRCodeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CameraQRCode'>;

interface CameraQRCodeScreenProps {
    navigation: CameraQRCodeScreenNavigationProp;
}

export default function CameraQRCodeScreen({ navigation }: CameraQRCodeScreenProps) {
    const cameraId = `MIMO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const cameraName = '홈캠';

    const [connectionState, connectionActions] = useCameraConnection(cameraId, cameraName);
    const { qrCodeData, isConnected, connectedViewers, error } = connectionState;

    const [isGenerating, setIsGenerating] = useState(true);

    useEffect(() => {
        generateQRCode();
    }, []);

    const generateQRCode = async () => {
        setIsGenerating(true);

        try {
            const qrData = await connectionActions.generateQRCode();
            console.log('QR 코드 생성됨:', qrData);
        } catch (error) {
            Alert.alert('오류', 'QR 코드 생성에 실패했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRefreshQR = () => {
        generateQRCode();
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
                        connectionActions.disconnect();
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
        if (error) {
            return (
                <View style={styles.statusContainer}>
                    <View style={styles.statusIndicator}>
                        <View style={[styles.statusDot, styles.errorDot]} />
                        <Text style={styles.statusText}>연결 오류</Text>
                    </View>
                    <Text style={styles.statusDescription}>
                        {error}
                    </Text>
                </View>
            );
        }

        if (!isConnected) {
            return (
                <View style={styles.statusContainer}>
                    <View style={styles.statusIndicator}>
                        <View style={[styles.statusDot, styles.waitingDot]} />
                        <Text style={styles.statusText}>서버 연결 중...</Text>
                    </View>
                    <Text style={styles.statusDescription}>
                        서버에 연결하는 중입니다
                    </Text>
                </View>
            );
        }

        if (connectedViewers.length > 0) {
            return (
                <View style={styles.statusContainer}>
                    <View style={styles.statusIndicator}>
                        <View style={[styles.statusDot, styles.connectedDot]} />
                        <Text style={styles.statusText}>연결됨</Text>
                    </View>
                    <Text style={styles.statusDescription}>
                        {connectedViewers.length}개의 뷰어가 연결되었습니다
                    </Text>
                    {connectedViewers.map((viewerId, index) => (
                        <View key={index} style={styles.connectedDevice}>
                            <Ionicons name="phone-portrait" size={16} color={colors.success} />
                            <Text style={styles.deviceText}>{viewerId}</Text>
                        </View>
                    ))}
                </View>
            );
        }

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

                    {/* Camera ID Section */}
                    <View style={styles.idSection}>
                        <Text style={styles.sectionTitle}>홈캠 고유 ID</Text>
                        <View style={styles.idContainer}>
                            <Text style={styles.cameraId}>{cameraId}</Text>
                            <TouchableOpacity
                                style={styles.copyButton}
                                onPress={async () => {
                                    try {
                                        await Clipboard.setStringAsync(cameraId);
                                        Alert.alert("복사됨", "ID가 클립보드에 복사되었습니다.");
                                    } catch (error) {
                                        Alert.alert("오류", "클립보드 복사에 실패했습니다.");
                                    }
                                }}
                            >
                                <Ionicons name="copy-outline" size={20} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.idDescription}>
                            뷰어에서 이 ID를 입력하여 수동으로 연결할 수 있습니다.
                        </Text>
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
    idSection: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    idContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.sm,
        elevation: elevation.sm,
    },
    cameraId: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        fontFamily: 'monospace',
    },
    copyButton: {
        padding: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: colors.primary + '20',
    },
    idDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
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