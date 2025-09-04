// ============================================================================
// HOOKS TEST SAMPLES - 훅 테스트 코드 샘플
// ============================================================================

import { renderHook, act, waitFor } from '@testing-library/react-hooks';
import { Alert } from 'react-native';
import { Camera } from 'expo-camera';
import * as Notifications from 'expo-notifications';

// 훅 임포트
import { useCamera } from '../hooks/useCamera';
import { useCameraConnection } from '../hooks/useCameraConnection';
import { useCameraStream } from '../hooks/useCameraStream';
import { useEvent } from '../hooks/useEvent';
import { useMotionDetection } from '../hooks/useMotionDetection';
import { useNotification } from '../hooks/useNotification';
import { useViewerConnection } from '../hooks/useViewerConnection';

// 서비스 모킹
jest.mock('../services/cameraService');
jest.mock('../services/streamingService');
jest.mock('../services/eventService');
jest.mock('../services/motionDetectionService');
jest.mock('../services/notificationService');
jest.mock('../services/webrtcService');
jest.mock('../services/settingsService');
jest.mock('../stores/authStore');
jest.mock('../utils/logger');

// React Native 모킹
jest.mock('react-native', () => ({
    Alert: {
        alert: jest.fn(),
    },
}));

// Expo 모킹
jest.mock('expo-camera', () => ({
    Camera: {
        requestCameraPermissionsAsync: jest.fn(),
    },
}));

jest.mock('expo-av', () => ({
    Audio: {
        requestPermissionsAsync: jest.fn(),
    },
}));

