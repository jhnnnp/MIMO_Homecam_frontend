import { ApiResponse, Notification } from '../types/api';
import apiService from './api';
import notificationMockData from '../mocks/notificationData.json';

export interface NotificationCreateRequest {
    type: 'motion' | 'system' | 'security' | 'maintenance';
    title: string;
    message: string;
    metadata?: Record<string, any>;
}

export interface NotificationStatsResponse {
    totalNotifications: number;
    unreadCount: number;
    todayNotifications: number;
    notificationsByType: {
        motion: number;
        system: number;
        security: number;
        maintenance: number;
    };
}

class NotificationService {
    // 알림 목록 조회
    async getNotifications(page?: number, limit?: number): Promise<ApiResponse<Notification[]>> {
        const params = new URLSearchParams();
        if (page) params.append('page', page.toString());
        if (limit) params.append('limit', limit.toString());

        const url = params.toString() ? `/notifications?${params.toString()}` : '/notifications';
        return await apiService.get<Notification[]>(url);
    }

    // 새 알림 생성
    async createNotification(notification: NotificationCreateRequest): Promise<ApiResponse<Notification>> {
        return await apiService.post<Notification>('/notifications', notification);
    }

    // 알림 상세 조회
    async getNotificationById(id: number): Promise<ApiResponse<Notification>> {
        return await apiService.get<Notification>(`/notifications/${id}`);
    }

    // 알림 읽음 처리
    async markAsRead(id: number): Promise<ApiResponse<void>> {
        return await apiService.put<void>(`/notifications/${id}/read`);
    }

    // 모든 알림 읽음 처리
    async markAllAsRead(): Promise<ApiResponse<void>> {
        return await apiService.put<void>('/notifications/read-all');
    }

    // 알림 삭제
    async deleteNotification(id: number): Promise<ApiResponse<void>> {
        return await apiService.delete<void>(`/notifications/${id}`);
    }

    // 읽지 않은 알림 수
    async getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
        try {
            const response = await apiService.get<{ count: number }>('/notifications/unread-count');
            return response;
        } catch (error) {
            console.log('📱 [NotificationService] API 호출 실패, Mock 데이터 사용');
            // Mock 데이터 반환
            return {
                ok: true,
                data: { count: notificationMockData.count }
            };
        }
    }

    // 알림 통계 조회
    async getNotificationStats(): Promise<ApiResponse<NotificationStatsResponse>> {
        return await apiService.get<NotificationStatsResponse>('/notifications/stats');
    }
}

export const notificationService = new NotificationService();
export default notificationService; 