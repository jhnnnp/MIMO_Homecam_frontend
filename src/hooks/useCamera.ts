import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera } from '../types/api';
import cameraService, { CameraCreateRequest, CameraUpdateRequest } from '../services/cameraService';

// Query Keys
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

// 카메라 목록 조회
export const useCameras = () => {
    return useQuery({
        queryKey: cameraKeys.lists(),
        queryFn: async () => {
            console.log('🔍 [useCameras] 카메라 목록 조회 시작');
            try {
                const response = await cameraService.getCameras();
                console.log('📱 [useCameras] 응답:', response);

                if (!response.ok) {
                    console.log('❌ [useCameras] 응답 실패:', response.error);
                    throw new Error(response.error?.message || '카메라 목록을 불러올 수 없습니다');
                }

                console.log('✅ [useCameras] 성공, 데이터:', response.data);
                return response.data;
            } catch (error) {
                console.log('🔄 [useCameras] 오류 발생, Mock 데이터 사용:', error);
                // Mock 데이터 직접 반환
                return [
                    {
                        id: 1,
                        userId: 1,
                        name: "거실 카메라",
                        location: "거실",
                        isOnline: true,
                        lastHeartbeat: new Date().toISOString(),
                        metadata: { resolution: "1080p", fps: 30 },
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    },
                    {
                        id: 2,
                        userId: 1,
                        name: "현관 카메라",
                        location: "현관",
                        isOnline: true,
                        lastHeartbeat: new Date().toISOString(),
                        metadata: { resolution: "720p", fps: 25 },
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    }
                ];
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
            queryClient.invalidateQueries({ queryKey: cameraKeys.detail(data.id) });
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