/**
 * 시그널링 서비스 - WebSocket 기반 WebRTC 시그널링
 * 
 * 핵심 기능:
 * - WebSocket 연결 관리
 * - WebRTC 시그널링 메시지 교환
 * - 카메라/뷰어 등록 및 상태 관리
 * - 자동 재연결 및 에러 처리
 */

import { createLogger } from '@/shared/utils/logger';
import { withErrorHandling, createNetworkError } from '@/shared/utils/errorHandler';
import config from '@/app/config';
import { SignalingMessage } from './webrtcService';

// 시그널링 서비스 로거
const signalingLogger = createLogger('SignalingService');

// WebSocket 메시지 타입
export type SignalingMessageType =
    | 'ping'
    | 'heartbeat'
    | 'register_camera'
    | 'unregister_camera'
    | 'start_stream'
    | 'stop_stream'
    | 'join_stream'
    | 'leave_stream'
    | 'webrtc_signaling'
    | 'camera_status_update'
    | 'viewer_status_update';

// WebSocket 메시지 인터페이스
export interface WebSocketMessage {
    type: SignalingMessageType;
    data: any;
}

// 연결 상태 타입
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

// 시그널링 이벤트 타입
export type SignalingEvent =
    | 'connected'
    | 'disconnected'
    | 'reconnecting'
    | 'failed'
    | 'message'
    | 'camera_registered'
    | 'stream_started'
    | 'stream_joined'
    | 'viewer_joined'
    | 'viewer_left'
    | 'viewer_count_update'
    | 'webrtc_signaling'
    | 'error';

// 시그널링 이벤트 리스너
export type SignalingEventListener = (event: SignalingEvent, data?: any) => void;

class SignalingService {
    private ws: WebSocket | null = null;
    private connectionState: ConnectionState = 'disconnected';
    private clientId: string | null = null;
    private eventListeners: SignalingEventListener[] = [];
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000; // 1초
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private isConnecting = false;

    // WebSocket 서버 URL
    private wsUrl: string;
    private baseWsUrl: string;

    constructor() {
        // 환경별 WebSocket URL 설정 (항상 분리된 서버: 8080 우선)
        const protocol = (config as any).getConfig?.().websocket?.secure ? 'wss' : 'ws';
        const base = (config as any).getWsBaseUrl ? (config as any).getWsBaseUrl() : undefined;

        const normalizeTo8080 = (urlStr: string): string => {
            try {
                const u = new URL(urlStr);
                // 분리 서버 강제 8080
                u.port = u.port && u.port !== '8080' ? '8080' : (u.port || '8080');
                return u.toString();
            } catch {
                return `${protocol}://localhost:8080`;
            }
        };

        const initial = base ? normalizeTo8080(base) : `${protocol}://localhost:8080`;
        this.baseWsUrl = initial;
        this.wsUrl = initial;

        signalingLogger.info('시그널링 서비스 초기화됨', { url: this.wsUrl });
    }

    // 이벤트 리스너 등록
    addEventListener(listener: SignalingEventListener): void {
        this.eventListeners.push(listener);
    }

    // 이벤트 리스너 제거
    removeEventListener(listener: SignalingEventListener): void {
        this.eventListeners = this.eventListeners.filter(l => l !== listener);
    }

