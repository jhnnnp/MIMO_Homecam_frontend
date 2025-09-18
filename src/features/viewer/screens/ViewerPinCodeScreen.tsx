/**
 * ViewerPinCodeScreen - PIN 코드 입력 화면
 * 
 * 핵심 기능:
 * - 6자리 PIN 코드 입력
 * - 홈캠과 자동 연결
 * - 라이브 스트림으로 이동
 * 
 * 홈캠이 항상 대기 중이므로 PIN만 맞으면 바로 연결
 */

import React, { useState, useCallback, useEffect, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
    Animated,
    Dimensions,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

// Design System
import { spacing, radius } from '@/design/tokens';

// Navigation Types
import { RootStackParamList } from '@/app/navigation/AppNavigator';

// Utils
import { logger } from '@/shared/utils/logger';

// Constants
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PIN_LENGTH = 6;

// 간결한 색상 팔레트
const colors = {
    primary: '#007AFF',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#C6C6C8',
};

// Types
interface PinInputState {
    value: string;
    showError: boolean;
    errorMessage: string;
}

type ViewerPinCodeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ViewerPinCode'>;

interface ViewerPinCodeScreenProps {
    navigation: ViewerPinCodeScreenNavigationProp;
}

const ViewerPinCodeScreen = memo(({ navigation }: ViewerPinCodeScreenProps) => {
    // State Management
    const [pinInput, setPinInput] = useState<PinInputState>({
        value: '',
        showError: false,
        errorMessage: ''
    });
    const [isConnecting, setIsConnecting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Animation Values
    const [shakeAnim] = useState(new Animated.Value(0));
    const [pinBoxAnims] = useState(Array.from({ length: PIN_LENGTH }, () => new Animated.Value(1)));

    // PIN input animation
    useEffect(() => {
        if (pinInput.value.length === PIN_LENGTH) {
            // Animate all boxes when PIN is complete
            Animated.stagger(50,
                pinBoxAnims.map(anim =>
                    Animated.sequence([
                        Animated.timing(anim, {
                            toValue: 1.2,
                            duration: 150,
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim, {
                            toValue: 1,
                            duration: 150,
                            useNativeDriver: true,
                        }),
                    ])
                )
            ).start();

            // Auto-connect when PIN is complete
            setTimeout(() => handleConnect(), 300);
        }
    }, [pinInput.value.length]);

    // Input handling functions
    const handlePinInput = useCallback((digit: string) => {
        if (pinInput.value.length >= PIN_LENGTH) return;

        const newValue = pinInput.value + digit;
        setPinInput({
            value: newValue,
            showError: false,
            errorMessage: ''
        });

        // Haptic feedback
        if (Platform.OS === 'ios' && Haptics) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [pinInput.value]);

    const handlePinDelete = useCallback(() => {
        if (pinInput.value.length === 0) return;

        const newValue = pinInput.value.slice(0, -1);
        setPinInput({
            value: newValue,
            showError: false,
            errorMessage: ''
        });

        if (Platform.OS === 'ios' && Haptics) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [pinInput.value]);

    const clearPinInput = useCallback(() => {
        setPinInput({
            value: '',
            showError: false,
            errorMessage: ''
        });
    }, []);

    // Connection handling
    const handleConnect = useCallback(async () => {
        const pin = pinInput.value;

        if (!pin || pin.length !== PIN_LENGTH) {
            showPinError('PIN 코드는 6자리 숫자여야 합니다.');
            return;
        }

        setIsConnecting(true);

        try {
            logger.info('[ViewerPinCode] Attempting connection with PIN:', pin);

            // TODO: 실제 홈캠 등록 로직 구현
            // const result = await api.post('/cameras/register-with-code', { code: pin, type: 'pin' });

            // Mock 홈캠 등록 - 임시로 2초 후 성공
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 임시 등록 성공 처리
            const mockResult = {
                camera: {
                    id: Date.now(),
                    name: `홈캠 ${pin}`,
                    device_id: `MIMO_${pin}_${Date.now()}`,
                    location: '홈',
                    status: 'online'
                },
                success: true
            };

            if (mockResult.success) {
                // Success handling
                if (Platform.OS === 'ios' && Haptics) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }

                // 성공 상태 표시
                setIsSuccess(true);

                // 1.5초 후 성공 메시지와 함께 대시보드로 이동
                setTimeout(() => {
                    Alert.alert(
                        '등록 성공!',
                        `홈캠 "${mockResult.camera.name}"이 성공적으로 등록되었습니다.\n\n지금 바로 라이브 스트리밍을 시청하시겠습니까?`,
                        [
                            {
                                text: '나중에',
                                style: 'cancel',
                                onPress: () => {
                                    navigation.replace('ViewerDashboard');
                                }
                            },
                            {
                                text: '지금 시청하기',
                                onPress: () => {
                                    navigation.replace('ViewerDashboard');
                                    // 잠시 후 라이브 스트림으로 이동
                                    setTimeout(() => {
                                        navigation.navigate('LiveStream', {
                                            cameraId: mockResult.camera.device_id,
                                            cameraName: mockResult.camera.name,
                                            ipAddress: '192.168.1.100',
                                            quality: '1080p'
                                        });
                                    }, 500);
                                }
                            }
                        ]
                    );
                }, 1500);
            }
        } catch (error: any) {
            logger.error('[ViewerPinCode] Connection failed:', error);

            // Error handling
            if (Platform.OS === 'ios' && Haptics) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }

            showPinError(error.message || '연결에 실패했습니다. PIN 코드를 다시 확인해주세요.');
        } finally {
            setIsConnecting(false);
        }
    }, [pinInput.value, navigation]);

    const showPinError = useCallback((message: string) => {
        setPinInput(prev => ({
            ...prev,
            showError: true,
            errorMessage: message
        }));

        // Shake animation
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();

        // Clear error after 3 seconds
        setTimeout(() => {
            setPinInput(prev => ({
                ...prev,
                showError: false,
                errorMessage: ''
            }));
        }, 3000);
    }, []);

    // Loading state
    if (isConnecting) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.loadingContainer}>
                        <Animated.View style={styles.loadingIcon}>
                            <Ionicons
                                name="videocam"
                                size={64}
                                color={colors.primary}
                            />
                        </Animated.View>
                        <Text style={styles.loadingTitle}>홈캠 등록 중...</Text>
                        <Text style={styles.loadingSubtitle}>PIN: {pinInput.value}</Text>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => {
                                setIsConnecting(false);
                                clearPinInput();
                            }}
                        >
                            <Text style={styles.cancelButtonText}>취소</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    // Success state
    if (isSuccess) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.successContainer}>
                        <Animated.View style={styles.successIcon}>
                            <Ionicons
                                name="checkmark-circle"
                                size={80}
                                color={colors.success}
                            />
                        </Animated.View>
                        <Text style={styles.successTitle}>등록 성공!</Text>
                        <Text style={styles.successSubtitle}>
                            홈캠이 성공적으로 등록되었습니다{'\n'}잠시 후 홈캠 목록으로 이동합니다
                        </Text>

                        {/* PIN 번호 표시 */}
                        <View style={styles.successPinDisplay}>
                            <Text style={styles.successPinLabel}>등록된 PIN</Text>
                            <Text style={styles.successPinNumber}>{pinInput.value}</Text>
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>PIN 코드 입력</Text>
                    <TouchableOpacity
                        style={styles.clearButton}
                        onPress={clearPinInput}
                        disabled={pinInput.value.length === 0}
                    >
                        <Text style={[
                            styles.clearButtonText,
                            { opacity: pinInput.value.length === 0 ? 0.3 : 1 }
                        ]}>
                            초기화
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* PIN Input Display */}
                <View style={styles.pinContainer}>
                    <Text style={styles.pinLabel}>홈캠 연결 코드</Text>
                    <Text style={styles.pinSubtitle}>홈캠에서 생성된 6자리 PIN 코드를 입력하세요</Text>

                    <Animated.View
                        style={[
                            styles.pinDisplay,
                            { transform: [{ translateX: shakeAnim }] }
                        ]}
                    >
                        {Array.from({ length: PIN_LENGTH }, (_, index) => (
                            <Animated.View
                                key={index}
                                style={[
                                    styles.pinBox,
                                    {
                                        backgroundColor: index < pinInput.value.length
                                            ? colors.primary
                                            : colors.surface,
                                        borderColor: pinInput.showError
                                            ? colors.error
                                            : (index < pinInput.value.length ? colors.primary : colors.border),
                                        transform: [{ scale: pinBoxAnims[index] }]
                                    }
                                ]}
                            >
                                <Text style={[
                                    styles.pinBoxText,
                                    {
                                        color: index < pinInput.value.length
                                            ? 'white'
                                            : colors.textSecondary
                                    }
                                ]}>
                                    {index < pinInput.value.length ? '●' : '○'}
                                </Text>
                            </Animated.View>
                        ))}
                    </Animated.View>

                    {pinInput.showError && (
                        <View style={styles.errorContainer}>
                            <Ionicons name="alert-circle" size={16} color={colors.error} />
                            <Text style={styles.errorText}>{pinInput.errorMessage}</Text>
                        </View>
                    )}
                </View>

                {/* Numeric Keypad */}
                <View style={styles.keypadContainer}>
                    <View style={styles.keypadGrid}>
                        {/* Numbers 1-9 */}
                        {Array.from({ length: 9 }, (_, i) => (
                            <TouchableOpacity
                                key={i + 1}
                                style={styles.keypadButton}
                                onPress={() => handlePinInput((i + 1).toString())}
                                activeOpacity={0.7}
                                disabled={isConnecting || pinInput.value.length >= PIN_LENGTH}
                            >
                                <Text style={styles.keypadButtonText}>{i + 1}</Text>
                            </TouchableOpacity>
                        ))}

                        {/* Empty space */}
                        <View style={styles.keypadButton} />

                        {/* Zero button */}
                        <TouchableOpacity
                            style={styles.keypadButton}
                            onPress={() => handlePinInput('0')}
                            activeOpacity={0.7}
                            disabled={isConnecting || pinInput.value.length >= PIN_LENGTH}
                        >
                            <Text style={styles.keypadButtonText}>0</Text>
                        </TouchableOpacity>

                        {/* Delete button */}
                        <TouchableOpacity
                            style={styles.keypadButton}
                            onPress={handlePinDelete}
                            activeOpacity={0.7}
                            disabled={isConnecting || pinInput.value.length === 0}
                        >
                            <Ionicons
                                name="backspace"
                                size={24}
                                color={pinInput.value.length === 0 ? colors.border : colors.text}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
});

