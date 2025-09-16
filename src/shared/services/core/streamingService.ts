import { createLogger } from '../utils/logger';
import { withErrorHandling, createNetworkError, createTimeoutError } from '../utils/errorHandler';
import { webrtcService } from './webrtcService';
import { getWebSocketUrl } from '../config';
import { useAuthStore } from '../stores/authStore';

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
    | 'webrtc_signaling';

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
        webrtcService.setSignalingCallback((message: SignalingMessage) => {
            this.sendMessage('webrtc_signaling', message);
        });

        // 이벤트 리스너 등록
        this.setupEventListeners();
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

    // WebSocket 연결 초기화
    async connect(serverUrl?: string): Promise<boolean> {
        return withErrorHandling(async () => {
            if (this.connectionStatus === 'connecting' || this.connectionStatus === 'connected') {
                console.log('⚠️ [WebSocket] 이미 연결 중이거나 연결됨:', this.connectionStatus);
                streamingLogger.warn('Already connected or connecting');
                return this.connectionStatus === 'connected';
            }

            this.connectionStatus = 'connecting';
            this.connectionAttempts++;
            console.log('🔌 [WebSocket] 연결 시도 시작 (시도 횟수:', this.connectionAttempts, ')');

            const wsUrl = serverUrl || getWebSocketUrl();
            console.log('🌐 [WebSocket] 연결 URL:', wsUrl);
            streamingLogger.logWebSocketEvent('Connecting', { url: wsUrl });

            if (!wsUrl) {
                streamingLogger.warn('Skipping WebSocket connect: empty URL');
                this.connectionStatus = 'disabled';
                this.emit('disconnected');
                return false;
            }

            try {
                // 실제 인증 토큰 사용
                const { getAccessToken } = useAuthStore.getState();
                const accessToken = await getAccessToken();

                if (!accessToken) {
                    console.error('❌ [WebSocket] 인증 토큰 없음');
                    throw new Error('인증 토큰이 없습니다. 로그인이 필요합니다.');
                }
                console.log('✅ [WebSocket] 인증 토큰 확인됨');

                const wsUrlWithToken = `${wsUrl}/ws?token=${accessToken}`;
                console.log('🔗 [WebSocket] 토큰 포함 URL:', wsUrlWithToken);

                this.ws = new WebSocket(wsUrlWithToken);
                console.log('🔌 [WebSocket] WebSocket 객체 생성됨');

                this.ws.onopen = () => {
                    console.log('✅ [WebSocket] 연결 성공!');
                    streamingLogger.logWebSocketEvent('Connection established');
                    this.connectionStatus = 'connected';
                    this.reconnectAttempts = 0;
                    this.lastConnectionTime = Date.now();
                    this.startHeartbeat();
                    this.emit('connected');
                };

                this.ws.onmessage = (event) => {
                    console.log('📨 [WebSocket] 메시지 수신:', event.data);
                    this.handleMessage(JSON.parse(event.data));
                };

                this.ws.onclose = (event) => {
                    console.log('🔌 [WebSocket] 연결 종료 - 코드:', event.code, '이유:', event.reason);
                    streamingLogger.logWebSocketEvent('Connection closed', { code: event.code, reason: event.reason });
                    this.connectionStatus = 'disconnected';
                    this.stopHeartbeat();
                    this.emit('disconnected');
                    this.scheduleReconnect();
                };

                this.ws.onerror = (error: any) => {
                    console.error('❌ [WebSocket] 연결 오류:', error);
                    streamingLogger.error('WebSocket error', error);
                    this.connectionStatus = 'error';
                    this.emit('error', error);
                };

                console.log('✅ [WebSocket] 연결 설정 완료');
                return true;
            } catch (error) {
                console.error('❌ [WebSocket] 연결 실패:', error);
                console.error('❌ [WebSocket] 오류 상세:', {
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : 'No stack trace',
                    connectionAttempts: this.connectionAttempts,
                    url: wsUrl
                });
                streamingLogger.error('Connection failed', error as Error);
                this.connectionStatus = 'error';
                this.emit('error', error);
                return false;
            }
        }, { operation: 'connect', url: serverUrl || getWebSocketUrl() });
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

        this.heartbeatTimer = setInterval(() => {
            if (this.isConnected()) {
                this.sendMessage('heartbeat', { timestamp: Date.now() });
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
    private handleStreamStarted(streamData: StreamConnection): void {
        this.activeStreams.set(streamData.id, streamData);
        streamingLogger.logWebSocketEvent('Stream started', { streamId: streamData.id });
        this.emit('stream_started', streamData);
    }

    // 스트림 중지 처리
    private handleStreamStopped(streamId: string): void {
        this.activeStreams.delete(streamId);
        streamingLogger.logWebSocketEvent('Stream stopped', { streamId });
        this.emit('stream_stopped', streamId);
    }

    // 뷰어 참여 처리
    private handleViewerJoined(data: { streamId: string; viewerId: string }): void {
        const stream = this.activeStreams.get(data.streamId);
        if (stream) {
            streamingLogger.logWebSocketEvent('Viewer joined', data);
            this.emit('viewer_joined', data);
        }
    }

    // 뷰어 퇴장 처리
    private handleViewerLeft(data: { streamId: string; viewerId: string }): void {
        streamingLogger.logWebSocketEvent('Viewer left', data);
        this.emit('viewer_left', data);
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

    // 메시지 전송
    private sendMessage(type: string, data: any): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message = { type, data, timestamp: Date.now() };
            this.ws.send(JSON.stringify(message));
            streamingLogger.debug('Message sent', { type, data });
        } else {
            streamingLogger.warn('WebSocket not connected, cannot send message', { type });
        }
    }

    // 카메라 등록 (홈캠 모드)
    registerCamera(cameraId: string, cameraName: string): boolean {
        if (!this.isConnected()) {
            streamingLogger.warn('Cannot register camera: WebSocket not connected');
            return false;
        }

        this.sendMessage('register_camera', {
            id: cameraId,
            name: cameraName,
            timestamp: Date.now()
        });

        streamingLogger.logUserAction('Camera registered', { cameraId, cameraName });
        return true;
    }

    // 카메라 연결 해제
    unregisterCamera(cameraId: string): boolean {
        if (!this.isConnected()) {
            streamingLogger.warn('Cannot unregister camera: WebSocket not connected');
            return false;
        }

        this.sendMessage('unregister_camera', { id: cameraId });
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
                this.sendMessage('start_stream', {
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
    stopStream(cameraId: string): boolean {
        if (!this.isConnected()) {
            streamingLogger.warn('Cannot stop stream: WebSocket not connected');
            return false;
        }

        this.sendMessage('stop_stream', { cameraId });
        streamingLogger.logUserAction('Stream stopped', { cameraId });
        return true;
    }

    // 뷰어로 스트림 참여 (뷰어 모드)
    async joinStream(cameraId: string, viewerId: string): Promise<boolean> {
        return withErrorHandling(async () => {
            streamingLogger.logUserAction('Join stream', { cameraId, viewerId });

            try {
                // WebRTC 스트림 시청 시작
                await webrtcService.startViewing(cameraId, viewerId);

                // 서버에 스트림 참여 알림
                this.sendMessage('join_stream', {
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
    leaveStream(cameraId: string, viewerId: string): boolean {
        if (!this.isConnected()) {
            streamingLogger.warn('Cannot leave stream: WebSocket not connected');
            return false;
        }

        this.sendMessage('leave_stream', { cameraId, viewerId });
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
        return this.ws?.readyState === WebSocket.OPEN;
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


