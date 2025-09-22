// ============================================================================
// IMPROVED USE MOTION DETECTION HOOK - 개선된 모션 감지 훅
// ============================================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Camera } from 'expo-camera';
import { Alert } from 'react-native';

import {
  MotionDetectionState,
  MotionDetectionActions,
  MotionDetectionConfig,
  MotionZone,
  MotionEvent,
  MotionDetectionStats
} from '@/shared/types/hooks';
import {
  motionDetectionService,
  MotionDetectionConfig as ServiceConfig,
  MotionZone as ServiceZone,
  MotionEvent as ServiceEvent,
  MotionDetectionStats as ServiceStats,
} from '@/features/camera/services/motionDetectionService';
import eventService from '../services/eventService';
import notificationService from '@/features/settings/services/notificationService';
import SettingsService from '@/shared/services/SettingsService';
import { logger, logMotion, logMotionError } from '@/shared/utils/logger';

// ============================================================================
// 상수 정의
// ============================================================================

const DEFAULT_CONFIG: MotionDetectionConfig = {
  enabled: false,
  sensitivity: 50,
  threshold: 0.5,
  minArea: 100,
  maxArea: 10000,
  cooldown: 5000,
  zones: [],
};

const STATS_UPDATE_INTERVAL = 5000; // 5초
const EVENT_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24시간

// ============================================================================
// 메인 모션 감지 훅
// ============================================================================

