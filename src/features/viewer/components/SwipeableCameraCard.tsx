/**
 * SwipeableCameraCard - 스와이프 가능한 홈캠 카드 컴포넌트
 * 
 * 책임:
 * - 홈캠 카드 UI 렌더링
 * - 스와이프 제스처 처리
 * - 삭제 애니메이션 관리
 */

import React, { useCallback, memo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Animated,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { api } from '@/shared/services/api/api';
import { logger } from '@/shared/utils/logger';
import { spacing, radius } from '@/design/tokens';

// Components
import CameraSettingsModal from './CameraSettingsModal';
import CameraActionSheet from './CameraActionSheet';

// Constants
const colors = {
    primary: '#007AFF',
    success: '#34C759',
    error: '#FF3B30',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = -60;
const DELETE_BUTTON_WIDTH = 80;
const MAX_SWIPE_DISTANCE = -120;

// Types
interface Camera {
    id: number;
    owner_id: number;
    name: string;
    device_id: string;
    location: string;
    status: 'online' | 'offline' | 'error';
    last_seen: string;
    permission_level?: 'viewer' | 'controller' | 'admin';
    access_type?: 'owner' | 'shared';
    granted_at?: string;
    expires_at?: string;
    created_at: string;
}

interface SwipeableCameraCardProps {
    camera: Camera;
    onConnect: (camera: Camera) => void;
    onDelete: (cameraId: number) => Promise<void>;
}

const SwipeableCameraCard = memo<SwipeableCameraCardProps>(({
    camera,
    onConnect,
    onDelete
}) => {
    // State
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [actionSheetVisible, setActionSheetVisible] = useState(false);
    const [actionType, setActionType] = useState<'record' | 'screenshot' | 'quality' | 'share' | null>(null);

    // 애니메이션 값들을 useRef로 관리하여 리렌더링 방지
    const translateX = React.useRef(new Animated.Value(0)).current;
    const opacity = React.useRef(new Animated.Value(1)).current;

    const onGestureEvent = React.useMemo(() =>
        Animated.event(
            [{ nativeEvent: { translationX: translateX } }],
            {
                useNativeDriver: false,
                listener: (event: any) => {
                    const { translationX: currentTranslation } = event.nativeEvent;
                    // 오른쪽으로 스와이프 방지 (양수 방향)
                    if (currentTranslation > 0) {
                        translateX.setValue(0);
                    }
                    // 너무 많이 왼쪽으로 스와이프 방지 (음수 방향 제한)
                    else if (currentTranslation < MAX_SWIPE_DISTANCE) {
                        translateX.setValue(MAX_SWIPE_DISTANCE);
                    }
                }
            }
        ), [translateX]
    );

    const onHandlerStateChange = useCallback((event: any) => {
        if (event.nativeEvent.oldState === State.ACTIVE) {
            const { translationX: currentTranslation, velocityX } = event.nativeEvent;

            // 속도를 고려한 더 스마트한 스와이프 감지
            const shouldShowDeleteButton = currentTranslation < SWIPE_THRESHOLD || velocityX < -500;

            if (shouldShowDeleteButton) {
                // 삭제 버튼 표시 애니메이션
                Animated.spring(translateX, {
                    toValue: -DELETE_BUTTON_WIDTH,
                    useNativeDriver: false,
                    tension: 120,
                    friction: 9,
                }).start();
            } else {
                // 원래 위치로 복귀 애니메이션
                Animated.spring(translateX, {
                    toValue: 0,
                    useNativeDriver: false,
                    tension: 120,
                    friction: 9,
                }).start();
            }
        }
    }, [translateX]);

    const resetPosition = useCallback(() => {
        Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: false,
            tension: 120,
            friction: 9,
        }).start();
    }, [translateX]);

    const handleConnect = useCallback(() => {
        resetPosition();
        onConnect(camera);
    }, [camera, onConnect, resetPosition]);

    const handleOpenSettings = useCallback(() => {
        resetPosition();
        setSettingsVisible(true);
    }, [resetPosition]);

    const handleCloseSettings = useCallback(() => {
        setSettingsVisible(false);
    }, []);

    const handleSaveSettings = useCallback((settings: any) => {
        // TODO: 설정 저장 로직
        logger.info('[CameraCard] Settings saved:', settings);
    }, []);

    const handleOpenActionSheet = useCallback((type: 'record' | 'screenshot' | 'quality' | 'share') => {
        resetPosition();
        setActionType(type);
        setActionSheetVisible(true);
    }, [resetPosition]);

    const handleCloseActionSheet = useCallback(() => {
        setActionSheetVisible(false);
        setActionType(null);
    }, []);

    const handleAction = useCallback((action: string, data?: any) => {
        logger.info('[CameraCard] Action performed:', { action, data, camera: camera.id });

        // TODO: 실제 액션 구현
        switch (action) {
            case 'record':
                Alert.alert('녹화', `녹화 기능: ${data?.type}`);
                break;
            case 'screenshot':
                Alert.alert('스크린샷', `스크린샷 기능: ${data?.type}`);
                break;
            case 'quality':
                Alert.alert('화질 변경', `화질 변경: ${data?.resolution}`);
                break;
            case 'share':
                Alert.alert('공유', `공유 기능: ${data?.type}`);
                break;
        }
    }, [camera.id]);

    const handleDelete = useCallback(async () => {
        // 삭제 확인 다이얼로그 먼저 표시
        Alert.alert(
            '홈캠 삭제',
            `'${camera.name}' 홈캠을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`,
            [
                {
                    text: '취소',
                    style: 'cancel',
                    onPress: () => {
                        // 취소 시 스와이프 상태 복구
                        Animated.spring(translateX, {
                            toValue: 0,
                            useNativeDriver: false,
                            tension: 120,
                            friction: 9,
                        }).start();
                        logger.info('[SwipeableCameraCard] Delete cancelled by user');
                    },
                },
                {
                    text: '삭제',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // 삭제 확인 후 애니메이션 실행
                            Animated.parallel([
                                Animated.timing(opacity, {
                                    toValue: 0,
                                    duration: 350,
                                    useNativeDriver: false,
                                }),
                                Animated.spring(translateX, {
                                    toValue: -SCREEN_WIDTH,
                                    useNativeDriver: false,
                                    tension: 80,
                                    friction: 8,
                                })
                            ]).start();

                            // API 호출 및 삭제 처리
                            await onDelete(camera.id);

                            logger.info('[SwipeableCameraCard] Camera deleted successfully:', { cameraId: camera.id });
                        } catch (error) {
                            console.error('[SwipeableCameraCard] Failed to delete camera:', error);

                            // 애니메이션 복구 - 에러 시 원래 상태로 부드럽게 복구
                            Animated.parallel([
                                Animated.timing(opacity, {
                                    toValue: 1,
                                    duration: 250,
                                    useNativeDriver: false,
                                }),
                                Animated.spring(translateX, {
                                    toValue: 0,
                                    useNativeDriver: false,
                                    tension: 120,
                                    friction: 9,
                                })
                            ]).start();

                            Alert.alert(
                                '삭제 실패',
                                '홈캠을 삭제하는 중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.'
                            );
                        }
                    },
                },
            ]
        );
    }, [camera.id, camera.name, onDelete, opacity, translateX]);

    return (
        <Animated.View style={[styles.swipeContainer, { opacity }]}>
            {/* 삭제 버튼 */}
            <View style={styles.deleteButtonContainer}>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDelete}
                    activeOpacity={0.9}
                >
                    <LinearGradient
                        colors={['#FF6B6B', '#FF5252']}
                        style={styles.deleteButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Ionicons name="trash-bin" size={20} color="white" />
                        <Text style={styles.deleteButtonText}>삭제</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* 메인 카메라 카드 */}
            <PanGestureHandler
                onGestureEvent={onGestureEvent}
                onHandlerStateChange={onHandlerStateChange}
                activeOffsetX={-10}
                failOffsetX={10}
                maxPointers={1}
                minPointers={1}
            >
                <Animated.View style={[styles.cameraCard, { transform: [{ translateX }] }]}>
                    <View style={styles.cameraCardContent}>
                        {/* 라이브 미리보기 영역 */}
                        <TouchableOpacity
                            style={styles.previewContainer}
                            onPress={handleConnect}
                            activeOpacity={0.9}
                        >
                            {camera.status === 'online' ? (
                                <View style={styles.livePreview}>
                                    {/* Mock 비디오 미리보기 */}
                                    <LinearGradient
                                        colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']}
                                        style={styles.mockVideoFeed}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <Ionicons name="videocam" size={32} color="rgba(255,255,255,0.8)" />
                                        <Text style={styles.mockVideoText}>실시간 스트림</Text>
                                    </LinearGradient>

                                    {/* 라이브 오버레이 */}
                                    <View style={styles.previewOverlay}>
                                        <View style={styles.liveIndicator}>
                                            <View style={styles.liveBlinkDot} />
                                            <Text style={styles.liveText}>LIVE</Text>
                                        </View>

                                        <TouchableOpacity
                                            style={styles.fullscreenButton}
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                handleConnect(camera);
                                            }}
                                        >
                                            <Ionicons name="expand" size={20} color="white" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.offlinePreview}>
                                    <Ionicons name="videocam-off" size={32} color={colors.textSecondary} />
                                    <Text style={styles.offlineText}>오프라인</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* 카메라 정보 및 컨트롤 */}
                        <View style={styles.cameraInfoSection}>
                            <View style={styles.cameraHeader}>
                                <View style={styles.cameraNameRow}>
                                    <Text style={styles.cameraName} numberOfLines={1}>
                                        {camera.name}
                                    </Text>
                                    <View style={styles.badgeContainer}>
                                        {/* 권한 배지 */}
                                        {camera.access_type && (
                                            <View style={[styles.permissionBadge, {
                                                backgroundColor: camera.access_type === 'owner' ?
                                                    `${colors.primary}15` : `${colors.success}15`
                                            }]}>
                                                <Ionicons
                                                    name={camera.access_type === 'owner' ? 'crown' : 'people'}
                                                    size={12}
                                                    color={camera.access_type === 'owner' ? colors.primary : colors.success}
                                                />
                                                <Text style={[styles.permissionText, {
                                                    color: camera.access_type === 'owner' ? colors.primary : colors.success
                                                }]}>
                                                    {camera.access_type === 'owner' ? '소유' : '공유'}
                                                </Text>
                                            </View>
                                        )}

                                        {/* 상태 배지 */}
                                        <View style={[styles.statusBadge, {
                                            backgroundColor: camera.status === 'online' ?
                                                `${colors.success}15` : `${colors.error}15`
                                        }]}>
                                            <View style={[styles.statusDot, {
                                                backgroundColor: camera.status === 'online' ? colors.success : colors.error
                                            }]} />
                                            <Text style={[styles.statusText, {
                                                color: camera.status === 'online' ? colors.success : colors.error
                                            }]}>
                                                {camera.status === 'online' ? '온라인' : '오프라인'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.cameraMetaRow}>
                                    <Text style={styles.cameraLocation} numberOfLines={1}>
                                        📍 {camera.location}
                                    </Text>
                                    {camera.permission_level && camera.access_type === 'shared' && (
                                        <Text style={styles.permissionLevel} numberOfLines={1}>
                                            권한: {camera.permission_level === 'viewer' ? '조회만' :
                                                camera.permission_level === 'controller' ? '제어가능' : '관리자'}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {/* 액션 버튼들 */}
                            <View style={styles.actionButtons}>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={handleConnect}
                                >
                                    <Ionicons name="play-circle" size={24} color={colors.primary} />
                                    <Text style={styles.actionButtonText}>시청</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        handleOpenActionSheet('record');
                                    }}
                                >
                                    <Ionicons name="recording" size={24} color={colors.error} />
                                    <Text style={styles.actionButtonText}>녹화</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        handleOpenSettings();
                                    }}
                                >
                                    <Ionicons name="settings" size={24} color={colors.textSecondary} />
                                    <Text style={styles.actionButtonText}>설정</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        handleOpenActionSheet('screenshot');
                                    }}
                                >
                                    <Ionicons name="camera" size={24} color={colors.warning} />
                                    <Text style={styles.actionButtonText}>캡처</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Animated.View>
            </PanGestureHandler>

            {/* 설정 모달 */}
            <CameraSettingsModal
                visible={settingsVisible}
                camera={camera}
                onClose={handleCloseSettings}
                onSave={handleSaveSettings}
            />

            {/* 액션 시트 */}
            <CameraActionSheet
                visible={actionSheetVisible}
                camera={camera}
                actionType={actionType}
                onClose={handleCloseActionSheet}
                onAction={handleAction}
            />
        </Animated.View>
    );
});

