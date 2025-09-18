/**
 * CameraActionSheet - 홈캠 액션 시트
 * 
 * 기능:
 * - 녹화 시작/정지
 * - 스크린샷 캡처
 * - 화질 변경
 * - 공유하기
 */

import React, { useCallback, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Alert,
    Animated,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

// Design System
import { spacing, radius } from '@/design/tokens';

// Types
interface Camera {
    id: number;
    name: string;
    device_id: string;
    location: string;
    status: 'online' | 'offline' | 'error';
    last_seen: string;
    created_at: string;
}

type ActionType = 'record' | 'screenshot' | 'quality' | 'share';

interface CameraActionSheetProps {
    visible: boolean;
    camera: Camera | null;
    actionType: ActionType | null;
    onClose: () => void;
    onAction: (action: ActionType, data?: any) => void;
}

// Constants
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const CameraActionSheet = memo<CameraActionSheetProps>(({
    visible,
    camera,
    actionType,
    onClose,
    onAction
}) => {
    const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    React.useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 100,
                friction: 8,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, slideAnim]);

    const renderRecordActions = useCallback(() => (
        <View style={styles.actionsContainer}>
            <Text style={styles.sheetTitle}>녹화 옵션</Text>

            <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                    onAction('record', { type: 'start' });
                    onClose();
                }}
            >
                <View style={[styles.actionIcon, { backgroundColor: `${colors.error}15` }]}>
                    <Ionicons name="record" size={24} color={colors.error} />
                </View>
                <View style={styles.actionInfo}>
                    <Text style={styles.actionTitle}>녹화 시작</Text>
                    <Text style={styles.actionDescription}>실시간 영상을 녹화합니다</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                    onAction('record', { type: 'schedule' });
                    onClose();
                }}
            >
                <View style={[styles.actionIcon, { backgroundColor: `${colors.warning}15` }]}>
                    <Ionicons name="time" size={24} color={colors.warning} />
                </View>
                <View style={styles.actionInfo}>
                    <Text style={styles.actionTitle}>예약 녹화</Text>
                    <Text style={styles.actionDescription}>특정 시간에 자동 녹화</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                    onAction('record', { type: 'history' });
                    onClose();
                }}
            >
                <View style={[styles.actionIcon, { backgroundColor: `${colors.primary}15` }]}>
                    <Ionicons name="folder" size={24} color={colors.primary} />
                </View>
                <View style={styles.actionInfo}>
                    <Text style={styles.actionTitle}>녹화 파일 보기</Text>
                    <Text style={styles.actionDescription}>저장된 녹화 파일 목록</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
        </View>
    ), [onAction, onClose]);

    const renderScreenshotActions = useCallback(() => (
        <View style={styles.actionsContainer}>
            <Text style={styles.sheetTitle}>스크린샷 옵션</Text>

            <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                    onAction('screenshot', { type: 'instant' });
                    onClose();
                }}
            >
                <View style={[styles.actionIcon, { backgroundColor: `${colors.success}15` }]}>
                    <Ionicons name="camera" size={24} color={colors.success} />
                </View>
                <View style={styles.actionInfo}>
                    <Text style={styles.actionTitle}>즉시 캡처</Text>
                    <Text style={styles.actionDescription}>현재 화면을 즉시 저장</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                    onAction('screenshot', { type: 'timer' });
                    onClose();
                }}
            >
                <View style={[styles.actionIcon, { backgroundColor: `${colors.warning}15` }]}>
                    <Ionicons name="timer" size={24} color={colors.warning} />
                </View>
                <View style={styles.actionInfo}>
                    <Text style={styles.actionTitle}>타이머 캡처</Text>
                    <Text style={styles.actionDescription}>5초 후 자동 캡처</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                    onAction('screenshot', { type: 'gallery' });
                    onClose();
                }}
            >
                <View style={[styles.actionIcon, { backgroundColor: `${colors.primary}15` }]}>
                    <Ionicons name="images" size={24} color={colors.primary} />
                </View>
                <View style={styles.actionInfo}>
                    <Text style={styles.actionTitle}>갤러리 보기</Text>
                    <Text style={styles.actionDescription}>저장된 스크린샷 보기</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
        </View>
    ), [onAction, onClose]);

    const renderQualityActions = useCallback(() => (
        <View style={styles.actionsContainer}>
            <Text style={styles.sheetTitle}>화질 설정</Text>

            {[
                { value: '1080p', label: '1080p (Full HD)', description: '고화질 - 많은 데이터 사용' },
                { value: '720p', label: '720p (HD)', description: '표준화질 - 보통 데이터 사용' },
                { value: '480p', label: '480p (SD)', description: '저화질 - 적은 데이터 사용' },
            ].map((quality) => (
                <TouchableOpacity
                    key={quality.value}
                    style={styles.actionItem}
                    onPress={() => {
                        onAction('quality', { resolution: quality.value });
                        onClose();
                    }}
                >
                    <View style={[styles.actionIcon, { backgroundColor: `${colors.primary}15` }]}>
                        <Ionicons name="videocam" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.actionInfo}>
                        <Text style={styles.actionTitle}>{quality.label}</Text>
                        <Text style={styles.actionDescription}>{quality.description}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
            ))}
        </View>
    ), [onAction, onClose]);

    const renderShareActions = useCallback(() => (
        <View style={styles.actionsContainer}>
            <Text style={styles.sheetTitle}>공유하기</Text>

            <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                    onAction('share', { type: 'link' });
                    onClose();
                }}
            >
                <View style={[styles.actionIcon, { backgroundColor: `${colors.primary}15` }]}>
                    <Ionicons name="link" size={24} color={colors.primary} />
                </View>
                <View style={styles.actionInfo}>
                    <Text style={styles.actionTitle}>링크 공유</Text>
                    <Text style={styles.actionDescription}>실시간 시청 링크 생성</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                    onAction('share', { type: 'qr' });
                    onClose();
                }}
            >
                <View style={[styles.actionIcon, { backgroundColor: `${colors.success}15` }]}>
                    <Ionicons name="qr-code" size={24} color={colors.success} />
                </View>
                <View style={styles.actionInfo}>
                    <Text style={styles.actionTitle}>QR 코드</Text>
                    <Text style={styles.actionDescription}>QR 코드로 간편 공유</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
        </View>
    ), [onAction, onClose]);

    const renderContent = useCallback(() => {
        switch (actionType) {
            case 'record':
                return renderRecordActions();
            case 'screenshot':
                return renderScreenshotActions();
            case 'quality':
                return renderQualityActions();
            case 'share':
                return renderShareActions();
            default:
                return null;
        }
    }, [actionType, renderRecordActions, renderScreenshotActions, renderQualityActions, renderShareActions]);

    if (!camera || !actionType) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />

                <Animated.View
                    style={[
                        styles.sheet,
                        { transform: [{ translateY: slideAnim }] }
                    ]}
                >
                    <SafeAreaView style={styles.safeArea}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.handle} />
                            <View style={styles.cameraInfo}>
                                <Text style={styles.cameraName}>{camera.name}</Text>
                                <Text style={styles.cameraLocation}>📍 {camera.location}</Text>
                            </View>
                        </View>

                        {/* Content */}
                        {renderContent()}

                        {/* Cancel Button */}
                        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.cancelButtonText}>취소</Text>
                        </TouchableOpacity>
                    </SafeAreaView>
                </Animated.View>
            </View>
        </Modal>
    );
});

CameraActionSheet.displayName = 'CameraActionSheet';

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    backdrop: {
        flex: 1,
    },
    sheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: SCREEN_HEIGHT * 0.8,
    },
    safeArea: {
        flex: 1,
    },

    // Header
    header: {
        alignItems: 'center',
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
        marginBottom: spacing.md,
    },
    cameraInfo: {
        alignItems: 'center',
    },
    cameraName: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    cameraLocation: {
        fontSize: 14,
        color: colors.textSecondary,
    },

    // Actions
    actionsContainer: {
        padding: spacing.lg,
    },
    sheetTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.lg,
        textAlign: 'center',
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    actionInfo: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    actionDescription: {
        fontSize: 14,
        color: colors.textSecondary,
    },

    // Cancel Button
    cancelButton: {
        backgroundColor: colors.error,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        paddingVertical: spacing.lg,
        borderRadius: radius.lg,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.surface,
    },
});

export default CameraActionSheet;

