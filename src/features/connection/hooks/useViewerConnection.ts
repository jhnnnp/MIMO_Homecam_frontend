// ============================================================================
// IMPROVED USE VIEWER CONNECTION HOOK - 개선된 뷰어 연결 훅
// ============================================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Alert } from 'react-native';

import {
    ViewerConnectionState,
    ViewerConnectionActions,
    CameraStream,
    HookReturn
} from '@/shared/types/hooks';
import streamingService, { StreamConnection, CameraStream as ServiceCameraStream } from '@/shared/services/core/streamingService';
import { webrtcService } from '@/shared/services/core/webrtcService';
import { useAuthStore } from '@/shared/stores/authStore';
import {
    APIError,
    AuthError,
    NetworkError,
    ValidationError,
    logError,
    safeExecute
} from '../../../shared/utils/errorHandling';
import {
    makeAuthenticatedRequest,
    validateAPIResponse
} from '../../../shared/utils/apiHelpers';
import { logger, logViewer, logViewerError } from '../../../shared/utils/logger';
import { withErrorHandling, createNetworkError, createTimeoutError } from '../../../shared/utils/errorHandler';

// ============================================================================
// 타입 정의
// ============================================================================

interface QRCodeData {
    type: 'mimo_camera_connect';
    deviceId: string;
    cameraId: string;
    cameraName: string;
    connectionId: string;
    timestamp: number;
    version: string;
    apiUrl?: string;
}

interface CameraSearchResponse {
    cameraId: string;
    cameraName: string;
    pinCode: string;  // connectionId 대신 pinCode
    status: string;
}

// ============================================================================
// 검증 함수들
// ============================================================================

const validateQRCodeData = (data: any): data is QRCodeData => {
    return (
        data &&
        typeof data === 'object' &&
        data.type === 'mimo_camera_connect' &&
        typeof data.deviceId === 'string' &&
        typeof data.cameraId === 'string' &&
        typeof data.cameraName === 'string' &&
        typeof data.connectionId === 'string' &&
        typeof data.timestamp === 'number' &&
        typeof data.version === 'string'
    );
};

const validateSearchResponse = (data: any): data is CameraSearchResponse => {
    console.log('🔍 [검증] 검증할 데이터:', JSON.stringify(data, null, 2));

    const isValid = (
        data &&
        typeof data === 'object' &&
        typeof data.cameraId === 'string' &&
        typeof data.cameraName === 'string' &&
        typeof data.pinCode === 'string' &&  // connectionId 대신 pinCode
        typeof data.status === 'string'
    );

    console.log('🔍 [검증] 검증 결과:', isValid);
    console.log('🔍 [검증] 필드별 확인:', {
        hasData: !!data,
        isObject: typeof data === 'object',
        hasCameraId: typeof data?.cameraId === 'string',
        hasCameraName: typeof data?.cameraName === 'string',
        hasPinCode: typeof data?.pinCode === 'string',
        hasStatus: typeof data?.status === 'string'
    });

    return isValid;
};

// ============================================================================
// 상수 정의
// ============================================================================

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

// ============================================================================
// 메인 뷰어 연결 훅
// ============================================================================

