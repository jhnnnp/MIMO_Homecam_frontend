import { createLogger } from '@/shared/utils/logger';
import { withErrorHandling, createNetworkError, createTimeoutError } from '@/shared/utils/errorHandler';
import { webrtcService } from '@/shared/services/core/webrtcService';
import { signalingService } from '@/shared/services/core/signalingService';
import { getWebSocketUrl, initializeConfig } from '@/app/config';
import { useAuthStore } from '@/shared/stores/authStore';

// 스트리밍 서비스 로거
const streamingLogger = createLogger('StreamingService');

// React Native용 EventEmitter 구현
class EventEmitter {
    private events: { [key: string]: Function[] } = {};

    on(event: string, listener: Function) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }

    off(event: string, listener: Function) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(l => l !== listener);
    }

    emit(event: string, ...args: any[]) {
        if (!this.events[event]) return;
        this.events[event].forEach(listener => listener(...args));
    }

    removeAllListeners(event?: string) {
        if (event) {
            delete this.events[event];
        } else {
            this.events = {};
        }
    }
}

// 시그널링 메시지 인터페이스
export interface SignalingMessage {
    type: 'offer' | 'answer' | 'ice-candidate' | 'stream-start' | 'stream-stop';
    from: string;
    to: string;
    data: any;
}

// 스트림 연결 인터페이스
export interface StreamConnection {
    id: string;
    cameraId: string;
    viewerId: string;
    status: 'connecting' | 'connected' | 'disconnected' | 'error';
    timestamp: number;
    metadata?: {
        quality: string;
        frameRate: number;
        bitrate: number;
    };
}

// 카메라 스트림 인터페이스
export interface CameraStream {
    id: string;
    name: string;
    status: 'online' | 'offline' | 'streaming';
    viewers: string[];
    streamUrl?: string;
    metadata?: {
        resolution: string;
        frameRate: number;
        quality: string;
    };
}

// WebSocket 연결 상태
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'disabled';

// 스트리밍 이벤트 타입
export type StreamingEvent =
    | 'connected'
    | 'disconnected'
    | 'reconnecting'
    | 'error'
    | 'camera_connected'
    | 'camera_disconnected'
    | 'stream_started'
    | 'stream_stopped'
    | 'viewer_joined'
    | 'viewer_left'
    | 'webrtc_signaling'
    | 'viewer_count_update';

// 스트리밍 이벤트 리스너
export type StreamingEventListener = (event: StreamingEvent, data?: any) => void;

class StreamingService extends EventEmitter {
    private ws: WebSocket | null = null;
    private connectionStatus: ConnectionStatus = 'disconnected';
    private reconnectAttempts = 0;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private heartbeatTimer: NodeJS.Timeout | null = null;
    private eventListeners: StreamingEventListener[] = [];

    // WebSocket 클라이언트 ID
    private clientId: string | null = null;

    // 연결된 카메라 목록
    private connectedCameras: Map<string, CameraStream> = new Map();

    // 활성 스트림 연결
    private activeStreams: Map<string, StreamConnection> = new Map();

    // 연결 상태 추적
    private lastConnectionTime: number = 0;
    private connectionAttempts: number = 0;

    constructor() {
        super();

        // WebRTC 시그널링 콜백 설정
        webrtcService.setSignalingCallback(async (message: SignalingMessage) => {
            await this.sendMessage('webrtc_signaling', message);
        });

        // 이벤트 리스너 등록
        this.setupEventListeners();
        this.bridgeSignalingEvents();
    }

    // 이벤트 리스너 설정
    private setupEventListeners(): void {
        this.on('connected', () => {
            streamingLogger.logWebSocketEvent('Connected');
            this.connectionStatus = 'connected';
            this.reconnectAttempts = 0;
            this.lastConnectionTime = Date.now();
            this.startHeartbeat();
        });

        this.on('disconnected', () => {
            streamingLogger.logWebSocketEvent('Disconnected');
            this.connectionStatus = 'disconnected';
            this.stopHeartbeat();
            this.scheduleReconnect();
        });

        this.on('error', (error: any) => {
            streamingLogger.error('Connection error', error);
            this.connectionStatus = 'error';
            this.scheduleReconnect();
        });
    }

