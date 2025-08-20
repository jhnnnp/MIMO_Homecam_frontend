import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import streamingService, { CameraStream, StreamConnection } from '../services/streamingService';

export interface ViewerConnectionState {
    isConnected: boolean;
    connectedCamera: CameraStream | null;
    isWatching: boolean;
    error: string | null;
    availableCameras: CameraStream[];
}

export interface ViewerConnectionActions {
    connectToCamera: (cameraId: string) => Promise<boolean>;
    disconnectFromCamera: () => void;
    startWatching: (cameraId: string) => Promise<void>;
    stopWatching: () => void;
    scanQRCode: (qrData: string) => Promise<boolean>;
    refreshAvailableCameras: () => void;
    reconnect: () => void;
}

export function useViewerConnection(viewerId: string) {
    const [state, setState] = useState<ViewerConnectionState>({
        isConnected: false,
        connectedCamera: null,
        isWatching: false,
        error: null,
        availableCameras: [],
    });

    // WebSocket 연결 관리
    useEffect(() => {
        // 초기에는 자동 연결하지 않음
        console.log('👁️ 뷰어 모드 준비됨 - QR 코드 스캔 시 연결됩니다.');

        // 이벤트 리스너 등록
        const handleConnected = () => {
            setState(prev => ({ ...prev, isConnected: true, error: null }));
            refreshAvailableCameras();
        };

        const handleDisconnected = () => {
            setState(prev => ({
                ...prev,
                isConnected: false,
                connectedCamera: null,
                isWatching: false
            }));
        };

        const handleCameraConnected = (cameraData: CameraStream) => {
            setState(prev => ({
                ...prev,
                availableCameras: [...prev.availableCameras.filter(c => c.id !== cameraData.id), cameraData]
            }));
        };

        const handleCameraDisconnected = (cameraId: string) => {
            setState(prev => ({
                ...prev,
                availableCameras: prev.availableCameras.filter(c => c.id !== cameraId),
                connectedCamera: prev.connectedCamera?.id === cameraId ? null : prev.connectedCamera
            }));
        };

        const handleStreamStarted = (streamData: StreamConnection) => {
            if (streamData.viewerId === viewerId) {
                setState(prev => ({
                    ...prev,
                    isWatching: true
                }));
            }
        };

        const handleStreamStopped = (streamId: string) => {
            setState(prev => ({
                ...prev,
                isWatching: false
            }));
        };

        const handleError = (error: any) => {
            setState(prev => ({ ...prev, error: error.message || '연결 오류가 발생했습니다.' }));
        };

        // 이벤트 리스너 등록
        streamingService.on('connected', handleConnected);
        streamingService.on('disconnected', handleDisconnected);
        streamingService.on('cameraConnected', handleCameraConnected);
        streamingService.on('cameraDisconnected', handleCameraDisconnected);
        streamingService.on('streamStarted', handleStreamStarted);
        streamingService.on('streamStopped', handleStreamStopped);
        streamingService.on('error', handleError);

        // 클린업
        return () => {
            streamingService.off('connected', handleConnected);
            streamingService.off('disconnected', handleDisconnected);
            streamingService.off('cameraConnected', handleCameraConnected);
            streamingService.off('cameraDisconnected', handleCameraDisconnected);
            streamingService.off('streamStarted', handleStreamStarted);
            streamingService.off('streamStopped', handleStreamStopped);
            streamingService.off('error', handleError);
        };
    }, [viewerId]);

    // 사용 가능한 카메라 목록 새로고침
    const refreshAvailableCameras = useCallback(() => {
        const cameras = streamingService.getConnectedCameras();
        setState(prev => ({ ...prev, availableCameras: cameras }));
    }, []);

    // QR 코드 스캔으로 카메라 연결
    const scanQRCode = useCallback(async (qrData: string): Promise<boolean> => {
        try {
            const parsedData = JSON.parse(qrData);

            if (parsedData.type !== 'mimo_camera_connect') {
                throw new Error('잘못된 QR 코드입니다.');
            }

            const { cameraId, cameraName } = parsedData;

            // QR 코드 스캔 시 서버 연결 시도
            if (!streamingService.isConnected()) {
                console.log('🔗 서버에 연결 중...');
                const connected = await streamingService.connect();
                if (!connected) {
                    throw new Error('서버에 연결할 수 없습니다.');
                }
            }

            // 연결 시도
            const success = await connectToCamera(cameraId);
            if (success) {
                Alert.alert('연결 성공', `${cameraName}에 성공적으로 연결되었습니다!`);
                return true;
            } else {
                throw new Error('카메라 연결에 실패했습니다.');
            }
        } catch (error) {
            console.error('QR 코드 스캔 실패:', error);
            setState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'QR 코드를 처리할 수 없습니다.'
            }));
            Alert.alert('연결 실패', error instanceof Error ? error.message : 'QR 코드를 처리할 수 없습니다.');
            return false;
        }
    }, []);

    // 카메라에 연결
    const connectToCamera = useCallback(async (cameraId: string): Promise<boolean> => {
        try {
            if (!state.isConnected) {
                throw new Error('서버에 연결되지 않았습니다.');
            }

            const camera = streamingService.getCamera(cameraId);
            if (!camera) {
                throw new Error('카메라를 찾을 수 없습니다.');
            }

            // 연결 시도 (실제로는 서버에서 연결 상태 확인)
            streamingService.joinStream(cameraId, viewerId);

            setState(prev => ({
                ...prev,
                connectedCamera: camera,
                error: null
            }));

            return true;
        } catch (error) {
            console.error('카메라 연결 실패:', error);
            setState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : '카메라에 연결할 수 없습니다.'
            }));
            return false;
        }
    }, [state.isConnected, viewerId]);

    // 카메라에서 연결 해제
    const disconnectFromCamera = useCallback(() => {
        if (state.connectedCamera) {
            streamingService.leaveStream(state.connectedCamera.id, viewerId);
            setState(prev => ({
                ...prev,
                connectedCamera: null,
                isWatching: false
            }));
        }
    }, [state.connectedCamera, viewerId]);

    // 스트림 시청 시작
    const startWatching = useCallback(async (cameraId: string): Promise<void> => {
        try {
            if (!state.connectedCamera || state.connectedCamera.id !== cameraId) {
                throw new Error('먼저 카메라에 연결해주세요.');
            }

            // 스트림 시청 시작
            streamingService.joinStream(cameraId, viewerId);

            setState(prev => ({
                ...prev,
                isWatching: true,
                error: null
            }));
        } catch (error) {
            console.error('스트림 시청 시작 실패:', error);
            setState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : '스트림을 시작할 수 없습니다.'
            }));
            throw error;
        }
    }, [state.connectedCamera, viewerId]);

    // 스트림 시청 중지
    const stopWatching = useCallback(() => {
        if (state.connectedCamera) {
            streamingService.leaveStream(state.connectedCamera.id, viewerId);
            setState(prev => ({
                ...prev,
                isWatching: false
            }));
        }
    }, [state.connectedCamera, viewerId]);

    // 수동 재연결
    const reconnect = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
        streamingService.reconnect();
    }, []);

    const actions: ViewerConnectionActions = {
        connectToCamera,
        disconnectFromCamera,
        startWatching,
        stopWatching,
        scanQRCode,
        refreshAvailableCameras,
        reconnect,
    };

    return [state, actions] as const;
} 