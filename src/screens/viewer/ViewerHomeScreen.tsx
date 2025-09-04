import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
    Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radius, elevation, typography } from "../../design/tokens";
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
    const { connectedCamera, isConnected, error, availableCameras } = connectionState;

    // 연결된 카메라가 없으면 availableCameras에서 첫 번째 카메라 사용
    const displayCamera = connectedCamera || (availableCameras.length > 0 ? availableCameras[0] : null);

    // 애니메이션 값들
    const [fadeAnim] = useState(new Animated.Value(0));
    const [slideAnim] = useState(new Animated.Value(50));
    const [pulseAnim] = useState(new Animated.Value(1));

    useEffect(() => {
        // 화면 진입 애니메이션
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();

        // 연결 상태에 따른 펄스 애니메이션
        if (isConnected && connectedCamera) {
            Animated.loop(
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
            ).start();
        }
    }, [isConnected, connectedCamera]);

    const handleStartStreaming = async () => {
        if (!displayCamera) {
            Alert.alert("오류", "연결된 카메라가 없습니다.");
            return;
        }

        try {
            await connectionActions.startWatching(displayCamera.id);
            Alert.alert("성공", "스트림 시청을 시작합니다!");
            navigation.navigate("LiveStream", {
                cameraId: parseInt(displayCamera.id),
                cameraName: displayCamera.name,
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
                        navigation.replace("ViewerPinCode");
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

    if (!displayCamera) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.background, colors.surfaceAlt]}
                    style={styles.backgroundGradient}
                />
                <SafeAreaView style={styles.safeArea}>
                    <Animated.View
                        style={[
                            styles.emptyState,
                            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                        ]}
                    >
                        <LinearGradient
                            colors={[colors.primary, colors.accent]}
                            style={styles.emptyStateIconGradient}
                        >
                            <Ionicons name="camera-off" size={80} color={colors.surface} />
                        </LinearGradient>
                        <Text style={styles.emptyTitle}>연결된 카메라가 없습니다</Text>
                        <Text style={styles.emptySubtitle}>
                            PIN 코드를 입력하여 홈캠에 연결하세요
                        </Text>

                        {error && (
                            <View style={styles.errorContainer}>
                                <LinearGradient
                                    colors={[colors.error, colors.warning]}
                                    style={styles.errorGradient}
                                >
                                    <Ionicons name="alert-circle" size={20} color={colors.surface} />
                                    <Text style={styles.errorText}>{error}</Text>
                                </LinearGradient>
                                <TouchableOpacity
                                    style={styles.retryButton}
                                    onPress={connectionActions.reconnect}
                                >
                                    <LinearGradient
                                        colors={[colors.primary, colors.accent]}
                                        style={styles.retryButtonGradient}
                                    >
                                        <Ionicons name="refresh" size={16} color={colors.surface} />
                                        <Text style={styles.retryButtonText}>다시 시도</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.connectButton}
                            onPress={() => navigation.navigate("ViewerPinCode")}
                        >
                            <LinearGradient
                                colors={[colors.primary, colors.accent]}
                                style={styles.connectButtonGradient}
                            >
                                <Ionicons name="key" size={24} color={colors.surface} />
                                <Text style={styles.connectButtonText}>PIN 코드로 연결</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
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
                />

                <SafeAreaView style={styles.safeArea}>
                    <Animated.View
                        style={[
                            styles.header,
                            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                        ]}
                    >
                        <Text style={styles.title}>뷰어 모드</Text>
                        <TouchableOpacity
                            style={styles.settingsButton}
                            onPress={handleSettings}
                        >
                            <LinearGradient
                                colors={[colors.surface, colors.surfaceAlt]}
                                style={styles.settingsButtonGradient}
                            >
                                <Ionicons name="settings" size={24} color={colors.text} />
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View
                        style={[
                            styles.content,
                            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                        ]}
                    >
                        {/* 연결된 카메라 정보 */}
                        <Animated.View
                            style={[
                                styles.cameraInfoCard,
                                { transform: [{ scale: pulseAnim }] }
                            ]}
                        >
                            <LinearGradient
                                colors={[colors.surface, colors.surfaceAlt]}
                                style={styles.cameraInfoGradient}
                            >
                                <View style={styles.cameraInfoHeader}>
                                    <LinearGradient
                                        colors={[colors.success, colors.primary]}
                                        style={styles.cameraStatusGradient}
                                    >
                                        <Ionicons name="videocam" size={24} color={colors.surface} />
                                    </LinearGradient>
                                    <View style={styles.cameraInfoText}>
                                        <Text style={styles.cameraName}>{displayCamera.name}</Text>
                                        <Text style={styles.cameraStatus}>연결됨</Text>
                                    </View>
                                </View>

                                <View style={styles.cameraActions}>
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={handleStartStreaming}
                                    >
                                        <LinearGradient
                                            colors={[colors.primary, colors.accent]}
                                            style={styles.actionButtonGradient}
                                        >
                                            <Ionicons name="play" size={20} color={colors.surface} />
                                            <Text style={styles.actionButtonText}>라이브 시청</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.disconnectButton}
                                        onPress={handleDisconnect}
                                    >
                                        <LinearGradient
                                            colors={[colors.error, colors.warning]}
                                            style={styles.disconnectButtonGradient}
                                        >
                                            <Ionicons name="close" size={20} color={colors.surface} />
                                            <Text style={styles.disconnectButtonText}>연결 해제</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </LinearGradient>
                        </Animated.View>

                        {/* 연결 상태 정보 */}
                        <View style={styles.statusCard}>
                            <LinearGradient
                                colors={[colors.surface, colors.surfaceAlt]}
                                style={styles.statusCardGradient}
                            >
                                <View style={styles.statusHeader}>
                                    <LinearGradient
                                        colors={[colors.primary, colors.accent]}
                                        style={styles.statusIconGradient}
                                    >
                                        <Ionicons name="wifi" size={20} color={colors.surface} />
                                    </LinearGradient>
                                    <Text style={styles.statusTitle}>연결 상태</Text>
                                </View>

                                <View style={styles.statusItems}>
                                    <View style={styles.statusItem}>
                                        <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                                        <Text style={styles.statusText}>홈캠 연결됨</Text>
                                    </View>
                                    <View style={styles.statusItem}>
                                        <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
                                        <Text style={styles.statusText}>실시간 스트림 준비됨</Text>
                                    </View>
                                </View>
                            </LinearGradient>
                        </View>

                        {/* 빠른 액션 */}
                        <View style={styles.quickActions}>
                            <TouchableOpacity
                                style={styles.quickActionButton}
                                onPress={() => navigation.navigate("ViewerPinCode")}
                            >
                                <LinearGradient
                                    colors={[colors.surface, colors.surfaceAlt]}
                                    style={styles.quickActionGradient}
                                >
                                    <Ionicons name="add-circle" size={32} color={colors.primary} />
                                    <Text style={styles.quickActionText}>다른 홈캠 연결</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
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
    emptyStateIconGradient: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacing.xl,
        ...elevation['2'],
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
        marginVertical: spacing.md,
        alignItems: 'center',
    },
    errorGradient: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.md,
        marginBottom: spacing.md,
    },
    errorText: {
        color: colors.error,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    retryButton: {
        borderRadius: radius.md,
        overflow: 'hidden',
    },
    retryButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    retryButtonText: {
        color: colors.surface,
        fontSize: 14,
        fontWeight: '600',
        marginLeft: spacing.xs,
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
    cameraInfoCard: {
        marginBottom: spacing.lg,
        borderRadius: radius.lg,
        overflow: "hidden",
        elevation: elevation.md,
    },
    cameraInfoGradient: {
        padding: spacing.lg,
    },
    cameraInfoHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.md,
    },
    cameraStatusGradient: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginRight: spacing.md,
    },
    cameraInfoText: {
        flex: 1,
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
    disconnectButton: {
        flex: 1,
        marginHorizontal: spacing.xs,
        borderRadius: radius.md,
        overflow: "hidden",
    },
    disconnectButtonGradient: {
        paddingVertical: spacing.md,
        alignItems: "center",
        justifyContent: "center",
    },
    disconnectButtonText: {
        color: colors.surface,
        fontSize: 14,
        fontWeight: "600",
        marginTop: spacing.xs,
    },
    statusCard: {
        marginBottom: spacing.lg,
        borderRadius: radius.lg,
        overflow: "hidden",
        elevation: elevation.md,
    },
    statusCardGradient: {
        padding: spacing.lg,
    },
    statusHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.md,
    },
    statusIconGradient: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginRight: spacing.md,
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: colors.text,
    },
    statusItems: {
        flexDirection: "row",
        justifyContent: "space-around",
    },
    statusItem: {
        flexDirection: "row",
        alignItems: "center",
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
    quickActionGradient: {
        paddingVertical: spacing.md,
        alignItems: "center",
        justifyContent: "center",
    },
    quickActionText: {
        marginLeft: spacing.sm,
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
    },
});
