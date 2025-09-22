// ============================================================================
// IMPROVED USE CAMERA HOOK - 개선된 카메라 훅
// ============================================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Camera, CameraType as ExpoCameraType, FlashMode } from 'expo-camera';
import { Audio } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import { Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
    CameraState,
    CameraActions,
    CameraPhoto,
    CameraVideo,
    RecordingSession,
    RecordingSettings
} from '@/shared/types/hooks';
import { Camera as CameraApiType, CameraCreateRequest, CameraUpdateRequest } from '@/features/../shared/types/api';
import cameraService from '@/features/camera/services/cameraService';
import recordingService from '../../recording/services/recordingService';
import { logger, logCamera, logCameraError } from '@/shared/utils/logger';

// ============================================================================
// Query Keys
// ============================================================================

export const cameraKeys = {
    all: ['cameras'] as const,
    lists: () => [...cameraKeys.all, 'list'] as const,
    list: (filters?: any) => [...cameraKeys.lists(), { filters }] as const,
    details: () => [...cameraKeys.all, 'detail'] as const,
    detail: (id: number) => [...cameraKeys.details(), id] as const,
    stats: (id: number) => [...cameraKeys.detail(id), 'stats'] as const,
    liveStream: (id: number) => [...cameraKeys.detail(id), 'live-stream'] as const,
    settings: (id: number) => [...cameraKeys.detail(id), 'settings'] as const,
};

// ============================================================================
// 기본 설정 상수
// ============================================================================

const DEFAULT_RECORDING_SETTINGS: RecordingSettings = {
    quality: 'high',
    maxDuration: 300, // 5분
    autoSave: true,
    includeAudio: true,
    resolution: { width: 1920, height: 1080 },
    fps: 30,
};

const DEFAULT_CAMERA_TYPE: CameraType = 'back';
const DEFAULT_FLASH_MODE: FlashMode = 'off';

// ============================================================================
// 메인 카메라 훅
// ============================================================================

