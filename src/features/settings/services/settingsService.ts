import { ApiResponse, Settings } from '@/shared/types/api';
import api from '@/features/../shared/services/api/api';

export interface SettingsUpdateRequest {
    notificationEnabled?: boolean;
    emailNotification?: boolean;
    motionSensitivity?: number;
    recordingQuality?: 'low' | 'medium' | 'high';
    retentionDays?: number;
    timezone?: string;
    language?: string;
    autoBackup?: boolean;
    [key: string]: any;
}

export interface SettingsExportResponse {
    settings: Settings;
    exportedAt: string;
    version: string;
}

class SettingsService {
    // 설정 조회
    async getSettings(): Promise<ApiResponse<Settings>> {
        return await apiService.get<Settings>('/settings');
    }

    // 설정 업데이트
    async updateSettings(settings: SettingsUpdateRequest): Promise<ApiResponse<Settings>> {
        return await apiService.put<Settings>('/settings', settings);
    }

    // 특정 설정 값 조회
    async getSettingByKey(key: string): Promise<ApiResponse<any>> {
        return await apiService.get<any>(`/settings/${key}`);
    }

    // 특정 설정 값 업데이트
    async updateSettingByKey(key: string, value: any): Promise<ApiResponse<any>> {
        return await apiService.put<any>(`/settings/${key}`, { value });
    }

    // 설정 초기화
    async resetSettings(): Promise<ApiResponse<Settings>> {
        return await apiService.post<Settings>('/settings/reset');
    }

    // 설정 내보내기
    async exportSettings(): Promise<ApiResponse<SettingsExportResponse>> {
        return await apiService.post<SettingsExportResponse>('/settings/export');
    }

    // 설정 가져오기
    async importSettings(settingsData: any): Promise<ApiResponse<Settings>> {
        return await apiService.post<Settings>('/settings/import', settingsData);
    }
}

export const settingsService = new SettingsService();
export default settingsService; 