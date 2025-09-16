import { Camera } from 'expo-camera';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import notificationService from '@/features/settings/services/notificationService';

export interface MotionDetectionConfig {
    enabled: boolean;
    sensitivity: 'low' | 'medium' | 'high';
    detectionInterval: number; // ms
    minMotionThreshold: number; // 픽셀 변화량
    maxMotionThreshold: number; // 픽셀 변화량
    cooldownPeriod: number; // ms (중복 알림 방지)
    recordingOnMotion: boolean;
    notificationOnMotion: boolean;
    zones: MotionZone[];
}

export interface MotionZone {
    id: string;
    name: string;
    x: number; // 0-1 비율
    y: number; // 0-1 비율
    width: number; // 0-1 비율
    height: number; // 0-1 비율
    enabled: boolean;
    sensitivity: 'low' | 'medium' | 'high';
}

export interface MotionEvent {
    id: string;
    timestamp: Date;
    intensity: number; // 0-100
    zone?: MotionZone;
    confidence: number; // 0-1
    imageData?: string; // base64 스냅샷
    metadata: {
        cameraId: string;
        frameWidth: number;
        frameHeight: number;
        motionPixels: number;
        totalPixels: number;
    };
}

export interface MotionDetectionStats {
    totalEvents: number;
    eventsToday: number;
    averageIntensity: number;
    mostActiveZone?: string;
    lastEventTime?: Date;
    detectionAccuracy: number;
}

class MotionDetectionService {
    private config: MotionDetectionConfig = {
        enabled: false,
        sensitivity: 'medium',
        detectionInterval: 1000, // 1초
        minMotionThreshold: 50,
        maxMotionThreshold: 500,
        cooldownPeriod: 30000, // 30초
        recordingOnMotion: true,
        notificationOnMotion: true,
        zones: [],
    };

    private isDetecting = false;
    private detectionInterval?: NodeJS.Timeout;
    private lastMotionTime = 0;
    private motionEvents: MotionEvent[] = [];
    private cameraRef?: React.RefObject<Camera>;
    private onMotionDetected?: (event: MotionEvent) => void;
    private onZoneViolation?: (zone: MotionZone, event: MotionEvent) => void;

    // 설정 업데이트
    updateConfig(config: Partial<MotionDetectionConfig>) {
        this.config = { ...this.config, ...config };
        console.log('🔧 모션 감지 설정 업데이트:', this.config);
    }

    // 현재 설정 조회
    getConfig(): MotionDetectionConfig {
        return { ...this.config };
    }

    // 모션 감지 시작
    async startDetection(
        cameraRef: React.RefObject<Camera>,
        onMotionDetected?: (event: MotionEvent) => void,
        onZoneViolation?: (zone: MotionZone, event: MotionEvent) => void
    ): Promise<boolean> {
        try {
            if (this.isDetecting) {
                console.log('⚠️ 모션 감지가 이미 실행 중입니다.');
                return true;
            }

            if (!this.config.enabled) {
                console.log('⚠️ 모션 감지가 비활성화되어 있습니다.');
                return false;
            }

            // 알림 권한 요청
            await this.requestNotificationPermissions();

            this.cameraRef = cameraRef;
            this.onMotionDetected = onMotionDetected;
            this.onZoneViolation = onZoneViolation;

            console.log('🎯 모션 감지 시작');
            this.isDetecting = true;

            // 주기적 모션 감지 시작
            this.detectionInterval = setInterval(() => {
                this.detectMotion();
            }, this.config.detectionInterval);

            return true;
        } catch (error) {
            console.error('❌ 모션 감지 시작 실패:', error);
            return false;
        }
    }

    // 모션 감지 중지
    stopDetection(): void {
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = undefined;
        }

        this.isDetecting = false;
        this.cameraRef = undefined;
        this.onMotionDetected = undefined;
        this.onZoneViolation = undefined;