export const useCamera = (): HookReturn<CameraState, CameraActions> => {
    // ============================================================================
    // 상태 관리
    // ============================================================================

    const [state, setState] = useState<CameraState>({
        hasPermission: false,
        cameraType: DEFAULT_CAMERA_TYPE,
        flashMode: DEFAULT_FLASH_MODE,
        isRecording: false,
        isStreaming: false,
        recordingTime: 0,
        streamingTime: 0,
        error: null,
        recordingSettings: DEFAULT_RECORDING_SETTINGS,
        isLoading: false,
        connectionStatus: 'disconnected',
    });

    // ============================================================================
    // Refs
    // ============================================================================

    const cameraRef = useRef<Camera>(null);
    const isMountedRef = useRef(true);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const streamingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const currentRecordingSessionRef = useRef<string | null>(null);
    const permissionRequestedRef = useRef(false);

    // ============================================================================
    // 안전한 상태 업데이트
    // ============================================================================

    const safeSetState = useCallback((updater: (prev: CameraState) => CameraState) => {
        if (isMountedRef.current) {
            setState(updater);
        }
    }, []);

    // ============================================================================
    // 에러 처리
    // ============================================================================

    const handleError = useCallback((error: unknown, action: string) => {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
        logCameraError('unknown', action, errorMessage, error instanceof Error ? error : undefined);

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
    // 권한 요청 로직
    // ============================================================================

    const requestPermissions = useCallback(async (): Promise<void> => {
        if (permissionRequestedRef.current) {
            logCamera('unknown', 'requestPermissions', '권한 요청이 이미 진행 중입니다');
            return;
        }

        permissionRequestedRef.current = true;
        setLoading(true);

        try {
            logCamera('unknown', 'requestPermissions', '권한 요청 시작');

            // 카메라 권한
            const cameraPermission = await Camera.requestCameraPermissionsAsync();
            logCamera('unknown', 'requestPermissions', '카메라 권한 상태', { status: cameraPermission.status });

            // 오디오 권한
            const audioPermission = await Audio.requestPermissionsAsync();
            logCamera('unknown', 'requestPermissions', '오디오 권한 상태', { status: audioPermission.status });

            // 미디어 라이브러리 권한
            const mediaPermission = await MediaLibrary.requestPermissionsAsync();
            logCamera('unknown', 'requestPermissions', '미디어 라이브러리 권한 상태', { status: mediaPermission.status });

            const allGranted =
                cameraPermission.status === "granted" &&
                audioPermission.status === "granted" &&
                mediaPermission.status === "granted";

            if (allGranted) {
                safeSetState(prev => ({
                    ...prev,
                    hasPermission: true,
                    error: null,
                    isLoading: false,
                }));
                logCamera('unknown', 'requestPermissions', '모든 권한이 허용되었습니다');
            } else {
                const deniedPermissions = [];
                if (cameraPermission.status !== "granted") deniedPermissions.push("카메라");
                if (audioPermission.status !== "granted") deniedPermissions.push("마이크");
                if (mediaPermission.status !== "granted") deniedPermissions.push("저장소");

                const errorMessage = `${deniedPermissions.join(", ")} 권한이 필요합니다. 설정에서 권한을 허용해주세요.`;

                safeSetState(prev => ({
                    ...prev,
                    hasPermission: false,
                    error: errorMessage,
                    isLoading: false,
                }));

                logCameraError('unknown', 'requestPermissions', errorMessage);
            }
        } catch (error) {
            handleError(error, 'requestPermissions');
        } finally {
            permissionRequestedRef.current = false;
        }
    }, [setLoading, safeSetState, handleError]);

    // ============================================================================
    // 카메라 제어 함수들
    // ============================================================================

    const switchCamera = useCallback(() => {
        safeSetState(prev => ({
            ...prev,
            cameraType: prev.cameraType === 'back' ? 'front' : 'back',
        }));
        logCamera('unknown', 'switchCamera', '카메라 전환');
    }, [safeSetState]);

    const toggleFlash = useCallback(() => {
        safeSetState(prev => ({
            ...prev,
            flashMode: prev.flashMode === 'off' ? 'on' : 'off',
        }));
        logCamera('unknown', 'toggleFlash', '플래시 토글');
    }, [safeSetState]);

    // ============================================================================
    // 스냅샷 촬영
    // ============================================================================

    const takeSnapshot = useCallback(async (): Promise<CameraPhoto | null> => {
        if (!cameraRef.current) {
            logCameraError('unknown', 'takeSnapshot', '카메라 참조가 없습니다');
            return null;
        }

        try {
            setLoading(true);
            logCamera('unknown', 'takeSnapshot', '스냅샷 촬영 시작');

            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.8,
                base64: false,
                exif: false,
            });

            const cameraPhoto: CameraPhoto = {
                uri: photo.uri,
                width: photo.width,
                height: photo.height,
                timestamp: Date.now(),
            };

            // 갤러리에 저장
            if (state.recordingSettings.autoSave) {
                await MediaLibrary.saveToLibraryAsync(photo.uri);
                logCamera('unknown', 'takeSnapshot', '스냅샷이 갤러리에 저장되었습니다');
            }

            safeSetState(prev => ({
                ...prev,
                photo: cameraPhoto,
                error: null,
                isLoading: false,
            }));

            logCamera('unknown', 'takeSnapshot', '스냅샷 촬영 완료', { uri: photo.uri });
            return cameraPhoto;
        } catch (error) {
            handleError(error, 'takeSnapshot');
            return null;
        }
    }, [state.recordingSettings.autoSave, setLoading, safeSetState, handleError]);

    // ============================================================================
    // 녹화 제어
    // ============================================================================

    const startRecording = useCallback(async (cameraId?: string): Promise<void> => {
        if (!cameraRef.current || state.isRecording) {
            logCamera('unknown', 'startRecording', '녹화를 시작할 수 없습니다', {
                hasCameraRef: !!cameraRef.current,
                isRecording: state.isRecording
            });
            return;
        }

        try {
            setLoading(true);
            logCamera('unknown', 'startRecording', '녹화 시작');

            const recordingCameraId = cameraId || `CAM_${Date.now()}`;

            // 녹화 서비스 설정 업데이트
            recordingService.updateSettings(state.recordingSettings);

            // 녹화 시작
            const session = await recordingService.startRecording(cameraRef, recordingCameraId);

            currentRecordingSessionRef.current = session.id;

            safeSetState(prev => ({
                ...prev,
                activeRecording: session,
                isRecording: true,
                recordingTime: 0,
                error: null,
                isLoading: false,
            }));

            logCamera('unknown', 'startRecording', '녹화 시작됨', { sessionId: session.id });
        } catch (error) {
            handleError(error, 'startRecording');
        }
    }, [state.isRecording, state.recordingSettings, setLoading, safeSetState, handleError]);

    const stopRecording = useCallback(async (): Promise<void> => {
        if (!state.isRecording || !currentRecordingSessionRef.current) {
            logCamera('unknown', 'stopRecording', '녹화를 중지할 수 없습니다', {
                isRecording: state.isRecording,
                hasSession: !!currentRecordingSessionRef.current
            });
            return;
        }

        try {
            logCamera('unknown', 'stopRecording', '녹화 중지');

            // 녹화 서비스에서 중지
            const completedSession = await recordingService.stopRecording(currentRecordingSessionRef.current);

            safeSetState(prev => ({
                ...prev,
                isRecording: false,
                recordingTime: 0,
                activeRecording: undefined,
                error: null,
            }));

            currentRecordingSessionRef.current = null;

            if (completedSession) {
                logCamera('unknown', 'stopRecording', '녹화 완료', { fileName: completedSession.fileName });
                Alert.alert('녹화 완료', `${completedSession.fileName}이 저장되었습니다.`);
            }
        } catch (error) {
            handleError(error, 'stopRecording');
        }
    }, [state.isRecording, safeSetState, handleError]);

    // ============================================================================
    // 스트리밍 제어
    // ============================================================================

    const startStreaming = useCallback(async (): Promise<void> => {
        if (state.isStreaming) {
            logCamera('unknown', 'startStreaming', '이미 스트리밍 중입니다');
            return;
        }

        try {
            setLoading(true);
            logCamera('unknown', 'startStreaming', '스트리밍 시작');

            // 실제 스트리밍 로직은 WebSocket으로 구현
            // 여기서는 시뮬레이션

            safeSetState(prev => ({
                ...prev,
                isStreaming: true,
                streamingTime: 0,
                error: null,
                isLoading: false,
            }));

            logCamera('unknown', 'startStreaming', '스트리밍 시작됨');
        } catch (error) {
            handleError(error, 'startStreaming');
        }
    }, [state.isStreaming, setLoading, safeSetState, handleError]);

    const stopStreaming = useCallback(async (): Promise<void> => {
        if (!state.isStreaming) {
            logCamera('unknown', 'stopStreaming', '스트리밍이 실행 중이 아닙니다');
            return;
        }

        try {
            logCamera('unknown', 'stopStreaming', '스트리밍 중지');

            safeSetState(prev => ({
                ...prev,
                isStreaming: false,
                streamingTime: 0,
                error: null,
            }));

            logCamera('unknown', 'stopStreaming', '스트리밍 중지됨');
        } catch (error) {
            handleError(error, 'stopStreaming');
        }
    }, [state.isStreaming, safeSetState, handleError]);

    // ============================================================================
    // 설정 업데이트
    // ============================================================================

    const updateRecordingSettings = useCallback((settings: Partial<RecordingSettings>) => {
        safeSetState(prev => ({
            ...prev,
            recordingSettings: { ...prev.recordingSettings, ...settings },
        }));

        recordingService.updateSettings(settings);
        logCamera('unknown', 'updateRecordingSettings', '녹화 설정 업데이트', settings);
    }, [safeSetState]);

    // ============================================================================
    // 타이머 관리
    // ============================================================================

    useEffect(() => {
        // 녹화 타이머
        if (state.isRecording) {
            recordingIntervalRef.current = setInterval(() => {
                safeSetState(prev => ({ ...prev, recordingTime: prev.recordingTime + 1 }));
            }, 1000);
        } else {
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
                recordingIntervalRef.current = null;
            }
        }

        // 스트리밍 타이머
        if (state.isStreaming) {
            streamingIntervalRef.current = setInterval(() => {
                safeSetState(prev => ({ ...prev, streamingTime: prev.streamingTime + 1 }));
            }, 1000);
        } else {
            if (streamingIntervalRef.current) {
                clearInterval(streamingIntervalRef.current);
                streamingIntervalRef.current = null;
            }
        }

        // 클린업
        return () => {
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }
            if (streamingIntervalRef.current) {
                clearInterval(streamingIntervalRef.current);
            }
        };
    }, [state.isRecording, state.isStreaming, safeSetState]);

    // ============================================================================
    // 컴포넌트 마운트/언마운트 처리
    // ============================================================================

    useEffect(() => {
        // 컴포넌트 마운트 시 권한 요청
        requestPermissions();

        return () => {
            isMountedRef.current = false;

            // 활성 타이머 정리
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }
            if (streamingIntervalRef.current) {
                clearInterval(streamingIntervalRef.current);
            }

            // 활성 녹화 중지
            if (state.isRecording && currentRecordingSessionRef.current) {
                recordingService.stopRecording(currentRecordingSessionRef.current);
            }

            logCamera('unknown', 'cleanup', '카메라 훅 정리 완료');
        };
    }, [requestPermissions, state.isRecording]);

    // ============================================================================
    // 액션 객체 생성
    // ============================================================================

    const actions: CameraActions = useMemo(() => ({
        requestPermissions,
        startRecording,
        stopRecording,
        startStreaming,
        stopStreaming,
        switchCamera,
        toggleFlash,
        takeSnapshot,
        updateRecordingSettings,
        cameraRef,
    }), [
        requestPermissions,
        startRecording,
        stopRecording,
        startStreaming,
        stopStreaming,
        switchCamera,
        toggleFlash,
        takeSnapshot,
        updateRecordingSettings,
    ]);

    return [state, actions];
};

