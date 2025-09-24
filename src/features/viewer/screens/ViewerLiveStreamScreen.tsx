/**
 * ViewerLiveStreamScreen - 향상된 라이브 스트림 시청 화면
 * 
 * 핵심 기능:
 * - 홈캠 실시간 스트림 시청 (전체화면)
 * - 직관적인 제스처 기반 컨트롤
 * - 실시간 연결 상태 및 품질 표시
 * - 접근성 및 사용성 최적화
 * - 반응형 디자인 지원
 * 
 * 홈캠이 송출하는 실시간 화면을 보여주는 전체화면 화면
 */

import React, { useState, useEffect, useCallback, memo, useRef } from 'react';

// 홈캠 목록과 일치하는 iOS 스타일 색상 팔레트
const SCREEN_COLORS = {
    primary: '#007AFF',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#C6C6C8',
    overlay: 'rgba(0,0,0,0.6)',
    glass: 'rgba(255,255,255,0.12)'
} as const;
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
    Dimensions,
    Platform,
    Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

// WebRTC Components & Services
import { WebRTCVideoPlayer } from '@/shared/components/media/WebRTCVideoPlayer';
import { webrtcService, WebRTCStream } from '@/shared/services/core/webrtcService';
import { signalingService } from '@/shared/services/core/signalingService';
// iOS 렌더링 호환을 위한 RTCView (react-native-webrtc)
// 네이티브 빌드 환경에서만 사용되며, Android에서도 동작합니다.
// Expo Go에서는 사용되지 않습니다.
import { RTCView } from 'react-native-webrtc';

// Design tokens 제거 - 하드코딩된 값 사용

// Navigation Types
import { RootStackParamList } from '@/app/navigation/AppNavigator';

// Utils
import { logger } from '@/shared/utils/logger';
import { colors as dsColors, elevation as dsElevation, spacing as dsSpacing, radius as dsRadius } from '@/design/tokens/tokens';
import { getElevation } from '@/shared/styles/crossPlatform';

// Constants
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 디자인 토큰 매핑 (다크 배경 화면용)
const colors = {
    primary: dsColors.primary,
    primaryLight: dsColors.primaryLight,
    accent: dsColors.accent,
    success: dsColors.success,
    warning: dsColors.warning,
    error: dsColors.error,
    background: '#000000',
    surface: dsColors.surface,
    text: dsColors.textOnPrimary,
    textSecondary: dsColors.disabledText,
    border: '#333333',
    overlay: dsColors.dimOverlay,
    glass: 'rgba(255,255,255,0.10)'
} as const;

// Types
type ViewerLiveStreamScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'LiveStream'>;
type ViewerLiveStreamScreenRouteProp = RouteProp<RootStackParamList, 'LiveStream'>;

interface ViewerLiveStreamScreenProps {
    navigation: ViewerLiveStreamScreenNavigationProp;
    route: ViewerLiveStreamScreenRouteProp;
}

