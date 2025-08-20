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

import { SignalingMessage, webrtcService } from './webrtcService';

export interface StreamConnection {
    id: string;
    cameraId: string;
    viewerId: string;
    status: 'connecting' | 'connected' | 'disconnected' | 'error';
    timestamp: number;
}

export interface CameraStream {
    id: string;
    name: string;
    status: 'online' | 'offline' | 'streaming';
    viewers: string[];
    streamUrl?: string;
}

class StreamingService extends EventEmitter {
    private ws: WebSocket | null = null;
    private isConnecting = false;

    // 연결된 카메라 목록
    private connectedCameras: Map<string, CameraStream> = new Map();

    // 활성 스트림 연결
    private activeStreams: Map<string, StreamConnection> = new Map();

    constructor() {
        super();

        // WebRTC 시그널링 콜백 설정
        webrtcService.setSignalingCallback((message: SignalingMessage) => {
            this.sendMessage('webrtc_signaling', message);
        });
    }

    // 동적 IP 감지 함수
    private async getLocalIPAddress(): Promise<string> {
        try {
            // Expo Go에서 실행 중인 경우 자동으로 감지된 IP 사용
            if (__DEV__) {
                // 개발 환경에서는 실제 네트워크 IP 사용
                // 현재 감지된 IP: 192.168.123.105
                return '192.168.123.105';
            }
            return 'localhost';
        } catch (error) {
            console.warn('IP 감지 실패, 기본 IP 사용:', error);
            return '192.168.123.105'; // 기본값으로 실제 IP 사용
        }
    }

    // WebSocket 연결 초기화
    async connect(serverUrl?: string): Promise<boolean> {
        if (this.isConnecting) return false;

        // 환경별 WebSocket URL 설정
        const getWebSocketUrl = async (): Promise<string> => {
            if (serverUrl) return serverUrl;

            // 환경 변수로 우선 설정
            if (process.env.EXPO_PUBLIC_WS_URL) {
                return process.env.EXPO_PUBLIC_WS_URL;
            }

            // 환경별 기본값
            if (__DEV__) {
                // 개발 환경: 동적으로 IP 감지
                const localIP = await this.getLocalIPAddress();
                return `ws://${localIP}:8080`;
            }

            if (process.env.EXPO_PUBLIC_ENV === 'staging') {
                return 'wss://staging-ws.mimo-camera.com';
            }

            return 'wss://ws.mimo-camera.com'; // 프로덕션
        };

        const wsUrl = await getWebSocketUrl();
        console.log('🔌 WebSocket 연결 시도:', wsUrl);
        this.isConnecting = true;

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('🔗 WebSocket 연결 성공');
                this.isConnecting = false;
                this.emit('connected');
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(JSON.parse(event.data));
            };

            this.ws.onclose = () => {
                console.log('🔌 WebSocket 연결 종료');
                this.isConnecting = false;
                this.emit('disconnected');
            };

            this.ws.onerror = (error) => {
                console.error('❌ WebSocket 오류:', error);
                this.isConnecting = false;
                this.emit('error', error);
            };

            return true;
        } catch (error) {
            console.error('❌ WebSocket 연결 실패:', error);
            this.isConnecting = false;
            return false;
        }
    }

    // 메시지 처리
    private handleMessage(message: any) {
        switch (message.type) {
            case 'camera_connected':
                this.handleCameraConnected(message.data);
                break;
            case 'camera_disconnected':
                this.handleCameraDisconnected(message.data);
                break;
            case 'stream_started':
                this.handleStreamStarted(message.data);
                break;
            case 'stream_stopped':
                this.handleStreamStopped(message.data);
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
            default:
                console.log('📨 알 수 없는 메시지:', message);
        }
    }

    // 카메라 연결 처리
    private handleCameraConnected(cameraData: CameraStream) {
        this.connectedCameras.set(cameraData.id, cameraData);
        this.emit('cameraConnected', cameraData);
    }

    // 카메라 연결 해제 처리
    private handleCameraDisconnected(cameraId: string) {
        this.connectedCameras.delete(cameraId);
        this.emit('cameraDisconnected', cameraId);
    }

    // 스트림 시작 처리
    private handleStreamStarted(streamData: StreamConnection) {
        this.activeStreams.set(streamData.id, streamData);
        this.emit('streamStarted', streamData);
    }

    // 스트림 중지 처리
    private handleStreamStopped(streamId: string) {
        this.activeStreams.delete(streamId);
        this.emit('streamStopped', streamId);
    }

    // 뷰어 참여 처리
    private handleViewerJoined(data: { streamId: string; viewerId: string }) {
        const stream = this.activeStreams.get(data.streamId);
        if (stream) {
            this.emit('viewerJoined', data);
        }
    }

    // 뷰어 퇴장 처리
    private handleViewerLeft(data: { streamId: string; viewerId: string }) {
        this.emit('viewerLeft', data);
    }

    // WebRTC 시그널링 처리
    private handleWebRTCSignaling(data: SignalingMessage) {
        try {
            webrtcService.handleSignalingMessage(data);
        } catch (error) {
            console.error('❌ WebRTC 시그널링 처리 실패:', error);
        }
    }

    // 수동 재연결 메서드
    reconnect() {
        if (this.isConnecting) {
            console.log('🔄 이미 연결 시도 중입니다.');
            return false;
        }

        console.log('🔄 수동 재연결 시도');
        return this.connect();
    }

    // 메시지 전송
    private sendMessage(type: string, data: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, data }));
        } else {
            console.error('❌ WebSocket이 연결되지 않음');
        }
    }

    // 카메라 등록 (홈캠 모드)
    registerCamera(cameraId: string, cameraName: string): boolean {
        this.sendMessage('register_camera', {
            id: cameraId,
            name: cameraName,
            timestamp: Date.now()
        });
        return true;
    }

    // 카메라 연결 해제
    unregisterCamera(cameraId: string): boolean {
        this.sendMessage('unregister_camera', { id: cameraId });
        return true;
    }

    // 스트림 시작 (홈캠 모드)
    async startStream(cameraId: string, viewerId: string): Promise<boolean> {
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
            console.error('❌ 스트림 시작 실패:', error);
            return false;
        }
    }

    // 스트림 중지 (홈캠 모드)
    stopStream(cameraId: string): boolean {
        this.sendMessage('stop_stream', { cameraId });
        return true;
    }

    // 뷰어로 스트림 참여 (뷰어 모드)
    async joinStream(cameraId: string, viewerId: string): Promise<boolean> {
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
            console.error('❌ 스트림 참여 실패:', error);
            return false;
        }
    }

    // 스트림에서 나가기 (뷰어 모드)
    leaveStream(cameraId: string, viewerId: string): boolean {
        this.sendMessage('leave_stream', {
            cameraId,
            viewerId
        });
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

    // 연결 상태 확인
    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    // 연결 종료
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
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
}

// 싱글톤 인스턴스
export const streamingService = new StreamingService();
export default streamingService;

