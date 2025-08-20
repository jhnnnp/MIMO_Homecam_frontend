import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Dimensions,
    StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radius, elevation } from "../../design/tokens";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

type ViewerLiveStreamScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "LiveStream">;

interface ViewerLiveStreamScreenProps {
    navigation: ViewerLiveStreamScreenNavigationProp;
    route: {
        params: {
            cameraId: number;
            cameraName: string;
        };
    };
}

export default function ViewerLiveStreamScreen({ navigation, route }: ViewerLiveStreamScreenProps) {
    const { cameraId, cameraName } = route.params;
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [showControls, setShowControls] = useState(true);

    useEffect(() => {
        const connectStream = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // 실제로는 WebRTC 연결 로직
                await new Promise((resolve) => setTimeout(resolve, 2000));
                setIsConnected(true);
                setIsLoading(false);
            } catch (err) {
                setError("스트림 연결에 실패했습니다.");
                setIsLoading(false);
            }
        };

        connectStream();
    }, [cameraId]);

    const handleRetryConnection = () => {
        setIsLoading(true);
        setError(null);
        setTimeout(() => {
            setIsConnected(true);
            setIsLoading(false);
        }, 2000);
    };

    const handleToggleRecording = () => {
        setIsRecording(!isRecording);
        Alert.alert(
            isRecording ? "녹화 중지" : "녹화 시작",
            isRecording ? "녹화가 중지되었습니다." : "녹화를 시작합니다.",
            [{ text: "확인" }]
        );
    };

    const handleSnapshot = () => {
        Alert.alert("스냅샷", "현재 화면이 저장되었습니다.");
    };

    const handleToggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
        StatusBar.setHidden(!isFullscreen);
    };

    const handleVideoPress = () => {
        setShowControls(!showControls);
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.background, colors.surfaceAlt]}
                    style={styles.backgroundGradient}
                />
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.loadingContainer}>
                        <Ionicons name="sync" size={60} color={colors.primary} />
                        <Text style={styles.loadingText}>스트림 연결 중...</Text>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.background, colors.surfaceAlt]}
                    style={styles.backgroundGradient}
                />
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={60} color={colors.error} />
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={handleRetryConnection}>
                            <LinearGradient
                                colors={[colors.primary, colors.accent]}
                                style={styles.retryButtonGradient}
                            >
                                <Text style={styles.retryButtonText}>다시 시도</Text>
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
                />

                <SafeAreaView style={styles.safeArea}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="arrow-back" size={24} color={colors.surface} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{cameraName}</Text>
                        <TouchableOpacity style={styles.fullscreenButton} onPress={handleToggleFullscreen}>
                            <Ionicons
                                name={isFullscreen ? "contract" : "expand"}
                                size={24}
                                color={colors.surface}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Video Stream */}
                    <TouchableOpacity style={styles.videoContainer} onPress={handleVideoPress}>
                        <View style={styles.videoPlaceholder}>
                            <Ionicons name="videocam" size={80} color={colors.surface} />
                            <Text style={styles.videoText}>라이브 스트림</Text>
                            {isConnected && (
                                <View style={styles.connectionIndicator}>
                                    <View style={styles.connectionDot} />
                                    <Text style={styles.connectionText}>LIVE</Text>
                                </View>
                            )}
                        </View>

                        {/* Controls Overlay */}
                        {showControls && (
                            <View style={styles.controlsOverlay}>
                                <View style={styles.topControls}>
                                    <TouchableOpacity style={styles.controlButton}>
                                        <Ionicons name="settings" size={24} color={colors.surface} />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.bottomControls}>
                                    <TouchableOpacity
                                        style={styles.controlButton}
                                        onPress={handleSnapshot}
                                    >
                                        <Ionicons name="camera" size={24} color={colors.surface} />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.controlButton,
                                            styles.recordButton,
                                            isRecording && styles.recordButtonActive,
                                        ]}
                                        onPress={handleToggleRecording}
                                    >
                                        <Ionicons
                                            name={isRecording ? "stop" : "radio-button-on"}
                                            size={32}
                                            color={colors.surface}
                                        />
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.controlButton}>
                                        <Ionicons name="share" size={24} color={colors.surface} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
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
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        fontSize: 18,
        color: colors.text,
        marginTop: spacing.lg,
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: spacing.xl,
    },
    errorText: {
        fontSize: 16,
        color: colors.text,
        textAlign: "center",
        marginTop: spacing.lg,
        marginBottom: spacing.xl,
    },
    retryButton: {
        borderRadius: radius.lg,
        overflow: "hidden",
    },
    retryButtonGradient: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    retryButtonText: {
        color: colors.surface,
        fontSize: 16,
        fontWeight: "600",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.surface,
    },
    fullscreenButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        justifyContent: "center",
        alignItems: "center",
    },
    videoContainer: {
        flex: 1,
        position: "relative",
    },
    videoPlaceholder: {
        flex: 1,
        backgroundColor: colors.text,
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
    },
    videoText: {
        color: colors.surface,
        fontSize: 18,
        marginTop: spacing.md,
    },
    connectionIndicator: {
        position: "absolute",
        top: spacing.lg,
        left: spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.md,
    },
    connectionDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.error,
        marginRight: spacing.sm,
    },
    connectionText: {
        color: colors.surface,
        fontSize: 14,
        fontWeight: "600",
    },
    controlsOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "space-between",
    },
    topControls: {
        flexDirection: "row",
        justifyContent: "flex-end",
        padding: spacing.lg,
    },
    bottomControls: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        padding: spacing.lg,
        paddingBottom: spacing.xl,
    },
    controlButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    recordButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "rgba(255, 0, 0, 0.8)",
    },
    recordButtonActive: {
        backgroundColor: "rgba(255, 255, 255, 0.9)",
    },
});
