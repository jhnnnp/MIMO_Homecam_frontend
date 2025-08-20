import { useState, useEffect, useCallback, useRef } from 'react';
import { Camera } from 'expo-camera';
import { Alert } from 'react-native';
import {
    motionDetectionService,
    MotionDetectionConfig,
    MotionZone,
    MotionEvent,
    MotionDetectionStats,
} from '../services/motionDetectionService';

export interface MotionDetectionState {
    isEnabled: boolean;
    isDetecting: boolean;
    config: MotionDetectionConfig;
    recentEvents: MotionEvent[];
    stats: MotionDetectionStats;
    error: string | null;
}

export interface MotionDetectionActions {
    enableDetection: () => Promise<void>;
    disableDetection: () => void;
    startDetection: (cameraRef: React.RefObject<Camera>) => Promise<boolean>;
    stopDetection: () => void;
    updateConfig: (config: Partial<MotionDetectionConfig>) => void;
    addZone: (zone: MotionZone) => void;
    removeZone: (zoneId: string) => void;
    updateZone: (zoneId: string, updates: Partial<MotionZone>) => void;
    getEvents: (limit?: number) => MotionEvent[];
    getStats: () => MotionDetectionStats;
    cleanupEvents: (maxAge?: number) => number;
}

export const useMotionDetection = (): [MotionDetectionState, MotionDetectionActions] => {
    const [isEnabled, setIsEnabled] = useState(false);
    const [isDetecting, setIsDetecting] = useState(false);
    const [config, setConfig] = useState<MotionDetectionConfig>(motionDetectionService.getConfig());
    const [recentEvents, setRecentEvents] = useState<MotionEvent[]>([]);
    const [stats, setStats] = useState<MotionDetectionStats>(motionDetectionService.getStats());
    const [error, setError] = useState<string | null>(null);

    const cameraRefRef = useRef<React.RefObject<Camera> | null>(null);
    const statsUpdateIntervalRef = useRef<NodeJS.Timeout>();

    // 모션 감지 콜백
    const handleMotionDetected = useCallback((event: MotionEvent) => {
        setRecentEvents(prev => [event, ...prev.slice(0, 9)]); // 최근 10개만 유지
        setStats(motionDetectionService.getStats());
    }, []);

    // 존 위반 콜백
    const handleZoneViolation = useCallback((zone: MotionZone, event: MotionEvent) => {
        Alert.alert(
            '🚨 보안 경고',
            `${zone.name} 구역에서 움직임이 감지되었습니다!`,
            [
                { text: '확인', style: 'default' },
                { text: '상세보기', onPress: () => console.log('상세보기:', event) },
            ]
        );
    }, []);

    // 모션 감지 활성화
    const enableDetection = useCallback(async () => {
        try {
            setError(null);

            motionDetectionService.updateConfig({ enabled: true });
            setConfig(motionDetectionService.getConfig());
            setIsEnabled(true);

            console.log('✅ 모션 감지 활성화됨');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '모션 감지를 활성화할 수 없습니다.';
            setError(errorMessage);
            console.error('❌ 모션 감지 활성화 실패:', error);
        }
    }, []);

    // 모션 감지 비활성화
    const disableDetection = useCallback(() => {
        motionDetectionService.updateConfig({ enabled: false });
        setConfig(motionDetectionService.getConfig());
        setIsEnabled(false);

        if (isDetecting) {
            stopDetection();
        }

        console.log('🛑 모션 감지 비활성화됨');
    }, [isDetecting]);

    // 모션 감지 시작
    const startDetection = useCallback(async (cameraRef: React.RefObject<Camera>): Promise<boolean> => {
        try {
            setError(null);

            if (!isEnabled) {
                setError('모션 감지가 비활성화되어 있습니다.');
                return false;
            }

            cameraRefRef.current = cameraRef;

            const success = await motionDetectionService.startDetection(
                cameraRef,
                handleMotionDetected,
                handleZoneViolation
            );

            if (success) {
                setIsDetecting(true);
                console.log('🎯 모션 감지 시작됨');
            } else {
                setError('모션 감지를 시작할 수 없습니다.');
            }

            return success;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '모션 감지를 시작할 수 없습니다.';
            setError(errorMessage);
            console.error('❌ 모션 감지 시작 실패:', error);
            return false;
        }
    }, [isEnabled, handleMotionDetected, handleZoneViolation]);

    // 모션 감지 중지
    const stopDetection = useCallback(() => {
        motionDetectionService.stopDetection();
        setIsDetecting(false);
        cameraRefRef.current = null;
        console.log('🛑 모션 감지 중지됨');
    }, []);

    // 설정 업데이트
    const updateConfig = useCallback((newConfig: Partial<MotionDetectionConfig>) => {
        motionDetectionService.updateConfig(newConfig);
        setConfig(motionDetectionService.getConfig());
        console.log('🔧 모션 감지 설정 업데이트됨');
    }, []);

    // 모션 존 추가
    const addZone = useCallback((zone: MotionZone) => {
        motionDetectionService.addZone(zone);
        setConfig(motionDetectionService.getConfig());
        console.log('📍 모션 존 추가됨:', zone.name);
    }, []);

    // 모션 존 제거
    const removeZone = useCallback((zoneId: string) => {
        motionDetectionService.removeZone(zoneId);
        setConfig(motionDetectionService.getConfig());
        console.log('🗑️ 모션 존 제거됨:', zoneId);
    }, []);

    // 모션 존 업데이트
    const updateZone = useCallback((zoneId: string, updates: Partial<MotionZone>) => {
        motionDetectionService.updateZone(zoneId, updates);
        setConfig(motionDetectionService.getConfig());
        console.log('✏️ 모션 존 업데이트됨:', zoneId);
    }, []);

    // 이벤트 조회
    const getEvents = useCallback((limit: number = 100): MotionEvent[] => {
        return motionDetectionService.getMotionEvents(limit);
    }, []);

    // 통계 조회
    const getStats = useCallback((): MotionDetectionStats => {
        return motionDetectionService.getStats();
    }, []);

    // 이벤트 정리
    const cleanupEvents = useCallback((maxAge: number = 7 * 24 * 60 * 60 * 1000): number => {
        const deletedCount = motionDetectionService.cleanupEvents(maxAge);
        setRecentEvents(motionDetectionService.getMotionEvents(10));
        setStats(motionDetectionService.getStats());
        return deletedCount;
    }, []);

    // 통계 자동 업데이트
    useEffect(() => {
        if (isDetecting) {
            statsUpdateIntervalRef.current = setInterval(() => {
                setStats(motionDetectionService.getStats());
            }, 5000); // 5초마다 통계 업데이트
        } else {
            if (statsUpdateIntervalRef.current) {
                clearInterval(statsUpdateIntervalRef.current);
                statsUpdateIntervalRef.current = undefined;
            }
        }

        return () => {
            if (statsUpdateIntervalRef.current) {
                clearInterval(statsUpdateIntervalRef.current);
            }
        };
    }, [isDetecting]);

    // 컴포넌트 언마운트 시 정리
    useEffect(() => {
        return () => {
            if (isDetecting) {
                stopDetection();
            }
            if (statsUpdateIntervalRef.current) {
                clearInterval(statsUpdateIntervalRef.current);
            }
        };
    }, [isDetecting, stopDetection]);

    const state: MotionDetectionState = {
        isEnabled,
        isDetecting,
        config,
        recentEvents,
        stats,
        error,
    };

    const actions: MotionDetectionActions = {
        enableDetection,
        disableDetection,
        startDetection,
        stopDetection,
        updateConfig,
        addZone,
        removeZone,
        updateZone,
        getEvents,
        getStats,
        cleanupEvents,
    };

    return [state, actions];
}; 