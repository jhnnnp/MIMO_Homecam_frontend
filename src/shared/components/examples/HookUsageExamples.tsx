// ============================================================================
// HOOK USAGE EXAMPLES - 훅 사용 예제 컴포넌트
// ============================================================================

import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    TextInput,
} from 'react-native';
import { Camera } from 'expo-camera';

import { useCamera } from '../hooks/useCamera';
import { useCameraConnection } from '../hooks/useCameraConnection';
import { useCameraStream } from '../hooks/useCameraStream';
import { useEvent } from '../hooks/useEvent';
import { useMotionDetection } from '../hooks/useMotionDetection';
import { useNotification } from '../hooks/useNotification';
import { useViewerConnection } from '../hooks/useViewerConnection';

// ============================================================================
// 카메라 훅 사용 예제
// ============================================================================

export const CameraHookExample: React.FC = () => {
    const [state, actions] = useCamera();
    const [photoUri, setPhotoUri] = useState<string | null>(null);

    const handleTakeSnapshot = async () => {
        try {
            const photo = await actions.takeSnapshot();
            if (photo) {
                setPhotoUri(photo.uri);
                Alert.alert('스냅샷 완료', '사진이 촬영되었습니다.');
            }
        } catch (error) {
            Alert.alert('오류', '스냅샷 촬영에 실패했습니다.');
        }
    };

    const handleStartRecording = async () => {
        try {
            await actions.startRecording();
            Alert.alert('녹화 시작', '녹화가 시작되었습니다.');
        } catch (error) {
            Alert.alert('오류', '녹화 시작에 실패했습니다.');
        }
    };

    const handleStopRecording = async () => {
        try {
            await actions.stopRecording();
            Alert.alert('녹화 완료', '녹화가 완료되었습니다.');
        } catch (error) {
            Alert.alert('오류', '녹화 중지에 실패했습니다.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>📷 카메라 훅 예제</Text>

            <View style={styles.statusContainer}>
                <Text style={styles.statusText}>
                    권한: {state.hasPermission ? '✅' : '❌'}
                </Text>
                <Text style={styles.statusText}>
                    녹화 중: {state.isRecording ? '🔴' : '⚪'}
                </Text>
                <Text style={styles.statusText}>
                    녹화 시간: {state.recordingTime}초
                </Text>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={actions.requestPermissions}
                >
                    <Text style={styles.buttonText}>권한 요청</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.button}
                    onPress={actions.switchCamera}
                >
                    <Text style={styles.buttonText}>카메라 전환</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.button}
                    onPress={actions.toggleFlash}
                >
                    <Text style={styles.buttonText}>플래시 토글</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleTakeSnapshot}
                >
                    <Text style={styles.buttonText}>스냅샷 촬영</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, state.isRecording && styles.buttonActive]}
                    onPress={state.isRecording ? handleStopRecording : handleStartRecording}
                >
                    <Text style={styles.buttonText}>
                        {state.isRecording ? '녹화 중지' : '녹화 시작'}
                    </Text>
                </TouchableOpacity>
            </View>

            {state.error && (
                <Text style={styles.errorText}>오류: {state.error}</Text>
            )}
        </View>
    );
};

// ============================================================================
// 카메라 연결 훅 사용 예제
// ============================================================================

