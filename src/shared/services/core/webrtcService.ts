import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import { createLogger } from '@/shared/utils/logger';
import { withErrorHandling, createNetworkError, createTimeoutError } from '@/shared/utils/errorHandler';
import config from '@/app/config';

// WebRTC 서비스 로거
const webrtcLogger = createLogger('WebRTCService');

// WebRTC 라이브러리 import (개발 빌드에서만 사용 가능)
let MediaStream: any, RTCPeerConnection: any, RTCSessionDescription: any, RTCIceCandidate: any;

try {
    const WebRTC = require('react-native-webrtc');
    MediaStream = WebRTC.MediaStream;
    RTCPeerConnection = WebRTC.RTCPeerConnection;
    RTCSessionDescription = WebRTC.RTCSessionDescription;
    RTCIceCandidate = WebRTC.RTCIceCandidate;
} catch (error) {
    webrtcLogger.warn('WebRTC library not available (Expo Go mode)');
    // Expo Go에서는 모킹 사용
    MediaStream = class MockMediaStream {
        id = 'mock-stream';
        getTracks() { return []; }
        toURL() { return 'mock://stream'; }
    };
    RTCPeerConnection = class MockRTCPeerConnection {
        constructor() { }
        addTrack() { }
        async createOffer() { return { type: 'offer', sdp: 'mock-sdp' }; }
        async createAnswer() { return { type: 'answer', sdp: 'mock-sdp' }; }
        async setLocalDescription() { }
        async setRemoteDescription() { }
        async addIceCandidate() { }
        onicecandidate = null;
        onconnectionstatechange = null;
        ontrack = null;
        connectionState = 'new';
        close() { }
    };
    RTCSessionDescription = class MockRTCSessionDescription {
        constructor(init: any) {
            Object.assign(this, init);
        }
    };
    RTCIceCandidate = class MockRTCIceCandidate {
        constructor(init: any) {
            Object.assign(this, init);
        }
    };
}

// WebRTC 스트림 인터페이스
export interface WebRTCStream {
    id: string;
    peerConnection?: any;
    localStream?: any;
    remoteStream?: any;
    isConnected: boolean;
    isStreaming: boolean;
    onStreamReceived?: (stream: any) => void;
    metadata?: {
        cameraId: string;
        viewerId: string;
        quality: string;
        frameRate: number;
        bitrate: number;
    };
    stats?: {
        bytesReceived: number;
        bytesSent: number;
        packetsReceived: number;
        packetsSent: number;
        roundTripTime: number;
    };
}

// 시그널링 메시지 인터페이스
export interface SignalingMessage {
    type: 'offer' | 'answer' | 'ice-candidate' | 'stream-start' | 'stream-stop';
    from: string;
    to: string;
    data: any;
}

// 연결 상태 타입
export type ConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';

// WebRTC 이벤트 타입
export type WebRTCEvent =
    | 'stream_created'
    | 'stream_destroyed'
    | 'connection_state_changed'
    | 'ice_connection_state_changed'
    | 'signaling_state_changed'
    | 'track_added'
    | 'track_removed'
    | 'ice_candidate'
    | 'offer_created'
    | 'answer_created'
    | 'error';

// WebRTC 이벤트 리스너
export type WebRTCEventListener = (event: WebRTCEvent, streamId: string, data?: any) => void;

class WebRTCService {
    private peerConnections: Map<string, WebRTCStream> = new Map();
    private localStream: any = null;
    private signalingCallback?: (message: SignalingMessage) => void;
    private camera: Camera | null = null;
    private isExpoGo: boolean = false;
    private eventListeners: WebRTCEventListener[] = [];

