import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import streamingService, { CameraStream, StreamConnection } from '../services/streamingService';

export interface CameraConnectionState {
    isConnected: boolean;
    isStreaming: boolean;
    connectedViewers: string[];
    connectionId: string | null;
    error: string | null;
    qrCodeData: string | null;
}

export interface CameraConnectionActions {
    generateQRCode: () => Promise<string>;
    startStreaming: () => Promise<void>;
    stopStreaming: () => Promise<void>;
    disconnect: () => void;
    reconnect: () => void;
}

export function useCameraConnection(cameraId: string, cameraName: string) {
    const [state, setState] = useState<CameraConnectionState>({
        isConnected: false,
        isStreaming: false,
        connectedViewers: [],
        connectionId: null,
        error: null,
        qrCodeData: null,
    });

    // WebSocket 연결 관리
    useEffect(() => {
        // 초기에는 자동 연결하지 않음
        console.log('🏠 홈캠 모드 준비됨 - 사용자가 QR 코드 생성 시 연결됩니다.');

        // 이벤트 리스너 등록
        const handleConnected = () => {
            setState(prev => ({ ...prev, isConnected: true, error: null }));
        };

        const handleDisconnected = () => {
            setState(prev => ({
                ...prev,
                isConnected: false,
                isStreaming: false,
                connectedViewers: []
            }));
        };

        const handleViewerJoined = (data: { streamId: string; viewerId: string }) => {
            setState(prev => ({
                ...prev,
                connectedViewers: [...prev.connectedViewers, data.viewerId]
            }));

            Alert.alert(
                '뷰어 연결됨',
                `뷰어가 스트림에 참여했습니다. (${data.viewerId})`
            );
        };

        const handleViewerLeft = (data: { streamId: string; viewerId: string }) => {
            setState(prev => ({
                ...prev,
                connectedViewers: prev.connectedViewers.filter(id => id !== data.viewerId)
            }));
        };

        const handleStreamStarted = (streamData: StreamConnection) => {
            setState(prev => ({
                ...prev,
                isStreaming: true,
                connectionId: streamData.id
            }));
        };

        const handleStreamStopped = (streamId: string) => {
            setState(prev => ({
                ...prev,
                isStreaming: false,
                connectionId: null,
                connectedViewers: []
            }));
        };

        const handleError = (error: any) => {
            setState(prev => ({ ...prev, error: error.message || '연결 오류가 발생했습니다.' }));
        };

        // 이벤트 리스너 등록
        streamingService.on('connected', handleConnected);
        streamingService.on('disconnected', handleDisconnected);
        streamingService.on('viewerJoined', handleViewerJoined);
        streamingService.on('viewerLeft', handleViewerLeft);
        streamingService.on('streamStarted', handleStreamStarted);
        streamingService.on('streamStopped', handleStreamStopped);
        streamingService.on('error', handleError);

        // 클린업
        return () => {
            streamingService.off('connected', handleConnected);
            streamingService.off('disconnected', handleDisconnected);
            streamingService.off('viewerJoined', handleViewerJoined);
            streamingService.off('viewerLeft', handleViewerLeft);
            streamingService.off('streamStarted', handleStreamStarted);
            streamingService.off('streamStopped', handleStreamStopped);
            streamingService.off('error', handleError);
        };
    }, [cameraId, cameraName]);

    // QR 코드 생성
    const generateQRCode = useCallback(async (): Promise<string> => {
        try {
            // QR 코드 생성 시 서버 연결 시도
            if (!streamingService.isConnected()) {
                console.log('🔗 서버에 연결 중...');
                const connected = await streamingService.connect();
                if (connected) {
                    // 카메라 등록
                    streamingService.registerCamera(cameraId, cameraName);
                } else {
                    throw new Error('서버에 연결할 수 없습니다.');
                }
            }

            const deviceId = `MIMO_${cameraId}_${Date.now()}`;
            const qrData = JSON.stringify({
                type: 'mimo_camera_connect',
                deviceId: deviceId,
                cameraId: cameraId,
                cameraName: cameraName,
                timestamp: Date.now(),
                version: '1.0.0'
            });

            setState(prev => ({ ...prev, qrCodeData: qrData }));
            return qrData;
        } catch (error) {
            console.error('QR 코드 생성 실패:', error);
            setState(prev => ({ ...prev, error: error instanceof Error ? error.message : 'QR 코드를 생성할 수 없습니다.' }));
            throw error;
        }
    }, [cameraId, cameraName]);

    // 스트리밍 시작
    const startStreaming = useCallback(async (): Promise<void> => {
        try {
            if (!state.isConnected) {
                throw new Error('서버에 연결되지 않았습니다.');
            }

            streamingService.startStream(cameraId);

            setState(prev => ({ ...prev, error: null }));
        } catch (error) {
            console.error('스트리밍 시작 실패:', error);
            setState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : '스트리밍을 시작할 수 없습니다.'
            }));
            throw error;
        }
    }, [cameraId, state.isConnected]);

    // 스트리밍 중지
    const stopStreaming = useCallback(async (): Promise<void> => {
        try {
            streamingService.stopStream(cameraId);
            setState(prev => ({
                ...prev,
                isStreaming: false,
                connectionId: null,
                connectedViewers: []
            }));
        } catch (error) {
            console.error('스트리밍 중지 실패:', error);
            setState(prev => ({
                ...prev,
                error: '스트리밍을 중지할 수 없습니다.'
            }));
            throw error;
        }
    }, [cameraId]);

    // 연결 해제
    const disconnect = useCallback(() => {
        streamingService.unregisterCamera(cameraId);
        streamingService.disconnect();
        setState({
            isConnected: false,
            isStreaming: false,
            connectedViewers: [],
            connectionId: null,
            error: null,
            qrCodeData: null,
        });
    }, [cameraId]);

    // 수동 재연결
    const reconnect = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
        streamingService.reconnect();
    }, []);

    const actions: CameraConnectionActions = {
        generateQRCode,
        startStreaming,
        stopStreaming,
        disconnect,
        reconnect,
    };

    return [state, actions] as const;
} 