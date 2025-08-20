import { useState, useEffect, useRef } from "react";
import { Camera, CameraType, FlashMode } from "expo-camera";
import { Audio } from "expo-av";
import streamingService from "../services/streamingService";
import * as MediaLibrary from "expo-media-library";
import { recordingService, RecordingSession } from "../services/recordingService";

export interface CameraStreamState {
    hasPermission: boolean;
    cameraType: CameraType;
    flashMode: FlashMode;
    isRecording: boolean;
    isStreaming: boolean;
    recordingTime: number;
    streamingTime: number;
    error: string | null;
    activeRecording?: RecordingSession;
    recordingSettings: {
        quality: 'low' | 'medium' | 'high' | 'max';
        maxDuration: number;
        autoSave: boolean;
        includeAudio: boolean;
    };
}

export interface CameraStreamActions {
    requestPermissions: () => Promise<void>;
    startRecording: (cameraId?: string) => Promise<void>;
    stopRecording: () => Promise<void>;
    startStreaming: () => Promise<void>;
    stopStreaming: () => Promise<void>;
    switchCamera: () => void;
    toggleFlash: () => void;
    takeSnapshot: () => Promise<string | null>;
    updateRecordingSettings: (settings: Partial<CameraStreamState['recordingSettings']>) => void;
    cameraRef: React.RefObject<Camera>;
}

