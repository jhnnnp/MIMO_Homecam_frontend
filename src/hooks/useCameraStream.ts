// ============================================================================
// IMPROVED USE CAMERA STREAM HOOK - 개선된 카메라 스트림 훅
// ============================================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Camera, CameraType, FlashMode } from 'expo-camera';
import { Audio } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import { Alert } from 'react-native';

import {
    StreamState,
    StreamActions,
    StreamQuality,
    MediaStream
} from '../types/hooks';
import streamingService from '../services/streamingService';
import recordingService from '../services/recordingService';
import settingsService from '../services/settingsService';
import { logger, logStreaming, logStreamingError } from '../utils/logger';

// ============================================================================
// 상수 정의
// ============================================================================

const DEFAULT_STREAM_QUALITY: StreamQuality = {
    resolution: '720p',
    fps: 30,
    bitrate: 2000000, // 2Mbps
    codec: 'h264',
};

const QUALITY_PRESETS: Record<string, StreamQuality> = {
    low: {
        resolution: '360p',
        fps: 15,
        bitrate: 500000,
        codec: 'h264',
    },
    medium: {
        resolution: '480p',
        fps: 24,
        bitrate: 1000000,
        codec: 'h264',
    },
    high: {
        resolution: '720p',
        fps: 30,
        bitrate: 2000000,
        codec: 'h264',
    },
    ultra: {
        resolution: '1080p',
        fps: 30,
        bitrate: 4000000,
        codec: 'h264',
    },
};

// ============================================================================
// 메인 카메라 스트림 훅
// ============================================================================

