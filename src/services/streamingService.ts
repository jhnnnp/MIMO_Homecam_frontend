import { Camera } from "expo-camera";

export interface StreamConfig {
    quality: "480p" | "720p" | "1080p";
    frameRate: number;
    bitrate: number;
}

export interface StreamingState {
    isConnected: boolean;
    isStreaming: boolean;
    error: string | null;
    connectionId: string | null;
}

class StreamingService {
    private ws: WebSocket | null = null;
    private cameraRef: React.RefObject<Camera> | null = null;
    private streamInterval: NodeJS.Timeout | null = null;
    private state: StreamingState = {
        isConnected: false,
        isStreaming: false,
        error: null,
        connectionId: null,
    };

    private listeners: ((state: StreamingState) => void)[] = [];

    // 상태 변경 알림
    private notifyListeners() {
        this.listeners.forEach(listener => listener(this.state));
    }

    // 상태 구독
    subscribe(listener: (state: StreamingState) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    // WebSocket 연결
    async connect(serverUrl: string, token: string): Promise<void> {
        try {
            this.state.error = null;
            this.notifyListeners();

            const wsUrl = `${serverUrl.replace("http", "ws")}/ws?token=${token}`;
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                this.state.isConnected = true;
                this.notifyListeners();
                console.log("WebSocket 연결 성공");
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (error) {
                    console.error("메시지 파싱 오류:", error);
                }
            };

            this.ws.onclose = () => {
                this.state.isConnected = false;
                this.state.isStreaming = false;
                this.notifyListeners();
                console.log("WebSocket 연결 종료");
            };

            this.ws.onerror = (error) => {
                this.state.error = "연결 오류가 발생했습니다.";
                this.notifyListeners();
                console.error("WebSocket 오류:", error);
            };

        } catch (error) {
            this.state.error = "연결에 실패했습니다.";
            this.notifyListeners();
            throw error;
        }
    }

    // 메시지 처리
    private handleMessage(message: any) {
        switch (message.type) {
            case "qr_connected":
                this.state.connectionId = message.data.connectionId;
                this.notifyListeners();
                break;
            case "viewer_connected":
                console.log("뷰어가 연결되었습니다:", message.data);
                break;
            case "error":
                this.state.error = message.data.message;
                this.notifyListeners();
                break;
            default:
                console.log("알 수 없는 메시지 타입:", message.type);
        }
    }

    // 스트리밍 시작
    async startStreaming(cameraRef: React.RefObject<Camera>, config: StreamConfig = {
        quality: "720p",
        frameRate: 30,
        bitrate: 2000000,
    }): Promise<void> {
        if (!this.ws || !this.state.isConnected) {
            throw new Error("WebSocket이 연결되지 않았습니다.");
        }

        if (!cameraRef.current) {
            throw new Error("카메라를 찾을 수 없습니다.");
        }

        try {
            this.cameraRef = cameraRef;
            this.state.isStreaming = true;
            this.state.error = null;
            this.notifyListeners();

            // 스트리밍 시작 메시지 전송
            this.ws.send(JSON.stringify({
                type: "start_streaming",
                data: {
                    quality: config.quality,
                    frameRate: config.frameRate,
                    bitrate: config.bitrate,
                }
            }));

            // 프레임 전송 시작 (실제로는 WebRTC 사용)
            this.startFrameTransmission();

        } catch (error) {
            this.state.isStreaming = false;
            this.state.error = "스트리밍을 시작할 수 없습니다.";
            this.notifyListeners();
            throw error;
        }
    }

    // 스트리밍 중지
    async stopStreaming(): Promise<void> {
        try {
            this.state.isStreaming = false;
            this.notifyListeners();

            if (this.streamInterval) {
                clearInterval(this.streamInterval);
                this.streamInterval = null;
            }

            if (this.ws && this.state.isConnected) {
                this.ws.send(JSON.stringify({
                    type: "stop_streaming"
                }));
            }

        } catch (error) {
            this.state.error = "스트리밍을 중지할 수 없습니다.";
            this.notifyListeners();
            throw error;
        }
    }

    // 프레임 전송 (시뮬레이션)
    private startFrameTransmission() {
        // 실제로는 WebRTC를 사용하여 실시간 비디오 스트림 전송
        // 여기서는 시뮬레이션
        this.streamInterval = setInterval(() => {
            if (this.ws && this.state.isConnected && this.state.isStreaming) {
                // 실제로는 카메라 프레임 데이터를 전송
                this.ws.send(JSON.stringify({
                    type: "frame_data",
                    data: {
                        timestamp: Date.now(),
                        frameSize: 1024, // 시뮬레이션
                    }
                }));
            }
        }, 1000 / 30); // 30fps
    }

    // 연결 해제
    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        if (this.streamInterval) {
            clearInterval(this.streamInterval);
            this.streamInterval = null;
        }

        this.state = {
            isConnected: false,
            isStreaming: false,
            error: null,
            connectionId: null,
        };

        this.notifyListeners();
    }

    // 현재 상태 반환
    getState(): StreamingState {
        return { ...this.state };
    }
}

// 싱글톤 인스턴스
export const streamingService = new StreamingService();
export default streamingService;