        console.log('🛑 모션 감지 중지');
    }

    // 모션 감지 실행
    private async detectMotion(): Promise<void> {
        if (!this.cameraRef?.current || !this.isDetecting) return;

        try {
            // 현재 시간이 쿨다운 기간 내인지 확인
            const now = Date.now();
            if (now - this.lastMotionTime < this.config.cooldownPeriod) {
                return;
            }

            // 프레임 캡처
            const photo = await this.cameraRef.current.takePictureAsync({
                quality: 0.3, // 낮은 품질로 빠른 처리
                base64: true,
                skipProcessing: true,
            });

            if (!photo.base64) return;

            // 모션 분석
            const motionResult = await this.analyzeMotion(photo.base64);

            if (motionResult.intensity > this.getSensitivityThreshold()) {
                await this.handleMotionDetected(motionResult);
            }
        } catch (error) {
            console.error('❌ 모션 감지 오류:', error);
        }
    }

    // 모션 분석 (실제 구현에서는 더 정교한 알고리즘 사용)
    private async analyzeMotion(imageData: string): Promise<{
        intensity: number;
        confidence: number;
        motionPixels: number;
        totalPixels: number;
        zones: { zone: MotionZone; intensity: number }[];
    }> {
        // 실제 구현에서는 TensorFlow.js나 OpenCV.js를 사용하여
        // 프레임 간 차이를 분석하고 모션을 감지합니다.
        // 현재는 시뮬레이션된 결과를 반환합니다.

        const intensity = Math.random() * 100;
        const confidence = Math.random();
        const motionPixels = Math.floor(Math.random() * 1000);
        const totalPixels = 1920 * 1080; // 예시 해상도

        // 활성화된 존에서의 모션 분석
        const zones = this.config.zones
            .filter(zone => zone.enabled)
            .map(zone => ({
                zone,
                intensity: Math.random() * 100,
            }));

        return {
            intensity,
            confidence,
            motionPixels,
            totalPixels,
            zones,
        };
    }

    // 모션 감지 처리
    private async handleMotionDetected(motionResult: any): Promise<void> {
        const now = Date.now();
        this.lastMotionTime = now;

        const event: MotionEvent = {
            id: `motion_${now}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(now),
            intensity: motionResult.intensity,
            confidence: motionResult.confidence,
            metadata: {
                cameraId: 'CAM_' + Date.now(),
                frameWidth: 1920,
                frameHeight: 1080,
                motionPixels: motionResult.motionPixels,
                totalPixels: motionResult.totalPixels,
            },
        };

        // 이벤트 저장
        this.motionEvents.push(event);

        // 콜백 호출
        this.onMotionDetected?.(event);

        // 존 위반 확인
        for (const zoneResult of motionResult.zones) {
            if (zoneResult.intensity > this.getZoneSensitivityThreshold(zoneResult.zone)) {
                this.onZoneViolation?.(zoneResult.zone, event);
                await this.handleZoneViolation(zoneResult.zone, event);
            }
        }

        // 알림 전송
        if (this.config.notificationOnMotion) {
            await this.sendMotionNotification(event);
        }

        // 녹화 시작 (설정된 경우)
        if (this.config.recordingOnMotion) {
            await this.startMotionRecording(event);
        }

        console.log('🎯 모션 감지됨:', {
            intensity: event.intensity,
            confidence: event.confidence,
            timestamp: event.timestamp,
        });
    }

    // 존 위반 처리
    private async handleZoneViolation(zone: MotionZone, event: MotionEvent): Promise<void> {
        console.log(`🚨 존 위반 감지: ${zone.name}`);

        // 고우선순위 알림 전송
        await this.sendZoneViolationNotification(zone, event);
    }

    // 모션 알림 전송
    private async sendMotionNotification(event: MotionEvent): Promise<void> {
        try {
            const title = '모션 감지됨';
            const message = `강도: ${Math.round(event.intensity)}% | 신뢰도: ${Math.round(event.confidence * 100)}%`;

            // 로컬 알림
            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body: message,
                    data: { eventId: event.id, type: 'motion' },
                },
                trigger: null, // 즉시 전송
            });

            // 서버 알림 (백엔드 연동)
            await notificationService.createNotification({
                type: 'motion',
                title,
                message,
                metadata: {
                    eventId: event.id,
                    intensity: event.intensity,
                    confidence: event.confidence,
                    timestamp: event.timestamp.toISOString(),
                },
            });

            console.log('📱 모션 알림 전송됨');
        } catch (error) {
            console.error('❌ 모션 알림 전송 실패:', error);
        }
    }

    // 존 위반 알림 전송
    private async sendZoneViolationNotification(zone: MotionZone, event: MotionEvent): Promise<void> {
        try {
            const title = `🚨 ${zone.name} 존 위반`;
            const message = `보안 구역에서 움직임이 감지되었습니다.`;

            // 고우선순위 로컬 알림
            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body: message,
                    data: { eventId: event.id, type: 'zone_violation', zoneId: zone.id },
                    sound: 'default',
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                },
                trigger: null,
            });

            // 서버 알림
            await notificationService.createNotification({
                type: 'security',
                title,
                message,
                metadata: {
                    eventId: event.id,
                    zoneId: zone.id,
                    zoneName: zone.name,
                    intensity: event.intensity,
                    timestamp: event.timestamp.toISOString(),
                },
            });

            console.log('🚨 존 위반 알림 전송됨');
        } catch (error) {
            console.error('❌ 존 위반 알림 전송 실패:', error);
        }
    }

    // 모션 녹화 시작
    private async startMotionRecording(event: MotionEvent): Promise<void> {
        try {
            // 녹화 서비스와 연동하여 자동 녹화 시작
            console.log('🎬 모션 감지로 인한 녹화 시작');
            // recordingService.startRecording() 호출
        } catch (error) {
            console.error('❌ 모션 녹화 시작 실패:', error);
        }
    }

    // 알림 권한 요청
    private async requestNotificationPermissions(): Promise<void> {
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                throw new Error('알림 권한이 필요합니다.');
            }

            // 알림 채널 설정 (Android)
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('motion-detection', {
                    name: '모션 감지',
                    importance: Notifications.AndroidImportance.HIGH,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });
            }

            console.log('✅ 알림 권한 설정 완료');
        } catch (error) {
            console.error('❌ 알림 권한 설정 실패:', error);
            throw error;
        }
    }

    // 감도 임계값 계산
    private getSensitivityThreshold(): number {
        switch (this.config.sensitivity) {
            case 'low':
                return this.config.maxMotionThreshold * 0.8;
            case 'high':
                return this.config.minMotionThreshold * 0.5;
            default:
                return this.config.minMotionThreshold;
        }
    }

    // 존별 감도 임계값 계산
    private getZoneSensitivityThreshold(zone: MotionZone): number {
        const baseThreshold = this.getSensitivityThreshold();

        switch (zone.sensitivity) {
            case 'low':
                return baseThreshold * 1.5;
            case 'high':
                return baseThreshold * 0.5;
            default:
                return baseThreshold;
        }
    }

    // 모션 존 추가
    addZone(zone: MotionZone): void {
        this.config.zones.push(zone);
        console.log('📍 모션 존 추가:', zone.name);
    }

    // 모션 존 제거
    removeZone(zoneId: string): void {
        this.config.zones = this.config.zones.filter(zone => zone.id !== zoneId);
        console.log('🗑️ 모션 존 제거:', zoneId);
    }

    // 모션 존 업데이트
    updateZone(zoneId: string, updates: Partial<MotionZone>): void {
        const zoneIndex = this.config.zones.findIndex(zone => zone.id === zoneId);
        if (zoneIndex !== -1) {
            this.config.zones[zoneIndex] = { ...this.config.zones[zoneIndex], ...updates };
            console.log('✏️ 모션 존 업데이트:', zoneId);
        }
    }

    // 모션 이벤트 조회
    getMotionEvents(limit: number = 100): MotionEvent[] {
        return this.motionEvents
            .slice(-limit)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    // 모션 감지 통계
    getStats(): MotionDetectionStats {
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;

        const eventsToday = this.motionEvents.filter(
            event => event.timestamp.getTime() > oneDayAgo
        ).length;

        const totalIntensity = this.motionEvents.reduce((sum, event) => sum + event.intensity, 0);
        const averageIntensity = this.motionEvents.length > 0 ? totalIntensity / this.motionEvents.length : 0;

        // 가장 활성화된 존 계산
        const zoneActivity: { [zoneId: string]: number } = {};
        this.motionEvents.forEach(event => {
            if (event.zone) {
                zoneActivity[event.zone.id] = (zoneActivity[event.zone.id] || 0) + 1;
            }
        });

        const mostActiveZone = Object.keys(zoneActivity).reduce((a, b) =>
            zoneActivity[a] > zoneActivity[b] ? a : b, '');

        return {
            totalEvents: this.motionEvents.length,
            eventsToday,
            averageIntensity,
            mostActiveZone: mostActiveZone || undefined,
            lastEventTime: this.motionEvents.length > 0 ? this.motionEvents[this.motionEvents.length - 1].timestamp : undefined,
            detectionAccuracy: 0.85, // 실제로는 더 정교한 계산 필요
        };
    }

    // 이벤트 정리 (오래된 이벤트 삭제)
    cleanupEvents(maxAge: number = 7 * 24 * 60 * 60 * 1000): number {
        const cutoffTime = Date.now() - maxAge;
        const initialCount = this.motionEvents.length;

        this.motionEvents = this.motionEvents.filter(
            event => event.timestamp.getTime() > cutoffTime
        );

        const deletedCount = initialCount - this.motionEvents.length;
        console.log(`🧹 ${deletedCount}개의 오래된 모션 이벤트 정리됨`);

        return deletedCount;
    }

    // 서비스 정리
    cleanup(): void {
        this.stopDetection();
        this.motionEvents = [];
        console.log('🧹 모션 감지 서비스 정리 완료');
    }
}

// 싱글톤 인스턴스
export const motionDetectionService = new MotionDetectionService();
export default motionDetectionService; 