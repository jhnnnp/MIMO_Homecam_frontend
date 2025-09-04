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
import { MjpegPlayer } from '../../components/MjpegPlayer';
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
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [remoteStream, setRemoteStream] = useState<any>(null);
    const [webRTCStream, setWebRTCStream] = useState<any>(null);
    const [streamingStatus, setStreamingStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

    // 연결 상태 모니터링
    useEffect(() => {
        if (connectionState.isConnected && connectionState.remoteStream) {
            console.log('📺 [뷰어 화면] 원격 스트림 수신됨:', connectionState.remoteStream.id);
            setRemoteStream(connectionState.remoteStream);
            setStreamingStatus('connected');
            setIsLoading(false);
            setError(null);
        } else if (connectionState.error) {
            console.error('❌ [뷰어 화면] 연결 오류:', connectionState.error);
            setError(connectionState.error);
            setStreamingStatus('error');
            setIsLoading(false);
        }
    }, [connectionState.isConnected, connectionState.remoteStream, connectionState.error]);

    // WebRTC 스트림 시작
    useEffect(() => {
        const startWebRTCStream = async () => {
            try {
                console.log('🎥 [뷰어 화면] WebRTC 스트림 시작:', cameraId);

                const stream = await webrtcService.startViewing(
                    cameraId,
                    connectionState.viewerId || 'VIEWER_DEFAULT'
                );

                setWebRTCStream(stream);

                // 스트림 수신 콜백 설정
                stream.onStreamReceived = (remoteStream: any) => {
                    console.log('📺 [뷰어 화면] WebRTC 원격 스트림 수신:', remoteStream);
                    setRemoteStream(remoteStream);
                    setStreamingStatus('connected');
                    setIsLoading(false);
                };

                // 연결 상태 모니터링
                webrtcService.on('connection_state_changed', (streamId: string, state: string) => {
                    console.log('🔗 [뷰어 화면] WebRTC 연결 상태:', state);
                    if (state === 'connected') {
                        setStreamingStatus('connected');
                        setIsLoading(false);
                    } else if (state === 'failed' || state === 'disconnected') {
                        setStreamingStatus('error');
                        setError('WebRTC 연결에 실패했습니다.');
                        setIsLoading(false);
                    }
                });

            } catch (error) {
                console.error('❌ [뷰어 화면] WebRTC 스트림 시작 실패:', error);
                setError('WebRTC 스트림을 시작할 수 없습니다.');
                setStreamingStatus('error');
                setIsLoading(false);
            }
        };

        if (connectionState.isConnected && !webRTCStream) {
            startWebRTCStream();
        }
    }, [connectionState.isConnected, cameraId, connectionState.viewerId]);

    const handleDisconnect = async () => {
        try {
            console.log('🔌 [뷰어 화면] 연결 해제 중...');

            // WebRTC 스트림 정리
            if (connectionState.currentStream) {
                await webrtcService.stopStream(connectionState.currentStream.id);
            }

            // 연결 해제
            await connectionActions.disconnect();

            navigation.goBack();
        } catch (error) {
            console.error('❌ [뷰어 화면] 연결 해제 실패:', error);
            Alert.alert('오류', '연결을 해제하는 중 오류가 발생했습니다.');
        }
    };

    const handleReconnect = async () => {
        setError(null);
        setIsLoading(true);
        // setIsConnected(false); // This line was removed as per the new_code

        // 재연결 로직
        if (connectionState.isConnected) {
            try {
                const webRTCStream = await webrtcService.startViewing(
                    cameraId,
                    connectionState.viewerId || 'VIEWER_DEFAULT'
                );

                // webRTCStream.onStreamReceived = (stream: any) => { // This line was removed as per the new_code
                //     setRemoteStream(stream); // This line was removed as per the new_code
                //     setIsConnected(true); // This line was removed as per the new_code
                //     setIsLoading(false); // This line was removed as per the new_code
                // }; // This line was removed as per the new_code
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
                        isLoading ? (
                            <View style={styles.loadingContainer}>
                                <Ionicons name="videocam" size={64} color={colors.primary} />
                                <Text style={styles.loadingText}>스트림 연결 중...</Text>
                                <Text style={styles.loadingSubtext}>WebRTC 연결을 설정하고 있습니다</Text>
                            </View>
                        ) : remoteStream ? (
                            <WebRTCVideoPlayer
                                stream={remoteStream}
                                style={styles.videoPlayer}
                                onError={(error) => {
                                    console.error('📺 [뷰어 화면] 비디오 오류:', error);
                                    setError('비디오 스트림 오류가 발생했습니다.');
                                }}
                            />
                        ) : connectionState.viewerMediaUrl ? (
                            <MjpegPlayer url={connectionState.viewerMediaUrl} style={styles.videoPlayer} />
                        ) : (
                            <View style={styles.noStreamContainer}>
                                <Ionicons name="videocam-off" size={64} color={colors.textSecondary} />
                                <Text style={styles.noStreamText}>스트림을 기다리는 중...</Text>
                                <Text style={styles.noStreamSubtext}>홈캠에서 스트리밍을 시작해주세요</Text>
                            </View>
                        )
                    )
                    }
                </View>

                {/* 연결 상태 */}
                <View style={styles.statusContainer}>
                    <View style={styles.statusRow}>
                        <View style={[styles.statusDot, { backgroundColor: connectionState.isConnected ? colors.success : colors.warning }]} />
                        <Text style={styles.statusText}>
                            {isLoading ? '연결 중...' : connectionState.isConnected ? '연결됨' : '연결 안됨'}
                        </Text>
                    </View>

                    {connectionState.isConnected && (
                        <View style={styles.streamInfo}>
                            <Text style={styles.streamInfoText}>실시간 스트리밍</Text>
                            {connectionState.remoteStream && (
                                <Text style={styles.streamIdText}>스트림 ID: {connectionState.remoteStream.id}</Text>
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
        </SafeAreaView >
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    loadingText: {
        ...typography.h3,
        color: colors.primary,
        textAlign: 'center',
        marginTop: spacing.md,
    },
    loadingSubtext: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    noStreamContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    noStreamText: {
        ...typography.h3,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.md,
    },
    noStreamSubtext: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
});
