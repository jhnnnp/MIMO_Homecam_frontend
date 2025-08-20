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
import { colors, spacing, radius, elevation } from "../../design/tokens";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { useViewerConnection } from "../../hooks/useViewerConnection";

type ViewerHomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "ViewerHome">;

interface ViewerHomeScreenProps {
    navigation: ViewerHomeScreenNavigationProp;
}

export default function ViewerHomeScreen({ navigation }: ViewerHomeScreenProps) {
    const viewerId = `viewer_${Date.now()}`;
    const [connectionState, connectionActions] = useViewerConnection(viewerId);
    const { connectedCamera, isConnected, error } = connectionState;

    const handleStartStreaming = async () => {
        if (!connectedCamera) {
            Alert.alert("오류", "연결된 카메라가 없습니다.");
            return;
        }

        try {
            await connectionActions.startWatching(connectedCamera.id);
            navigation.navigate("LiveStream", {
                cameraId: parseInt(connectedCamera.id),
                cameraName: connectedCamera.name,
            });
        } catch (error) {
            Alert.alert("오류", "스트림을 시작할 수 없습니다.");
        }
    };

    const handleDisconnect = () => {
        Alert.alert(
            "연결 해제",
            "홈캠과의 연결을 해제하시겠어요?",
            [
                { text: "취소", style: "cancel" },
                {
                    text: "해제",
                    style: "destructive",
                    onPress: () => {
                        connectionActions.disconnectFromCamera();
                        navigation.replace("ViewerQRScan");
                    },
                },
            ]
        );
    };

    const handleSettings = () => {
        navigation.navigate("Settings");
    };

    const handleViewStream = (cameraId: string, cameraName: string) => {
        navigation.navigate("LiveStream", {
            cameraId: parseInt(cameraId),
            cameraName: cameraName,
        });
    };

    if (!connectedCamera) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.background, colors.surfaceAlt]}
                    style={styles.backgroundGradient}
                />
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.emptyState}>
                        <Ionicons name="camera-off" size={80} color={colors.textSecondary} />
                        <Text style={styles.emptyTitle}>연결된 카메라가 없습니다</Text>
                        <Text style={styles.emptySubtitle}>
                            QR 코드를 스캔하여 홈캠에 연결하세요
                        </Text>

                        {error && (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{error}</Text>
                                <TouchableOpacity
                                    style={styles.retryButton}
                                    onPress={connectionActions.reconnect}
                                >
                                    <Text style={styles.retryButtonText}>다시 시도</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.connectButton}
                            onPress={() => navigation.navigate("ViewerQRScan")}
                        >
                            <LinearGradient
                                colors={[colors.primary, colors.accent]}
                                style={styles.connectButtonGradient}
                            >
                                <Ionicons name="qr-code" size={24} color={colors.surface} />
                                <Text style={styles.connectButtonText}>QR 코드로 연결</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

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
                    <View style={styles.header}>
                        <Text style={styles.title}>뷰어 모드</Text>
                        <TouchableOpacity
                            style={styles.settingsButton}
                            onPress={() => navigation.navigate('Settings')}
                        >
                            <Ionicons name="settings" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        {/* 연결 가이드 */}
                        {connectionState.connectedCameras.length === 0 && (
                            <View style={styles.connectionGuide}>
                                <Ionicons name="videocam-outline" size={64} color={colors.textSecondary} />
                                <Text style={styles.guideTitle}>홈캠에 연결하세요</Text>
                                <Text style={styles.guideDescription}>
                                    홈캠 디바이스의 QR 코드를 스캔하거나{'\n'}
                                    홈캠 ID를 직접 입력하여 연결할 수 있습니다.
                                </Text>

                                <View style={styles.connectionOptions}>
                                    <TouchableOpacity
                                        style={styles.optionButton}
                                        onPress={() => navigation.navigate('ViewerQRScan')}
                                    >
                                        <LinearGradient
                                            colors={[colors.primary, colors.primaryDark]}
                                            style={styles.optionButtonGradient}
                                        >
                                            <Ionicons name="qr-code-outline" size={32} color={colors.surface} />
                                            <Text style={styles.optionButtonText}>QR 코드 스캔</Text>
                                            <Text style={styles.optionButtonSubtext}>카메라로 스캔</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.optionButton}
                                        onPress={() => {
                                            Alert.prompt(
                                                '홈캠 ID 입력',
                                                'MIMO_로 시작하는 홈캠 ID를 입력하세요',
                                                [
                                                    { text: '취소', style: 'cancel' },
                                                    {
                                                        text: '연결',
                                                        onPress: (cameraId) => {
                                                            if (cameraId && cameraId.startsWith('MIMO_')) {
                                                                connectionActions.connectToCamera(cameraId, '홈캠');
                                                            } else {
                                                                Alert.alert('오류', '올바른 홈캠 ID를 입력하세요.');
                                                            }
                                                        }
                                                    }
                                                ],
                                                'plain-text'
                                            );
                                        }}
                                    >
                                        <LinearGradient
                                            colors={[colors.surface, colors.surfaceAlt]}
                                            style={styles.optionButtonGradient}
                                        >
                                            <Ionicons name="keypad-outline" size={32} color={colors.text} />
                                            <Text style={[styles.optionButtonText, { color: colors.text }]}>ID 직접 입력</Text>
                                            <Text style={[styles.optionButtonSubtext, { color: colors.textSecondary }]}>수동 연결</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* 연결된 카메라 목록 */}
                        {connectionState.connectedCameras.length > 0 && (
                            <View style={styles.cameraList}>
                                <Text style={styles.sectionTitle}>연결된 홈캠</Text>
                                {connectionState.connectedCameras.map((camera) => (
                                    <TouchableOpacity
                                        key={camera.id}
                                        style={styles.cameraItem}
                                        onPress={() => handleViewStream(camera.id, camera.name)}
                                    >
                                        <LinearGradient
                                            colors={[colors.surface, colors.surfaceAlt]}
                                            style={styles.cameraItemGradient}
                                        >
                                            <View style={styles.cameraInfo}>
                                                <Ionicons name="videocam" size={24} color={colors.primary} />
                                                <View style={styles.cameraDetails}>
                                                    <Text style={styles.cameraName}>{camera.name}</Text>
                                                    <Text style={styles.cameraId}>ID: {camera.id}</Text>
                                                    <Text style={styles.cameraStatus}>
                                                        {camera.isStreaming ? '🟢 스트리밍 중' : '⚫ 대기 중'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                        </LinearGradient>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* 연결 상태 표시 */}
                        <View style={styles.connectionStatus}>
                            <View style={styles.statusRow}>
                                <View style={[styles.statusDot, { backgroundColor: connectionState.isConnected ? colors.success : colors.error }]} />
                                <Text style={styles.statusText}>
                                    {connectionState.isConnected ? '서버 연결됨' : '서버 연결 안됨'}
                                </Text>
                            </View>

                            {!connectionState.isConnected && (
                                <TouchableOpacity
                                    style={styles.retryButton}
                                    onPress={connectionActions.connect}
                                >
                                    <Text style={styles.retryButtonText}>다시 연결</Text>
                                </TouchableOpacity>
                            )}
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
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
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
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: spacing.xl,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: colors.text,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    emptySubtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: "center",
        marginBottom: spacing.xl,
    },
    connectButton: {
        borderRadius: radius.lg,
        overflow: "hidden",
        elevation: elevation.md,
    },
    connectButtonGradient: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        flexDirection: "row",
        alignItems: "center",
    },
    connectButtonText: {
        color: colors.surface,
        fontSize: 16,
        fontWeight: "600",
        marginLeft: spacing.sm,
    },
    cameraCard: {
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
    cameraCardGradient: {
        padding: spacing.lg,
    },
    cameraHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.lg,
    },
    cameraInfo: {
        flexDirection: "row",
        alignItems: "center",
    },
    cameraDetails: {
        marginLeft: spacing.md,
    },
    cameraName: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.text,
        marginBottom: spacing.xs,
    },
    cameraStatus: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    statusIndicator: {
        alignItems: "center",
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    cameraActions: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    actionButton: {
        flex: 1,
        marginHorizontal: spacing.xs,
        borderRadius: radius.md,
        overflow: "hidden",
    },
    actionButtonGradient: {
        paddingVertical: spacing.md,
        alignItems: "center",
        justifyContent: "center",
    },
    actionButtonText: {
        color: colors.surface,
        fontSize: 14,
        fontWeight: "600",
        marginTop: spacing.xs,
    },
    quickActions: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    quickActionButton: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        elevation: elevation.sm,
    },
    quickActionText: {
        marginLeft: spacing.sm,
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
    },
    settingsButton: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
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
        color: colors.text,
        fontSize: 16,
        fontWeight: "600",
        marginTop: spacing.xs,
    },
    errorContainer: {
        backgroundColor: colors.error + '20',
        borderRadius: radius.md,
        padding: spacing.md,
        marginVertical: spacing.md,
        alignItems: 'center',
    },
    errorText: {
        color: colors.error,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    retryButton: {
        backgroundColor: colors.error,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.md,
    },
    retryButtonText: {
        color: colors.surface,
        fontSize: 14,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
    },
    connectionGuide: {
        alignItems: "center",
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        marginBottom: spacing.lg,
        elevation: elevation.sm,
    },
    guideTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: colors.text,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
        textAlign: "center",
    },
    guideDescription: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: "center",
        lineHeight: 22,
    },
    connectionOptions: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginTop: spacing.lg,
    },
    optionButton: {
        flex: 1,
        marginHorizontal: spacing.sm,
        borderRadius: radius.lg,
        overflow: "hidden",
        elevation: elevation.sm,
    },
    optionButtonGradient: {
        paddingVertical: spacing.lg,
        alignItems: "center",
        justifyContent: "center",
    },
    optionButtonText: {
        fontSize: 16,
        fontWeight: "600",
        marginTop: spacing.sm,
    },
    optionButtonSubtext: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    cameraList: {
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: colors.text,
        marginBottom: spacing.sm,
    },
    cameraItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.sm,
        borderRadius: radius.md,
        overflow: "hidden",
        elevation: elevation.sm,
    },
    cameraItemGradient: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    cameraInfo: {
        flexDirection: "row",
        alignItems: "center",
    },
    cameraDetails: {
        marginLeft: spacing.md,
    },
    cameraName: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: spacing.xs,
    },
    cameraId: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    cameraStatus: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    connectionStatus: {
        alignItems: "center",
        marginTop: spacing.lg,
    },
    statusRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: spacing.xs,
    },
    statusText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
});
