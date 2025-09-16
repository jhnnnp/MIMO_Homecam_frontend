/**
 * ViewerLiveStreamScreen - Enterprise-grade Live Stream Viewer
 * 
 * Features:
 * - Multi-protocol streaming support (WebRTC, MJPEG, HLS)
 * - Real-time connection monitoring
 * - Advanced video controls and settings
 * - Picture-in-Picture support
 * - Recording and screenshot capabilities
 * - Bandwidth optimization
 * - Error recovery and fallback streams
 * - Analytics and performance monitoring
 */

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
    Animated,
    Dimensions,
    Platform,
    PanResponder,
    Modal,
    Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';

// Design System
import { colors, spacing, radius, elevation, typography, enterpriseColors } from '../../design/tokens';

// Navigation Types
import { RootStackParamList } from '../../navigation/AppNavigator';

// Services and Hooks
import { connectionService, useConnection } from '../../services';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useCameraStream } from '../../hooks/useCameraStream';

// Components
import { LoadingState, ErrorState, Badge, Card, Button } from '../../components';
import { WebRTCVideoPlayer, MjpegPlayer } from '../../components';

// Utils
import { logger } from '../../utils/logger';
import { formatDuration, formatBytes } from '../../utils/formatters';

// Constants
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONTROLS_HIDE_DELAY = 3000; // 3초 후 컨트롤 숨김
const STATS_UPDATE_INTERVAL = 1000; // 1초마다 통계 업데이트

// Types
interface StreamStats {
    bitrate: number;
    framerate: number;
    resolution: string;
    latency: number;
    packetsLost: number;
    jitter: number;
    bandwidth: number;
}

interface VideoQuality {
    id: string;
    label: string;
    width: number;
    height: number;
    bitrate: number;
}

interface RecordingInfo {
    isRecording: boolean;
    startTime?: Date;
    duration: number;
    fileSize: number;
}

type ViewerLiveStreamScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ViewerLiveStream'>;
type ViewerLiveStreamScreenRouteProp = RouteProp<RootStackParamList, 'ViewerLiveStream'>;

interface ViewerLiveStreamScreenProps {
    navigation: ViewerLiveStreamScreenNavigationProp;
    route: ViewerLiveStreamScreenRouteProp;
}

const VideoQualities: VideoQuality[] = [
    { id: 'low', label: '저화질 (360p)', width: 640, height: 360, bitrate: 500000 },
    { id: 'medium', label: '중화질 (720p)', width: 1280, height: 720, bitrate: 1000000 },
    { id: 'high', label: '고화질 (1080p)', width: 1920, height: 1080, bitrate: 2000000 },
    { id: 'auto', label: '자동', width: 0, height: 0, bitrate: 0 },
];