export const CameraConnectionHookExample: React.FC = () => {
    const [state, actions] = useCameraConnection('camera_001', '거실 카메라');
    const [pinCode, setPinCode] = useState<string | null>(null);

    const handleGeneratePin = async () => {
        try {
            const pinCode = await actions.generatePinCode();
            setPinCode(pinCode);
            Alert.alert('PIN 코드 생성', 'PIN 코드가 생성되었습니다.');
        } catch (error) {
            Alert.alert('오류', 'PIN 코드 생성에 실패했습니다.');
        }
    };

    const handleStartStreaming = async () => {
        try {
            await actions.startStreaming();
            Alert.alert('스트리밍 시작', '스트리밍이 시작되었습니다.');
        } catch (error) {
            Alert.alert('오류', '스트리밍 시작에 실패했습니다.');
        }
    };

    const handleStopStreaming = async () => {
        try {
            await actions.stopStreaming();
            Alert.alert('스트리밍 중지', '스트리밍이 중지되었습니다.');
        } catch (error) {
            Alert.alert('오류', '스트리밍 중지에 실패했습니다.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>🔗 카메라 연결 훅 예제</Text>

            <View style={styles.statusContainer}>
                <Text style={styles.statusText}>
                    연결 상태: {state.connectionStatus}
                </Text>
                <Text style={styles.statusText}>
                    스트리밍: {state.isStreaming ? '🔴' : '⚪'}
                </Text>
                <Text style={styles.statusText}>
                    뷰어 수: {state.viewerCount}명
                </Text>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={handleGenerateQR}
                >
                    <Text style={styles.buttonText}>QR 코드 생성</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, state.isStreaming && styles.buttonActive]}
                    onPress={state.isStreaming ? handleStopStreaming : handleStartStreaming}
                >
                    <Text style={styles.buttonText}>
                        {state.isStreaming ? '스트리밍 중지' : '스트리밍 시작'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.button}
                    onPress={actions.disconnect}
                >
                    <Text style={styles.buttonText}>연결 해제</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.button}
                    onPress={actions.reconnect}
                >
                    <Text style={styles.buttonText}>재연결</Text>
                </TouchableOpacity>
            </View>

            {qrCode && (
                <View style={styles.qrContainer}>
                    <Text style={styles.qrTitle}>QR 코드 데이터:</Text>
                    <Text style={styles.qrText}>{qrCode}</Text>
                </View>
            )}

            {state.error && (
                <Text style={styles.errorText}>오류: {state.error}</Text>
            )}
        </View>
    );
};

// ============================================================================
// 카메라 스트림 훅 사용 예제
// ============================================================================

export const CameraStreamHookExample: React.FC = () => {
    const [state, actions] = useCameraStream();
    const [cameraId, setCameraId] = useState('camera_001');

    const handleStartStream = async () => {
        try {
            await actions.startStream(cameraId);
            Alert.alert('스트림 시작', '스트림이 시작되었습니다.');
        } catch (error) {
            Alert.alert('오류', '스트림 시작에 실패했습니다.');
        }
    };

    const handleStopStream = async () => {
        try {
            await actions.stopStream(cameraId);
            Alert.alert('스트림 중지', '스트림이 중지되었습니다.');
        } catch (error) {
            Alert.alert('오류', '스트림 중지에 실패했습니다.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>📺 카메라 스트림 훅 예제</Text>

            <View style={styles.statusContainer}>
                <Text style={styles.statusText}>
                    스트리밍: {state.isStreaming ? '🔴' : '⚪'}
                </Text>
                <Text style={styles.statusText}>
                    스트림 시간: {state.streamTime}초
                </Text>
                <Text style={styles.statusText}>
                    뷰어 수: {state.viewerCount}명
                </Text>
            </View>

            <TextInput
                style={styles.input}
                placeholder="카메라 ID 입력"
                value={cameraId}
                onChangeText={setCameraId}
            />

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.button, state.isStreaming && styles.buttonActive]}
                    onPress={state.isStreaming ? handleStopStream : handleStartStream}
                >
                    <Text style={styles.buttonText}>
                        {state.isStreaming ? '스트림 중지' : '스트림 시작'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.button}
                    onPress={() => actions.updateStreamQuality(cameraId, { resolution: '720p' })}
                >
                    <Text style={styles.buttonText}>품질 업데이트</Text>
                </TouchableOpacity>
            </View>

            {state.error && (
                <Text style={styles.errorText}>오류: {state.error}</Text>
            )}
        </View>
    );
};

// ============================================================================
// 이벤트 훅 사용 예제
// ============================================================================

