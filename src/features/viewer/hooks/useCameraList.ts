/**
 * useCameraList - 홈캠 목록 관리 커스텀 훅
 * 
 * 책임:
 * - 홈캠 목록 상태 관리
 * - 데이터 로딩 및 새로고침
 * - 에러 상태 관리
 * - 삭제 작업 처리
 */

import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { logger } from '@/shared/utils/logger';
import { getCameras, deleteCamera, Camera, connectToCamera } from '../services/cameraService';

interface UseCameraListReturn {
    cameras: Camera[];
    isLoading: boolean;
    isRefreshing: boolean;
    error: string | null;
    loadCameras: () => Promise<void>;
    refreshCameras: () => Promise<void>;
    deleteCameraById: (cameraId: number) => Promise<void>;
    connectToCameraById: (cameraId: number) => Promise<void>;
}

export const useCameraList = (): UseCameraListReturn => {
    const [cameras, setCameras] = useState<Camera[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);

    /**
     * 카메라 목록 로딩
     */
    const loadCameras = useCallback(async () => {
        // 이전 요청 취소
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();

        try {
            setError(null);
            setIsLoading(true);

            logger.info('[useCameraList] Loading cameras...');
            const cameraList = await getCameras();

            setCameras(cameraList);
            logger.info(`[useCameraList] Loaded ${cameraList.length} cameras`);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
            setError(errorMessage);
            logger.error('[useCameraList] Failed to load cameras:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * 카메라 목록 새로고침
     */
    const refreshCameras = useCallback(async () => {
        try {
            setIsRefreshing(true);
            setError(null);

            logger.info('[useCameraList] Refreshing cameras...');
            const cameraList = await getCameras();

            setCameras(cameraList);
            logger.info(`[useCameraList] Refreshed ${cameraList.length} cameras`);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '새로고침 중 오류가 발생했습니다.';
            setError(errorMessage);
            logger.error('[useCameraList] Failed to refresh cameras:', err);
        } finally {
            setIsRefreshing(false);
        }
    }, []);

    /**
     * 카메라 삭제
     */
    const deleteCameraById = useCallback(async (cameraId: number) => {
        try {
            logger.info(`[useCameraList] Deleting camera ${cameraId}...`);

            // 삭제 확인 다이얼로그
            const camera = cameras.find(c => c.id === cameraId);
            const cameraName = camera?.name || '홈캠';

            return new Promise<void>((resolve, reject) => {
                Alert.alert(
                    '홈캠 삭제',
                    `'${cameraName}' 홈캠을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`,
                    [
                        {
                            text: '취소',
                            style: 'cancel',
                            onPress: () => {
                                logger.info('[useCameraList] Delete cancelled by user');
                                resolve();
                            },
                        },
                        {
                            text: '삭제',
                            style: 'destructive',
                            onPress: async () => {
                                try {
                                    await deleteCamera(cameraId);

                                    // 로컬 상태에서 즉시 제거
                                    setCameras(prev => prev.filter(c => c.id !== cameraId));

                                    Alert.alert('삭제 완료', `'${cameraName}' 홈캠이 삭제되었습니다.`);
                                    logger.info(`[useCameraList] Camera ${cameraId} deleted successfully`);

                                    resolve();
                                } catch (err) {
                                    logger.error(`[useCameraList] Failed to delete camera ${cameraId}:`, err);
                                    Alert.alert(
                                        '삭제 실패',
                                        '홈캠을 삭제하는 중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.'
                                    );
                                    reject(err);
                                }
                            },
                        },
                    ]
                );
            });

        } catch (err) {
            logger.error(`[useCameraList] Delete operation failed for camera ${cameraId}:`, err);
            throw err;
        }
    }, [cameras]);

    /**
     * 카메라 연결
     */
    const connectToCameraById = useCallback(async (cameraId: number) => {
        try {
            logger.info(`[useCameraList] Connecting to camera ${cameraId}...`);

            await connectToCamera(cameraId);

            logger.info(`[useCameraList] Connected to camera ${cameraId} successfully`);

        } catch (err) {
            logger.error(`[useCameraList] Failed to connect to camera ${cameraId}:`, err);
            Alert.alert(
                '연결 실패',
                '홈캠에 연결할 수 없습니다.\n네트워크 연결을 확인해주세요.'
            );
            throw err;
        }
    }, []);

    return {
        cameras,
        isLoading,
        isRefreshing,
        error,
        loadCameras,
        refreshCameras,
        deleteCameraById,
        connectToCameraById,
    };
};