// ============================================================================
// 카메라 데이터 조회 훅들 (기존 React Query 훅들 유지)
// ============================================================================

// 카메라 목록 조회
export const useCameras = () => {
    return useQuery({
        queryKey: cameraKeys.lists(),
        queryFn: async () => {
            logger.hook('useCameras', 'fetch', '카메라 목록 조회 시작');
            try {
                const response = await cameraService.getCameras();
                logger.hook('useCameras', 'fetch', '응답 수신', { success: response.ok });

                if (!response.ok) {
                    logger.hookError('useCameras', 'fetch', '응답 실패', undefined, { error: response.error });
                    throw new Error(response.error?.message || '카메라 목록을 불러올 수 없습니다');
                }

                logger.hook('useCameras', 'fetch', '성공', { dataCount: response.data?.length });
                return response.data;
            } catch (error) {
                logger.hookError('useCameras', 'fetch', 'API 호출 실패', error instanceof Error ? error : undefined);
                throw error; // Mock 데이터 대신 에러를 그대로 던짐
            }
        },
        staleTime: 5 * 60 * 1000, // 5분
        refetchInterval: 30 * 1000, // 30초마다 자동 새로고침
    });
};

// 카메라 상세 정보 조회
export const useCamera = (id: number) => {
    return useQuery({
        queryKey: cameraKeys.detail(id),
        queryFn: async () => {
            const response = await cameraService.getCameraById(id);
            if (!response.ok) {
                throw new Error(response.error?.message || '카메라 정보를 불러올 수 없습니다');
            }
            return response.data;
        },
        enabled: !!id,
        staleTime: 2 * 60 * 1000, // 2분
    });
};

