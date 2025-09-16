// ============================================================================
// IMPROVED USE NOTIFICATION HOOK - 개선된 알림 훅
// ============================================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
    NotificationState,
    NotificationActions,
    NotificationPayload,
    NotificationPermissions
} from '@/shared/types/hooks';
import { Notification } from '@/features/../shared/types/api';
import notificationService, { NotificationCreateRequest } from '../../settings/services/notificationService';
import { logger, logNotification, logNotificationError } from '@/shared/utils/logger';

// ============================================================================
// Query Keys
// ============================================================================

export const notificationKeys = {
    all: ['notifications'] as const,
    lists: () => [...notificationKeys.all, 'list'] as const,
    list: (page?: number, limit?: number) => [...notificationKeys.lists(), { page, limit }] as const,
    details: () => [...notificationKeys.all, 'detail'] as const,
    detail: (id: number) => [...notificationKeys.details(), id] as const,
    unread: () => [...notificationKeys.all, 'unread'] as const,
    stats: () => [...notificationKeys.all, 'stats'] as const,
};

// ============================================================================
// 상수 정의
// ============================================================================

const DEFAULT_PERMISSIONS: NotificationPermissions = {
    push: false,
    local: false,
    sound: false,
    vibration: false,
};

const NOTIFICATION_TEMPLATES = {
    ALERT_MOTION: {
        title: '모션 감지',
        message: '카메라에서 움직임이 감지되었습니다.',
        priority: 'high' as const,
    },
    ALERT_STREAM_ERROR: {
        title: '스트림 오류',
        message: '스트림 연결에 문제가 발생했습니다.',
        priority: 'normal' as const,
    },
    ALERT_CONNECTION_LOST: {
        title: '연결 끊김',
        message: '카메라와의 연결이 끊어졌습니다.',
        priority: 'high' as const,
    },
    ALERT_SYSTEM: {
        title: '시스템 알림',
        message: '시스템에서 중요한 알림이 있습니다.',
        priority: 'normal' as const,
    },
};

// ============================================================================
// 메인 알림 훅
// ============================================================================

