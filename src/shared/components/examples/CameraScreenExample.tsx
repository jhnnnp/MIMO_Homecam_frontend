// ============================================================================
// CAMERA SCREEN EXAMPLE - useCamera 훅 사용 예제
// ============================================================================

import React, { useRef, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    Dimensions,
    StatusBar,
} from 'react-native';
import { Camera, CameraType, FlashMode } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

// 훅 임포트
import { useCamera } from '@/features/$CURRENT_FEATURE$/hooks/useCamera';

// 타입 임포트
import { CameraState, CameraActions } from '@/shared/types/hooks';

// 상수
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CAMERA_RATIO = 16 / 9;
const CAMERA_HEIGHT = screenWidth * CAMERA_RATIO;

// ============================================================================
// CameraScreenExample 컴포넌트
// ============================================================================

export const CameraScreenExample: React.FC = () => {
    const cameraRef = useRef<Camera>(null);
    const [cameraState, cameraActions] = useCamera();
    const [showSettings, setShowSettings] = useState(false);

    // ============================================================================
    // 이벤트 핸들러
    // ============================================================================

    const handleRequestPermissions = useCallback(async () => {
        try {
            await cameraActions.requestPermissions();
        } catch (error) {
            Alert.alert('권한 오류', '카메라 권한이 필요합니다.');
        }
    }, [cameraActions]);

    const handleSwitchCamera = useCallback(() => {
        cameraActions.switchCamera();
    }, [cameraActions]);

    const handleToggleFlash = useCallback(() => {
        cameraActions.toggleFlash();
    }, [cameraActions]);

    const handleStartRecording = useCallback(async () => {
        try {
            await cameraActions.startRecording();
            Alert.alert('녹화 시작', '녹화가 시작되었습니다.');
        } catch (error) {
            Alert.alert('녹화 오류', '녹화를 시작할 수 없습니다.');
        }
    }, [cameraActions]);

    const handleStopRecording = useCallback(async () => {
        try {
            const result = await cameraActions.stopRecording();
            if (result) {
                Alert.alert('녹화 완료', `녹화가 완료되었습니다.\n파일: ${result.fileName}`);
            }
        } catch (error) {
            Alert.alert('녹화 오류', '녹화를 중지할 수 없습니다.');
        }
    }, [cameraActions]);

    const handleTakeSnapshot = useCallback(async () => {
        try {
            const result = await cameraActions.takeSnapshot();
            if (result) {
                Alert.alert('스냅샷 완료', `스냅샷이 저장되었습니다.\n파일: ${result.fileName}`);
            }
        } catch (error) {
            Alert.alert('스냅샷 오류', '스냅샷을 촬영할 수 없습니다.');
        }
    }, [cameraActions]);

    const handleStartStreaming = useCallback(async () => {
        try {
            await cameraActions.startStreaming();
            Alert.alert('스트리밍 시작', '스트리밍이 시작되었습니다.');
        } catch (error) {
            Alert.alert('스트리밍 오류', '스트리밍을 시작할 수 없습니다.');
        }
    }, [cameraActions]);

    const handleStopStreaming = useCallback(async () => {
        try {
            await cameraActions.stopStreaming();
            Alert.alert('스트리밍 중지', '스트리밍이 중지되었습니다.');
        } catch (error) {
            Alert.alert('스트리밍 오류', '스트리밍을 중지할 수 없습니다.');
        }
    }, [cameraActions]);

    const handleUpdateRecordingSettings = useCallback((settings: any) => {
        cameraActions.updateRecordingSettings(settings);
    }, [cameraActions]);

    // ============================================================================
    // 렌더링 함수
    // ============================================================================

    const renderCameraView = () => {
        if (!cameraState.hasPermission) {
            return (
                <View style={styles.permissionContainer}>
                    <Ionicons name="camera-outline" size={64} color="#666" />
                    <Text style={styles.permissionText}>카메라 권한이 필요합니다</Text>
                    <TouchableOpacity style={styles.permissionButton} onPress={handleRequestPermissions}>
                        <Text style={styles.permissionButtonText}>권한 요청</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View style={styles.cameraContainer}>
                <Camera
                    ref={cameraRef}
                    style={styles.camera}
                    type={cameraState.cameraType}
                    flashMode={cameraState.flashMode}
                    ratio="16:9"
                >
                    {/* 카메라 오버레이 */}
                    <View style={styles.cameraOverlay}>
                        {/* 상단 상태바 */}
                        <View style={styles.statusBar}>
                            <View style={styles.statusItem}>
                                <Ionicons
                                    name={cameraState.isRecording ? "radio-button-on" : "radio-button-off"}
                                    size={16}
                                    color={cameraState.isRecording ? "#ff4444" : "#fff"}
                                />
                                <Text style={styles.statusText}>
                                    {cameraState.isRecording ? 'REC' : 'STBY'}
                                </Text>
                            </View>

                            <View style={styles.statusItem}>
                                <Ionicons
                                    name={cameraState.isStreaming ? "wifi" : "wifi-outline"}
                                    size={16}
                                    color={cameraState.isStreaming ? "#44ff44" : "#fff"}
                                />
                                <Text style={styles.statusText}>
                                    {cameraState.isStreaming ? 'LIVE' : 'OFF'}
                                </Text>
                            </View>

                            {cameraState.isRecording && (
                                <View style={styles.statusItem}>
                                    <Text style={styles.recordingTime}>
                                        {Math.floor(cameraState.recordingTime / 60)}:
                                        {(cameraState.recordingTime % 60).toString().padStart(2, '0')}
                                    </Text>
                                </View>
                            )}

                            {cameraState.isStreaming && (
                                <View style={styles.statusItem}>
                                    <Text style={styles.streamingTime}>
                                        {Math.floor(cameraState.streamingTime / 60)}:
                                        {(cameraState.streamingTime % 60).toString().padStart(2, '0')}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* 하단 컨트롤 */}
                        <View style={styles.controls}>
                            {/* 설정 버튼 */}
                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={() => setShowSettings(!showSettings)}
                            >
                                <Ionicons name="settings-outline" size={24} color="#fff" />
                            </TouchableOpacity>

                            {/* 플래시 버튼 */}
                            <TouchableOpacity style={styles.controlButton} onPress={handleToggleFlash}>
                                <Ionicons
                                    name={cameraState.flashMode === FlashMode.on ? "flash" : "flash-off"}
                                    size={24}
                                    color="#fff"
                                />
                            </TouchableOpacity>

                            {/* 카메라 전환 버튼 */}
                            <TouchableOpacity style={styles.controlButton} onPress={handleSwitchCamera}>
                                <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </Camera>
            </View>
        );
    };

    const renderControls = () => {
        return (
            <View style={styles.controlsContainer}>
                {/* 메인 컨트롤 버튼들 */}
                <View style={styles.mainControls}>
                    {/* 스냅샷 버튼 */}
                    <TouchableOpacity style={styles.snapshotButton} onPress={handleTakeSnapshot}>
                        <Ionicons name="camera" size={32} color="#fff" />
                    </TouchableOpacity>

                    {/* 녹화 버튼 */}
                    <TouchableOpacity
                        style={[
                            styles.recordButton,
                            cameraState.isRecording && styles.recordButtonActive
                        ]}
                        onPress={cameraState.isRecording ? handleStopRecording : handleStartRecording}
                    >
                        <Ionicons
                            name={cameraState.isRecording ? "stop" : "radio-button-on"}
                            size={32}
                            color="#fff"
                        />
                    </TouchableOpacity>

                    {/* 스트리밍 버튼 */}
                    <TouchableOpacity
                        style={[
                            styles.streamButton,
                            cameraState.isStreaming && styles.streamButtonActive
                        ]}
                        onPress={cameraState.isStreaming ? handleStopStreaming : handleStartStreaming}
                    >
                        <Ionicons
                            name={cameraState.isStreaming ? "stop-circle" : "play-circle"}
                            size={32}
                            color="#fff"
                        />
                    </TouchableOpacity>
                </View>

                {/* 설정 패널 */}
                {showSettings && (
                    <View style={styles.settingsPanel}>
                        <Text style={styles.settingsTitle}>녹화 설정</Text>

                        <View style={styles.settingItem}>
                            <Text style={styles.settingLabel}>해상도</Text>
                            <View style={styles.settingOptions}>
                                {['720p', '1080p', '4K'].map((resolution) => (
                                    <TouchableOpacity
                                        key={resolution}
                                        style={[
                                            styles.settingOption,
                                            cameraState.recordingSettings.resolution === resolution && styles.settingOptionActive
                                        ]}
                                        onPress={() => handleUpdateRecordingSettings({ resolution })}
                                    >
                                        <Text style={styles.settingOptionText}>{resolution}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.settingItem}>
                            <Text style={styles.settingLabel}>프레임레이트</Text>
                            <View style={styles.settingOptions}>
                                {[30, 60].map((fps) => (
                                    <TouchableOpacity
                                        key={fps}
                                        style={[
                                            styles.settingOption,
                                            cameraState.recordingSettings.fps === fps && styles.settingOptionActive
                                        ]}
                                        onPress={() => handleUpdateRecordingSettings({ fps })}
                                    >
                                        <Text style={styles.settingOptionText}>{fps}fps</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    const renderStatus = () => {
        return (
            <View style={styles.statusContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.statusItem}>
                        <Text style={styles.statusLabel}>카메라:</Text>
                        <Text style={styles.statusValue}>
                            {cameraState.cameraType === CameraType.back ? '후면' : '전면'}
                        </Text>
                    </View>

                    <View style={styles.statusItem}>
                        <Text style={styles.statusLabel}>플래시:</Text>
                        <Text style={styles.statusValue}>
                            {cameraState.flashMode === FlashMode.on ? 'ON' : 'OFF'}
                        </Text>
                    </View>

                    <View style={styles.statusItem}>
                        <Text style={styles.statusLabel}>연결:</Text>
                        <Text style={styles.statusValue}>
                            {cameraState.connectionStatus === 'connected' ? '연결됨' : '연결 안됨'}
                        </Text>
                    </View>

                    {cameraState.error && (
                        <View style={styles.statusItem}>
                            <Text style={styles.statusLabel}>오류:</Text>
                            <Text style={styles.statusError}>{cameraState.error}</Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        );
    };

    // ============================================================================
    // 메인 렌더링
    // ============================================================================

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            {/* 카메라 뷰 */}
            {renderCameraView()}

            {/* 컨트롤 */}
            {cameraState.hasPermission && renderControls()}

            {/* 상태 정보 */}
            {cameraState.hasPermission && renderStatus()}
        </View>
    );
};

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },

    // 권한 요청 화면
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
    },
    permissionText: {
        fontSize: 18,
        color: '#fff',
        marginTop: 16,
        marginBottom: 24,
        textAlign: 'center',
    },
    permissionButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    permissionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },

    // 카메라 뷰
    cameraContainer: {
        width: screenWidth,
        height: CAMERA_HEIGHT,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    cameraOverlay: {
        flex: 1,
        justifyContent: 'space-between',
    },

    // 상태바
    statusBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    recordingTime: {
        color: '#ff4444',
        fontSize: 12,
        fontWeight: '600',
    },
    streamingTime: {
        color: '#44ff44',
        fontSize: 12,
        fontWeight: '600',
    },

    // 컨트롤
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    controlButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // 메인 컨트롤
    controlsContainer: {
        paddingHorizontal: 16,
        paddingVertical: 20,
    },
    mainControls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: 20,
    },
    snapshotButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#ff4444',
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordButtonActive: {
        backgroundColor: '#cc0000',
    },
    streamButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#44ff44',
        justifyContent: 'center',
        alignItems: 'center',
    },
    streamButtonActive: {
        backgroundColor: '#00cc00',
    },

    // 설정 패널
    settingsPanel: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
    },
    settingsTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    settingItem: {
        marginBottom: 16,
    },
    settingLabel: {
        color: '#fff',
        fontSize: 14,
        marginBottom: 8,
    },
    settingOptions: {
        flexDirection: 'row',
        gap: 8,
    },
    settingOption: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        backgroundColor: '#333',
        alignItems: 'center',
    },
    settingOptionActive: {
        backgroundColor: '#007AFF',
    },
    settingOptionText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },

    // 상태 정보
    statusContainer: {
        backgroundColor: '#1a1a1a',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    statusLabel: {
        color: '#999',
        fontSize: 12,
        marginRight: 4,
    },
    statusValue: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    statusError: {
        color: '#ff4444',
        fontSize: 12,
        fontWeight: '500',
    },
});

export default CameraScreenExample; 