import { ApiResponse, Camera } from '../types/api';
import apiService from './api';
import cameraMockData from '../mocks/cameraData.json';

export interface CameraCreateRequest {
    name: string;
    location?: string;
    ipAddress?: string;
    port?: number;
    username?: string;
    password?: string;
    description?: string;
}

export interface CameraUpdateRequest {
    name?: string;
    location?: string;
    ipAddress?: string;
    port?: number;
    username?: string;
    password?: string;
    description?: string;
    isActive?: boolean;
}

export interface CameraStatsResponse {
    totalEvents: number;
    todayEvents: number;
    lastEventTime: string | null;
    uptime: number;
    connectionStatus: 'online' | 'offline';
}

export interface LiveStreamInfo {
    streamUrl: string;
    signallingUrl: string;
    stunServers: string[];
    turnServers: Array<{
        urls: string;
        username: string;
        credential: string;
    }>;
}

class CameraService {
    // 카메라 목록 조회
    async getCameras(): Promise<ApiResponse<Camera[]>> {
        try {
            const response = await apiService.get<Camera[]>('/cameras');
            return response;
        } catch (error) {
            console.log('📱 [CameraService] API 호출 실패, Mock 데이터 사용');
            // Mock 데이터 반환
            return {
                ok: true,
                data: cameraMockData as Camera[]
            };
        }
    }

    // 새 카메라 등록
    async createCamera(camera: CameraCreateRequest): Promise<ApiResponse<Camera>> {
        return await apiService.post<Camera>('/cameras', camera);
    }

    // 카메라 상세 조회
    async getCameraById(id: number): Promise<ApiResponse<Camera>> {
        return await apiService.get<Camera>(`/cameras/${id}`);
    }

    // 카메라 업데이트
    async updateCamera(id: number, updates: CameraUpdateRequest): Promise<ApiResponse<Camera>> {
        return await apiService.put<Camera>(`/cameras/${id}`, updates);
    }

    // 카메라 삭제
    async deleteCamera(id: number): Promise<ApiResponse<void>> {
        return await apiService.delete<void>(`/cameras/${id}`);
    }

    // 하트비트 전송
    async sendHeartbeat(id: number): Promise<ApiResponse<void>> {
        return await apiService.post<void>(`/cameras/${id}/heartbeat`);
    }

    // 카메라 통계 조회
    async getCameraStats(id: number): Promise<ApiResponse<CameraStatsResponse>> {
        return await apiService.get<CameraStatsResponse>(`/cameras/${id}/stats`);
    }

    // 라이브 스트림 정보 조회
    async getLiveStreamInfo(id: number): Promise<ApiResponse<LiveStreamInfo>> {
        return await apiService.get<LiveStreamInfo>(`/cameras/${id}/live-stream`);
    }

    // 카메라별 설정 조회
    async getCameraSettings(id: number): Promise<ApiResponse<any>> {
        return await apiService.get<any>(`/cameras/${id}/settings`);
    }

    // 카메라별 설정 업데이트
    async updateCameraSettings(id: number, settings: any): Promise<ApiResponse<any>> {
        return await apiService.put<any>(`/cameras/${id}/settings`, settings);
    }
}

export const cameraService = new CameraService();
export default cameraService; 