    // SignalingService를 통한 연결 초기화
    async connect(serverUrl?: string): Promise<boolean> {
        return withErrorHandling(async () => {
            if (this.connectionStatus === 'connecting' || this.connectionStatus === 'connected') {
                console.log('⚠️ [Streaming] 이미 연결 중이거나 연결됨:', this.connectionStatus);
                streamingLogger.warn('Already connected or connecting');
                return this.connectionStatus === 'connected';
            }

            this.connectionStatus = 'connecting';
            this.connectionAttempts++;
            console.log('🔌 [Streaming] SignalingService를 통한 연결 시도 (시도 횟수:', this.connectionAttempts, ')');

            try {
                // 설정 초기화 (네트워크 자동 검색 등)
                try { await initializeConfig(); } catch { /* ignore */ }

                // SignalingService 연결 시도
                await signalingService.connect();

                // 연결 완료까지 대기 (타임아웃 10초)
                await this.waitForSignalingConnected(10000);

                console.log('✅ [Streaming] SignalingService 연결 성공');
                this.connectionStatus = 'connected';
                this.reconnectAttempts = 0;
                this.emit('connected');
                return true;
            } catch (error) {
                console.error('❌ [Streaming] SignalingService 연결 실패:', error);
                streamingLogger.error('SignalingService connection failed', error as Error);
                this.connectionStatus = 'error';
                this.emit('error', error);
                return false;
            }
        }, { operation: 'connect', url: serverUrl || getWebSocketUrl() });
    }

    // 시그널링 연결 완료 대기
    private waitForSignalingConnected(timeoutMs: number): Promise<void> {
        return new Promise((resolve, reject) => {
            if (signalingService.getConnectionState() === 'connected') {
                resolve();
                return;
            }

            const onEvent = (event: any) => {
                try {
                    if (event === 'connected') {
                        cleanup();
                        resolve();
                    } else if (event === 'failed' || event === 'disconnected') {
                        cleanup();
                        reject(new Error(`signaling_${event}`));
                    }
                } catch (e) {
                    cleanup();
                    reject(e);
                }
            };

            const cleanup = () => {
                try { signalingService.removeEventListener(onEvent as any); } catch { /* ignore */ }
                clearTimeout(timer);
            };

            const timer = setTimeout(() => {
                cleanup();
                reject(new Error('signaling_timeout'));
            }, timeoutMs);

            signalingService.addEventListener(onEvent as any);
        });
    }

    // 자동 재연결 스케줄링
    private scheduleReconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        if (this.reconnectAttempts >= 5) {
            streamingLogger.error('Max reconnection attempts reached');
            return;
        }

        const delay = this.calculateReconnectDelay();
        streamingLogger.warn(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

        this.reconnectTimer = setTimeout(async () => {
            this.connectionStatus = 'reconnecting';
            this.reconnectAttempts++;
            this.emit('reconnecting');

            const success = await this.connect();
            if (!success) {
                this.scheduleReconnect();
            }
        }, delay);
    }