export const useMotionDetection = (): HookReturn<MotionDetectionState, MotionDetectionActions> => {

  // ============================================================================
  // 상태 관리
  // ============================================================================

  const [state, setState] = useState<MotionDetectionState>({
    isEnabled: false,
    isDetecting: false,
    config: DEFAULT_CONFIG,
    recentEvents: [],
    stats: {
      totalDetections: 0,
      todayDetections: 0,
      averageConfidence: 0,
      zoneViolations: {},
      lastDetectionTime: undefined,
    },
    zones: [],
    error: null,
    isLoading: false,
    connectionStatus: 'disconnected',
  });

  // ============================================================================
  // Refs
  // ============================================================================

  const isMountedRef = useRef(true);
  const cameraRefRef = useRef<React.RefObject<Camera> | null>(null);
  const statsUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isStartingDetectionRef = useRef(false);
  const isStoppingDetectionRef = useRef(false);

  // ============================================================================
  // 안전한 상태 업데이트
  // ============================================================================

  const safeSetState = useCallback((updater: (prev: MotionDetectionState) => MotionDetectionState) => {
    if (isMountedRef.current) {
      setState(updater);
    }
  }, []);

  // ============================================================================
  // 에러 처리
  // ============================================================================

  const handleError = useCallback((error: unknown, action: string) => {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    logMotionError(action, errorMessage, error instanceof Error ? error : undefined);

    safeSetState(prev => ({
      ...prev,
      error: errorMessage,
      isLoading: false,
    }));
  }, [safeSetState]);

  // ============================================================================
  // 로딩 상태 관리
  // ============================================================================

  const setLoading = useCallback((isLoading: boolean) => {
    safeSetState(prev => ({ ...prev, isLoading }));
  }, [safeSetState]);

  // ============================================================================
  // 설정 동기화
  // ============================================================================

  const syncConfig = useCallback(async () => {
    try {
      // 전역 사용자 설정에서 필요한 값 매핑 (Plan A)
      const core = await SettingsService.getCoreSettings();
      const custom = await SettingsService.getCustomSettings();

      if (core || custom) {
        const updatedConfig: MotionDetectionConfig = {
          ...DEFAULT_CONFIG,
          enabled: !!custom?.motion_detection_enabled ?? DEFAULT_CONFIG.enabled,
          sensitivity: core?.motion_sensitivity === 'high' ? 80 : core?.motion_sensitivity === 'low' ? 30 : 50,
          // 나머지는 커스텀 키로 확장 여지
        };

        // 모션 감지 서비스 설정 업데이트
        motionDetectionService.updateConfig(updatedConfig as ServiceConfig);

        safeSetState(prev => ({
          ...prev,
          config: updatedConfig,
          zones: updatedConfig.zones,
        }));

        logMotion('syncConfig', '설정 동기화 완료', updatedConfig);
      }
    } catch (error) {
      logMotionError('syncConfig', '설정 동기화 실패', error instanceof Error ? error : undefined);
    }
  }, [safeSetState]);

  // ============================================================================
  // 모션 감지 활성화/비활성화
  // ============================================================================

  const enableDetection = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      logMotion('enableDetection', '모션 감지 활성화 시작');

      // 설정 동기화
      await syncConfig();

      // 모션 감지 서비스 활성화
      motionDetectionService.updateConfig({ enabled: true } as ServiceConfig);

      safeSetState(prev => ({
        ...prev,
        isEnabled: true,
        config: { ...prev.config, enabled: true },
        error: null,
        isLoading: false,
      }));

      logMotion('enableDetection', '모션 감지 활성화 완료');
    } catch (error) {
      handleError(error, 'enableDetection');
      throw error;
    }
  }, [setLoading, syncConfig, safeSetState, handleError]);

  const disableDetection = useCallback((): void => {
    try {
      logMotion('disableDetection', '모션 감지 비활성화');

      // 모션 감지 서비스 비활성화
      motionDetectionService.updateConfig({ enabled: false } as ServiceConfig);

      // 감지 중이면 중지
      if (state.isDetecting) {
        stopDetection();
      }

      safeSetState(prev => ({
        ...prev,
        isEnabled: false,
        config: { ...prev.config, enabled: false },
        error: null,
      }));

      logMotion('disableDetection', '모션 감지 비활성화 완료');
    } catch (error) {
      handleError(error, 'disableDetection');
    }
  }, [state.isDetecting, safeSetState, handleError]);

  // ============================================================================
  // 모션 감지 시작/중지
  // ============================================================================

  const startDetection = useCallback(async (cameraRef: React.RefObject<Camera>): Promise<boolean> => {
    if (isStartingDetectionRef.current) {
      logMotion('startDetection', '이미 감지 시작 중입니다');
      return false;
    }

    if (!state.isEnabled) {
      logMotionError('startDetection', '모션 감지가 비활성화되어 있습니다');
      safeSetState(prev => ({ ...prev, error: '모션 감지가 비활성화되어 있습니다.' }));
      return false;
    }

    isStartingDetectionRef.current = true;
    setLoading(true);

    try {
      logMotion('startDetection', '모션 감지 시작');

      cameraRefRef.current = cameraRef;

      const success = await motionDetectionService.startDetection(
        cameraRef,
        handleMotionDetected,
        handleZoneViolation
      );

      if (success) {
        safeSetState(prev => ({
          ...prev,
          isDetecting: true,
          error: null,
          isLoading: false,
        }));

        logMotion('startDetection', '모션 감지 시작 완료');
        return true;
      } else {
        safeSetState(prev => ({
          ...prev,
          error: '모션 감지를 시작할 수 없습니다.',
          isLoading: false,
        }));
        return false;
      }
    } catch (error) {
      handleError(error, 'startDetection');
      return false;
    } finally {
      isStartingDetectionRef.current = false;
    }
  }, [state.isEnabled, setLoading, safeSetState, handleError]);

  const stopDetection = useCallback((): void => {
    if (isStoppingDetectionRef.current) {
      logMotion('stopDetection', '이미 감지 중지 중입니다');
      return;
    }

    isStoppingDetectionRef.current = true;

    try {
      logMotion('stopDetection', '모션 감지 중지');

      motionDetectionService.stopDetection();
      cameraRefRef.current = null;

      safeSetState(prev => ({
        ...prev,
        isDetecting: false,
        error: null,
      }));

      logMotion('stopDetection', '모션 감지 중지 완료');
    } catch (error) {
      handleError(error, 'stopDetection');
    } finally {
      isStoppingDetectionRef.current = false;
    }
  }, [safeSetState, handleError]);

  // ============================================================================
  // 모션 감지 콜백
  // ============================================================================

  const handleMotionDetected = useCallback((event: ServiceEvent) => {
    try {
      // 이벤트 변환
      const motionEvent: MotionEvent = {
        id: event.id,
        timestamp: event.timestamp,
        confidence: event.confidence,
        zoneId: event.zoneId,
        zoneName: event.zoneName,
        location: event.location,
        metadata: event.metadata,
      };

      // 최근 이벤트에 추가 (최대 10개 유지)
      safeSetState(prev => ({
        ...prev,
        recentEvents: [motionEvent, ...prev.recentEvents.slice(0, 9)],
      }));

      // 통계 업데이트
      updateStats();

      // 이벤트 서비스에 전송
      eventService.createEvent({
        cameraId: parseInt(event.cameraId || '0'),
        type: 'motion',
        confidence: event.confidence,
        metadata: {
          ...event.metadata,
          zoneId: event.zoneId,
          zoneName: event.zoneName,
        },
        location: event.location,
      });

      // 알림 전송 (신뢰도가 높은 경우)
      if (event.confidence > 0.7) {
        notificationService.sendNotification({
          type: 'motion',
          title: '모션 감지',
          message: `높은 신뢰도로 움직임이 감지되었습니다. (${Math.round(event.confidence * 100)}%)`,
          priority: 'high',
          data: { eventId: event.id, confidence: event.confidence },
        });
      }

      logMotion('handleMotionDetected', '모션 감지 이벤트 처리 완료', { eventId: event.id });
    } catch (error) {
      logMotionError('handleMotionDetected', '모션 감지 이벤트 처리 실패', error instanceof Error ? error : undefined);
    }
  }, [safeSetState, updateStats]);

  const handleZoneViolation = useCallback((zone: ServiceZone, event: ServiceEvent) => {
    try {
      Alert.alert(
        '🚨 보안 경고',
        `${zone.name} 구역에서 움직임이 감지되었습니다!`,
        [
          { text: '확인', style: 'default' },
          {
            text: '상세보기',
            onPress: () => {
              logMotion('handleZoneViolation', '상세보기 선택', { zoneId: zone.id, eventId: event.id });
            }
          },
        ]
      );

      // 존 위반 알림 전송
      notificationService.sendNotification({
        type: 'motion',
        title: '보안 경고',
        message: `${zone.name} 구역에서 움직임이 감지되었습니다!`,
        priority: 'urgent',
        data: { zoneId: zone.id, eventId: event.id },
      });

      logMotion('handleZoneViolation', '존 위반 처리 완료', { zoneId: zone.id, eventId: event.id });
    } catch (error) {
      logMotionError('handleZoneViolation', '존 위반 처리 실패', error instanceof Error ? error : undefined);
    }
  }, []);

  // ============================================================================
  // 설정 관리
  // ============================================================================

  const updateConfig = useCallback((newConfig: Partial<MotionDetectionConfig>): void => {
    try {
      logMotion('updateConfig', '설정 업데이트', newConfig);

      // 모션 감지 서비스 설정 업데이트
      motionDetectionService.updateConfig(newConfig as ServiceConfig);

      // 로컬 상태 업데이트
      safeSetState(prev => ({
        ...prev,
        config: { ...prev.config, ...newConfig },
        zones: newConfig.zones || prev.zones,
      }));

      // 설정 서비스에 저장
      settingsService.updateMotionDetectionSettings(newConfig);

      logMotion('updateConfig', '설정 업데이트 완료');
    } catch (error) {
      handleError(error, 'updateConfig');
    }
  }, [safeSetState, handleError]);

  // ============================================================================
  // 존 관리
  // ============================================================================

  const addZone = useCallback((zone: MotionZone): void => {
    try {
      logMotion('addZone', '존 추가', { zoneId: zone.id, zoneName: zone.name });

      motionDetectionService.addZone(zone as ServiceZone);

      safeSetState(prev => ({
        ...prev,
        zones: [...prev.zones, zone],
        config: {
          ...prev.config,
          zones: [...prev.config.zones, zone],
        },
      }));

      logMotion('addZone', '존 추가 완료');
    } catch (error) {
      handleError(error, 'addZone');
    }
  }, [safeSetState, handleError]);

  const removeZone = useCallback((zoneId: string): void => {
    try {
      logMotion('removeZone', '존 제거', { zoneId });

      motionDetectionService.removeZone(zoneId);

      safeSetState(prev => ({
        ...prev,
        zones: prev.zones.filter(zone => zone.id !== zoneId),
        config: {
          ...prev.config,
          zones: prev.config.zones.filter(zone => zone.id !== zoneId),
        },
      }));

      logMotion('removeZone', '존 제거 완료');
    } catch (error) {
      handleError(error, 'removeZone');
    }
  }, [safeSetState, handleError]);

  const updateZone = useCallback((zoneId: string, updates: Partial<MotionZone>): void => {
    try {
      logMotion('updateZone', '존 업데이트', { zoneId, updates });

      motionDetectionService.updateZone(zoneId, updates as Partial<ServiceZone>);

      safeSetState(prev => ({
        ...prev,
        zones: prev.zones.map(zone =>
          zone.id === zoneId ? { ...zone, ...updates } : zone
        ),
        config: {
          ...prev.config,
          zones: prev.config.zones.map(zone =>
            zone.id === zoneId ? { ...zone, ...updates } : zone
          ),
        },
      }));

      logMotion('updateZone', '존 업데이트 완료');
    } catch (error) {
      handleError(error, 'updateZone');
    }
  }, [safeSetState, handleError]);

  // ============================================================================
  // 이벤트 관리
  // ============================================================================

  const getEvents = useCallback((limit: number = 100): MotionEvent[] => {
    return motionDetectionService.getMotionEvents(limit);
  }, []);

  const cleanupEvents = useCallback((maxAge: number = EVENT_CLEANUP_INTERVAL): number => {
    try {
      const deletedCount = motionDetectionService.cleanupEvents(maxAge);

      // 최근 이벤트 업데이트
      safeSetState(prev => ({
        ...prev,
        recentEvents: motionDetectionService.getMotionEvents(10),
      }));

      updateStats();

      logMotion('cleanupEvents', '이벤트 정리 완료', { deletedCount });
      return deletedCount;
    } catch (error) {
      logMotionError('cleanupEvents', '이벤트 정리 실패', error instanceof Error ? error : undefined);
      return 0;
    }
  }, [safeSetState, updateStats]);

  // ============================================================================
  // 통계 관리
  // ============================================================================

  const getStats = useCallback((): MotionDetectionStats => {
    return motionDetectionService.getStats();
  }, []);

  const updateStats = useCallback(() => {
    try {
      const serviceStats = motionDetectionService.getStats();

      const stats: MotionDetectionStats = {
        totalDetections: serviceStats.totalDetections,
        todayDetections: serviceStats.todayDetections,
        averageConfidence: serviceStats.averageConfidence,
        zoneViolations: serviceStats.zoneViolations,
        lastDetectionTime: serviceStats.lastDetectionTime,
      };

      safeSetState(prev => ({
        ...prev,
        stats,
      }));
    } catch (error) {
      logMotionError('updateStats', '통계 업데이트 실패', error instanceof Error ? error : undefined);
    }
  }, [safeSetState]);

  // ============================================================================
  // 통계 자동 업데이트
  // ============================================================================

  useEffect(() => {
    if (state.isDetecting) {
      statsUpdateIntervalRef.current = setInterval(() => {
        updateStats();
      }, STATS_UPDATE_INTERVAL);
    } else {
      if (statsUpdateIntervalRef.current) {
        clearInterval(statsUpdateIntervalRef.current);
        statsUpdateIntervalRef.current = null;
      }
    }

    return () => {
      if (statsUpdateIntervalRef.current) {
        clearInterval(statsUpdateIntervalRef.current);
      }
    };
  }, [state.isDetecting, updateStats]);

  // ============================================================================
  // 이벤트 자동 정리
  // ============================================================================

  useEffect(() => {
    cleanupIntervalRef.current = setInterval(() => {
      cleanupEvents();
    }, EVENT_CLEANUP_INTERVAL);

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, [cleanupEvents]);

  // ============================================================================
  // 컴포넌트 마운트 시 초기화
  // ============================================================================

  useEffect(() => {
    syncConfig();
  }, [syncConfig]);

  // ============================================================================
  // 컴포넌트 언마운트 시 정리
  // ============================================================================

  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      // 활성 타이머 정리
      if (statsUpdateIntervalRef.current) {
        clearInterval(statsUpdateIntervalRef.current);
      }
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }

      // 감지 중이면 중지
      if (state.isDetecting) {
        stopDetection();
      }

      logMotion('cleanup', '모션 감지 훅 정리 완료');
    };
  }, [state.isDetecting, stopDetection]);

  // ============================================================================
  // 액션 객체 생성
  // ============================================================================

  const actions: MotionDetectionActions = useMemo(() => ({
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
  }), [
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
  ]);

  return [state, actions];
}; 