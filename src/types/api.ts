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
    userId: number;
    name: string;
    location?: string;
    isOnline: boolean;
    lastHeartbeat?: string;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
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

// 설정 관련 타입
export interface Settings {
    id: number;
    userId: number;
    notificationEnabled: boolean;
    emailNotification: boolean;
    motionSensitivity: 'low' | 'medium' | 'high';
    recordingQuality: '480p' | '720p' | '1080p';
    retentionDays: number;
    settings?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

export interface SettingsUpdateRequest {
    notificationEnabled?: boolean;
    emailNotification?: boolean;
    motionSensitivity?: 'low' | 'medium' | 'high';
    recordingQuality?: '480p' | '720p' | '1080p';
    retentionDays?: number;
    settings?: Record<string, any>;
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