    // 재연결 지연 시간 계산 (지수 백오프)
    private calculateReconnectDelay(): number {
        const baseDelay = 2000;
        const maxDelay = 30000; // 최대 30초
        const delay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempts), maxDelay);
        return delay + Math.random() * 1000; // 지터 추가
    }

    // 하트비트 시작
    private startHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }

        this.heartbeatTimer = setInterval(async () => {
            if (this.isConnected()) {
                await this.sendMessage('heartbeat', { timestamp: Date.now() });
            }
        }, 30000);
    }

    // 하트비트 중지
    private stopHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    // 메시지 처리
    private handleMessage(message: any): void {
        try {
            console.log('📨 [WebSocket] 메시지 처리:', message.type, message.data);
            streamingLogger.debug('Received message', { type: message.type });

            switch (message.type) {
                case 'connected':
                    this.handleConnected(message.data);
                    break;
                case 'client_id':
                    this.handleClientId(message.data);
                    break;
                case 'camera_connected':
                    this.handleCameraConnected(message.data);
                    break;
                case 'camera_disconnected':
                    this.handleCameraDisconnected(message.data);
                    break;
                case 'camera_registered':
                    this.handleCameraRegistered(message.data);
                    break;
                case 'stream_started':
                    this.handleStreamStarted(message.data);
                    break;
                case 'stream_stopped':
                    this.handleStreamStopped(message.data);
                    break;
                case 'stream_joined':
                    this.handleStreamJoined(message.data);
                    break;
                case 'viewer_joined':
                    this.handleViewerJoined(message.data);
                    break;
                case 'viewer_left':
                    this.handleViewerLeft(message.data);
                    break;
                case 'viewer_count_update':
                    this.handleViewerCountUpdate(message.data);
                    break;
                case 'webrtc_signaling':
                    this.handleWebRTCSignaling(message.data);
                    break;
                case 'heartbeat':
                case 'pong':
                    this.handleHeartbeat(message.data);
                    break;
                case 'error':
                    this.handleError(message.data);
                    break;
                default:
                    console.log('⚠️ [WebSocket] 알 수 없는 메시지 타입:', message.type);
                    streamingLogger.warn('Unknown message type', { type: message.type });
            }
        } catch (error) {
            console.error('❌ [WebSocket] 메시지 처리 오류:', error);
            streamingLogger.error('Message handling error', error as Error, { message });
        }
    }

    // SignalingService 이벤트를 스트리밍 이벤트로 브릿지
    private bridgeSignalingEvents(): void {
        try {
            signalingService.addEventListener((event, data) => {
                switch (event) {
                    case 'connected':
                        this.emit('connected');
                        break;
                    case 'disconnected':
                        this.emit('disconnected');
                        break;
                    case 'camera_registered':
                        this.handleCameraRegistered(data);
                        break;
                    case 'stream_started':
                        this.handleStreamStarted(data);
                        break;
                    case 'stream_joined':
                        this.handleStreamJoined(data);
                        break;
                    case 'viewer_joined':
                        this.handleViewerJoined(data);
                        break;
                    case 'viewer_left':
                        this.handleViewerLeft(data);
                        break;
                    case 'viewer_count_update':
                        this.handleViewerCountUpdate(data);
                        break;
                    case 'webrtc_signaling':
                        this.handleWebRTCSignaling(data);
                        break;
                    case 'error':
                        this.handleError(data);
                        break;
                    default:
                        // 기타 메시지는 무시
                        break;
                }
            });
        } catch (e) {
            streamingLogger.warn('Failed to bridge signaling events', e as Error);
        }
    }

    // 카메라 연결 처리
    private handleCameraConnected(cameraData: CameraStream): void {
        this.connectedCameras.set(cameraData.id, cameraData);
        streamingLogger.logWebSocketEvent('Camera connected', { cameraId: cameraData.id });
        this.emit('camera_connected', cameraData);
    }

    // 카메라 연결 해제 처리
    private handleCameraDisconnected(cameraId: string): void {
        this.connectedCameras.delete(cameraId);
        streamingLogger.logWebSocketEvent('Camera disconnected', { cameraId });
        this.emit('camera_disconnected', cameraId);
    }

    // 스트림 시작 처리
    private handleStreamStarted(streamData: any): void {
        const streamId = streamData?.id || streamData?.cameraId;
        if (!streamId) {
            streamingLogger.warn('Stream started without id/cameraId', { streamData });
            return;
        }

        const normalized: StreamConnection = {
            id: streamId,
            cameraId: streamData.cameraId || streamId,
            viewerId: streamData.viewerId || '',
            status: 'connected',
            timestamp: Date.now(),
            metadata: streamData.metadata,
        };

        this.activeStreams.set(streamId, normalized);
        streamingLogger.logWebSocketEvent('Stream started', { streamId });
        this.emit('stream_started', normalized);
    }

    // 스트림 중지 처리
    private handleStreamStopped(streamId: string): void {
        this.activeStreams.delete(streamId);
        streamingLogger.logWebSocketEvent('Stream stopped', { streamId });
        this.emit('stream_stopped', streamId);
    }

    // 뷰어 참여 처리
    private handleViewerJoined(data: { streamId?: string; cameraId?: string; viewerId: string }): void {
        const streamId = data.streamId || data.cameraId;
        if (!streamId) {
            streamingLogger.warn('Viewer joined without streamId/cameraId', data);
        } else if (!this.activeStreams.has(streamId)) {
            // 스트림이 미리 등록되지 않은 경우 보수적으로 생성
            this.activeStreams.set(streamId, {
                id: streamId,
                cameraId: data.cameraId || streamId,
                viewerId: data.viewerId,
                status: 'connected',
                timestamp: Date.now(),
            });
        }

        streamingLogger.logWebSocketEvent('Viewer joined', { streamId, viewerId: data.viewerId });
        this.emit('viewer_joined', { streamId, viewerId: data.viewerId });
    }

    // 뷰어 퇴장 처리
    private handleViewerLeft(data: { streamId: string; viewerId: string }): void {
        streamingLogger.logWebSocketEvent('Viewer left', data);
        this.emit('viewer_left', data);
    }

    // 뷰어 카운트 업데이트 처리
    private handleViewerCountUpdate(data: { connectionId: string; viewerCount: number }): void {
        streamingLogger.logWebSocketEvent('Viewer count update', data);
        this.emit('viewer_count_update', data);
    }

    // WebRTC 시그널링 처리
    private handleWebRTCSignaling(data: SignalingMessage): void {
        try {
            webrtcService.handleSignalingMessage(data);
            this.emit('webrtc_signaling', data);
        } catch (error) {
            streamingLogger.error('WebRTC signaling error', error as Error, { data });
        }
    }

    // WebSocket 연결 확인 처리
    private handleConnected(data: any): void {
        console.log('✅ [WebSocket] 연결 확인 메시지 수신:', data);
        streamingLogger.debug('WebSocket connection confirmed', { data });
        this.emit('websocket_connected', data);
    }

    // 클라이언트 ID 처리
    private handleClientId(data: { clientId: string }): void {
        console.log('🆔 [WebSocket] 클라이언트 ID 수신:', data.clientId);
        this.clientId = data.clientId;
        streamingLogger.debug('Client ID received', { clientId: data.clientId });
    }

    // 카메라 등록 확인 처리
    private handleCameraRegistered(data: any): void {
        console.log('✅ [WebSocket] 카메라 등록 확인:', data);
        streamingLogger.logWebSocketEvent('Camera registered', { cameraId: data.id });
        this.emit('camera_registered', data);
    }

    // 스트림 참여 확인 처리
    private handleStreamJoined(data: any): void {
        console.log('🎥 [WebSocket] 스트림 참여 확인:', data);
        streamingLogger.logWebSocketEvent('Stream joined', { cameraId: data.cameraId, viewerId: data.viewerId });
        this.emit('stream_joined', data);
    }

    // 에러 메시지 처리
    private handleError(data: { message: string }): void {
        console.error('❌ [WebSocket] 서버 에러:', data.message);
        streamingLogger.error('Server error', new Error(data.message));
        this.emit('error', new Error(data.message));
    }

    // 하트비트 응답 처리
    private handleHeartbeat(data: any): void {
        streamingLogger.debug('Heartbeat received', { data });
    }

    // 수동 재연결 메서드
    async reconnect(): Promise<boolean> {
        streamingLogger.logUserAction('Manual reconnect');

        if (this.connectionStatus === 'connecting' || this.connectionStatus === 'connected') {
            streamingLogger.warn('Already connected or connecting');
            return this.connectionStatus === 'connected';
        }

        // 기존 연결 정리
        this.disconnect();

        // 재연결 시도
        return await this.connect();
    }

    // SignalingService를 통한 메시지 전송
    private async sendMessage(type: string, data: any): Promise<void> {
        try {
            await signalingService.sendMessage({ type: type as any, data });
            streamingLogger.debug('Message sent via SignalingService', { type, data });
        } catch (error) {
            streamingLogger.warn('Failed to send message via SignalingService', { type, error });
        }
    }

    // 카메라 등록 (홈캠 모드)
    async registerCamera(cameraId: string, cameraName: string): Promise<boolean> {
        if (!this.isConnected()) {
            streamingLogger.warn('Cannot register camera: WebSocket not connected');
            return false;
        }

        await this.sendMessage('register_camera', {
            id: cameraId,
            name: cameraName,
            timestamp: Date.now()
        });

        streamingLogger.logUserAction('Camera registered', { cameraId, cameraName });
        return true;
    }

    // 카메라 연결 해제
    async unregisterCamera(cameraId: string): Promise<boolean> {
        if (!this.isConnected()) {
            streamingLogger.warn('Cannot unregister camera: WebSocket not connected');
            return false;
        }

        await this.sendMessage('unregister_camera', { id: cameraId });
        streamingLogger.logUserAction('Camera unregistered', { cameraId });
        return true;
    }

    // 스트림 시작 (홈캠 모드)
    async startStream(cameraId: string, viewerId: string): Promise<boolean> {
        return withErrorHandling(async () => {
            streamingLogger.logUserAction('Start stream', { cameraId, viewerId });

            try {
                // WebRTC 스트림 시작
                await webrtcService.startStreaming(cameraId, viewerId);

                // 서버에 스트림 시작 알림
                await this.sendMessage('start_stream', {
                    cameraId,
                    viewerId,
                    timestamp: Date.now()
                });

                return true;
            } catch (error) {
                streamingLogger.error('Failed to start stream', error as Error, { cameraId, viewerId });
                return false;
            }
        }, { operation: 'start_stream', cameraId, viewerId });
    }

    // 스트림 중지 (홈캠 모드)
    async stopStream(cameraId: string): Promise<boolean> {
        if (!this.isConnected()) {
            streamingLogger.warn('Cannot stop stream: WebSocket not connected');
            return false;
        }

        await this.sendMessage('stop_stream', { cameraId });
        streamingLogger.logUserAction('Stream stopped', { cameraId });
        return true;
    }

    // 뷰어로 스트림 참여 (뷰어 모드)
    async joinStream(cameraId: string, viewerId: string): Promise<boolean> {
        return withErrorHandling(async () => {
            streamingLogger.logUserAction('Join stream', { cameraId, viewerId });

            try {
                // 서버에 참여 요청만 전달 (WebRTC 생성은 호출부에서 수행)
                await this.sendMessage('join_stream', {
                    cameraId,
                    viewerId,
                    timestamp: Date.now()
                });

                return true;
            } catch (error) {
                streamingLogger.error('Failed to join stream', error as Error, { cameraId, viewerId });
                return false;
            }
        }, { operation: 'join_stream', cameraId, viewerId });
    }

    // 스트림에서 나가기 (뷰어 모드)
    async leaveStream(cameraId: string, viewerId: string): Promise<boolean> {
        if (!this.isConnected()) {
            streamingLogger.warn('Cannot leave stream: WebSocket not connected');
            return false;
        }

        await this.sendMessage('leave_stream', { cameraId, viewerId });
        streamingLogger.logUserAction('Left stream', { cameraId, viewerId });
        return true;
    }

    // 연결된 카메라 목록 조회
    getConnectedCameras(): CameraStream[] {
        return Array.from(this.connectedCameras.values());
    }

    // 활성 스트림 목록 조회
    getActiveStreams(): StreamConnection[] {
        return Array.from(this.activeStreams.values());
    }

    // 특정 카메라 정보 조회
    getCamera(cameraId: string): CameraStream | undefined {
        return this.connectedCameras.get(cameraId);
    }

    // 카메라를 연결된 카메라 목록에 추가 (수동 연결용)
    addConnectedCamera(cameraData: CameraStream): void {
        this.connectedCameras.set(cameraData.id, cameraData);
        streamingLogger.logUserAction('Camera added manually', { cameraId: cameraData.id });
        this.emit('camera_connected', cameraData);
    }

    // 연결 상태 확인
    isConnected(): boolean {
        return signalingService.getConnectionState() === 'connected';
    }

    // 연결 상태 조회
    getConnectionStatus(): ConnectionStatus {
        return this.connectionStatus;
    }

    // 연결 통계 조회
    getConnectionStats(): {
        status: ConnectionStatus;
        lastConnectionTime: number;
        connectionAttempts: number;
        reconnectAttempts: number;
        uptime: number;
    } {
        const now = Date.now();
        return {
            status: this.connectionStatus,
            lastConnectionTime: this.lastConnectionTime,
            connectionAttempts: this.connectionAttempts,
            reconnectAttempts: this.reconnectAttempts,
            uptime: this.lastConnectionTime > 0 ? now - this.lastConnectionTime : 0,
        };
    }

    // 연결 종료
    disconnect(): void {
        streamingLogger.logUserAction('Disconnect');

        // 타이머 정리
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }

        // WebSocket 연결 종료
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        // 상태 초기화
        this.connectionStatus = 'disconnected';
        this.connectedCameras.clear();
        this.activeStreams.clear();

        // WebRTC 리소스 정리
        webrtcService.cleanup();

        this.emit('disconnected');
    }

    // WebRTC 스트림 상태 조회
    getWebRTCStream(streamId: string) {
        return webrtcService.getStreamStatus(streamId);
    }

    // 모든 WebRTC 스트림 조회
    getAllWebRTCStreams() {
        return webrtcService.getAllStreams();
    }

    // WebRTC 연결 수 조회
    getWebRTCConnectionCount() {
        return webrtcService.getConnectedStreamCount();
    }

    // 서비스 정리
    cleanup(): void {
        this.disconnect();
        this.removeAllListeners();
        streamingLogger.info('Streaming service cleaned up');
    }
}

// 싱글톤 인스턴스
export const streamingService = new StreamingService();
export default streamingService;