jest.mock('expo-media-library', () => ({
    requestPermissionsAsync: jest.fn(),
    saveToLibraryAsync: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
    requestPermissionsAsync: jest.fn(),
    getPermissionsAsync: jest.fn(),
    setNotificationChannelAsync: jest.fn(),
    scheduleNotificationAsync: jest.fn(),
    addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// ============================================================================
// useCamera 훅 테스트
// ============================================================================

describe('useCamera', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize with default state', () => {
        const { result } = renderHook(() => useCamera());
        const [state] = result.current;

        expect(state.hasPermission).toBe(false);
        expect(state.isRecording).toBe(false);
        expect(state.isStreaming).toBe(false);
        expect(state.error).toBeNull();
        expect(state.isLoading).toBe(false);
    });

    it('should request permissions successfully', async () => {
        const mockCameraPermission = { status: 'granted' };
        const mockAudioPermission = { status: 'granted' };
        const mockMediaPermission = { status: 'granted' };

        (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue(mockCameraPermission);
        (require('expo-av').Audio.requestPermissionsAsync as jest.Mock).mockResolvedValue(mockAudioPermission);
        (require('expo-media-library').requestPermissionsAsync as jest.Mock).mockResolvedValue(mockMediaPermission);

        const { result } = renderHook(() => useCamera());
        const [, actions] = result.current;

        await act(async () => {
            await actions.requestPermissions();
        });

        expect(result.current[0].hasPermission).toBe(true);
        expect(result.current[0].error).toBeNull();
    });

    it('should handle permission denial', async () => {
        const mockCameraPermission = { status: 'denied' };
        const mockAudioPermission = { status: 'granted' };
        const mockMediaPermission = { status: 'granted' };

        (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue(mockCameraPermission);
        (require('expo-av').Audio.requestPermissionsAsync as jest.Mock).mockResolvedValue(mockAudioPermission);
        (require('expo-media-library').requestPermissionsAsync as jest.Mock).mockResolvedValue(mockMediaPermission);

        const { result } = renderHook(() => useCamera());
        const [, actions] = result.current;

        await act(async () => {
            await actions.requestPermissions();
        });

        expect(result.current[0].hasPermission).toBe(false);
        expect(result.current[0].error).toContain('카메라');
    });

    it('should switch camera type', () => {
        const { result } = renderHook(() => useCamera());
        const [state, actions] = result.current;

        act(() => {
            actions.switchCamera();
        });

        expect(result.current[0].cameraType).toBe('front');
    });

    it('should toggle flash mode', () => {
        const { result } = renderHook(() => useCamera());
        const [state, actions] = result.current;

        act(() => {
            actions.toggleFlash();
        });

        expect(result.current[0].flashMode).toBe('on');
    });

    it('should start and stop recording', async () => {
        const mockRecordingService = {
            startRecording: jest.fn().mockResolvedValue({
                id: 'recording_001',
                fileName: 'test_recording.mp4',
                startTime: Date.now(),
                duration: 0,
                fileSize: 0,
                status: 'recording',
            }),
            stopRecording: jest.fn().mockResolvedValue({
                id: 'recording_001',
                fileName: 'test_recording.mp4',
                startTime: Date.now(),
                duration: 10,
                fileSize: 1024,
                status: 'completed',
            }),
        };

        jest.doMock('../services/recordingService', () => mockRecordingService);

        const { result } = renderHook(() => useCamera());
        const [, actions] = result.current;

        // 녹화 시작
        await act(async () => {
            await actions.startRecording();
        });

        expect(result.current[0].isRecording).toBe(true);
        expect(result.current[0].activeRecording).toBeDefined();

        // 녹화 중지
        await act(async () => {
            await actions.stopRecording();
        });

        expect(result.current[0].isRecording).toBe(false);
        expect(result.current[0].activeRecording).toBeUndefined();
    });
});

// ============================================================================
// useCameraConnection 훅 테스트
// ============================================================================

describe('useCameraConnection', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize with disconnected state', () => {
        const { result } = renderHook(() => useCameraConnection('camera_001', 'Test Camera'));
        const [state] = result.current;

        expect(state.isConnected).toBe(false);
        expect(state.isStreaming).toBe(false);
        expect(state.connectionStatus).toBe('disconnected');
        expect(state.error).toBeNull();
    });

    it('should generate QR code successfully', async () => {
        const mockStreamingService = {
            isConnected: jest.fn().mockReturnValue(false),
            connect: jest.fn().mockResolvedValue(true),
            registerCamera: jest.fn(),
        };

        const mockAuthStore = {
            getAccessToken: jest.fn().mockReturnValue('mock_token'),
        };

        jest.doMock('../services/streamingService', () => mockStreamingService);
        jest.doMock('../stores/authStore', () => ({
            useAuthStore: () => mockAuthStore,
        }));

        const { result } = renderHook(() => useCameraConnection('camera_001', 'Test Camera'));
        const [, actions] = result.current;

        await act(async () => {
            const pinCode = await actions.generatePinCode();
            expect(pinCode).toMatch(/^\d{6}$/);
        });

        expect(result.current[0].isConnected).toBe(true);
        expect(result.current[0].connectionStatus).toBe('connected');
    });

    it('should handle connection errors', async () => {
        const mockStreamingService = {
            isConnected: jest.fn().mockReturnValue(false),
            connect: jest.fn().mockRejectedValue(new Error('Connection failed')),
        };

        jest.doMock('../services/streamingService', () => mockStreamingService);

        const { result } = renderHook(() => useCameraConnection('camera_001', 'Test Camera'));
        const [, actions] = result.current;

        await act(async () => {
            try {
                await actions.generatePinCode();
            } catch (error) {
                // 에러가 발생해야 함
            }
        });

        expect(result.current[0].error).toBeDefined();
        expect(result.current[0].connectionStatus).toBe('error');
    });
});

// ============================================================================
// useEvent 훅 테스트
// ============================================================================

