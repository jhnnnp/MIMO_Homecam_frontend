/**
 * WebSocketTestScreen - 엔터프라이즈급 개발자 도구
 * 
 * Features:
 * - WebSocket 연결 테스트
 * - API 엔드포인트 테스트
 * - 데이터베이스 연결 확인
 * - 성능 벤치마크
 * - 실시간 로그 모니터링
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    StatusBar,
    Platform,
    Pressable,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/app/navigation/AppNavigator';
import { colors, spacing, radius, elevation, typography } from '@/design/tokens';
import { useAuthStore } from '@/shared/stores/authStore';
import { makeAuthenticatedRequest } from '@/shared/utils/apiHelpers';
import * as Clipboard from 'expo-clipboard';

type WebSocketTestScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'WebSocketTest'>;

interface WebSocketTestScreenProps {
    navigation: WebSocketTestScreenNavigationProp;
}

interface Message {
    id: string;
    text: string;
    timestamp: Date;
    type: 'sent' | 'received' | 'system' | 'error' | 'success';
    category?: 'websocket' | 'api' | 'database' | 'performance';
}

interface TestResult {
    name: string;
    status: 'success' | 'error' | 'pending';
    duration?: number;
    details?: string;
    timestamp: Date;
}

interface APIEndpoint {
    name: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    url: string;
    description: string;
    body?: string;
}

export default function WebSocketTestScreen({ navigation }: WebSocketTestScreenProps) {
    const { getAccessToken } = useAuthStore();

    // WebSocket 상태
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [serverUrl, setServerUrl] = useState('ws://192.168.0.9:8080');
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');

    // 테스트 상태
    const [testResults, setTestResults] = useState<TestResult[]>([]);
    const [isRunningTests, setIsRunningTests] = useState(false);
    const [selectedTab, setSelectedTab] = useState<'websocket' | 'api' | 'database' | 'performance'>('websocket');

    const wsRef = useRef<WebSocket | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    // API 엔드포인트 목록
    const apiEndpoints: APIEndpoint[] = [
        {
            name: '카메라 목록',
            method: 'GET',
            url: '/cameras',
            description: '사용자의 카메라 목록 조회',
        },
        {
            name: 'PIN 코드 생성',
            method: 'POST',
            url: '/cameras/generate-pin',
            description: 'QR/PIN 연결 코드 생성',
            body: JSON.stringify({ cameraId: 'test_camera_id' }, null, 2),
        },
        {
            name: '사용자 정보',
            method: 'GET',
            url: '/auth/me',
            description: '현재 로그인한 사용자 정보',
        },
        {
            name: '로그아웃',
            method: 'POST',
            url: '/auth/logout',
            description: '사용자 로그아웃',
        },
    ];

    const addMessage = useCallback((text: string, type: 'sent' | 'received' | 'system' | 'error' | 'success', category?: 'websocket' | 'api' | 'database' | 'performance') => {
        const newMessage: Message = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            text,
            timestamp: new Date(),
            type,
            category,
        };
        setMessages(prev => [...prev, newMessage]);
    }, []);

    const addTestResult = useCallback((name: string, status: 'success' | 'error' | 'pending', duration?: number, details?: string) => {
        const result: TestResult = {
            name,
            status,
            duration,
            details,
            timestamp: new Date(),
        };
        setTestResults(prev => [...prev.filter(r => r.name !== name), result]);
    }, []);

    // WebSocket 연결
    const connectWebSocket = useCallback(() => {
        if (isConnected) {
            disconnectWebSocket();
            return;
        }

        try {
            setConnectionStatus('connecting');
            addMessage('WebSocket 연결 시도 중...', 'system', 'websocket');

            const ws = new WebSocket(serverUrl);
            wsRef.current = ws;

            const startTime = Date.now();

            ws.onopen = () => {
                const duration = Date.now() - startTime;
                setIsConnected(true);
                setConnectionStatus('connected');
                addMessage(`WebSocket 연결 성공! (${duration}ms)`, 'success', 'websocket');
                addTestResult('WebSocket 연결', 'success', duration);
            };

            ws.onmessage = (event) => {
                addMessage(`수신: ${event.data}`, 'received', 'websocket');
            };

            ws.onclose = (event) => {
                setIsConnected(false);
                setConnectionStatus('disconnected');
                addMessage(`연결 종료: ${event.code} - ${event.reason || '정상 종료'}`, 'system', 'websocket');
                addTestResult('WebSocket 연결', 'error', undefined, `Code: ${event.code}`);
            };

            ws.onerror = (error) => {
                setConnectionStatus('error');
                addMessage('WebSocket 연결 오류 발생', 'error', 'websocket');
                addTestResult('WebSocket 연결', 'error', undefined, '연결 실패');
            };

        } catch (error) {
            setConnectionStatus('error');
            addMessage('WebSocket 연결 실패', 'error', 'websocket');
            addTestResult('WebSocket 연결', 'error', undefined, error instanceof Error ? error.message : '알 수 없는 오류');
        }
    }, [serverUrl, isConnected, addMessage, addTestResult]);

    const disconnectWebSocket = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
        setConnectionStatus('disconnected');
        addMessage('WebSocket 연결 해제됨', 'system', 'websocket');
    }, [addMessage]);

    // API 테스트
    const testAPIEndpoint = useCallback(async (endpoint: APIEndpoint) => {
        const startTime = Date.now();
        try {
            addMessage(`API 테스트 시작: ${endpoint.method} ${endpoint.url}`, 'system', 'api');
            addTestResult(endpoint.name, 'pending');

            const { getApiBaseUrl } = await import('@/app/config');
            const url = `${getApiBaseUrl()}${endpoint.url}`;

            const options: any = {
                method: endpoint.method,
                context: `API Test: ${endpoint.name}`,
            };

            if (endpoint.body && (endpoint.method === 'POST' || endpoint.method === 'PUT')) {
                options.body = endpoint.body;
            }

            const response = await makeAuthenticatedRequest(url, getAccessToken, options);
            const duration = Date.now() - startTime;

            // 응답 데이터 안전하게 처리
            let responseText = 'API 호출 성공';
            try {
                responseText = typeof response === 'object' ? JSON.stringify(response, null, 2) : String(response);
            } catch {
                responseText = 'API 호출 성공 (응답 파싱 불가)';
            }

            addMessage(`API 성공: ${endpoint.name} (${duration}ms)`, 'success', 'api');
            addMessage(`응답: ${responseText}`, 'received', 'api');
            addTestResult(endpoint.name, 'success', duration, 'API 호출 성공');

        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
            addMessage(`API 실패: ${endpoint.name} - ${errorMessage}`, 'error', 'api');
            addTestResult(endpoint.name, 'error', duration, errorMessage);
        }
    }, [getAccessToken, addMessage, addTestResult]);

    // 전체 테스트 실행
    const runAllTests = useCallback(async () => {
        setIsRunningTests(true);
        setTestResults([]);

        addMessage('=== 전체 시스템 테스트 시작 ===', 'system');

        // 1. WebSocket 테스트
        if (!isConnected) {
            connectWebSocket();
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // 2. API 테스트
        for (const endpoint of apiEndpoints) {
            await testAPIEndpoint(endpoint);
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // 3. 성능 테스트
        await runPerformanceTest();

        addMessage('=== 전체 시스템 테스트 완료 ===', 'system');
        setIsRunningTests(false);
    }, [isConnected, connectWebSocket, testAPIEndpoint, apiEndpoints]);

    // 성능 테스트
    const runPerformanceTest = useCallback(async () => {
        addMessage('성능 테스트 시작...', 'system', 'performance');

        const tests = [
            {
                name: '메모리 사용량',
                test: () => {
                    if (Platform.OS === 'web' && (performance as any).memory) {
                        const memory = (performance as any).memory;
                        return `사용: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB / 할당: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`;
                    }
                    return '메모리 정보 사용 불가';
                }
            },
            {
                name: '렌더링 성능',
                test: () => {
                    const start = performance.now();
                    for (let i = 0; i < 10000; i++) {
                        Math.random();
                    }
                    const end = performance.now();
                    return `10K 연산: ${(end - start).toFixed(2)}ms`;
                }
            },
            {
                name: '네트워크 상태',
                test: () => {
                    return navigator.onLine ? '온라인' : '오프라인';
                }
            }
        ];

        for (const test of tests) {
            try {
                const result = test.test();
                addMessage(`${test.name}: ${result}`, 'success', 'performance');
                addTestResult(test.name, 'success', undefined, result);
            } catch (error) {
                addMessage(`${test.name}: 실패`, 'error', 'performance');
                addTestResult(test.name, 'error', undefined, error instanceof Error ? error.message : '알 수 없는 오류');
            }
        }
    }, [addMessage, addTestResult]);

    // 메시지 전송
    const sendMessage = useCallback(() => {
        if (!inputText.trim() || !isConnected) return;

        try {
            wsRef.current?.send(inputText);
            addMessage(`전송: ${inputText}`, 'sent', 'websocket');
            setInputText('');
        } catch (error) {
            addMessage('메시지 전송 실패', 'error', 'websocket');
        }
    }, [inputText, isConnected, addMessage]);

    // 로그 복사
    const copyLogs = useCallback(async () => {
        try {
            const logs = messages.map(m =>
                `[${m.timestamp.toLocaleTimeString()}] ${m.type.toUpperCase()}: ${m.text}`
            ).join('\n');

            await Clipboard.setStringAsync(logs);
            Alert.alert('복사 완료', '로그가 클립보드에 복사되었습니다.');
        } catch (error) {
            Alert.alert('오류', '로그 복사에 실패했습니다.');
        }
    }, [messages]);

    // 클린업
    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    const getStatusColor = () => {
        switch (connectionStatus) {
            case 'connected': return colors.success;
            case 'connecting': return colors.warning;
            case 'error': return colors.error;
            default: return colors.textSecondary;
        }
    };

    const getStatusText = () => {
        switch (connectionStatus) {
            case 'connected': return '연결됨';
            case 'connecting': return '연결 중...';
            case 'error': return '오류';
            default: return '연결 안됨';
        }
    };

    const TabButton = ({ tab, title, icon }: { tab: typeof selectedTab, title: string, icon: string }) => (
        <Pressable
            style={({ pressed }) => [
                styles.tabButton,
                selectedTab === tab && styles.tabButtonActive,
                pressed && styles.tabButtonPressed,
            ]}
            onPress={() => setSelectedTab(tab)}
        >
            <Ionicons
                name={icon as any}
                size={20}
                color={selectedTab === tab ? colors.primary : colors.textSecondary}
            />
            <Text style={[
                styles.tabButtonText,
                selectedTab === tab && styles.tabButtonTextActive,
            ]}>
                {title}
            </Text>
        </Pressable>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <LinearGradient
                colors={[colors.background, colors.surfaceAlt]}
                style={styles.backgroundGradient}
            />

            <SafeAreaView style={styles.safeArea}>
                {/* Header - 홈캠 목록 스타일 */}
                <View style={styles.header}>
                    <Pressable
                        style={({ pressed }) => [
                            styles.headerButton,
                            pressed && styles.headerButtonPressed,
                        ]}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </Pressable>
                    <Text style={styles.headerTitle}>개발자 도구</Text>
                    <Pressable
                        style={({ pressed }) => [
                            styles.headerButton,
                            pressed && styles.headerButtonPressed,
                        ]}
                        onPress={copyLogs}
                    >
                        <Ionicons name="copy" size={20} color={colors.textSecondary} />
                    </Pressable>
                </View>

                {/* Tab Navigation */}
                <View style={styles.tabContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.tabScrollContent}
                    >
                        <TabButton tab="websocket" title="WebSocket" icon="wifi" />
                        <TabButton tab="api" title="API" icon="server" />
                        <TabButton tab="database" title="Database" icon="library" />
                        <TabButton tab="performance" title="Performance" icon="speedometer" />
                    </ScrollView>
                </View>

                {/* Status Card */}
                <View style={styles.statusCard}>
                    <View style={styles.statusHeader}>
                        <View style={styles.statusInfo}>
                            <View style={styles.statusIndicator}>
                                <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                                <Text style={styles.statusText}>시스템 상태</Text>
                            </View>
                            <Text style={styles.statusSubtext}>{getStatusText()}</Text>
                        </View>
                        <Pressable
                            style={({ pressed }) => [
                                styles.runTestButton,
                                pressed && styles.runTestButtonPressed,
                            ]}
                            onPress={runAllTests}
                            disabled={isRunningTests}
                        >
                            <LinearGradient
                                colors={[colors.primary, '#5AC8FA']}
                                style={styles.runTestGradient}
                            >
                                {isRunningTests ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Ionicons name="play" size={16} color="white" />
                                )}
                                <Text style={styles.runTestText}>
                                    {isRunningTests ? '테스트 중...' : '전체 테스트'}
                                </Text>
                            </LinearGradient>
                        </Pressable>
                    </View>
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.content}
                    refreshControl={
                        <RefreshControl
                            refreshing={false}
                            onRefresh={() => setMessages([])}
                            tintColor={colors.textSecondary}
                        />
                    }
                >
                    {selectedTab === 'websocket' && (
                        <>
                            {/* WebSocket 연결 설정 */}
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <LinearGradient
                                        colors={[colors.primary + '20', colors.accent + '15']}
                                        style={styles.cardIcon}
                                    >
                                        <Ionicons name="wifi" size={24} color={colors.primary} />
                                    </LinearGradient>
                                    <View style={styles.cardInfo}>
                                        <Text style={styles.cardTitle}>WebSocket 연결</Text>
                                        <Text style={styles.cardSubtitle}>실시간 통신 테스트</Text>
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>서버 URL</Text>
                                    <TextInput
                                        style={styles.urlInput}
                                        value={serverUrl}
                                        onChangeText={setServerUrl}
                                        placeholder="ws://192.168.0.9:8080"
                                        placeholderTextColor={colors.textSecondary}
                                    />
                                </View>

                                <Pressable
                                    style={({ pressed }) => [
                                        styles.actionCard,
                                        pressed && styles.actionCardPressed,
                                    ]}
                                    onPress={connectWebSocket}
                                    disabled={connectionStatus === 'connecting'}
                                >
                                    <LinearGradient
                                        colors={isConnected ? [colors.error, '#FF6B6B'] : [colors.success, '#4ECDC4']}
                                        style={styles.actionGradient}
                                    >
                                        <View style={styles.actionIcon}>
                                            <Ionicons
                                                name={isConnected ? "close-circle" : "wifi"}
                                                size={20}
                                                color="white"
                                            />
                                        </View>
                                        <View style={styles.actionInfo}>
                                            <Text style={styles.actionTitle}>
                                                {isConnected ? '연결 해제' : '연결'}
                                            </Text>
                                            <Text style={styles.actionSubtitle}>
                                                {connectionStatus === 'connecting' ? '연결 중...' : '클릭하여 연결 상태 변경'}
                                            </Text>
                                        </View>
                                    </LinearGradient>
                                </Pressable>
                            </View>

                            {/* 빠른 테스트 메시지 */}
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <LinearGradient
                                        colors={[colors.accent + '20', colors.primary + '15']}
                                        style={styles.cardIcon}
                                    >
                                        <Ionicons name="flash" size={24} color={colors.accent} />
                                    </LinearGradient>
                                    <View style={styles.cardInfo}>
                                        <Text style={styles.cardTitle}>빠른 테스트</Text>
                                        <Text style={styles.cardSubtitle}>사전 정의된 메시지 전송</Text>
                                    </View>
                                </View>

                                <View style={styles.quickButtonsGrid}>
                                    {[
                                        { label: 'Ping', message: 'ping' },
                                        { label: 'JSON', message: '{"type": "test", "data": "hello"}' },
                                        { label: '카메라 상태', message: '{"type": "camera_status"}' },
                                        { label: '스트림 시작', message: '{"type": "start_stream", "cameraId": "test"}' },
                                    ].map((item, index) => (
                                        <Pressable
                                            key={index}
                                            style={({ pressed }) => [
                                                styles.quickButton,
                                                pressed && styles.quickButtonPressed,
                                                !isConnected && styles.quickButtonDisabled,
                                            ]}
                                            onPress={() => {
                                                if (isConnected) {
                                                    setInputText(item.message);
                                                    setTimeout(() => sendMessage(), 100);
                                                } else {
                                                    Alert.alert('연결 필요', '먼저 WebSocket에 연결해주세요.');
                                                }
                                            }}
                                            disabled={!isConnected}
                                        >
                                            <Text style={[
                                                styles.quickButtonText,
                                                !isConnected && styles.quickButtonTextDisabled,
                                            ]}>
                                                {item.label}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        </>
                    )}

                    {selectedTab === 'api' && (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <LinearGradient
                                    colors={[colors.success + '20', colors.primary + '15']}
                                    style={styles.cardIcon}
                                >
                                    <Ionicons name="server" size={24} color={colors.success} />
                                </LinearGradient>
                                <View style={styles.cardInfo}>
                                    <Text style={styles.cardTitle}>API 엔드포인트 테스트</Text>
                                    <Text style={styles.cardSubtitle}>REST API 연결 및 응답 확인</Text>
                                </View>
                            </View>

                            {apiEndpoints.map((endpoint, index) => (
                                <Pressable
                                    key={index}
                                    style={({ pressed }) => [
                                        styles.apiEndpointCard,
                                        pressed && styles.apiEndpointCardPressed,
                                    ]}
                                    onPress={() => testAPIEndpoint(endpoint)}
                                >
                                    <View style={styles.apiEndpointHeader}>
                                        <View style={[styles.methodBadge, { backgroundColor: getMethodColor(endpoint.method) }]}>
                                            <Text style={styles.methodText}>{endpoint.method}</Text>
                                        </View>
                                        <Text style={styles.apiEndpointName}>{endpoint.name}</Text>
                                    </View>
                                    <Text style={styles.apiEndpointUrl}>{endpoint.url}</Text>
                                    <Text style={styles.apiEndpointDesc}>{endpoint.description}</Text>
                                </Pressable>
                            ))}
                        </View>
                    )}

                    {selectedTab === 'database' && (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <LinearGradient
                                    colors={[colors.warning + '20', colors.primary + '15']}
                                    style={styles.cardIcon}
                                >
                                    <Ionicons name="library" size={24} color={colors.warning} />
                                </LinearGradient>
                                <View style={styles.cardInfo}>
                                    <Text style={styles.cardTitle}>데이터베이스 테스트</Text>
                                    <Text style={styles.cardSubtitle}>DB 연결 및 쿼리 성능 확인</Text>
                                </View>
                            </View>

                            <Pressable
                                style={({ pressed }) => [
                                    styles.performanceButton,
                                    pressed && styles.performanceButtonPressed,
                                ]}
                                onPress={async () => {
                                    const start = Date.now();
                                    addMessage('DB Health 체크 시작...', 'system', 'database');
                                    addTestResult('DB Health', 'pending');
                                    try {
                                        const { getApiBaseUrl } = await import('@/app/config');
                                        const url = `${getApiBaseUrl()}/health/db`;
                                        const response = await makeAuthenticatedRequest(url, getAccessToken, { method: 'GET', context: 'DB Health' });
                                        const duration = Date.now() - start;
                                        addMessage(`DB 연결 성공 (${duration}ms): ${JSON.stringify(response)}`, 'success', 'database');
                                        addTestResult('DB Health', 'success', duration, '연결 성공');
                                    } catch (error) {
                                        const duration = Date.now() - start;
                                        const msg = error instanceof Error ? error.message : '알 수 없는 오류';
                                        addMessage(`DB 연결 실패 (${duration}ms): ${msg}`, 'error', 'database');
                                        addTestResult('DB Health', 'error', duration, msg);
                                    }
                                }}
                            >
                                <Ionicons name="pulse" size={20} color={colors.warning} />
                                <Text style={styles.performanceButtonText}>DB Health 체크</Text>
                            </Pressable>
                        </View>
                    )}

                    {selectedTab === 'performance' && (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <LinearGradient
                                    colors={[colors.accent + '20', colors.primary + '15']}
                                    style={styles.cardIcon}
                                >
                                    <Ionicons name="speedometer" size={24} color={colors.accent} />
                                </LinearGradient>
                                <View style={styles.cardInfo}>
                                    <Text style={styles.cardTitle}>성능 벤치마크</Text>
                                    <Text style={styles.cardSubtitle}>앱 성능 및 메모리 사용량 측정</Text>
                                </View>
                            </View>

                            <Pressable
                                style={({ pressed }) => [
                                    styles.performanceButton,
                                    pressed && styles.performanceButtonPressed,
                                ]}
                                onPress={runPerformanceTest}
                            >
                                <Ionicons name="analytics" size={20} color={colors.accent} />
                                <Text style={styles.performanceButtonText}>성능 테스트 실행</Text>
                            </Pressable>
                        </View>
                    )}

                    {/* 테스트 결과 */}
                    {testResults.length > 0 && (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <LinearGradient
                                    colors={[colors.success + '20', colors.primary + '15']}
                                    style={styles.cardIcon}
                                >
                                    <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                                </LinearGradient>
                                <View style={styles.cardInfo}>
                                    <Text style={styles.cardTitle}>테스트 결과</Text>
                                    <Text style={styles.cardSubtitle}>
                                        {testResults.filter(r => r.status === 'success').length}/{testResults.length} 성공
                                    </Text>
                                </View>
                            </View>

                            {testResults.map((result, index) => (
                                <View key={index} style={styles.testResultItem}>
                                    <View style={styles.testResultHeader}>
                                        <Ionicons
                                            name={result.status === 'success' ? 'checkmark-circle' : result.status === 'error' ? 'close-circle' : 'time'}
                                            size={16}
                                            color={result.status === 'success' ? colors.success : result.status === 'error' ? colors.error : colors.warning}
                                        />
                                        <Text style={styles.testResultName}>{result.name}</Text>
                                        {result.duration && (
                                            <Text style={styles.testResultDuration}>{result.duration}ms</Text>
                                        )}
                                    </View>
                                    {result.details && (
                                        <Text style={styles.testResultDetails}>{result.details}</Text>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}

                    {/* 메시지 로그 */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <LinearGradient
                                colors={[colors.textSecondary + '20', colors.primary + '15']}
                                style={styles.cardIcon}
                            >
                                <Ionicons name="chatbubble-ellipses" size={24} color={colors.textSecondary} />
                            </LinearGradient>
                            <View style={styles.cardInfo}>
                                <Text style={styles.cardTitle}>실시간 로그</Text>
                                <Text style={styles.cardSubtitle}>{messages.length}개 메시지</Text>
                            </View>
                            <Pressable
                                style={styles.clearButton}
                                onPress={() => setMessages([])}
                            >
                                <Ionicons name="trash" size={16} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        <ScrollView
                            ref={scrollViewRef}
                            style={styles.messagesList}
                            showsVerticalScrollIndicator={false}
                            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                        >
                            {messages.map((message) => (
                                <View key={message.id} style={styles.messageItem}>
                                    <View style={[
                                        styles.messageBubble,
                                        message.type === 'sent' && styles.sentMessage,
                                        message.type === 'received' && styles.receivedMessage,
                                        message.type === 'system' && styles.systemMessage,
                                        message.type === 'error' && styles.errorMessage,
                                        message.type === 'success' && styles.successMessage,
                                    ]}>
                                        <Text style={[
                                            styles.messageText,
                                            (message.type === 'system' || message.type === 'error' || message.type === 'success') && styles.systemMessageText
                                        ]}>
                                            {message.text}
                                        </Text>
                                        <Text style={styles.messageTime}>
                                            {message.timestamp.toLocaleTimeString()}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>

                    {/* 메시지 입력 */}
                    {selectedTab === 'websocket' && (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <LinearGradient
                                    colors={[colors.primary + '20', colors.accent + '15']}
                                    style={styles.cardIcon}
                                >
                                    <Ionicons name="send" size={24} color={colors.primary} />
                                </LinearGradient>
                                <View style={styles.cardInfo}>
                                    <Text style={styles.cardTitle}>메시지 전송</Text>
                                    <Text style={styles.cardSubtitle}>커스텀 메시지 입력</Text>
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.messageInput}
                                    value={inputText}
                                    onChangeText={setInputText}
                                    placeholder="JSON 메시지를 입력하세요..."
                                    placeholderTextColor={colors.textSecondary}
                                    multiline
                                    maxLength={1000}
                                />
                                <TouchableOpacity
                                    style={[styles.sendButton, !isConnected && styles.sendButtonDisabled]}
                                    onPress={sendMessage}
                                    disabled={!isConnected}
                                >
                                    <Ionicons name="send" size={20} color="white" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

// 헬퍼 함수
const getMethodColor = (method: string) => {
    switch (method) {
        case 'GET': return colors.success;
        case 'POST': return colors.primary;
        case 'PUT': return colors.warning;
        case 'DELETE': return colors.error;
        default: return colors.textSecondary;
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    backgroundGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    safeArea: {
        flex: 1,
    },

    // Header - 홈캠 목록 스타일
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerButton: {
        padding: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: colors.background,
        minWidth: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerButtonPressed: {
        backgroundColor: colors.border,
        transform: [{ scale: 0.95 }],
    },
    headerTitle: {
        ...typography.h2,
        color: colors.text,
    },

    // Tab Navigation
    tabContainer: {
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    tabScrollContent: {
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
    },
    tabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.md,
        gap: spacing.xs,
    },
    tabButtonActive: {
        backgroundColor: colors.primary + '15',
    },
    tabButtonPressed: {
        backgroundColor: colors.border,
    },
    tabButtonText: {
        ...typography.body,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    tabButtonTextActive: {
        color: colors.primary,
        fontWeight: '600',
    },

    // Status Card
    statusCard: {
        backgroundColor: colors.surface,
        margin: spacing.lg,
        borderRadius: radius.lg,
        padding: spacing.lg,
        ...elevation['1'],
    },
    statusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusInfo: {
        flex: 1,
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    statusText: {
        ...typography.bodyLg,
        fontWeight: '600',
        color: colors.text,
    },
    statusSubtext: {
        ...typography.body,
        color: colors.textSecondary,
    },
    runTestButton: {
        borderRadius: radius.lg,
        overflow: 'hidden',
    },
    runTestButtonPressed: {
        transform: [{ scale: 0.98 }],
    },
    runTestGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: spacing.sm,
    },
    runTestText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },

    // Content
    scroll: {
        flex: 1,
    },
    content: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing['3xl'],
    },

    // Cards
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        ...elevation['1'],
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    cardIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    cardInfo: {
        flex: 1,
    },
    cardTitle: {
        ...typography.h3,
        color: colors.text,
        marginBottom: 2,
    },
    cardSubtitle: {
        ...typography.body,
        color: colors.textSecondary,
    },

    // Input Group
    inputGroup: {
        marginBottom: spacing.lg,
    },
    inputLabel: {
        ...typography.label,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    urlInput: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        padding: spacing.md,
        ...typography.body,
        color: colors.text,
        backgroundColor: colors.background,
    },

    // Action Cards
    actionCard: {
        borderRadius: radius.lg,
        overflow: 'hidden',
        ...elevation['2'],
    },
    actionCardPressed: {
        transform: [{ scale: 0.98 }],
    },
    actionGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        gap: spacing.md,
    },
    actionIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionInfo: {
        flex: 1,
    },
    actionTitle: {
        ...typography.bodyLg,
        fontWeight: '600',
        color: 'white',
        marginBottom: 2,
    },
    actionSubtitle: {
        ...typography.body,
        color: 'rgba(255,255,255,0.8)',
    },

    // Quick Buttons
    quickButtonsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    quickButton: {
        flex: 1,
        minWidth: '45%',
        padding: spacing.md,
        backgroundColor: colors.primary + '15',
        borderRadius: radius.md,
        alignItems: 'center',
    },
    quickButtonPressed: {
        backgroundColor: colors.primary + '25',
    },
    quickButtonDisabled: {
        backgroundColor: colors.border,
    },
    quickButtonText: {
        ...typography.body,
        fontWeight: '600',
        color: colors.primary,
    },
    quickButtonTextDisabled: {
        color: colors.textSecondary,
    },

    // API Endpoint Cards
    apiEndpointCard: {
        backgroundColor: colors.background,
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    apiEndpointCardPressed: {
        backgroundColor: colors.primary + '08',
    },
    apiEndpointHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
        gap: spacing.sm,
    },
    methodBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 4,
    },
    methodText: {
        fontSize: 10,
        fontWeight: '700',
        color: 'white',
    },
    apiEndpointName: {
        ...typography.bodyLg,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
    },
    apiEndpointUrl: {
        ...typography.body,
        color: colors.textSecondary,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        marginBottom: spacing.xs,
    },
    apiEndpointDesc: {
        ...typography.bodySm,
        color: colors.textSecondary,
    },

    // Test Results
    testResultItem: {
        backgroundColor: colors.background,
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    testResultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    testResultName: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
    },
    testResultDuration: {
        ...typography.bodySm,
        color: colors.textSecondary,
    },
    testResultDetails: {
        ...typography.bodySm,
        color: colors.textSecondary,
        marginTop: spacing.xs,
        marginLeft: 24,
    },

    // Messages
    messagesList: {
        maxHeight: 300,
        backgroundColor: colors.background,
        borderRadius: radius.md,
        padding: spacing.sm,
    },
    messageItem: {
        marginBottom: spacing.sm,
    },
    messageBubble: {
        padding: spacing.md,
        borderRadius: radius.lg,
        maxWidth: '85%',
    },
    sentMessage: {
        backgroundColor: colors.primary,
        alignSelf: 'flex-end',
    },
    receivedMessage: {
        backgroundColor: colors.surfaceAlt,
        alignSelf: 'flex-start',
    },
    systemMessage: {
        backgroundColor: colors.warning + '20',
        alignSelf: 'center',
        maxWidth: '95%',
    },
    errorMessage: {
        backgroundColor: colors.error + '20',
        alignSelf: 'center',
        maxWidth: '95%',
    },
    successMessage: {
        backgroundColor: colors.success + '20',
        alignSelf: 'center',
        maxWidth: '95%',
    },
    messageText: {
        ...typography.body,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    systemMessageText: {
        fontWeight: '600',
    },
    messageTime: {
        ...typography.caption,
        color: colors.textSecondary,
        alignSelf: 'flex-end',
    },

    // Input
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: spacing.sm,
    },
    messageInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.lg,
        padding: spacing.md,
        ...typography.body,
        color: colors.text,
        backgroundColor: colors.background,
        maxHeight: 100,
        minHeight: 44,
    },
    sendButton: {
        backgroundColor: colors.primary,
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: colors.textSecondary,
    },

    // Performance Test
    performanceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accent + '15',
        padding: spacing.lg,
        borderRadius: radius.md,
        gap: spacing.sm,
    },
    performanceButtonPressed: {
        backgroundColor: colors.accent + '25',
    },
    performanceButtonText: {
        ...typography.bodyLg,
        fontWeight: '600',
        color: colors.accent,
    },

    // Clear Button
    clearButton: {
        padding: spacing.sm,
        borderRadius: radius.sm,
        backgroundColor: colors.background,
    },

    // Coming Soon
    comingSoon: {
        ...typography.bodyLg,
        textAlign: 'center',
        color: colors.textSecondary,
        paddingVertical: spacing['2xl'],
    },
});