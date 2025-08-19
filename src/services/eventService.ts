import { ApiResponse, Event, Recording } from '../types/api';
import apiService from './api';
import eventMockData from '../mocks/eventData.json';

export interface EventFilters {
    cameraId?: number;
    type?: 'motion' | 'person' | 'vehicle' | 'sound';
    startDate?: string;
    endDate?: string;
    isPinned?: boolean;
    minScore?: number;
    maxScore?: number;
    page?: number;
    limit?: number;
}

export interface EventCreateRequest {
    cameraId: number;
    type: 'motion' | 'person' | 'vehicle' | 'sound';
    startedAt: string;
    endedAt?: string;
    score?: number;
    metadata?: Record<string, any>;
}

export interface EventUpdateRequest {
    type?: 'motion' | 'person' | 'vehicle' | 'sound';
    score?: number;
    metadata?: Record<string, any>;
    isPinned?: boolean;
}

export interface EventStatsResponse {
    totalEvents: number;
    todayEvents: number;
    pinnedEvents: number;
    eventsByType: {
        motion: number;
        person: number;
        vehicle: number;
        sound: number;
    };
    averageScore: number;
}

class EventService {
    // 이벤트 목록 조회 (필터링 지원)
    async getEvents(filters?: EventFilters): Promise<ApiResponse<Event[]>> {
        try {
            const params = new URLSearchParams();

            if (filters) {
                Object.entries(filters).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        params.append(key, value.toString());
                    }
                });
            }

            const url = params.toString() ? `/events?${params.toString()}` : '/events';
            const response = await apiService.get<Event[]>(url);
            return response;
        } catch (error) {
            console.log('📱 [EventService] API 호출 실패, Mock 데이터 사용');
            // Mock 데이터 반환 (필터링 로직 추가 가능)
            let filteredData = eventMockData as Event[];

            if (filters) {
                if (filters.type) {
                    filteredData = filteredData.filter(event => event.type === filters.type);
                }
                if (filters.isPinned !== undefined) {
                    filteredData = filteredData.filter(event => event.isPinned === filters.isPinned);
                }
                if (filters.limit) {
                    filteredData = filteredData.slice(0, filters.limit);
                }
            }

            return {
                ok: true,
                data: filteredData
            };
        }
    }

    // 새 이벤트 생성
    async createEvent(event: EventCreateRequest): Promise<ApiResponse<Event>> {
        return await apiService.post<Event>('/events', event);
    }

    // 이벤트 상세 조회
    async getEventById(id: number): Promise<ApiResponse<Event>> {
        return await apiService.get<Event>(`/events/${id}`);
    }

    // 이벤트 업데이트
    async updateEvent(id: number, updates: EventUpdateRequest): Promise<ApiResponse<Event>> {
        return await apiService.put<Event>(`/events/${id}`, updates);
    }

    // 이벤트 삭제
    async deleteEvent(id: number): Promise<ApiResponse<void>> {
        return await apiService.delete<void>(`/events/${id}`);
    }

    // 이벤트 고정/고정 해제
    async toggleEventPin(id: number): Promise<ApiResponse<void>> {
        return await apiService.post<void>(`/events/${id}/pin`);
    }

    // 이벤트 통계 조회
    async getEventStats(): Promise<ApiResponse<EventStatsResponse>> {
        return await apiService.get<EventStatsResponse>('/events/stats');
    }

    // 이벤트별 녹화 파일 목록
    async getEventRecordings(eventId: number): Promise<ApiResponse<Recording[]>> {
        return await apiService.get<Recording[]>(`/events/${eventId}/recordings`);
    }
}

export const eventService = new EventService();
export default eventService; 