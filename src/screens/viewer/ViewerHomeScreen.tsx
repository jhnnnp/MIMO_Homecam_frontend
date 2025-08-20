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

type ViewerHomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "ViewerHome">;

interface ViewerHomeScreenProps {
    navigation: ViewerHomeScreenNavigationProp;
}

interface ConnectedCamera {
    id: string;
    name: string;
    status: "online" | "offline" | "streaming";
    lastSeen: string;
    connectionId: string;
}

export default function ViewerHomeScreen({ navigation }: ViewerHomeScreenProps) {
    const [connectedCamera, setConnectedCamera] = useState<ConnectedCamera | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // 연결된 카메라 정보 로드 (실제로는 API에서 가져옴)
        loadConnectedCamera();
    }, []);

    const loadConnectedCamera = () => {
        // 시뮬레이션: 연결된 카메라 정보
        const mockCamera: ConnectedCamera = {
            id: "camera_001",
            name: "홈캠",
            status: "online",
            lastSeen: "방금 전",
            connectionId: "conn_123",
        };
        setConnectedCamera(mockCamera);
    };

    const handleStartStreaming = () => {
        if (!connectedCamera) {
            Alert.alert("오류", "연결된 카메라가 없습니다.");
            return;
        }

        navigation.navigate("LiveStream", {
            cameraId: parseInt(connectedCamera.id),
            cameraName: connectedCamera.name,
        });
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
                        setConnectedCamera(null);
                        navigation.replace("ViewerQRScan");
                    },
                },
            ]
        );
    };

    const handleSettings = () => {
        navigation.navigate("Settings");
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
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.replace("ModeSelection")}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="chevron-back" size={28} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.title}>뷰어 모드</Text>
                        <Text style={styles.subtitle}>연결된 홈캠을 모니터링하세요</Text>
                    </View>

                    {/* Connected Camera Card */}
                    <View style={styles.cameraCard}>
                        <LinearGradient
                            colors={[colors.surface, colors.surfaceAlt]}
                            style={styles.cameraCardGradient}
                        >
                            <View style={styles.cameraHeader}>
                                <View style={styles.cameraInfo}>
                                    <Ionicons name="camera" size={32} color={colors.primary} />
                                    <View style={styles.cameraDetails}>
                                        <Text style={styles.cameraName}>{connectedCamera.name}</Text>
                                        <Text style={styles.cameraStatus}>
                                            {connectedCamera.status === "online" ? "온라인" : "오프라인"}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.statusIndicator}>
                                    <View
                                        style={[
                                            styles.statusDot,
                                            {
                                                backgroundColor:
                                                    connectedCamera.status === "online"
                                                        ? colors.success
                                                        : colors.error,
                                            },
                                        ]}
                                    />
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
                                        <Ionicons name="play-circle" size={24} color={colors.surface} />
                                        <Text style={styles.actionButtonText}>라이브 스트림</Text>
                                    </LinearGradient>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={handleDisconnect}
                                >
                                    <LinearGradient
                                        colors={[colors.error, colors.error + "CC"]}
                                        style={styles.actionButtonGradient}
                                    >
                                        <Ionicons name="disconnect" size={24} color={colors.surface} />
                                        <Text style={styles.actionButtonText}>연결 해제</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.quickActions}>
                        <TouchableOpacity
                            style={styles.quickActionButton}
                            onPress={() => navigation.navigate("ViewerQRScan")}
                        >
                            <Ionicons name="qr-code" size={24} color={colors.primary} />
                            <Text style={styles.quickActionText}>QR 코드 스캔</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Settings Button */}
                    <TouchableOpacity style={styles.settingsButton} onPress={handleSettings}>
                        <LinearGradient
                            colors={[colors.surface, colors.surfaceAlt]}
                            style={styles.settingsButtonGradient}
                        >
                            <Ionicons name="settings" size={24} color={colors.text} />
                            <Text style={styles.settingsButtonText}>설정</Text>
                        </LinearGradient>
                    </TouchableOpacity>
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
        alignItems: "center",
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface,
        justifyContent: "center",
        alignItems: "center",
        marginRight: spacing.md,
        elevation: elevation.sm,
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
});