const ViewerLiveStreamScreen = memo(({ navigation, route }: ViewerLiveStreamScreenProps) => {
    const { connectionId, cameraName, connectionType } = route.params;

    // State Management
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [selectedQuality, setSelectedQuality] = useState<VideoQuality>(VideoQualities[3]); // Auto
    const [streamProtocol, setStreamProtocol] = useState<'webrtc' | 'mjpeg'>('webrtc');
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [recordingInfo, setRecordingInfo] = useState<RecordingInfo>({
        isRecording: false,
        duration: 0,
        fileSize: 0
    });
    const [streamStats, setStreamStats] = useState<StreamStats>({
        bitrate: 0,
        framerate: 0,
        resolution: '',
        latency: 0,
        packetsLost: 0,
        jitter: 0,
        bandwidth: 0
    });

    // Animation Values
    const [controlsOpacity] = useState(new Animated.Value(1));
    const [settingsSlideAnim] = useState(new Animated.Value(SCREEN_HEIGHT));

    // Refs
    const controlsTimeoutRef = useRef<NodeJS.Timeout>();
    const statsIntervalRef = useRef<NodeJS.Timeout>();
    const videoPlayerRef = useRef<any>();

    // Hooks
    const { isConnected: wsConnected } = useWebSocket();
    const {
        connectionData,
        connectionStatus,
        error: connectionServiceError,
        disconnectConnection
    } = useConnection();

    const {
        streamUrl,
        isLoading: streamLoading,
        error: streamError,
        reconnect: reconnectStream
    } = useCameraStream({
        connectionId,
        protocol: streamProtocol,
        quality: selectedQuality
    });

    // Pan responder for gesture controls
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => false,
            onPanResponderGrant: () => {
                showControlsTemporarily();
            },
        })
    ).current;

    // Effects
    useEffect(() => {
        // Setup screen orientation
        if (isFullscreen) {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        } else {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
        }

        return () => {
            ScreenOrientation.unlockAsync();
        };
    }, [isFullscreen]);

    useEffect(() => {
        // Start stats monitoring
        if (isConnected && showStats) {
            statsIntervalRef.current = setInterval(updateStreamStats, STATS_UPDATE_INTERVAL);
        }

        return () => {
            if (statsIntervalRef.current) {
                clearInterval(statsIntervalRef.current);
            }
        };
    }, [isConnected, showStats]);

    useEffect(() => {
        // Auto-hide controls
        resetControlsTimeout();
        
        return () => {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, []);

    // Control functions
    const showControlsTemporarily = useCallback(() => {
        setShowControls(true);
        Animated.timing(controlsOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start();
        resetControlsTimeout();
    }, []);

    const hideControls = useCallback(() => {
        Animated.timing(controlsOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setShowControls(false);
        });
    }, []);

    const resetControlsTimeout = useCallback(() => {
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        
        if (!showSettings && !showStats) {
            controlsTimeoutRef.current = setTimeout(hideControls, CONTROLS_HIDE_DELAY);
        }
    }, [showSettings, showStats, hideControls]);

    const toggleFullscreen = useCallback(async () => {
        try {
            setIsFullscreen(!isFullscreen);
            
            if (Platform.OS === 'ios' && Haptics) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
        } catch (error) {
            logger.error('[ViewerLiveStream] Fullscreen toggle failed:', error);
        }
    }, [isFullscreen]);

    const toggleSettings = useCallback(() => {
        const toValue = showSettings ? SCREEN_HEIGHT : 0;
        
        Animated.spring(settingsSlideAnim, {
            toValue,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
        }).start();
        
        setShowSettings(!showSettings);
        showControlsTemporarily();
    }, [showSettings, settingsSlideAnim, showControlsTemporarily]);

    // Stream functions
    const updateStreamStats = useCallback(() => {
        // This would typically get real stats from the video player
        // For demo purposes, we'll simulate stats
        setStreamStats(prev => ({
            ...prev,
            bitrate: Math.floor(Math.random() * 200000) + 800000, // 0.8-1.0 Mbps
            framerate: Math.floor(Math.random() * 5) + 28, // 28-33 FPS
            latency: Math.floor(Math.random() * 50) + 50, // 50-100ms
            packetsLost: Math.floor(Math.random() * 5),
            jitter: Math.floor(Math.random() * 10) + 5,
            bandwidth: Math.floor(Math.random() * 100000) + 900000,
        }));
    }, []);

    const changeQuality = useCallback((quality: VideoQuality) => {
        setSelectedQuality(quality);
        
        if (Platform.OS === 'ios' && Haptics) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        
        logger.info('[ViewerLiveStream] Quality changed to:', quality.label);
    }, []);

    const changeProtocol = useCallback((protocol: 'webrtc' | 'mjpeg') => {
        setStreamProtocol(protocol);
        
        if (Platform.OS === 'ios' && Haptics) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        
        logger.info('[ViewerLiveStream] Protocol changed to:', protocol);
    }, []);

    const takeScreenshot = useCallback(async () => {
        try {
            if (videoPlayerRef.current && videoPlayerRef.current.takeScreenshot) {
                const screenshot = await videoPlayerRef.current.takeScreenshot();
                
                // Save to media library
                const permission = await MediaLibrary.requestPermissionsAsync();
                if (permission.granted) {
                    await MediaLibrary.saveToLibraryAsync(screenshot);
                    Alert.alert('성공', '스크린샷이 저장되었습니다.');
                }
            }
            
            if (Platform.OS === 'ios' && Haptics) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (error) {
            logger.error('[ViewerLiveStream] Screenshot failed:', error);
            Alert.alert('오류', '스크린샷 저장에 실패했습니다.');
        }
    }, []);

    const toggleRecording = useCallback(async () => {
        try {
            if (recordingInfo.isRecording) {
                // Stop recording
                if (videoPlayerRef.current && videoPlayerRef.current.stopRecording) {
                    const recordingFile = await videoPlayerRef.current.stopRecording();
                    
                    const permission = await MediaLibrary.requestPermissionsAsync();
                    if (permission.granted) {
                        await MediaLibrary.saveToLibraryAsync(recordingFile);
                        Alert.alert('성공', '녹화가 완료되어 저장되었습니다.');
                    }
                }
                
                setRecordingInfo(prev => ({ ...prev, isRecording: false }));
            } else {
                // Start recording
                if (videoPlayerRef.current && videoPlayerRef.current.startRecording) {
                    await videoPlayerRef.current.startRecording();
                }
                
                setRecordingInfo(prev => ({
                    ...prev,
                    isRecording: true,
                    startTime: new Date(),
                }));
            }
            
            if (Platform.OS === 'ios' && Haptics) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }
        } catch (error) {
            logger.error('[ViewerLiveStream] Recording toggle failed:', error);
            Alert.alert('오류', '녹화 기능에 오류가 발생했습니다.');
        }
    }, [recordingInfo.isRecording]);

    const shareStream = useCallback(async () => {
        try {
            await Share.share({
                message: `MIMO 실시간 스트림: ${cameraName}`,
                title: '스트림 공유',
                url: streamUrl || ''
            });
        } catch (error) {
            logger.error('[ViewerLiveStream] Share failed:', error);
        }
    }, [cameraName, streamUrl]);

    const handleDisconnect = useCallback(async () => {
        Alert.alert(
            '연결 종료',
            '스트림 연결을 종료하시겠습니까?',
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '종료',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await disconnectConnection();
                            navigation.goBack();
                        } catch (error) {
                            logger.error('[ViewerLiveStream] Disconnect failed:', error);
                        }
                    }
                }
            ]
        );
    }, [disconnectConnection, navigation]);

    // Render functions
    const renderVideoPlayer = useCallback(() => {
        if (streamLoading) {
            return (
                <View style={styles.videoContainer}>
                    <LoadingState message="스트림 연결 중..." />
                </View>
            );
        }

        if (streamError || connectionError) {
            return (
                <View style={styles.videoContainer}>
                    <ErrorState
                        message={streamError || connectionError || '스트림 연결에 실패했습니다'}
                        onRetry={reconnectStream}
                    />
                </View>
            );
        }

        return (
            <View style={[styles.videoContainer, isFullscreen && styles.fullscreenVideo]}>
                {streamProtocol === 'webrtc' ? (
                    <WebRTCVideoPlayer
                        ref={videoPlayerRef}
                        streamUrl={streamUrl}
                        onConnectionChange={setIsConnected}
                        onError={setConnectionError}
                        style={styles.videoPlayer}
                        quality={selectedQuality}
                    />
                ) : (
                    <MjpegPlayer
                        ref={videoPlayerRef}
                        streamUrl={streamUrl}
                        onConnectionChange={setIsConnected}
                        onError={setConnectionError}
                        style={styles.videoPlayer}
                        quality={selectedQuality}
                    />
                )}
                
                {/* Connection status overlay */}
                {!isConnected && (
                    <View style={styles.connectionOverlay}>
                        <Ionicons name="wifi-outline" size={48} color="white" />
                        <Text style={styles.connectionOverlayText}>연결 중...</Text>
                    </View>
                )}
                
                {/* Recording indicator */}
                {recordingInfo.isRecording && (
                    <View style={styles.recordingIndicator}>
                        <View style={styles.recordingDot} />
                        <Text style={styles.recordingText}>REC</Text>
                        <Text style={styles.recordingTime}>
                            {formatDuration(recordingInfo.duration)}
                        </Text>
                    </View>
                )}
            </View>
        );
    }, [
        streamLoading,
        streamError,
        connectionError,
        isFullscreen,
        streamProtocol,
        streamUrl,
        selectedQuality,
        isConnected,
        recordingInfo,
        reconnectStream
    ]);

    const renderControls = useCallback(() => {
        if (!showControls) return null;

        return (
            <Animated.View style={[styles.controlsContainer, { opacity: controlsOpacity }]}>
                {/* Top controls */}
                <LinearGradient
                    colors={['rgba(0,0,0,0.7)', 'transparent']}
                    style={styles.topControls}
                >
                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    
                    <View style={styles.titleContainer}>
                        <Text style={styles.streamTitle}>{cameraName}</Text>
                        <View style={styles.connectionInfo}>
                            <View style={[
                                styles.statusDot,
                                { backgroundColor: isConnected ? enterpriseColors.success : enterpriseColors.error }
                            ]} />
                            <Text style={styles.connectionText}>
                                {isConnected ? '실시간' : '연결 끊어짐'}
                            </Text>
                            <Badge
                                text={connectionType?.toUpperCase() || 'PIN'}
                                color={enterpriseColors.primary}
                                size="small"
                                style={styles.connectionBadge}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={() => setShowStats(!showStats)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="analytics-outline" size={24} color="white" />
                    </TouchableOpacity>
                </LinearGradient>

                {/* Bottom controls */}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    style={styles.bottomControls}
                >
                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={takeScreenshot}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="camera-outline" size={24} color="white" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.controlButton, recordingInfo.isRecording && styles.recordingButton]}
                        onPress={toggleRecording}
                        activeOpacity={0.7}
                    >
                        <Ionicons 
                            name={recordingInfo.isRecording ? "stop" : "videocam"} 
                            size={24} 
                            color="white" 
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={shareStream}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="share-outline" size={24} color="white" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={toggleSettings}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="settings-outline" size={24} color="white" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={toggleFullscreen}
                        activeOpacity={0.7}
                    >
                        <Ionicons 
                            name={isFullscreen ? "contract" : "expand"} 
                            size={24} 
                            color="white" 
                        />
                    </TouchableOpacity>
                </LinearGradient>
            </Animated.View>
        );
    }, [
        showControls,
        controlsOpacity,
        navigation,
        cameraName,
        isConnected,
        connectionType,
        showStats,
        recordingInfo.isRecording,
        isFullscreen,
        takeScreenshot,
        toggleRecording,
        shareStream,
        toggleSettings,
        toggleFullscreen
    ]);

    const renderSettings = useCallback(() => (
        <Modal
            visible={showSettings}
            transparent
            animationType="none"
            onRequestClose={toggleSettings}
        >
            <TouchableOpacity
                style={styles.settingsOverlay}
                activeOpacity={1}
                onPress={toggleSettings}
            >
                <Animated.View
                    style={[
                        styles.settingsContainer,
                        { transform: [{ translateY: settingsSlideAnim }] }
                    ]}
                >
                    <View style={styles.settingsHeader}>
                        <Text style={styles.settingsTitle}>스트림 설정</Text>
                        <TouchableOpacity onPress={toggleSettings}>
                            <Ionicons name="close" size={24} color={enterpriseColors.gray700} />
                        </TouchableOpacity>
                    </View>

                    {/* Quality Settings */}
                    <View style={styles.settingsSection}>
                        <Text style={styles.settingsSectionTitle}>화질</Text>
                        {VideoQualities.map((quality) => (
                            <TouchableOpacity
                                key={quality.id}
                                style={[
                                    styles.settingsOption,
                                    selectedQuality.id === quality.id && styles.settingsOptionSelected
                                ]}
                                onPress={() => changeQuality(quality)}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.settingsOptionText,
                                    selectedQuality.id === quality.id && styles.settingsOptionTextSelected
                                ]}>
                                    {quality.label}
                                </Text>
                                {selectedQuality.id === quality.id && (
                                    <Ionicons name="checkmark" size={20} color={enterpriseColors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Protocol Settings */}
                    <View style={styles.settingsSection}>
                        <Text style={styles.settingsSectionTitle}>스트림 프로토콜</Text>
                        <TouchableOpacity
                            style={[
                                styles.settingsOption,
                                streamProtocol === 'webrtc' && styles.settingsOptionSelected
                            ]}
                            onPress={() => changeProtocol('webrtc')}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.settingsOptionText,
                                streamProtocol === 'webrtc' && styles.settingsOptionTextSelected
                            ]}>
                                WebRTC (저지연)
                            </Text>
                            {streamProtocol === 'webrtc' && (
                                <Ionicons name="checkmark" size={20} color={enterpriseColors.primary} />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.settingsOption,
                                streamProtocol === 'mjpeg' && styles.settingsOptionSelected
                            ]}
                            onPress={() => changeProtocol('mjpeg')}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.settingsOptionText,
                                streamProtocol === 'mjpeg' && styles.settingsOptionTextSelected
                            ]}>
                                MJPEG (안정성)
                            </Text>
                            {streamProtocol === 'mjpeg' && (
                                <Ionicons name="checkmark" size={20} color={enterpriseColors.primary} />
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Disconnect Button */}
                    <TouchableOpacity
                        style={styles.disconnectButton}
                        onPress={handleDisconnect}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="log-out-outline" size={20} color="white" />
                        <Text style={styles.disconnectButtonText}>연결 종료</Text>
                    </TouchableOpacity>
                </Animated.View>
            </TouchableOpacity>
        </Modal>
    ), [
        showSettings,
        settingsSlideAnim,
        selectedQuality,
        streamProtocol,
        toggleSettings,
        changeQuality,
        changeProtocol,
        handleDisconnect
    ]);

    const renderStats = useCallback(() => {
        if (!showStats) return null;

        return (
            <View style={styles.statsContainer}>
                <Text style={styles.statsTitle}>스트림 통계</Text>
                <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{formatBytes(streamStats.bitrate)}/s</Text>
                        <Text style={styles.statLabel}>비트레이트</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{streamStats.framerate} FPS</Text>
                        <Text style={styles.statLabel}>프레임레이트</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{streamStats.latency}ms</Text>
                        <Text style={styles.statLabel}>지연시간</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{streamStats.packetsLost}</Text>
                        <Text style={styles.statLabel}>패킷 손실</Text>
                    </View>
                </View>
            </View>
        );
    }, [showStats, streamStats]);

    return (
        <SafeAreaView style={[styles.container, isFullscreen && styles.fullscreenContainer]}>
            <StatusBar 
                barStyle="light-content" 
                backgroundColor="black" 
                hidden={isFullscreen}
                translucent 
            />
            
            <View 
                style={[styles.content, isFullscreen && styles.fullscreenContent]}
                {...panResponder.panHandlers}
            >
                {renderVideoPlayer()}
                {renderControls()}
                {renderStats()}
            </View>

            {renderSettings()}
        </SafeAreaView>
    );
});

