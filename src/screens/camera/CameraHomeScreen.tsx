import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from 'expo-clipboard';
import { colors, spacing, radius, elevation } from "../../design/tokens";
import { useCameraStream } from "../../hooks/useCameraStream";
import { useCameraConnection } from "../../hooks/useCameraConnection";
import CameraPreview from "../../components/CameraPreview";
import { WebRTCVideoPlayer } from '../../components/WebRTCVideoPlayer';
import { webrtcService } from '../../services/webrtcService';

interface CameraHomeScreenProps {
    navigation?: any; // 타입을 임시로 any로 변경
}

export default function CameraHomeScreen({ navigation }: CameraHomeScreenProps) {
    const [state, actions] = useCameraStream();
    const [connectionState, connectionActions] = useCameraConnection();
    const [localStream, setLocalStream] = useState<any>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingViewer, setStreamingViewer] = useState<string | null>(null);

    // WebRTC 스트림 초기화
    useEffect(() => {
        const initializeStream = async () => {
            try {
                const stream = await webrtcService.initializeLocalStream();
                setLocalStream(stream);
                console.log('✅ 로컬 스트림 초기화 완료');
            } catch (error) {
                console.error('❌ 로컬 스트림 초기화 실패:', error);
            }
        };

        initializeStream();

        // 정리
        return () => {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // 스트리밍 시작
    const startStreaming = async (viewerId: string) => {
        try {
            if (!connectionState.cameraId) {
                Alert.alert('오류', '카메라 ID가 없습니다.');
                return;
            }

            console.log(`🎥 스트리밍 시작: ${connectionState.cameraId} -> ${viewerId}`);

            const webRTCStream = await webrtcService.startStreaming(
                connectionState.cameraId,
                viewerId
            );

            // 스트림 콜백 설정
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

    // 스트리밍 중지
    const stopStreaming = async () => {
        try {
            if (streamingViewer && connectionState.cameraId) {
                await webrtcService.stopStream(streamingViewer);
                setIsStreaming(false);
                setStreamingViewer(null);
                Alert.alert('완료', '스트리밍이 중지되었습니다.');
            }
        } catch (error) {
            console.error('❌ 스트리밍 중지 실패:', error);
        }
    };

    const handleToggleRecording = async () => {
        if (state.isRecording) {
            Alert.alert(
                "녹화 중지",
                "녹화를 중지하시겠어요?",
                [
                    { text: "취소", style: "cancel" },
                    {
                        text: "중지",
                        style: "destructive",
                        onPress: async () => {
                            await actions.stopRecording();
                        },
                    },
                ]
            );
        } else {
            await actions.startRecording(connectionState.cameraId);
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
                            if (connectionState.cameraId) {
                                await startStreaming(connectionState.cameraId);
                            } else {
                                Alert.alert('오류', '카메라 ID가 없습니다.');
                            }
                        },
                    },
                ]
            );
        }
    };

    const handleSettings = () => {
        navigation?.navigate("CameraSettings");
    };

    const handleShowQRCode = () => {
        navigation?.navigate("CameraQRCode");
    };

    const handleTakeSnapshot = async () => {
        const photoUri = await actions.takeSnapshot();
        if (photoUri) {
            Alert.alert("스냅샷", "사진이 갤러리에 저장되었습니다.");
        }
    };

    const handleShowCameraId = async () => {
        Alert.alert(
            "홈캠 ID",
            `이 기기의 고유 ID입니다:\n\n${connectionState.cameraId}\n\n뷰어에서 이 ID를 입력하여 연결할 수 있습니다.`,
            [
                {
                    text: "복사",
                    onPress: async () => {
                        try {
                            await Clipboard.setStringAsync(connectionState.cameraId);
                            Alert.alert("복사됨", "ID가 클립보드에 복사되었습니다.");
                        } catch (error) {
                            Alert.alert("오류", "클립보드 복사에 실패했습니다.");
                        }
                    }
                },
                { text: "확인", style: "default" }
            ]
        );
    };

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor={colors.background} />
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.headerLeft} />
                    <Text style={styles.title}>홈캠 모드</Text>
                    <TouchableOpacity
                        style={styles.settingsButton}
                        onPress={() => navigation?.navigate('CameraSettings')}
                    >
                        <Ionicons name="settings" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    {/* 카메라 프리뷰 */}
                    <View style={styles.cameraContainer}>
                        {localStream ? (
                            <WebRTCVideoPlayer
                                stream={localStream}
                                isLocal={true}
                                style={styles.cameraPreview}
                            />
                        ) : (
                            <View style={styles.cameraPlaceholder}>
                                <Ionicons name="videocam" size={64} color={colors.textSecondary} />
                                <Text style={styles.cameraPlaceholderText}>카메라 초기화 중...</Text>
                            </View>
                        )}
                    </View>

                    {/* 연결 상태 */}
                    <View style={styles.connectionStatus}>
                        <View style={styles.statusRow}>
                            <View style={[styles.statusDot, { backgroundColor: connectionState.isConnected ? colors.success : colors.error }]} />
                            <Text style={styles.statusText}>
                                {connectionState.isConnected ? '서버 연결됨' : '서버 연결 안됨'}
                            </Text>
                        </View>

                        {connectionState.cameraId && (
                            <View style={styles.cameraIdContainer}>
                                <Text style={styles.cameraIdLabel}>홈캠 ID:</Text>
                                <Text style={styles.cameraIdText}>{connectionState.cameraId}</Text>
                                <TouchableOpacity
                                    style={styles.copyButton}
                                    onPress={() => {
                                        Clipboard.setStringAsync(connectionState.cameraId);
                                        Alert.alert('복사됨', '홈캠 ID가 클립보드에 복사되었습니다.');
                                    }}
                                >
                                    <Ionicons name="copy" size={16} color={colors.primary} />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* 뷰어 연결 가이드 */}
                        {connectionState.isConnected && !isStreaming && (
                            <View style={styles.pairingGuide}>
                                <Text style={styles.pairingTitle}>📱 뷰어 연결 방법</Text>
                                <Text style={styles.pairingStep}>1️⃣ 뷰어 디바이스에서 '뷰어 모드' 선택</Text>
                                <Text style={styles.pairingStep}>2️⃣ QR 코드 스캔 또는 홈캠 ID 입력</Text>
                                <Text style={styles.pairingStep}>3️⃣ 연결 완료 후 스트리밍 시작</Text>

                                <TouchableOpacity
                                    style={styles.showQRButton}
                                    onPress={() => navigation?.navigate('CameraQRCode')}
                                >
                                    <Ionicons name="qr-code" size={20} color={colors.surface} />
                                    <Text style={styles.showQRButtonText}>QR 코드 보기</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* 스트리밍 상태 */}
                    {isStreaming && (
                        <View style={styles.streamingStatus}>
                            <View style={styles.statusRow}>
                                <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                                <Text style={styles.statusText}>스트리밍 중</Text>
                            </View>
                            <Text style={styles.viewerText}>뷰어: {streamingViewer}</Text>
                            <TouchableOpacity
                                style={styles.stopStreamButton}
                                onPress={stopStreaming}
                            >
                                <Text style={styles.stopStreamButtonText}>스트리밍 중지</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* 컨트롤 버튼들 */}
                    <View style={styles.controls}>
                        <TouchableOpacity
                            style={styles.controlButton}
                            onPress={actions.switchCamera}
                        >
                            <Ionicons name="camera-reverse" size={24} color={colors.text} />
                            <Text style={styles.controlButtonText}>카메라 전환</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.controlButton}
                            onPress={actions.toggleFlash}
                        >
                            <Ionicons name={state.flashMode === 'on' ? 'flash' : 'flash-off'} size={24} color={colors.text} />
                            <Text style={styles.controlButtonText}>플래시</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.controlButton}
                            onPress={actions.takeSnapshot}
                        >
                            <Ionicons name="camera" size={24} color={colors.text} />
                            <Text style={styles.controlButtonText}>사진 촬영</Text>
                        </TouchableOpacity>
                    </View>

                    {/* 녹화 컨트롤 */}
                    <View style={styles.recordingControls}>
                        {state.isRecording ? (
                            <TouchableOpacity
                                style={[styles.recordButton, styles.stopRecordButton]}
                                onPress={actions.stopRecording}
                            >
                                <Ionicons name="stop" size={32} color={colors.onPrimary} />
                                <Text style={styles.recordButtonText}>녹화 중지</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={styles.recordButton}
                                onPress={() => actions.startRecording(connectionState.cameraId)}
                            >
                                <Ionicons name="radio-button-on" size={32} color={colors.onPrimary} />
                                <Text style={styles.recordButtonText}>녹화 시작</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* 추가 기능 버튼들 */}
                    <View style={styles.additionalControls}>
                        <TouchableOpacity
                            style={styles.settingsButton}
                            onPress={() => navigation?.navigate('RecordingList')}
                        >
                            <LinearGradient
                                colors={[colors.surface, colors.surfaceAlt]}
                                style={styles.settingsButtonGradient}
                            >
                                <Ionicons name="videocam" size={24} color={colors.text} />
                                <Text style={styles.settingsButtonText}>녹화 목록</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.settingsButton}
                            onPress={() => navigation?.navigate('MotionDetectionSettings')}
                        >
                            <LinearGradient
                                colors={[colors.surface, colors.surfaceAlt]}
                                style={styles.settingsButtonGradient}
                            >
                                <Ionicons name="eye" size={24} color={colors.text} />
                                <Text style={styles.settingsButtonText}>모션 감지</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.settingsButton}
                            onPress={() => navigation?.navigate('NotificationSettings')}
                        >
                            <LinearGradient
                                colors={[colors.surface, colors.surfaceAlt]}
                                style={styles.settingsButtonGradient}
                            >
                                <Ionicons name="notifications" size={24} color={colors.text} />
                                <Text style={styles.settingsButtonText}>알림 설정</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* 연결 재시도 버튼 */}
                    {!connectionState.isConnected && (
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={connectionActions.connect}
                        >
                            <Text style={styles.retryButtonText}>다시 연결</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </SafeAreaView>
        </>
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.background,
    },
    headerLeft: {
        width: 24, // 뒤로 가기 버튼과 같은 너비
    },
    title: {
        fontSize: 20,
        fontWeight: "600",
        color: colors.text,
    },
    settingsButton: {
        padding: spacing.sm,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
    },
    cameraContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.lg,
    },
    cameraPreview: {
        width: "100%",
        height: 250,
        borderRadius: radius.lg,
        overflow: "hidden",
        elevation: elevation.md,
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    cameraPlaceholder: {
        alignItems: "center",
        justifyContent: "center",
    },
    cameraPlaceholderText: {
        marginTop: spacing.sm,
        color: colors.textSecondary,
        fontSize: 16,
    },
    connectionStatus: {
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        alignItems: "center",
    },
    statusRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.xs,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: spacing.xs,
    },
    statusText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    cameraIdContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: spacing.xs,
    },
    cameraIdLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        marginRight: spacing.xs,
    },
    cameraIdText: {
        fontSize: 14,
        fontWeight: "500",
        color: colors.text,
    },
    copyButton: {
        padding: spacing.xs,
    },
    streamingStatus: {
        marginTop: spacing.lg,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        alignItems: "center",
    },
    viewerText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    stopStreamButton: {
        marginTop: spacing.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.error,
        borderRadius: radius.md,
        alignItems: "center",
        justifyContent: "center",
    },
    stopStreamButtonText: {
        color: colors.surface,
        fontSize: 16,
        fontWeight: "600",
    },
    controls: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginBottom: spacing.lg,
    },
    controlButton: {
        alignItems: "center",
        marginHorizontal: spacing.xs,
    },
    controlButtonText: {
        color: colors.text,
        fontSize: 12,
        fontWeight: "600",
        marginTop: spacing.xs,
    },
    recordingControls: {
        marginBottom: spacing.lg,
    },
    recordButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.primary,
        borderRadius: radius.lg,
        elevation: elevation.sm,
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    recordButtonText: {
        color: colors.surface,
        fontSize: 14,
        fontWeight: "600",
        marginLeft: spacing.xs,
    },
    stopRecordButton: {
        backgroundColor: colors.error,
    },
    additionalControls: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: spacing.md,
    },
    settingsButton: {
        flex: 1,
        marginHorizontal: spacing.xs,
        borderRadius: radius.lg,
        overflow: "hidden",
        elevation: elevation.sm,
    },
    settingsButtonGradient: {
        paddingVertical: spacing.md,
        alignItems: "center",
        justifyContent: "center",
    },
    settingsButtonText: {
        color: colors.surface,
        fontSize: 12,
        fontWeight: "600",
        marginTop: spacing.xs,
    },
    retryButton: {
        marginTop: spacing.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.primary,
        borderRadius: radius.md,
        alignItems: "center",
        justifyContent: "center",
    },
    retryButtonText: {
        color: colors.surface,
        fontSize: 16,
        fontWeight: "600",
    },
    pairingGuide: {
        marginTop: spacing.md,
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        alignItems: "center",
    },
    pairingTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.text,
        marginBottom: spacing.sm,
    },
    pairingStep: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
        textAlign: "left",
    },
    showQRButton: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.primary,
        borderRadius: radius.md,
    },
    showQRButtonText: {
        color: colors.surface,
        fontSize: 14,
        fontWeight: "600",
        marginLeft: spacing.xs,
    },
});
