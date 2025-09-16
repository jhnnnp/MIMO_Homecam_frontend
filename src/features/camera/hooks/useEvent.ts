// ============================================================================
// IMPROVED USE EVENT HOOK - 개선된 이벤트 훅
// ============================================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
    EventState,
    EventActions,
    EventPayload,
    EventFilters,
    EventStats
} from '@/shared/types/hooks';
import { Event, Recording } from '@/features/../shared/types/api';
import eventService, { EventCreateRequest, EventUpdateRequest } from '@/features/camera/services/eventService';
import notificationService from '../../settings/services/notificationService';
import { logger, logEvent, logEventError } from '@/shared/utils/logger';

// ============================================================================
// Query Keys
// ============================================================================

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

// ============================================================================
// 상수 정의
// ============================================================================

const DEFAULT_EVENT_LIMIT = 100;
const EVENT_CLEANUP_AGE = 7 * 24 * 60 * 60 * 1000; // 7일
const RECENT_EVENTS_LIMIT = 10;

// ============================================================================
// 메인 이벤트 훅
// ============================================================================

export const useEvent = (): HookReturn<EventState, EventActions> => {

    // ============================================================================
    // 상태 관리
    // ============================================================================

    const [state, setState] = useState<EventState>({
        events: [],
        recentEvents: [],
        eventStats: {
            totalEvents: 0,
            todayEvents: 0,
            motionEvents: 0,
            personEvents: 0,
            averageConfidence: 0,
        },
        filters: {},
        error: null,
        isLoading: false,
        connectionStatus: 'disconnected',
    });

    // ============================================================================
    // Refs
    // ============================================================================

    const isMountedRef = useRef(true);
    const eventsRef = useRef<EventPayload[]>([]);
    const filtersRef = useRef<EventFilters>({});

    // ============================================================================
    // 안전한 상태 업데이트
    // ============================================================================

    const safeSetState = useCallback((updater: (prev: EventState) => EventState) => {
        if (isMountedRef.current) {
            setState(updater);
        }
    }, []);

    // ============================================================================
    // 에러 처리
    // ============================================================================

    const handleError = useCallback((error: unknown, action: string) => {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
        logEventError('unknown', action, errorMessage, error instanceof Error ? error : undefined);

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
    // 이벤트 필터링 및 정렬
    // ============================================================================

    const filterEvents = useCallback((events: EventPayload[], filters: EventFilters): EventPayload[] => {
        return events.filter(event => {
            // 타입 필터
            if (filters.type && filters.type.length > 0) {
                if (!filters.type.includes(event.type)) return false;
            }

            // 카메라 ID 필터
            if (filters.cameraId && filters.cameraId.length > 0) {
                if (!filters.cameraId.includes(event.cameraId)) return false;
            }

            // 날짜 범위 필터
            if (filters.dateRange) {
                const eventDate = new Date(event.timestamp);
                if (eventDate < filters.dateRange.start || eventDate > filters.dateRange.end) {
                    return false;
                }
            }

            // 신뢰도 필터
            if (filters.confidence) {
                if (event.confidence < filters.confidence.min || event.confidence > filters.confidence.max) {
                    return false;
                }
            }

            // 고정 상태 필터
            if (filters.isPinned !== undefined) {
                if (event.isPinned !== filters.isPinned) return false;
            }

            return true;
        });
    }, []);

    const sortEvents = useCallback((events: EventPayload[]): EventPayload[] => {
        return [...events].sort((a, b) => {
            // 고정된 이벤트를 먼저 표시
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;

            // 시간순 정렬 (최신순)
            return b.timestamp - a.timestamp;
        });
    }, []);

    // ============================================================================
    // 이벤트 조회 함수들
    // ============================================================================

    const getEvents = useCallback((filters?: EventFilters): EventPayload[] => {
        const appliedFilters = filters || filtersRef.current;
        const filteredEvents = filterEvents(eventsRef.current, appliedFilters);
        return sortEvents(filteredEvents);
    }, [filterEvents, sortEvents]);

    const getRecentEvents = useCallback((limit: number = RECENT_EVENTS_LIMIT): EventPayload[] => {
        const recentEvents = eventsRef.current
            .filter(event => {
                const eventAge = Date.now() - event.timestamp;
                return eventAge <= 24 * 60 * 60 * 1000; // 24시간 이내
            })
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);

        return recentEvents;
    }, []);

    const getMotionEvents = useCallback((limit: number = DEFAULT_EVENT_LIMIT): EventPayload[] => {
        const motionEvents = eventsRef.current
            .filter(event => event.type === 'motion')
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);

        return motionEvents;
    }, []);

    // ============================================================================
    // 이벤트 생성
    // ============================================================================

    const createEvent = useCallback(async (event: Omit<EventPayload, 'id' | 'timestamp'>): Promise<void> => {
        try {
            setLoading(true);
            logEvent('unknown', 'createEvent', '이벤트 생성 시작', event);

            const newEvent: EventPayload = {
                ...event,
                id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: Date.now(),
            };

            // 로컬 상태 업데이트
            eventsRef.current = [newEvent, ...eventsRef.current];

            safeSetState(prev => ({
                ...prev,
                events: eventsRef.current,
                recentEvents: getRecentEvents(),
                error: null,
                isLoading: false,
            }));

            // 서버에 이벤트 전송
            await eventService.createEvent({
                cameraId: event.cameraId,
                type: event.type,
                confidence: event.confidence,
                metadata: event.metadata,
                location: event.location,
            });

            // 알림 전송 (모션 감지 시)
            if (event.type === 'motion' && event.confidence > 0.7) {
                await notificationService.sendNotification({
                    type: 'motion',
                    title: '모션 감지',
                    message: `${event.cameraName}에서 움직임이 감지되었습니다.`,
                    priority: 'high',
                    data: { eventId: newEvent.id, cameraId: event.cameraId },
                });
            }

            logEvent(newEvent.id, 'createEvent', '이벤트 생성 완료');
        } catch (error) {
            handleError(error, 'createEvent');
            throw error;
        }
    }, [setLoading, safeSetState, getRecentEvents, handleError]);

    // ============================================================================
    // 이벤트 업데이트
    // ============================================================================

    const updateEvent = useCallback(async (id: string, updates: Partial<EventPayload>): Promise<void> => {
        try {
            logEvent(id, 'updateEvent', '이벤트 업데이트 시작', updates);

            const eventIndex = eventsRef.current.findIndex(event => event.id === id);
            if (eventIndex === -1) {
                throw new Error('이벤트를 찾을 수 없습니다.');
            }

            // 로컬 상태 업데이트
            eventsRef.current[eventIndex] = {
                ...eventsRef.current[eventIndex],
                ...updates,
            };

            safeSetState(prev => ({
                ...prev,
                events: eventsRef.current,
                recentEvents: getRecentEvents(),
                error: null,
            }));

            // 서버에 업데이트 전송
            await eventService.updateEvent(parseInt(id), {
                type: updates.type,
                confidence: updates.confidence,
                metadata: updates.metadata,
                isPinned: updates.isPinned,
            });

            logEvent(id, 'updateEvent', '이벤트 업데이트 완료');
        } catch (error) {
            handleError(error, 'updateEvent');
            throw error;
        }
    }, [safeSetState, getRecentEvents, handleError]);

    // ============================================================================
    // 이벤트 삭제
    // ============================================================================

    const deleteEvent = useCallback(async (id: string): Promise<void> => {
        try {
            logEvent(id, 'deleteEvent', '이벤트 삭제 시작');

            // 로컬 상태에서 제거
            eventsRef.current = eventsRef.current.filter(event => event.id !== id);

            safeSetState(prev => ({
                ...prev,
                events: eventsRef.current,
                recentEvents: getRecentEvents(),
                error: null,
            }));

            // 서버에 삭제 요청
            await eventService.deleteEvent(parseInt(id));

            logEvent(id, 'deleteEvent', '이벤트 삭제 완료');
        } catch (error) {
            handleError(error, 'deleteEvent');
            throw error;
        }
    }, [safeSetState, getRecentEvents, handleError]);

    // ============================================================================
    // 이벤트 고정/고정 해제
    // ============================================================================

    const togglePin = useCallback(async (id: string): Promise<void> => {
        try {
            const event = eventsRef.current.find(e => e.id === id);
            if (!event) {
                throw new Error('이벤트를 찾을 수 없습니다.');
            }

            logEvent(id, 'togglePin', '이벤트 고정 상태 변경', { currentPin: event.isPinned });

            await updateEvent(id, { isPinned: !event.isPinned });
        } catch (error) {
            handleError(error, 'togglePin');
            throw error;
        }
    }, [updateEvent, handleError]);

    // ============================================================================
    // 이벤트 정리
    // ============================================================================

    const clearEvents = useCallback(async (maxAge: number = EVENT_CLEANUP_AGE): Promise<number> => {
        try {
            const cutoffTime = Date.now() - maxAge;
            const initialCount = eventsRef.current.length;

            eventsRef.current = eventsRef.current.filter(event => event.timestamp >= cutoffTime);

            const deletedCount = initialCount - eventsRef.current.length;

            safeSetState(prev => ({
                ...prev,
                events: eventsRef.current,
                recentEvents: getRecentEvents(),
                error: null,
            }));

            logEvent('unknown', 'clearEvents', '이벤트 정리 완료', { deletedCount });
            return deletedCount;
        } catch (error) {
            handleError(error, 'clearEvents');
            return 0;
        }
    }, [safeSetState, getRecentEvents, handleError]);

    // ============================================================================
    // 통계 계산
    // ============================================================================

    const calculateStats = useCallback((): EventStats => {
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;

        const totalEvents = eventsRef.current.length;
        const todayEvents = eventsRef.current.filter(event => event.timestamp >= oneDayAgo).length;
        const motionEvents = eventsRef.current.filter(event => event.type === 'motion').length;
        const personEvents = eventsRef.current.filter(event => event.type === 'person').length;

        const averageConfidence = eventsRef.current.length > 0
            ? eventsRef.current.reduce((sum, event) => sum + event.confidence, 0) / eventsRef.current.length
            : 0;

        const lastEventTime = eventsRef.current.length > 0
            ? Math.max(...eventsRef.current.map(event => event.timestamp))
            : undefined;

        return {
            totalEvents,
            todayEvents,
            motionEvents,
            personEvents,
            averageConfidence,
            lastEventTime,
        };
    }, []);

    // ============================================================================
    // 통계 업데이트
    // ============================================================================

    const updateStats = useCallback(() => {
        const stats = calculateStats();
        safeSetState(prev => ({
            ...prev,
            eventStats: stats,
        }));
    }, [calculateStats, safeSetState]);

    // ============================================================================
    // 이벤트 데이터 동기화
    // ============================================================================

    const syncEvents = useCallback(async () => {
        try {
            setLoading(true);
            logEvent('unknown', 'syncEvents', '이벤트 동기화 시작');

            const response = await eventService.getEvents();
            if (response.ok && response.data) {
                const serverEvents: EventPayload[] = response.data.map(event => ({
                    id: event.id.toString(),
                    type: event.type as any,
                    cameraId: event.cameraId.toString(),
                    cameraName: event.cameraName || 'Unknown Camera',
                    timestamp: new Date(event.startedAt).getTime(),
                    confidence: event.score || 0,
                    metadata: event.metadata || {},
                    location: event.location,
                    isPinned: event.isPinned || false,
                    score: event.score || 0,
                }));

                eventsRef.current = serverEvents;

                safeSetState(prev => ({
                    ...prev,
                    events: serverEvents,
                    recentEvents: getRecentEvents(),
                    error: null,
                    isLoading: false,
                }));

                updateStats();
                logEvent('unknown', 'syncEvents', '이벤트 동기화 완료', { count: serverEvents.length });
            }
        } catch (error) {
            handleError(error, 'syncEvents');
        }
    }, [setLoading, safeSetState, getRecentEvents, updateStats, handleError]);

    // ============================================================================
    // 자동 동기화
    // ============================================================================

    useEffect(() => {
        const syncInterval = setInterval(() => {
            if (isMountedRef.current) {
                syncEvents();
            }
        }, 30000); // 30초마다 동기화

        return () => {
            clearInterval(syncInterval);
        };
    }, [syncEvents]);

    // ============================================================================
    // 컴포넌트 마운트 시 초기 데이터 로드
    // ============================================================================

    useEffect(() => {
        syncEvents();
    }, [syncEvents]);

    // ============================================================================
    // 컴포넌트 언마운트 시 정리
    // ============================================================================

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            logEvent('unknown', 'cleanup', '이벤트 훅 정리 완료');
        };
    }, []);

    // ============================================================================
    // 액션 객체 생성
    // ============================================================================

    const actions: EventActions = useMemo(() => ({
        getEvents,
        getRecentEvents,
        getMotionEvents,
        createEvent,
        updateEvent,
        deleteEvent,
        togglePin,
        clearEvents,
    }), [
        getEvents,
        getRecentEvents,
        getMotionEvents,
        createEvent,
        updateEvent,
        deleteEvent,
        togglePin,
        clearEvents,
    ]);

    return [state, actions];
};

// ============================================================================
// React Query 기반 이벤트 훅들 (기존 유지)
// ============================================================================

// 이벤트 목록 조회
export const useEvents = (filters?: EventFilters) => {
    return useQuery({
        queryKey: eventKeys.list(filters),
        queryFn: async () => {
            logger.hook('useEvents', 'fetch', '이벤트 목록 조회 시작');
            try {
                const response = await eventService.getEvents(filters);
                logger.hook('useEvents', 'fetch', '응답 수신', { success: response.ok });

                if (!response.ok) {
                    logger.hookError('useEvents', 'fetch', '응답 실패', undefined, { error: response.error });
                    throw new Error(response.error?.message || '이벤트 목록을 불러올 수 없습니다');
                }

                logger.hook('useEvents', 'fetch', '성공', { dataCount: response.data?.length });
                return response.data;
            } catch (error) {
                logger.hookError('useEvents', 'fetch', '오류 발생, Mock 데이터 사용', error instanceof Error ? error : undefined);
                // Mock 데이터 반환
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
export const useEventDetail = (id: number) => {
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

// ============================================================================
// 이벤트 변경 훅들
// ============================================================================

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