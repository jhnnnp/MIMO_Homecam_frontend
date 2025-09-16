// ============================================================================
// IMPROVED USE CAMERA CONNECTION HOOK - 개선된 카메라 연결 훅
// ============================================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Alert } from 'react-native';

import {
    CameraConnectionState,
    CameraConnectionActions,
    ConnectionStatus,
    HookReturn
} from '@/shared/types/hooks';
import streamingService, { CameraStream, StreamConnection } from '@/shared/services/core/streamingService';
import { useAuthStore } from '@/shared/stores/authStore';
import {
    APIError,
    AuthError,
    NetworkError,
    logError,
    safeExecute
} from '@/shared/utils/errorHandling';
import {
    makeAuthenticatedRequest,
    validateAPIResponse
} from '@/shared/utils/apiHelpers';
import { ApiResponse } from '@/shared/types/api';
import { logger, logHook, logHookError } from '@/shared/utils/logger';
import webrtcService from '@/shared/services/core/webrtcService';

// ============================================================================
// 타입 정의
// ============================================================================

interface CameraRegistrationResponse {
    connectionId: string;
    cameraId: string;
    cameraName: string;
    message: string;
    media?: {
        publisherUrl?: string;
    };
}

// ============================================================================
// 검증 함수들
// ============================================================================

const validateRegistrationResponse = (data: any): data is CameraRegistrationResponse => {
    return (
        data &&
        typeof data === 'object' &&
        typeof data.connectionId === 'string' &&
        typeof data.cameraId === 'string' &&
        typeof data.cameraName === 'string' &&
        typeof data.message === 'string'
    );
};

// ============================================================================
// 상수 정의
// ============================================================================

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

// ============================================================================
// 메인 카메라 연결 훅
// ============================================================================

