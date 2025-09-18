/**
 * CameraConstants - 홈캠 관련 상수 정의
 */

// UI Constants
export const SWIPE_CONSTANTS = {
    THRESHOLD: -60,
    MAX_DISTANCE: -120,
    DELETE_BUTTON_WIDTH: 80,
} as const;

export const ANIMATION_DURATION = {
    FAST: 300,
    NORMAL: 400,
    SLOW: 600,
} as const;

export const API_RETRY = {
    MAX_ATTEMPTS: 3,
    DELAY_MS: 1000,
} as const;

// Colors
export const CAMERA_COLORS = {
    primary: '#007AFF',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#C6C6C8',
    liveIndicator: '#FF3B30',
    deleteGradient: ['#FF6B6B', '#FF5252'],
    connectGradient: ['#007AFF', '#5AC8FA'],
} as const;

// Camera Status
export const CAMERA_STATUS = {
    ONLINE: 'online',
    OFFLINE: 'offline',
    ERROR: 'error',
} as const;

// API Endpoints
export const API_ENDPOINTS = {
    CAMERAS: '/cameras',
    CAMERA_BY_ID: (id: number) => `/cameras/${id}`,
} as const;

// Messages
export const MESSAGES = {
    DELETE_CONFIRM: '홈캠을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.',
    DELETE_SUCCESS: '홈캠이 삭제되었습니다.',
    DELETE_FAILED: '홈캠을 삭제하는 중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.',
    CONNECT_FAILED: '홈캠에 연결할 수 없습니다.\n네트워크 연결을 확인해주세요.',
    LOAD_FAILED: '홈캠 목록을 불러올 수 없습니다. 네트워크 연결을 확인해주세요.',
    REFRESH_FAILED: '새로고침 중 오류가 발생했습니다.',
    UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
} as const;

// Mock Data (Development Only)
export const MOCK_CAMERA = {
    id: 999,
    name: '개발용 홈캠',
    device_id: 'DEV_CAMERA_001',
    location: '개발 환경',
    status: 'online' as const,
    last_seen: new Date().toISOString(),
    created_at: new Date().toISOString(),
} as const;
