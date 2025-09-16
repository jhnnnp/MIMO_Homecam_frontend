import { ApiResponse, Camera } from '../types/api';
import api from './api';
import { createLogger } from '../utils/logger';
import { withErrorHandling, createValidationError, ErrorType } from '../utils/errorHandler';
import { streamingService } from './streamingService';
import config from '../config';
import cameraMockData from '../mocks/cameraData.json';

// 카메라 서비스 로거
const cameraLogger = createLogger('CameraService');

// 카메라 생성 요청 인터페이스
export interface CameraCreateRequest {
    name: string;
    location?: string;
    ipAddress?: string;
    port?: number;
    username?: string;
    password?: string;
    description?: string;
    settings?: CameraSettings;
}

// 카메라 업데이트 요청 인터페이스
export interface CameraUpdateRequest {
    name?: string;
    location?: string;
    ipAddress?: string;
    port?: number;
    username?: string;
    password?: string;
    description?: string;
    isActive?: boolean;
    settings?: Partial<CameraSettings>;
}

// 카메라 설정 인터페이스
export interface CameraSettings {
    resolution: '480p' | '720p' | '1080p';
    frameRate: 15 | 24 | 30 | 60;
    quality: 'low' | 'medium' | 'high';
    audioEnabled: boolean;
    motionDetection: {
        enabled: boolean;
        sensitivity: 'low' | 'medium' | 'high';
        zones: MotionZone[];
    };
    recording: {
        enabled: boolean;
        autoRecord: boolean;
        maxDuration: number; // 초
        retentionDays: number;
    };
    streaming: {
        enabled: boolean;
        maxViewers: number;
        quality: 'low' | 'medium' | 'high';
    };
}

// 모션 감지 영역 인터페이스
export interface MotionZone {
    id: string;
    name: string;
    x: number; // 0-1 비율
    y: number; // 0-1 비율
    width: number; // 0-1 비율
    height: number; // 0-1 비율
    enabled: boolean;
    sensitivity: 'low' | 'medium' | 'high';
}

// 카메라 통계 응답 인터페이스
export interface CameraStatsResponse {
    totalEvents: number;
    todayEvents: number;
    lastEventTime: string | null;
    uptime: number;
    connectionStatus: 'online' | 'offline';
    streamStatus: 'idle' | 'streaming' | 'error';
    viewerCount: number;
    recordingStatus: 'idle' | 'recording' | 'error';
}

// 라이브 스트림 정보 인터페이스
export interface LiveStreamInfo {
    streamUrl: string;
    signallingUrl: string;
    stunServers: string[];
    turnServers: Array<{
        urls: string;
        username: string;
        credential: string;
    }>;
    viewerCount: number;
    quality: 'low' | 'medium' | 'high';
}

// 카메라 이벤트 타입
export type CameraEvent =
    | 'camera_created'
    | 'camera_updated'
    | 'camera_deleted'
    | 'camera_connected'
    | 'camera_disconnected'
    | 'stream_started'
    | 'stream_stopped'
    | 'recording_started'
    | 'recording_stopped';

// 카메라 이벤트 리스너
export type CameraEventListener = (event: CameraEvent, cameraId: number, data?: any) => void;

class CameraService {
    private eventListeners: CameraEventListener[] = [];
    private cameras: Map<number, Camera> = new Map();

    // 이벤트 리스너 등록
    addEventListener(listener: CameraEventListener): void {
        this.eventListeners.push(listener);
    }

    // 이벤트 리스너 제거
    removeEventListener(listener: CameraEventListener): void {
        this.eventListeners = this.eventListeners.filter(l => l !== listener);
    }

    // 이벤트 발생
    private emitEvent(event: CameraEvent, cameraId: number, data?: any): void {
        cameraLogger.info(`Camera event: ${event}`, { cameraId, data });
        this.eventListeners.forEach(listener => listener(event, cameraId, data));
    }