export const useNotification = (): HookReturn<NotificationState, NotificationActions> => {

    // ============================================================================
    // 상태 관리
    // ============================================================================

    const [state, setState] = useState<NotificationState>({
        notifications: [],
        unreadCount: 0,
        notificationStats: {
            totalNotifications: 0,
            unreadNotifications: 0,
            todayNotifications: 0,
            byType: {},
            byPriority: {},
        },
        permissions: DEFAULT_PERMISSIONS,
        error: null,
        isLoading: false,
        connectionStatus: 'disconnected',
    });

    // ============================================================================
    // Refs
    // ============================================================================

    const isMountedRef = useRef(true);
    const notificationListenerRef = useRef<Notifications.Subscription | null>(null);
    const responseListenerRef = useRef<Notifications.Subscription | null>(null);
    const isRequestingPermissionsRef = useRef(false);

    // ============================================================================
    // 안전한 상태 업데이트
    // ============================================================================

    const safeSetState = useCallback((updater: (prev: NotificationState) => NotificationState) => {
        if (isMountedRef.current) {
            setState(updater);
        }
    }, []);

    // ============================================================================
    // 에러 처리
    // ============================================================================

    const handleError = useCallback((error: unknown, action: string) => {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
        logNotificationError(action, errorMessage, error instanceof Error ? error : undefined);

        safeSetState(prev => ({
            ...prev,
            error: errorMessage,
            isLoading: false,
        }));
    }, [safeSetState]);

    // ============================================================================
    // 로딩 상태 관리
    // ============================================================================

    const setLoading = useCallback((isLoading: boolean) => {
        safeSetState(prev => ({ ...prev, isLoading }));
    }, [safeSetState]);

    // ============================================================================
    // 권한 관리
    // ============================================================================

    const requestPermissions = useCallback(async (): Promise<void> => {
        if (isRequestingPermissionsRef.current) {
            logNotification('requestPermissions', '권한 요청이 이미 진행 중입니다');
            return;
        }

        isRequestingPermissionsRef.current = true;
        setLoading(true);

        try {
            logNotification('requestPermissions', '알림 권한 요청 시작');

            // Expo Notifications 권한 요청
            const { status: expoStatus } = await Notifications.requestPermissionsAsync();

            // 플랫폼별 추가 권한 요청
            let pushPermission = expoStatus === 'granted';
            let localPermission = expoStatus === 'granted';
            let soundPermission = expoStatus === 'granted';
            let vibrationPermission = expoStatus === 'granted';

            if (Platform.OS === 'ios') {
                // iOS에서는 추가 설정이 필요할 수 있음
                const settings = await Notifications.getPermissionsAsync();
                pushPermission = settings.granted;
                localPermission = settings.granted;
            } else if (Platform.OS === 'android') {
                // Android에서는 추가 권한이 필요할 수 있음
                const settings = await Notifications.getPermissionsAsync();
                pushPermission = settings.granted;
                localPermission = settings.granted;
            }

            const permissions: NotificationPermissions = {
                push: pushPermission,
                local: localPermission,
                sound: soundPermission,
                vibration: vibrationPermission,
            };

            safeSetState(prev => ({
                ...prev,
                permissions,
                error: null,
                isLoading: false,
            }));

            // 알림 채널 설정 (Android)
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: '기본 알림',
                    importance: Notifications.AndroidImportance.HIGH,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });

                await Notifications.setNotificationChannelAsync('motion', {
                    name: '모션 감지',
                    importance: Notifications.AndroidImportance.HIGH,
                    vibrationPattern: [0, 500, 250, 500],
                    lightColor: '#FF0000',
                });

                await Notifications.setNotificationChannelAsync('system', {
                    name: '시스템 알림',
                    importance: Notifications.AndroidImportance.DEFAULT,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });
            }

            logNotification('requestPermissions', '알림 권한 요청 완료', permissions);
        } catch (error) {
            handleError(error, 'requestPermissions');
        } finally {
            isRequestingPermissionsRef.current = false;
        }
    }, [setLoading, safeSetState, handleError]);

    // ============================================================================
    // 알림 전송
    // ============================================================================

    const sendNotification = useCallback(async (
        notification: Omit<NotificationPayload, 'id' | 'timestamp'>
    ): Promise<void> => {
        try {
            logNotification('sendNotification', '알림 전송 시작', notification);

            // 권한 확인
            if (!state.permissions.local) {
                throw new Error('로컬 알림 권한이 없습니다.');
            }

            // 알림 ID 생성
            const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const timestamp = Date.now();

            const fullNotification: NotificationPayload = {
                ...notification,
                id: notificationId,
                timestamp,
            };

            // 로컬 상태에 추가
            safeSetState(prev => ({
                ...prev,
                notifications: [fullNotification, ...prev.notifications],
                unreadCount: prev.unreadCount + 1,
                notificationStats: {
                    ...prev.notificationStats,
                    totalNotifications: prev.notificationStats.totalNotifications + 1,
                    unreadNotifications: prev.notificationStats.unreadNotifications + 1,
                    todayNotifications: prev.notificationStats.todayNotifications + 1,
                    byType: {
                        ...prev.notificationStats.byType,
                        [notification.type]: (prev.notificationStats.byType[notification.type] || 0) + 1,
                    },
                    byPriority: {
                        ...prev.notificationStats.byPriority,
                        [notification.priority]: (prev.notificationStats.byPriority[notification.priority] || 0) + 1,
                    },
                },
            }));

            // Expo Notifications로 로컬 알림 전송
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: notification.title,
                    body: notification.message,
                    data: notification.data || {},
                    sound: state.permissions.sound,
                    priority: notification.priority === 'urgent' ? 'high' : 'default',
                },
                trigger: null, // 즉시 전송
            });

            // 서버에 알림 전송 (푸시 알림)
            if (state.permissions.push) {
                await notificationService.createNotification({
                    type: notification.type,
                    title: notification.title,
                    message: notification.message,
                    priority: notification.priority,
                    data: notification.data,
                });
            }

            logNotification('sendNotification', '알림 전송 완료', { notificationId });
        } catch (error) {
            handleError(error, 'sendNotification');
            throw error;
        }
    }, [state.permissions, safeSetState, handleError]);

    // ============================================================================
    // 알림 읽음 처리
    // ============================================================================

    const markAsRead = useCallback(async (id: string): Promise<void> => {
        try {
            logNotification('markAsRead', '알림 읽음 처리', { notificationId: id });

            // 로컬 상태 업데이트
            safeSetState(prev => ({
                ...prev,
                notifications: prev.notifications.map(notification =>
                    notification.id === id ? { ...notification, isRead: true } : notification
                ),
                unreadCount: Math.max(0, prev.unreadCount - 1),
                notificationStats: {
                    ...prev.notificationStats,
                    unreadNotifications: Math.max(0, prev.notificationStats.unreadNotifications - 1),
                },
            }));

            // 서버에 읽음 처리 요청
            await notificationService.markAsRead(parseInt(id));

            logNotification('markAsRead', '알림 읽음 처리 완료');
        } catch (error) {
            handleError(error, 'markAsRead');
            throw error;
        }
    }, [safeSetState, handleError]);

    const markAllAsRead = useCallback(async (): Promise<void> => {
        try {
            logNotification('markAllAsRead', '모든 알림 읽음 처리');

            // 로컬 상태 업데이트
            safeSetState(prev => ({
                ...prev,
                notifications: prev.notifications.map(notification => ({
                    ...notification,
                    isRead: true,
                })),
                unreadCount: 0,
                notificationStats: {
                    ...prev.notificationStats,
                    unreadNotifications: 0,
                },
            }));

            // 서버에 모든 알림 읽음 처리 요청
            await notificationService.markAllAsRead();

            logNotification('markAllAsRead', '모든 알림 읽음 처리 완료');
        } catch (error) {
            handleError(error, 'markAllAsRead');
            throw error;
        }
    }, [safeSetState, handleError]);

    // ============================================================================
    // 알림 삭제
    // ============================================================================

    const deleteNotification = useCallback(async (id: string): Promise<void> => {
        try {
            logNotification('deleteNotification', '알림 삭제', { notificationId: id });

            // 로컬 상태에서 제거
            safeSetState(prev => {
                const notification = prev.notifications.find(n => n.id === id);
                const wasUnread = notification && !notification.isRead;

                return {
                    ...prev,
                    notifications: prev.notifications.filter(n => n.id !== id),
                    unreadCount: wasUnread ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount,
                    notificationStats: {
                        ...prev.notificationStats,
                        totalNotifications: Math.max(0, prev.notificationStats.totalNotifications - 1),
                        unreadNotifications: wasUnread
                            ? Math.max(0, prev.notificationStats.unreadNotifications - 1)
                            : prev.notificationStats.unreadNotifications,
                    },
                };
            });

            // 서버에 삭제 요청
            await notificationService.deleteNotification(parseInt(id));

            logNotification('deleteNotification', '알림 삭제 완료');
        } catch (error) {
            handleError(error, 'deleteNotification');
            throw error;
        }
    }, [safeSetState, handleError]);

    // ============================================================================
    // 알림 정리
    // ============================================================================

    const clearNotifications = useCallback(async (maxAge?: number): Promise<number> => {
        try {
            const cutoffTime = maxAge ? Date.now() - maxAge : 0;
            const initialCount = state.notifications.length;

            const notificationsToKeep = cutoffTime > 0
                ? state.notifications.filter(notification => notification.timestamp >= cutoffTime)
                : [];

            const deletedCount = initialCount - notificationsToKeep.length;

            safeSetState(prev => ({
                ...prev,
                notifications: notificationsToKeep,
                unreadCount: notificationsToKeep.filter(n => !n.isRead).length,
                notificationStats: {
                    ...prev.notificationStats,
                    totalNotifications: notificationsToKeep.length,
                    unreadNotifications: notificationsToKeep.filter(n => !n.isRead).length,
                },
            }));

            logNotification('clearNotifications', '알림 정리 완료', { deletedCount });
            return deletedCount;
        } catch (error) {
            handleError(error, 'clearNotifications');
            return 0;
        }
    }, [state.notifications, safeSetState, handleError]);

    // ============================================================================
    // 알림 조회
    // ============================================================================

    const getNotifications = useCallback((filters?: any): NotificationPayload[] => {
        let filteredNotifications = state.notifications;

        if (filters?.type) {
            filteredNotifications = filteredNotifications.filter(n => n.type === filters.type);
        }

        if (filters?.priority) {
            filteredNotifications = filteredNotifications.filter(n => n.priority === filters.priority);
        }

        if (filters?.isRead !== undefined) {
            filteredNotifications = filteredNotifications.filter(n => n.isRead === filters.isRead);
        }

        if (filters?.limit) {
            filteredNotifications = filteredNotifications.slice(0, filters.limit);
        }

        return filteredNotifications.sort((a, b) => b.timestamp - a.timestamp);
    }, [state.notifications]);

    // ============================================================================
    // 알림 리스너 설정
    // ============================================================================

    useEffect(() => {
        // 알림 수신 리스너
        notificationListenerRef.current = Notifications.addNotificationReceivedListener(notification => {
            logNotification('listener', '알림 수신됨', {
                title: notification.request.content.title,
                body: notification.request.content.body
            });
        });

        // 알림 응답 리스너
        responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(response => {
            const notificationId = response.notification.request.identifier;
            logNotification('listener', '알림 응답 수신됨', { notificationId });

            // 알림을 읽음 처리
            markAsRead(notificationId);
        });

        return () => {
            if (notificationListenerRef.current) {
                Notifications.removeNotificationSubscription(notificationListenerRef.current);
            }
            if (responseListenerRef.current) {
                Notifications.removeNotificationSubscription(responseListenerRef.current);
            }
        };
    }, [markAsRead]);

    // ============================================================================
    // 컴포넌트 마운트 시 초기화
    // ============================================================================

    useEffect(() => {
        // 권한 요청
        requestPermissions();
    }, [requestPermissions]);

    // ============================================================================
    // 컴포넌트 언마운트 시 정리
    // ============================================================================

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            logNotification('cleanup', '알림 훅 정리 완료');
        };
    }, []);

    // ============================================================================
    // 액션 객체 생성
    // ============================================================================

    const actions: NotificationActions = useMemo(() => ({
        requestPermissions,
        sendNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearNotifications,
        getNotifications,
    }), [
        requestPermissions,
        sendNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearNotifications,
        getNotifications,
    ]);

    return [state, actions];
};

