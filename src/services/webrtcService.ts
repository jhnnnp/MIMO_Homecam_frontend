// Expo Go 호환을 위한 임시 모킹
// 실제 WebRTC는 개발 빌드에서만 사용 가능

export interface WebRTCStream {
    id: string;
    peer: any;
    localStream?: any;
    remoteStream?: any;
    isConnected: boolean;
    isStreaming: boolean;
    onStreamReceived?: (stream: any) => void;
}

export interface SignalingMessage {
    type: 'offer' | 'answer' | 'ice-candidate' | 'stream-start' | 'stream-stop';
    from: string;
    to: string;
    data: any;
}

class WebRTCService {
    private peerConnections: Map<string, WebRTCStream> = new Map();
    private localStream: any = null;
    private signalingCallback?: (message: SignalingMessage) => void;

    // 시그널링 콜백 설정
    setSignalingCallback(callback: (message: SignalingMessage) => void) {
        this.signalingCallback = callback;
    }

    // 로컬 스트림 초기화 (카메라/마이크) - Expo Go에서는 모킹
    async initializeLocalStream(): Promise<any> {
        try {
            console.log('📹 로컬 스트림 초기화 중... (Expo Go 모킹)');

            // Expo Go에서는 실제 WebRTC를 사용할 수 없으므로 모킹
            this.localStream = {
                id: 'mock-local-stream',
                toURL: () => 'mock://local-stream',
                getTracks: () => []
            };

            console.log('✅ 로컬 스트림 초기화 완료 (모킹)');
            return this.localStream;
        } catch (error) {
            console.error('❌ 로컬 스트림 초기화 실패:', error);
            throw new Error('카메라/마이크에 접근할 수 없습니다. (Expo Go 제한)');
        }
    }

    // 스트림 시작 (홈캠 모드) - Expo Go에서는 모킹
    async startStreaming(cameraId: string, viewerId: string): Promise<WebRTCStream> {
        try {
            console.log(`🎥 스트림 시작: ${cameraId} -> ${viewerId} (Expo Go 모킹)`);

            if (!this.localStream) {
                await this.initializeLocalStream();
            }

            // 모킹된 Peer 연결
            const mockPeer = {
                on: (event: string, callback: Function) => {
                    console.log(`📡 Mock peer event: ${event}`);
                    if (event === 'signal') {
                        // 시그널링 메시지 시뮬레이션
                        setTimeout(() => {
                            this.sendSignalingMessage({
                                type: 'offer',
                                from: cameraId,
                                to: viewerId,
                                data: { type: 'offer', sdp: 'mock-sdp' }
                            });
                        }, 1000);
                    }
                },
                destroyed: false
            };

            const streamId = `${cameraId}_${viewerId}`;
            const webRTCStream: WebRTCStream = {
                id: streamId,
                peer: mockPeer,
                localStream: this.localStream,
                isConnected: false,
                isStreaming: false,
            };

            // 연결 시뮬레이션
            setTimeout(() => {
                webRTCStream.isConnected = true;
                webRTCStream.isStreaming = true;
                console.log('🔗 Mock peer 연결됨');
            }, 2000);

            this.peerConnections.set(streamId, webRTCStream);
            return webRTCStream;
        } catch (error) {
            console.error('❌ 스트림 시작 실패:', error);
            throw new Error('스트리밍을 시작할 수 없습니다. (Expo Go 제한)');
        }
    }

    // 스트림 시청 시작 (뷰어 모드) - Expo Go에서는 모킹
    async startViewing(cameraId: string, viewerId: string): Promise<WebRTCStream> {
        try {
            console.log(`👁️ 스트림 시청 시작: ${viewerId} -> ${cameraId} (Expo Go 모킹)`);

            // 모킹된 Peer 연결 (수신자)
            const mockPeer = {
                on: (event: string, callback: Function) => {
                    console.log(`📡 Mock peer event: ${event}`);
                    if (event === 'signal') {
                        // 시그널링 메시지 시뮬레이션
                        setTimeout(() => {
                            this.sendSignalingMessage({
                                type: 'answer',
                                from: viewerId,
                                to: cameraId,
                                data: { type: 'answer', sdp: 'mock-sdp' }
                            });
                        }, 1000);
                    }
                },
                destroyed: false
            };

            const streamId = `${cameraId}_${viewerId}`;
            const webRTCStream: WebRTCStream = {
                id: streamId,
                peer: mockPeer,
                isConnected: false,
                isStreaming: false,
            };

            // 연결 시뮬레이션
            setTimeout(() => {
                webRTCStream.isConnected = true;
                webRTCStream.isStreaming = true;

                // 모킹된 원격 스트림 생성
                const mockRemoteStream = {
                    id: 'mock-remote-stream',
                    toURL: () => 'mock://remote-stream',
                    getTracks: () => []
                };

                webRTCStream.remoteStream = mockRemoteStream;

                if (webRTCStream.onStreamReceived) {
                    webRTCStream.onStreamReceived(mockRemoteStream);
                }

                console.log('🔗 Mock peer 연결됨');
            }, 2000);

            this.peerConnections.set(streamId, webRTCStream);
            return webRTCStream;
        } catch (error) {
            console.error('❌ 스트림 시청 시작 실패:', error);
            throw new Error('스트림 시청을 시작할 수 없습니다. (Expo Go 제한)');
        }
    }

    // 시그널링 메시지 처리
    handleSignalingMessage(message: SignalingMessage) {
        try {
            const { type, from, to, data } = message;
            const streamId = `${from}_${to}`;
            const webRTCStream = this.peerConnections.get(streamId);

            if (!webRTCStream) {
                console.warn('⚠️ 알 수 없는 스트림:', streamId);
                return;
            }

            console.log(`📨 시그널링 메시지 처리: ${type}`);

            switch (type) {
                case 'offer':
                case 'answer':
                    webRTCStream.peer.signal(data);
                    break;
                case 'ice-candidate':
                    webRTCStream.peer.signal(data);
                    break;
                case 'stream-start':
                    console.log('🎬 스트림 시작 알림');
                    break;
                case 'stream-stop':
                    this.stopStream(streamId);
                    break;
                default:
                    console.warn('⚠️ 알 수 없는 시그널링 타입:', type);
            }
        } catch (error) {
            console.error('❌ 시그널링 메시지 처리 실패:', error);
        }
    }

    // 스트림 중지
    stopStream(streamId: string) {
        try {
            const webRTCStream = this.peerConnections.get(streamId);
            if (webRTCStream) {
                console.log(`🛑 스트림 중지: ${streamId}`);
                webRTCStream.peer.destroy();
                webRTCStream.isConnected = false;
                webRTCStream.isStreaming = false;
                this.peerConnections.delete(streamId);
            }
        } catch (error) {
            console.error('❌ 스트림 중지 실패:', error);
        }
    }

    // 모든 스트림 중지
    stopAllStreams() {
        try {
            console.log('🛑 모든 스트림 중지');
            this.peerConnections.forEach((stream, streamId) => {
                stream.peer.destroy();
            });
            this.peerConnections.clear();

            // 로컬 스트림 정리
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
                this.localStream = null;
            }
        } catch (error) {
            console.error('❌ 모든 스트림 중지 실패:', error);
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

    // 시그널링 메시지 전송
    private sendSignalingMessage(message: SignalingMessage) {
        if (this.signalingCallback) {
            this.signalingCallback(message);
        }
    }

    // 리소스 정리
    cleanup() {
        this.stopAllStreams();
        this.signalingCallback = undefined;
    }
}

// 싱글톤 인스턴스
export const webrtcService = new WebRTCService();
export default webrtcService; 