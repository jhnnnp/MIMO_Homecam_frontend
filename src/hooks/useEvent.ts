import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Event, Recording } from '../types/api';
import eventService, { EventFilters, EventCreateRequest, EventUpdateRequest } from '../services/eventService';

// Query Keys
export const eventKeys = {
    all: ['events'] as const,
    lists: () => [...eventKeys.all, 'list'] as const,
    list: (filters?: EventFilters) => [...eventKeys.lists(), { filters }] as const,
    details: () => [...eventKeys.all, 'detail'] as const,
    detail: (id: number) => [...eventKeys.details(), id] as const,
    recent: () => [...eventKeys.all, 'recent'] as const,
    recordings: (eventId: number) => [...eventKeys.detail(eventId), 'recordings'] as const,
    stats: () => [...eventKeys.all, 'stats'] as const,
};

// 이벤트 목록 조회
export const useEvents = (filters?: EventFilters) => {
    return useQuery({
        queryKey: eventKeys.list(filters),
        queryFn: async () => {
            console.log('🔍 [useEvents] 이벤트 목록 조회 시작');
            try {
                const response = await eventService.getEvents(filters);
                console.log('📱 [useEvents] 응답:', response);

                if (!response.ok) {
                    console.log('❌ [useEvents] 응답 실패:', response.error);
                    throw new Error(response.error?.message || '이벤트 목록을 불러올 수 없습니다');
                }

                console.log('✅ [useEvents] 성공, 데이터:', response.data);
                return response.data;
            } catch (error) {
                console.log('🔄 [useEvents] 오류 발생, Mock 데이터 사용:', error);
                // Mock 데이터 직접 반환
                return [
                    {
                        id: 1,
                        cameraId: 1,
                        cameraName: "거실 카메라",
                        type: "motion",
                        startedAt: new Date().toISOString(),
                        endedAt: new Date(Date.now() + 15000).toISOString(),
                        isPinned: false,
                        score: 0.85,
                        metadata: { confidence: 0.85, objectType: "person" },
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    },
                    {
                        id: 2,
                        cameraId: 2,
                        cameraName: "현관 카메라",
                        type: "motion",
                        startedAt: new Date(Date.now() - 300000).toISOString(),
                        endedAt: new Date(Date.now() - 285000).toISOString(),
                        isPinned: true,
                        score: 0.92,
                        metadata: { confidence: 0.92, objectType: "person" },
                        createdAt: new Date(Date.now() - 300000).toISOString(),
                        updatedAt: new Date(Date.now() - 285000).toISOString(),
                    }
                ];
            }
        },
        staleTime: 2 * 60 * 1000, // 2분
        refetchInterval: 30 * 1000, // 30초마다 자동 새로고침
    });
};

// 최근 이벤트 조회
export const useRecentEvents = (limit: number = 10) => {
    return useQuery({
        queryKey: eventKeys.recent(),
        queryFn: async () => {
            const response = await eventService.getEvents({ limit });
            if (!response.ok) {
                throw new Error(response.error?.message || '최근 이벤트를 불러올 수 없습니다');
            }
            return response.data;
        },
        staleTime: 1 * 60 * 1000, // 1분
        refetchInterval: 15 * 1000, // 15초마다 자동 새로고침
    });
};

// 이벤트 상세 조회
export const useEvent = (id: number) => {
    return useQuery({
        queryKey: eventKeys.detail(id),
        queryFn: async () => {
            const response = await eventService.getEventById(id);
            if (!response.ok) {
                throw new Error(response.error?.message || '이벤트 정보를 불러올 수 없습니다');
            }
            return response.data;
        },
        enabled: !!id,
        staleTime: 1 * 60 * 1000, // 1분
    });
};

// 이벤트 통계 조회
export const useEventStats = () => {
    return useQuery({
        queryKey: eventKeys.stats(),
        queryFn: async () => {
            const response = await eventService.getEventStats();
            if (!response.ok) {
                throw new Error(response.error?.message || '이벤트 통계를 불러올 수 없습니다');
            }
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5분
        refetchInterval: 60 * 1000, // 1분마다 자동 새로고침
    });
};

// 이벤트별 녹화 파일 목록
export const useEventRecordings = (eventId: number) => {
    return useQuery({
        queryKey: eventKeys.recordings(eventId),
        queryFn: async () => {
            const response = await eventService.getEventRecordings(eventId);
            if (!response.ok) {
                throw new Error(response.error?.message || '녹화 파일 목록을 불러올 수 없습니다');
            }
            return response.data;
        },
        enabled: !!eventId,
        staleTime: 2 * 60 * 1000, // 2분
    });
};

// 이벤트 생성 mutation
export const useCreateEvent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (event: EventCreateRequest) => {
            const response = await eventService.createEvent(event);
            if (!response.ok) {
                throw new Error(response.error?.message || '이벤트 생성에 실패했습니다');
            }
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
            queryClient.invalidateQueries({ queryKey: eventKeys.recent() });
            queryClient.invalidateQueries({ queryKey: eventKeys.stats() });
        },
    });
};

// 이벤트 업데이트 mutation
export const useUpdateEvent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: number; updates: EventUpdateRequest }) => {
            const response = await eventService.updateEvent(id, updates);
            if (!response.ok) {
                throw new Error(response.error?.message || '이벤트 업데이트에 실패했습니다');
            }
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
            queryClient.invalidateQueries({ queryKey: eventKeys.recent() });
            queryClient.invalidateQueries({ queryKey: eventKeys.detail(data.id) });
            queryClient.invalidateQueries({ queryKey: eventKeys.stats() });
        },
    });
};

// 이벤트 삭제 mutation
export const useDeleteEvent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const response = await eventService.deleteEvent(id);
            if (!response.ok) {
                throw new Error(response.error?.message || '이벤트 삭제에 실패했습니다');
            }
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
            queryClient.invalidateQueries({ queryKey: eventKeys.recent() });
            queryClient.invalidateQueries({ queryKey: eventKeys.stats() });
        },
    });
};

// 이벤트 고정/고정 해제 mutation
export const useToggleEventPin = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const response = await eventService.toggleEventPin(id);
            if (!response.ok) {
                throw new Error(response.error?.message || '이벤트 고정 상태 변경에 실패했습니다');
            }
            return response.data;
        },
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
            queryClient.invalidateQueries({ queryKey: eventKeys.recent() });
            queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: eventKeys.stats() });
        },
    });
}; 