    // 이벤트 발생
    private emitEvent(event: SignalingEvent, data?: any): void {
        signalingLogger.debug(`시그널링 이벤트: ${event}`, data);
        this.eventListeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (error) {
                signalingLogger.error('이벤트 리스너 실행 오류:', error as Error);
            }
        });
    }

    // WebSocket 연결
    async connect(): Promise<void> {
        return withErrorHandling(async () => {
            if (this.isConnecting || this.connectionState === 'connected') {
                return;
            }

            this.isConnecting = true;
            this.setConnectionState('connecting');

            signalingLogger.logUserAction('WebSocket 연결 시도', { url: this.wsUrl });

            try {
                // 최신 URL 동기화 (실시간 환경변수/자동감지 반영)
                const currentBase = (config as any).getWsBaseUrl ? (config as any).getWsBaseUrl() : undefined;
                if (currentBase) {
                    try {
                        const u = new URL(currentBase);
                        u.port = u.port && u.port !== '8080' ? '8080' : (u.port || '8080');
                        this.baseWsUrl = u.toString();
                    } catch {
                        this.baseWsUrl = currentBase;
                    }
                }

                // 사전 헬스체크: 실패해도 연결은 시도 (경고만)
                try {
                    const apiBase = (config as any).getApiBaseUrl ? (config as any).getApiBaseUrl() : undefined;
                    if (apiBase) {
                        const controller = new AbortController();
                        const t = setTimeout(() => controller.abort(), 5000);
                        const res = await fetch(`${apiBase}/health`, { signal: controller.signal });
                        clearTimeout(t);
                        if (!res || !res.ok) {
                            signalingLogger.warn('헬스체크 실패, WS 연결을 계속 시도합니다');
                        }
                    }
                } catch (e) {
                    signalingLogger.warn('헬스체크 예외, WS 연결을 계속 시도합니다');
                }

                // 분리된 WebSocket 서버는 토큰 인증이 필요 없음
                const connectUrl = this.baseWsUrl;
                signalingLogger.info('토큰 인증 없이 WebSocket 연결', { url: connectUrl });

                this.ws = new WebSocket(connectUrl);
                this.wsUrl = connectUrl; // 로깅 일관성

                this.ws.onopen = this.handleOpen.bind(this);
                this.ws.onmessage = this.handleMessage.bind(this);
                this.ws.onclose = this.handleClose.bind(this);
                this.ws.onerror = this.handleError.bind(this);

                // 연결 타임아웃 설정 (10초)
                setTimeout(() => {
                    if (this.connectionState === 'connecting') {
                        signalingLogger.warn('WebSocket 연결 타임아웃');
                        this.disconnect();
                        this.setConnectionState('failed');
                    }
                }, 10000);

            } catch (error) {
                this.isConnecting = false;
                this.setConnectionState('failed');
                throw createNetworkError('WebSocket 연결 실패', error as Error);
            }
        }, { operation: 'signaling_connect' });
    }

    // WebSocket 연결 해제
    disconnect(): void {
        try {
            signalingLogger.logUserAction('WebSocket 연결 해제');

            this.stopHeartbeat();
            this.reconnectAttempts = 0;

            if (this.ws) {
                this.ws.close(1000, 'User disconnect');
                this.ws = null;
            }

            this.setConnectionState('disconnected');
            this.clientId = null;
            this.isConnecting = false;

        } catch (error) {
            signalingLogger.error('WebSocket 연결 해제 오류:', error as Error);
        }
    }

    // 메시지 전송
    async sendMessage(message: WebSocketMessage): Promise<void> {
        return withErrorHandling(async () => {
            if (!this.ws || this.connectionState !== 'connected') {
                throw createNetworkError('WebSocket이 연결되지 않았습니다.');
            }

            const messageStr = JSON.stringify(message);
            signalingLogger.debug('메시지 전송:', message.type, message.data);

            this.ws.send(messageStr);
        }, { operation: 'signaling_send_message', message: message.type });
    }

    // WebRTC 시그널링 메시지 전송
    async sendSignalingMessage(signalingMessage: SignalingMessage): Promise<void> {
        return this.sendMessage({
            type: 'webrtc_signaling',
            data: {
                from: signalingMessage.from,
                to: signalingMessage.to,
                type: signalingMessage.type,
                data: signalingMessage.data
            }
        });
    }

    // 카메라 등록
    async registerCamera(cameraId: string, cameraName: string): Promise<void> {
        return this.sendMessage({
            type: 'register_camera',
            data: {
                id: cameraId,
                name: cameraName
            }
        });
    }

    // 카메라 등록 해제
    async unregisterCamera(cameraId: string): Promise<void> {
        return this.sendMessage({
            type: 'unregister_camera',
            data: { id: cameraId }
        });
    }

    // 스트림 시작
    async startStream(cameraId: string): Promise<void> {
        return this.sendMessage({
            type: 'start_stream',
            data: { cameraId }
        });
    }

    // 스트림 중지
    async stopStream(cameraId: string): Promise<void> {
        return this.sendMessage({
            type: 'stop_stream',
            data: { cameraId }
        });
    }

    // 스트림 참여 (뷰어)
    async joinStream(cameraId: string, viewerId: string): Promise<void> {
        return this.sendMessage({
            type: 'join_stream',
            data: { cameraId, viewerId }
        });
    }

    // 스트림 퇴장 (뷰어)
    async leaveStream(cameraId: string, viewerId: string): Promise<void> {
        return this.sendMessage({
            type: 'leave_stream',
            data: { cameraId, viewerId }
        });
    }

    // 상태 업데이트
    async updateCameraStatus(cameraId: string, status: string): Promise<void> {
        return this.sendMessage({
            type: 'camera_status_update',
            data: { cameraId, status }
        });
    }

    async updateViewerStatus(viewerId: string, cameraId: string, status: string): Promise<void> {
        return this.sendMessage({
            type: 'viewer_status_update',
            data: { viewerId, cameraId, status }
        });
    }

    // 연결 상태 조회
    getConnectionState(): ConnectionState {
        return this.connectionState;
    }

    // 클라이언트 ID 조회
    getClientId(): string | null {
        return this.clientId;
    }

    // 연결 상태 설정
    private setConnectionState(state: ConnectionState): void {
        if (this.connectionState !== state) {
            const oldState = this.connectionState;
            this.connectionState = state;

            signalingLogger.info('연결 상태 변경:', { from: oldState, to: state });
            // 상태별 올바른 이벤트 방출
            if (state === 'connected') {
                this.emitEvent('connected');
            } else if (state === 'disconnected') {
                this.emitEvent('disconnected');
            } else if (state === 'reconnecting') {
                this.emitEvent('reconnecting');
            } else if (state === 'failed') {
                this.emitEvent('failed');
            } else {
                // 'connecting' 상태는 별도 이벤트를 방출하지 않습니다.
            }
        }
    }

    // WebSocket 이벤트 핸들러
    private handleOpen(): void {
        signalingLogger.info('WebSocket 연결 성공');

        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.setConnectionState('connected');
        this.startHeartbeat();
    }

    private handleMessage(event: MessageEvent): void {
        try {
            const message = JSON.parse(event.data) as WebSocketMessage;
            signalingLogger.debug('메시지 수신:', message.type, message.data);

            switch (message.type) {
                case 'client_id':
                    this.clientId = message.data.clientId;
                    signalingLogger.info('클라이언트 ID 수신:', this.clientId);
                    break;

                case 'pong':
                    // 하트비트 응답
                    break;

                case 'camera_registered':
                    this.emitEvent('camera_registered', message.data);
                    break;

                case 'stream_started':
                    this.emitEvent('stream_started', message.data);
                    break;

                case 'stream_joined':
                    this.emitEvent('stream_joined', message.data);
                    break;

                case 'viewer_joined':
                    this.emitEvent('viewer_joined', message.data);
                    break;

                case 'viewer_left':
                    this.emitEvent('viewer_left', message.data);
                    break;

                case 'viewer_count_update':
                    this.emitEvent('viewer_count_update', message.data);
                    break;

                case 'webrtc_signaling':
                    this.emitEvent('webrtc_signaling', message.data);
                    break;

                case 'error':
                    signalingLogger.error('서버 오류:', message.data);
                    this.emitEvent('error', message.data);
                    break;

                default:
                    this.emitEvent('message', message);
            }

        } catch (error) {
            signalingLogger.error('메시지 파싱 오류:', error as Error);
        }
    }

    private handleClose(event: CloseEvent): void {
        signalingLogger.info('WebSocket 연결 종료:', { code: event.code, reason: event.reason });

        this.isConnecting = false;
        this.stopHeartbeat();
        this.setConnectionState('disconnected');

        // 비정상 종료 시 재연결 시도
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
        }
    }

    private handleError(event: Event): void {
        signalingLogger.error('WebSocket 오류:', event);

        this.isConnecting = false;
        this.setConnectionState('failed');
        this.emitEvent('failed', event);
    }

    // 재연결 시도
    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            signalingLogger.error('최대 재연결 시도 횟수 초과');
            this.setConnectionState('failed');
            return;
        }

        this.reconnectAttempts++;
        const baseDelay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // 지수 백오프
        const jitter = Math.floor(Math.random() * 300);
        const delay = baseDelay + jitter;

        signalingLogger.info(`재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`, { delay });
        this.setConnectionState('reconnecting');

        setTimeout(() => {
            if (this.connectionState === 'reconnecting') {
                this.connect().catch(error => {
                    signalingLogger.error('재연결 실패:', error);
                });
            }
        }, delay);
    }

    // 하트비트 시작
    private startHeartbeat(): void {
        this.stopHeartbeat();

        this.heartbeatInterval = setInterval(() => {
            if (this.connectionState === 'connected') {
                this.sendMessage({ type: 'heartbeat', data: {} }).catch(error => {
                    signalingLogger.warn('하트비트 전송 실패:', error);
                });
            }
        }, 30000); // 30초마다 하트비트
    }

    // 하트비트 중지
    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // 리소스 정리
    cleanup(): void {
        this.disconnect();
        this.eventListeners = [];
        signalingLogger.info('시그널링 서비스 정리 완료');
    }
}

// 싱글톤 인스턴스
export const signalingService = new SignalingService();
export default signalingService;