    // 카메라 목록 조회
    async getCameras(): Promise<ApiResponse<Camera[]>> {
        return withErrorHandling(async () => {
            cameraLogger.logUserAction('Get cameras list');

            try {
                const response = await api.get<Camera[]>('/cameras');

                if (response.ok && response.data) {
                    // 로컬 캐시 업데이트
                    this.cameras.clear();
                    response.data.forEach(camera => {
                        this.cameras.set(camera.id, camera);
                    });
                }

                return response;
            } catch (error) {
                cameraLogger.warn('API call failed, using mock data');

                // Mock 데이터 반환
                const mockCameras = cameraMockData as Camera[];
                mockCameras.forEach(camera => {
                    this.cameras.set(camera.id, camera);
                });

                return {
                    ok: true,
                    data: mockCameras
                };
            }
        }, { operation: 'get_cameras' });
    }

    // 새 카메라 등록
    async createCamera(cameraData: CameraCreateRequest): Promise<ApiResponse<Camera>> {
        return withErrorHandling(async () => {
            cameraLogger.logUserAction('Create camera', { name: cameraData.name });

            // 입력 검증
            this.validateCameraData(cameraData);

            const response = await api.post<Camera>('/cameras', cameraData);

            if (response.ok && response.data) {
                // 로컬 캐시 업데이트
                this.cameras.set(response.data.id, response.data);

                // WebSocket을 통한 카메라 등록
                if (streamingService.isConnected()) {
                    streamingService.registerCamera(
                        response.data.id.toString(),
                        response.data.name
                    );
                }

                this.emitEvent('camera_created', response.data.id, response.data);
            }

            return response;
        }, { operation: 'create_camera', cameraData: { name: cameraData.name } });
    }

    // 카메라 상세 조회
    async getCameraById(id: number): Promise<ApiResponse<Camera>> {
        return withErrorHandling(async () => {
            cameraLogger.logUserAction('Get camera by ID', { cameraId: id });

            // 로컬 캐시 확인
            const cachedCamera = this.cameras.get(id);
            if (cachedCamera) {
                return { ok: true, data: cachedCamera };
            }

            const response = await api.get<Camera>(`/cameras/${id}`);

            if (response.ok && response.data) {
                // 로컬 캐시 업데이트
                this.cameras.set(response.data.id, response.data);
            }

            return response;
        }, { operation: 'get_camera_by_id', cameraId: id });
    }

    // 카메라 업데이트
    async updateCamera(id: number, updates: CameraUpdateRequest): Promise<ApiResponse<Camera>> {
        return withErrorHandling(async () => {
            cameraLogger.logUserAction('Update camera', { cameraId: id, updates });

            // 업데이트 데이터 검증
            this.validateCameraUpdates(updates);

            const response = await api.put<Camera>(`/cameras/${id}`, updates);

            if (response.ok && response.data) {
                // 로컬 캐시 업데이트
                this.cameras.set(response.data.id, response.data);

                // WebSocket을 통한 카메라 상태 업데이트
                if (streamingService.isConnected()) {
                    if (updates.isActive === false) {
                        streamingService.unregisterCamera(id.toString());
                    } else {
                        streamingService.registerCamera(
                            response.data.id.toString(),
                            response.data.name
                        );
                    }
                }

                this.emitEvent('camera_updated', id, response.data);
            }

            return response;
        }, { operation: 'update_camera', cameraId: id, updates });
    }

    // 카메라 삭제
    async deleteCamera(id: number): Promise<ApiResponse<void>> {
        return withErrorHandling(async () => {
            cameraLogger.logUserAction('Delete camera', { cameraId: id });

            const response = await api.delete<void>(`/cameras/${id}`);

            if (response.ok) {
                // 로컬 캐시에서 제거
                this.cameras.delete(id);

                // WebSocket을 통한 카메라 해제
                if (streamingService.isConnected()) {
                    streamingService.unregisterCamera(id.toString());
                }

                this.emitEvent('camera_deleted', id);
            }

            return response;
        }, { operation: 'delete_camera', cameraId: id });
    }