export function useCameraConnection(
    cameraId: string,
    cameraName: string
): HookReturn<CameraConnectionState, CameraConnectionActions> {

    // ============================================================================
    // 상태 관리
    // ============================================================================

    const [state, setState] = useState<CameraConnectionState>({
        isConnected: false,
        isStreaming: false,
        connectedViewers: [],
        connectionId: null,
        error: null,
        pinCode: null,
        isLoading: false,
        reconnectAttempt: 0,
        connectionStatus: 'disconnected',
        viewerCount: 0,
    });

    // ============================================================================
    // Refs
    // ============================================================================

    const isMountedRef = useRef(true);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isConnectingRef = useRef(false);
    const isDisconnectingRef = useRef(false);

    // ============================================================================
    // 외부 의존성
    // ============================================================================

    const { getAccessToken } = useAuthStore();

    // ============================================================================
    // 안전한 상태 업데이트
    // ============================================================================

    const safeSetState = useCallback((updater: (prev: CameraConnectionState) => CameraConnectionState) => {
        if (isMountedRef.current) {
            setState(updater);
        }
    }, []);

    // ============================================================================
    // 에러 처리
    // ============================================================================

    const handleError = useCallback((error: unknown, action: string) => {
        logHookError('useCameraConnection', action, '오류 발생', error instanceof Error ? error : undefined);

        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
        safeSetState(prev => ({
            ...prev,
            error: errorMessage,
            isLoading: false,
            connectionStatus: 'error'
        }));
    }, [safeSetState]);

    // ============================================================================
    // 로딩 상태 관리
    // ============================================================================

    const setLoading = useCallback((isLoading: boolean) => {
        safeSetState(prev => ({ ...prev, isLoading }));
    }, [safeSetState]);

    // ============================================================================
    // 에러 클리어
    // ============================================================================

    const clearError = useCallback(() => {
        safeSetState(prev => ({ ...prev, error: null }));
    }, [safeSetState]);

    // ============================================================================
    // 재연결 로직
    // ============================================================================

    const scheduleReconnect = useCallback(() => {
        if (state.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
            logHook('useCameraConnection', 'reconnect', '최대 재연결 시도 횟수를 초과했습니다');
            safeSetState(prev => ({ ...prev, connectionStatus: 'error' }));
            return;
        }

        const delay = Math.min(
            INITIAL_RECONNECT_DELAY * Math.pow(2, state.reconnectAttempt),
            MAX_RECONNECT_DELAY
        );

        reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && !streamingService.isConnected()) {
                logHook('useCameraConnection', 'reconnect', `재연결 시도 ${state.reconnectAttempt + 1}/${MAX_RECONNECT_ATTEMPTS}`);
                safeSetState(prev => ({
                    ...prev,
                    reconnectAttempt: prev.reconnectAttempt + 1,
                    connectionStatus: 'connecting'
                }));
                streamingService.reconnect();
            }
        }, delay);
    }, [state.reconnectAttempt, safeSetState]);

    // ============================================================================
    // PIN 코드 생성
    // ============================================================================

    const generatePinCode = useCallback(async (): Promise<string> => {
        return safeExecute(async () => {
            if (isConnectingRef.current) {
                logHook('useCameraConnection', 'generatePinCode', '이미 연결 중입니다');
                throw new Error('이미 연결 중입니다. 잠시 후 다시 시도해주세요.');
            }

            isConnectingRef.current = true;
            setLoading(true);
            clearError();

            try {
                logHook('useCameraConnection', 'generatePinCode', 'PIN 코드 생성 시작');

                // 1. 6자리 PIN 코드 생성 (이것이 connectionId가 됨)
                const pinCode = Math.floor(100000 + Math.random() * 900000).toString();
                console.log('🎯 [PIN 생성] 생성된 PIN 코드:', pinCode);
                console.log('🎯 [PIN 생성] 카메라 ID:', cameraId);
                console.log('🎯 [PIN 생성] 카메라 이름:', cameraName);

                // 2. 홈캠 등록 API 호출
                const { getApiBaseUrl } = await import('../config');
                const url = `${getApiBaseUrl()}/cameras/register`;
                console.log('🌐 [PIN 생성] API URL:', url);

                const requestBody = {
                    cameraId,
                    cameraName,
                    connectionId: pinCode, // PIN 코드를 connectionId로 사용
                    timestamp: Date.now(),
                    deviceType: 'mobile'
                };
                console.log('📤 [PIN 생성] 요청 데이터:', JSON.stringify(requestBody, null, 2));

                const response = await makeAuthenticatedRequest<{ data: CameraRegistrationResponse }>(
                    url,
                    getAccessToken,
                    {
                        method: 'POST',
                        body: JSON.stringify(requestBody),
                        context: 'Camera Registration'
                    }
                );

                console.log('📥 [PIN 생성] 서버 응답:', JSON.stringify(response, null, 2));

                // 응답 데이터 검증
                if (!response.data) {
                    console.error('❌ [PIN 생성] 서버 응답 데이터 없음:', response);
                    throw new NetworkError('서버 응답이 올바르지 않습니다.');
                }

                const connectionId = pinCode; // PIN 코드가 connectionId
                console.log('✅ [PIN 생성] 홈캠 등록 성공 - PIN:', pinCode, 'Connection ID:', connectionId);

                const publisherUrl = response.data.media?.publisherUrl;

                // 3. WebSocket 연결 설정
                if (!streamingService.isConnected()) {
                    console.log('🔌 [PIN 생성] WebSocket 연결 시작...');
                    safeSetState(prev => ({ ...prev, connectionStatus: 'connecting' }));

                    const connected = await streamingService.connect();
                    if (!connected) {
                        console.error('❌ [PIN 생성] WebSocket 연결 실패');
                        throw new NetworkError('서버에 연결할 수 없습니다.');
                    }
                    console.log('✅ [PIN 생성] WebSocket 연결 성공');

                    // 카메라 등록 및 등록 확인 대기
                    const registered = streamingService.registerCamera(cameraId, cameraName);
                    if (registered) {
                        console.log('📝 [PIN 생성] 카메라 등록 요청 완료:', cameraId, cameraName);

                        // 카메라 등록 확인 이벤트 리스너 추가
                        const onCameraRegistered = (data: any) => {
                            if (data.id === cameraId) {
                                console.log('✅ [PIN 생성] 카메라 등록 확인됨:', data);
                                streamingService.off('camera_registered', onCameraRegistered);
                            }
                        };
                        streamingService.on('camera_registered', onCameraRegistered);
                    }
                } else {
                    console.log('✅ [PIN 생성] WebSocket 이미 연결됨');
                    // 이미 연결된 경우에도 카메라 등록
                    streamingService.registerCamera(cameraId, cameraName);
                }

                // PIN 코드 데이터 생성
                const pinData = {
                    type: 'mimo_camera_connect',
                    cameraId,
                    cameraName,
                    connectionId,
                    pinCode,
                    timestamp: Date.now(),
                    version: '1.0.0',
                    apiUrl: (await import('../config')).getApiBaseUrl()
                };
                console.log('📋 [PIN 생성] PIN 데이터 생성:', JSON.stringify(pinData, null, 2));

                safeSetState(prev => ({
                    ...prev,
                    pinCode,
                    connectionId,
                    publisherUrl,
                    isLoading: false,
                    error: null,
                    connectionStatus: 'connected',
                    isConnected: true,
                }));

                console.log('🎉 [PIN 생성] 완료! PIN 코드:', pinCode);
                console.log('🎉 [PIN 생성] 연결 상태:', 'connected');
                console.log('🎉 [PIN 생성] 뷰어가 PIN 코드를 입력하면 연결됩니다.');

                logHook('useCameraConnection', 'generatePinCode', 'PIN 코드 생성 완료', { connectionId, pinCode });
                return pinCode;
            } catch (error) {
                console.error('❌ [PIN 생성] 오류 발생:', error);
                console.error('❌ [PIN 생성] 오류 상세:', {
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : 'No stack trace',
                    context: 'Camera Registration'
                });
                handleError(error, 'generatePinCode');
                throw error;
            } finally {
                isConnectingRef.current = false;
            }
        }, 'PIN Code Generation');
    }, [cameraId, cameraName, getAccessToken, setLoading, clearError, safeSetState, handleError]);

    // ============================================================================
    // 스트리밍 제어
    // ============================================================================

    const startStreaming = useCallback(async (viewerId?: string): Promise<void> => {
        return safeExecute(async () => {
            if (state.isStreaming) {
                logHook('useCameraConnection', 'startStreaming', '이미 스트리밍 중입니다');
                return;
            }

            if (!state.isConnected) {
                throw new NetworkError('서버에 연결되지 않았습니다. PIN 코드를 먼저 생성해주세요.');
            }

            setLoading(true);
            clearError();

            try {
                logHook('useCameraConnection', 'startStreaming', '스트리밍 시작', { viewerId });

                // WebRTC 스트리밍 시작
                const targetViewerId = viewerId || 'default_viewer';
                const stream = await webrtcService.startStreaming(cameraId, targetViewerId);

                console.log('🎥 [스트리밍] WebRTC 스트림 시작됨:', stream.id);
                console.log('🎥 [스트리밍] 뷰어 ID:', targetViewerId);

                safeSetState(prev => ({
                    ...prev,
                    isStreaming: true,
                    currentStream: stream,
                    isLoading: false,
                    error: null
                }));

                logHook('useCameraConnection', 'startStreaming', '스트리밍 시작됨', { streamId: stream.id });
            } catch (error) {
                handleError(error, 'startStreaming');
                throw error;
            }
        }, 'Streaming Start');
    }, [cameraId, state.isConnected, state.isStreaming, setLoading, clearError, safeSetState, handleError, webrtcService]);

    const stopStreaming = useCallback(async (): Promise<void> => {
        return safeExecute(async () => {
            if (!state.isStreaming) {
                logHook('useCameraConnection', 'stopStreaming', '스트리밍이 실행 중이 아닙니다');
                return;
            }

            try {
                logHook('useCameraConnection', 'stopStreaming', '스트리밍 중지');

                // WebRTC 스트림 중지
                if (state.currentStream) {
                    await webrtcService.stopStream(state.currentStream.id);
                    console.log('🎥 [스트리밍] WebRTC 스트림 중지됨:', state.currentStream.id);
                }

                safeSetState(prev => ({
                    ...prev,
                    isStreaming: false,
                    currentStream: null
                }));

                logHook('useCameraConnection', 'stopStreaming', '스트리밍 중지됨');
            } catch (error) {
                handleError(error, 'stopStreaming');
                throw error;
            }
        }, 'Streaming Stop');
    }, [state.isStreaming, state.currentStream, safeSetState, handleError, webrtcService]);

    // ============================================================================
    // 뷰어 연결 감지 및 자동 스트리밍 시작
    // ============================================================================

    const handleViewerConnected = useCallback(async (viewerId: string): Promise<void> => {
        return safeExecute(async () => {
            console.log('👥 [뷰어 연결] 뷰어가 연결됨:', viewerId);

            // 자동으로 스트리밍 시작
            await startStreaming(viewerId);

            console.log('🎥 [뷰어 연결] 자동 스트리밍 시작됨');
        }, 'Viewer Connected');
    }, [startStreaming]);

    // ============================================================================
    // 연결 해제
    // ============================================================================

    const disconnect = useCallback(() => {
        if (isDisconnectingRef.current) {
            logHook('useCameraConnection', 'disconnect', '이미 연결 해제 중입니다');
            return;
        }

        isDisconnectingRef.current = true;

        try {
            logHook('useCameraConnection', 'disconnect', '연결 해제 시작');

            // 재연결 타이머 정리
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }

            // 스트리밍 서비스 정리
            streamingService.unregisterCamera(cameraId);
            streamingService.disconnect();

            safeSetState(prev => ({
                ...prev,
                isConnected: false,
                isStreaming: false,
                connectedViewers: [],
                connectionId: null,
                error: null,
                qrCodeData: null,
                reconnectAttempt: 0,
                connectionStatus: 'disconnected',
                viewerCount: 0,
            }));

            logHook('useCameraConnection', 'disconnect', '연결 해제 완료');
        } catch (error) {
            handleError(error, 'disconnect');
        } finally {
            isDisconnectingRef.current = false;
        }
    }, [cameraId, safeSetState, handleError]);

    // ============================================================================
    // 수동 재연결
    // ============================================================================

    const reconnect = useCallback(async (): Promise<void> => {
        if (isConnectingRef.current) {
            logHook('useCameraConnection', 'reconnect', '이미 재연결 중입니다');
            return;
        }

        isConnectingRef.current = true;

        try {
            logHook('useCameraConnection', 'reconnect', '수동 재연결 시작');

            clearError();
            safeSetState(prev => ({
                ...prev,
                reconnectAttempt: 0,
                connectionStatus: 'connecting'
            }));

            // 기존 재연결 타이머 정리
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }

            // 스트리밍 서비스 재연결
            await streamingService.reconnect();

            logHook('useCameraConnection', 'reconnect', '수동 재연결 완료');
        } catch (error) {
            handleError(error, 'reconnect');
        } finally {
            isConnectingRef.current = false;
        }
    }, [clearError, safeSetState, handleError]);

    // ============================================================================
    // 재시도
    // ============================================================================

    const retry = useCallback(() => {
        logHook('useCameraConnection', 'retry', '재시도 시작');

        clearError();
        safeSetState(prev => ({ ...prev, reconnectAttempt: 0 }));
        reconnect();
    }, [clearError, safeSetState, reconnect]);

    // ============================================================================
    // WebSocket 이벤트 핸들러들
    // ============================================================================

    useEffect(() => {
        const handleConnected = () => {
            logHook('useCameraConnection', 'websocket', 'WebSocket 연결됨');

            safeSetState(prev => ({
                ...prev,
                isConnected: true,
                error: null,
                reconnectAttempt: 0,
                connectionStatus: 'connected'
            }));
        };

        const handleDisconnected = (reason?: string) => {
            logHook('useCameraConnection', 'websocket', 'WebSocket 연결 해제됨', { reason });

            safeSetState(prev => ({
                ...prev,
                isConnected: false,
                isStreaming: false,
                connectedViewers: [],
                connectionStatus: reason === 'manual' ? 'disconnected' : 'error'
            }));

            if (reason !== 'manual') {
                scheduleReconnect();
            }
        };

        const handleViewerJoined = (data: { streamId: string; viewerId: string }) => {
            logHook('useCameraConnection', 'websocket', '뷰어 참여', { viewerId: data.viewerId });

            safeSetState(prev => ({
                ...prev,
                connectedViewers: [...prev.connectedViewers, data.viewerId],
                viewerCount: prev.viewerCount + 1
            }));

            Alert.alert(
                '뷰어 연결됨',
                `뷰어가 스트림에 참여했습니다.\nID: ${data.viewerId}`,
                [{ text: '확인', style: 'default' }]
            );
        };

        const handleViewerLeft = (data: { streamId: string; viewerId: string }) => {
            logHook('useCameraConnection', 'websocket', '뷰어 퇴장', { viewerId: data.viewerId });

            safeSetState(prev => ({
                ...prev,
                connectedViewers: prev.connectedViewers.filter(id => id !== data.viewerId),
                viewerCount: Math.max(0, prev.viewerCount - 1)
            }));
        };

        const handleStreamStarted = (streamData: StreamConnection) => {
            logHook('useCameraConnection', 'websocket', '스트림 시작됨', { streamId: streamData.id });

            safeSetState(prev => ({
                ...prev,
                isStreaming: true,
                connectionId: streamData.id,
                error: null
            }));
        };

        const handleStreamStopped = (streamId: string) => {
            logHook('useCameraConnection', 'websocket', '스트림 중지됨', { streamId });

            safeSetState(prev => ({
                ...prev,
                isStreaming: false,
                connectionId: null,
                connectedViewers: [],
                viewerCount: 0
            }));
        };

        const handleStreamingError = (error: any) => {
            logHookError('useCameraConnection', 'websocket', '스트리밍 오류', error instanceof Error ? error : undefined);
            handleError(error, 'WebSocket');
        };

        // ============================================================================
        // 이벤트 리스너 등록
        // ============================================================================

        streamingService.on('connected', handleConnected);
        streamingService.on('disconnected', handleDisconnected);
        streamingService.on('viewerJoined', handleViewerJoined);
        streamingService.on('viewerLeft', handleViewerLeft);
        streamingService.on('streamStarted', handleStreamStarted);
        streamingService.on('streamStopped', handleStreamStopped);
        streamingService.on('error', handleStreamingError);

        // ============================================================================
        // 클린업
        // ============================================================================

        return () => {
            isMountedRef.current = false;

            // 재연결 타이머 정리
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }

            // 이벤트 리스너 제거
            streamingService.off('connected', handleConnected);
            streamingService.off('disconnected', handleDisconnected);
            streamingService.off('viewerJoined', handleViewerJoined);
            streamingService.off('viewerLeft', handleViewerLeft);
            streamingService.off('streamStarted', handleStreamStarted);
            streamingService.off('streamStopped', handleStreamStopped);
            streamingService.off('error', handleStreamingError);

            logHook('useCameraConnection', 'cleanup', '카메라 연결 훅 정리 완료');
        };
    }, [cameraId, cameraName, safeSetState, handleError, scheduleReconnect]);

    // ============================================================================
    // 액션 객체 생성
    // ============================================================================

    const actions: CameraConnectionActions = useMemo(() => ({
        generatePinCode,
        startStreaming,
        stopStreaming,
        disconnect,
        reconnect,
        clearError,
        retry,
    }), [
        generatePinCode,
        startStreaming,
        stopStreaming,
        disconnect,
        reconnect,
        clearError,
        retry,
    ]);

    return [state, actions] as const;
}
