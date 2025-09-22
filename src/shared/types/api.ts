// API Response 기본 구조
export interface ApiResponse<T = any> {
    ok: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
    message?: string;
}

// 사용자 관련 타입
export interface User {
    id: number;
    email: string;
    name?: string;
    nickname?: string;
    bio?: string;
    birth?: string;
    picture?: string;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
    nickname: string;
    agreeTerms: boolean;
    agreePrivacy: boolean;
    agreeMicrophone: boolean;
    agreeLocation: boolean;
    agreeMarketing?: boolean;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}

// 카메라 관련 타입
export interface Camera {
    id: number;
    owner_id: number; // 소유자 ID로 변경
    name: string;
    device_id?: string;
    location?: string;
    status: 'online' | 'offline' | 'error';
    last_seen?: string;
    last_heartbeat?: string;
    firmware?: string;
    settings?: Record<string, any>;
    stream_url?: string;
    permission_level?: 'viewer' | 'controller' | 'admin'; // 사용자 권한 레벨
    access_type?: 'owner' | 'shared'; // 접근 유형
    granted_at?: string; // 공유받은 시간
    expires_at?: string; // 권한 만료 시간
    createdAt: string;
    updatedAt: string;
}

// 카메라 목록 응답 타입 (소유 + 공유받은 통합)
export interface CamerasResponse {
    cameras: Camera[];
    total: number;
    owned: number; // 소유한 카메라 수
    shared: number; // 공유받은 카메라 수
}

// 카메라 공유 관련 타입
export interface DevicePermission {
    id: number;
    camera_id: number;
    user_id: number;
    permission_level: 'viewer' | 'controller' | 'admin';
    granted_by: number;
    granted_at: string;
    expires_at?: string;
    is_active: boolean;
    notes?: string;
    user?: {
        id: number;
        email: string;
        name: string;
    };
    grantor?: {
        id: number;
        email: string;
        name: string;
    };
}

// 카메라 공유 요청 타입
export interface ShareCameraRequest {
    targetUserEmail: string;
    permissionLevel: 'viewer' | 'controller' | 'admin';
    expiresAt?: string; // ISO 날짜 문자열
    notes?: string;
}

// 카메라 권한 정보 타입
export interface CameraPermissionInfo {
    access_type: 'owner' | 'shared';
    permission_level: 'viewer' | 'controller' | 'admin';
    camera: Camera;
    granted_at?: string;
    expires_at?: string;
}

export interface CameraCreateRequest {
    name: string;
    location?: string;
    metadata?: Record<string, any>;
}

export interface CameraUpdateRequest {
    name?: string;
    location?: string;
    metadata?: Record<string, any>;
}

// 이벤트 관련 타입
export interface Event {
    id: number;
    cameraId: number;
    cameraName?: string;
    type: string;
    startedAt: string;
    endedAt?: string;
    isPinned: boolean;
    score?: number;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

export interface EventsResponse {
    events: Event[];
    total: number;
    page: number;
    limit: number;
}

export interface EventStats {
    totalEvents: number;
    todayEvents: number;
    weekEvents: number;
    monthEvents: number;
    pinnedEvents: number;
}

// 녹화 관련 타입
export interface Recording {
    id: number;
    eventId: number;
    index: number;
    s3Key: string;
    duration?: number;
    fileSize?: number;
    thumbnailUrl?: string;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

export interface RecordingsResponse {
    recordings: Recording[];
    total: number;
    page: number;
    limit: number;
}

// 알림 관련 타입
export interface Notification {
    id: number;
    userId: number;
    type: 'motion' | 'system' | 'security' | 'maintenance';
    title: string;
    message: string;
    isRead: boolean;
    data?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

export interface NotificationsResponse {
    notifications: Notification[];
    total: number;
    unreadCount: number;
}

// 설정 관련 타입 (새로운 분리된 구조)

// 핵심 설정 (UserSettings 테이블)
export interface CoreSettings {
    id: number;
    user_id: number;
    notification_enabled: boolean;
    motion_sensitivity: 'low' | 'medium' | 'high';
    auto_recording: boolean;
    recording_quality: '720p' | '1080p' | '4K';
    storage_days: number;
    dark_mode: boolean;
    language: string;
    timezone: string;
    created_at: string;
    updated_at: string;
}

// 커스텀 설정 (UserCustomSettings 테이블 - Key-Value)
export interface CustomSettings {
    [key: string]: any; // 동적 설정 키-값 쌍
}

// 통합 설정 응답
export interface AllUserSettings {
    core: CoreSettings;
    custom: CustomSettings;
    combined: CoreSettings & CustomSettings; // 통합된 설정
}

// 핵심 설정 업데이트 요청
export interface CoreSettingsUpdateRequest {
    notification_enabled?: boolean;
    motion_sensitivity?: 'low' | 'medium' | 'high';
    auto_recording?: boolean;
    recording_quality?: '720p' | '1080p' | '4K';
    storage_days?: number;
    dark_mode?: boolean;
    language?: string;
    timezone?: string;
}

// 커스텀 설정 업데이트 요청
export interface CustomSettingUpdateRequest {
    value: any;
    dataType?: 'string' | 'number' | 'boolean' | 'json';
}

// 설정 초기화 요청
export interface SettingsResetRequest {
    resetType: 'core' | 'custom' | 'all';
}

// 이메일 인증 관련 타입
export interface EmailVerificationRequest {
    email: string;
}

export interface EmailVerificationConfirmRequest {
    email: string;
    verificationCode: string;
}

export interface EmailVerificationStatus {
    isVerified: boolean;
    email: string;
    canResend: boolean;
    nextResendTime?: string;
}

// 미디어 관련 타입
export interface PresignedUrlRequest {
    fileName: string;
    fileType: string;
    duration?: number;
}

export interface PresignedUrlResponse {
    uploadUrl: string;
    s3Key: string;
    expiresIn: number;
}

// 페이지네이션
export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

// 필터링
export interface EventFilters extends PaginationParams {
    cameraId?: number;
    type?: string;
    startDate?: string;
    endDate?: string;
    isPinned?: boolean;
    minScore?: number;
}

export interface RecordingFilters extends PaginationParams {
    eventId?: number;
    cameraId?: number;
    startDate?: string;
    endDate?: string;
} 