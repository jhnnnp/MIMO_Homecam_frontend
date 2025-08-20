import { useState, useEffect, useRef } from "react";
import { Camera, CameraType, FlashMode } from "expo-camera";
import { Audio } from "expo-av";
import streamingService from "../services/streamingService";
import * as MediaLibrary from "expo-media-library";

export interface CameraStreamState {
    hasPermission: boolean;
    cameraType: CameraType;
    flashMode: FlashMode;
    isRecording: boolean;
    isStreaming: boolean;
    recordingTime: number;
    streamingTime: number;
    error: string | null;
}

export interface CameraStreamActions {
    requestPermissions: () => Promise<void>;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<void>;
    startStreaming: () => Promise<void>;
    stopStreaming: () => Promise<void>;
    switchCamera: () => void;
    toggleFlash: () => void;
    takeSnapshot: () => Promise<string | null>;
}

export const useCameraStream = (): [CameraStreamState, CameraStreamActions] => {
    const [hasPermission, setHasPermission] = useState(false);
    const [cameraType, setCameraType] = useState(CameraType.Back);
    const [flashMode, setFlashMode] = useState(FlashMode.Off);
    const [isRecording, setIsRecording] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [streamingTime, setStreamingTime] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const cameraRef = useRef<Camera>(null);
    const recordingIntervalRef = useRef<NodeJS.Timeout>();
    const streamingIntervalRef = useRef<NodeJS.Timeout>();

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
    const startRecording = async () => {
        if (!cameraRef.current || isRecording) return;

        try {
            setError(null);
            setIsRecording(true);
            setRecordingTime(0);

            const recording = await cameraRef.current.recordAsync({
                quality: Camera.Constants.VideoQuality["720p"],
                maxDuration: 300, // 5분
                mute: false,
            });

            // 녹화 파일을 갤러리에 저장
            await MediaLibrary.saveToLibraryAsync(recording.uri);
            
            setIsRecording(false);
            setRecordingTime(0);
        } catch (err) {
            setError("녹화를 시작할 수 없습니다.");
            setIsRecording(false);
        }
    };

    // 녹화 중지
    const stopRecording = async () => {
        if (!cameraRef.current || !isRecording) return;

        try {
            await cameraRef.current.stopRecording();
            setIsRecording(false);
            setRecordingTime(0);
        } catch (err) {
            setError("녹화를 중지할 수 없습니다.");
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
            current === CameraType.Back ? CameraType.Front : CameraType.Back
        );
    };

    // 플래시 토글
    const toggleFlash = () => {
        setFlashMode(current => 
            current === FlashMode.Off ? FlashMode.On : FlashMode.Off
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
    };

    return [state, actions];
};
