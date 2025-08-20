import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
    Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, Camera } from "expo-camera";
import { colors, spacing, radius, elevation } from "../../design/tokens";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { useViewerConnection } from "../../hooks/useViewerConnection";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

type ViewerQRScanScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "ViewerQRScan">;

interface ViewerQRScanScreenProps {
    navigation: ViewerQRScanScreenNavigationProp;
}

export default function ViewerQRScanScreen({ navigation }: ViewerQRScanScreenProps) {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [cameraFacing, setCameraFacing] = useState<'back' | 'front'>('back');
    const [scanned, setScanned] = useState(false);

    const viewerId = `viewer_${Date.now()}`;
    const [connectionState, connectionActions] = useViewerConnection(viewerId);
    const { isConnecting, error } = connectionState;

    useEffect(() => {
        const getBarCodeScannerPermissions = async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === "granted");
        };

        getBarCodeScannerPermissions();
    }, []);

    const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
        if (scanned) return;

        setScanned(true);
        handleQRCodeScanned(data);
    };

    const handleQRCodeScanned = async (data: string) => {
        try {
            const success = await connectionActions.scanQRCode(data);
            if (success) {
                navigation.replace("ViewerHome");
            } else {
                setScanned(false);
            }
        } catch (error) {
            Alert.alert("오류", "QR 코드를 읽을 수 없습니다.");
            setScanned(false);
        }
    };

    const handleManualInput = () => {
        Alert.prompt(
            "수동 연결",
            "홈캠의 고유 ID를 입력하세요:\n\n(예: MIMO_1234567890_abc123)",
            [
                { text: "취소", style: "cancel" },
                {
                    text: "연결",
                    onPress: async (cameraId) => {
                        if (cameraId && cameraId.trim()) {
                            const trimmedId = cameraId.trim();

                            // ID 형식 검증
                            if (!trimmedId.startsWith('MIMO_')) {
                                Alert.alert("잘못된 ID", "올바른 홈캠 ID 형식이 아닙니다.\n\nID는 'MIMO_'로 시작해야 합니다.");
                                return;
                            }

                            try {
                                const success = await connectionActions.connectToCamera(trimmedId);
                                if (success) {
                                    navigation.replace("ViewerHome");
                                }
                            } catch (error) {
                                Alert.alert("연결 실패", "해당 홈캠을 찾을 수 없습니다.\n\nID를 다시 확인해주세요.");
                            }
                        } else {
                            Alert.alert("입력 오류", "홈캠 ID를 입력해주세요.");
                        }
                    },
                },
            ],
            "plain-text"
        );
    };

    const handleHelp = () => {
        Alert.alert(
            "연결 방법",
            "QR 코드 스캔:\n1. 홈캠 기기에서 QR 코드를 생성하세요\n2. QR 코드를 스캔 영역에 맞춰주세요\n3. 자동으로 연결이 완료됩니다\n\n수동 연결:\n1. 홈캠 기기에서 '홈캠 ID' 버튼을 눌러 ID를 확인하세요\n2. '수동으로 연결' 버튼을 눌러 ID를 입력하세요\n3. 연결이 완료됩니다"
        );
    };

    const handleGoBack = () => {
        navigation.goBack();
    };

    if (hasPermission === null) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.background, colors.surfaceAlt]}
                    style={styles.backgroundGradient}
                />
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.loadingContainer}>
                        <Ionicons name="sync" size={60} color={colors.primary} />
                        <Text style={styles.loadingText}>카메라 권한을 요청 중...</Text>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    if (hasPermission === false) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.background, colors.surfaceAlt]}
                    style={styles.backgroundGradient}
                />
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.permissionContainer}>
                        <Ionicons name="camera-off" size={80} color={colors.textSecondary} />
                        <Text style={styles.permissionTitle}>카메라 접근 권한이 필요합니다</Text>
                        <Text style={styles.permissionSubtitle}>
                            QR 코드를 스캔하기 위해 카메라 권한을 허용해주세요
                        </Text>
                        <TouchableOpacity style={styles.permissionButton} onPress={handleGoBack}>
                            <LinearGradient
                                colors={[colors.primary, colors.accent]}
                                style={styles.permissionButtonGradient}
                            >
                                <Text style={styles.permissionButtonText}>돌아가기</Text>
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
                            onPress={handleGoBack}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="chevron-back" size={28} color={colors.surface} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>QR 코드 스캔</Text>
                        <TouchableOpacity
                            style={styles.helpButton}
                            onPress={handleHelp}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="help-circle-outline" size={28} color={colors.surface} />
                        </TouchableOpacity>
                    </View>

                    {/* QR Scanner */}
                    <View style={styles.scannerContainer}>
                        <CameraView
                            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                            facing={cameraFacing}
                            style={styles.scanner}
                        />

                        {/* Scanner Overlay */}
                        <View style={styles.scannerOverlay}>
                            {/* Corner Guides */}
                            <View style={styles.cornerGuide}>
                                <View style={styles.cornerTopLeft} />
                                <View style={styles.cornerTopRight} />
                                <View style={styles.cornerBottomLeft} />
                                <View style={styles.cornerBottomRight} />
                            </View>

                            {/* Center QR Icon */}
                            <View style={styles.centerIcon}>
                                <Ionicons name="qr-code-outline" size={80} color="rgba(255, 255, 255, 0.3)" />
                            </View>

                            {/* Connecting Overlay */}
                            {isConnecting && (
                                <View style={styles.connectingOverlay}>
                                    <View style={styles.connectingContent}>
                                        <Ionicons name="sync" size={50} color={colors.surface} />
                                        <Text style={styles.connectingText}>연결 중...</Text>
                                        <Text style={styles.connectingSubtext}>잠시만 기다려주세요</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Instructions */}
                    <View style={styles.instructionsCard}>
                        <View style={styles.instructionItem}>
                            <View style={styles.instructionIcon}>
                                <Ionicons name="camera" size={20} color={colors.primary} />
                            </View>
                            <Text style={styles.instructionText}>
                                홈캠 기기에서 QR 코드를 표시하세요
                            </Text>
                        </View>
                        <View style={styles.instructionItem}>
                            <View style={styles.instructionIcon}>
                                <Ionicons name="scan-outline" size={20} color={colors.primary} />
                            </View>
                            <Text style={styles.instructionText}>
                                QR 코드를 스캔 영역에 맞춰주세요
                            </Text>
                        </View>
                        <View style={styles.instructionItem}>
                            <View style={styles.instructionIcon}>
                                <Ionicons name="wifi" size={20} color={colors.primary} />
                            </View>
                            <Text style={styles.instructionText}>
                                자동으로 연결이 완료됩니다
                            </Text>
                        </View>
                    </View>

                    {/* Manual Connect Button */}
                    <TouchableOpacity
                        style={styles.manualButton}
                        onPress={handleManualInput}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="keypad-outline" size={20} color={colors.text} />
                        <Text style={styles.manualButtonText}>수동으로 연결</Text>
                    </TouchableOpacity>

                    {/* Help Link */}
                    <TouchableOpacity
                        style={styles.helpLink}
                        onPress={handleHelp}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.helpLinkText}>연결 방법 보기</Text>
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
        fontSize: 16,
        color: colors.text,
        marginTop: spacing.lg,
    },
    permissionContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: spacing.xl,
    },
    permissionTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: colors.text,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
        textAlign: "center",
    },
    permissionSubtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: "center",
        marginBottom: spacing.xl,
        lineHeight: 24,
    },
    permissionButton: {
        borderRadius: radius.lg,
        overflow: "hidden",
        elevation: elevation.md,
    },
    permissionButtonGradient: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    permissionButtonText: {
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
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        marginBottom: spacing.md,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.surface,
    },
    helpButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        justifyContent: "center",
        alignItems: "center",
    },
    scannerContainer: {
        flex: 1,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        borderRadius: radius.lg,
        overflow: "hidden",
        position: "relative",
        elevation: elevation.md,
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },
    scanner: {
        flex: 1,
    },
    scannerOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
    },
    cornerGuide: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    cornerTopLeft: {
        position: "absolute",
        top: 30,
        left: 30,
        width: 50,
        height: 50,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderColor: colors.surface,
        borderRadius: 8,
    },
    cornerTopRight: {
        position: "absolute",
        top: 30,
        right: 30,
        width: 50,
        height: 50,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderColor: colors.surface,
        borderRadius: 8,
    },
    cornerBottomLeft: {
        position: "absolute",
        bottom: 30,
        left: 30,
        width: 50,
        height: 50,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderColor: colors.surface,
        borderRadius: 8,
    },
    cornerBottomRight: {
        position: "absolute",
        bottom: 30,
        right: 30,
        width: 50,
        height: 50,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderColor: colors.surface,
        borderRadius: 8,
    },
    centerIcon: {
        position: "absolute",
        bottom: 60,
        justifyContent: "center",
        alignItems: "center",
    },
    connectingOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        justifyContent: "center",
        alignItems: "center",
    },
    connectingContent: {
        alignItems: "center",
        padding: spacing.xl,
    },
    connectingText: {
        color: colors.surface,
        fontSize: 18,
        fontWeight: "600",
        marginTop: spacing.lg,
    },
    connectingSubtext: {
        color: colors.textSecondary,
        fontSize: 14,
        marginTop: spacing.sm,
    },
    instructionsCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        elevation: elevation.md,
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    instructionItem: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.md,
    },
    instructionIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary + "20",
        justifyContent: "center",
        alignItems: "center",
        marginRight: spacing.md,
    },
    instructionText: {
        fontSize: 15,
        color: colors.text,
        flex: 1,
        lineHeight: 22,
    },
    manualButton: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        elevation: elevation.sm,
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    manualButtonText: {
        marginLeft: spacing.sm,
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
    },
    helpLink: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.md,
        marginBottom: spacing.lg,
    },
    helpLinkText: {
        marginLeft: spacing.xs,
        fontSize: 14,
        color: colors.textSecondary,
    },
});