export const useCameraStream = (): HookReturn<StreamState, StreamActions> => {

    // ============================================================================
    // 상태 관리
    // ============================================================================

    const [state, setState] = useState<StreamState>({
        activeStreams: new Map(),
        streamQuality: DEFAULT_STREAM_QUALITY,
        isStreaming: false,
        streamTime: 0,
        viewerCount: 0,
        error: null,
        isLoading: false,
        connectionStatus: 'disconnected',
    });

    // ============================================================================
    // Refs
    // ============================================================================

    const isMountedRef = useRef(true);
    const streamTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const activeStreamsRef = useRef<Map<string, MediaStream>>(new Map());
    const isStartingStreamRef = useRef(false);
    const isStoppingStreamRef = useRef(false);

    // ============================================================================
    // 안전한 상태 업데이트
    // ============================================================================

    const safeSetState = useCallback((updater: (prev: StreamState) => StreamState) => {
        if (isMountedRef.current) {
            setState(updater);
        }
    }, []);

    // ============================================================================
    // 에러 처리
    // ============================================================================

    const handleError = useCallback((error: unknown, action: string) => {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
        logStreamingError('unknown', action, errorMessage, error instanceof Error ? error : undefined);

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
    // 스트림 품질 관리
    // ============================================================================

    const getOptimalStreamQuality = useCallback(async (): Promise<StreamQuality> => {
        try {
            // 설정 서비스에서 사용자 설정 가져오기
            const userSettings = await settingsService.getStreamSettings();

            if (userSettings?.quality) {
                return QUALITY_PRESETS[userSettings.quality] || DEFAULT_STREAM_QUALITY;
            }

            // 네트워크 상태에 따른 자동 품질 조정
            const networkInfo = await settingsService.getNetworkInfo();

            if (networkInfo?.type === 'wifi' && networkInfo?.speed === 'fast') {
                return QUALITY_PRESETS.high;
            } else if (networkInfo?.type === 'cellular') {
                return QUALITY_PRESETS.medium;
            } else {
                return QUALITY_PRESETS.low;
            }
        } catch (error) {
            logStreamingError('unknown', 'getOptimalStreamQuality', '최적 품질 조정 실패', error instanceof Error ? error : undefined);
            return DEFAULT_STREAM_QUALITY;
        }
    }, []);

    // ============================================================================
    // 스트림 시작
    // ============================================================================

    const startStream = useCallback(async (
        cameraId: string,
        quality?: Partial<StreamQuality>
    ): Promise<void> => {
        if (isStartingStreamRef.current) {
            logStreaming(cameraId, 'startStream', '이미 스트림 시작 중입니다');
            return;
        }

        if (activeStreamsRef.current.has(cameraId)) {
            logStreaming(cameraId, 'startStream', '이미 활성 스트림이 있습니다');
            return;
        }

        isStartingStreamRef.current = true;
        setLoading(true);

        try {
            logStreaming(cameraId, 'startStream', '스트림 시작');

            // 최적 품질 결정
            const optimalQuality = await getOptimalStreamQuality();
            const finalQuality = { ...optimalQuality, ...quality };

            // 스트리밍 서비스에서 스트림 시작
            const stream = await streamingService.startStream(cameraId, finalQuality);

            if (!stream) {
                throw new Error('스트림을 시작할 수 없습니다.');
            }

            // MediaStream 객체 생성
            const mediaStream: MediaStream = {
                id: cameraId,
                stream,
                quality: finalQuality,
                isActive: true,
                createdAt: Date.now(),
            };

            // 활성 스트림에 추가
            activeStreamsRef.current.set(cameraId, mediaStream);

            safeSetState(prev => ({
                ...prev,
                activeStreams: new Map(activeStreamsRef.current),
                streamQuality: finalQuality,
                isStreaming: true,
                streamTime: 0,
                error: null,
                isLoading: false,
                connectionStatus: 'connected',
            }));

            logStreaming(cameraId, 'startStream', '스트림 시작 완료', { quality: finalQuality });
        } catch (error) {
            handleError(error, 'startStream');
            throw error;
        } finally {
            isStartingStreamRef.current = false;
        }
    }, [setLoading, getOptimalStreamQuality, safeSetState, handleError]);

    // ============================================================================
    // 스트림 중지
    // ============================================================================

    const stopStream = useCallback(async (cameraId: string): Promise<void> => {
        if (isStoppingStreamRef.current) {
            logStreaming(cameraId, 'stopStream', '이미 스트림 중지 중입니다');
            return;
        }

        if (!activeStreamsRef.current.has(cameraId)) {
            logStreaming(cameraId, 'stopStream', '활성 스트림이 없습니다');
            return;
        }

        isStoppingStreamRef.current = true;

        try {
            logStreaming(cameraId, 'stopStream', '스트림 중지');

            // 스트리밍 서비스에서 스트림 중지
            await streamingService.stopStream(cameraId);

            // 활성 스트림에서 제거
            activeStreamsRef.current.delete(cameraId);

            // 스트림 객체 정리
            const mediaStream = activeStreamsRef.current.get(cameraId);
            if (mediaStream?.stream) {
                // WebRTC 스트림 정리
                if (mediaStream.stream.getTracks) {
                    mediaStream.stream.getTracks().forEach(track => track.stop());
                }
            }

            safeSetState(prev => ({
                ...prev,
                activeStreams: new Map(activeStreamsRef.current),
                isStreaming: activeStreamsRef.current.size > 0,
                error: null,
            }));

            logStreaming(cameraId, 'stopStream', '스트림 중지 완료');
        } catch (error) {
            handleError(error, 'stopStream');
            throw error;
        } finally {
            isStoppingStreamRef.current = false;
        }
    }, [safeSetState, handleError]);

    // ============================================================================
    // 스트림 품질 업데이트
    // ============================================================================

    const updateStreamQuality = useCallback((
        cameraId: string,
        quality: Partial<StreamQuality>
    ): void => {
        const mediaStream = activeStreamsRef.current.get(cameraId);
        if (!mediaStream) {
            logStreamingError(cameraId, 'updateStreamQuality', '활성 스트림을 찾을 수 없습니다');
            return;
        }

        try {
            logStreaming(cameraId, 'updateStreamQuality', '스트림 품질 업데이트', quality);

            // 스트리밍 서비스에서 품질 업데이트
            streamingService.updateStreamQuality(cameraId, quality);

            // 로컬 상태 업데이트
            const updatedMediaStream: MediaStream = {
                ...mediaStream,
                quality: { ...mediaStream.quality, ...quality },
            };

            activeStreamsRef.current.set(cameraId, updatedMediaStream);

            safeSetState(prev => ({
                ...prev,
                activeStreams: new Map(activeStreamsRef.current),
                streamQuality: updatedMediaStream.quality,
            }));

            logStreaming(cameraId, 'updateStreamQuality', '스트림 품질 업데이트 완료');
        } catch (error) {
            handleError(error, 'updateStreamQuality');
        }
    }, [safeSetState, handleError]);

    // ============================================================================
    // 활성 스트림 조회
    // ============================================================================

    const getActiveStreams = useCallback((): Map<string, MediaStream> => {
        return new Map(activeStreamsRef.current);
    }, []);

    // ============================================================================
    // 스트림 상태 모니터링
    // ============================================================================

    const monitorStreamHealth = useCallback(async (cameraId: string): Promise<void> => {
        const mediaStream = activeStreamsRef.current.get(cameraId);
        if (!mediaStream) return;

        try {
            // 스트림 상태 확인
            const health = await streamingService.getStreamHealth(cameraId);

            if (health.status === 'degraded') {
                logStreaming(cameraId, 'monitorStreamHealth', '스트림 품질 저하 감지', health);

                // 자동 품질 조정
                if (health.recommendedQuality) {
                    updateStreamQuality(cameraId, health.recommendedQuality);
                }
            } else if (health.status === 'failed') {
                logStreamingError(cameraId, 'monitorStreamHealth', '스트림 실패 감지', undefined, health);

                // 스트림 재시작
                await stopStream(cameraId);
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
                await startStream(cameraId);
            }
        } catch (error) {
            logStreamingError(cameraId, 'monitorStreamHealth', '스트림 상태 모니터링 실패', error instanceof Error ? error : undefined);
        }
    }, [updateStreamQuality, stopStream, startStream]);

    // ============================================================================
    // 뷰어 수 업데이트
    // ============================================================================

    const updateViewerCount = useCallback((cameraId: string, count: number): void => {
        safeSetState(prev => ({
            ...prev,
            viewerCount: count,
        }));
    }, [safeSetState]);

    // ============================================================================
    // 타이머 관리
    // ============================================================================

    useEffect(() => {
        if (state.isStreaming) {
            streamTimeIntervalRef.current = setInterval(() => {
                safeSetState(prev => ({ ...prev, streamTime: prev.streamTime + 1 }));
            }, 1000);
        } else {
            if (streamTimeIntervalRef.current) {
                clearInterval(streamTimeIntervalRef.current);
                streamTimeIntervalRef.current = null;
            }
        }

        return () => {
            if (streamTimeIntervalRef.current) {
                clearInterval(streamTimeIntervalRef.current);
            }
        };
    }, [state.isStreaming, safeSetState]);

    // ============================================================================
    // 스트림 상태 모니터링
    // ============================================================================

    useEffect(() => {
        if (!state.isStreaming) return;

        const healthCheckInterval = setInterval(() => {
            activeStreamsRef.current.forEach((_, cameraId) => {
                monitorStreamHealth(cameraId);
            });
        }, 10000); // 10초마다 상태 확인

        return () => {
            clearInterval(healthCheckInterval);
        };
    }, [state.isStreaming, monitorStreamHealth]);

    // ============================================================================
    // WebSocket 이벤트 핸들러
    // ============================================================================

    useEffect(() => {
        const handleStreamStarted = (data: { streamId: string; cameraId: string }) => {
            logStreaming(data.cameraId, 'websocket', '스트림 시작됨', { streamId: data.streamId });

            safeSetState(prev => ({
                ...prev,
                isStreaming: true,
                connectionStatus: 'connected',
                error: null,
            }));
        };

        const handleStreamStopped = (data: { streamId: string; cameraId: string }) => {
            logStreaming(data.cameraId, 'websocket', '스트림 중지됨', { streamId: data.streamId });

            // 활성 스트림에서 제거
            activeStreamsRef.current.delete(data.cameraId);

            safeSetState(prev => ({
                ...prev,
                activeStreams: new Map(activeStreamsRef.current),
                isStreaming: activeStreamsRef.current.size > 0,
            }));
        };

        const handleViewerJoined = (data: { streamId: string; viewerId: string; cameraId: string }) => {
            logStreaming(data.cameraId, 'websocket', '뷰어 참여', { viewerId: data.viewerId });

            safeSetState(prev => ({
                ...prev,
                viewerCount: prev.viewerCount + 1,
            }));
        };

        const handleViewerLeft = (data: { streamId: string; viewerId: string; cameraId: string }) => {
            logStreaming(data.cameraId, 'websocket', '뷰어 퇴장', { viewerId: data.viewerId });

            safeSetState(prev => ({
                ...prev,
                viewerCount: Math.max(0, prev.viewerCount - 1),
            }));
        };

        const handleStreamError = (error: any) => {
            logStreamingError('unknown', 'websocket', '스트림 오류', error instanceof Error ? error : undefined);
            handleError(error, 'WebSocket');
        };

        // 이벤트 리스너 등록
        streamingService.on('streamStarted', handleStreamStarted);
        streamingService.on('streamStopped', handleStreamStopped);
        streamingService.on('viewerJoined', handleViewerJoined);
        streamingService.on('viewerLeft', handleViewerLeft);
        streamingService.on('streamError', handleStreamError);

        return () => {
            // 이벤트 리스너 제거
            streamingService.off('streamStarted', handleStreamStarted);
            streamingService.off('streamStopped', handleStreamStopped);
            streamingService.off('viewerJoined', handleViewerJoined);
            streamingService.off('viewerLeft', handleViewerLeft);
            streamingService.off('streamError', handleStreamError);
        };
    }, [safeSetState, handleError]);

    // ============================================================================
    // 컴포넌트 언마운트 시 정리
    // ============================================================================

    useEffect(() => {
        return () => {
            isMountedRef.current = false;

            // 활성 스트림 모두 정리
            activeStreamsRef.current.forEach((mediaStream, cameraId) => {
                try {
                    streamingService.stopStream(cameraId);

                    // WebRTC 스트림 정리
                    if (mediaStream.stream.getTracks) {
                        mediaStream.stream.getTracks().forEach(track => track.stop());
                    }
                } catch (error) {
                    logStreamingError(cameraId, 'cleanup', '스트림 정리 실패', error instanceof Error ? error : undefined);
                }
            });

            activeStreamsRef.current.clear();

            // 타이머 정리
            if (streamTimeIntervalRef.current) {
                clearInterval(streamTimeIntervalRef.current);
            }

            logStreaming('unknown', 'cleanup', '카메라 스트림 훅 정리 완료');
        };
    }, []);

    // ============================================================================
    // 액션 객체 생성
    // ============================================================================

    const actions: StreamActions = useMemo(() => ({
        startStream,
        stopStream,
        updateStreamQuality,
        getActiveStreams,
    }), [
        startStream,
        stopStream,
        updateStreamQuality,
        getActiveStreams,
    ]);

    return [state, actions];
};