    // 하트비트 전송
    async sendHeartbeat(id: number): Promise<ApiResponse<void>> {
        return withErrorHandling(async () => {
            cameraLogger.debug('Send heartbeat', { cameraId: id });

            const response = await api.post<void>(`/cameras/${id}/heartbeat`);
            return response;
        }, { operation: 'send_heartbeat', cameraId: id });
    }

    // 카메라 통계 조회
    async getCameraStats(id: number): Promise<ApiResponse<CameraStatsResponse>> {
        return withErrorHandling(async () => {
            cameraLogger.logUserAction('Get camera stats', { cameraId: id });

            const response = await api.get<CameraStatsResponse>(`/cameras/${id}/stats`);
            return response;
        }, { operation: 'get_camera_stats', cameraId: id });
    }

    // 라이브 스트림 정보 조회
    async getLiveStreamInfo(id: number): Promise<ApiResponse<LiveStreamInfo>> {
        return withErrorHandling(async () => {
            cameraLogger.logUserAction('Get live stream info', { cameraId: id });

            const response = await api.get<LiveStreamInfo>(`/cameras/${id}/live-stream`);
            return response;
        }, { operation: 'get_live_stream_info', cameraId: id });
    }

    // 카메라별 설정 조회
    async getCameraSettings(id: number): Promise<ApiResponse<CameraSettings>> {
        return withErrorHandling(async () => {
            cameraLogger.logUserAction('Get camera settings', { cameraId: id });

            const response = await api.get<CameraSettings>(`/cameras/${id}/settings`);
            return response;
        }, { operation: 'get_camera_settings', cameraId: id });
    }

    // 카메라별 설정 업데이트
    async updateCameraSettings(id: number, settings: Partial<CameraSettings>): Promise<ApiResponse<CameraSettings>> {
        return withErrorHandling(async () => {
            cameraLogger.logUserAction('Update camera settings', { cameraId: id, settings });

            // 설정 검증
            this.validateCameraSettings(settings);

            const response = await api.put<CameraSettings>(`/cameras/${id}/settings`, settings);

            if (response.ok && response.data) {
                // 로컬 캐시 업데이트
                const camera = this.cameras.get(id);
                if (camera) {
                    camera.metadata = { ...camera.metadata, settings: response.data };
                    this.cameras.set(id, camera);
                }
            }

            return response;
        }, { operation: 'update_camera_settings', cameraId: id, settings });
    }

    // 스트림 시작
    async startStream(cameraId: number, viewerId: string): Promise<boolean> {
        try {
            cameraLogger.logUserAction('Start stream', { cameraId, viewerId });

            const success = await streamingService.startStream(
                cameraId.toString(),
                viewerId
            );

            if (success) {
                this.emitEvent('stream_started', cameraId, { viewerId });
            }

            return success;
        } catch (error) {
            cameraLogger.error('Failed to start stream', error as Error, { cameraId, viewerId });
            return false;
        }
    }

    // 스트림 중지
    async stopStream(cameraId: number): Promise<boolean> {
        try {
            cameraLogger.logUserAction('Stop stream', { cameraId });

            const success = streamingService.stopStream(cameraId.toString());

            if (success) {
                this.emitEvent('stream_stopped', cameraId);
            }

            return success;
        } catch (error) {
            cameraLogger.error('Failed to stop stream', error as Error, { cameraId });
            return false;
        }
    }

    // 스트림 참여
    async joinStream(cameraId: number, viewerId: string): Promise<boolean> {
        try {
            cameraLogger.logUserAction('Join stream', { cameraId, viewerId });

            const success = await streamingService.joinStream(
                cameraId.toString(),
                viewerId
            );

            return success;
        } catch (error) {
            cameraLogger.error('Failed to join stream', error as Error, { cameraId, viewerId });
            return false;
        }
    }

