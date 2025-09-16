// ============================================================================
// VIEWER SCREEN EXAMPLE - useViewerConnection 훅 사용 예제
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    Dimensions,
    StatusBar,
    TextInput,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarCodeScanner } from 'expo-barcode-scanner';

// 훅 임포트
import { useViewerConnection } from '../../hooks/useViewerConnection';

// 타입 임포트
import { ViewerConnectionState, ViewerConnectionActions } from '../../types/hooks';

// 상수
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ============================================================================
// ViewerScreenExample 컴포넌트
// ============================================================================

export const ViewerScreenExample: React.FC = () => {
    const [viewerState, viewerActions] = useViewerConnection('viewer_001');
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [showCodeInput, setShowCodeInput] = useState(false);
    const [connectionCode, setConnectionCode] = useState('');
    const [showCameraList, setShowCameraList] = useState(false);

    // ============================================================================
    // 이벤트 핸들러
    // ============================================================================

    const handleScanQRCode = useCallback(async (qrData: string) => {
        try {
            const success = await viewerActions.scanQRCode(qrData);
            if (success) {
                setShowQRScanner(false);
                Alert.alert('연결 성공', '카메라에 연결되었습니다.');
            }
        } catch (error) {
            Alert.alert('연결 실패', 'QR 코드를 스캔할 수 없습니다.');
        }
    }, [viewerActions]);

    const handleConnectByCode = useCallback(async () => {
        if (!connectionCode.trim()) {
            Alert.alert('입력 오류', '연결 코드를 입력해주세요.');
            return;
        }

        try {
            const success = await viewerActions.connectByCode(connectionCode.trim());
            if (success) {
                setShowCodeInput(false);
                setConnectionCode('');
                Alert.alert('연결 성공', '카메라에 연결되었습니다.');
            }
        } catch (error) {
            Alert.alert('연결 실패', '연결 코드가 올바르지 않습니다.');
        }
    }, [viewerActions, connectionCode]);

    const handleStartWatching = useCallback(async (cameraId: string) => {
        try {
            await viewerActions.startWatching(cameraId);
            Alert.alert('시청 시작', '스트림 시청을 시작합니다.');
        } catch (error) {
            Alert.alert('시청 오류', '스트림을 시작할 수 없습니다.');
        }
    }, [viewerActions]);

    const handleStopWatching = useCallback(() => {
        viewerActions.stopWatching();
        Alert.alert('시청 중지', '스트림 시청을 중지합니다.');
    }, [viewerActions]);

    const handleDisconnect = useCallback(async () => {
        try {
            await viewerActions.disconnectFromCamera();
            Alert.alert('연결 해제', '카메라 연결이 해제되었습니다.');
        } catch (error) {
            Alert.alert('연결 해제 오류', '연결을 해제할 수 없습니다.');
        }
    }, [viewerActions]);

    const handleReconnect = useCallback(async () => {
        try {
            await viewerActions.reconnect();
            Alert.alert('재연결', '카메라에 재연결을 시도합니다.');
        } catch (error) {
            Alert.alert('재연결 오류', '재연결에 실패했습니다.');
        }
    }, [viewerActions]);

    // ============================================================================
    // QR 스캐너 핸들러
    // ============================================================================

    const handleBarCodeScanned = useCallback(({ data }: { data: string }) => {
        handleScanQRCode(data);
    }, [handleScanQRCode]);

    // ============================================================================
    // 메모이제이션된 값들
    // ============================================================================

    const connectionStatusText = useMemo(() => {
        switch (viewerState.connectionStatus) {
            case 'connected':
                return '연결됨';
            case 'connecting':
                return '연결 중...';
            case 'disconnected':
                return '연결 안됨';
            case 'error':
                return '연결 오류';
            default:
                return '알 수 없음';
        }
    }, [viewerState.connectionStatus]);

    const connectionStatusColor = useMemo(() => {
        switch (viewerState.connectionStatus) {
            case 'connected':
                return '#44ff44';
            case 'connecting':
                return '#ffaa00';
            case 'disconnected':
                return '#ff4444';
            case 'error':
                return '#ff0000';
            default:
                return '#999';
        }
    }, [viewerState.connectionStatus]);

    // ============================================================================
    // 렌더링 함수
    // ============================================================================

    const renderHeader = () => {
        return (
            <View style={styles.header}>
                <Text style={styles.headerTitle}>MIMO 뷰어</Text>
                <View style={styles.headerStatus}>
                    <View style={[styles.statusDot, { backgroundColor: connectionStatusColor }]} />
                    <Text style={styles.statusText}>{connectionStatusText}</Text>
                </View>
            </View>
        );
    };

    const renderConnectionOptions = () => {
        if (viewerState.isConnected) {
            return null;
        }

        return (
            <View style={styles.connectionOptions}>
                <Text style={styles.sectionTitle}>카메라 연결</Text>

                <View style={styles.optionButtons}>
                    <TouchableOpacity
                        style={styles.optionButton}
                        onPress={() => setShowQRScanner(true)}
                    >
                        <Ionicons name="qr-code-outline" size={24} color="#007AFF" />
                        <Text style={styles.optionButtonText}>QR 코드 스캔</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.optionButton}
                        onPress={() => setShowCodeInput(true)}
                    >
                        <Ionicons name="keypad-outline" size={24} color="#007AFF" />
                        <Text style={styles.optionButtonText}>코드 입력</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderConnectedCamera = () => {
        if (!viewerState.isConnected || !viewerState.connectedCamera) {
            return null;
        }

        return (
            <View style={styles.connectedCamera}>
                <Text style={styles.sectionTitle}>연결된 카메라</Text>

                <View style={styles.cameraInfo}>
                    <View style={styles.cameraHeader}>
                        <Ionicons name="videocam" size={24} color="#007AFF" />
                        <Text style={styles.cameraName}>{viewerState.connectedCamera.name}</Text>
                        <View style={[styles.cameraStatus, { backgroundColor: '#44ff44' }]}>
                            <Text style={styles.cameraStatusText}>온라인</Text>
                        </View>
                    </View>

                    <View style={styles.cameraDetails}>
                        <Text style={styles.cameraDetail}>ID: {viewerState.connectedCamera.id}</Text>
                        <Text style={styles.cameraDetail}>뷰어 수: {viewerState.viewerCount}</Text>
                    </View>

                    <View style={styles.cameraControls}>
                        {viewerState.isWatching ? (
                            <TouchableOpacity
                                style={[styles.controlButton, styles.stopButton]}
                                onPress={handleStopWatching}
                            >
                                <Ionicons name="stop-circle" size={20} color="#fff" />
                                <Text style={styles.controlButtonText}>시청 중지</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={[styles.controlButton, styles.startButton]}
                                onPress={() => handleStartWatching(viewerState.connectedCamera!.id)}
                            >
                                <Ionicons name="play-circle" size={20} color="#fff" />
                                <Text style={styles.controlButtonText}>시청 시작</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.controlButton, styles.disconnectButton]}
                            onPress={handleDisconnect}
                        >
                            <Ionicons name="close-circle" size={20} color="#fff" />
                            <Text style={styles.controlButtonText}>연결 해제</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    const renderStreamView = () => {
        if (!viewerState.isWatching) {
            return null;
        }

        return (
            <View style={styles.streamView}>
                <Text style={styles.sectionTitle}>라이브 스트림</Text>

                <View style={styles.streamContainer}>
                    <View style={styles.streamPlaceholder}>
                        <Ionicons name="videocam-outline" size={64} color="#666" />
                        <Text style={styles.streamPlaceholderText}>스트림 로딩 중...</Text>
                    </View>
                </View>

                <View style={styles.streamControls}>
                    <TouchableOpacity
                        style={styles.streamControlButton}
                        onPress={handleStopWatching}
                    >
                        <Ionicons name="stop" size={24} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.streamControlButton}
                        onPress={() => Alert.alert('기능', '스크린샷 기능')}
                    >
                        <Ionicons name="camera" size={24} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.streamControlButton}
                        onPress={() => Alert.alert('기능', '녹화 기능')}
                    >
                        <Ionicons name="radio-button-on" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderAvailableCameras = () => {
        if (viewerState.availableCameras.length === 0) {
            return null;
        }

        return (
            <View style={styles.availableCameras}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>사용 가능한 카메라</Text>
                    <TouchableOpacity onPress={() => setShowCameraList(!showCameraList)}>
                        <Ionicons
                            name={showCameraList ? "chevron-up" : "chevron-down"}
                            size={20}
                            color="#007AFF"
                        />
                    </TouchableOpacity>
                </View>

                {showCameraList && (
                    <ScrollView style={styles.cameraList}>
                        {viewerState.availableCameras.map((camera) => (
                            <TouchableOpacity
                                key={camera.id}
                                style={styles.cameraListItem}
                                onPress={() => handleStartWatching(camera.id)}
                            >
                                <Ionicons name="videocam-outline" size={20} color="#007AFF" />
                                <Text style={styles.cameraListItemText}>{camera.name}</Text>
                                <Ionicons name="chevron-forward" size={16} color="#999" />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}
            </View>
        );
    };

    const renderError = () => {
        if (!viewerState.error) {
            return null;
        }

        return (
            <View style={styles.errorContainer}>
                <Ionicons name="warning" size={24} color="#ff4444" />
                <Text style={styles.errorText}>{viewerState.error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleReconnect}>
                    <Text style={styles.retryButtonText}>재시도</Text>
                </TouchableOpacity>
            </View>
        );
    };

    // ============================================================================
    // 모달 렌더링
    // ============================================================================

    const renderQRScannerModal = () => {
        return (
            <Modal
                visible={showQRScanner}
                animationType="slide"
                onRequestClose={() => setShowQRScanner(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>QR 코드 스캔</Text>
                        <TouchableOpacity onPress={() => setShowQRScanner(false)}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <BarCodeScanner
                        onBarCodeScanned={handleBarCodeScanned}
                        style={styles.scanner}
                    />

                    <View style={styles.scannerOverlay}>
                        <View style={styles.scannerFrame} />
                        <Text style={styles.scannerText}>QR 코드를 프레임 안에 맞춰주세요</Text>
                    </View>
                </View>
            </Modal>
        );
    };

    const renderCodeInputModal = () => {
        return (
            <Modal
                visible={showCodeInput}
                animationType="slide"
                onRequestClose={() => setShowCodeInput(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>연결 코드 입력</Text>
                        <TouchableOpacity onPress={() => setShowCodeInput(false)}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalContent}>
                        <Text style={styles.modalDescription}>
                            카메라에서 제공하는 연결 코드를 입력해주세요.
                        </Text>

                        <TextInput
                            style={styles.codeInput}
                            value={connectionCode}
                            onChangeText={setConnectionCode}
                            placeholder="연결 코드를 입력하세요"
                            placeholderTextColor="#999"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />

                        <TouchableOpacity
                            style={styles.connectButton}
                            onPress={handleConnectByCode}
                        >
                            <Text style={styles.connectButtonText}>연결</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    };

    // ============================================================================
    // 메인 렌더링
    // ============================================================================

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

            {/* 헤더 */}
            {renderHeader()}

            {/* 메인 컨텐츠 */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* 연결 옵션 */}
                {renderConnectionOptions()}

                {/* 연결된 카메라 */}
                {renderConnectedCamera()}

                {/* 스트림 뷰 */}
                {renderStreamView()}

                {/* 사용 가능한 카메라 */}
                {renderAvailableCameras()}

                {/* 오류 메시지 */}
                {renderError()}
            </ScrollView>

            {/* 모달 */}
            {renderQRScannerModal()}
            {renderCodeInputModal()}
        </View>
    );
};

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },

    // 헤더
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: '#2a2a2a',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
    },
    headerStatus: {
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
        fontSize: 14,
        color: '#fff',
    },

    // 메인 컨텐츠
    content: {
        flex: 1,
        paddingHorizontal: 16,
    },

    // 섹션 공통
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },

    // 연결 옵션
    connectionOptions: {
        marginTop: 20,
        marginBottom: 24,
    },
    optionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    optionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    optionButtonText: {
        marginLeft: 8,
        fontSize: 16,
        color: '#007AFF',
        fontWeight: '500',
    },

    // 연결된 카메라
    connectedCamera: {
        marginBottom: 24,
    },
    cameraInfo: {
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        padding: 16,
    },
    cameraHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    cameraName: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginLeft: 8,
    },
    cameraStatus: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    cameraStatusText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '500',
    },
    cameraDetails: {
        marginBottom: 16,
    },
    cameraDetail: {
        fontSize: 14,
        color: '#ccc',
        marginBottom: 4,
    },
    cameraControls: {
        flexDirection: 'row',
        gap: 12,
    },
    controlButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
    },
    startButton: {
        backgroundColor: '#44ff44',
    },
    stopButton: {
        backgroundColor: '#ff4444',
    },
    disconnectButton: {
        backgroundColor: '#ff8800',
    },
    controlButtonText: {
        marginLeft: 4,
        fontSize: 14,
        color: '#fff',
        fontWeight: '500',
    },

    // 스트림 뷰
    streamView: {
        marginBottom: 24,
    },
    streamContainer: {
        backgroundColor: '#000',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
    },
    streamPlaceholder: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    streamPlaceholderText: {
        marginTop: 8,
        fontSize: 14,
        color: '#666',
    },
    streamControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
    },
    streamControlButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#2a2a2a',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // 사용 가능한 카메라
    availableCameras: {
        marginBottom: 24,
    },
    cameraList: {
        maxHeight: 200,
    },
    cameraListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#2a2a2a',
        borderRadius: 8,
        marginBottom: 8,
    },
    cameraListItemText: {
        flex: 1,
        fontSize: 14,
        color: '#fff',
        marginLeft: 8,
    },

    // 오류 메시지
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#ff4444',
        borderRadius: 8,
        marginBottom: 24,
    },
    errorText: {
        flex: 1,
        fontSize: 14,
        color: '#fff',
        marginLeft: 8,
    },
    retryButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 4,
    },
    retryButtonText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '500',
    },

    // 모달
    modalContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: '#1a1a1a',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    modalContent: {
        flex: 1,
        padding: 16,
        justifyContent: 'center',
    },
    modalDescription: {
        fontSize: 16,
        color: '#fff',
        textAlign: 'center',
        marginBottom: 24,
    },
    codeInput: {
        backgroundColor: '#2a2a2a',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#fff',
        marginBottom: 24,
    },
    connectButton: {
        backgroundColor: '#007AFF',
        borderRadius: 8,
        paddingVertical: 16,
        alignItems: 'center',
    },
    connectButtonText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '600',
    },

    // QR 스캐너
    scanner: {
        flex: 1,
    },
    scannerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scannerFrame: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: '#007AFF',
        borderRadius: 12,
    },
    scannerText: {
        position: 'absolute',
        bottom: 100,
        fontSize: 16,
        color: '#fff',
        textAlign: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
});

export default ViewerScreenExample; 