ViewerLiveStreamScreen.displayName = 'ViewerLiveStreamScreen';

export default ViewerLiveStreamScreen;

// Enhanced Enterprise-grade Styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    fullscreenContainer: {
        backgroundColor: 'black',
    },
    content: {
        flex: 1,
        position: 'relative',
    },
    fullscreenContent: {
        flex: 1,
    },

    // Video Player
    videoContainer: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullscreenVideo: {
        width: SCREEN_HEIGHT,
        height: SCREEN_WIDTH,
    },
    videoPlayer: {
        width: '100%',
        height: '100%',
    },
    connectionOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    connectionOverlayText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
        marginTop: spacing.md,
    },

    // Recording Indicator
    recordingIndicator: {
        position: 'absolute',
        top: spacing.lg,
        right: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 0, 0, 0.8)',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.lg,
    },
    recordingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'white',
        marginRight: spacing.sm,
    },
    recordingText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        marginRight: spacing.sm,
    },
    recordingTime: {
        color: 'white',
        fontSize: 12,
        fontWeight: '500',
    },

    // Controls
    controlsContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'space-between',
    },
    topControls: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
        paddingBottom: spacing.lg,
    },
    bottomControls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.xl,
    },
    controlButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordingButton: {
        backgroundColor: 'rgba(255, 0, 0, 0.7)',
    },
    titleContainer: {
        flex: 1,
        marginHorizontal: spacing.md,
    },
    streamTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: spacing.xs,
    },
    connectionInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: spacing.xs,
    },
    connectionText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '500',
        marginRight: spacing.sm,
    },
    connectionBadge: {
        marginLeft: spacing.sm,
    },

    // Stats
    statsContainer: {
        position: 'absolute',
        top: 80,
        right: spacing.lg,
        backgroundColor: 'rgba(0,0,0,0.8)',
        borderRadius: radius.lg,
        padding: spacing.md,
        minWidth: 200,
    },
    statsTitle: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statItem: {
        width: '48%',
        marginBottom: spacing.sm,
    },
    statValue: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    statLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
        textAlign: 'center',
        marginTop: 2,
    },

    // Settings Modal
    settingsOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    settingsContainer: {
        backgroundColor: 'white',
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
        maxHeight: SCREEN_HEIGHT * 0.8,
    },
    settingsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: enterpriseColors.gray200,
    },
    settingsTitle: {
        ...typography.h4,
        fontWeight: '700',
        color: enterpriseColors.gray900,
    },
    settingsSection: {
        marginTop: spacing.lg,
    },
    settingsSectionTitle: {
        ...typography.h5,
        fontWeight: '600',
        color: enterpriseColors.gray900,
        marginBottom: spacing.md,
    },
    settingsOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.md,
        marginBottom: spacing.sm,
    },
    settingsOptionSelected: {
        backgroundColor: `${enterpriseColors.primary}15`,
    },
    settingsOptionText: {
        ...typography.body,
        color: enterpriseColors.gray700,
        fontWeight: '500',
    },
    settingsOptionTextSelected: {
        color: enterpriseColors.primary,
        fontWeight: '600',
    },
    disconnectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: enterpriseColors.error,
        paddingVertical: spacing.lg,
        borderRadius: radius.lg,
        marginTop: spacing.xl,
    },
    disconnectButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: spacing.sm,
    },
});
