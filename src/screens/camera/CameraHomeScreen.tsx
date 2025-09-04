import React, { useState, useEffect } from "react";
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from 'expo-clipboard';
import { CameraView, CameraType, useCameraPermissions, Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import { colors, spacing, radius, elevation, typography } from "../../design/tokens";
import { useCameraConnection } from "../../hooks/useCameraConnection";
import { webrtcService } from '../../services/webrtcService';
import { forceRediscover, testConnection } from '../../config';
import { simpleNetworkDiscovery } from '../../services/simpleNetworkDiscovery';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface CameraHomeScreenProps {
    navigation?: any;
}

export default function CameraHomeScreen({ navigation }: CameraHomeScreenProps) {
    // 카메라 ID 생성
    const cameraId = `MIMO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const cameraName = '홈캠';

    const [connectionState, connectionActions] = useCameraConnection(cameraId, cameraName);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingViewer, setStreamingViewer] = useState<string | null>(null);
    const [pinCode, setPinCode] = useState<string | null>(null);
    const [webRTCStream, setWebRTCStream] = useState<any>(null);
    const [streamingStatus, setStreamingStatus] = useState<'idle' | 'connecting' | 'streaming' | 'error'>('idle');
    const [cameraType, setCameraType] = useState<CameraType>('back');
    const [permission, requestPermission] = useCameraPermissions();
    const [hasAllPermissions, setHasAllPermissions] = useState(false);
    const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);

    // 애니메이션 값들
    const [fadeAnim] = useState(new Animated.Value(0));
    const [slideAnim] = useState(new Animated.Value(50));
    const [scaleAnim] = useState(new Animated.Value(0.95));
    const [pinPulseAnim] = useState(new Animated.Value(1));

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
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // PIN 코드가 생성되면 펄스 애니메이션
    useEffect(() => {
        if (pinCode) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pinPulseAnim, {
                        toValue: 1.05,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pinPulseAnim, {
                        toValue: 1,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, [pinCode]);

    // 권한 요청 함수
    const requestAllPermissions = async () => {
        if (isRequestingPermissions) return;

        setIsRequestingPermissions(true);

        try {
            console.log('🔐 권한 요청 시작...');

            // 카메라 권한
            const cameraPermission = await Camera.requestCameraPermissionsAsync();
            console.log('📷 카메라 권한:', cameraPermission.status);

            // 오디오 권한
            const audioPermission = await Audio.requestPermissionsAsync();
            console.log('🎤 오디오 권한:', audioPermission.status);

            // 미디어 라이브러리 권한
            const mediaPermission = await MediaLibrary.requestPermissionsAsync();
            console.log('💾 미디어 라이브러리 권한:', mediaPermission.status);

            const allGranted =
                cameraPermission.status === "granted" &&
                audioPermission.status === "granted" &&
                mediaPermission.status === "granted";

            if (allGranted) {
                console.log('✅ 모든 권한이 허용되었습니다!');
                setHasAllPermissions(true);

                // 권한 허용 시 부드러운 전환 애니메이션
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 1.1,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                ]).start();

                Alert.alert('성공', '모든 권한이 허용되었습니다!');
            } else {
                console.log('❌ 일부 권한이 거부되었습니다');
                const deniedPermissions = [];
                if (cameraPermission.status !== "granted") deniedPermissions.push("카메라");
                if (audioPermission.status !== "granted") deniedPermissions.push("마이크");
                if (mediaPermission.status !== "granted") deniedPermissions.push("저장소");

                Alert.alert(
                    '권한 필요',
                    `${deniedPermissions.join(", ")} 권한이 필요합니다.\n설정에서 권한을 허용해주세요.`,
                    [
                        {
                            text: '설정으로 이동', onPress: () => {
                                // 설정 앱으로 이동하는 로직 (필요시 구현)
                            }
                        },
                        { text: '취소', style: 'cancel' }
                    ]
                );
            }
        } catch (error) {
            console.error('❌ 권한 요청 중 오류:', error);
            Alert.alert('오류', '권한 요청 중 오류가 발생했습니다.');
        } finally {
            setIsRequestingPermissions(false);
        }
    };

    // 카메라 전환 함수
    const toggleCameraType = () => {
        setCameraType(current => current === 'back' ? 'front' : 'back');
    };

    // 스트리밍 관련 함수들
    const startStreaming = async (viewerId: string) => {
        try {
            console.log(`🎥 스트리밍 시작: ${cameraId} -> ${viewerId}`);

            const webRTCStream = await webrtcService.startStreaming(
                cameraId,
                viewerId
            );

            webRTCStream.onStreamReceived = (remoteStream) => {
                console.log('📺 원격 스트림 수신됨');
            };

            setIsStreaming(true);
            setStreamingViewer(viewerId);

            Alert.alert('성공', '스트리밍이 시작되었습니다!');
        } catch (error) {
            console.error('❌ 스트리밍 시작 실패:', error);
            Alert.alert('오류', '스트리밍을 시작할 수 없습니다.');
        }
    };

    const stopStreaming = async () => {
        try {
            if (streamingViewer && cameraId) {
                await webrtcService.stopStream(streamingViewer);
                setIsStreaming(false);
                setStreamingViewer(null);
                Alert.alert('완료', '스트리밍이 중지되었습니다.');
            }
        } catch (error) {
            console.error('❌ 스트리밍 중지 실패:', error);
        }
    };

    const handleToggleStreaming = async () => {
        if (isStreaming) {
            Alert.alert(
                "스트리밍 중지",
                "스트리밍을 중지하시겠어요?",
                [
                    { text: "취소", style: "cancel" },
                    {
                        text: "중지",
                        style: "destructive",
                        onPress: async () => {
                            await stopStreaming();
                        },
                    },
                ]
            );
        } else {
            Alert.alert(
                "스트리밍 시작",
                "스트리밍을 시작하시겠어요?",
                [
                    { text: "취소", style: "cancel" },
                    {
                        text: "시작",
                        style: "default",
                        onPress: async () => {
                            await startStreaming(cameraId);
                        },
                    },
                ]
            );
        }
    };

    const handleSettings = () => {
        navigation?.navigate("CameraSettings");
    };

    const handleGeneratePinCode = async () => {
        try {
            // PIN 코드 생성
            const generatedPin = await connectionActions.generatePinCode();
            setPinCode(generatedPin);

            Alert.alert(
                "연결 PIN 코드",
                `뷰어에서 다음 PIN 코드를 입력하세요:\n\n${generatedPin}\n\n이 코드는 10분간 유효합니다.`,
                [
                    {
                        text: "복사",
                        onPress: async () => {
                            try {
                                await Clipboard.setStringAsync(generatedPin);
                                Alert.alert("복사됨", "PIN 코드가 클립보드에 복사되었습니다.");
                            } catch (error) {
                                Alert.alert("오류", "클립보드 복사에 실패했습니다.");
                            }
                        }
                    },
                    { text: "확인", style: "default" }
                ]
            );
        } catch (error) {
            Alert.alert('오류', 'PIN 코드를 생성할 수 없습니다.');
        }
    };

    const renderPermissionScreen = () => (
        <Animated.View
            style={[
                styles.permissionContainer,
                {
                    opacity: fadeAnim,
                    transform: [
                        { translateY: slideAnim },
                        { scale: scaleAnim }
                    ]
                }
            ]}
        >
            <View style={styles.permissionCard}>
                <LinearGradient
                    colors={[colors.surface, colors.surfaceAlt]}
                    style={styles.permissionCardGradient}
                >
                    <View style={styles.permissionIconContainer}>
                        <LinearGradient
                            colors={[colors.primary, colors.accent]}
                            style={styles.permissionIconGradient}
                        >
                            <Ionicons name="camera" size={64} color={colors.surface} />
                        </LinearGradient>
                    </View>

                    <Text style={styles.permissionTitle}>카메라 권한이 필요합니다</Text>
                    <Text style={styles.permissionDescription}>
                        홈캠 기능을 사용하려면 다음 권한이 필요합니다:
                    </Text>

                    <View style={styles.permissionList}>
                        <View style={styles.permissionItem}>
                            <Ionicons name="camera" size={20} color={colors.primary} />
                            <Text style={styles.permissionItemText}>카메라 - 영상 촬영</Text>
                        </View>
                        <View style={styles.permissionItem}>
                            <Ionicons name="mic" size={20} color={colors.primary} />
                            <Text style={styles.permissionItemText}>마이크 - 오디오 녹음</Text>
                        </View>
                        <View style={styles.permissionItem}>
                            <Ionicons name="save" size={20} color={colors.primary} />
                            <Text style={styles.permissionItemText}>저장소 - 영상 저장</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.permissionButton}
                        onPress={requestAllPermissions}
                        disabled={isRequestingPermissions}
                    >
                        <LinearGradient
                            colors={[colors.primary, colors.accent]}
                            style={styles.permissionButtonGradient}
                        >
                            <Ionicons
                                name={isRequestingPermissions ? "hourglass" : "shield-checkmark"}
                                size={20}
                                color={colors.surface}
                            />
                            <Text style={styles.permissionButtonText}>
                                {isRequestingPermissions ? '권한 요청 중...' : '권한 허용하기'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </LinearGradient>
            </View>
        </Animated.View>
    );

    const renderCameraPreview = () => (
        <Animated.View
            style={[
                styles.cameraCard,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }]
                }
            ]}
        >
            <LinearGradient
                colors={[colors.surface, colors.surfaceAlt]}
                style={styles.cameraCardGradient}
            >
                <View style={styles.cameraPreviewContainer}>
                    <CameraView
                        style={styles.cameraPreview}
                        facing={cameraType}
                    >
                        {/* 카메라 오버레이 */}
                        <View style={styles.cameraOverlay}>
                            {/* 상태 표시 */}
                            <View style={styles.cameraStatusContainer}>
                                <LinearGradient
                                    colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.4)']}
                                    style={styles.statusGradient}
                                >
                                    <View style={styles.statusIndicator}>
                                        <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                                        <Text style={styles.statusText}>라이브</Text>
                                    </View>
                                </LinearGradient>
                            </View>

                            {/* 카메라 전환 버튼 */}
                            <TouchableOpacity
                                style={styles.cameraControlButton}
                                onPress={toggleCameraType}
                            >
                                <LinearGradient
                                    colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
                                    style={styles.controlButtonGradient}
                                >
                                    <Ionicons name="camera-reverse" size={24} color={colors.text} />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </CameraView>
                </View>

                <View style={styles.cameraInfo}>
                    <Text style={styles.cameraTitle}>📹 {cameraName}</Text>
                    <Text style={styles.cameraSubtitle}>
                        {isStreaming ? '🔴 송출 중' : '⚫ 대기 중'}
                    </Text>
                </View>
            </LinearGradient>
        </Animated.View>
    );

    const renderConnectionCard = () => (
        <Animated.View
            style={[
                styles.connectionCard,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                }
            ]}
        >
            <LinearGradient
                colors={[colors.surface, colors.surfaceAlt]}
                style={styles.connectionCardGradient}
            >
                <View style={styles.connectionHeader}>
                    <View style={styles.connectionIconContainer}>
                        <LinearGradient
                            colors={[colors.primary, colors.accent]}
                            style={styles.connectionIconGradient}
                        >
                            <Ionicons name="wifi" size={24} color={colors.surface} />
                        </LinearGradient>
                    </View>
                    <View style={styles.connectionTitleContainer}>
                        <Text style={styles.connectionTitle}>연결 상태</Text>
                        <Text style={styles.connectionSubtitle}>
                            {connectionState.isConnected ? '서버에 연결됨' : '연결 확인 중...'}
                        </Text>
                    </View>
                    <View style={[
                        styles.connectionIndicator,
                        { backgroundColor: connectionState.isConnected ? colors.success : colors.warning }
                    ]} />
                </View>

                {/* PIN 코드 표시 영역 */}
                {pinCode && (
                    <Animated.View
                        style={[
                            styles.pinCodeSection,
                            { transform: [{ scale: pinPulseAnim }] }
                        ]}
                    >
                        <View style={styles.pinCodeHeader}>
                            <Ionicons name="key" size={20} color={colors.primary} />
                            <Text style={styles.pinCodeLabel}>연결 PIN 코드</Text>
                        </View>

                        <View style={styles.pinCodeDisplayContainer}>
                            <LinearGradient
                                colors={[colors.primary + '10', colors.accent + '10']}
                                style={styles.pinCodeDisplayGradient}
                            >
                                <Text style={styles.pinCodeText}>{pinCode}</Text>
                                <TouchableOpacity
                                    style={styles.pinCodeCopyButton}
                                    onPress={async () => {
                                        try {
                                            await Clipboard.setStringAsync(pinCode);
                                            Alert.alert("복사됨", "PIN 코드가 복사되었습니다.");
                                        } catch (error) {
                                            Alert.alert("오류", "복사에 실패했습니다.");
                                        }
                                    }}
                                >
                                    <Ionicons name="copy" size={18} color={colors.primary} />
                                </TouchableOpacity>
                            </LinearGradient>
                        </View>

                        <Text style={styles.pinCodeExpiry}>⏰ 10분간 유효</Text>
                    </Animated.View>
                )}

                {/* 연결 버튼 */}
                <TouchableOpacity
                    style={styles.generatePinButton}
                    onPress={handleGeneratePinCode}
                >
                    <LinearGradient
                        colors={pinCode ? [colors.accent, colors.primary] : [colors.primary, colors.accent]}
                        style={styles.generatePinButtonGradient}
                    >
                        <Ionicons
                            name={pinCode ? "refresh" : "key"}
                            size={20}
                            color={colors.surface}
                        />
                        <Text style={styles.generatePinButtonText}>
                            {pinCode ? 'PIN 코드 재생성' : '뷰어 연결하기'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </LinearGradient>
        </Animated.View>
    );

    const renderControlsCard = () => (
        <Animated.View
            style={[
                styles.controlsCard,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                }
            ]}
        >
            <LinearGradient
                colors={[colors.surface, colors.surfaceAlt]}
                style={styles.controlsCardGradient}
            >
                <Text style={styles.controlsTitle}>📡 방송 제어</Text>

                <View style={styles.controlsRow}>
                    {/* 스트리밍 토글 버튼 */}
                    <TouchableOpacity
                        style={[styles.streamingButton, isStreaming && styles.streamingButtonActive]}
                        onPress={handleToggleStreaming}
                    >
                        <LinearGradient
                            colors={isStreaming ? [colors.error, colors.warning] : [colors.success, colors.primary]}
                            style={styles.streamingButtonGradient}
                        >
                            <Ionicons
                                name={isStreaming ? "stop-circle" : "play-circle"}
                                size={28}
                                color={colors.surface}
                            />
                            <Text style={styles.streamingButtonText}>
                                {isStreaming ? '송출 중지' : '송출 시작'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* 설정 버튼 */}
                    <TouchableOpacity
                        style={styles.settingsControlButton}
                        onPress={handleSettings}
                    >
                        <LinearGradient
                            colors={[colors.surface, colors.surfaceAlt]}
                            style={styles.settingsControlButtonGradient}
                        >
                            <Ionicons name="settings" size={24} color={colors.text} />
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
                        <View style={styles.headerLeft}>
                            <LinearGradient
                                colors={[colors.primary, colors.accent]}
                                style={styles.headerIconGradient}
                            >
                                <Ionicons name="videocam" size={24} color={colors.surface} />
                            </LinearGradient>
                        </View>

                        <View style={styles.headerCenter}>
                            <Text style={styles.headerTitle}>홈캠 모드</Text>
                            <Text style={styles.headerSubtitle}>실시간 방송 준비</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.headerSettingsButton}
                            onPress={handleSettings}
                        >
                            <LinearGradient
                                colors={[colors.surface, colors.surfaceAlt]}
                                style={styles.headerSettingsGradient}
                            >
                                <Ionicons name="settings" size={20} color={colors.text} />
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* 권한 확인 또는 메인 콘텐츠 */}
                        {!hasAllPermissions ? renderPermissionScreen() : (
                            <>
                                {renderCameraPreview()}
                                {renderConnectionCard()}
                                {renderControlsCard()}

                                {/* 연결 재시도 버튼 */}
                                {!connectionState.isConnected && (
                                    <Animated.View
                                        style={[
                                            styles.retryContainer,
                                            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                                        ]}
                                    >
                                        <View style={styles.retryButtonsRow}>
                                            <TouchableOpacity
                                                style={[styles.retryButton, styles.retryButtonHalf]}
                                                onPress={connectionActions.reconnect}
                                            >
                                                <LinearGradient
                                                    colors={[colors.warning, colors.accent]}
                                                    style={styles.retryButtonGradient}
                                                >
                                                    <Ionicons name="refresh" size={20} color={colors.surface} />
                                                    <Text style={styles.retryButtonText}>재연결</Text>
                                                </LinearGradient>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[styles.retryButton, styles.retryButtonHalf]}
                                                onPress={async () => {
                                                    try {
                                                        const ipChanged = await forceRediscover();
                                                        if (ipChanged) {
                                                            Alert.alert('서버 발견! 🎯', '새로운 서버 IP를 찾았습니다. 다시 연결을 시도해보세요.');
                                                        } else {
                                                            Alert.alert('서버 검색 완료', '현재 설정이 최적입니다.');
                                                        }
                                                    } catch (error) {
                                                        Alert.alert('검색 실패', '네트워크 검색 중 오류가 발생했습니다.');
                                                    }
                                                }}
                                            >
                                                <LinearGradient
                                                    colors={[colors.primary, colors.success]}
                                                    style={styles.retryButtonGradient}
                                                >
                                                    <Ionicons name="search" size={20} color={colors.surface} />
                                                    <Text style={styles.retryButtonText}>서버 검색</Text>
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        </View>
                                    </Animated.View>
                                )}
                            </>
                        )}
                    </ScrollView>
                </SafeAreaView>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    headerLeft: {
        width: 24,
    },
    headerCenter: {
        flex: 1,
        alignItems: "center",
    },
    headerTitle: {
        ...typography.h2,
        color: colors.text,
        textAlign: "center",
    },
    headerSubtitle: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    headerSettingsButton: {
        padding: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        ...elevation['1'],
    },
    headerIconGradient: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    headerSettingsGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.sm,
        borderRadius: radius.md,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xl,
    },
    permissionContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.lg,
    },
    permissionCard: {
        width: "100%",
        borderRadius: radius.lg,
        overflow: "hidden",
        ...elevation['3'],
    },
    permissionCardGradient: {
        padding: spacing.lg,
    },
    permissionIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.surface,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacing.md,
        ...elevation['2'],
    },
    permissionIconGradient: {
        width: "100%",
        height: "100%",
        borderRadius: 60,
        alignItems: "center",
        justifyContent: "center",
    },
    permissionTitle: {
        ...typography.h2,
        color: colors.text,
        marginBottom: spacing.md,
        textAlign: "center",
    },
    permissionDescription: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: "center",
        marginBottom: spacing.lg,
        lineHeight: 24,
    },
    permissionList: {
        marginBottom: spacing.lg,
    },
    permissionItem: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.xs,
    },
    permissionItemText: {
        ...typography.body,
        color: colors.textSecondary,
        marginLeft: spacing.sm,
    },
    permissionButton: {
        borderRadius: radius.lg,
        overflow: 'hidden',
        ...elevation['2'],
    },
    permissionButtonGradient: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    permissionButtonText: {
        ...typography.bodyLg,
        color: colors.surface,
        fontWeight: '600',
    },
    cameraCard: {
        marginBottom: spacing.lg,
        borderRadius: radius.lg,
        overflow: "hidden",
        ...elevation['3'],
    },
    cameraCardGradient: {
        padding: spacing.lg,
    },
    cameraPreviewContainer: {
        width: "100%",
        height: screenHeight * 0.4,
        borderRadius: radius.xl,
        overflow: "hidden",
        ...elevation['2'],
    },
    cameraPreview: {
        width: "100%",
        height: "100%",
    },
    cameraOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: spacing.lg,
    },
    cameraStatusContainer: {
        position: 'absolute',
        top: spacing.md,
        left: spacing.md,
        borderRadius: radius.md,
        overflow: 'hidden',
    },
    statusGradient: {
        padding: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: spacing.xs,
    },
    statusText: {
        ...typography.caption,
        color: colors.surface,
    },
    cameraControlButton: {
        borderRadius: radius.full,
        padding: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    controlButtonGradient: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cameraInfo: {
        marginTop: spacing.md,
        alignItems: "center",
    },
    cameraTitle: {
        ...typography.h3,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    cameraSubtitle: {
        ...typography.body,
        color: colors.textSecondary,
    },
    connectionCard: {
        marginBottom: spacing.lg,
        borderRadius: radius.lg,
        overflow: "hidden",
        ...elevation['3'],
    },
    connectionCardGradient: {
        padding: spacing.lg,
    },
    connectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    connectionIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    connectionIconGradient: {
        width: "100%",
        height: "100%",
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    connectionTitleContainer: {
        flex: 1,
        marginLeft: spacing.sm,
    },
    connectionTitle: {
        ...typography.h3,
        color: colors.text,
    },
    connectionSubtitle: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    connectionIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: spacing.sm,
    },
    pinCodeSection: {
        marginTop: spacing.md,
        marginBottom: spacing.lg,
    },
    pinCodeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    pinCodeLabel: {
        ...typography.bodyLg,
        color: colors.textSecondary,
        marginLeft: spacing.sm,
    },
    pinCodeDisplayContainer: {
        borderRadius: radius.md,
        overflow: 'hidden',
        ...elevation['1'],
    },
    pinCodeDisplayGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    pinCodeText: {
        ...typography.bodyLg,
        color: colors.text,
        fontWeight: '600',
        marginRight: spacing.sm,
    },
    pinCodeCopyButton: {
        padding: spacing.sm,
    },
    pinCodeExpiry: {
        ...typography.caption,
        color: colors.textSecondary,
        textAlign: "center",
    },
    generatePinButton: {
        borderRadius: radius.lg,
        overflow: 'hidden',
        ...elevation['1'],
    },
    generatePinButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    generatePinButtonText: {
        ...typography.bodyLg,
        color: colors.surface,
        fontWeight: "600",
        marginLeft: spacing.sm,
    },
    controlsCard: {
        marginBottom: spacing.lg,
        borderRadius: radius.lg,
        overflow: "hidden",
        ...elevation['3'],
    },
    controlsCardGradient: {
        padding: spacing.lg,
    },
    controlsTitle: {
        ...typography.h3,
        color: colors.text,
        marginBottom: spacing.md,
    },
    controlsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    streamingButton: {
        flex: 1,
        marginRight: spacing.md,
        borderRadius: radius.lg,
        overflow: 'hidden',
        ...elevation['2'],
    },
    streamingButtonActive: {
        // 스타일은 streamingButton과 동일하지만 색상만 다름
    },
    streamingButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xl,
    },
    streamingButtonText: {
        ...typography.bodyLg,
        color: colors.surface,
        fontWeight: "600",
        marginLeft: spacing.sm,
    },
    settingsControlButton: {
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        ...elevation['1'],
    },
    settingsControlButtonGradient: {
        width: "100%",
        height: "100%",
        borderRadius: radius.lg,
        alignItems: "center",
        justifyContent: "center",
    },
    retryContainer: {
        marginTop: spacing.lg,
        alignItems: "center",
    },
    retryButtonsRow: {
        flexDirection: "row",
        gap: spacing.md,
        width: "100%",
    },
    retryButton: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        backgroundColor: colors.primary,
        borderRadius: radius.lg,
        alignItems: "center",
        justifyContent: "center",
        ...elevation['1'],
    },
    retryButtonHalf: {
        flex: 1,
        paddingHorizontal: spacing.md,
    },
    retryButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    retryButtonText: {
        ...typography.bodyLg,
        color: colors.surface,
        fontWeight: "600",
        marginLeft: spacing.sm,
    },
});
