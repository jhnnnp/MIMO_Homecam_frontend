/**
 * ViewerPinCodeScreen - 모던한 PIN 코드 입력 화면
 * 
 * 핵심 기능:
 * - 6자리 PIN 코드 입력
 * - 홈캠과 자동 연결
 * - 깔끔하고 직관적인 UI
 */

import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    Alert,
    Animated,
    Dimensions,
    Platform,
    Pressable,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

import { RootStackParamList } from '@/app/navigation/AppNavigator';
import { logger } from '@/shared/utils/logger';
import { connectToCameraByPin } from '../services/cameraService';
import { signalingService } from '@/shared/services/core/signalingService';

// Constants
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PIN_LENGTH = 6;

// 홈캠 목록과 일치하는 색상 팔레트
const colors = {
    primary: '#007AFF',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#E5E5EA',
    accent: '#F5C572',
} as const;

// Types
type ViewerPinCodeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ViewerPinCode'>;

interface ViewerPinCodeScreenProps {
    navigation: ViewerPinCodeScreenNavigationProp;
}

export default function ViewerPinCodeScreen({ navigation }: ViewerPinCodeScreenProps) {
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const hiddenInputRef = useRef<TextInput>(null);

    // PIN 입력 처리
    const handlePinChange = useCallback((newPin: string) => {
        if (newPin.length <= PIN_LENGTH && /^\d*$/.test(newPin)) {
            setPin(newPin);
            setError('');

            // 6자리 완성 시 자동 연결
            if (newPin.length === PIN_LENGTH) {
                handleConnect(newPin);
            }
        }
    }, []);

    // 홈캠 연결
    const handleConnect = useCallback(async (pinCode: string) => {
        setIsLoading(true);
        setError('');

        try {
            // Haptic feedback
            if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }

            logger.info('[ViewerPinCode] Attempting connection with PIN:', pinCode);

            // 1) 시그널링 서버 연결 보장
            await signalingService.connect();
            const start = Date.now();
            while (signalingService.getConnectionState() !== 'connected' && Date.now() - start < 10000) {
                await new Promise(r => setTimeout(r, 100));
            }
            if (signalingService.getConnectionState() !== 'connected') {
                throw new Error('시그널링 서버 연결 실패');
            }

            // 2) PIN 기반 연결 시그널 전송
            await signalingService.sendMessage({ type: 'qr_connect', data: { connectionId: pinCode } });

            // 3) 실제 등록 API 호출(백엔드 기준에 맞춰 필요 시 유지)
            try { await connectToCameraByPin(pinCode); } catch { /* optional */ }

            // 4) 성공 화면/라이브 이동
            navigation.replace('ViewerDashboard');

        } catch (error: any) {
            logger.error('[ViewerPinCode] Connection failed:', error);

            // 에러 애니메이션
            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
            ]).start();

            if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }

            setError('잘못된 PIN 코드입니다');
            setPin('');
        } finally {
            setIsLoading(false);
        }
    }, [navigation]);

    // 백스페이스 처리
    const handleBackspace = useCallback(() => {
        setPin(prev => prev.slice(0, -1));
        setError('');
    }, []);

    // 초기화
    const handleClear = useCallback(() => {
        setPin('');
        setError('');
    }, []);

    // 키패드 버튼 렌더링
    const renderKeypadButton = useCallback((value: string, onPress: () => void, icon?: string) => (
        <Pressable
            key={value}
            style={({ pressed }) => [
                styles.keypadButton,
                pressed && styles.keypadButtonPressed,
            ]}
            onPress={onPress}
            disabled={isLoading}
        >
            {icon ? (
                <Ionicons name={icon as any} size={24} color={colors.text} />
            ) : (
                <Text style={styles.keypadButtonText}>{value}</Text>
            )}
        </Pressable>
    ), [isLoading]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
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

                    <Text style={styles.headerTitle}>PIN 코드 입력</Text>

                    <Pressable
                        style={({ pressed }) => [
                            styles.headerButton,
                            pressed && styles.headerButtonPressed,
                            { opacity: pin.length === 0 ? 0.3 : 1 }
                        ]}
                        onPress={handleClear}
                        disabled={pin.length === 0}
                    >
                        <Text style={styles.clearText}>초기화</Text>
                    </Pressable>
                </View>

                {/* 메인 컨텐츠 */}
                <View style={styles.content}>
                    {/* 제목 섹션 */}
                    <View style={styles.titleSection}>
                        <Text style={styles.title}>홈캠 연결 코드</Text>
                        <Text style={styles.subtitle}>
                            홈캠에서 생성된 6자리 PIN 코드를 입력하세요
                        </Text>
                    </View>

                    {/* PIN 입력 디스플레이 */}
                    <Animated.View
                        style={[
                            styles.pinContainer,
                            { transform: [{ translateX: shakeAnim }] }
                        ]}
                    >
                        <View style={styles.pinDisplay}>
                            {Array.from({ length: PIN_LENGTH }, (_, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.pinDot,
                                        index < pin.length && styles.pinDotFilled,
                                        error && styles.pinDotError,
                                    ]}
                                >
                                    {index < pin.length && (
                                        <View style={styles.pinDotInner} />
                                    )}
                                </View>
                            ))}
                        </View>

                        {error ? (
                            <Text style={styles.errorText}>{error}</Text>
                        ) : null}

                        {isLoading && (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color={colors.primary} />
                                <Text style={styles.loadingText}>연결 중...</Text>
                            </View>
                        )}
                    </Animated.View>

                    {/* 숫자 키패드 */}
                    <View style={styles.keypad}>
                        <View style={styles.keypadRow}>
                            {renderKeypadButton('1', () => handlePinChange(pin + '1'))}
                            {renderKeypadButton('2', () => handlePinChange(pin + '2'))}
                            {renderKeypadButton('3', () => handlePinChange(pin + '3'))}
                        </View>
                        <View style={styles.keypadRow}>
                            {renderKeypadButton('4', () => handlePinChange(pin + '4'))}
                            {renderKeypadButton('5', () => handlePinChange(pin + '5'))}
                            {renderKeypadButton('6', () => handlePinChange(pin + '6'))}
                        </View>
                        <View style={styles.keypadRow}>
                            {renderKeypadButton('7', () => handlePinChange(pin + '7'))}
                            {renderKeypadButton('8', () => handlePinChange(pin + '8'))}
                            {renderKeypadButton('9', () => handlePinChange(pin + '9'))}
                        </View>
                        <View style={styles.keypadRow}>
                            <View style={styles.keypadButton} />
                            {renderKeypadButton('0', () => handlePinChange(pin + '0'))}
                            {renderKeypadButton('', handleBackspace, 'backspace-outline')}
                        </View>
                    </View>
                </View>

                {/* 숨겨진 TextInput - 키보드 지원용 */}
                <TextInput
                    ref={hiddenInputRef}
                    style={styles.hiddenInput}
                    value={pin}
                    onChangeText={handlePinChange}
                    keyboardType="numeric"
                    maxLength={PIN_LENGTH}
                    autoFocus={false}
                    caretHidden={true}
                />
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    safeArea: {
        flex: 1,
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerButton: {
        padding: 8,
        borderRadius: 8,
        minWidth: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerButtonPressed: {
        backgroundColor: colors.border,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    clearText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.primary,
    },

    // Content
    content: {
        flex: 1,
        paddingHorizontal: 20,
        justifyContent: 'center',
    },

    // Title Section
    titleSection: {
        alignItems: 'center',
        marginBottom: 48,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },

    // PIN Display
    pinContainer: {
        alignItems: 'center',
        marginBottom: 48,
    },
    pinDisplay: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 20,
    },
    pinDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
    },
    pinDotFilled: {
        borderColor: colors.primary,
        backgroundColor: colors.primary,
    },
    pinDotError: {
        borderColor: colors.error,
        backgroundColor: colors.error,
    },
    pinDotInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.surface,
    },
    errorText: {
        fontSize: 14,
        color: colors.error,
        fontWeight: '500',
        textAlign: 'center',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    loadingText: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    },

    // Keypad
    keypad: {
        gap: 16,
        maxWidth: 280,
        alignSelf: 'center',
    },
    keypadRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
    },
    keypadButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.border,
    },
    keypadButtonPressed: {
        backgroundColor: colors.primary,
        transform: [{ scale: 0.95 }],
    },
    keypadButtonText: {
        fontSize: 24,
        fontWeight: '600',
        color: colors.text,
    },

    // Hidden Input
    hiddenInput: {
        position: 'absolute',
        left: -1000,
        opacity: 0,
    },
});