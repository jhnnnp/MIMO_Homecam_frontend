import React from "react";
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
import { colors, spacing, radius, elevation } from "../../design/tokens";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { useCameraStream } from "../../hooks/useCameraStream";
import CameraPreview from "../../components/CameraPreview";

type CameraHomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "CameraSettings">;

interface CameraHomeScreenProps {
    navigation: CameraHomeScreenNavigationProp;
}

export default function CameraHomeScreen({ navigation }: CameraHomeScreenProps) {
    const [state, actions] = useCameraStream();
    const {
        hasPermission,
        cameraType,
        flashMode,
        isRecording,
        isStreaming,
        recordingTime,
        streamingTime,
        error,
    } = state;

    const handleToggleRecording = async () => {
        if (isRecording) {
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
            await actions.startRecording();
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
                            await actions.stopStreaming();
                        },
                    },
                ]
            );
        } else {
            await actions.startStreaming();
        }
    };

    const handleSettings = () => {
        navigation.navigate("CameraSettings");
    };

    const handleShowQRCode = () => {
        navigation.navigate("CameraQRCode");
    };

    const handleTakeSnapshot = async () => {
        const photoUri = await actions.takeSnapshot();
        if (photoUri) {
            Alert.alert("스냅샷", "사진이 갤러리에 저장되었습니다.");
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
                        <Text style={styles.title}>홈캠 모드</Text>
                        <Text style={styles.subtitle}>이 기기를 카메라로 사용하세요</Text>
                    </View>

                    {/* Camera Preview */}
                    <View style={styles.cameraPreview}>
                        <CameraPreview
                            cameraRef={actions.cameraRef}
                            cameraType={cameraType}
                            flashMode={flashMode}
                            isRecording={isRecording}
                            isStreaming={isStreaming}
                            recordingTime={recordingTime}
                            streamingTime={streamingTime}
                            hasPermission={hasPermission}
                            error={error}
                            onSwitchCamera={actions.switchCamera}
                            onToggleFlash={actions.toggleFlash}
                        />
                    </View>

                    {/* Control Buttons */}
                    <View style={styles.controls}>
                        <View style={styles.controlRow}>
                            <TouchableOpacity
                                style={[
                                    styles.controlButton,
                                    styles.recordButton,
                                    isRecording && styles.recordButtonActive,
                                ]}
                                onPress={handleToggleRecording}
                                disabled={!hasPermission}
                            >
                                <LinearGradient
                                    colors={
                                        isRecording
                                            ? [colors.error, colors.error + "CC"]
                                            : [colors.primary, colors.accent]
                                    }
                                    style={styles.controlButtonGradient}
                                >
                                    <Ionicons
                                        name={isRecording ? "stop" : "radio-button-on"}
                                        size={32}
                                        color={colors.surface}
                                    />
                                </LinearGradient>
                                <Text style={styles.controlButtonText}>
                                    {isRecording ? "녹화 중지" : "녹화 시작"}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.controlButton,
                                    styles.streamButton,
                                    isStreaming && styles.streamButtonActive,
                                ]}
                                onPress={handleToggleStreaming}
                                disabled={!hasPermission}
                            >
                                <LinearGradient
                                    colors={
                                        isStreaming
                                            ? [colors.warning, colors.warning + "CC"]
                                            : [colors.accent, colors.primary]
                                    }
                                    style={styles.controlButtonGradient}
                                >
                                    <Ionicons
                                        name={isStreaming ? "stop-circle" : "play-circle"}
                                        size={32}
                                        color={colors.surface}
                                    />
                                </LinearGradient>
                                <Text style={styles.controlButtonText}>
                                    {isStreaming ? "스트리밍 중지" : "스트리밍 시작"}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Additional Controls */}
                        <View style={styles.additionalControls}>
                            <TouchableOpacity
                                style={styles.snapshotButton}
                                onPress={handleTakeSnapshot}
                                disabled={!hasPermission}
                            >
                                <LinearGradient
                                    colors={[colors.surface, colors.surfaceAlt]}
                                    style={styles.snapshotButtonGradient}
                                >
                                    <Ionicons name="camera" size={24} color={colors.text} />
                                    <Text style={styles.snapshotButtonText}>스냅샷</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.settingsButton}
                                onPress={handleShowQRCode}
                            >
                                <LinearGradient
                                    colors={[colors.accent, colors.primary]}
                                    style={styles.settingsButtonGradient}
                                >
                                    <Ionicons name="qr-code" size={24} color={colors.surface} />
                                    <Text style={styles.settingsButtonText}>QR 코드 공유</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.settingsButton}
                                onPress={handleSettings}
                            >
                                <LinearGradient
                                    colors={[colors.surface, colors.surfaceAlt]}
                                    style={styles.settingsButtonGradient}
                                >
                                    <Ionicons name="settings" size={24} color={colors.text} />
                                    <Text style={styles.settingsButtonText}>카메라 설정</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Status Information */}
                    <View style={styles.statusCard}>
                        <View style={styles.statusHeader}>
                            <Ionicons name="information-circle" size={20} color={colors.textSecondary} />
                            <Text style={styles.statusTitle}>상태 정보</Text>
                        </View>
                        <View style={styles.statusContent}>
                            <View style={styles.statusRow}>
                                <Text style={styles.statusLabel}>녹화 상태:</Text>
                                <Text style={styles.statusValue}>
                                    {isRecording ? "녹화 중" : "대기 중"}
                                </Text>
                            </View>
                            <View style={styles.statusRow}>
                                <Text style={styles.statusLabel}>스트리밍 상태:</Text>
                                <Text style={styles.statusValue}>
                                    {isStreaming ? "스트리밍 중" : "대기 중"}
                                </Text>
                            </View>
                            <View style={styles.statusRow}>
                                <Text style={styles.statusLabel}>저장 공간:</Text>
                                <Text style={styles.statusValue}>2.3GB / 32GB</Text>
                            </View>
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
    },
    backgroundGradient: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: colors.text,
        textAlign: "center",
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: "center",
    },
    cameraPreview: {
        flex: 1,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        borderRadius: radius.lg,
        overflow: "hidden",
        elevation: elevation.md,
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    controls: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    controlRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: spacing.md,
    },
    controlButton: {
        flex: 1,
        marginHorizontal: spacing.xs,
        borderRadius: radius.lg,
        overflow: "hidden",
        elevation: elevation.sm,
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    controlButtonGradient: {
        paddingVertical: spacing.lg,
        alignItems: "center",
        justifyContent: "center",
    },
    controlButtonText: {
        color: colors.surface,
        fontSize: 14,
        fontWeight: "600",
        marginTop: spacing.xs,
    },
    recordButton: {
        // 녹화 버튼 스타일
    },
    recordButtonActive: {
        // 활성 녹화 버튼 스타일
    },
    streamButton: {
        // 스트리밍 버튼 스타일
    },
    streamButtonActive: {
        // 활성 스트리밍 버튼 스타일
    },
    additionalControls: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: spacing.md,
    },
    snapshotButton: {
        flex: 1,
        marginRight: spacing.xs,
        borderRadius: radius.lg,
        overflow: "hidden",
        elevation: elevation.sm,
    },
    snapshotButtonGradient: {
        paddingVertical: spacing.md,
        alignItems: "center",
        justifyContent: "center",
    },
    snapshotButtonText: {
        color: colors.text,
        fontSize: 12,
        fontWeight: "600",
        marginTop: spacing.xs,
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
    statusCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        elevation: elevation.sm,
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    statusHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.md,
    },
    statusTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginLeft: spacing.xs,
    },
    statusContent: {
        gap: spacing.sm,
    },
    statusRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    statusLabel: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    statusValue: {
        fontSize: 14,
        fontWeight: "500",
        color: colors.text,
    },
});
