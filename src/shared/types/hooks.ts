// ============================================================================
// HOOKS TYPES - 통합 타입 정의
// ============================================================================

import { Camera, CameraType, FlashMode } from 'expo-camera';
import { RefObject } from 'react';

// ============================================================================
// 공통 상태 타입
// ============================================================================

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface BaseState {
    isLoading: boolean;
    error: string | null;
    connectionStatus: ConnectionStatus;
}

// ============================================================================
// 카메라 관련 타입
// ============================================================================

export interface CameraState extends BaseState {
    hasPermission: boolean;
    cameraType: CameraType;
    flashMode: FlashMode;
    isRecording: boolean;
    isStreaming: boolean;
    recordingTime: number;
    streamingTime: number;
    activeRecording?: RecordingSession;
    recordingSettings: RecordingSettings;
    photo?: CameraPhoto;
    video?: CameraVideo;
}

export interface CameraPhoto {
    uri: string;
    width: number;
    height: number;
    base64?: string;
    timestamp: number;
}

export interface CameraVideo {
    uri: string;
    duration: number;
    size: number;
    timestamp: number;
}

export interface RecordingSession {
    id: string;
    fileName: string;
    startTime: number;
    duration: number;
    fileSize: number;
    status: 'recording' | 'completed' | 'failed';
}

export interface RecordingSettings {
    quality: 'low' | 'medium' | 'high' | 'max';
    maxDuration: number;
    autoSave: boolean;
    includeAudio: boolean;
    resolution: {
        width: number;
        height: number;
    };
    fps: number;
}

export interface CameraConnectionState extends BaseState {
    isConnected: boolean;
    isStreaming: boolean;
    connectedViewers: string[];
    connectionId: string | null;
    pinCode: string | null;
    reconnectAttempt: number;
    viewerCount: number;
    currentStream?: any; // WebRTC 스트림 객체
    publisherUrl?: string; // 미디어 서버 퍼블리셔 URL
}

// ============================================================================
// 스트리밍 관련 타입
// ============================================================================

export interface StreamState extends BaseState {
    activeStreams: Map<string, MediaStream>;
    streamQuality: StreamQuality;
    isStreaming: boolean;
    streamTime: number;
    viewerCount: number;
}

export interface StreamQuality {
    resolution: '360p' | '480p' | '720p' | '1080p';
    fps: number;
    bitrate: number;
    codec: 'h264' | 'h265' | 'vp8' | 'vp9';
}

export interface MediaStream {
    id: string;
    stream: any; // WebRTC MediaStream
    quality: StreamQuality;
    isActive: boolean;
    createdAt: number;
}

// ============================================================================
// 이벤트 관련 타입
// ============================================================================

export interface EventState extends BaseState {
    events: EventPayload[];
    recentEvents: EventPayload[];
    eventStats: EventStats;
    filters: EventFilters;
}

export interface EventPayload {
    id: string;
    type: 'motion' | 'sound' | 'person' | 'vehicle' | 'custom';
    cameraId: string;
    cameraName: string;
    timestamp: number;
    confidence: number;
    metadata: Record<string, any>;
    location?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    isPinned: boolean;
    score: number;
}

export interface EventStats {
    totalEvents: number;
    todayEvents: number;
    motionEvents: number;
    personEvents: number;
    averageConfidence: number;
    lastEventTime?: number;
}

export interface EventFilters {
    type?: string[];
    cameraId?: string[];
    dateRange?: {
        start: Date;
        end: Date;
    };
    confidence?: {
        min: number;
        max: number;
    };
    isPinned?: boolean;
}

// ============================================================================
// 모션 감지 관련 타입
// ============================================================================

export interface MotionDetectionState extends BaseState {
    isEnabled: boolean;
    isDetecting: boolean;
    config: MotionDetectionConfig;
    recentEvents: MotionEvent[];
    stats: MotionDetectionStats;
    zones: MotionZone[];
}

export interface MotionDetectionConfig {
    enabled: boolean;
    sensitivity: number; // 0-100
    threshold: number; // 0-1
    minArea: number; // 최소 감지 영역
    maxArea: number; // 최대 감지 영역
    cooldown: number; // 감지 후 대기 시간 (ms)
    zones: MotionZone[];
}

export interface MotionZone {
    id: string;
    name: string;
    enabled: boolean;
    coordinates: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    sensitivity: number;
    threshold: number;
}

export interface MotionEvent {
    id: string;
    timestamp: number;
    confidence: number;
    zoneId?: string;
    zoneName?: string;
    location: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    metadata: Record<string, any>;
}

export interface MotionDetectionStats {
    totalDetections: number;
    todayDetections: number;
    averageConfidence: number;
    zoneViolations: Record<string, number>;
    lastDetectionTime?: number;
}

// ============================================================================
// 알림 관련 타입
// ============================================================================

export interface NotificationState extends BaseState {
    notifications: NotificationPayload[];
    unreadCount: number;
    notificationStats: NotificationStats;
    permissions: NotificationPermissions;
}

