import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export interface NotificationData {
    id: string;
    title: string;
    body: string;
    data?: any;
    sound?: boolean;
    priority?: 'default' | 'normal' | 'high';
    category?: string;
}

export interface NotificationSettings {
    motionDetection: boolean;
    systemAlerts: boolean;
    securityAlerts: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    quietHours: {
        enabled: boolean;
        start: string; // HH:mm
        end: string;   // HH:mm
    };
}

class NotificationService {
    private expoPushToken: string | null = null;
    private settings: NotificationSettings = {
        motionDetection: true,
        systemAlerts: true,
        securityAlerts: true,
        soundEnabled: true,
        vibrationEnabled: true,
        quietHours: {
            enabled: false,
            start: '22:00',
            end: '08:00',
        },
    };

    constructor() {
        this.setupNotifications();
    }

    // 알림 설정 초기화
    private async setupNotifications() {
        try {
            // 알림 권한 요청
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.warn('⚠️ 알림 권한이 거부되었습니다.');
                return;
            }

            // 로컬 알림만 사용 (Firebase 제거)
            console.log('📱 로컬 알림 모드로 초기화');

            // 알림 핸들러 설정
            Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,
                    shouldPlaySound: this.settings.soundEnabled,
                    shouldSetBadge: true,
                }),
            });

            // 알림 수신 리스너
            Notifications.addNotificationReceivedListener(this.handleNotificationReceived);
            Notifications.addNotificationResponseReceivedListener(this.handleNotificationResponse);

            console.log('✅ 알림 서비스 초기화 완료 (로컬 모드)');
        } catch (error) {
            console.error('❌ 알림 서비스 초기화 실패:', error);
        }
    }

    // 알림 수신 처리
    private handleNotificationReceived = (notification: Notifications.Notification) => {
        console.log('📨 알림 수신됨:', notification);

        // 알림 데이터 처리
        const { title, body, data } = notification.request.content;

        // 알림 타입별 처리
        switch (data?.type) {
            case 'motion_detected':
                this.handleMotionNotification(data);
                break;
            case 'security_alert':
                this.handleSecurityNotification(data);
                break;
            case 'system_alert':
                this.handleSystemNotification(data);
                break;
            default:
                console.log('📨 일반 알림:', { title, body, data });
        }
    };

    // 알림 응답 처리
    private handleNotificationResponse = (response: Notifications.NotificationResponse) => {
        console.log('👆 알림 응답:', response);

        const { data } = response.notification.request.content;

        // 알림 클릭 시 앱 동작
        switch (data?.action) {
            case 'view_camera':
                // 카메라 화면으로 이동
                console.log('📹 카메라 화면으로 이동');
                break;
            case 'view_recording':
                // 녹화 화면으로 이동
                console.log('📹 녹화 화면으로 이동');
                break;
            case 'dismiss':
                // 알림 무시
                console.log('❌ 알림 무시');
                break;
            default:
                console.log('👆 기본 알림 응답');
        }
    };

    // 모션 감지 알림 처리
    private handleMotionNotification(data: any) {
        console.log('🎯 모션 감지 알림:', data);
        // 추가 처리 로직
    }

    // 보안 알림 처리
    private handleSecurityNotification(data: any) {
        console.log('🚨 보안 알림:', data);
        // 추가 처리 로직
    }

    // 시스템 알림 처리
    private handleSystemNotification(data: any) {
        console.log('⚙️ 시스템 알림:', data);
        // 추가 처리 로직
    }

    // 로컬 알림 발송
    async sendLocalNotification(notification: NotificationData): Promise<void> {
        try {
            // 조용한 시간 확인
            if (this.isInQuietHours()) {
                console.log('🔇 조용한 시간 - 알림 발송 건너뜀');
                return;
            }

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: notification.title,
                    body: notification.body,
                    data: notification.data,
                    sound: notification.sound && this.settings.soundEnabled,
                    priority: notification.priority || 'default',
                    categoryIdentifier: notification.category,
                },
                trigger: null, // 즉시 발송
            });

            console.log('📤 로컬 알림 발송됨:', notification.title);
        } catch (error) {
            console.error('❌ 로컬 알림 발송 실패:', error);
        }
    }

    // 모션 감지 알림 발송
    async sendMotionNotification(cameraId: string, intensity: number): Promise<void> {
        const notification: NotificationData = {
            id: `motion_${Date.now()}`,
            title: '모션 감지됨',
            body: `카메라에서 움직임이 감지되었습니다. (강도: ${intensity}%)`,
            data: {
                type: 'motion_detected',
                cameraId,
                intensity,
                timestamp: Date.now(),
                action: 'view_camera',
            },
            sound: true,
            priority: 'high',
            category: 'motion',
        };

        await this.sendLocalNotification(notification);
    }

    // 보안 알림 발송
    async sendSecurityNotification(cameraId: string, alertType: string): Promise<void> {
        const notification: NotificationData = {
            id: `security_${Date.now()}`,
            title: '보안 알림',
            body: `보안 이벤트가 발생했습니다: ${alertType}`,
            data: {
                type: 'security_alert',
                cameraId,
                alertType,
                timestamp: Date.now(),
                action: 'view_camera',
            },
            sound: true,
            priority: 'high',
            category: 'security',
        };

        await this.sendLocalNotification(notification);
    }

    // 시스템 알림 발송
    async sendSystemNotification(title: string, body: string): Promise<void> {
        const notification: NotificationData = {
            id: `system_${Date.now()}`,
            title,
            body,
            data: {
                type: 'system_alert',
                timestamp: Date.now(),
            },
            sound: false,
            priority: 'default',
            category: 'system',
        };

        await this.sendLocalNotification(notification);
    }

    // 예약 알림 발송
    async scheduleNotification(
        notification: NotificationData,
        trigger: Notifications.NotificationTriggerInput
    ): Promise<string> {
        try {
            const identifier = await Notifications.scheduleNotificationAsync({
                content: {
                    title: notification.title,
                    body: notification.body,
                    data: notification.data,
                    sound: notification.sound && this.settings.soundEnabled,
                    priority: notification.priority || 'default',
                    categoryIdentifier: notification.category,
                },
                trigger,
            });

            console.log('⏰ 예약 알림 설정됨:', identifier);
            return identifier;
        } catch (error) {
            console.error('❌ 예약 알림 설정 실패:', error);
            throw error;
        }
    }

    // 알림 취소
    async cancelNotification(identifier: string): Promise<void> {
        try {
            await Notifications.cancelScheduledNotificationAsync(identifier);
            console.log('❌ 알림 취소됨:', identifier);
        } catch (error) {
            console.error('❌ 알림 취소 실패:', error);
        }
    }

    // 모든 알림 취소
    async cancelAllNotifications(): Promise<void> {
        try {
            await Notifications.cancelAllScheduledNotificationsAsync();
            console.log('❌ 모든 알림 취소됨');
        } catch (error) {
            console.error('❌ 모든 알림 취소 실패:', error);
        }
    }

    // 알림 설정 업데이트
    updateSettings(newSettings: Partial<NotificationSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
        console.log('⚙️ 알림 설정 업데이트됨:', this.settings);
    }

    // 알림 설정 조회
    getSettings(): NotificationSettings {
        return { ...this.settings };
    }

    // 로컬 알림 토큰 조회 (Firebase 제거)
    getLocalNotificationToken(): string | null {
        return 'local-notification-token';
    }

    // 조용한 시간 확인
    private isInQuietHours(): boolean {
        if (!this.settings.quietHours.enabled) {
            return false;
        }

        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        const { start, end } = this.settings.quietHours;

        if (start <= end) {
            // 같은 날 내의 시간 범위
            return currentTime >= start && currentTime <= end;
        } else {
            // 자정을 걸치는 시간 범위
            return currentTime >= start || currentTime <= end;
        }
    }

    // 알림 카테고리 설정
    async setupNotificationCategories(): Promise<void> {
        try {
            await Notifications.setNotificationCategoryAsync('motion', [
                {
                    identifier: 'view_camera',
                    buttonTitle: '카메라 보기',
                    options: {
                        isDestructive: false,
                        isAuthenticationRequired: false,
                    },
                },
                {
                    identifier: 'dismiss',
                    buttonTitle: '무시',
                    options: {
                        isDestructive: true,
                        isAuthenticationRequired: false,
                    },
                },
            ]);

            await Notifications.setNotificationCategoryAsync('security', [
                {
                    identifier: 'view_camera',
                    buttonTitle: '카메라 보기',
                    options: {
                        isDestructive: false,
                        isAuthenticationRequired: false,
                    },
                },
                {
                    identifier: 'call_emergency',
                    buttonTitle: '긴급 연락',
                    options: {
                        isDestructive: false,
                        isAuthenticationRequired: true,
                    },
                },
            ]);

            console.log('✅ 알림 카테고리 설정 완료');
        } catch (error) {
            console.error('❌ 알림 카테고리 설정 실패:', error);
        }
    }
}

// 싱글톤 인스턴스
export const notificationService = new NotificationService();
export default notificationService; 