export const useCameraStream = (): [CameraStreamState, CameraStreamActions] => {
    const [hasPermission, setHasPermission] = useState(false);
    const [cameraType, setCameraType] = useState<CameraType>('back'); // Expo Go 호환을 위해 문자열 사용
    const [flashMode, setFlashMode] = useState<FlashMode>('off'); // Expo Go 호환을 위해 문자열 사용
    const [isRecording, setIsRecording] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [streamingTime, setStreamingTime] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [activeRecording, setActiveRecording] = useState<RecordingSession | undefined>();
    const [recordingSettings, setRecordingSettings] = useState({
        quality: 'high' as const,
        maxDuration: 300, // 5분
        autoSave: true,
        includeAudio: true,
    });

    const cameraRef = useRef<Camera>(null);
    const recordingIntervalRef = useRef<NodeJS.Timeout>();
    const streamingIntervalRef = useRef<NodeJS.Timeout>();
    const currentRecordingSessionRef = useRef<string | null>(null);

    // 권한 요청
    const requestPermissions = async () => {
        try {
            setError(null);
            
            // 카메라 권한
            const cameraPermission = await Camera.requestCameraPermissionsAsync();
            const audioPermission = await Audio.requestPermissionsAsync();
            const mediaPermission = await MediaLibrary.requestPermissionsAsync();

            if (
                cameraPermission.status === "granted" &&
                audioPermission.status === "granted" &&
                mediaPermission.status === "granted"
            ) {
                setHasPermission(true);
            } else {
                setError("카메라, 마이크, 저장소 권한이 필요합니다.");
            }
        } catch (err) {
            setError("권한 요청 중 오류가 발생했습니다.");
        }
    };

    // 녹화 시작
    const startRecording = async (cameraId?: string) => {
        if (!cameraRef.current || isRecording) return;

        try {
            setError(null);

            // 카메라 ID가 없으면 기본값 사용
            const recordingCameraId = cameraId || `CAM_${Date.now()}`;

            // 녹화 서비스 설정 업데이트
            recordingService.updateSettings(recordingSettings);

            // 녹화 시작
            const session = await recordingService.startRecording(cameraRef, recordingCameraId);

            setActiveRecording(session);
            currentRecordingSessionRef.current = session.id;
            setIsRecording(true);
            setRecordingTime(0);

            // 녹화 시간 타이머 시작
            recordingIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

            console.log('🎬 녹화 시작됨:', session.fileName);
        } catch (err) {
            console.error('❌ 녹화 시작 실패:', err);
            setError(err instanceof Error ? err.message : "녹화를 시작할 수 없습니다.");
            setIsRecording(false);
        }
    };

    // 녹화 중지
    const stopRecording = async () => {
        if (!isRecording || !currentRecordingSessionRef.current) return;

        try {
            // 녹화 시간 타이머 정지
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
                recordingIntervalRef.current = undefined;
            }

            // 녹화 서비스에서 중지
            const completedSession = await recordingService.stopRecording(currentRecordingSessionRef.current);

            setIsRecording(false);
            setRecordingTime(0);
            setActiveRecording(undefined);
            currentRecordingSessionRef.current = null;

            if (completedSession) {
                console.log('✅ 녹화 완료:', completedSession.fileName);
                Alert.alert('녹화 완료', `${completedSession.fileName}이 저장되었습니다.`);
            }
        } catch (err) {
            console.error('❌ 녹화 중지 실패:', err);
            setError(err instanceof Error ? err.message : "녹화를 중지할 수 없습니다.");
        }
    };

    // 스트리밍 시작
    const startStreaming = async () => {
        if (isStreaming) return;

        try {
            setError(null);
            setIsStreaming(true);
            setStreamingTime(0);

            // 실제 스트리밍 로직은 WebSocket으로 구현
            // 여기서는 시뮬레이션
            console.log("스트리밍 시작");
        } catch (err) {
            setError("스트리밍을 시작할 수 없습니다.");
            setIsStreaming(false);
        }
    };

    // 스트리밍 중지
    const stopStreaming = async () => {
        if (!isStreaming) return;

        try {
            setIsStreaming(false);
            setStreamingTime(0);
            console.log("스트리밍 중지");
        } catch (err) {
            setError("스트리밍을 중지할 수 없습니다.");
        }
    };

    // 카메라 전환
    const switchCamera = () => {
        setCameraType(current => 
            current === 'back' ? 'front' : 'back'
        );
    };

    // 플래시 토글
    const toggleFlash = () => {
        setFlashMode(current => 
            current === 'off' ? 'on' : 'off'
        );
    };

    // 스냅샷 촬영
    const takeSnapshot = async (): Promise<string | null> => {
        if (!cameraRef.current) return null;

        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.8,
                base64: false,
            });

            // 스냅샷을 갤러리에 저장
            await MediaLibrary.saveToLibraryAsync(photo.uri);
            
            return photo.uri;
        } catch (err) {
            setError("스냅샷을 촬영할 수 없습니다.");
            return null;
        }
    };

    // 녹화 설정 업데이트
    const updateRecordingSettings = (settings: Partial<CameraStreamState['recordingSettings']>) => {
        setRecordingSettings(prev => ({ ...prev, ...settings }));
        recordingService.updateSettings(settings);
    };

    // 타이머 효과
    useEffect(() => {
        if (isRecording) {
            recordingIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } else {
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }
        }

        if (isStreaming) {
            streamingIntervalRef.current = setInterval(() => {
                setStreamingTime(prev => prev + 1);
            }, 1000);
        } else {
            if (streamingIntervalRef.current) {
                clearInterval(streamingIntervalRef.current);
            }
        }

        return () => {
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }
            if (streamingIntervalRef.current) {
                clearInterval(streamingIntervalRef.current);
            }
        };
    }, [isRecording, isStreaming]);

    // 컴포넌트 마운트 시 권한 요청
    useEffect(() => {
        requestPermissions();
    }, []);

    const state: CameraStreamState = {
        hasPermission,
        cameraType,
        flashMode,
        isRecording,
        isStreaming,
        recordingTime,
        streamingTime,
        error,
        activeRecording,
        recordingSettings,
    };

    const actions: CameraStreamActions = {
        requestPermissions,
        startRecording,
        stopRecording,
        startStreaming,
        stopStreaming,
        switchCamera,
        toggleFlash,
        takeSnapshot,
        updateRecordingSettings,
        cameraRef,
    };

    return [state, actions];
};