describe('useEvent', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize with empty events', () => {
        const { result } = renderHook(() => useEvent());
        const [state] = result.current;

        expect(state.events).toEqual([]);
        expect(state.recentEvents).toEqual([]);
        expect(state.eventStats.totalEvents).toBe(0);
    });

    it('should create event successfully', async () => {
        const mockEventService = {
            createEvent: jest.fn().mockResolvedValue({ ok: true, data: {} }),
        };

        const mockNotificationService = {
            sendNotification: jest.fn().mockResolvedValue({ ok: true }),
        };

        jest.doMock('../services/eventService', () => mockEventService);
        jest.doMock('../services/notificationService', () => mockNotificationService);

        const { result } = renderHook(() => useEvent());
        const [, actions] = result.current;

        await act(async () => {
            await actions.createEvent({
                type: 'motion',
                cameraId: 'camera_001',
                cameraName: 'Test Camera',
                confidence: 0.85,
                metadata: { objectType: 'person' },
                location: { x: 100, y: 100, width: 200, height: 300 },
                isPinned: false,
                score: 0.85,
            });
        });

        expect(result.current[0].events.length).toBe(1);
        expect(result.current[0].eventStats.totalEvents).toBe(1);
    });

    it('should filter events correctly', () => {
        const { result } = renderHook(() => useEvent());
        const [, actions] = result.current;

        // 이벤트 추가
        act(() => {
            result.current[0].events = [
                {
                    id: 'event_001',
                    type: 'motion',
                    cameraId: 'camera_001',
                    cameraName: 'Test Camera',
                    timestamp: Date.now(),
                    confidence: 0.85,
                    metadata: {},
                    isPinned: false,
                    score: 0.85,
                },
            ];
        });

        const motionEvents = actions.getMotionEvents();
        expect(motionEvents.length).toBe(1);
        expect(motionEvents[0].type).toBe('motion');
    });
});

// ============================================================================
// useMotionDetection 훅 테스트
// ============================================================================

describe('useMotionDetection', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize with disabled state', () => {
        const { result } = renderHook(() => useMotionDetection());
        const [state] = result.current;

        expect(state.isEnabled).toBe(false);
        expect(state.isDetecting).toBe(false);
        expect(state.config.enabled).toBe(false);
    });

    it('should enable detection successfully', async () => {
        const mockMotionDetectionService = {
            updateConfig: jest.fn(),
            getConfig: jest.fn().mockReturnValue({
                enabled: true,
                sensitivity: 50,
                threshold: 0.5,
                minArea: 100,
                maxArea: 10000,
                cooldown: 5000,
                zones: [],
            }),
        };

        jest.doMock('../services/motionDetectionService', () => mockMotionDetectionService);

        const { result } = renderHook(() => useMotionDetection());
        const [, actions] = result.current;

        await act(async () => {
            await actions.enableDetection();
        });

        expect(result.current[0].isEnabled).toBe(true);
        expect(result.current[0].config.enabled).toBe(true);
    });

    it('should start detection with camera ref', async () => {
        const mockCameraRef = { current: {} };
        const mockMotionDetectionService = {
            startDetection: jest.fn().mockResolvedValue(true),
            updateConfig: jest.fn(),
        };

        jest.doMock('../services/motionDetectionService', () => mockMotionDetectionService);

        const { result } = renderHook(() => useMotionDetection());
        const [, actions] = result.current;

        // 먼저 활성화
        await act(async () => {
            await actions.enableDetection();
        });

        // 감지 시작
        await act(async () => {
            const success = await actions.startDetection(mockCameraRef as any);
            expect(success).toBe(true);
        });

        expect(result.current[0].isDetecting).toBe(true);
    });
});

// ============================================================================
// useNotification 훅 테스트
// ============================================================================

