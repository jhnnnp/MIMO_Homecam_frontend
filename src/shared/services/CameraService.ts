import {
    Camera,
    CamerasResponse,
    ShareCameraRequest,
    DevicePermission,
    CameraPermissionInfo
} from '@/shared/types/api';
import { api } from './api/api';
import { createLogger } from '@/shared/utils/logger';

const logger = createLogger('CameraService');

/**
 * 카메라 관련 API 서비스
 * 새로운 소유/공유 구조를 지원합니다.
 */
export class CameraService {
    /**
     * 사용자가 접근 가능한 모든 카메라 목록 조회 (소유 + 공유받은)
     */
    static async getAccessibleCameras(): Promise<CamerasResponse> {
        try {
            logger.info('접근 가능한 카메라 목록 조회 시작');
            const response = await api.get<CamerasResponse>('/cameras');

            if (response.data) {
                logger.info(`카메라 목록 조회 성공: 총 ${response.data.total}개 (소유: ${response.data.owned}, 공유: ${response.data.shared})`);
                return response.data;
            }

            throw new Error('카메라 목록 데이터가 없습니다.');
        } catch (error) {
            logger.error('카메라 목록 조회 실패:', error as Error);
            throw error;
        }
    }

    /**
     * 사용자가 소유한 카메라만 조회
     */
    static async getOwnedCameras(): Promise<{ cameras: Camera[] }> {
        try {
            logger.info('소유 카메라 목록 조회 시작');
            const response = await api.get<{ cameras: Camera[] }>('/cameras/owned');

            if (response.data) {
                logger.info(`소유 카메라 조회 성공: ${response.data.cameras.length}개`);
                return response.data;
            }

            throw new Error('소유 카메라 데이터가 없습니다.');
        } catch (error) {
            logger.error('소유 카메라 조회 실패:', error as Error);
            throw error;
        }
    }

    /**
     * 특정 카메라 상세 정보 조회
     */
    static async getCameraById(cameraId: number): Promise<Camera> {
        try {
            logger.info(`카메라 상세 정보 조회 시작: ${cameraId}`);
            const response = await api.get<{ camera: Camera }>(`/cameras/${cameraId}`);

            if (response.data?.camera) {
                logger.info('카메라 상세 정보 조회 성공');
                return response.data.camera;
            }

            throw new Error('카메라 데이터가 없습니다.');
        } catch (error) {
            logger.error('카메라 상세 정보 조회 실패:', error as Error);
            throw error;
        }
    }

    /**
     * 카메라 공유하기
     */
    static async shareCamera(cameraId: number, shareRequest: ShareCameraRequest): Promise<DevicePermission> {
        try {
            logger.info(`카메라 공유 시작: ${cameraId} -> ${shareRequest.targetUserEmail}`);
            const response = await api.post<{ permission: DevicePermission }>(`/cameras/${cameraId}/share`, shareRequest);

            if (response.data?.permission) {
                logger.info('카메라 공유 성공');
                return response.data.permission;
            }

            throw new Error('카메라 공유 응답 데이터가 없습니다.');
        } catch (error) {
            logger.error('카메라 공유 실패:', error as Error);
            throw error;
        }
    }

    /**
     * 카메라 공유 해제
     */
    static async revokeCameraShare(cameraId: number, userId: number): Promise<boolean> {
        try {
            logger.info(`카메라 공유 해제 시작: ${cameraId} from user ${userId}`);
            const response = await api.delete(`/cameras/${cameraId}/share/${userId}`);

            logger.info('카메라 공유 해제 성공');
            return true;
        } catch (error) {
            logger.error('카메라 공유 해제 실패:', error as Error);
            throw error;
        }
    }

    /**
     * 카메라가 공유된 사용자 목록 조회
     */
    static async getCameraSharedUsers(cameraId: number): Promise<DevicePermission[]> {
        try {
            logger.info(`카메라 공유 사용자 목록 조회 시작: ${cameraId}`);
            const response = await api.get<{ sharedUsers: DevicePermission[], total: number }>(`/cameras/${cameraId}/shared-users`);

            if (response.data?.sharedUsers) {
                logger.info(`카메라 공유 사용자 조회 성공: ${response.data.total}명`);
                return response.data.sharedUsers;
            }

            return [];
        } catch (error) {
            logger.error('카메라 공유 사용자 조회 실패:', error as Error);
            throw error;
        }
    }

    /**
     * 사용자의 특정 카메라에 대한 권한 확인
     */
    static async getUserCameraPermission(cameraId: number): Promise<CameraPermissionInfo> {
        try {
            logger.info(`카메라 권한 확인 시작: ${cameraId}`);
            const response = await api.get<{ permission: CameraPermissionInfo }>(`/cameras/${cameraId}/permission`);

            if (response.data?.permission) {
                logger.info(`카메라 권한 확인 성공: ${response.data.permission.permission_level} (${response.data.permission.access_type})`);
                return response.data.permission;
            }

            throw new Error('카메라 권한 데이터가 없습니다.');
        } catch (error) {
            logger.error('카메라 권한 확인 실패:', error as Error);
            throw error;
        }
    }

    /**
     * 카메라 업데이트 (이름, 위치 등)
     */
    static async updateCamera(cameraId: number, updateData: Partial<Camera>): Promise<Camera> {
        try {
            logger.info(`카메라 업데이트 시작: ${cameraId}`);
            const response = await api.put<{ camera: Camera }>(`/cameras/${cameraId}`, updateData);

            if (response.data?.camera) {
                logger.info('카메라 업데이트 성공');
                return response.data.camera;
            }

            throw new Error('카메라 업데이트 응답 데이터가 없습니다.');
        } catch (error) {
            logger.error('카메라 업데이트 실패:', error as Error);
            throw error;
        }
    }

    /**
     * 카메라 삭제 (소유자만 가능)
     */
    static async deleteCamera(cameraId: number): Promise<boolean> {
        try {
            logger.info(`카메라 삭제 시작: ${cameraId}`);
            await api.delete(`/cameras/${cameraId}`);

            logger.info('카메라 삭제 성공');
            return true;
        } catch (error) {
            logger.error('카메라 삭제 실패:', error as Error);
            throw error;
        }
    }

    /**
     * 카메라 스트림 URL 가져오기
     */
    static async getCameraStreamUrl(cameraId: number): Promise<string> {
        try {
            logger.info(`카메라 스트림 URL 조회 시작: ${cameraId}`);
            const response = await api.get<{ streamUrl: string }>(`/cameras/${cameraId}/stream`);

            if (response.data?.streamUrl) {
                logger.info('카메라 스트림 URL 조회 성공');
                return response.data.streamUrl;
            }

            throw new Error('스트림 URL 데이터가 없습니다.');
        } catch (error) {
            logger.error('카메라 스트림 URL 조회 실패:', error as Error);
            throw error;
        }
    }

    /**
     * 카메라 상태 확인 (온라인/오프라인)
     */
    static async getCameraStatus(cameraId: number): Promise<{ status: string, last_seen?: string }> {
        try {
            const camera = await this.getCameraById(cameraId);
            return {
                status: camera.status,
                last_seen: camera.last_seen
            };
        } catch (error) {
            logger.error('카메라 상태 확인 실패:', error as Error);
            throw error;
        }
    }
}

export default CameraService;