export const EventHookExample: React.FC = () => {
    const [state, actions] = useEvent();

    const handleCreateEvent = async () => {
        try {
            await actions.createEvent({
                type: 'motion',
                cameraId: 'camera_001',
                cameraName: '거실 카메라',
                confidence: 0.85,
                metadata: { objectType: 'person' },
                location: { x: 100, y: 100, width: 200, height: 300 },
                isPinned: false,
                score: 0.85,
            });
            Alert.alert('이벤트 생성', '이벤트가 생성되었습니다.');
        } catch (error) {
            Alert.alert('오류', '이벤트 생성에 실패했습니다.');
        }
    };

    const handleTogglePin = async () => {
        if (state.recentEvents.length > 0) {
            try {
                await actions.togglePin(state.recentEvents[0].id);
                Alert.alert('고정 상태 변경', '이벤트 고정 상태가 변경되었습니다.');
            } catch (error) {
                Alert.alert('오류', '고정 상태 변경에 실패했습니다.');
            }
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>📊 이벤트 훅 예제</Text>

            <View style={styles.statusContainer}>
                <Text style={styles.statusText}>
                    총 이벤트: {state.eventStats.totalEvents}개
                </Text>
                <Text style={styles.statusText}>
                    오늘 이벤트: {state.eventStats.todayEvents}개
                </Text>
                <Text style={styles.statusText}>
                    모션 이벤트: {state.eventStats.motionEvents}개
                </Text>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={handleCreateEvent}
                >
                    <Text style={styles.buttonText}>이벤트 생성</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleTogglePin}
                >
                    <Text style={styles.buttonText}>고정 상태 변경</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.button}
                    onPress={() => actions.clearEvents()}
                >
                    <Text style={styles.buttonText}>이벤트 정리</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.eventList}>
                <Text style={styles.eventTitle}>최근 이벤트:</Text>
                {state.recentEvents.slice(0, 3).map((event) => (
                    <View key={event.id} style={styles.eventItem}>
                        <Text style={styles.eventText}>
                            {event.type} - {event.cameraName} ({Math.round(event.confidence * 100)}%)
                        </Text>
                    </View>
                ))}
            </View>

            {state.error && (
                <Text style={styles.errorText}>오류: {state.error}</Text>
            )}
        </View>
    );
};

// ============================================================================
// 모션 감지 훅 사용 예제
// ============================================================================

export const MotionDetectionHookExample: React.FC = () => {
    const [state, actions] = useMotionDetection();
    const cameraRef = React.useRef<Camera>(null);

    const handleEnableDetection = async () => {
        try {
            await actions.enableDetection();
            Alert.alert('모션 감지 활성화', '모션 감지가 활성화되었습니다.');
        } catch (error) {
            Alert.alert('오류', '모션 감지 활성화에 실패했습니다.');
        }
    };

    const handleStartDetection = async () => {
        try {
            const success = await actions.startDetection(cameraRef);
            if (success) {
                Alert.alert('감지 시작', '모션 감지가 시작되었습니다.');
            } else {
                Alert.alert('오류', '모션 감지 시작에 실패했습니다.');
            }
        } catch (error) {
            Alert.alert('오류', '모션 감지 시작에 실패했습니다.');
        }
    };

    const handleStopDetection = () => {
        actions.stopDetection();
        Alert.alert('감지 중지', '모션 감지가 중지되었습니다.');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>🎯 모션 감지 훅 예제</Text>

            <View style={styles.statusContainer}>
                <Text style={styles.statusText}>
                    활성화: {state.isEnabled ? '✅' : '❌'}
                </Text>
                <Text style={styles.statusText}>
                    감지 중: {state.isDetecting ? '🔴' : '⚪'}
                </Text>
                <Text style={styles.statusText}>
                    민감도: {state.config.sensitivity}%
                </Text>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={handleEnableDetection}
                >
                    <Text style={styles.buttonText}>감지 활성화</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.button}
                    onPress={actions.disableDetection}
                >
                    <Text style={styles.buttonText}>감지 비활성화</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, state.isDetecting && styles.buttonActive]}
                    onPress={state.isDetecting ? handleStopDetection : handleStartDetection}
                >
                    <Text style={styles.buttonText}>
                        {state.isDetecting ? '감지 중지' : '감지 시작'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.button}
                    onPress={() => actions.updateConfig({ sensitivity: 75 })}
                >
                    <Text style={styles.buttonText}>민감도 조정</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.statsContainer}>
                <Text style={styles.statsTitle}>통계:</Text>
                <Text style={styles.statsText}>
                    총 감지: {state.stats.totalDetections}회
                </Text>
                <Text style={styles.statsText}>
                    오늘 감지: {state.stats.todayDetections}회
                </Text>
                <Text style={styles.statsText}>
                    평균 신뢰도: {Math.round(state.stats.averageConfidence * 100)}%
                </Text>
            </View>

            {state.error && (
                <Text style={styles.errorText}>오류: {state.error}</Text>
            )}
        </View>
    );
};

