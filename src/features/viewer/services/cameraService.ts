/**
 * CameraService - 홈캠 관련 API 서비스
 * 
 * 책임:
 * - 홈캠 CRUD 작업
 * - API 응답 타입 검증
 * - 에러 처리 및 재시도 로직
 */

import { api } from '@/shared/services/api/api';
import { logger } from '@/shared/utils/logger';

// Types
export interface Camera {
    id: number;
    name: string;
    device_id: string;
    location: string;
    status: 'online' | 'offline' | 'error';
    last_seen: string;
    created_at: string;
}

export interface CameraListResponse {
    cameras: Camera[];
}

export interface CameraDeleteResponse {
    deletedCamera: Camera;
    message: string;
}

// Constants
const API_ENDPOINTS = {
    GET_CAMERAS: '/cameras',
    DELETE_CAMERA: (id: number) => `/cameras/${id}`,
} as const;

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

/**
 * API 응답 검증 함수
 */
const validateCameraResponse = (data: any): Camera[] => {
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid API response structure');
    }

    let cameras: Camera[] = [];

    // 다양한 응답 구조 처리
    if (data.cameras && Array.isArray(data.cameras)) {
        cameras = data.cameras;
    } else if (data.ok && data.data && data.data.cameras && Array.isArray(data.data.cameras)) {
        cameras = data.data.cameras;
    } else {
        throw new Error('No cameras found in response');
    }

    // 각 카메라 객체 검증
    return cameras.map(validateCameraObject);
};

const validateCameraObject = (camera: any): Camera => {
    const requiredFields = ['id', 'name', 'device_id', 'location', 'status'];

    for (const field of requiredFields) {
        if (!camera || typeof camera[field] === 'undefined') {
            throw new Error(`Invalid camera object: missing ${field}`);
        }
    }

    return {
        id: Number(camera.id),
        name: String(camera.name),
        device_id: String(camera.device_id),
        location: String(camera.location),
        status: camera.status as Camera['status'],
        last_seen: String(camera.last_seen || ''),
        created_at: String(camera.created_at || ''),
    };
};

/**
 * 재시도 로직을 포함한 API 호출
 */
const apiCallWithRetry = async <T>(
    apiCall: () => Promise<T>,
    operation: string,
    retries = MAX_RETRIES
): Promise<T> => {
    try {
        return await apiCall();
    } catch (error) {
        logger.error(`[CameraService] ${operation} failed (${MAX_RETRIES - retries + 1}/${MAX_RETRIES}):`, error);

        if (retries > 1) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return apiCallWithRetry(apiCall, operation, retries - 1);
        }

        throw error;
    }
};

/**
 * 홈캠 목록 조회
 */
export const getCameras = async (): Promise<Camera[]> => {
    const operation = 'GET_CAMERAS';

    try {
        logger.info(`[CameraService] ${operation} started`);

        const response = await apiCallWithRetry(
            () => api.get(API_ENDPOINTS.GET_CAMERAS),
            operation
        );

        const cameras = validateCameraResponse(response.data);

        // 개발 환경에서만 1개로 제한
        const limitedCameras = __DEV__ ? cameras.slice(0, 1) : cameras;

        logger.info(`[CameraService] ${operation} completed: ${limitedCameras.length} cameras loaded`);
        return limitedCameras;

    } catch (error) {
        logger.error(`[CameraService] ${operation} failed:`, error);

        // 개발 환경에서는 Mock 데이터 반환
        if (__DEV__) {
            logger.warn('[CameraService] Returning mock data for development');
            return [{
                id: 999,
                name: '개발용 홈캠',
                device_id: 'DEV_CAMERA_001',
                location: '개발 환경',
                status: 'online',
                last_seen: new Date().toISOString(),
                created_at: new Date().toISOString(),
            }];
        }

        throw new Error('홈캠 목록을 불러올 수 없습니다. 네트워크 연결을 확인해주세요.');
    }
};

/**
 * 홈캠 삭제
 */
export const deleteCamera = async (cameraId: number): Promise<CameraDeleteResponse> => {
    const operation = 'DELETE_CAMERA';

    try {
        logger.info(`[CameraService] ${operation} started for camera ${cameraId}`);

        const response = await apiCallWithRetry(
            () => api.delete(API_ENDPOINTS.DELETE_CAMERA(cameraId)),
            operation
        );

        const deleteResponse = response.data as CameraDeleteResponse;

        if (!deleteResponse.deletedCamera) {
            throw new Error('Invalid delete response structure');
        }

        logger.info(`[CameraService] ${operation} completed for camera ${cameraId}`);
        return deleteResponse;

    } catch (error) {
        logger.error(`[CameraService] ${operation} failed for camera ${cameraId}:`, error);

        // 개발 환경에서는 Mock 삭제
        if (__DEV__) {
            logger.warn('[CameraService] Using mock deletion for development');
            await new Promise(resolve => setTimeout(resolve, 1000));
            return {
                deletedCamera: {
                    id: cameraId,
                    name: '삭제된 홈캠',
                    device_id: 'DELETED',
                    location: '삭제됨',
                    status: 'offline',
                    last_seen: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                },
                message: '홈캠이 삭제되었습니다.',
            };
        }

        throw new Error('홈캠을 삭제할 수 없습니다. 다시 시도해주세요.');
    }
};

/**
 * 홈캠 연결
 */
export const connectToCamera = async (cameraId: number): Promise<void> => {
    const operation = 'CONNECT_CAMERA';

    try {
        logger.info(`[CameraService] ${operation} started for camera ${cameraId}`);

        // 실제 연결 로직은 나중에 구현
        await new Promise(resolve => setTimeout(resolve, 500));

        logger.info(`[CameraService] ${operation} completed for camera ${cameraId}`);

    } catch (error) {
        logger.error(`[CameraService] ${operation} failed for camera ${cameraId}:`, error);
        throw new Error('홈캠에 연결할 수 없습니다. 다시 시도해주세요.');
    }
};
