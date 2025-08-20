import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '../../design/tokens';
import { WebRTCVideoPlayer } from '../../components/WebRTCVideoPlayer';
import { webrtcService } from '../../services/webrtcService';
import { useViewerConnection } from '../../hooks/useViewerConnection';

interface ViewerLiveStreamScreenProps {
    route: {
        params: {
            cameraId: string;
            cameraName: string;
        };
    };
    navigation: any;
}

export default function ViewerLiveStreamScreen({ route, navigation }: ViewerLiveStreamScreenProps) {
    const { cameraId, cameraName } = route.params;
    const [connectionState, connectionActions] = useViewerConnection();
    const [remoteStream, setRemoteStream] = useState<any>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 스트림 연결
    useEffect(() => {
        const connectToStream = async () => {
            try {
            setIsLoading(true);
            setError(null);

                console.log(`👁️ 스트림 연결 시도: ${cameraId}`);

                // WebRTC 스트림 시작
                const webRTCStream = await webrtcService.startViewing(
                    cameraId,
                    connectionState.viewerId || 'VIEWER_DEFAULT'
                );

                // 스트림 수신 콜백 설정
                webRTCStream.onStreamReceived = (stream: any) => {
                    console.log('📺 원격 스트림 수신됨:', stream.id);
                    setRemoteStream(stream);
                    setIsConnected(true);
                    setIsLoading(false);
                };

                // 연결 상태 모니터링
                const checkConnection = setInterval(() => {
                    if (webRTCStream.isConnected) {
                setIsConnected(true);
                setIsLoading(false);
                        clearInterval(checkConnection);
                    }
                }, 1000);

                // 30초 타임아웃
                setTimeout(() => {
                    if (!isConnected) {
                        setError('스트림 연결 시간이 초과되었습니다.');
                        setIsLoading(false);
                        clearInterval(checkConnection);
                    }
                }, 30000);

            } catch (error) {
                console.error('❌ 스트림 연결 실패:', error);
                setError('스트림에 연결할 수 없습니다.');
                setIsLoading(false);
            }
        };

        if (connectionState.isConnected && cameraId) {
            connectToStream();
        }

        // 정리
        return () => {
            if (remoteStream) {
                remoteStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [connectionState.isConnected, cameraId]);

    const handleDisconnect = async () => {
        try {
            if (remoteStream) {
                remoteStream.getTracks().forEach(track => track.stop());
            }

            await webrtcService.stopAllStreams();
            setRemoteStream(null);
            setIsConnected(false);

            Alert.alert('연결 종료', '스트림 연결이 종료되었습니다.');
            navigation.goBack();
        } catch (error) {
            console.error('❌ 연결 종료 실패:', error);
        }
    };

    const handleReconnect = async () => {
        setError(null);
        setIsLoading(true);
        setIsConnected(false);

        // 재연결 로직
        if (connectionState.isConnected) {
            try {
                const webRTCStream = await webrtcService.startViewing(
                    cameraId,
                    connectionState.viewerId || 'VIEWER_DEFAULT'
                );

                webRTCStream.onStreamReceived = (stream: any) => {
                    setRemoteStream(stream);
            setIsConnected(true);
            setIsLoading(false);
                };
            } catch (error) {
                setError('재연결에 실패했습니다.');
                setIsLoading(false);
    }
        }
    };

    return (
        <SafeAreaView style={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>

                <View style={styles.headerInfo}>
                    <Text style={styles.cameraName}>{cameraName}</Text>
                    <Text style={styles.cameraId}>{cameraId}</Text>
                </View>

                <TouchableOpacity
                    style={styles.disconnectButton}
                    onPress={handleDisconnect}
                >
                    <Ionicons name="close" size={24} color={colors.error} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {/* 비디오 플레이어 */}
                <View style={styles.videoContainer}>
                    {error ? (
                        <View style={styles.errorContainer}>
                            <Ionicons name="videocam-off" size={64} color={colors.error} />
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity
                                style={styles.retryButton}
                                onPress={handleReconnect}
                            >
                                <Text style={styles.retryButtonText}>다시 연결</Text>
                        </TouchableOpacity>
                        </View>
                    ) : (
                        <WebRTCVideoPlayer
                            stream={remoteStream}
                            isLocal={false}
                            style={styles.videoPlayer}
                        />
                    )}
                </View>

                {/* 연결 상태 */}
                <View style={styles.statusContainer}>
                    <View style={styles.statusRow}>
                        <View style={[styles.statusDot, { backgroundColor: isConnected ? colors.success : colors.warning }]} />
                        <Text style={styles.statusText}>
                            {isLoading ? '연결 중...' : isConnected ? '연결됨' : '연결 안됨'}
                        </Text>
                    </View>

                            {isConnected && (
                        <View style={styles.streamInfo}>
                            <Text style={styles.streamInfoText}>실시간 스트리밍</Text>
                            {remoteStream && (
                                <Text style={styles.streamIdText}>스트림 ID: {remoteStream.id}</Text>
                            )}
                        </View>
                    )}
                                </View>

                {/* 컨트롤 버튼들 */}
                <View style={styles.controls}>
                                    <TouchableOpacity
                                        style={styles.controlButton}
                        onPress={() => Alert.alert('스냅샷', '스냅샷 기능은 준비 중입니다.')}
                                    >
                        <Ionicons name="camera" size={24} color={colors.text} />
                        <Text style={styles.controlButtonText}>스냅샷</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={() => Alert.alert('녹화', '녹화 기능은 준비 중입니다.')}
                                    >
                        <Ionicons name="videocam" size={24} color={colors.text} />
                        <Text style={styles.controlButtonText}>녹화</Text>
                                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={() => Alert.alert('설정', '스트림 설정은 준비 중입니다.')}
                    >
                        <Ionicons name="settings" size={24} color={colors.text} />
                        <Text style={styles.controlButtonText}>설정</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceAlt,
    },
    backButton: {
        padding: spacing.sm,
    },
    headerInfo: {
        flex: 1,
        alignItems: 'center',
    },
    cameraName: {
        ...typography.h3,
        color: colors.text,
        textAlign: 'center',
    },
    cameraId: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    disconnectButton: {
        padding: spacing.sm,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
    },
    videoContainer: {
        flex: 1,
        marginVertical: spacing.lg,
        borderRadius: radius.lg,
        overflow: 'hidden',
        backgroundColor: colors.surface,
    },
    videoPlayer: {
        flex: 1,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    errorText: {
        ...typography.body,
        color: colors.error,
        textAlign: 'center',
        marginTop: spacing.md,
        marginBottom: spacing.lg,
    },
    retryButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.primary,
        borderRadius: radius.md,
    },
    retryButtonText: {
        ...typography.button,
        color: colors.onPrimary,
    },
    statusContainer: {
        marginBottom: spacing.lg,
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: spacing.sm,
    },
    statusText: {
        ...typography.body,
        color: colors.text,
    },
    streamInfo: {
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.surfaceAlt,
    },
    streamInfoText: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    streamIdText: {
        ...typography.caption,
        color: colors.textSecondary,
        fontSize: 10,
        marginTop: spacing.xs,
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: spacing.md,
    },
    controlButton: {
        alignItems: 'center',
        padding: spacing.sm,
    },
    controlButtonText: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
});
