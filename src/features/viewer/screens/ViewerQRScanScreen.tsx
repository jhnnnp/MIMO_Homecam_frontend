/**
 * ViewerQRScanScreen - QR 코드 스캔 화면
 * 
 * Features:
 * - expo-camera를 사용한 QR 코드 스캔
 * - 실시간 스캔 결과 처리
 * - 커스텀 스캔 UI/UX
 * - 에러 핸들링 및 권한 관리
 * - 접근성 지원
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
    Animated,
    Dimensions,
    Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

// Design System
import { colors, spacing, radius } from '@/design/tokens';

// Navigation Types
import { RootStackParamList } from '@/app/navigation/AppNavigator';

// Components
import GradientBackground from '@/shared/components/layout/GradientBackground';
import GlassCard from '@/shared/components/ui/GlassCard';

// Constants
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCAN_AREA_SIZE = SCREEN_WIDTH * 0.7;

// Types
type ViewerQRScanScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ViewerQRScan'>;
type ViewerQRScanScreenRouteProp = RouteProp<RootStackParamList, 'ViewerQRScan'>;

interface QRScanResult {
    type: string;
    data: string;
}

const ViewerQRScanScreen: React.FC = () => {
    const navigation = useNavigation<ViewerQRScanScreenNavigationProp>();
    const route = useRoute<ViewerQRScanScreenRouteProp>();

    // Camera permissions
    const [permission, requestPermission] = useCameraPermissions();

    // State
    const [isScanning, setIsScanning] = useState(true);
    const [scannedData, setScannedData] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    // Animation
    const scanLineAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Effects
    useEffect(() => {
        startScanAnimation();
        return () => {
            scanLineAnim.removeAllListeners();
            pulseAnim.removeAllListeners();
        };
    }, []);

    // Animation functions
    const startScanAnimation = useCallback(() => {
        const scanAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(scanLineAnim, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(scanLineAnim, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        );

        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );

        scanAnimation.start();
        pulseAnimation.start();
    }, [scanLineAnim, pulseAnim]);

    // Handlers
    const handleBarCodeScanned = useCallback(({ type, data }: QRScanResult) => {
        if (!isScanning) return;

        setIsScanning(false);
        setScannedData(data);

        // Haptic feedback
        if (Platform.OS === 'ios') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        // Process QR code data
        processQRCode(data);
    }, [isScanning]);

    const processQRCode = useCallback(async (qrData: string) => {
        try {
            // QR 코드 데이터 검증
            console.log('QR Code scanned:', qrData);

            // QR 코드에서 연결 정보 추출
            let connectionInfo;
            try {
                // QR 코드 데이터를 JSON으로 파싱
                connectionInfo = JSON.parse(qrData);

                // MIMO QR 코드 형식 검증
                if (connectionInfo.type !== 'MIMO_CAMERA') {
                    throw new Error('MIMO 카메라 QR 코드가 아닙니다.');
                }

                // 만료 시간 검증
                if (connectionInfo.expiresAt && Date.now() > connectionInfo.expiresAt) {
                    throw new Error('만료된 QR 코드입니다. 새로운 코드를 생성해주세요.');
                }

            } catch (parseError) {
                // JSON이 아닌 경우 단순 PIN으로 처리
                if (qrData.length === 6 && /^\d{6}$/.test(qrData)) {
                    connectionInfo = {
                        pinCode: qrData,
                        type: 'pin',
                        cameraName: qrData === '991011' ? '관리자 모드' : '홈캠'
                    };
                } else {
                    throw new Error('올바른 QR 코드 형식이 아닙니다.');
                }
            }

            // 연결 정보 검증
            if (!connectionInfo.pinCode || connectionInfo.pinCode.length !== 6) {
                throw new Error('유효하지 않은 PIN 코드입니다.');
            }

            // 연결 시작
            setIsScanning(false);


            // TODO: 실제 홈캠 등록 로직 구현
            // const result = await api.post('/cameras/register-with-code', { code: qrData, type: 'qr' });

            // Mock 홈캠 등록 - 임시로 2초 후 성공
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 임시 등록 성공 처리
            const mockResult = {
                camera: {
                    id: Date.now(),
                    name: connectionInfo.cameraName || `홈캠 ${connectionInfo.pinCode}`,
                    device_id: connectionInfo.cameraId,
                    location: '홈',
                    status: 'online'
                },
                success: true
            };

            if (mockResult.success) {
                // Success feedback
                if (Platform.OS === 'ios') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }

                // 성공 상태 표시
                setIsSuccess(true);

                // 1.5초 후 성공 메시지와 함께 대시보드로 이동
                setTimeout(() => {
                    Alert.alert(
                        '등록 성공!',
                        `홈캠 "${mockResult.camera.name}"이 성공적으로 등록되었습니다.\n\n지금 바로 라이브 스트리밍을 시청하시겠습니까?`,
                        [
                            {
                                text: '나중에',
                                style: 'cancel',
                                onPress: () => {
                                    navigation.replace('ViewerDashboard');
                                }
                            },
                            {
                                text: '지금 시청하기',
                                onPress: () => {
                                    navigation.replace('ViewerDashboard');
                                    // 잠시 후 라이브 스트림으로 이동
                                    setTimeout(() => {
                                        navigation.navigate('LiveStream', {
                                            cameraId: mockResult.camera.device_id,
                                            cameraName: mockResult.camera.name,
                                            ipAddress: '192.168.1.100',
                                            quality: '1080p'
                                        });
                                    }, 500);
                                }
                            }
                        ]
                    );
                }, 1500);
            }
        } catch (error) {
            console.error('QR Code processing error:', error);
            Alert.alert(
                '연결 실패',
                error.message || 'QR 코드를 처리할 수 없습니다.\n올바른 QR 코드인지 확인해주세요.',
                [
                    {
                        text: '다시 스캔',
                        onPress: () => {
                            setIsScanning(true);
                            setScannedData(null);
                        }
                    }
                ]
            );
        }
    }, [navigation]);

    const handleClose = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const handleRequestPermission = useCallback(async () => {
        const { granted } = await requestPermission();
        if (!granted) {
            Alert.alert(
                '권한 필요',
                '카메라 권한이 필요합니다. 설정에서 권한을 허용해주세요.',
                [
                    { text: '취소', onPress: handleClose },
                    {
                        text: '설정으로 이동', onPress: () => {
                            // 설정 앱으로 이동 로직
                            handleClose();
                        }
                    }
                ]
            );
        }
    }, [requestPermission, handleClose]);

    // Render functions
    const renderPermissionView = () => (
        <GradientBackground style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>QR 코드 스캔</Text>
                    <View style={styles.placeholder} />
                </View>

                <View style={styles.permissionContainer}>
                    <GlassCard style={styles.permissionCard}>
                        <Ionicons name="camera-outline" size={64} color={colors.primary} />
                        <Text style={styles.permissionTitle}>카메라 권한 필요</Text>
                        <Text style={styles.permissionText}>
                            QR 코드를 스캔하려면 카메라 권한이 필요합니다.
                        </Text>
                        <TouchableOpacity
                            style={styles.permissionButton}
                            onPress={handleRequestPermission}
                        >
                            <Text style={styles.permissionButtonText}>권한 허용</Text>
                        </TouchableOpacity>
                    </GlassCard>
                </View>
            </SafeAreaView>
        </GradientBackground>
    );

    const renderScanOverlay = () => (
        <View style={styles.overlay}>
            {/* Top overlay */}
            <View style={styles.overlayTop} />

            {/* Middle row with scan area */}
            <View style={styles.overlayMiddle}>
                <View style={styles.overlaySide} />

                {/* Scan area */}
                <Animated.View
                    style={[
                        styles.scanArea,
                        { transform: [{ scale: pulseAnim }] }
                    ]}
                >
                    {/* Corner indicators */}
                    <View style={[styles.corner, styles.cornerTopLeft]} />
                    <View style={[styles.corner, styles.cornerTopRight]} />
                    <View style={[styles.corner, styles.cornerBottomLeft]} />
                    <View style={[styles.corner, styles.cornerBottomRight]} />

                    {/* Scanning line */}
                    <Animated.View
                        style={[
                            styles.scanLine,
                            {
                                transform: [{
                                    translateY: scanLineAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, SCAN_AREA_SIZE - 4],
                                    })
                                }]
                            }
                        ]}
                    />
                </Animated.View>

                <View style={styles.overlaySide} />
            </View>

            {/* Bottom overlay */}
            <View style={styles.overlayBottom}>
                <Text style={styles.instructionText}>
                    QR 코드를 프레임 안에 맞춰주세요
                </Text>
            </View>
        </View>
    );

    const renderSuccessView = () => (
        <GradientBackground style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>등록 성공</Text>
                    <View style={styles.placeholder} />
                </View>

                <View style={styles.successContainer}>
                    <GlassCard style={styles.successCard}>
                        <Animated.View style={styles.successIcon}>
                            <Ionicons
                                name="checkmark-circle"
                                size={80}
                                color={colors.success}
                            />
                        </Animated.View>
                        <Text style={styles.successTitle}>등록 성공!</Text>
                        <Text style={styles.successSubtitle}>
                            홈캠이 성공적으로 등록되었습니다{'\n'}잠시 후 홈캠 목록으로 이동합니다
                        </Text>

                        {/* QR 데이터 표시 */}
                        <View style={styles.successQRDisplay}>
                            <Text style={styles.successQRLabel}>스캔한 QR 코드</Text>
                            <Text style={styles.successQRData} numberOfLines={1}>
                                {scannedData || 'QR 데이터'}
                            </Text>
                        </View>
                    </GlassCard>
                </View>
            </SafeAreaView>
        </GradientBackground>
    );

    const renderCameraView = () => (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <CameraView
                style={styles.camera}
                barCodeScannerSettings={{
                    barCodeTypes: ['qr'],
                }}
                onBarcodeScanned={isScanning ? handleBarCodeScanned : undefined}
            >
                {/* Header */}
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="white" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>QR 코드 스캔</Text>
                        <View style={styles.placeholder} />
                    </View>
                </SafeAreaView>

                {/* Scan overlay */}
                {renderScanOverlay()}

                {/* Bottom controls */}
                <SafeAreaView style={styles.bottomSafeArea}>
                    <View style={styles.bottomControls}>
                        <TouchableOpacity
                            style={styles.controlButton}
                            onPress={() => {
                                setIsScanning(!isScanning);
                                if (Platform.OS === 'ios') {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                }
                            }}
                        >
                            <Ionicons
                                name={isScanning ? "pause" : "play"}
                                size={24}
                                color="white"
                            />
                            <Text style={styles.controlButtonText}>
                                {isScanning ? '일시정지' : '스캔 시작'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </CameraView>
        </View>
    );

    // Main render
    if (!permission) {
        // 권한 상태를 확인 중
        return (
            <GradientBackground style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>카메라 권한 확인 중...</Text>
                </View>
            </GradientBackground>
        );
    }

    if (!permission.granted) {
        return renderPermissionView();
    }

    if (isSuccess) {
        return renderSuccessView();
    }

    return renderCameraView();
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    safeArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    bottomSafeArea: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: colors.text,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: 'white',
    },
    placeholder: {
        width: 40,
    },

    // Camera
    camera: {
        flex: 1,
    },

    // Permission view
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
    },
    permissionCard: {
        padding: spacing.xl,
        alignItems: 'center',
        maxWidth: 300,
    },
    permissionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.text,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    permissionText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
        lineHeight: 20,
    },
    permissionButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
    },
    permissionButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },

    // Scan overlay
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 5,
    },
    overlayTop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    overlayMiddle: {
        flexDirection: 'row',
        height: SCAN_AREA_SIZE,
    },
    overlaySide: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    overlayBottom: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: spacing.lg,
    },
    instructionText: {
        fontSize: 16,
        color: 'white',
        textAlign: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
    },

    // Scan area
    scanArea: {
        width: SCAN_AREA_SIZE,
        height: SCAN_AREA_SIZE,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 24,
        height: 24,
        borderColor: colors.primary,
        borderWidth: 3,
    },
    cornerTopLeft: {
        top: 0,
        left: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    cornerTopRight: {
        top: 0,
        right: 0,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
    },
    cornerBottomLeft: {
        bottom: 0,
        left: 0,
        borderRightWidth: 0,
        borderTopWidth: 0,
    },
    cornerBottomRight: {
        bottom: 0,
        right: 0,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    scanLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },

    // Bottom controls
    bottomControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
    },
    controlButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
    },
    controlButtonText: {
        marginLeft: spacing.sm,
        fontSize: 16,
        color: 'white',
        fontWeight: '500',
    },

    // Success state
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    successCard: {
        alignItems: 'center',
        padding: spacing.xl,
        width: '100%',
        maxWidth: 320,
    },
    successIcon: {
        marginBottom: spacing.xl,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.success,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    successSubtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        marginBottom: spacing.xl,
        textAlign: 'center',
        lineHeight: 22,
    },
    successQRDisplay: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xl,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.success,
        alignItems: 'center',
        width: '100%',
    },
    successQRLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
        fontWeight: '500',
    },
    successQRData: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.success,
        textAlign: 'center',
    },
});

export default ViewerQRScanScreen;