// ============================================================================
// React Query 기반 알림 훅들 (기존 유지)
// ============================================================================

// 알림 목록 조회
export const useNotifications = (page?: number, limit?: number) => {
    return useQuery({
        queryKey: notificationKeys.list(page, limit),
        queryFn: async () => {
            const response = await notificationService.getNotifications(page, limit);
            if (!response.ok) {
                throw new Error(response.error?.message || '알림 목록을 불러올 수 없습니다');
            }
            return response.data;
        },
        staleTime: 1 * 60 * 1000, // 1분
        refetchInterval: 30 * 1000, // 30초마다 자동 새로고침
    });
};

// 읽지 않은 알림 수 조회
export const useUnreadNotifications = () => {
    return useQuery({
        queryKey: notificationKeys.unread(),
        queryFn: async () => {
            const response = await notificationService.getUnreadCount();
            if (!response.ok) {
                throw new Error(response.error?.message || '읽지 않은 알림 수를 불러올 수 없습니다');
            }
            return response.data;
        },
        staleTime: 30 * 1000, // 30초
        refetchInterval: 15 * 1000, // 15초마다 자동 새로고침
    });
};

// 알림 상세 조회
export const useNotificationDetail = (id: number) => {
    return useQuery({
        queryKey: notificationKeys.detail(id),
        queryFn: async () => {
            const response = await notificationService.getNotificationById(id);
            if (!response.ok) {
                throw new Error(response.error?.message || '알림 정보를 불러올 수 없습니다');
            }
            return response.data;
        },
        enabled: !!id,
        staleTime: 5 * 60 * 1000, // 5분
    });
};

