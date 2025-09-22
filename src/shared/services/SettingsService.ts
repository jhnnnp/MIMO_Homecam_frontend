import {
    AllUserSettings,
    CoreSettings,
    CustomSettings,
    CoreSettingsUpdateRequest,
    CustomSettingUpdateRequest,
    SettingsResetRequest
} from '@/shared/types/api';
import { api } from './api/api';
import { createLogger } from '@/shared/utils/logger';

const logger = createLogger('SettingsService');

/**
 * 설정 관련 API 서비스
 * 새로운 분리된 설정 구조 (핵심 + 커스텀)를 지원합니다.
 */
export class SettingsService {
    /**
     * 사용자의 모든 설정 조회 (핵심 + 커스텀 통합)
     */
    static async getAllSettings(): Promise<AllUserSettings> {
        try {
            logger.info('모든 사용자 설정 조회 시작');
            const response = await api.get<{ settings: AllUserSettings }>('/settings');

            if (response.data?.settings) {
                logger.info('모든 설정 조회 성공');
                return response.data.settings;
            }

            throw new Error('설정 데이터가 없습니다.');
        } catch (error) {
            logger.error('모든 설정 조회 실패:', error as Error);
            throw error;
        }
    }

    /**
     * 핵심 설정만 조회 (UserSettings 테이블)
     */
    static async getCoreSettings(): Promise<CoreSettings> {
        try {
            logger.info('핵심 설정 조회 시작');
            const response = await api.get<{ coreSettings: CoreSettings }>('/settings/core');

            if (response.data?.coreSettings) {
                logger.info('핵심 설정 조회 성공');
                return response.data.coreSettings;
            }

            throw new Error('핵심 설정 데이터가 없습니다.');
        } catch (error) {
            logger.error('핵심 설정 조회 실패:', error as Error);
            throw error;
        }
    }

    /**
     * 커스텀 설정만 조회 (UserCustomSettings 테이블)
     */
    static async getCustomSettings(): Promise<CustomSettings> {
        try {
            logger.info('커스텀 설정 조회 시작');
            const response = await api.get<{ customSettings: CustomSettings }>('/settings/custom');

            if (response.data?.customSettings) {
                logger.info('커스텀 설정 조회 성공');
                return response.data.customSettings;
            }

            return {}; // 커스텀 설정이 없을 수 있음
        } catch (error) {
            logger.error('커스텀 설정 조회 실패:', error as Error);
            throw error;
        }
    }

    /**
     * 핵심 설정 업데이트
     */
    static async updateCoreSettings(updateData: CoreSettingsUpdateRequest): Promise<CoreSettings> {
        try {
            logger.info('핵심 설정 업데이트 시작');
            const response = await api.put<{ coreSettings: CoreSettings }>('/settings/core', updateData);

            if (response.data?.coreSettings) {
                logger.info('핵심 설정 업데이트 성공');
                return response.data.coreSettings;
            }

            throw new Error('핵심 설정 업데이트 응답 데이터가 없습니다.');
        } catch (error) {
            logger.error('핵심 설정 업데이트 실패:', error as Error);
            throw error;
        }
    }

    /**
     * 특정 커스텀 설정 업데이트
     */
    static async updateCustomSetting(key: string, updateData: CustomSettingUpdateRequest): Promise<any> {
        try {
            logger.info(`커스텀 설정 업데이트 시작: ${key}`);
            const response = await api.put<{ customSetting: any }>(`/settings/custom/${key}`, updateData);

            if (response.data?.customSetting) {
                logger.info('커스텀 설정 업데이트 성공');
                return response.data.customSetting;
            }

            throw new Error('커스텀 설정 업데이트 응답 데이터가 없습니다.');
        } catch (error) {
            logger.error('커스텀 설정 업데이트 실패:', error as Error);
            throw error;
        }
    }

    /**
     * 특정 커스텀 설정 삭제
     */
    static async deleteCustomSetting(key: string): Promise<boolean> {
        try {
            logger.info(`커스텀 설정 삭제 시작: ${key}`);
            await api.delete(`/settings/custom/${key}`);

            logger.info('커스텀 설정 삭제 성공');
            return true;
        } catch (error) {
            logger.error('커스텀 설정 삭제 실패:', error as Error);
            throw error;
        }
    }

    /**
     * 설정 초기화
     */
    static async resetSettings(resetRequest: SettingsResetRequest): Promise<boolean> {
        try {
            logger.info(`설정 초기화 시작: ${resetRequest.resetType}`);
            await api.post('/settings/reset', resetRequest);

            logger.info('설정 초기화 성공');
            return true;
        } catch (error) {
            logger.error('설정 초기화 실패:', error as Error);
            throw error;
        }
    }

    /**
     * 다크모드 토글 (편의 메서드)
     */
    static async toggleDarkMode(): Promise<CoreSettings> {
        try {
            const currentSettings = await this.getCoreSettings();
            const newDarkMode = !currentSettings.dark_mode;

            return await this.updateCoreSettings({ dark_mode: newDarkMode });
        } catch (error) {
            logger.error('다크모드 토글 실패:', error as Error);
            throw error;
        }
    }

    /**
     * 알림 설정 토글 (편의 메서드)
     */
    static async toggleNotifications(): Promise<CoreSettings> {
        try {
            const currentSettings = await this.getCoreSettings();
            const newNotificationEnabled = !currentSettings.notification_enabled;

            return await this.updateCoreSettings({ notification_enabled: newNotificationEnabled });
        } catch (error) {
            logger.error('알림 설정 토글 실패:', error as Error);
            throw error;
        }
    }

    /**
     * 언어 변경 (편의 메서드)
     */
    static async changeLanguage(language: string): Promise<CoreSettings> {
        try {
            return await this.updateCoreSettings({ language });
        } catch (error) {
            logger.error('언어 변경 실패:', error as Error);
            throw error;
        }
    }

    /**
     * 녹화 품질 변경 (편의 메서드)
     */
    static async changeRecordingQuality(quality: '720p' | '1080p' | '4K'): Promise<CoreSettings> {
        try {
            return await this.updateCoreSettings({ recording_quality: quality });
        } catch (error) {
            logger.error('녹화 품질 변경 실패:', error as Error);
            throw error;
        }
    }

    /**
     * 모션 감지 민감도 변경 (편의 메서드)
     */
    static async changeMotionSensitivity(sensitivity: 'low' | 'medium' | 'high'): Promise<CoreSettings> {
        try {
            return await this.updateCoreSettings({ motion_sensitivity: sensitivity });
        } catch (error) {
            logger.error('모션 감지 민감도 변경 실패:', error as Error);
            throw error;
        }
    }

    /**
     * 저장 기간 변경 (편의 메서드)
     */
    static async changeStorageDays(days: number): Promise<CoreSettings> {
        try {
            if (days < 1 || days > 365) {
                throw new Error('저장 기간은 1일부터 365일까지 설정할 수 있습니다.');
            }

            return await this.updateCoreSettings({ storage_days: days });
        } catch (error) {
            logger.error('저장 기간 변경 실패:', error as Error);
            throw error;
        }
    }
}

export default SettingsService;






