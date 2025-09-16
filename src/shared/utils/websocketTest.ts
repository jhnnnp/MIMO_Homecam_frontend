// ============================================================================
// WebSocket 테스트 유틸리티
// ============================================================================

import { Alert } from 'react-native';

export interface WebSocketTestResult {
    success: boolean;
    message: string;
    details?: any;
}

export class WebSocketTester {
    private ws: WebSocket | null = null;
    private testResults: WebSocketTestResult[] = [];

    // WebSocket 연결 테스트
    async testConnection(url: string): Promise<WebSocketTestResult> {
        return new Promise((resolve) => {
            console.log('🔌 [WebSocket 테스트] 연결 시도:', url);

            try {
                this.ws = new WebSocket(url);

                const timeout = setTimeout(() => {
                    this.ws?.close();
                    resolve({
                        success: false,
                        message: '연결 시간 초과 (10초)',
                        details: { url }
                    });
                }, 10000);

                this.ws.onopen = () => {
                    clearTimeout(timeout);
                    console.log('✅ [WebSocket 테스트] 연결 성공');
                    resolve({
                        success: true,
                        message: 'WebSocket 연결 성공',
                        details: { url, readyState: this.ws?.readyState }
                    });
                };

                this.ws.onerror = (error) => {
                    clearTimeout(timeout);
                    console.error('❌ [WebSocket 테스트] 연결 오류:', error);
                    resolve({
                        success: false,
                        message: 'WebSocket 연결 실패',
                        details: { url, error }
                    });
                };

                this.ws.onclose = (event) => {
                    clearTimeout(timeout);
                    console.log('🔌 [WebSocket 테스트] 연결 종료:', event.code, event.reason);
                    if (!this.testResults.some(r => r.success)) {
                        resolve({
                            success: false,
                            message: `연결 종료 (코드: ${event.code})`,
                            details: { url, code: event.code, reason: event.reason }
                        });
                    }
                };

                this.ws.onmessage = (event) => {
                    console.log('📨 [WebSocket 테스트] 메시지 수신:', event.data);
                    try {
                        const data = JSON.parse(event.data);
                        this.testResults.push({
                            success: true,
                            message: '메시지 수신 성공',
                            details: { type: data.type, data: data.data }
                        });
                    } catch (error) {
                        this.testResults.push({
                            success: true,
                            message: '메시지 수신 (JSON 파싱 실패)',
                            details: { rawData: event.data, error }
                        });
                    }
                };

            } catch (error) {
                resolve({
                    success: false,
                    message: 'WebSocket 생성 실패',
                    details: { url, error }
                });
            }
        });
    }

    // 메시지 전송 테스트
    async testMessageSend(type: string, data: any): Promise<WebSocketTestResult> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return {
                success: false,
                message: 'WebSocket이 연결되지 않았습니다'
            };
        }

        try {
            const message = { type, data, timestamp: Date.now() };
            this.ws.send(JSON.stringify(message));

            console.log('📤 [WebSocket 테스트] 메시지 전송:', message);

            return {
                success: true,
                message: '메시지 전송 성공',
                details: { type, data }
            };
        } catch (error) {
            console.error('❌ [WebSocket 테스트] 메시지 전송 실패:', error);
            return {
                success: false,
                message: '메시지 전송 실패',
                details: { type, data, error }
            };
        }
    }

    // 연결 종료
    close(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    // 테스트 결과 가져오기
    getResults(): WebSocketTestResult[] {
        return [...this.testResults];
    }

    // 결과 초기화
    clearResults(): void {
        this.testResults = [];
    }
}

// ============================================================================
// 테스트 함수들
// ============================================================================