describe('useNotification', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize with default permissions', () => {
        const { result } = renderHook(() => useNotification());
        const [state] = result.current;

        expect(state.permissions.push).toBe(false);
        expect(state.permissions.local).toBe(false);
        expect(state.notifications).toEqual([]);
        expect(state.unreadCount).toBe(0);
    });

    it('should request permissions successfully', async () => {
        const mockPermissions = { status: 'granted' };
        (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue(mockPermissions);
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue(mockPermissions);

        const { result } = renderHook(() => useNotification());
        const [, actions] = result.current;

        await act(async () => {
            await actions.requestPermissions();
        });

        expect(result.current[0].permissions.local).toBe(true);
        expect(result.current[0].permissions.push).toBe(true);
    });

    it('should send notification successfully', async () => {
        const mockPermissions = { status: 'granted' };
        (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue(mockPermissions);
        (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('notification_id');

        const mockNotificationService = {
            createNotification: jest.fn().mockResolvedValue({ ok: true }),
        };

        jest.doMock('../services/notificationService', () => mockNotificationService);

        const { result } = renderHook(() => useNotification());
        const [, actions] = result.current;

        // 권한 요청
        await act(async () => {
            await actions.requestPermissions();
        });

        // 알림 전송
        await act(async () => {
            await actions.sendNotification({
                type: 'motion',
                title: '모션 감지',
                message: '카메라에서 움직임이 감지되었습니다.',
                priority: 'high',
            });
        });

        expect(result.current[0].notifications.length).toBe(1);
        expect(result.current[0].unreadCount).toBe(1);
    });

    it('should mark notifications as read', async () => {
        const mockNotificationService = {
            markAsRead: jest.fn().mockResolvedValue({ ok: true }),
        };

        jest.doMock('../services/notificationService', () => mockNotificationService);

        const { result } = renderHook(() => useNotification());
        const [, actions] = result.current;

        // 알림 추가
        act(() => {
            result.current[0].notifications = [
                {
                    id: 'notification_001',
                    type: 'motion',
                    title: 'Test',
                    message: 'Test message',
                    timestamp: Date.now(),
                    isRead: false,
                    priority: 'normal',
                },
            ];
            result.current[0].unreadCount = 1;
        });

        // 읽음 처리
        await act(async () => {
            await actions.markAsRead('notification_001');
        });

        expect(result.current[0].notifications[0].isRead).toBe(true);
        expect(result.current[0].unreadCount).toBe(0);
    });
});

// ============================================================================
// useViewerConnection 훅 테스트
// ============================================================================

describe('useViewerConnection', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize with disconnected state', () => {
        const { result } = renderHook(() => useViewerConnection('viewer_001'));
        const [state] = result.current;

        expect(state.isConnected).toBe(false);
        expect(state.connectedCamera).toBeNull();
        expect(state.isWatching).toBe(false);
        expect(state.connectionStatus).toBe('disconnected');
    });

    it('should scan QR code successfully', async () => {
        const mockQRData = JSON.stringify({
            type: 'mimo_camera_connect',
            deviceId: 'device_001',
            cameraId: 'camera_001',
            cameraName: 'Test Camera',
            connectionId: 'connection_001',
            timestamp: Date.now(),
            version: '1.0.0',
        });

        const mockStreamingService = {
            isConnected: jest.fn().mockReturnValue(false),
            connect: jest.fn().mockResolvedValue(true),
            getCamera: jest.fn().mockReturnValue({
                id: 'camera_001',
                name: 'Test Camera',
                status: 'online',
                viewers: [],
            }),
        };

        const mockWebRTCService = {
            createConnection: jest.fn().mockResolvedValue({}),
        };

        jest.doMock('../services/streamingService', () => mockStreamingService);
        jest.doMock('../services/webrtcService', () => mockWebRTCService);

        const { result } = renderHook(() => useViewerConnection('viewer_001'));
        const [, actions] = result.current;

        await act(async () => {
            const success = await actions.scanQRCode(mockQRData);
            expect(success).toBe(true);
        });

        expect(result.current[0].connectedCamera).toBeDefined();
        expect(result.current[0].connectionStatus).toBe('connected');
    });

    it('should connect by code successfully', async () => {
        const mockAuthStore = {
            getAccessToken: jest.fn().mockReturnValue('mock_token'),
        };

        const mockStreamingService = {
            isConnected: jest.fn().mockReturnValue(false),
            connect: jest.fn().mockResolvedValue(true),
        };

        jest.doMock('../stores/authStore', () => ({
            useAuthStore: () => mockAuthStore,
        }));
        jest.doMock('../services/streamingService', () => mockStreamingService);

        const { result } = renderHook(() => useViewerConnection('viewer_001'));
        const [, actions] = result.current;

        await act(async () => {
            const success = await actions.connectByCode('connection_001');
            expect(success).toBe(true);
        });

        expect(result.current[0].isConnected).toBe(true);
        expect(result.current[0].connectionStatus).toBe('connected');
    });

    it('should start and stop watching', async () => {
        const mockStreamingService = {
            isConnected: jest.fn().mockReturnValue(true),
            joinStream: jest.fn(),
            leaveStream: jest.fn(),
        };

        const mockWebRTCService = {
            startStream: jest.fn().mockResolvedValue(true),
            stopStream: jest.fn(),
        };

        jest.doMock('../services/streamingService', () => mockStreamingService);
        jest.doMock('../services/webrtcService', () => mockWebRTCService);

        const { result } = renderHook(() => useViewerConnection('viewer_001'));
        const [, actions] = result.current;

        // 연결된 카메라 설정
        act(() => {
            result.current[0].connectedCamera = {
                id: 'camera_001',
                name: 'Test Camera',
                status: 'online',
                viewers: [],
            };
            result.current[0].isConnected = true;
        });

        // 시청 시작
        await act(async () => {
            await actions.startWatching('camera_001');
        });

        expect(result.current[0].isWatching).toBe(true);

        // 시청 중지
        act(() => {
            actions.stopWatching();
        });

        expect(result.current[0].isWatching).toBe(false);
    });
});