// ============================================================================
// 알림 훅 사용 예제
// ============================================================================

export const NotificationHookExample: React.FC = () => {
    const [state, actions] = useNotification();

    const handleSendNotification = async () => {
        try {
            await actions.sendNotification({
                type: 'motion',
                title: '모션 감지',
                message: '카메라에서 움직임이 감지되었습니다.',
                priority: 'high',
                data: { cameraId: 'camera_001' },
            });
            Alert.alert('알림 전송', '알림이 전송되었습니다.');
        } catch (error) {
            Alert.alert('오류', '알림 전송에 실패했습니다.');
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await actions.markAllAsRead();
            Alert.alert('읽음 처리', '모든 알림이 읽음 처리되었습니다.');
        } catch (error) {
            Alert.alert('오류', '읽음 처리에 실패했습니다.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>🔔 알림 훅 예제</Text>

            <View style={styles.statusContainer}>
                <Text style={styles.statusText}>
                    푸시 권한: {state.permissions.push ? '✅' : '❌'}
                </Text>
                <Text style={styles.statusText}>
                    로컬 권한: {state.permissions.local ? '✅' : '❌'}
                </Text>
                <Text style={styles.statusText}>
                    읽지 않은 알림: {state.unreadCount}개
                </Text>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={actions.requestPermissions}
                >
                    <Text style={styles.buttonText}>권한 요청</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleSendNotification}
                >
                    <Text style={styles.buttonText}>알림 전송</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleMarkAllAsRead}
                >
                    <Text style={styles.buttonText}>모두 읽음 처리</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.button}
                    onPress={() => actions.clearNotifications()}
                >
                    <Text style={styles.buttonText}>알림 정리</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.notificationList}>
                <Text style={styles.notificationTitle}>최근 알림:</Text>
                {state.notifications.slice(0, 3).map((notification) => (
                    <View key={notification.id} style={styles.notificationItem}>
                        <Text style={styles.notificationText}>
                            {notification.title} - {notification.message}
                        </Text>
                        <Text style={styles.notificationTime}>
                            {new Date(notification.timestamp).toLocaleTimeString()}
                        </Text>
                    </View>
                ))}
            </View>

            {state.error && (
                <Text style={styles.errorText}>오류: {state.error}</Text>
            )}
        </View>
    );
};

// ============================================================================
// 뷰어 연결 훅 사용 예제
// ============================================================================

