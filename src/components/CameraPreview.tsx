import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Camera, CameraType, FlashMode } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius } from "../design/tokens";

interface CameraPreviewProps {
    cameraRef: React.RefObject<Camera>;
    cameraType: CameraType;
    flashMode: FlashMode;
    isRecording: boolean;
    isStreaming: boolean;
    recordingTime: number;
    streamingTime: number;
    hasPermission: boolean;
    error: string | null;
    onSwitchCamera: () => void;
    onToggleFlash: () => void;
}

export default function CameraPreview({
    cameraRef,
    cameraType,
    flashMode,
    isRecording,
    isStreaming,
    recordingTime,
    streamingTime,
    hasPermission,
    error,
    onSwitchCamera,
    onToggleFlash,
}: CameraPreviewProps) {
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    if (!hasPermission) {
        return (
            <View style={styles.permissionContainer}>
                <Ionicons name="camera-off" size={80} color={colors.textSecondary} />
                <Text style={styles.permissionText}>카메라 권한이 필요합니다</Text>
                {error && <Text style={styles.errorText}>{error}</Text>}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Camera
                ref={cameraRef}
                style={styles.camera}
                type={cameraType}
                flashMode={flashMode}
                ratio="16:9"
            >
                {/* 카메라 컨트롤 오버레이 */}
                <View style={styles.overlay}>
                    {/* 상단 컨트롤 */}
                    <View style={styles.topControls}>
                        <TouchableOpacity
                            style={styles.controlButton}
                            onPress={onToggleFlash}
                        >
                            <Ionicons
                                name={flashMode === FlashMode.On ? "flash" : "flash-off"}
                                size={24}
                                color={colors.surface}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.controlButton}
                            onPress={onSwitchCamera}
                        >
                            <Ionicons
                                name="camera-reverse"
                                size={24}
                                color={colors.surface}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* 녹화/스트리밍 상태 표시 */}
                    {isRecording && (
                        <View style={styles.statusIndicator}>
                            <View style={styles.recordingDot} />
                            <Text style={styles.statusText}>REC {formatTime(recordingTime)}</Text>
                        </View>
                    )}

                    {isStreaming && (
                        <View style={styles.statusIndicator}>
                            <View style={styles.streamingDot} />
                            <Text style={styles.statusText}>LIVE {formatTime(streamingTime)}</Text>
                        </View>
                    )}
                </View>
            </Camera>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderRadius: radius.lg,
        overflow: "hidden",
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: "transparent",
    },
    topControls: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: spacing.lg,
        paddingTop: spacing.xl,
    },
    controlButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    statusIndicator: {
        position: "absolute",
        top: spacing.xl,
        left: spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.md,
    },
    recordingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.error,
        marginRight: spacing.sm,
    },
    streamingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.warning,
        marginRight: spacing.sm,
    },
    statusText: {
        color: colors.surface,
        fontSize: 14,
        fontWeight: "600",
    },
    permissionContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.lg,
    },
    permissionText: {
        fontSize: 16,
        color: colors.textSecondary,
        marginTop: spacing.md,
        textAlign: "center",
    },
    errorText: {
        fontSize: 14,
        color: colors.error,
        marginTop: spacing.sm,
        textAlign: "center",
    },
});