export function useViewerConnection(
    viewerId: string
): HookReturn<ViewerConnectionState, ViewerConnectionActions> {

    // ============================================================================
    // 상태 관리
    // ============================================================================

    const [state, setState] = useState<ViewerConnectionState>({
        isConnected: false,
        connectedCamera: null,
        isWatching: false,
        error: null,
        availableCameras: [],
        reconnectAttempt: 0,
        viewerCount: 0,
        isLoading: false,
        connectionStatus: 'disconnected',
    });

    // ============================================================================
    // Refs
    // ============================================================================

    const isMountedRef = useRef(true);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isConnectingRef = useRef(false);
    const isDisconnectingRef = useRef(false);
    const webrtcConnectionRef = useRef<any>(null);

    // ============================================================================
    // 외부 의존성
    // ============================================================================

    const { getAccessToken } = useAuthStore();

    // ============================================================================
    // 안전한 상태 업데이트
    // ============================================================================

    const safeSetState = useCallback((updater: (prev: ViewerConnectionState) => ViewerConnectionState) => {
        if (isMountedRef.current) {
            setState(updater);
        }
    }, []);

    // ============================================================================
    // 에러 처리
    // ============================================================================

    const handleError = useCallback((error: unknown, action: string) => {
        logViewerError(viewerId, action, '오류 발생', error instanceof Error ? error : undefined);

        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
        safeSetState(prev => ({
            ...prev,
            error: errorMessage,
            isLoading: false,
            connectionStatus: 'error'
        }));
    }, [viewerId, safeSetState]);

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
            logViewer(viewerId, 'reconnect', '최대 재연결 시도 횟수를 초과했습니다');
            safeSetState(prev => ({ ...prev, connectionStatus: 'error' }));
            return;
        }

        const delay = Math.min(
            INITIAL_RECONNECT_DELAY * Math.pow(2, state.reconnectAttempt),
            MAX_RECONNECT_DELAY
        );

        reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && !streamingService.isConnected()) {
                logViewer(viewerId, 'reconnect', `재연결 시도 ${state.reconnectAttempt + 1}/${MAX_RECONNECT_ATTEMPTS}`);
                safeSetState(prev => ({
                    ...prev,
                    reconnectAttempt: prev.reconnectAttempt + 1,
                    connectionStatus: 'connecting'
                }));
                streamingService.reconnect();
            }
        }, delay);
    }, [viewerId, state.reconnectAttempt, safeSetState]);

    // ============================================================================
    // 사용 가능한 카메라 목록 새로고침
    // ============================================================================

    const refreshAvailableCameras = useCallback(() => {
        try {
            console.log('🔍 [카메라 목록] 새로고침 시작...');
            const cameras = streamingService.getConnectedCameras();
            console.log('🔍 [카메라 목록] 가져온 카메라:', JSON.stringify(cameras, null, 2));
            console.log('🔍 [카메라 목록] 카메라 개수:', cameras.length);

            safeSetState(prev => {
                console.log('🔍 [카메라 목록] 이전 상태:', JSON.stringify(prev.availableCameras, null, 2));
                const newState = { ...prev, availableCameras: cameras };
                console.log('🔍 [카메라 목록] 새로운 상태:', JSON.stringify(newState.availableCameras, null, 2));
                return newState;
            });

            logViewer(viewerId, 'refreshAvailableCameras', '카메라 목록 새로고침 완료', { count: cameras.length });
        } catch (error) {
            console.error('❌ [카메라 목록] 새로고침 오류:', error);
            handleError(error, 'refreshAvailableCameras');
        }
    }, [viewerId, safeSetState, handleError]);

    // ============================================================================
    // QR 코드 스캔
    // ============================================================================

    const scanQRCode = useCallback(async (qrData: string): Promise<boolean> => {
        return safeExecute(async () => {
            if (isConnectingRef.current) {
                logViewer(viewerId, 'scanQRCode', '이미 연결 중입니다');
                throw new Error('이미 연결 중입니다. 잠시 후 다시 시도해주세요.');
            }

            isConnectingRef.current = true;
            setLoading(true);
            clearError();

            try {
                logViewer(viewerId, 'scanQRCode', 'QR 코드 스캔 시작');

                // QR 코드 데이터 검증
                const parsedData = JSON.parse(qrData);
                if (!validateQRCodeData(parsedData)) {
                    throw new ValidationError('올바른 MIMO 카메라 QR 코드가 아닙니다.');
                }

                const { cameraId, cameraName, connectionId } = parsedData;

                // WebSocket 연결 확인 및 생성
                if (!streamingService.isConnected()) {
                    safeSetState(prev => ({ ...prev, connectionStatus: 'connecting' }));

                    const connected = await streamingService.connect();
                    if (!connected) {
                        throw new NetworkError('서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.');
                    }
                }

                // 카메라 연결 시도
                const success = await connectToCamera(cameraId);
                if (success) {
                    Alert.alert(
                        '연결 성공! 🎉',
                        `${cameraName}에 성공적으로 연결되었습니다!`,
                        [{ text: '확인', style: 'default' }]
                    );
                    return true;
                } else {
                    throw new NetworkError('카메라 연결에 실패했습니다.');
                }
            } catch (error) {
                handleError(error, 'scanQRCode');

                const errorMessage = error instanceof Error ? error.message : 'QR 코드를 처리할 수 없습니다.';
                Alert.alert('연결 실패', errorMessage);
                return false;
            } finally {
                isConnectingRef.current = false;
            }
        }, 'QR Code Scan');
    }, [viewerId, setLoading, clearError, safeSetState, handleError]);

    // ============================================================================
    // 카메라 연결
    // ============================================================================

    const connectToCamera = useCallback(async (cameraId: string): Promise<boolean> => {
        return safeExecute(async () => {
            setLoading(true);
            clearError();

            try {
                logViewer(viewerId, 'connectToCamera', '카메라 연결 시작', { cameraId });

                if (!state.isConnected) {
                    throw new NetworkError('서버에 연결되지 않았습니다. QR 코드를 먼저 스캔해주세요.');
                }

                const camera = streamingService.getCamera(cameraId);
                if (!camera) {
                    // 카메라가 현재 목록에 없는 경우 새로고침 후 재시도
                    refreshAvailableCameras();
                    await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기

                    const retryCamera = streamingService.getCamera(cameraId);
                    if (!retryCamera) {
                        throw new NetworkError('카메라를 찾을 수 없습니다. 카메라가 온라인 상태인지 확인해 주세요.');
                    }
                }

                // WebRTC 시청 시작 (viewer)
                const webrtcStream = await webrtcService.startViewing(cameraId, viewerId);
                webrtcConnectionRef.current = webrtcStream;

                // 스트림 참여 요청
                streamingService.joinStream(cameraId, viewerId);

                const connectedCamera = camera || streamingService.getCamera(cameraId);
                if (connectedCamera) {
                    safeSetState(prev => ({
                        ...prev,
                        connectedCamera,
                        error: null,
                        isLoading: false,
                        connectionStatus: 'connected'
                    }));
                }

                logViewer(viewerId, 'connectToCamera', '카메라 연결 완료', { cameraId });
                return true;
            } catch (error) {
                handleError(error, 'connectToCamera');
                return false;
            }
        }, 'Camera Connection');
    }, [viewerId, state.isConnected, setLoading, clearError, safeSetState, handleError, refreshAvailableCameras]);

    // ============================================================================
    // 카메라 연결 해제
    // ============================================================================

    const disconnectFromCamera = useCallback(() => {
        if (isDisconnectingRef.current) {
            logViewer(viewerId, 'disconnectFromCamera', '이미 연결 해제 중입니다');
            return;
        }

        isDisconnectingRef.current = true;

        try {
            logViewer(viewerId, 'disconnectFromCamera', '카메라 연결 해제 시작');

            if (state.connectedCamera) {
                streamingService.leaveStream(state.connectedCamera.id, viewerId);
            }

            // WebRTC 연결 해제
            webrtcService.stopAllStreams();
            webrtcConnectionRef.current = null;

            safeSetState(prev => ({
                ...prev,
                connectedCamera: null,
                isWatching: false,
                error: null,
                connectionStatus: 'disconnected'
            }));

            logViewer(viewerId, 'disconnectFromCamera', '카메라 연결 해제 완료');
        } catch (error) {
            handleError(error, 'disconnectFromCamera');
        } finally {
            isDisconnectingRef.current = false;
        }
    }, [viewerId, state.connectedCamera, safeSetState, handleError]);

    // ============================================================================
    // 스트림 시청 시작/중지
    // ============================================================================

    const startWatching = useCallback(async (cameraId: string): Promise<void> => {
        return safeExecute(async () => {
            setLoading(true);
            clearError();

            try {
                logViewer(viewerId, 'startWatching', '스트림 시청 시작', { cameraId });

                if (!state.connectedCamera || state.connectedCamera.id !== cameraId) {
                    throw new ValidationError('먼저 카메라에 연결해주세요.');
                }

                if (state.isWatching) {
                    setLoading(false);
                    logViewer(viewerId, 'startWatching', '이미 시청 중입니다');
                    return;
                }

                // WebRTC 시청 시작 (viewer)
                await webrtcService.startViewing(cameraId, viewerId);

                // 스트림 시청 시작 요청
                streamingService.joinStream(cameraId, viewerId);

                safeSetState(prev => ({
                    ...prev,
                    isWatching: true,
                    isLoading: false,
                    error: null
                }));

                logViewer(viewerId, 'startWatching', '스트림 시청 시작 완료');
            } catch (error) {
                handleError(error, 'startWatching');
                throw error;
            }
        }, 'Start Watching');
    }, [viewerId, state.connectedCamera, state.isWatching, setLoading, clearError, safeSetState, handleError]);

    const stopWatching = useCallback(() => {
        try {
            logViewer(viewerId, 'stopWatching', '스트림 시청 중지');

            if (state.connectedCamera && state.isWatching) {
                streamingService.leaveStream(state.connectedCamera.id, viewerId);
            }

            // WebRTC 스트림 중지
            webrtcService.stopAllStreams();

            safeSetState(prev => ({
                ...prev,
                isWatching: false,
                error: null
            }));

            logViewer(viewerId, 'stopWatching', '스트림 시청 중지 완료');
        } catch (error) {
            handleError(error, 'stopWatching');
        }
    }, [viewerId, state.connectedCamera, state.isWatching, safeSetState, handleError]);

    // ============================================================================
    // PIN 코드로 홈캠 검색 및 연결
    // ============================================================================

    const connectByPinCode = useCallback(async (pinCode: string): Promise<boolean> => {
        console.log('🚀 [PIN 연결] connectByPinCode 함수 시작');
        console.log('🚀 [PIN 연결] 입력된 PIN:', pinCode);
        console.log('🚀 [PIN 연결] 뷰어 ID:', viewerId);

        return safeExecute(async () => {
            console.log('🚀 [PIN 연결] safeExecute 시작');

            if (isConnectingRef.current) {
                console.log('❌ [PIN 연결] 이미 연결 중');
                logViewer(viewerId, 'connectByPinCode', '이미 연결 중입니다');
                throw new Error('이미 연결 중입니다. 잠시 후 다시 시도해주세요.');
            }

            console.log('🚀 [PIN 연결] 연결 상태 설정');
            isConnectingRef.current = true;
            setLoading(true);
            clearError();

            try {
                logViewer(viewerId, 'connectByPinCode', 'PIN 코드로 연결 시작', { pinCode });
                console.log('🔍 [뷰어 연결] PIN 코드 입력:', pinCode);
                console.log('🔍 [뷰어 연결] 뷰어 ID:', viewerId);

                // 입력 검증
                if (!pinCode.trim()) {
                    console.error('❌ [뷰어 연결] PIN 코드가 비어있음');
                    throw new ValidationError('PIN 코드를 입력해 주세요.');
                }

                if (pinCode.length !== 6) {
                    console.error('❌ [뷰어 연결] PIN 코드 길이 오류:', pinCode.length);
                    throw new ValidationError('PIN 코드는 6자리여야 합니다.');
                }

                console.log('✅ [뷰어 연결] PIN 코드 검증 통과');

                // 인증 토큰 확인
                const token = getAccessToken();
                if (!token) {
                    console.error('❌ [뷰어 연결] 인증 토큰 없음');
                    throw new AuthError('인증이 필요합니다. 다시 로그인해 주세요.');
                }
                console.log('✅ [뷰어 연결] 인증 토큰 확인됨');

                // PIN 코드로 홈캠 검색 API 호출
                const { getApiBaseUrl } = await import('../config');
                const searchUrl = `${getApiBaseUrl()}/cameras/search/pin/${pinCode}`;
                console.log('🌐 [뷰어 연결] 검색 API URL:', searchUrl);

                const searchResult = await makeAuthenticatedRequest<any>(
                    searchUrl,
                    getAccessToken,
                    {
                        method: 'GET',
                        context: 'Camera Search by PIN'
                    }
                );

                console.log('📥 [뷰어 연결] 검색 응답:', JSON.stringify(searchResult, null, 2));

                // 중첩된 응답 구조 처리
                const cameraData: CameraSearchResponse = (searchResult as any)?.data?.data
                    || (searchResult as any)?.data
                    || (searchResult as any);

                // 카메라 데이터 검증
                if (!validateSearchResponse(cameraData)) {
                    console.error('❌ [뷰어 연결] 카메라 데이터 검증 실패:', cameraData);
                    throw new ValidationError('카메라 데이터 형식이 올바르지 않습니다.');
                }

                console.log('✅ [뷰어 연결] 홈캠 검색 성공:', JSON.stringify(cameraData, null, 2));

                // 홈캠 연결 API 호출
                const connectUrl = `${getApiBaseUrl()}/cameras/connect/pin/${pinCode}`;
                console.log('🔗 [뷰어 연결] 연결 API URL:', connectUrl);

                const connectResult = await makeAuthenticatedRequest(connectUrl, getAccessToken, {
                    method: 'POST',
                    context: 'Camera Connect by PIN'
                });

                console.log('📥 [뷰어 연결] 연결 응답:', JSON.stringify(connectResult, null, 2));
                console.log('✅ [뷰어 연결] 홈캠 연결 성공');

                // 미디어 서버 뷰어 URL 추출
                let viewerUrl: string | undefined;
                if (connectResult && typeof connectResult === 'object') {
                    // axios/fetch 래퍼의 형태에 따라 내부 data에 존재할 수 있음
                    const dataLevel1 = (connectResult as any).data;
                    const dataLevel2 = dataLevel1?.data;
                    const media = dataLevel2?.media || dataLevel1?.media;
                    viewerUrl = media?.viewerUrl;
                }

                // WebSocket 연결 확인
                if (!streamingService.isConnected()) {
                    console.log('🔌 [뷰어 연결] WebSocket 연결 시작...');
                    const wsConnected = await streamingService.connect();
                    if (!wsConnected) {
                        console.error('❌ [뷰어 연결] WebSocket 연결 실패');
                        throw new NetworkError('실시간 연결을 설정할 수 없습니다.');
                    }
                    console.log('✅ [뷰어 연결] WebSocket 연결 성공');
                } else {
                    console.log('✅ [뷰어 연결] WebSocket 이미 연결됨');
                }

                // 스트림 참여 이벤트 리스너 추가
                const onStreamJoined = (data: any) => {
                    if (data.cameraId === cameraData.cameraId && data.viewerId === viewerId) {
                        console.log('✅ [뷰어 연결] 스트림 참여 확인됨:', data);
                        streamingService.off('stream_joined', onStreamJoined);
                    }
                };
                streamingService.on('stream_joined', onStreamJoined);

                // 연결된 카메라 정보 설정
                const connectedCamera: ServiceCameraStream = {
                    id: cameraData.cameraId,
                    name: cameraData.cameraName,
                    status: (cameraData.status as 'online' | 'offline' | 'streaming') || 'online',
                    viewers: [],
                    streamUrl: undefined,
                    metadata: { resolution: 'unknown', frameRate: 30, quality: 'medium' }
                };

                console.log('📋 [뷰어 연결] 연결된 카메라 정보:', JSON.stringify(connectedCamera, null, 2));

                // streamingService의 connectedCameras에 카메라 추가
                console.log('🔧 [카메라 추가] addConnectedCamera 호출 전');
                streamingService.addConnectedCamera(connectedCamera);
                console.log('🔧 [카메라 추가] addConnectedCamera 호출 후');

                // 추가 후 카메라 목록 확인
                const camerasAfterAdd = streamingService.getConnectedCameras();
                console.log('🔧 [카메라 추가] 추가 후 카메라 목록:', JSON.stringify(camerasAfterAdd, null, 2));
                console.log('🔧 [카메라 추가] 추가 후 카메라 개수:', camerasAfterAdd.length);

                // WebRTC 스트림 수신 시작
                console.log('🎥 [뷰어 연결] WebRTC 스트림 수신 시작...');
                const stream = await webrtcService.startViewing(cameraData.cameraId, viewerId);

                // 스트림 수신 콜백 설정
                stream.onStreamReceived = (remoteStream: any) => {
                    console.log('📺 [뷰어 연결] 원격 스트림 수신됨:', remoteStream);
                    safeSetState(prev => ({
                        ...prev,
                        remoteStream,
                        isWatching: true
                    }));
                };

                safeSetState(prev => ({
                    ...prev,
                    connectedCamera,
                    currentStream: stream,
                    isConnected: true,
                    viewerMediaUrl: viewerUrl,
                    error: null,
                    isLoading: false,
                    connectionStatus: 'connected'
                }));

                console.log('🎉 [뷰어 연결] 완료! 홈캠에 성공적으로 연결되었습니다.');
                console.log('🎉 [뷰어 연결] 카메라 ID:', cameraData.cameraId);
                console.log('🎉 [뷰어 연결] 카메라 이름:', cameraData.cameraName);
                console.log('🎉 [뷰어 연결] 연결 상태:', 'connected');
                console.log('🎉 [뷰어 연결] 스트림 ID:', stream.id);

                logViewer(viewerId, 'connectByPinCode', 'PIN 코드로 연결 완료', { cameraId: cameraData.cameraId });
                return true;
            } catch (error) {
                console.error('❌ [뷰어 연결] 오류 발생:', error);
                console.error('❌ [뷰어 연결] 오류 상세:', {
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : 'No stack trace',
                    context: 'Viewer Connection by PIN',
                    pinCode,
                    viewerId
                });
                handleError(error, 'connectByPinCode');
                return false;
            } finally {
                isConnectingRef.current = false;
            }
        }, 'Connect By PIN Code');
    }, [viewerId, getAccessToken, setLoading, clearError, safeSetState, handleError]);

    // ============================================================================
    // 연결 코드로 홈캠 검색 및 연결 (기존 QR 코드용)
    // ============================================================================

    const connectByCode = useCallback(async (connectionId: string): Promise<boolean> => {
        return safeExecute(async () => {
            if (isConnectingRef.current) {
                logViewer(viewerId, 'connectByCode', '이미 연결 중입니다');
                throw new Error('이미 연결 중입니다. 잠시 후 다시 시도해주세요.');
            }

            isConnectingRef.current = true;
            setLoading(true);
            clearError();

            try {
                logViewer(viewerId, 'connectByCode', '코드로 연결 시작', { connectionId });

                // 입력 검증
                if (!connectionId.trim()) {
                    throw new ValidationError('연결 코드를 입력해 주세요.');
                }

                // 인증 토큰 확인
                const token = getAccessToken();
                if (!token) {
                    throw new AuthError('인증이 필요합니다. 다시 로그인해 주세요.');
                }

                // 홈캠 검색 API 호출
                const searchUrl = `${process.env.EXPO_PUBLIC_API_URL}/cameras/search/${connectionId}`;
                const searchResult = await makeAuthenticatedRequest<any>(
                    searchUrl,
                    getAccessToken,
                    {
                        method: 'GET',
                        context: 'Camera Search'
                    }
                );

                // 중첩된 응답 구조 처리
                const cameraData: CameraSearchResponse = (searchResult as any)?.data?.data
                    || (searchResult as any)?.data
                    || (searchResult as any);

                // 카메라 데이터 검증
                if (!validateSearchResponse(cameraData)) {
                    throw new ValidationError('카메라 데이터 형식이 올바르지 않습니다.');
                }

                // 홈캠 연결 API 호출
                const connectUrl = `${process.env.EXPO_PUBLIC_API_URL}/cameras/connect/${connectionId}`;
                await makeAuthenticatedRequest(connectUrl, getAccessToken, {
                    method: 'POST',
                    context: 'Camera Connect'
                });

                // WebSocket 연결 확인
                if (!streamingService.isConnected()) {
                    const wsConnected = await streamingService.connect();
                    if (!wsConnected) {
                        throw new NetworkError('실시간 연결을 설정할 수 없습니다.');
                    }
                }

                // 연결된 카메라 정보 설정
                const connectedCamera: CameraStream = {
                    id: cameraData.cameraId,
                    name: cameraData.cameraName,
                    status: (cameraData.status as 'online' | 'offline' | 'streaming') || 'online',
                    viewers: [],
                    streamUrl: undefined
                };

                safeSetState(prev => ({
                    ...prev,
                    connectedCamera,
                    isConnected: true,
                    error: null,
                    isLoading: false,
                    connectionStatus: 'connected'
                }));

                Alert.alert(
                    '연결 성공! 🎉',
                    `${cameraData.cameraName}에 연결되었습니다.`,
                    [{ text: '확인', style: 'default' }]
                );

                logViewer(viewerId, 'connectByCode', '코드로 연결 완료', { cameraId: cameraData.cameraId });
                return true;
            } catch (error) {
                handleError(error, 'connectByCode');
                return false;
            } finally {
                isConnectingRef.current = false;
            }
        }, 'Connect By Code');
    }, [viewerId, getAccessToken, setLoading, clearError, safeSetState, handleError]);

    // ============================================================================
    // 수동 재연결
    // ============================================================================

    const reconnect = useCallback(async (): Promise<void> => {
        if (isConnectingRef.current) {
            logViewer(viewerId, 'reconnect', '이미 재연결 중입니다');
            return;
        }

        isConnectingRef.current = true;

        try {
            logViewer(viewerId, 'reconnect', '수동 재연결 시작');

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

            logViewer(viewerId, 'reconnect', '수동 재연결 완료');
        } catch (error) {
            handleError(error, 'reconnect');
        } finally {
            isConnectingRef.current = false;
        }
    }, [viewerId, clearError, safeSetState, handleError]);

    // ============================================================================
    // 재시도
    // ============================================================================

    const retry = useCallback(() => {
        logViewer(viewerId, 'retry', '재시도 시작');

        clearError();
        safeSetState(prev => ({ ...prev, reconnectAttempt: 0 }));
        reconnect();
    }, [viewerId, clearError, safeSetState, reconnect]);

    // ============================================================================
    // WebSocket 이벤트 핸들러들
    // ============================================================================

    useEffect(() => {
        const handleConnected = () => {
            logViewer(viewerId, 'websocket', 'WebSocket 연결됨');

            safeSetState(prev => ({
                ...prev,
                isConnected: true,
                error: null,
                reconnectAttempt: 0,
                connectionStatus: 'connected'
            }));
            refreshAvailableCameras();
        };

        const handleDisconnected = (reason?: string) => {
            logViewer(viewerId, 'websocket', 'WebSocket 연결 해제됨', { reason });

            safeSetState(prev => ({
                ...prev,
                isConnected: false,
                connectedCamera: null,
                isWatching: false,
                connectionStatus: reason === 'manual' ? 'disconnected' : 'error'
            }));

            if (reason !== 'manual') {
                scheduleReconnect();
            }
        };

        const handleCameraConnected = (cameraData: CameraStream) => {
            logViewer(viewerId, 'websocket', '카메라 연결됨', { cameraId: cameraData.id });

            safeSetState(prev => ({
                ...prev,
                availableCameras: [...prev.availableCameras.filter(c => c.id !== cameraData.id), cameraData]
            }));
        };

        const handleCameraDisconnected = (cameraId: string) => {
            logViewer(viewerId, 'websocket', '카메라 연결 해제됨', { cameraId });

            safeSetState(prev => ({
                ...prev,
                availableCameras: prev.availableCameras.filter(c => c.id !== cameraId),
                connectedCamera: prev.connectedCamera?.id === cameraId ? null : prev.connectedCamera,
                isWatching: prev.connectedCamera?.id === cameraId ? false : prev.isWatching
            }));

            // 현재 시청 중인 카메라가 연결 해제된 경우 알림
            if (state.connectedCamera?.id === cameraId && state.isWatching) {
                Alert.alert(
                    '카메라 연결 해제',
                    '시청 중인 카메라의 연결이 해제되었습니다.',
                    [{ text: '확인', style: 'default' }]
                );
            }
        };

        const handleStreamStarted = (streamData: StreamConnection) => {
            if (streamData.viewerId === viewerId) {
                logViewer(viewerId, 'websocket', '스트림 시작됨', { streamId: streamData.id });

                safeSetState(prev => ({ ...prev, isWatching: true }));
            }
        };

        const handleStreamStopped = (streamId: string) => {
            logViewer(viewerId, 'websocket', '스트림 중지됨', { streamId });

            safeSetState(prev => ({ ...prev, isWatching: false }));
        };

        const handleStreamingError = (error: any) => {
            logViewerError(viewerId, 'websocket', '스트리밍 오류', error instanceof Error ? error : undefined);
            handleError(error, 'WebSocket');
        };

        // ============================================================================
        // 이벤트 리스너 등록
        // ============================================================================

        streamingService.on('connected', handleConnected);
        streamingService.on('disconnected', handleDisconnected);
        streamingService.on('cameraConnected', handleCameraConnected);
        streamingService.on('cameraDisconnected', handleCameraDisconnected);
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

            // WebRTC 연결 정리
            webrtcService.stopAllStreams();

            // 이벤트 리스너 제거
            streamingService.off('connected', handleConnected);
            streamingService.off('disconnected', handleDisconnected);
            streamingService.off('cameraConnected', handleCameraConnected);
            streamingService.off('cameraDisconnected', handleCameraDisconnected);
            streamingService.off('streamStarted', handleStreamStarted);
            streamingService.off('streamStopped', handleStreamStopped);
            streamingService.off('error', handleStreamingError);

            logViewer(viewerId, 'cleanup', '뷰어 연결 훅 정리 완료');
        };
    }, [viewerId, safeSetState, handleError, scheduleReconnect, refreshAvailableCameras, state.connectedCamera, state.isWatching]);

    // ============================================================================
    // 액션 객체 생성
    // ============================================================================

    const actions: ViewerConnectionActions = useMemo(() => ({
        connectToCamera,
        disconnectFromCamera,
        startWatching,
        stopWatching,
        scanQRCode,
        connectByCode,
        connectByPinCode, // 추가
        refreshAvailableCameras,
        reconnect,
        clearError,
        retry,
    }), [
        connectToCamera,
        disconnectFromCamera,
        startWatching,
        stopWatching,
        scanQRCode,
        connectByCode,
        connectByPinCode, // 추가
        refreshAvailableCameras,
        reconnect,
        clearError,
        retry,
    ]);

    return [state, actions] as const;
}
