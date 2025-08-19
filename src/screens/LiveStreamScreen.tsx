import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Dimensions,
    StatusBar,
    Animated,
    PanGestureHandler,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, LoadingState, ErrorState, Badge } from '../components';
import { colors, typography, spacing, radius, elevation } from '../design/tokens';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface LiveStreamScreenProps {
    navigation: any;
    route: {
        params: {
            cameraId: number;
            cameraName: string;
        };
    };
}

export default function LiveStreamScreen({ navigation, route }: LiveStreamScreenProps) {
    const { cameraId, cameraName } = route.params;
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [quality, setQuality] = useState<'480p' | '720p' | '1080p'>('720p');
    const [isRecording, setIsRecording] = useState(false);
    const [connectionLatency, setConnectionLatency] = useState<number | null>(null);
    const [showControls, setShowControls] = useState(true);
    const [streamStats, setStreamStats] = useState({
        bitrate: '2.4 Mbps',
        fps: 30,
        buffering: false,
    });

    // Animation values
    const controlsOpacity = new Animated.Value(1);
    const recordingPulse = new Animated.Value(1);

    useEffect(() => {
        const connectStream = async () => {
            setIsLoading(true);
            setError(null);

            try {
                await new Promise(resolve => setTimeout(resolve, 2000));
                setIsConnected(true);
                setConnectionLatency(150);
                setStreamStats(prev => ({
                    ...prev,
                    bitrate: '2.4 Mbps',
                    fps: 30,
                }));
                setIsLoading(false);
            } catch (err) {
                setError('스트림 연결에 실패했습니다.');
                setIsLoading(false);
            }
        };

        connectStream();

        return () => {
            // Cleanup WebRTC connection
        };
    }, [cameraId]);

    useEffect(() => {
        if (showControls) {
            Animated.timing(controlsOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();

            const timer = setTimeout(() => {
                setShowControls(false);
            }, 5000);
            return () => clearTimeout(timer);
        } else {
            Animated.timing(controlsOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [showControls]);

    useEffect(() => {
        if (isRecording) {
            const pulse = () => {
                Animated.sequence([
                    Animated.timing(recordingPulse, {
                        toValue: 1.2,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(recordingPulse, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ]).start(pulse);
            };
            pulse();
        } else {
            recordingPulse.setValue(1);
        }
    }, [isRecording]);

    const handleRetryConnection = () => {
        setIsLoading(true);
        setError(null);
        setTimeout(() => {
            setIsConnected(true);
            setIsLoading(false);
        }, 2000);
    };

    const handleQualityChange = () => {
        const qualities: Array<'480p' | '720p' | '1080p'> = ['480p', '720p', '1080p'];
        const currentIndex = qualities.indexOf(quality);
        const nextQuality = qualities[(currentIndex + 1) % qualities.length];
        setQuality(nextQuality);

        // Simulate bitrate change
        const bitrates = { '480p': '1.2 Mbps', '720p': '2.4 Mbps', '1080p': '5.2 Mbps' };
        setStreamStats(prev => ({ ...prev, bitrate: bitrates[nextQuality] }));
    };

    const handleToggleRecording = () => {
        setIsRecording(!isRecording);
        Alert.alert(
            isRecording ? '녹화 중지' : '녹화 시작',
            isRecording ? '녹화가 중지되었습니다.' : '녹화를 시작합니다.',
            [{ text: '확인' }]
        );
    };

    const handleSnapshot = () => {
        Alert.alert('스냅샷', '현재 화면이 저장되었습니다.');
    };

    const handleToggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
        StatusBar.setHidden(!isFullscreen);
    };

    const handleVideoPress = () => {
        setShowControls(!showControls);
    };

    const getQualityColor = (currentQuality: string) => {
        switch (currentQuality) {
            case '480p': return colors.warning;
            case '720p': return colors.primary;
            case '1080p': return colors.success;
            default: return colors.textSecondary;
        }
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.text, colors.text]}
                    style={styles.gradientBackground}
                />
                <SafeAreaView style={styles.safeArea}>
                    <AppBar
                        title={cameraName}
                        showBackButton
                        onBackPress={() => navigation.goBack()}
                        variant="dark"
                    />
                    <LoadingState message="라이브 스트림 연결 중..." />
                </SafeAreaView>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.text, colors.text]}
                    style={styles.gradientBackground}
                />
                <SafeAreaView style={styles.safeArea}>
                    <AppBar
                        title={cameraName}
                        showBackButton
                        onBackPress={() => navigation.goBack()}
                        variant="dark"
                    />
                    <ErrorState
                        title="연결 실패"
                        message={error}
                        buttonText="다시 연결"
                        onRetry={handleRetryConnection}
                        icon="wifi-outline"
                    />
                </SafeAreaView>
            </View>
        );
    }

    return (
        <View style={[styles.container, isFullscreen && styles.fullscreenContainer]}>
            <LinearGradient
                colors={[colors.text, '#1a1a1a']}
                style={styles.gradientBackground}
            />

            {!isFullscreen && (
                <SafeAreaView style={styles.safeArea}>
                    <AppBar
                        title={cameraName}
                        showBackButton
                        onBackPress={() => navigation.goBack()}
                        variant="dark"
                    />
                </SafeAreaView>
            )}

            <TouchableOpacity
                style={[styles.videoContainer, isFullscreen && styles.fullscreenVideo]}
                activeOpacity={1}
                onPress={handleVideoPress}
            >
                <LinearGradient
                    colors={[colors.text + '90', colors.text]}
                    style={styles.videoStream}
                >
                    <View style={styles.videoContent}>
                        <View style={styles.streamIcon}>
                            <LinearGradient
                                colors={[colors.primary + '40', colors.primary]}
                                style={styles.iconGradient}
                            >
                                <Ionicons name="videocam" size={80} color={colors.surface} />
                            </LinearGradient>
                        </View>

                        <View style={styles.streamInfo}>
                            <Text style={styles.streamTitle}>{cameraName}</Text>
                            <Text style={styles.streamSubtitle}>라이브 스트림</Text>

                            <View style={styles.streamMetrics}>
                                <View style={styles.metricItem}>
                                    <View style={styles.statusDot} />
                                    <Text style={styles.metricText}>LIVE</Text>
                                </View>
                                <View style={styles.metricSeparator} />
                                <View style={styles.metricItem}>
                                    <Text style={styles.metricText}>{streamStats.bitrate}</Text>
                                </View>
                                <View style={styles.metricSeparator} />
                                <View style={styles.metricItem}>
                                    <Text style={styles.metricText}>{streamStats.fps} FPS</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </LinearGradient>

                <Animated.View style={[styles.controlsOverlay, { opacity: controlsOpacity }]}>
                    {/* Top Controls */}
                    <View style={styles.topControls}>
                        <View style={styles.topLeft}>
                            {isFullscreen && (
                                <TouchableOpacity
                                    style={styles.fullscreenBackButton}
                                    onPress={() => {
                                        setIsFullscreen(false);
                                        StatusBar.setHidden(false);
                                        navigation.goBack();
                                    }}
                                >
                                    <Ionicons name="arrow-back" size={24} color={colors.surface} />
                                </TouchableOpacity>
                            )}
                            <Badge
                                type="success"
                                variant="status"
                                label={quality}
                                style={[styles.qualityBadge, { backgroundColor: getQualityColor(quality) }]}
                            />
                        </View>

                        <View style={styles.topRight}>
                            {isRecording && (
                                <Animated.View style={[styles.recordingIndicator, { transform: [{ scale: recordingPulse }] }]}>
                                    <View style={styles.recordingDot} />
                                    <Text style={styles.recordingText}>REC</Text>
                                </Animated.View>
                            )}
                            {connectionLatency && (
                                <View style={styles.latencyIndicator}>
                                    <View style={styles.latencyDot} />
                                    <Text style={styles.latencyText}>{connectionLatency}ms</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Bottom Controls */}
                    <View style={styles.bottomControls}>
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.8)']}
                            style={styles.controlsGradient}
                        >
                            <View style={styles.controlsContainer}>
                                <TouchableOpacity
                                    style={styles.controlButton}
                                    onPress={handleQualityChange}
                                >
                                    <Ionicons name="settings-outline" size={24} color={colors.surface} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.controlButton,
                                        styles.recordButton,
                                        isRecording && styles.recordButtonActive
                                    ]}
                                    onPress={handleToggleRecording}
                                >
                                    <Ionicons
                                        name={isRecording ? 'stop' : 'radio-button-on'}
                                        size={24}
                                        color={colors.surface}
                                    />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.controlButton}
                                    onPress={handleSnapshot}
                                >
                                    <Ionicons name="camera-outline" size={24} color={colors.surface} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.controlButton}
                                    onPress={handleToggleFullscreen}
                                >
                                    <Ionicons
                                        name={isFullscreen ? 'contract-outline' : 'expand-outline'}
                                        size={24}
                                        color={colors.surface}
                                    />
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>
                    </View>
                </Animated.View>
            </TouchableOpacity>

            {!isFullscreen && (
                <View style={styles.infoPanel}>
                    <LinearGradient
                        colors={[colors.surface, colors.surfaceAlt]}
                        style={styles.infoPanelGradient}
                    >
                        <View style={styles.connectionStatus}>
                            <View style={styles.statusRow}>
                                <View style={styles.statusIndicator} />
                                <Text style={styles.statusText}>연결됨</Text>
                                <View style={styles.statusDetails}>
                                    <Text style={styles.statusDetail}>{quality}</Text>
                                    <Text style={styles.statusSeparator}>•</Text>
                                    <Text style={styles.statusDetail}>{connectionLatency}ms</Text>
                                    <Text style={styles.statusSeparator}>•</Text>
                                    <Text style={styles.statusDetail}>{streamStats.bitrate}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.quickActions}>
                            <TouchableOpacity style={styles.quickAction}>
                                <View style={styles.quickActionIcon}>
                                    <Ionicons name="download-outline" size={20} color={colors.primary} />
                                </View>
                                <Text style={styles.quickActionText}>다운로드</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.quickAction}>
                                <View style={styles.quickActionIcon}>
                                    <Ionicons name="share-outline" size={20} color={colors.primary} />
                                </View>
                                <Text style={styles.quickActionText}>공유</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.quickAction}>
                                <View style={styles.quickActionIcon}>
                                    <Ionicons name="settings-outline" size={20} color={colors.primary} />
                                </View>
                                <Text style={styles.quickActionText}>설정</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.quickAction}>
                                <View style={styles.quickActionIcon}>
                                    <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                                </View>
                                <Text style={styles.quickActionText}>정보</Text>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.text,
    },
    gradientBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    fullscreenContainer: {
        backgroundColor: colors.text,
    },
    safeArea: {
        zIndex: 10,
    },
    videoContainer: {
        flex: 1,
        position: 'relative',
    },
    fullscreenVideo: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
    },
    videoStream: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    streamIcon: {
        marginBottom: spacing.xl,
    },
    iconGradient: {
        width: 160,
        height: 160,
        borderRadius: 80,
        alignItems: 'center',
        justifyContent: 'center',
        ...elevation['3'],
    },
    streamInfo: {
        alignItems: 'center',
    },
    streamTitle: {
        ...typography.h1,
        color: colors.surface,
        fontWeight: '700',
        marginBottom: spacing.sm,
    },
    streamSubtitle: {
        ...typography.bodyLg,
        color: colors.primaryLight,
        marginBottom: spacing.lg,
    },
    streamMetrics: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radius.full,
    },
    metricItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    metricSeparator: {
        width: 1,
        height: 12,
        backgroundColor: colors.surface + '40',
        marginHorizontal: spacing.sm,
    },
    metricText: {
        ...typography.caption,
        color: colors.surface,
        fontWeight: '600',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.success,
    },

    // Controls Overlay
    controlsOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'space-between',
    },
    topControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: spacing.lg,
        paddingTop: spacing.xl,
    },
    topLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    fullscreenBackButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    qualityBadge: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    topRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    recordingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.error,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        gap: spacing.xs,
    },
    recordingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.surface,
    },
    recordingText: {
        ...typography.caption,
        color: colors.surface,
        fontWeight: '700',
    },
    latencyIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        gap: spacing.xs,
    },
    latencyDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.success,
    },
    latencyText: {
        ...typography.caption,
        color: colors.surface,
        fontWeight: '600',
    },
    bottomControls: {
        padding: spacing.lg,
    },
    controlsGradient: {
        borderRadius: radius.xl,
        overflow: 'hidden',
    },
    controlsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xl,
        gap: spacing.xl,
    },
    controlButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        ...elevation['2'],
    },
    recordButton: {
        backgroundColor: colors.error,
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    recordButtonActive: {
        backgroundColor: colors.error,
        ...elevation['3'],
    },

    // Info Panel
    infoPanel: {
        borderTopWidth: 1,
        borderTopColor: colors.divider,
    },
    infoPanelGradient: {
        padding: spacing.xl,
    },
    connectionStatus: {
        marginBottom: spacing.lg,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.success,
    },
    statusText: {
        ...typography.h3,
        color: colors.text,
        fontWeight: '600',
    },
    statusDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginLeft: 'auto',
    },
    statusDetail: {
        ...typography.caption,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    statusSeparator: {
        ...typography.caption,
        color: colors.divider,
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        gap: spacing.md,
    },
    quickAction: {
        flex: 1,
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceAlt,
    },
    quickActionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    quickActionText: {
        ...typography.caption,
        color: colors.text,
        fontWeight: '600',
        textAlign: 'center',
    },
}); 