SwipeableCameraCard.displayName = 'SwipeableCameraCard';

const styles = StyleSheet.create({
    // Swipe Container
    swipeContainer: {
        marginHorizontal: spacing.lg,
        marginVertical: spacing.sm,
    },
    deleteButtonContainer: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: DELETE_BUTTON_WIDTH,
        justifyContent: 'center',
        alignItems: 'center',
        borderTopRightRadius: 16,
        borderBottomRightRadius: 16,
    },
    deleteButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        marginVertical: spacing.xs,
        marginHorizontal: spacing.xs,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    deleteButtonGradient: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    deleteButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '700',
        marginTop: 3,
        textAlign: 'center',
        letterSpacing: 0.3,
    },

    // Camera Card
    cameraCard: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        marginBottom: spacing.lg,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
    },
    cameraCardContent: {
        flex: 1,
    },

    // Live Preview Section
    previewContainer: {
        width: '100%',
        aspectRatio: 16 / 9,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
        position: 'relative',
    },
    livePreview: {
        flex: 1,
        position: 'relative',
    },
    mockVideoFeed: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    mockVideoText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        fontWeight: '500',
    },
    previewOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: spacing.md,
    },
    fullscreenButton: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    offlinePreview: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        gap: spacing.sm,
    },
    offlineText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '500',
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF3B30',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        elevation: 3,
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    liveBlinkDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'white',
        marginRight: 4,
    },
    liveText: {
        fontSize: 10,
        fontWeight: '700',
        color: 'white',
        letterSpacing: 0.5,
    },

    // Camera Info Section
    cameraInfoSection: {
        padding: spacing.lg,
    },
    cameraHeader: {
        marginBottom: spacing.lg,
    },
    cameraNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    cameraName: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        flex: 1,
        marginRight: spacing.sm,
    },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    permissionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 10,
        gap: 3,
    },
    permissionText: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        minWidth: 70,
        justifyContent: 'center',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 4,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    cameraMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cameraLocation: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
        flex: 1,
    },
    permissionLevel: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
        fontStyle: 'italic',
    },

    // Action Buttons
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    actionButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xs,
        minWidth: 60,
        gap: 4,
    },
    actionButtonText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
        textAlign: 'center',
    },
});

export default SwipeableCameraCard;
