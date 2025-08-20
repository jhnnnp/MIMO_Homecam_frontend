import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Notification } from '../types/api';
import notificationService, { NotificationCreateRequest } from '../services/notificationService';

// Query Keys
export const notificationKeys = {
    all: ['notifications'] as const,
    lists: () => [...notificationKeys.all, 'list'] as const,
    list: (page?: number, limit?: number) => [...notificationKeys.lists(), { page, limit }] as const,
    details: () => [...notificationKeys.all, 'detail'] as const,
    detail: (id: number) => [...notificationKeys.details(), id] as const,
    unread: () => [...notificationKeys.all, 'unread'] as const,
    stats: () => [...notificationKeys.all, 'stats'] as const,
};

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
export const useNotification = (id: number) => {
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