// 카메라 통계 조회
export const useCameraStats = (id: number) => {
    return useQuery({
        queryKey: cameraKeys.stats(id),
        queryFn: async () => {
            const response = await cameraService.getCameraStats(id);
            if (!response.ok) {
                throw new Error(response.error?.message || '카메라 통계를 불러올 수 없습니다');
            }
            return response.data;
        },
        enabled: !!id,
        staleTime: 1 * 60 * 1000, // 1분
        refetchInterval: 10 * 1000, // 10초마다 자동 새로고침
    });
};

// 라이브 스트림 정보 조회
export const useLiveStreamInfo = (id: number) => {
    return useQuery({
        queryKey: cameraKeys.liveStream(id),
        queryFn: async () => {
            const response = await cameraService.getLiveStreamInfo(id);
            if (!response.ok) {
                throw new Error(response.error?.message || '스트림 정보를 불러올 수 없습니다');
            }
            return response.data;
        },
        enabled: !!id,
        staleTime: 5 * 60 * 1000, // 5분
    });
};

// 카메라 설정 조회
export const useCameraSettings = (id: number) => {
    return useQuery({
        queryKey: cameraKeys.settings(id),
        queryFn: async () => {
            const response = await cameraService.getCameraSettings(id);
            if (!response.ok) {
                throw new Error(response.error?.message || '카메라 설정을 불러올 수 없습니다');
            }
            return response.data;
        },
        enabled: !!id,
        staleTime: 10 * 60 * 1000, // 10분
    });
};

// ============================================================================
// 카메라 데이터 변경 훅들
// ============================================================================

// 카메라 생성 mutation
export const useCreateCamera = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (camera: CameraCreateRequest) => {
            const response = await cameraService.createCamera(camera);
            if (!response.ok) {
                throw new Error(response.error?.message || '카메라 등록에 실패했습니다');
            }
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: cameraKeys.lists() });
        },
    });
};

// 카메라 업데이트 mutation
export const useUpdateCamera = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: number; updates: CameraUpdateRequest }) => {
            const response = await cameraService.updateCamera(id, updates);
            if (!response.ok) {
                throw new Error(response.error?.message || '카메라 업데이트에 실패했습니다');
            }
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: cameraKeys.lists() });
            if (data?.id) {
                queryClient.invalidateQueries({ queryKey: cameraKeys.detail(data.id) });
            }
        },
    });
};

// 카메라 삭제 mutation
export const useDeleteCamera = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const response = await cameraService.deleteCamera(id);
            if (!response.ok) {
                throw new Error(response.error?.message || '카메라 삭제에 실패했습니다');
            }
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: cameraKeys.lists() });
        },
    });
};

// 하트비트 전송 mutation
export const useSendHeartbeat = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const response = await cameraService.sendHeartbeat(id);
            if (!response.ok) {
                throw new Error(response.error?.message || '하트비트 전송에 실패했습니다');
            }
            return response.data;
        },
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: cameraKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: cameraKeys.stats(id) });
        },
    });
};

// 카메라 설정 업데이트 mutation
export const useUpdateCameraSettings = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, settings }: { id: number; settings: any }) => {
            const response = await cameraService.updateCameraSettings(id, settings);
            if (!response.ok) {
                throw new Error(response.error?.message || '카메라 설정 업데이트에 실패했습니다');
            }
            return response.data;
        },
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: cameraKeys.settings(id) });
        },
    });
}; 