export interface NotificationPayload {
    id: string;
    type: 'motion' | 'sound' | 'connection' | 'system' | 'custom';
    title: string;
    message: string;
    data?: Record<string, any>;
    timestamp: number;
    isRead: boolean;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    category?: string;
}

export interface NotificationStats {
    totalNotifications: number;
    unreadNotifications: number;
    todayNotifications: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
}

export interface NotificationPermissions {
    push: boolean;
    local: boolean;
    sound: boolean;
    vibration: boolean;
}

// ============================================================================
// 뷰어 연결 관련 타입
// ============================================================================

export interface ViewerConnectionState extends BaseState {
    isConnected: boolean;
    connectedCamera: CameraStream | null;
    isWatching: boolean;
    availableCameras: CameraStream[];
    reconnectAttempt: number;
    viewerCount: number;
    currentStream?: any; // WebRTC 스트림 객체
    remoteStream?: any; // 원격 비디오 스트림
    viewerMediaUrl?: string; // 미디어 서버 뷰어 URL (서명 포함)
}

export interface CameraStream {
    id: string;
    name: string;
    status: 'online' | 'offline' | 'streaming';
    viewers: string[];
    streamUrl?: string;
    metadata?: Record<string, any>;
    media?: {
        viewerUrl?: string;
        publisherUrl?: string;
    };
}

// ============================================================================
// 액션 인터페이스
// ============================================================================

export interface CameraActions {
    requestPermissions: () => Promise<void>;
    startRecording: (cameraId?: string) => Promise<void>;
    stopRecording: () => Promise<void>;
    startStreaming: () => Promise<void>;
    stopStreaming: () => Promise<void>;
    switchCamera: () => void;
    toggleFlash: () => void;
    takeSnapshot: () => Promise<CameraPhoto | null>;
    updateRecordingSettings: (settings: Partial<RecordingSettings>) => void;
    cameraRef: RefObject<Camera>;
}

export interface CameraConnectionActions {
    generatePinCode: () => Promise<string>;
    startStreaming: () => Promise<void>;
    stopStreaming: () => Promise<void>;
    disconnect: () => void;
    reconnect: () => Promise<void>;
    clearError: () => void;
    retry: () => void;
}

export interface StreamActions {
    startStream: (cameraId: string, quality?: Partial<StreamQuality>) => Promise<void>;
    stopStream: (cameraId: string) => Promise<void>;
    updateStreamQuality: (cameraId: string, quality: Partial<StreamQuality>) => void;
    getActiveStreams: () => Map<string, MediaStream>;
}

export interface EventActions {
    getEvents: (filters?: EventFilters) => EventPayload[];
    getRecentEvents: (limit?: number) => EventPayload[];
    getMotionEvents: (limit?: number) => EventPayload[];
    createEvent: (event: Omit<EventPayload, 'id' | 'timestamp'>) => Promise<void>;
    updateEvent: (id: string, updates: Partial<EventPayload>) => Promise<void>;
    deleteEvent: (id: string) => Promise<void>;
    togglePin: (id: string) => Promise<void>;
    clearEvents: (maxAge?: number) => Promise<number>;
}

export interface MotionDetectionActions {
    enableDetection: () => Promise<void>;
    disableDetection: () => void;
    startDetection: (cameraRef: RefObject<Camera>) => Promise<boolean>;
    stopDetection: () => void;
    updateConfig: (config: Partial<MotionDetectionConfig>) => void;
    addZone: (zone: MotionZone) => void;
    removeZone: (zoneId: string) => void;
    updateZone: (zoneId: string, updates: Partial<MotionZone>) => void;
    getEvents: (limit?: number) => MotionEvent[];
    getStats: () => MotionDetectionStats;
    cleanupEvents: (maxAge?: number) => number;
}

export interface NotificationActions {
    requestPermissions: () => Promise<void>;
    sendNotification: (notification: Omit<NotificationPayload, 'id' | 'timestamp'>) => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    clearNotifications: (maxAge?: number) => Promise<number>;
    getNotifications: (filters?: any) => NotificationPayload[];
}

export interface ViewerConnectionActions {
    connectToCamera: (cameraId: string) => Promise<boolean>;
    disconnectFromCamera: () => void;
    startWatching: (cameraId: string) => Promise<void>;
    stopWatching: () => void;
    scanQRCode: (qrData: string) => Promise<boolean>;
    connectByCode: (connectionId: string) => Promise<boolean>;
    connectByPinCode: (pinCode: string) => Promise<boolean>; // 추가
    refreshAvailableCameras: () => void;
    reconnect: () => Promise<void>;
    clearError: () => void;
    retry: () => void;
}

// ============================================================================
// 훅 반환 타입
// ============================================================================

export type HookReturn<TState, TActions> = [TState, TActions];

// ============================================================================
// 유틸리티 타입
// ============================================================================

export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>; 