ViewerPinCodeScreen.displayName = 'ViewerPinCodeScreen';

export default ViewerPinCodeScreen;

// 간결한 스타일
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    safeArea: {
        flex: 1,
    },
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
    backButton: {
        padding: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: colors.background,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    clearButton: {
        padding: spacing.sm,
    },
    clearButtonText: {
        fontSize: 16,
        color: colors.primary,
        fontWeight: '500',
    },

    // PIN Input
    pinContainer: {
        alignItems: 'center',
        padding: spacing.lg,
        marginTop: spacing.xl,
    },
    pinLabel: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    pinSubtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 22,
    },
    pinDisplay: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        gap: spacing.sm,
    },
    pinBox: {
        width: 50,
        height: 50,
        borderRadius: radius.lg,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    pinBoxText: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${colors.error}15`,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.md,
        marginTop: spacing.md,
    },
    errorText: {
        fontSize: 14,
        color: colors.error,
        marginLeft: spacing.xs,
        fontWeight: '500',
    },

    // Keypad
    keypadContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },
    keypadGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: spacing.md,
    },
    keypadButton: {
        width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.md * 4) / 3,
        height: 70,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    keypadButtonText: {
        fontSize: 24,
        fontWeight: '600',
        color: colors.text,
    },

    // Loading State
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    loadingIcon: {
        marginBottom: spacing.xl,
    },
    loadingTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    loadingSubtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        marginBottom: spacing.xl,
    },
    cancelButton: {
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cancelButtonText: {
        fontSize: 16,
        color: colors.text,
        fontWeight: '500',
    },

    // Success State
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    successIcon: {
        marginBottom: spacing.xl,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.success,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    successSubtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        marginBottom: spacing.xl,
        textAlign: 'center',
        lineHeight: 22,
    },
    successPinDisplay: {
        backgroundColor: colors.surface,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xl,
        borderRadius: radius.lg,
        borderWidth: 2,
        borderColor: colors.success,
        alignItems: 'center',
        elevation: 2,
        shadowColor: colors.success,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    successPinLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
        fontWeight: '500',
    },
    successPinNumber: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.success,
        letterSpacing: 4,
    },
});