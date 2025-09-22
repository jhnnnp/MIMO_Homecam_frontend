/**
 * CameraHomeScreen - 모던한 홈캠 대기 화면
 * 
 * 핵심 기능:
 * - 카메라 미리보기
 * - 연결 코드 생성
 * - 홈캠 설정 접근
 * - 실시간 상태 표시
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    Dimensions,
    Platform,
    Pressable,
    ScrollView,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';

import { CameraStackParamList } from '@/app/navigation/AppNavigator';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '@/app/navigation/AppNavigator';
import { useCameraConnection } from '../../connection/hooks/useCameraConnection';
import { useAuthStore } from '@/shared/stores/authStore';

// Constants
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 홈캠 목록과 일치하는 색상 팔레트
const colors = {
    primary: '#007AFF',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    surfaceAlt: '#F7F4EF',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#E5E5EA',
    accent: '#F5C572',
} as const;

// Types
interface CameraHomeScreenProps {
    navigation: NativeStackNavigationProp<CameraStackParamList, 'CameraHome'>;
}

export default function CameraHomeScreen({ navigation }: CameraHomeScreenProps) {
    const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { user } = useAuthStore();

    // 홈캠 상태
    const [cameraType, setCameraType] = useState<CameraType>('back');
    const [isRecording, setIsRecording] = useState(false);
    // 연결/뷰어 상태는 useCameraConnection의 state를 사용

    // Camera Connection
    const cameraId = `MIMO_USER_${user?.id || 'unknown'}_MAIN_CAM`;
    const cameraName = user?.name ? `${user.name}의 홈캠` : '홈캠';
    const [connectionState, connectionActions] = useCameraConnection(cameraId, cameraName);

    // 표시용 상태 파생값
    const isConnected = connectionState.connectionStatus === 'connected';
    const isConnecting = connectionState.connectionStatus === 'connecting';
    const hasViewers = (connectionState.viewerCount || 0) > 0;
    const dotColor = isConnected ? colors.success : isConnecting ? colors.warning : colors.textSecondary;
    const mainStatusText = isConnecting
        ? '연결 중...'
        : isConnected
            ? (hasViewers ? '뷰어 연결됨' : '연결 대기 중')
            : '연결 해제됨';
    const subStatusText = hasViewers ? `${connectionState.viewerCount}명 연결됨` : '연결된 뷰어 없음';

    // Permission Management
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [hasAllPermissions, setHasAllPermissions] = useState(false);

    // 권한 확인
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

    useEffect(() => {
        checkAllPermissions();
    }, [checkAllPermissions]);

    // 이벤트 핸들러
    const handleGenerateQRCode = useCallback(() => {
        navigation.navigate('QRCodeGenerator', {
            cameraId,
            cameraName
        });
    }, [navigation, cameraId, cameraName]);

    const handleCameraSettings = useCallback(() => {
        navigation.navigate('CameraSettings');
    }, [navigation]);

    const handleFlipCamera = useCallback(() => {
        setCameraType(current => current === 'back' ? 'front' : 'back');
    }, []);

    const handleToggleRecording = useCallback(() => {
        setIsRecording(prev => !prev);
        Alert.alert(
            isRecording ? '녹화 중지' : '녹화 시작',
            isRecording ? '녹화가 중지되었습니다.' : '녹화가 시작되었습니다.'
        );
    }, [isRecording]);

    // 권한 없을 때 화면
    if (!hasAllPermissions) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
                <LinearGradient
                    colors={[colors.background, colors.surfaceAlt]}
                    style={styles.backgroundGradient}
                />

                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.header}>
                        <Pressable
                            style={({ pressed }) => [
                                styles.headerButton,
                                pressed && styles.headerButtonPressed,
                            ]}
                            onPress={() => rootNavigation.navigate('ModeSelection')}
                        >
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </Pressable>
                        <Text style={styles.headerTitle}>홈캠 모드</Text>
                        <View style={styles.headerSpacer} />
                    </View>

                    <View style={styles.permissionContainer}>
                        <LinearGradient
                            colors={[colors.warning + '20', colors.warning + '10']}
                            style={styles.permissionIcon}
                        >
                            <Ionicons name="videocam-off" size={48} color={colors.warning} />
                        </LinearGradient>

                        <Text style={styles.permissionTitle}>카메라 권한이 필요합니다</Text>
                        <Text style={styles.permissionSubtitle}>
                            홈캠 기능을 사용하려면 카메라, 마이크,{'\n'}미디어 접근 권한을 허용해주세요
                        </Text>

                        <Pressable
                            style={({ pressed }) => [
                                styles.permissionButton,
                                pressed && styles.permissionButtonPressed,
                            ]}
                            onPress={checkAllPermissions}
                        >
                            <LinearGradient
                                colors={[colors.primary, '#5AC8FA']}
                                style={styles.permissionButtonGradient}
                            >
                                <Ionicons name="checkmark-circle" size={20} color="white" />
                                <Text style={styles.permissionButtonText}>권한 허용</Text>
                            </LinearGradient>
                        </Pressable>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <LinearGradient
                colors={[colors.background, colors.surfaceAlt]}
                style={styles.backgroundGradient}
            />

            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable
                        style={({ pressed }) => [
                            styles.headerButton,
                            pressed && styles.headerButtonPressed,
                        ]}
                        onPress={() => rootNavigation.navigate('ModeSelection')}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </Pressable>

                    <Text style={styles.headerTitle}>홈캠 모드</Text>

                    <Pressable
                        style={({ pressed }) => [
                            styles.headerButton,
                            pressed && styles.headerButtonPressed,
                        ]}
                        onPress={handleCameraSettings}
                    >
                        <Ionicons name="settings-outline" size={24} color={colors.text} />
                    </Pressable>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* 상태 카드 */}
                    <View style={styles.statusCard}>
                        <View style={styles.statusHeader}>
                            <View style={styles.statusInfo}>
                                <View style={styles.statusIndicator}>
                                    <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
                                    <Text style={styles.statusText}>{mainStatusText}</Text>
                                </View>
                                <Text style={styles.statusSubtext}>{subStatusText}</Text>
                            </View>
                            <View style={styles.recordingStatus}>
                                <View style={[
                                    styles.recordingDot,
                                    { backgroundColor: isRecording ? colors.error : colors.textSecondary }
                                ]} />
                                <Text style={styles.recordingText}>
                                    {isRecording ? '녹화 중' : '대기'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* 카메라 미리보기 */}
                    <View style={styles.previewCard}>
                        <View style={styles.previewHeader}>
                            <Text style={styles.previewTitle}>카메라 미리보기</Text>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.flipButton,
                                    pressed && styles.flipButtonPressed,
                                ]}
                                onPress={handleFlipCamera}
                            >
                                <Ionicons name="camera-reverse" size={18} color={colors.primary} />
                            </Pressable>
                        </View>

                        <View style={styles.cameraContainer}>
                            <CameraView style={styles.cameraView} facing={cameraType}>
                                <LinearGradient
                                    colors={['transparent', 'rgba(0,0,0,0.3)']}
                                    style={styles.cameraOverlay}
                                >
                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.recordButton,
                                            pressed && styles.recordButtonPressed,
                                            isRecording && styles.recordButtonActive,
                                        ]}
                                        onPress={handleToggleRecording}
                                    >
                                        <Ionicons
                                            name={isRecording ? "stop" : "radio-button-on"}
                                            size={24}
                                            color="white"
                                        />
                                    </Pressable>
                                </LinearGradient>
                            </CameraView>
                        </View>
                    </View>

                    {/* 액션 버튼들 */}
                    <View style={styles.actionsContainer}>
                        {/* QR 코드 생성 */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.actionCard,
                                styles.primaryAction,
                                pressed && styles.actionCardPressed,
                            ]}
                            onPress={handleGenerateQRCode}
                        >
                            <LinearGradient
                                colors={[colors.primary, '#5AC8FA']}
                                style={styles.actionGradient}
                            >
                                <View style={styles.actionIcon}>
                                    <Ionicons name="qr-code" size={24} color="white" />
                                </View>
                                <View style={styles.actionInfo}>
                                    <Text style={styles.actionTitle}>연결 코드 보기</Text>
                                    <Text style={styles.actionSubtitle}>PIN/QR 코드 생성</Text>
                                </View>
                                <Ionicons name="arrow-forward" size={18} color="white" />
                            </LinearGradient>
                        </Pressable>

                        {/* 카메라 설정 */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.actionCard,
                                styles.secondaryAction,
                                pressed && styles.actionCardPressed,
                            ]}
                            onPress={handleCameraSettings}
                        >
                            <View style={styles.actionContent}>
                                <LinearGradient
                                    colors={[colors.textSecondary + '20', colors.textSecondary + '10']}
                                    style={styles.actionIconSecondary}
                                >
                                    <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
                                </LinearGradient>
                                <View style={styles.actionInfo}>
                                    <Text style={styles.actionTitleSecondary}>카메라 설정</Text>
                                    <Text style={styles.actionSubtitleSecondary}>화질, 녹화 설정</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                            </View>
                        </Pressable>
                    </View>

                    {/* 도움말 섹션 */}
                    <View style={styles.helpSection}>
                        <Text style={styles.helpTitle}>사용 방법</Text>
                        <View style={styles.helpCard}>
                            <View style={styles.helpItem}>
                                <LinearGradient
                                    colors={[colors.primary + '20', colors.primary + '10']}
                                    style={styles.helpIcon}
                                >
                                    <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                                </LinearGradient>
                                <Text style={styles.helpText}>
                                    "연결 코드 보기"를 눌러 뷰어가 연결할 수 있는{'\n'}PIN/QR 코드를 생성하세요
                                </Text>
                            </View>

                            <View style={styles.helpDivider} />

                            <View style={styles.helpItem}>
                                <LinearGradient
                                    colors={[colors.success + '20', colors.success + '10']}
                                    style={styles.helpIcon}
                                >
                                    <Ionicons name="videocam-outline" size={16} color={colors.success} />
                                </LinearGradient>
                                <Text style={styles.helpText}>
                                    홈캠은 자동으로 대기 상태를 유지하며{'\n'}뷰어의 연결을 기다립니다
                                </Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
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

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerButton: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: colors.background,
        minWidth: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerButtonPressed: {
        backgroundColor: colors.border,
        transform: [{ scale: 0.95 }],
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    headerSpacer: {
        width: 48,
    },

    // Scroll Content
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },

    // Status Card
    statusCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    statusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusInfo: {
        flex: 1,
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    statusText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    statusSubtext: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    recordingStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    recordingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    recordingText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },

    // Camera Preview Card
    previewCard: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    previewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    previewTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    flipButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: colors.background,
    },
    flipButtonPressed: {
        backgroundColor: colors.border,
    },
    cameraContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        aspectRatio: 16 / 9,
        backgroundColor: colors.background,
    },
    cameraView: {
        flex: 1,
    },
    cameraOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 20,
    },
    recordButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: 'white',
    },
    recordButtonPressed: {
        transform: [{ scale: 0.95 }],
    },
    recordButtonActive: {
        backgroundColor: colors.error,
        borderColor: colors.error,
    },

    // Actions Container
    actionsContainer: {
        gap: 12,
        marginBottom: 24,
    },
    actionCard: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    actionCardPressed: {
        transform: [{ scale: 0.98 }],
    },
    primaryAction: {
        marginBottom: 4,
    },
    secondaryAction: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    actionGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 16,
    },
    actionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 16,
    },
    actionIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionIconSecondary: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionInfo: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: 'white',
        marginBottom: 2,
    },
    actionSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
    },
    actionTitleSecondary: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    actionSubtitleSecondary: {
        fontSize: 14,
        color: colors.textSecondary,
    },

    // Help Section
    helpSection: {
        marginTop: 8,
    },
    helpTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    helpCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    helpItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    helpIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    helpText: {
        flex: 1,
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    helpDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 16,
        marginLeft: 40, // icon width + gap
    },

    // Permission Screen
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    permissionIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    permissionTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    permissionSubtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    permissionButton: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    permissionButtonPressed: {
        transform: [{ scale: 0.98 }],
    },
    permissionButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 32,
        gap: 8,
    },
    permissionButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
});