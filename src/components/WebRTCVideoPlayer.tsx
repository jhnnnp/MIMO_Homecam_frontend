import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
// import { RTCView } from 'react-native-webrtc'; // Expo Go에서는 사용 불가
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../design/tokens';

interface WebRTCVideoPlayerProps {
    stream?: any;
    isLocal?: boolean;
    onMute?: () => void;
    onUnmute?: () => void;
    onFullscreen?: () => void;
    isMuted?: boolean;
    isFullscreen?: boolean;
    style?: any;
}

export const WebRTCVideoPlayer: React.FC<WebRTCVideoPlayerProps> = ({
    stream,
    isLocal = false,
    onMute,
    onUnmute,
    onFullscreen,
    isMuted = false,
    isFullscreen = false,
    style,
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const videoRef = useRef<View>(null);

    useEffect(() => {
        if (stream) {
            setIsLoading(false);
            setHasError(false);
            setIsPlaying(true);
            console.log('📺 비디오 스트림 설정됨:', stream.id);
        } else {
            setIsLoading(true);
            setIsPlaying(false);
        }
    }, [stream]);

    const handleVideoError = () => {
        console.error('❌ 비디오 스트림 오류');
        setHasError(true);
        setIsLoading(false);
        setIsPlaying(false);
    };

    const handleVideoLoad = () => {
        console.log('✅ 비디오 스트림 로드 완료');
        setIsLoading(false);
        setHasError(false);
        setIsPlaying(true);
    };

    const toggleMute = () => {
        if (isMuted) {
            onUnmute?.();
        } else {
            onMute?.();
        }
    };

    if (hasError) {
        return (
            <View style={[styles.container, style]}>
                <View style={styles.errorContainer}>
                    <Ionicons name="videocam-off" size={48} color={colors.error} />
                    <Text style={styles.errorText}>스트림을 불러올 수 없습니다</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => setHasError(false)}>
                        <Text style={styles.retryButtonText}>다시 시도</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (isLoading) {
        return (
            <View style={[styles.container, style]}>
                <View style={styles.loadingContainer}>
                    <Ionicons name="videocam" size={48} color={colors.primary} />
                    <Text style={styles.loadingText}>
                        {isLocal ? '카메라 초기화 중...' : '스트림 연결 중...'}
                    </Text>
                </View>
            </View>
        );
    }

    if (!stream) {
        return (
            <View style={[styles.container, style]}>
                <View style={styles.noStreamContainer}>
                    <Ionicons name="videocam-outline" size={48} color={colors.textSecondary} />
                    <Text style={styles.noStreamText}>
                        {isLocal ? '카메라를 시작해주세요' : '스트림이 없습니다'}
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, style]}>
            {/* Expo Go에서는 RTCView 대신 일반 View 사용 */}
            <View
                ref={videoRef}
                style={styles.video}
                onLayout={handleVideoLoad}
            >
                <View style={styles.videoPlaceholder}>
                    <Ionicons name="videocam" size={64} color={colors.textSecondary} />
                    <Text style={styles.videoPlaceholderText}>
                        {isLocal ? '로컬 카메라' : '원격 스트림'}
                    </Text>
                    <Text style={styles.expoGoNotice}>
                        (Expo Go에서는 실제 비디오가 표시되지 않습니다)
                    </Text>
                </View>
            </View>

            {/* 컨트롤 오버레이 */}
            <View style={styles.controlsOverlay}>
                <View style={styles.statusBar}>
                    <View style={styles.connectionStatus}>
                        <View style={[styles.statusDot, { backgroundColor: isPlaying ? colors.success : colors.warning }]} />
                        <Text style={styles.statusText}>
                            {isPlaying ? '연결됨' : '연결 중...'}
                        </Text>
                    </View>

                    <View style={styles.controls}>
                        <TouchableOpacity style={styles.controlButton} onPress={toggleMute}>
                            <Ionicons
                                name={isMuted ? "mic-off" : "mic"}
                                size={20}
                                color={colors.text}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.controlButton} onPress={onFullscreen}>
                            <Ionicons
                                name={isFullscreen ? "contract" : "expand"}
                                size={20}
                                color={colors.text}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* 스트림 정보 */}
            <View style={styles.streamInfo}>
                <Text style={styles.streamInfoText}>
                    {isLocal ? '로컬 카메라' : '원격 스트림'}
                </Text>
                {stream.id && (
                    <Text style={styles.streamIdText}>ID: {stream.id}</Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    video: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surface,
    },
    loadingText: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surface,
    },
    errorText: {
        ...typography.body,
        color: colors.error,
        marginTop: 16,
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 16,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: colors.primary,
        borderRadius: 8,
    },
    retryButtonText: {
        ...typography.button,
        color: colors.onPrimary,
    },
    noStreamContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surface,
    },
    noStreamText: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: 16,
        textAlign: 'center',
    },
    controlsOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-end',
    },
    statusBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    connectionStatus: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    statusText: {
        ...typography.caption,
        color: colors.onSurface,
    },
    controls: {
        flexDirection: 'row',
        gap: 8,
    },
    controlButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    streamInfo: {
        position: 'absolute',
        top: 16,
        left: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    streamInfoText: {
        ...typography.caption,
        color: colors.onSurface,
    },
    streamIdText: {
        ...typography.caption,
        color: colors.textSecondary,
        fontSize: 10,
    },
    videoPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surface,
    },
    videoPlaceholderText: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: 16,
    },
    expoGoNotice: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 8,
    },
}); 