export const ViewerConnectionHookExample: React.FC = () => {
    const [state, actions] = useViewerConnection('viewer_001');
    const [qrData, setQrData] = useState('');
    const [connectionCode, setConnectionCode] = useState('');

    const handleScanQR = async () => {
        if (!qrData.trim()) {
            Alert.alert('오류', 'QR 데이터를 입력해주세요.');
            return;
        }

        try {
            const success = await actions.scanQRCode(qrData);
            if (success) {
                Alert.alert('연결 성공', 'QR 코드 스캔이 완료되었습니다.');
                setQrData('');
            }
        } catch (error) {
            Alert.alert('오류', 'QR 코드 스캔에 실패했습니다.');
        }
    };

    const handleConnectByCode = async () => {
        if (!connectionCode.trim()) {
            Alert.alert('오류', '연결 코드를 입력해주세요.');
            return;
        }

        try {
            const success = await actions.connectByCode(connectionCode);
            if (success) {
                Alert.alert('연결 성공', '연결 코드로 연결이 완료되었습니다.');
                setConnectionCode('');
            }
        } catch (error) {
            Alert.alert('오류', '연결 코드 연결에 실패했습니다.');
        }
    };

    const handleStartWatching = async () => {
        if (!state.connectedCamera) {
            Alert.alert('오류', '먼저 카메라에 연결해주세요.');
            return;
        }

        try {
            await actions.startWatching(state.connectedCamera.id);
            Alert.alert('시청 시작', '스트림 시청이 시작되었습니다.');
        } catch (error) {
            Alert.alert('오류', '스트림 시청 시작에 실패했습니다.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>👁️ 뷰어 연결 훅 예제</Text>

            <View style={styles.statusContainer}>
                <Text style={styles.statusText}>
                    연결 상태: {state.connectionStatus}
                </Text>
                <Text style={styles.statusText}>
                    연결된 카메라: {state.connectedCamera?.name || '없음'}
                </Text>
                <Text style={styles.statusText}>
                    시청 중: {state.isWatching ? '🔴' : '⚪'}
                </Text>
            </View>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="QR 코드 데이터 입력"
                    value={qrData}
                    onChangeText={setQrData}
                    multiline
                />
                <TouchableOpacity
                    style={styles.button}
                    onPress={handleScanQR}
                >
                    <Text style={styles.buttonText}>QR 스캔</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="연결 코드 입력"
                    value={connectionCode}
                    onChangeText={setConnectionCode}
                />
                <TouchableOpacity
                    style={styles.button}
                    onPress={handleConnectByCode}
                >
                    <Text style={styles.buttonText}>코드로 연결</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={actions.refreshAvailableCameras}
                >
                    <Text style={styles.buttonText}>카메라 목록 새로고침</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, state.isWatching && styles.buttonActive]}
                    onPress={state.isWatching ? actions.stopWatching : handleStartWatching}
                >
                    <Text style={styles.buttonText}>
                        {state.isWatching ? '시청 중지' : '시청 시작'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.button}
                    onPress={actions.disconnectFromCamera}
                >
                    <Text style={styles.buttonText}>연결 해제</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.button}
                    onPress={actions.reconnect}
                >
                    <Text style={styles.buttonText}>재연결</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.cameraList}>
                <Text style={styles.cameraTitle}>사용 가능한 카메라:</Text>
                {state.availableCameras.map((camera) => (
                    <View key={camera.id} style={styles.cameraItem}>
                        <Text style={styles.cameraText}>
                            {camera.name} ({camera.status})
                        </Text>
                    </View>
                ))}
            </View>

            {state.error && (
                <Text style={styles.errorText}>오류: {state.error}</Text>
            )}
        </View>
    );
};

// ============================================================================
// 메인 예제 컴포넌트
// ============================================================================

export const HookUsageExamples: React.FC = () => {
    return (
        <ScrollView style={styles.scrollContainer}>
            <Text style={styles.mainTitle}>🎯 훅 사용 예제 모음</Text>

            <CameraHookExample />
            <CameraConnectionHookExample />
            <CameraStreamHookExample />
            <EventHookExample />
            <MotionDetectionHookExample />
            <NotificationHookExample />
            <ViewerConnectionHookExample />
        </ScrollView>
    );
};

// ============================================================================
// 스타일 정의
// ============================================================================

const styles = StyleSheet.create({
    scrollContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 20,
        color: '#333',
    },
    container: {
        backgroundColor: 'white',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#333',
    },
    statusContainer: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    statusText: {
        fontSize: 14,
        marginBottom: 4,
        color: '#666',
    },
    buttonContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    button: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        minWidth: 100,
    },
    buttonActive: {
        backgroundColor: '#FF3B30',
    },
    buttonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 6,
        padding: 12,
        marginBottom: 8,
        fontSize: 14,
    },
    inputContainer: {
        marginBottom: 16,
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 14,
        marginTop: 8,
    },
    qrContainer: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    qrTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    qrText: {
        fontSize: 12,
        color: '#666',
        fontFamily: 'monospace',
    },
    eventList: {
        marginTop: 16,
    },
    eventTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    eventItem: {
        backgroundColor: '#f8f9fa',
        padding: 8,
        borderRadius: 4,
        marginBottom: 4,
    },
    eventText: {
        fontSize: 14,
        color: '#333',
    },
    statsContainer: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        marginTop: 16,
    },
    statsTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    statsText: {
        fontSize: 14,
        marginBottom: 4,
        color: '#666',
    },
    notificationList: {
        marginTop: 16,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    notificationItem: {
        backgroundColor: '#f8f9fa',
        padding: 8,
        borderRadius: 4,
        marginBottom: 4,
    },
    notificationText: {
        fontSize: 14,
        color: '#333',
    },
    notificationTime: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    cameraList: {
        marginTop: 16,
    },
    cameraTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    cameraItem: {
        backgroundColor: '#f8f9fa',
        padding: 8,
        borderRadius: 4,
        marginBottom: 4,
    },
    cameraText: {
        fontSize: 14,
        color: '#333',
    },
}); 