// 알림 통계 조회
export const useNotificationStats = () => {
    return useQuery({
        queryKey: notificationKeys.stats(),
        queryFn: async () => {
            const response = await notificationService.getNotificationStats();
            if (!response.ok) {
                throw new Error(response.error?.message || '알림 통계를 불러올 수 없습니다');
            }
            return response.data;
        },
        staleTime: 2 * 60 * 1000, // 2분
        refetchInterval: 60 * 1000, // 1분마다 자동 새로고침
    });
};

// ============================================================================
// 알림 변경 훅들
// ============================================================================

// 알림 생성 mutation
export const useCreateNotification = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (notification: NotificationCreateRequest) => {
            const response = await notificationService.createNotification(notification);
            if (!response.ok) {
                throw new Error(response.error?.message || '알림 생성에 실패했습니다');
            }
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
            queryClient.invalidateQueries({ queryKey: notificationKeys.unread() });
            queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
        },
    });
};

// 알림 읽음 처리 mutation
export const useMarkNotificationAsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const response = await notificationService.markAsRead(id);
            if (!response.ok) {
                throw new Error(response.error?.message || '알림 읽음 처리에 실패했습니다');
            }
            return response.data;
        },
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
            queryClient.invalidateQueries({ queryKey: notificationKeys.unread() });
            queryClient.invalidateQueries({ queryKey: notificationKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
        },
    });
};

// 모든 알림 읽음 처리 mutation
export const useMarkAllNotificationsAsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await notificationService.markAllAsRead();
            if (!response.ok) {
                throw new Error(response.error?.message || '모든 알림 읽음 처리에 실패했습니다');
            }
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
            queryClient.invalidateQueries({ queryKey: notificationKeys.unread() });
            queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
        },
    });
};

// 알림 삭제 mutation
export const useDeleteNotification = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const response = await notificationService.deleteNotification(id);
            if (!response.ok) {
                throw new Error(response.error?.message || '알림 삭제에 실패했습니다');
            }
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
            queryClient.invalidateQueries({ queryKey: notificationKeys.unread() });
            queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
        },
    });
}; 