// 기본 WebSocket 연결 테스트
export const testWebSocketConnection = async (url: string): Promise<void> => {
    const tester = new WebSocketTester();

    try {
        const result = await tester.testConnection(url);

        if (result.success) {
            Alert.alert(
                '✅ WebSocket 연결 성공',
                `서버: ${url}\n상태: 연결됨`,
                [{ text: '확인' }]
            );

            // 연결 후 5초 대기
            await new Promise(resolve => setTimeout(resolve, 5000));

            // 테스트 메시지 전송
            const messageResult = await tester.testMessageSend('ping', { test: true });
            console.log('📤 메시지 전송 결과:', messageResult);

        } else {
            Alert.alert(
                '❌ WebSocket 연결 실패',
                `서버: ${url}\n오류: ${result.message}`,
                [{ text: '확인' }]
            );
        }
    } catch (error) {
        Alert.alert(
            '❌ 테스트 오류',
            `오류: ${error instanceof Error ? error.message : String(error)}`,
            [{ text: '확인' }]
        );
    } finally {
        tester.close();
    }
};

// MIMO WebSocket 서버 테스트
export const testMIMOWebSocket = async (): Promise<void> => {
    const { getWebSocketUrl } = await import('@/app/config');
    const url = getWebSocketUrl();

    console.log('🌐 [MIMO WebSocket 테스트] URL:', url);
    await testWebSocketConnection(url);
};

// 카메라 등록 테스트
export const testCameraRegistration = async (cameraId: string, cameraName: string): Promise<void> => {
    const tester = new WebSocketTester();

    try {
        const { getWebSocketUrl } = await import('@/app/config');
        const url = getWebSocketUrl();

        // 연결
        const connectResult = await tester.testConnection(url);
        if (!connectResult.success) {
            throw new Error(connectResult.message);
        }

        // 2초 대기
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 카메라 등록 메시지 전송
        const registerResult = await tester.testMessageSend('register_camera', {
            id: cameraId,
            name: cameraName,
            timestamp: Date.now()
        });

        if (registerResult.success) {
            Alert.alert(
                '✅ 카메라 등록 테스트 성공',
                `카메라: ${cameraName}\nID: ${cameraId}`,
                [{ text: '확인' }]
            );
        } else {
            Alert.alert(
                '❌ 카메라 등록 테스트 실패',
                registerResult.message,
                [{ text: '확인' }]
            );
        }

        // 3초 대기 후 결과 확인
        await new Promise(resolve => setTimeout(resolve, 3000));
        const results = tester.getResults();
        console.log('📊 테스트 결과:', results);

    } catch (error) {
        Alert.alert(
            '❌ 테스트 오류',
            `오류: ${error instanceof Error ? error.message : String(error)}`,
            [{ text: '확인' }]
        );
    } finally {
        tester.close();
    }
};

// 뷰어 연결 테스트
export const testViewerConnection = async (cameraId: string, viewerId: string): Promise<void> => {
    const tester = new WebSocketTester();

    try {
        const { getWebSocketUrl } = await import('../../app/config');
        const url = getWebSocketUrl();

        // 연결
        const connectResult = await tester.testConnection(url);
        if (!connectResult.success) {
            throw new Error(connectResult.message);
        }

        // 2초 대기
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 스트림 참여 메시지 전송
        const joinResult = await tester.testMessageSend('join_stream', {
            cameraId,
            viewerId,
            timestamp: Date.now()
        });

        if (joinResult.success) {
            Alert.alert(
                '✅ 뷰어 연결 테스트 성공',
                `카메라: ${cameraId}\n뷰어: ${viewerId}`,
                [{ text: '확인' }]
            );
        } else {
            Alert.alert(
                '❌ 뷰어 연결 테스트 실패',
                joinResult.message,
                [{ text: '확인' }]
            );
        }

        // 3초 대기 후 결과 확인
        await new Promise(resolve => setTimeout(resolve, 3000));
        const results = tester.getResults();
        console.log('📊 테스트 결과:', results);

    } catch (error) {
        Alert.alert(
            '❌ 테스트 오류',
            `오류: ${error instanceof Error ? error.message : String(error)}`,
            [{ text: '확인' }]
        );
    } finally {
        tester.close();
    }
}; 