// ============================================================================
// 통합 테스트
// ============================================================================

describe('Hook Integration Tests', () => {
    it('should handle motion detection with notification', async () => {
        // 모션 감지 훅
        const { result: motionResult } = renderHook(() => useMotionDetection());
        const [, motionActions] = motionResult.current;

        // 알림 훅
        const { result: notificationResult } = renderHook(() => useNotification());
        const [, notificationActions] = notificationResult.current;

        // 모션 감지 활성화
        await act(async () => {
            await motionActions.enableDetection();
        });

        // 알림 권한 요청
        await act(async () => {
            await notificationActions.requestPermissions();
        });

        // 모션 이벤트 발생 시나리오
        await act(async () => {
            // 모션 감지 이벤트 처리
            const mockEvent = {
                id: 'event_001',
                timestamp: Date.now(),
                confidence: 0.85,
                zoneId: 'zone_001',
                zoneName: 'Test Zone',
                location: { x: 100, y: 100, width: 200, height: 300 },
                metadata: { objectType: 'person' },
            };

            // 이벤트 처리 로직 시뮬레이션
            motionResult.current[0].recentEvents = [mockEvent];
            motionResult.current[0].stats.totalDetections += 1;
        });

        // 알림 전송
        await act(async () => {
            await notificationActions.sendNotification({
                type: 'motion',
                title: '모션 감지',
                message: '높은 신뢰도로 움직임이 감지되었습니다.',
                priority: 'high',
                data: { eventId: 'event_001', confidence: 0.85 },
            });
        });

        expect(motionResult.current[0].stats.totalDetections).toBe(1);
        expect(notificationResult.current[0].notifications.length).toBe(1);
        expect(notificationResult.current[0].unreadCount).toBe(1);
    });

    it('should handle camera connection with streaming', async () => {
        // 카메라 연결 훅
        const { result: connectionResult } = renderHook(() =>
            useCameraConnection('camera_001', 'Test Camera')
        );
        const [, connectionActions] = connectionResult.current;

        // 카메라 스트림 훅
        const { result: streamResult } = renderHook(() => useCameraStream());
        const [, streamActions] = streamResult.current;

        // 카메라 연결
        await act(async () => {
            await connectionActions.generatePinCode();
        });

        expect(connectionResult.current[0].isConnected).toBe(true);

        // 스트림 시작
        await act(async () => {
            await streamActions.startStream('camera_001');
        });

        expect(streamResult.current[0].isStreaming).toBe(true);
        expect(streamResult.current[0].activeStreams.has('camera_001')).toBe(true);
    });
});