    // STUN/TURN 서버 설정
    private readonly rtcConfiguration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            // TURN 서버는 프로덕션에서 추가
            // {
            //     urls: 'turn:your-turn-server.com:3478',
            //     username: 'username',
            //     credential: 'password'
            // }
        ],
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle' as const,
        rtcpMuxPolicy: 'require' as const,
    };

    constructor() {
        // Expo Go 환경 감지
        this.isExpoGo = !RTCPeerConnection || RTCPeerConnection.name === 'MockRTCPeerConnection';
        webrtcLogger.info(`WebRTC service initialized: ${this.isExpoGo ? 'Expo Go mode' : 'Development build mode'}`);
    }

    // 이벤트 리스너 등록
    addEventListener(listener: WebRTCEventListener): void {
        this.eventListeners.push(listener);
    }

    // 이벤트 리스너 제거
    removeEventListener(listener: WebRTCEventListener): void {
        this.eventListeners = this.eventListeners.filter(l => l !== listener);
    }

    // 이벤트 발생
    private emitEvent(event: WebRTCEvent, streamId: string, data?: any): void {
        webrtcLogger.debug(`WebRTC event: ${event}`, { streamId, data });
        this.eventListeners.forEach(listener => listener(event, streamId, data));
    }

    // 시그널링 콜백 설정
    setSignalingCallback(callback: (message: SignalingMessage) => void) {
        this.signalingCallback = callback;
    }

    // 카메라 참조 설정
    setCameraRef(camera: Camera) {
        this.camera = camera;
    }

    // 로컬 스트림 초기화
    async initializeLocalStream(): Promise<any> {
        return withErrorHandling(async () => {
            webrtcLogger.logUserAction('Initialize local stream');

            // 카메라 권한 확인
            const { status } = await Camera.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                throw new Error('카메라 권한이 필요합니다.');
            }

            // 마이크 권한 확인
            const audioPermission = await Audio.requestPermissionsAsync();
            if (audioPermission.status !== 'granted') {
                throw new Error('마이크 권한이 필요합니다.');
            }

            if (this.isExpoGo) {
                // Expo Go에서는 모킹된 스트림 생성
                this.localStream = new MediaStream();
                webrtcLogger.info('Local stream initialized (Expo Go mode)');
                return this.localStream;
            } else {
                // 개발 빌드에서는 실제 카메라 스트림 생성
                if (this.camera) {
                    const stream = await this.camera.getStreamAsync();
                    this.localStream = stream;
                    webrtcLogger.info('Local stream initialized (Development build mode)');
                    return stream;
                } else {
                    throw new Error('카메라 참조가 설정되지 않았습니다.');
                }
            }
        }, { operation: 'initialize_local_stream' });
    }

    // 스트림 시작 (홈캠 모드)
    async startStreaming(cameraId: string, viewerId: string): Promise<WebRTCStream> {
        return withErrorHandling(async () => {
            webrtcLogger.logUserAction('Start streaming', { cameraId, viewerId });

            if (!this.localStream) {
                await this.initializeLocalStream();
            }

            // 고유한 스트림 ID 생성 (양방향 매칭 지원)
            const streamId = this.generateStreamId(cameraId, viewerId);

            // RTCPeerConnection 생성
            const peerConnection = new RTCPeerConnection(this.rtcConfiguration);

            if (!this.isExpoGo) {
                // 개발 빌드에서만 실제 스트림 추가
                if (this.localStream) {
                    this.localStream.getTracks().forEach((track: any) => {
                        peerConnection.addTrack(track, this.localStream);
                    });
                }
            }

            // ICE 후보 이벤트 처리
            peerConnection.onicecandidate = (event: any) => {
                if (event.candidate) {
                    const message: SignalingMessage = {
                        type: 'ice-candidate',
                        from: cameraId,
                        to: viewerId,
                        data: event.candidate,
                    };
                    this.sendSignalingMessage(message);
                    this.emitEvent('ice_candidate', streamId, event.candidate);
                }
            };

            // 연결 상태 변경 이벤트
            peerConnection.onconnectionstatechange = () => {
                const state = peerConnection.connectionState;
                webrtcLogger.info('Connection state changed', { streamId, state });
                this.emitEvent('connection_state_changed', streamId, state);

                const webRTCStream = this.peerConnections.get(streamId);
                if (webRTCStream) {
                    webRTCStream.isConnected = state === 'connected';
                }
            };

            // ICE 연결 상태 변경 이벤트
            peerConnection.oniceconnectionstatechange = () => {
                const state = peerConnection.iceConnectionState;
                webrtcLogger.info('ICE connection state changed', { streamId, state });
                this.emitEvent('ice_connection_state_changed', streamId, state);
            };

            // 시그널링 상태 변경 이벤트
            peerConnection.onsignalingstatechange = () => {
                const state = peerConnection.signalingState;
                webrtcLogger.info('Signaling state changed', { streamId, state });
                this.emitEvent('signaling_state_changed', streamId, state);
            };

            // 원격 스트림 수신 이벤트
            peerConnection.ontrack = (event: any) => {
                webrtcLogger.info('Remote stream received', { streamId });
                this.emitEvent('track_added', streamId, event);

                const webRTCStream = this.peerConnections.get(streamId);
                if (webRTCStream) {
                    webRTCStream.remoteStream = event.streams[0];
                    webRTCStream.onStreamReceived?.(event.streams[0]);
                }
            };

            // Offer 생성 및 전송
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            const message: SignalingMessage = {
                type: 'offer',
                from: cameraId,
                to: viewerId,
                data: offer,
            };
            this.sendSignalingMessage(message);
            this.emitEvent('offer_created', streamId, offer);

            const webRTCStream: WebRTCStream = {
                id: streamId,
                peerConnection,
                localStream: this.localStream,
                isConnected: false,
                isStreaming: true,
                metadata: {
                    cameraId,
                    viewerId,
                    quality: 'medium',
                    frameRate: 30,
                    bitrate: 2000000,
                },
            };

            this.peerConnections.set(streamId, webRTCStream);
            this.emitEvent('stream_created', streamId, webRTCStream);

            return webRTCStream;
        }, { operation: 'start_streaming', cameraId, viewerId });
    }

    // 스트림 시청 시작 (뷰어 모드)
    async startViewing(cameraId: string, viewerId: string): Promise<WebRTCStream> {
        return withErrorHandling(async () => {
            webrtcLogger.logUserAction('Start viewing', { cameraId, viewerId });

            // 고유한 스트림 ID 생성 (양방향 매칭 지원)
            const streamId = this.generateStreamId(cameraId, viewerId);

            // RTCPeerConnection 생성
            const peerConnection = new RTCPeerConnection(this.rtcConfiguration);

            // ICE 후보 이벤트 처리
            peerConnection.onicecandidate = (event: any) => {
                if (event.candidate) {
                    const message: SignalingMessage = {
                        type: 'ice-candidate',
                        from: viewerId,
                        to: cameraId,
                        data: event.candidate,
                    };
                    this.sendSignalingMessage(message);
                    this.emitEvent('ice_candidate', streamId, event.candidate);
                }
            };

            // 연결 상태 변경 이벤트
            peerConnection.onconnectionstatechange = () => {
                const state = peerConnection.connectionState;
                webrtcLogger.info('Connection state changed', { streamId, state });
                this.emitEvent('connection_state_changed', streamId, state);

                const webRTCStream = this.peerConnections.get(streamId);
                if (webRTCStream) {
                    webRTCStream.isConnected = state === 'connected';
                }
            };

            // ICE 연결 상태 변경 이벤트
            peerConnection.oniceconnectionstatechange = () => {
                const state = peerConnection.iceConnectionState;
                webrtcLogger.info('ICE connection state changed', { streamId, state });
                this.emitEvent('ice_connection_state_changed', streamId, state);
            };

            // 시그널링 상태 변경 이벤트
            peerConnection.onsignalingstatechange = () => {
                const state = peerConnection.signalingState;
                webrtcLogger.info('Signaling state changed', { streamId, state });
                this.emitEvent('signaling_state_changed', streamId, state);
            };

            // 원격 스트림 수신 이벤트
            peerConnection.ontrack = (event: any) => {
                webrtcLogger.info('Remote stream received', { streamId });
                this.emitEvent('track_added', streamId, event);

                const webRTCStream = this.peerConnections.get(streamId);
                if (webRTCStream) {
                    webRTCStream.remoteStream = event.streams[0];
                    webRTCStream.onStreamReceived?.(event.streams[0]);
                }
            };

            const webRTCStream: WebRTCStream = {
                id: streamId,
                peerConnection,
                isConnected: false,
                isStreaming: false,
                metadata: {
                    cameraId,
                    viewerId,
                    quality: 'medium',
                    frameRate: 30,
                    bitrate: 2000000,
                },
            };

            this.peerConnections.set(streamId, webRTCStream);
            this.emitEvent('stream_created', streamId, webRTCStream);

            return webRTCStream;
        }, { operation: 'start_viewing', cameraId, viewerId });
    }

    // 시그널링 메시지 처리
    async handleSignalingMessage(message: SignalingMessage): Promise<void> {
        return withErrorHandling(async () => {
            const { type, from, to, data } = message;

            // 양방향 스트림 ID 매칭
            const streamId1 = this.generateStreamId(from, to);
            const streamId2 = this.generateStreamId(to, from);

            let webRTCStream = this.peerConnections.get(streamId1) || this.peerConnections.get(streamId2);

            if (!webRTCStream || !webRTCStream.peerConnection) {
                webrtcLogger.warn('Unknown stream for signaling message', { from, to, type });
                return;
            }

            webrtcLogger.debug('Handle signaling message', { type, streamId: webRTCStream.id });

            switch (type) {
                case 'offer':
                    await webRTCStream.peerConnection.setRemoteDescription(
                        new RTCSessionDescription(data)
                    );

                    // Answer 생성 및 전송
                    const answer = await webRTCStream.peerConnection.createAnswer();
                    await webRTCStream.peerConnection.setLocalDescription(answer);

                    const responseMessage: SignalingMessage = {
                        type: 'answer',
                        from: to,
                        to: from,
                        data: answer,
                    };
                    this.sendSignalingMessage(responseMessage);
                    this.emitEvent('answer_created', webRTCStream.id, answer);
                    break;

                case 'answer':
                    await webRTCStream.peerConnection.setRemoteDescription(
                        new RTCSessionDescription(data)
                    );
                    break;

                case 'ice-candidate':
                    await webRTCStream.peerConnection.addIceCandidate(
                        new RTCIceCandidate(data)
                    );
                    break;

                case 'stream-start':
                    webrtcLogger.info('Stream start notification', { streamId: webRTCStream.id });
                    webRTCStream.isStreaming = true;
                    break;

                case 'stream-stop':
                    this.stopStream(webRTCStream.id);
                    break;

                default:
                    webrtcLogger.warn('Unknown signaling type', { type, from, to });
            }
        }, { operation: 'handle_signaling_message', message });
    }

    // 스트림 중지
    stopStream(streamId: string): void {
        try {
            const webRTCStream = this.peerConnections.get(streamId);
            if (webRTCStream) {
                webrtcLogger.logUserAction('Stop stream', { streamId });

                if (webRTCStream.peerConnection) {
                    webRTCStream.peerConnection.close();
                }

                webRTCStream.isConnected = false;
                webRTCStream.isStreaming = false;
                this.peerConnections.delete(streamId);

                this.emitEvent('stream_destroyed', streamId);
            }
        } catch (error) {
            webrtcLogger.error('Failed to stop stream', error as Error, { streamId });
        }
    }

    // 모든 스트림 중지
    stopAllStreams(): void {
        try {
            webrtcLogger.logUserAction('Stop all streams');

            this.peerConnections.forEach((stream, streamId) => {
                if (stream.peerConnection) {
                    stream.peerConnection.close();
                }
            });
            this.peerConnections.clear();

            // 로컬 스트림 정리
            if (this.localStream) {
                this.localStream.getTracks().forEach((track: any) => track.stop());
                this.localStream = null;
            }

            webrtcLogger.info('All streams stopped');
        } catch (error) {
            webrtcLogger.error('Failed to stop all streams', error as Error);
        }
    }

    // 스트림 상태 조회
    getStreamStatus(streamId: string): WebRTCStream | undefined {
        return this.peerConnections.get(streamId);
    }

    // 모든 스트림 상태 조회
    getAllStreams(): WebRTCStream[] {
        return Array.from(this.peerConnections.values());
    }

    // 연결된 스트림 수 조회
    getConnectedStreamCount(): number {
        return Array.from(this.peerConnections.values()).filter(
            stream => stream.isConnected
        ).length;
    }

    // 스트림 통계 조회
    async getStreamStats(streamId: string): Promise<any> {
        try {
            const webRTCStream = this.peerConnections.get(streamId);
            if (webRTCStream?.peerConnection) {
                const stats = await webRTCStream.peerConnection.getStats();
                return stats;
            }
            return null;
        } catch (error) {
            webrtcLogger.error('Failed to get stream stats', error as Error, { streamId });
            return null;
        }
    }

    // 고유 스트림 ID 생성 (양방향 매칭 지원)
    private generateStreamId(from: string, to: string): string {
        // 정렬된 ID로 일관성 보장
        const sortedIds = [from, to].sort();
        return `${sortedIds[0]}_${sortedIds[1]}`;
    }

    // Expo Go 모드 확인
    isExpoGoMode(): boolean {
        return this.isExpoGo;
    }

    // 시그널링 메시지 전송
    private sendSignalingMessage(message: SignalingMessage): void {
        if (this.signalingCallback) {
            this.signalingCallback(message);
        }
    }

    // 리소스 정리
    cleanup(): void {
        this.stopAllStreams();
        this.signalingCallback = undefined;
        this.camera = null;
        this.eventListeners = [];
        webrtcLogger.info('WebRTC service cleaned up');
    }
}

// 싱글톤 인스턴스
export const webrtcService = new WebRTCService();
export default webrtcService; 