const ViewerLiveStreamScreen = memo(({ navigation, route }: ViewerLiveStreamScreenProps) => {
    const { cameraId, cameraName, ipAddress, quality } = route.params;
    const isAdmin = (route.params as any)?.isAdmin || false;

    // State Management
    const [isConnected, setIsConnected] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [streamQuality, setStreamQuality] = useState(quality || '1080p');
    const [connectionStrength, setConnectionStrength] = useState(0); // 연결 강도 (%)
    const [isRecording, setIsRecording] = useState(false);
    const [streamStats, setStreamStats] = useState({
        fps: 30,
        bitrate: '2.5 Mbps',
        resolution: '1920x1080'
    });

    // WebRTC State
    const [webrtcStream, setWebrtcStream] = useState<WebRTCStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<any>(null);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed'>('connecting');

    // Animation Refs
    const controlsOpacity = useRef(new Animated.Value(1)).current;
    const statusBarOpacity = useRef(new Animated.Value(1)).current;
    const qualityButtonScale = useRef(new Animated.Value(1)).current;

    // WebRTC 초기화 및 연결
    useEffect(() => {
        const initializeWebRTC = async () => {
            try {
                logger.info('[ViewerLiveStream] WebRTC 초기화 시작', { cameraId, cameraName });

                // WebRTC 이벤트 리스너 등록
                const eventListener = (event: any, streamId: string, data?: any) => {
                    logger.debug('[ViewerLiveStream] WebRTC 이벤트:', { event, streamId, data });

                    switch (event) {
                        case 'connection_state_changed':
                            const state = data as 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';
                            setConnectionStatus(state === 'new' ? 'connecting' : state);
                            setIsConnected(state === 'connected');

                            if (state === 'connected') {
                                setConnectionStrength(85 + Math.random() * 15); // 85-100%
                            } else if (state === 'connecting') {
                                setConnectionStrength(30 + Math.random() * 30); // 30-60%
                            } else {
                                setConnectionStrength(0);
                            }
                            break;

                        case 'track_added':
                            logger.info('[ViewerLiveStream] 원격 스트림 수신됨');
                            if (data?.streams?.[0]) {
                                setRemoteStream(data.streams[0]);
                            }
                            break;

                        case 'stream_created':
                            setWebrtcStream(data);
                            break;

                        case 'error':
                            logger.error('[ViewerLiveStream] WebRTC 오류:', data);
                            setConnectionStatus('failed');
                            break;
                    }
                };

                webrtcService.addEventListener(eventListener);

                // 뷰어 모드로 스트림 시작
                const viewerId = `viewer_${Date.now()}`; // 실제로는 사용자 ID 사용
                const stream = await webrtcService.startViewing(cameraId, viewerId);

                // 스트림 수신 콜백 설정
                stream.onStreamReceived = (receivedStream: any) => {
                    logger.info('[ViewerLiveStream] 스트림 수신 콜백 호출됨');
                    setRemoteStream(receivedStream);
                };

                setWebrtcStream(stream);

                // 정리 함수
                return () => {
                    webrtcService.removeEventListener(eventListener);
                    if (stream?.id) {
                        webrtcService.stopStream(stream.id);
                    }
                    // 시그널링 연결도 정리
                    signalingService.disconnect();
                };
            } catch (error) {
                logger.error('[ViewerLiveStream] WebRTC 초기화 실패:', error as Error);
                setConnectionStatus('failed');
            }
        };

        initializeWebRTC();
    }, [cameraId, cameraName]);

    // 컨트롤 자동 숨김
    useEffect(() => {
        if (!showControls) return;

        // 4초 후 컨트롤 부드럽게 숨기기
        const timer = setTimeout(() => {
            // 상태를 먼저 업데이트
            setShowControls(false);

            // 그 다음 애니메이션 실행
            Animated.timing(controlsOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }, 4000);

        return () => clearTimeout(timer);
    }, [showControls, controlsOpacity]);

    // 연결 상태 업데이트
    useEffect(() => {
        if (connectionStatus === 'connected') {
            // 연결된 상태에서 신호 강도 시뮬레이션
            const interval = setInterval(() => {
                setConnectionStrength(prev => {
                    const variation = Math.random() * 10 - 5; // -5 ~ +5
                    return Math.max(70, Math.min(100, prev + variation));
                });
            }, 2000);

            return () => clearInterval(interval);
        }
    }, [connectionStatus]);

    // Event Handlers
    const handleDisconnect = useCallback(() => {
        Alert.alert(
            '연결 종료',
            '홈캠 연결을 종료하시겠습니까?',
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '종료',
                    style: 'destructive',
                    onPress: () => {
                        logger.info('[ViewerLiveStream] User disconnected');

                        // WebRTC 연결 정리
                        if (webrtcStream?.id) {
                            webrtcService.stopStream(webrtcStream.id);
                        }

                        navigation.goBack();
                    }
                }
            ]
        );
    }, [navigation, webrtcStream]);

    const handleToggleControls = useCallback(() => {
        const newShowControls = !showControls;
        setShowControls(newShowControls);

        Animated.timing(controlsOpacity, {
            toValue: newShowControls ? 1 : 0,
            duration: 300,
            useNativeDriver: true,
        }).start();

        if (Platform.OS === 'ios' && Haptics) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [showControls, controlsOpacity]);

    const handleScreenTap = useCallback(() => {
        handleToggleControls();
    }, [handleToggleControls]);

    const handleQualityChange = useCallback(() => {
        const qualities = ['720p', '1080p', '4K'];
        const currentIndex = qualities.indexOf(streamQuality);
        const nextIndex = (currentIndex + 1) % qualities.length;
        const newQuality = qualities[nextIndex];

        // 버튼 애니메이션
        Animated.sequence([
            Animated.timing(qualityButtonScale, {
                toValue: 0.9,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(qualityButtonScale, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start();

        setStreamQuality(newQuality);

        if (Platform.OS === 'ios' && Haptics) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        logger.info('[ViewerLiveStream] Quality changed:', { quality: newQuality });
    }, [streamQuality, qualityButtonScale]);

    const handleRecording = useCallback(() => {
        setIsRecording(prev => !prev);

        if (Platform.OS === 'ios' && Haptics) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }

        logger.info('[ViewerLiveStream] Recording toggled:', { isRecording: !isRecording });
    }, [isRecording]);

    const handleFullscreen = useCallback(() => {
        setIsFullscreen(prev => !prev);

        if (Platform.OS === 'ios' && Haptics) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    }, []);

    // 연결 강도에 따른 색상 결정
    const getConnectionColor = () => {
        if (connectionStrength >= 80) return SCREEN_COLORS.success;
        if (connectionStrength >= 60) return SCREEN_COLORS.warning;
        return SCREEN_COLORS.error;
    };

    return (
        <View style={styles.container}>
            <StatusBar
                barStyle="light-content"
                backgroundColor={SCREEN_COLORS.background}
                hidden={isFullscreen}
            />

            {/* 비디오 영역 */}
            <TouchableOpacity
                style={styles.videoContainer}
                onPress={handleScreenTap}
                activeOpacity={1}
            >
                {/* WebRTC 비디오 플레이어 또는 Fallback */}
                {remoteStream ? (
                    Platform.OS === 'ios' ? (
                        // iOS 네이티브에서 RTCView의 prop 명세가 빌드 환경에 따라 달라질 수 있어 any 캐스팅으로 호환 처리
                        (React.createElement as any)(RTCView, {
                            style: styles.videoPlayer,
                            objectFit: 'cover',
                            ...(typeof remoteStream?.toURL === 'function' ? { streamURL: remoteStream.toURL() } : {})
                        })
                    ) : (
                        <WebRTCVideoPlayer
                            stream={remoteStream}
                            style={styles.videoPlayer}
                            objectFit="cover"
                            onError={(error) => {
                                logger.error('[ViewerLiveStream] 비디오 플레이어 오류:', new Error(error));
                                setConnectionStatus('failed');
                            }}
                        />
                    )
                ) : (
                    <View style={styles.fallbackVideo}>
                        <LinearGradient
                            colors={['rgba(96, 122, 120, 0.1)', 'rgba(245, 197, 114, 0.05)']}
                            style={styles.videoGradient}
                        >
                            {connectionStatus === 'connecting' && (
                                <>
                                    <Ionicons name="videocam" size={80} color={SCREEN_COLORS.text} />
                                    <Text style={styles.fallbackVideoText}>연결 중...</Text>
                                    <Text style={styles.fallbackVideoSubtext}>{cameraName}</Text>
                                </>
                            )}

                            {connectionStatus === 'failed' && (
                                <>
                                    <Ionicons name="warning" size={80} color={SCREEN_COLORS.error} />
                                    <Text style={styles.fallbackVideoText}>연결 실패</Text>
                                    <Text style={styles.fallbackVideoSubtext}>네트워크를 확인해주세요</Text>
                                </>
                            )}

                            {connectionStatus === 'disconnected' && (
                                <>
                                    <Ionicons name="wifi" size={80} color={SCREEN_COLORS.warning} />
                                    <Text style={styles.fallbackVideoText}>연결 끊어짐</Text>
                                    <Text style={styles.fallbackVideoSubtext}>재연결 시도 중...</Text>
                                </>
                            )}

                            {/* 품질 및 상태 정보 */}
                            <View style={styles.videoInfo}>
                                <View style={[styles.qualityBadge, { backgroundColor: SCREEN_COLORS.primary }]}>
                                    <Text style={styles.qualityText}>{streamQuality}</Text>
                                </View>
                                {connectionStatus === 'connected' && (
                                    <View style={[styles.liveIndicator, { backgroundColor: SCREEN_COLORS.success }]}>
                                        <View style={styles.liveDot} />
                                        <Text style={styles.liveText}>LIVE</Text>
                                    </View>
                                )}
                            </View>
                        </LinearGradient>
                    </View>
                )}

                {/* 상단 상태 바 */}
                <Animated.View
                    style={[
                        styles.topStatusBar,
                        { opacity: showControls ? controlsOpacity : 0 }
                    ]}
                >
                    <View style={styles.statusContent}>
                        <View style={styles.connectionInfo}>
                            <View style={[styles.statusDot, { backgroundColor: getConnectionColor() }]} />
                            <Text style={styles.statusText}>
                                {connectionStatus === 'connected' ? '연결됨' :
                                    connectionStatus === 'connecting' ? '연결 중' :
                                        connectionStatus === 'failed' ? '연결 실패' : '연결 끊어짐'}
                            </Text>
                            <Text style={styles.signalText}>
                                {connectionStrength > 0 ? `${Math.round(connectionStrength)}%` : '-'}
                            </Text>
                        </View>

                        {isAdmin && (
                            <View style={styles.adminBadge}>
                                <Text style={styles.adminBadgeText}>관리자</Text>
                            </View>
                        )}
                    </View>
                </Animated.View>

                {/* 녹화 상태 표시 */}
                {isRecording && (
                    <View style={styles.recordingIndicator}>
                        <View style={styles.recordingDot} />
                        <Text style={styles.recordingText}>REC</Text>
                    </View>
                )}
            </TouchableOpacity>

            {/* 컨트롤 오버레이 */}
            {showControls && (
                <>
                    {/* 상단 컨트롤 */}
                    <Animated.View
                        style={[
                            styles.topControls,
                            { opacity: controlsOpacity }
                        ]}
                    >
                        <SafeAreaView>
                            <View style={styles.topControlsContent}>
                                <TouchableOpacity
                                    style={styles.controlButton}
                                    onPress={handleDisconnect}
                                    accessibilityLabel="연결 종료"
                                    accessibilityHint="홈캠 연결을 종료합니다"
                                >
                                    <Ionicons name="close" size={24} color={SCREEN_COLORS.text} />
                                </TouchableOpacity>

                                <View style={styles.titleContainer}>
                                    <Text style={styles.streamTitle}>{cameraName}</Text>
                                    <Text style={styles.streamSubtitle}>
                                        {isAdmin ? '관리자 모드' : '라이브 스트림'}
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={styles.controlButton}
                                    onPress={handleFullscreen}
                                    accessibilityLabel="전체화면 토글"
                                    accessibilityHint="전체화면 모드를 토글합니다"
                                >
                                    <Ionicons
                                        name={isFullscreen ? "contract" : "expand"}
                                        size={24}
                                        color={SCREEN_COLORS.text}
                                    />
                                </TouchableOpacity>
                            </View>
                        </SafeAreaView>
                    </Animated.View>

                    {/* 하단 컨트롤 */}
                    <Animated.View
                        style={[
                            styles.bottomControls,
                            { opacity: controlsOpacity }
                        ]}
                    >
                        <SafeAreaView>
                            <View style={styles.bottomControlsContent}>
                                {/* 품질 버튼 */}
                                <Animated.View style={{ transform: [{ scale: qualityButtonScale }] }}>
                                    <TouchableOpacity
                                        style={styles.qualityButton}
                                        onPress={handleQualityChange}
                                        accessibilityLabel={`현재 품질: ${streamQuality}`}
                                        accessibilityHint="스트림 품질을 변경합니다"
                                    >
                                        <Ionicons name="settings" size={16} color={SCREEN_COLORS.text} />
                                        <Text style={styles.qualityButtonText}>{streamQuality}</Text>
                                    </TouchableOpacity>
                                </Animated.View>

                                {/* 녹화 버튼 */}
                                <TouchableOpacity
                                    style={[
                                        styles.recordButton,
                                        { backgroundColor: isRecording ? SCREEN_COLORS.error : SCREEN_COLORS.glass }
                                    ]}
                                    onPress={handleRecording}
                                    accessibilityLabel={isRecording ? "녹화 중지" : "녹화 시작"}
                                    accessibilityHint="화면 녹화를 시작하거나 중지합니다"
                                >
                                    <Ionicons
                                        name={isRecording ? "stop" : "radio-button-on"}
                                        size={20}
                                        color={SCREEN_COLORS.text}
                                    />
                                    <Text style={styles.recordButtonText}>
                                        {isRecording ? '중지' : '녹화'}
                                    </Text>
                                </TouchableOpacity>

                                {/* 설정 버튼 (관리자만) */}
                                {isAdmin && (
                                    <TouchableOpacity
                                        style={styles.settingsButton}
                                        onPress={() => navigation.navigate('Settings')}
                                        accessibilityLabel="카메라 설정"
                                        accessibilityHint="카메라 설정 화면으로 이동합니다"
                                    >
                                        <Ionicons name="settings" size={20} color={SCREEN_COLORS.text} />
                                        <Text style={styles.settingsButtonText}>설정</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </SafeAreaView>
                    </Animated.View>
                </>
            )}
        </View>
    );
});

ViewerLiveStreamScreen.displayName = 'ViewerLiveStreamScreen';

export default ViewerLiveStreamScreen;

// 향상된 스타일 (MIMO 디자인 시스템)
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: SCREEN_COLORS.background,
    },

    // 비디오 영역
    videoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    videoPlayer: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    fallbackVideo: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
    },
    videoGradient: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    fallbackVideoText: {
        fontSize: 24,
        fontWeight: '700',
        color: SCREEN_COLORS.text,
        marginTop: 24,
        textAlign: 'center',
    },
    fallbackVideoSubtext: {
        fontSize: 18,
        color: SCREEN_COLORS.textSecondary,
        marginTop: 16,
        textAlign: 'center',
        fontWeight: '500',
    },
    videoInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        gap: 16,
    },
    qualityBadge: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        ...getElevation(1),
    },
    qualityText: {
        fontSize: 14,
        color: SCREEN_COLORS.surface,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        gap: 8,
        ...getElevation(1),
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: SCREEN_COLORS.surface,
    },
    liveText: {
        fontSize: 12,
        color: SCREEN_COLORS.surface,
        fontWeight: '700',
        letterSpacing: 1,
    },

    // 상단 상태 바
    topStatusBar: {
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        zIndex: 5,
    },
    statusContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: SCREEN_COLORS.overlay,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        ...getElevation(1),
    },
    connectionInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
    },
    statusText: {
        fontSize: 14,
        color: SCREEN_COLORS.text,
        fontWeight: '600',
    },
    signalText: {
        fontSize: 12,
        color: SCREEN_COLORS.textSecondary,
        fontWeight: '500',
        marginLeft: 8,
    },
    adminBadge: {
        backgroundColor: SCREEN_COLORS.warning,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        shadowColor: SCREEN_COLORS.warning,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
    },
    adminBadgeText: {
        fontSize: 11,
        color: SCREEN_COLORS.background,
        fontWeight: '700',
        letterSpacing: 0.5,
    },

    // 녹화 표시기
    recordingIndicator: {
        position: 'absolute',
        top: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SCREEN_COLORS.error,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        gap: 8,
        shadowColor: SCREEN_COLORS.error,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
    },
    recordingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: SCREEN_COLORS.surface,
    },
    recordingText: {
        fontSize: 12,
        color: SCREEN_COLORS.surface,
        fontWeight: '700',
        letterSpacing: 1,
    },

    // 상단 컨트롤
    topControls: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    topControlsContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: SCREEN_COLORS.overlay,
        ...getElevation(1),
    },
    controlButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: SCREEN_COLORS.glass,
        alignItems: 'center',
        justifyContent: 'center',
        ...getElevation(1),
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 20,
    },
    streamTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: SCREEN_COLORS.text,
        textAlign: 'center',
    },
    streamSubtitle: {
        fontSize: 14,
        color: SCREEN_COLORS.textSecondary,
        textAlign: 'center',
        marginTop: 8,
        fontWeight: '500',
    },

    // 하단 컨트롤
    bottomControls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    bottomControlsContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
        backgroundColor: SCREEN_COLORS.overlay,
        gap: 20,
        ...getElevation(1),
    },
    qualityButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SCREEN_COLORS.glass,
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
        ...getElevation(1),
    },
    qualityButtonText: {
        fontSize: 14,
        color: SCREEN_COLORS.text,
        fontWeight: '700',
    },
    recordButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
        ...getElevation(1),
    },
    recordButtonText: {
        fontSize: 14,
        color: SCREEN_COLORS.text,
        fontWeight: '600',
    },
    settingsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SCREEN_COLORS.glass,
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
        ...getElevation(1),
    },
    settingsButtonText: {
        fontSize: 14,
        color: SCREEN_COLORS.text,
        fontWeight: '600',
    },
});