// ============================================================================
// 에러 처리 테스트
// ============================================================================

describe('Error Handling Tests', () => {
    it('should handle network errors gracefully', async () => {
        const mockStreamingService = {
            isConnected: jest.fn().mockReturnValue(false),
            connect: jest.fn().mockRejectedValue(new Error('Network error')),
        };

        jest.doMock('../services/streamingService', () => mockStreamingService);

        const { result } = renderHook(() => useCameraConnection('camera_001', 'Test Camera'));
        const [, actions] = result.current;

        await act(async () => {
            try {
                await actions.generatePinCode();
            } catch (error) {
                // 에러가 발생해야 함
            }
        });

        expect(result.current[0].error).toBeDefined();
        expect(result.current[0].connectionStatus).toBe('error');
    });

    it('should handle permission errors', async () => {
        const mockCameraPermission = { status: 'denied' };
        (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue(mockCameraPermission);

        const { result } = renderHook(() => useCamera());
        const [, actions] = result.current;

        await act(async () => {
            await actions.requestPermissions();
        });

        expect(result.current[0].hasPermission).toBe(false);
        expect(result.current[0].error).toContain('권한');
    });

    it('should handle service errors', async () => {
        const mockEventService = {
            createEvent: jest.fn().mockRejectedValue(new Error('Service error')),
        };

        jest.doMock('../services/eventService', () => mockEventService);

        const { result } = renderHook(() => useEvent());
        const [, actions] = result.current;

        await act(async () => {
            try {
                await actions.createEvent({
                    type: 'motion',
                    cameraId: 'camera_001',
                    cameraName: 'Test Camera',
                    confidence: 0.85,
                    metadata: {},
                    location: { x: 100, y: 100, width: 200, height: 300 },
                    isPinned: false,
                    score: 0.85,
                });
            } catch (error) {
                // 에러가 발생해야 함
            }
        });

        expect(result.current[0].error).toBeDefined();
    });
});

// ============================================================================
// 성능 테스트
// ============================================================================

describe('Performance Tests', () => {
    it('should handle rapid state updates efficiently', () => {
        const { result } = renderHook(() => useCamera());
        const [, actions] = result.current;

        const startTime = performance.now();

        // 빠른 연속 상태 업데이트
        for (let i = 0; i < 100; i++) {
            act(() => {
                actions.switchCamera();
                actions.toggleFlash();
            });
        }

        const endTime = performance.now();
        const duration = endTime - startTime;

        // 100ms 이내에 완료되어야 함
        expect(duration).toBeLessThan(100);
    });

    it('should handle large event lists efficiently', () => {
        const { result } = renderHook(() => useEvent());
        const [, actions] = result.current;

        const largeEventList = Array.from({ length: 1000 }, (_, i) => ({
            id: `event_${i}`,
            type: 'motion',
            cameraId: 'camera_001',
            cameraName: 'Test Camera',
            timestamp: Date.now() - i * 1000,
            confidence: 0.8,
            metadata: {},
            isPinned: false,
            score: 0.8,
        }));

        const startTime = performance.now();

        act(() => {
            result.current[0].events = largeEventList;
        });

        const filteredEvents = actions.getEvents({ type: ['motion'] });
        const recentEvents = actions.getRecentEvents(10);

        const endTime = performance.now();
        const duration = endTime - startTime;

        // 50ms 이내에 완료되어야 함
        expect(duration).toBeLessThan(50);
        expect(filteredEvents.length).toBe(1000);
        expect(recentEvents.length).toBe(10);
    });
}); 