    // 스트림 나가기
    async leaveStream(cameraId: number, viewerId: string): Promise<boolean> {
        try {
            cameraLogger.logUserAction('Leave stream', { cameraId, viewerId });

            const success = streamingService.leaveStream(
                cameraId.toString(),
                viewerId
            );

            return success;
        } catch (error) {
            cameraLogger.error('Failed to leave stream', error as Error, { cameraId, viewerId });
            return false;
        }
    }

    // 연결된 카메라 목록 조회
    getConnectedCameras(): Camera[] {
        return Array.from(this.cameras.values()).filter(camera => camera.isOnline);
    }

    // 특정 카메라 정보 조회 (캐시)
    getCachedCamera(id: number): Camera | undefined {
        return this.cameras.get(id);
    }

    // 모든 카메라 정보 조회 (캐시)
    getAllCachedCameras(): Camera[] {
        return Array.from(this.cameras.values());
    }

    // 입력 검증 메서드들
    private validateCameraData(cameraData: CameraCreateRequest): void {
        if (!cameraData.name || cameraData.name.trim().length < 2) {
            throw createValidationError('카메라 이름은 2자 이상이어야 합니다.', 'INVALID_CAMERA_NAME');
        }

        if (cameraData.ipAddress && !this.validateIpAddress(cameraData.ipAddress)) {
            throw createValidationError('유효한 IP 주소를 입력해주세요.', 'INVALID_IP_ADDRESS');
        }

        if (cameraData.port && (cameraData.port < 1 || cameraData.port > 65535)) {
            throw createValidationError('포트 번호는 1-65535 사이여야 합니다.', 'INVALID_PORT');
        }
    }

    private validateCameraUpdates(updates: CameraUpdateRequest): void {
        if (updates.name && updates.name.trim().length < 2) {
            throw createValidationError('카메라 이름은 2자 이상이어야 합니다.', 'INVALID_CAMERA_NAME');
        }

        if (updates.ipAddress && !this.validateIpAddress(updates.ipAddress)) {
            throw createValidationError('유효한 IP 주소를 입력해주세요.', 'INVALID_IP_ADDRESS');
        }

        if (updates.port && (updates.port < 1 || updates.port > 65535)) {
            throw createValidationError('포트 번호는 1-65535 사이여야 합니다.', 'INVALID_PORT');
        }
    }

    private validateCameraSettings(settings: Partial<CameraSettings>): void {
        if (settings.resolution && !['480p', '720p', '1080p'].includes(settings.resolution)) {
            throw createValidationError('유효한 해상도를 선택해주세요.', 'INVALID_RESOLUTION');
        }

        if (settings.frameRate && ![15, 24, 30, 60].includes(settings.frameRate)) {
            throw createValidationError('유효한 프레임 레이트를 선택해주세요.', 'INVALID_FRAME_RATE');
        }

        if (settings.quality && !['low', 'medium', 'high'].includes(settings.quality)) {
            throw createValidationError('유효한 품질을 선택해주세요.', 'INVALID_QUALITY');
        }

        if (settings.recording?.maxDuration && settings.recording.maxDuration < 1) {
            throw createValidationError('최대 녹화 시간은 1초 이상이어야 합니다.', 'INVALID_MAX_DURATION');
        }

        if (settings.recording?.retentionDays && settings.recording.retentionDays < 1) {
            throw createValidationError('보관 기간은 1일 이상이어야 합니다.', 'INVALID_RETENTION_DAYS');
        }

        if (settings.streaming?.maxViewers && settings.streaming.maxViewers < 1) {
            throw createValidationError('최대 시청자 수는 1명 이상이어야 합니다.', 'INVALID_MAX_VIEWERS');
        }
    }

    private validateIpAddress(ipAddress: string): boolean {
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipRegex.test(ipAddress);
    }

    // 캐시 정리
    clearCache(): void {
        this.cameras.clear();
        cameraLogger.info('Camera cache cleared');
    }

    // 서비스 정리
    cleanup(): void {
        this.clearCache();
        this.eventListeners = [];
        cameraLogger.info('Camera service cleaned up');
    }
}

export const cameraService = new CameraService();
export default cameraService; 