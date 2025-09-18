/**
 * CameraHomeScreen - 홈캠 대기 화면
 * 
 * 항상 대기 모드:
 * - 카메라 미리보기 (무엇을 찍고 있는지 확인)
 * - 연결 코드 생성 (뷰어에서 접속용 QR/PIN)
 * - 기본 설정 접근
 * 
 * 홈캠 본질: 거치해놓고 계속 촬영, 뷰어에서 접속하여 시청
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Dimensions,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';

// Design System
import { spacing, radius } from '@/design/tokens';

// Navigation Types
import { CameraStackParamList } from '@/app/navigation/AppNavigator';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '@/features/../app/navigation/AppNavigator';

// Hooks
import { useCameraConnection } from '../../connection/hooks/useCameraConnection';

// Constants
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 간결한 색상 팔레트
const colors = {
    primary: '#007AFF',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#C6C6C8',
};

// Types
interface CameraHomeScreenProps {
    navigation: NativeStackNavigationProp<CameraStackParamList, 'CameraHome'>;
}

// Component Implementation
const CameraHomeScreen: React.FC<CameraHomeScreenProps> = memo(({ navigation }) => {
    const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    // Camera Connection
    const cameraId = `MIMO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const cameraName = '프로페셔널 홈캠';
    const [connectionState, connectionActions] = useCameraConnection(cameraId, cameraName);

    // 홈캠 상태 관리
    const [cameraType, setCameraType] = useState<CameraType>('back');

    // Permission Management
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [hasAllPermissions, setHasAllPermissions] = useState(false);

    // Check permissions
    const checkAllPermissions = useCallback(async () => {
        try {
            const [audioPermission, mediaPermission] = await Promise.all([
                Audio.requestPermissionsAsync(),
                MediaLibrary.requestPermissionsAsync(),
            ]);

            const allGranted =
                cameraPermission?.granted &&
                audioPermission.status === 'granted' &&
                mediaPermission.status === 'granted';

            setHasAllPermissions(!!allGranted);
            return allGranted;
        } catch (error) {
            console.error('권한 확인 실패:', error);
            return false;
        }
    }, [cameraPermission?.granted]);

    // Effects
    useEffect(() => {
        checkAllPermissions();
    }, [checkAllPermissions]);

    // Event Handlers - 홈캠은 항상 대기 상태이므로 토글 불필요

    const handleGenerateQRCode = useCallback(() => {
        navigation.navigate('QRCodeGenerator' as any, {
            cameraId,
            cameraName
        });
    }, [navigation, cameraId, cameraName]);

    // 권한 없을 때 화면
    if (!hasAllPermissions) {
        return (
            <View style={styles.container}>
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => rootNavigation.navigate('ModeSelection')}
                        >
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>홈캠 모드</Text>
                        <TouchableOpacity
                            style={styles.settingsButton}
                            onPress={() => navigation.navigate("CameraSettings")}
                        >
                            <Ionicons name="settings-outline" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.permissionContainer}>
                        <Ionicons name="videocam-off" size={64} color={colors.textSecondary} />
                        <Text style={styles.permissionTitle}>카메라 권한이 필요합니다</Text>
                        <Text style={styles.permissionSubtitle}>
                            홈캠 기능을 사용하려면 권한을 허용해주세요
                        </Text>
                        <TouchableOpacity
                            style={styles.permissionButton}
                            onPress={checkAllPermissions}
                        >
                            <Text style={styles.permissionButtonText}>권한 허용</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => rootNavigation.navigate('ModeSelection')}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>홈캠 모드</Text>
                    <TouchableOpacity
                        style={styles.settingsButton}
                        onPress={() => navigation.navigate("CameraSettings")}
                    >
                        <Ionicons name="settings-outline" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {/* 홈캠 상태 - 항상 대기 */}
                <View style={styles.statusContainer}>
                    <View style={styles.statusRow}>
                        <View style={styles.statusItem}>
                            <View style={[styles.statusDot, {
                                backgroundColor: colors.success
                            }]} />
                            <Text style={styles.statusText}>연결 대기 중</Text>
                        </View>
                        <Text style={styles.cameraInfo}>{cameraName}</Text>
                    </View>
                </View>

                {/* 카메라 미리보기 */}
                <View style={styles.previewContainer}>
                    <CameraView style={styles.cameraView} facing={cameraType}>
                        <View style={styles.cameraOverlay}>
                            <TouchableOpacity
                                style={styles.flipButton}
                                onPress={() => setCameraType(current => current === 'back' ? 'front' : 'back')}
                            >
                                <Ionicons name="camera-reverse" size={20} color={colors.surface} />
                            </TouchableOpacity>
                        </View>
                    </CameraView>
                </View>

                {/* 제어 패널 */}
                <View style={styles.controlPanel}>
                    {/* 메인 연결 코드 버튼 */}
                    <TouchableOpacity
                        style={styles.mainButton}
                        onPress={handleGenerateQRCode}
                    >
                        <LinearGradient
                            colors={[colors.primary, '#2196F3']}
                            style={styles.mainButtonGradient}
                        >
                            <Ionicons name="qr-code" size={24} color="white" />
                            <Text style={styles.mainButtonText}>연결 코드 보기</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* 설정 버튼 */}
                    <TouchableOpacity
                        style={styles.settingsControl}
                        onPress={() => navigation.navigate('CameraSettings')}
                    >
                        <Ionicons name="settings-outline" size={20} color={colors.primary} />
                        <Text style={styles.settingsControlText}>카메라 설정</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
});

CameraHomeScreen.displayName = 'CameraHomeScreen';

export default CameraHomeScreen;

// 간결한 스타일
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: colors.background,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    settingsButton: {
        padding: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: colors.background,
    },

    // 권한 화면
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    permissionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.text,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    permissionSubtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 22,
    },
    permissionButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xl * 2,
        borderRadius: radius.lg,
    },
    permissionButtonText: {
        color: colors.surface,
        fontSize: 16,
        fontWeight: '600',
    },

    // 상태 표시
    statusContainer: {
        backgroundColor: colors.surface,
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        borderRadius: radius.lg,
        padding: spacing.lg,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: spacing.sm,
    },
    statusText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    cameraInfo: {
        fontSize: 16,
        color: colors.textSecondary,
        fontWeight: '500',
    },

    // 카메라 미리보기
    previewContainer: {
        margin: spacing.lg,
        borderRadius: radius.xl,
        overflow: 'hidden',
        backgroundColor: colors.surface,
        aspectRatio: 16 / 9,
    },
    cameraView: {
        flex: 1,
    },
    cameraOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        padding: spacing.lg,
    },
    flipButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // 제어 패널
    controlPanel: {
        padding: spacing.lg,
        paddingBottom: spacing.xl,
        gap: spacing.lg,
    },

    // 메인 버튼
    mainButton: {
        borderRadius: radius.lg,
        overflow: 'hidden',
    },
    mainButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
        gap: spacing.sm,
    },
    mainButtonText: {
        color: colors.surface,
        fontSize: 18,
        fontWeight: '600',
    },

    // 설정 버튼
    settingsControl: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.sm,
    },
    settingsControlText: {
        fontSize: 16,
        color: colors.text,
        fontWeight: '500',
    },
});