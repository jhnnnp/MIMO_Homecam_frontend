/**
 * APITestScreen - 엔터프라이즈급 API 테스트 도구
 * 
 * Features:
 * - REST API 엔드포인트 테스트
 * - 요청/응답 로깅
 * - 성능 측정
 * - 에러 분석
 * - 토큰 관리
 */

import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
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

type APITestScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'APITest'>;

interface APITestScreenProps {
    navigation: APITestScreenNavigationProp;
}

interface APITest {
    id: string;
    name: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    url: string;
    description: string;
    body?: string;
    headers?: Record<string, string>;
    expectedStatus?: number;
}

interface TestLog {
    id: string;
    timestamp: Date;
    test: APITest;
    status: 'success' | 'error' | 'pending';
    duration?: number;
    response?: any;
    error?: string;
}

export default function APITestScreen({ navigation }: APITestScreenProps) {
    const { getAccessToken } = useAuthStore();

    const [isRunningTests, setIsRunningTests] = useState(false);
    const [testLogs, setTestLogs] = useState<TestLog[]>([]);
    const [selectedTest, setSelectedTest] = useState<APITest | null>(null);
    const [customUrl, setCustomUrl] = useState('');
    const [customBody, setCustomBody] = useState('');
    const [customMethod, setCustomMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');

    const scrollViewRef = useRef<ScrollView>(null);

    // 사전 정의된 API 테스트들
    const predefinedTests: APITest[] = [
        {
            id: 'auth-me',
            name: '사용자 정보',
            method: 'GET',
            url: '/auth/me',
            description: '현재 로그인한 사용자 정보 조회',
            expectedStatus: 200,
        },
        {
            id: 'cameras-list',
            name: '카메라 목록',
            method: 'GET',
            url: '/cameras',
            description: '사용자의 카메라 목록 조회',
            expectedStatus: 200,
        },
        {
            id: 'generate-pin',
            name: 'PIN 코드 생성',
            method: 'POST',
            url: '/cameras/generate-pin',
            description: 'QR/PIN 연결 코드 생성',
            body: JSON.stringify({ cameraId: 'test_camera_001' }, null, 2),
            expectedStatus: 201,
        },
        {
            id: 'camera-register',
            name: '카메라 등록',
            method: 'POST',
            url: '/cameras/register',
            description: '새 카메라 등록',
            body: JSON.stringify({
                name: 'Test Camera',
                deviceId: 'TEST_DEVICE_001',
                location: 'Test Location'
            }, null, 2),
            expectedStatus: 201,
        },
        {
            id: 'logout',
            name: '로그아웃',
            method: 'POST',
            url: '/auth/logout',
            description: '사용자 로그아웃',
            expectedStatus: 200,
        },
    ];

    const addTestLog = useCallback((test: APITest, status: 'success' | 'error' | 'pending', duration?: number, response?: any, error?: string) => {
        const log: TestLog = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            test,
            status,
            duration,
            response,
            error,
        };
        setTestLogs(prev => [log, ...prev]);
    }, []);

    // 단일 API 테스트
    const runSingleTest = useCallback(async (test: APITest) => {
        const startTime = Date.now();
        try {
            addTestLog(test, 'pending');

            const { getApiBaseUrl } = await import('@/app/config');
            const url = `${getApiBaseUrl()}${test.url}`;

            const options: any = {
                method: test.method,
                context: `API Test: ${test.name}`,
                headers: test.headers,
            };

            if (test.body && (test.method === 'POST' || test.method === 'PUT')) {
                options.body = test.body;
            }

            const response = await makeAuthenticatedRequest(url, getAccessToken, options);
            const duration = Date.now() - startTime;

            // 응답 데이터 안전하게 처리
            let safeResponse = response;
            try {
                if (typeof response === 'object' && response !== null) {
                    safeResponse = JSON.parse(JSON.stringify(response));
                }
            } catch {
                safeResponse = { message: 'API 호출 성공', data: 'Response parsing failed' };
            }

            addTestLog(test, 'success', duration, safeResponse);

        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
            addTestLog(test, 'error', duration, undefined, errorMessage);
        }
    }, [getAccessToken, addTestLog]);

    // 전체 테스트 실행
    const runAllTests = useCallback(async () => {
        setIsRunningTests(true);
        setTestLogs([]);

        for (const test of predefinedTests) {
            await runSingleTest(test);
            await new Promise(resolve => setTimeout(resolve, 500)); // 0.5초 간격
        }

        setIsRunningTests(false);
        Alert.alert('테스트 완료', `${predefinedTests.length}개 API 테스트가 완료되었습니다.`);
    }, [predefinedTests, runSingleTest]);

    // 커스텀 API 테스트
    const runCustomTest = useCallback(async () => {
        if (!customUrl.trim()) {
            Alert.alert('오류', 'API URL을 입력해주세요.');
            return;
        }

        const customTest: APITest = {
            id: 'custom',
            name: 'Custom API',
            method: customMethod,
            url: customUrl,
            description: '사용자 정의 API 테스트',
            body: customBody.trim() || undefined,
        };

        await runSingleTest(customTest);
    }, [customUrl, customMethod, customBody, runSingleTest]);

    // 로그 복사
    const copyTestLogs = useCallback(async () => {
        try {
            const logs = testLogs.map(log =>
                `[${log.timestamp.toLocaleTimeString()}] ${log.test.method} ${log.test.url}\n` +
                `Status: ${log.status.toUpperCase()}\n` +
                `Duration: ${log.duration || 0}ms\n` +
                `Response: ${log.response ? JSON.stringify(log.response, null, 2) : 'N/A'}\n` +
                `Error: ${log.error || 'N/A'}\n` +
                '---'
            ).join('\n');

            await Clipboard.setStringAsync(logs);
            Alert.alert('복사 완료', '테스트 로그가 클립보드에 복사되었습니다.');
        } catch (error) {
            Alert.alert('오류', '로그 복사에 실패했습니다.');
        }
    }, [testLogs]);

    const getMethodColor = (method: string) => {
        switch (method) {
            case 'GET': return colors.success;
            case 'POST': return colors.primary;
            case 'PUT': return colors.warning;
            case 'DELETE': return colors.error;
            default: return colors.textSecondary;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success': return 'checkmark-circle';
            case 'error': return 'close-circle';
            case 'pending': return 'time';
            default: return 'help-circle';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success': return colors.success;
            case 'error': return colors.error;
            case 'pending': return colors.warning;
            default: return colors.textSecondary;
        }
    };

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
                    <Text style={styles.headerTitle}>API 테스트</Text>
                    <Pressable
                        style={({ pressed }) => [
                            styles.headerButton,
                            pressed && styles.headerButtonPressed,
                        ]}
                        onPress={copyTestLogs}
                    >
                        <Ionicons name="copy" size={20} color={colors.textSecondary} />
                    </Pressable>
                </View>

                {/* Status Card */}
                <View style={styles.statusCard}>
                    <View style={styles.statusHeader}>
                        <View style={styles.statusInfo}>
                            <View style={styles.statusIndicator}>
                                <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
                                <Text style={styles.statusText}>API 테스트 도구</Text>
                            </View>
                            <Text style={styles.statusSubtext}>
                                {testLogs.length > 0
                                    ? `${testLogs.filter(l => l.status === 'success').length}/${testLogs.length} 성공`
                                    : '테스트 대기 중'
                                }
                            </Text>
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
                            onRefresh={() => setTestLogs([])}
                            tintColor={colors.textSecondary}
                        />
                    }
                >
                    {/* 사전 정의된 API 테스트 */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <LinearGradient
                                colors={[colors.success + '20', colors.primary + '15']}
                                style={styles.cardIcon}
                            >
                                <Ionicons name="server" size={24} color={colors.success} />
                            </LinearGradient>
                            <View style={styles.cardInfo}>
                                <Text style={styles.cardTitle}>사전 정의된 API</Text>
                                <Text style={styles.cardSubtitle}>주요 엔드포인트 테스트</Text>
                            </View>
                        </View>

                        {predefinedTests.map((test, index) => (
                            <Pressable
                                key={test.id}
                                style={({ pressed }) => [
                                    styles.apiTestCard,
                                    pressed && styles.apiTestCardPressed,
                                ]}
                                onPress={() => runSingleTest(test)}
                            >
                                <View style={styles.apiTestHeader}>
                                    <View style={[styles.methodBadge, { backgroundColor: getMethodColor(test.method) }]}>
                                        <Text style={styles.methodText}>{test.method}</Text>
                                    </View>
                                    <Text style={styles.apiTestName}>{test.name}</Text>
                                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                                </View>
                                <Text style={styles.apiTestUrl}>{test.url}</Text>
                                <Text style={styles.apiTestDesc}>{test.description}</Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* 커스텀 API 테스트 */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <LinearGradient
                                colors={[colors.accent + '20', colors.primary + '15']}
                                style={styles.cardIcon}
                            >
                                <Ionicons name="code" size={24} color={colors.accent} />
                            </LinearGradient>
                            <View style={styles.cardInfo}>
                                <Text style={styles.cardTitle}>커스텀 API 테스트</Text>
                                <Text style={styles.cardSubtitle}>사용자 정의 요청</Text>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>HTTP 메서드</Text>
                            <View style={styles.methodSelector}>
                                {(['GET', 'POST', 'PUT', 'DELETE'] as const).map((method) => (
                                    <Pressable
                                        key={method}
                                        style={({ pressed }) => [
                                            styles.methodButton,
                                            customMethod === method && styles.methodButtonActive,
                                            pressed && styles.methodButtonPressed,
                                        ]}
                                        onPress={() => setCustomMethod(method)}
                                    >
                                        <Text style={[
                                            styles.methodButtonText,
                                            customMethod === method && styles.methodButtonTextActive,
                                        ]}>
                                            {method}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>API URL</Text>
                            <TextInput
                                style={styles.urlInput}
                                value={customUrl}
                                onChangeText={setCustomUrl}
                                placeholder="/api/endpoint"
                                placeholderTextColor={colors.textSecondary}
                            />
                        </View>

                        {(customMethod === 'POST' || customMethod === 'PUT') && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Request Body (JSON)</Text>
                                <TextInput
                                    style={styles.bodyInput}
                                    value={customBody}
                                    onChangeText={setCustomBody}
                                    placeholder='{"key": "value"}'
                                    placeholderTextColor={colors.textSecondary}
                                    multiline
                                />
                            </View>
                        )}

                        <Pressable
                            style={({ pressed }) => [
                                styles.actionCard,
                                pressed && styles.actionCardPressed,
                            ]}
                            onPress={runCustomTest}
                        >
                            <LinearGradient
                                colors={[colors.accent, '#F5C572']}
                                style={styles.actionGradient}
                            >
                                <View style={styles.actionIcon}>
                                    <Ionicons name="send" size={20} color="white" />
                                </View>
                                <View style={styles.actionInfo}>
                                    <Text style={styles.actionTitle}>커스텀 테스트 실행</Text>
                                    <Text style={styles.actionSubtitle}>사용자 정의 API 호출</Text>
                                </View>
                            </LinearGradient>
                        </Pressable>
                    </View>

                    {/* 테스트 결과 로그 */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <LinearGradient
                                colors={[colors.textSecondary + '20', colors.primary + '15']}
                                style={styles.cardIcon}
                            >
                                <Ionicons name="list" size={24} color={colors.textSecondary} />
                            </LinearGradient>
                            <View style={styles.cardInfo}>
                                <Text style={styles.cardTitle}>테스트 로그</Text>
                                <Text style={styles.cardSubtitle}>{testLogs.length}개 기록</Text>
                            </View>
                            <Pressable
                                style={styles.clearButton}
                                onPress={() => setTestLogs([])}
                            >
                                <Ionicons name="trash" size={16} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        {testLogs.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
                                <Text style={styles.emptyStateText}>아직 테스트 기록이 없습니다</Text>
                                <Text style={styles.emptyStateSubtext}>API 테스트를 실행해보세요</Text>
                            </View>
                        ) : (
                            <ScrollView
                                ref={scrollViewRef}
                                style={styles.logsList}
                                showsVerticalScrollIndicator={false}
                            >
                                {testLogs.map((log) => (
                                    <Pressable
                                        key={log.id}
                                        style={({ pressed }) => [
                                            styles.logItem,
                                            pressed && styles.logItemPressed,
                                        ]}
                                        onPress={() => {
                                            Alert.alert(
                                                `${log.test.name} 결과`,
                                                `Status: ${log.status}\n` +
                                                `Duration: ${log.duration || 0}ms\n` +
                                                `URL: ${log.test.url}\n\n` +
                                                `Response: ${log.response ? JSON.stringify(log.response, null, 2) : 'N/A'}\n\n` +
                                                `Error: ${log.error || 'N/A'}`
                                            );
                                        }}
                                    >
                                        <View style={styles.logHeader}>
                                            <View style={styles.logLeft}>
                                                <Ionicons
                                                    name={getStatusIcon(log.status)}
                                                    size={16}
                                                    color={getStatusColor(log.status)}
                                                />
                                                <View style={[styles.methodBadge, { backgroundColor: getMethodColor(log.test.method) }]}>
                                                    <Text style={styles.methodText}>{log.test.method}</Text>
                                                </View>
                                                <Text style={styles.logTestName}>{log.test.name}</Text>
                                            </View>
                                            <View style={styles.logRight}>
                                                {log.duration && (
                                                    <Text style={styles.logDuration}>{log.duration}ms</Text>
                                                )}
                                                <Text style={styles.logTime}>
                                                    {log.timestamp.toLocaleTimeString()}
                                                </Text>
                                            </View>
                                        </View>
                                        {log.error && (
                                            <Text style={styles.logError}>{log.error}</Text>
                                        )}
                                    </Pressable>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

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

    // Input Groups
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
    bodyInput: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        padding: spacing.md,
        ...typography.body,
        color: colors.text,
        backgroundColor: colors.background,
        minHeight: 100,
        textAlignVertical: 'top',
    },

    // Method Selector
    methodSelector: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    methodButton: {
        flex: 1,
        padding: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    methodButtonActive: {
        backgroundColor: colors.primary + '15',
        borderColor: colors.primary,
    },
    methodButtonPressed: {
        backgroundColor: colors.border,
    },
    methodButtonText: {
        ...typography.body,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    methodButtonTextActive: {
        color: colors.primary,
    },

    // API Test Cards
    apiTestCard: {
        backgroundColor: colors.background,
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    apiTestCardPressed: {
        backgroundColor: colors.primary + '08',
    },
    apiTestHeader: {
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
    apiTestName: {
        ...typography.bodyLg,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
    },
    apiTestUrl: {
        ...typography.body,
        color: colors.textSecondary,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        marginBottom: spacing.xs,
    },
    apiTestDesc: {
        ...typography.bodySm,
        color: colors.textSecondary,
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

    // Test Logs
    logsList: {
        maxHeight: 400,
        backgroundColor: colors.background,
        borderRadius: radius.md,
        padding: spacing.sm,
    },
    logItem: {
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    logItemPressed: {
        backgroundColor: colors.primary + '08',
    },
    logHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    logLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    logRight: {
        alignItems: 'flex-end',
    },
    logTestName: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
    },
    logDuration: {
        ...typography.bodySm,
        color: colors.textSecondary,
    },
    logTime: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    logError: {
        ...typography.bodySm,
        color: colors.error,
        marginTop: spacing.xs,
    },

    // Clear Button
    clearButton: {
        padding: spacing.sm,
        borderRadius: radius.sm,
        backgroundColor: colors.background,
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing['3xl'],
    },
    emptyStateText: {
        ...typography.bodyLg,
        color: colors.textSecondary,
        marginTop: spacing.md,
        textAlign: 'center',
    },
    emptyStateSubtext: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: spacing.sm,
        textAlign: 'center',
    },
});
