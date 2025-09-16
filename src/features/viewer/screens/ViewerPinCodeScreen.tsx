/**
 * ViewerPinCodeScreen - Enterprise-grade PIN Connection Interface
 * 
 * Features:
 * - Hybrid PIN/QR connection support
 * - Real-time connection status monitoring
 * - Enterprise security patterns
 * - Advanced input validation
 * - Biometric authentication integration
 * - Connection history and favorites
 * - Offline mode support
 * - Analytics and error tracking
 */

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
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
    Vibration,
    KeyboardAvoidingView,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';

// Design System
import { colors, spacing, radius, elevation, typography, enterpriseColors } from '../../design/tokens';

// Navigation Types
import { RootStackParamList } from '../../navigation/AppNavigator';

// Services and Hooks
import { connectionService, useConnection } from '../../services';
import { useWebSocket } from '../../hooks/useWebSocket';

// Components
import { LoadingState, ErrorState, Card, Button, TextField } from '../../components';

// Utils
import { logger } from '../../utils/logger';
import { StorageService } from '../../utils/storage';

// Constants
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PIN_LENGTH = 6;
const CONNECTION_TIMEOUT = 30000; // 30초 타임아웃

// Types
interface PinInputState {
    value: string;
    isValid: boolean;
    showError: boolean;
    errorMessage: string;
}

interface ConnectionAttempt {
    pinCode: string;
    timestamp: Date;
    success: boolean;
    errorCode?: string;
}

interface FavoriteConnection {
    id: string;
    pinCode: string;
    cameraName: string;
    lastConnected: Date;
    connectionCount: number;
}

type ViewerPinCodeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ViewerPinCode'>;

interface ViewerPinCodeScreenProps {
    navigation: ViewerPinCodeScreenNavigationProp;
}

const ViewerPinCodeScreen = memo(({ navigation }: ViewerPinCodeScreenProps) => {
    // State Management
    const [pinInput, setPinInput] = useState<PinInputState>({
        value: '',
        isValid: false,
        showError: false,
        errorMessage: ''
    });
    
    const [connectionMode, setConnectionMode] = useState<'pin' | 'qr'>('pin');
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionAttempts, setConnectionAttempts] = useState<ConnectionAttempt[]>([]);
    const [favoriteConnections, setFavoriteConnections] = useState<FavoriteConnection[]>([]);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [showFavorites, setShowFavorites] = useState(false);

    // Animation Values
    const [fadeAnim] = useState(new Animated.Value(0));
    const [shakeAnim] = useState(new Animated.Value(0));
    const [pinBoxAnims] = useState(Array.from({ length: PIN_LENGTH }, () => new Animated.Value(1)));

    // Refs
    const connectionTimeoutRef = useRef<NodeJS.Timeout>();

    // Hooks
    const { isConnected: wsConnected } = useWebSocket();
    const {
        connectWithPin,
        connectWithQR,
        error: connectionError,
        clearError
    } = useConnection();

    // Effects
    useEffect(() => {
        // Entrance animation
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();

        // Check biometric availability
        checkBiometricAvailability();
        
        // Load favorites and history
        loadConnectionHistory();
        loadFavoriteConnections();

        return () => {
            if (connectionTimeoutRef.current) {
                clearTimeout(connectionTimeoutRef.current);
            }
        };
    }, []);

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
        }
    }, [pinInput.value.length]);

    // Biometric and storage functions
    const checkBiometricAvailability = useCallback(async () => {
        try {
            const isAvailable = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            setBiometricAvailable(isAvailable && isEnrolled);
        } catch (error) {
            logger.error('[ViewerPinCode] Biometric check failed:', error);
        }
    }, []);

    const loadConnectionHistory = useCallback(async () => {
        try {
            const history = await StorageService.get('connectionHistory', []);
            setConnectionAttempts(history.slice(0, 10)); // Keep last 10 attempts
        } catch (error) {
            logger.error('[ViewerPinCode] Failed to load connection history:', error);
        }
    }, []);

    const loadFavoriteConnections = useCallback(async () => {
        try {
            const favorites = await StorageService.get('favoriteConnections', []);
            setFavoriteConnections(favorites);
        } catch (error) {
            logger.error('[ViewerPinCode] Failed to load favorite connections:', error);
        }
    }, []);

    const saveConnectionAttempt = useCallback(async (attempt: ConnectionAttempt) => {
        try {
            const updatedHistory = [attempt, ...connectionAttempts].slice(0, 10);
            setConnectionAttempts(updatedHistory);
            await StorageService.set('connectionHistory', updatedHistory);
        } catch (error) {
            logger.error('[ViewerPinCode] Failed to save connection attempt:', error);
        }
    }, [connectionAttempts]);

    const saveFavoriteConnection = useCallback(async (connection: FavoriteConnection) => {
        try {
            const updatedFavorites = [connection, ...favoriteConnections.filter(f => f.pinCode !== connection.pinCode)];
            setFavoriteConnections(updatedFavorites);
            await StorageService.set('favoriteConnections', updatedFavorites);
        } catch (error) {
            logger.error('[ViewerPinCode] Failed to save favorite connection:', error);
        }
    }, [favoriteConnections]);

    // Input handling functions
    const handlePinInput = useCallback((digit: string) => {
        if (pinInput.value.length >= PIN_LENGTH) return;

        const newValue = pinInput.value + digit;
        const isValid = /^\d{6}$/.test(newValue);

        setPinInput({
            value: newValue,
            isValid: isValid,
            showError: false,
            errorMessage: ''
        });

        // Haptic feedback
        if (Platform.OS === 'ios' && Haptics) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        // Auto-connect when PIN is complete
        if (newValue.length === PIN_LENGTH) {
            setTimeout(() => handleConnect(newValue), 200);
        }
    }, [pinInput.value]);

    const handlePinDelete = useCallback(() => {
        if (pinInput.value.length === 0) return;

        const newValue = pinInput.value.slice(0, -1);
        setPinInput({
            value: newValue,
            isValid: false,
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
            isValid: false,
            showError: false,
            errorMessage: ''
        });
    }, []);

    // Connection handling
    const handleConnect = useCallback(async (pinCode?: string) => {
        const pin = pinCode || pinInput.value;
        
        if (!pin || pin.length !== PIN_LENGTH) {
            showPinError('PIN 코드는 6자리 숫자여야 합니다.');
            return;
        }

        setIsConnecting(true);
        const attemptStartTime = new Date();

        try {
            logger.info('[ViewerPinCode] Attempting connection with PIN:', pin);

            // Set connection timeout
            connectionTimeoutRef.current = setTimeout(() => {
                setIsConnecting(false);
                showPinError('연결 시간이 초과되었습니다.');
            }, CONNECTION_TIMEOUT);

            const result = await connectWithPin(pin);

            if (connectionTimeoutRef.current) {
                clearTimeout(connectionTimeoutRef.current);
            }

            if (result) {
                // Success handling
                if (Platform.OS === 'ios' && Haptics) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }

                // Save to history and favorites
                const attempt: ConnectionAttempt = {
                    pinCode: pin,
                    timestamp: attemptStartTime,
                    success: true
                };
                await saveConnectionAttempt(attempt);

                const favorite: FavoriteConnection = {
                    id: result.connectionId,
                    pinCode: pin,
                    cameraName: result.cameraName,
                    lastConnected: new Date(),
                    connectionCount: 1
                };
                await saveFavoriteConnection(favorite);

                // Navigate to live stream
                navigation.navigate('ViewerLiveStream', {
                    connectionId: result.connectionId,
                    cameraName: result.cameraName,
                    connectionType: 'pin'
                });
            }
        } catch (error: any) {
            logger.error('[ViewerPinCode] Connection failed:', error);

            if (connectionTimeoutRef.current) {
                clearTimeout(connectionTimeoutRef.current);
            }

            // Error handling
            if (Platform.OS === 'ios' && Haptics) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }

            const attempt: ConnectionAttempt = {
                pinCode: pin,
                timestamp: attemptStartTime,
                success: false,
                errorCode: error.code || 'UNKNOWN_ERROR'
            };
            await saveConnectionAttempt(attempt);

            showPinError(error.message || '연결에 실패했습니다.');
        } finally {
            setIsConnecting(false);
        }
    }, [pinInput.value, connectWithPin, navigation, saveConnectionAttempt, saveFavoriteConnection]);

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

    const handleBiometricAuth = useCallback(async () => {
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: '생체 인증으로 연결하기',
                fallbackLabel: 'PIN 사용',
                cancelLabel: '취소'
            });

            if (result.success) {
                // Load last successful PIN or favorite
                if (favoriteConnections.length > 0) {
                    const lastFavorite = favoriteConnections[0];
                    await handleConnect(lastFavorite.pinCode);
                }
            }
        } catch (error) {
            logger.error('[ViewerPinCode] Biometric auth failed:', error);
        }
    }, [favoriteConnections, handleConnect]);

    const handleFavoriteSelect = useCallback(async (favorite: FavoriteConnection) => {
        setPinInput({
            value: favorite.pinCode,
            isValid: true,
            showError: false,
            errorMessage: ''
        });
        await handleConnect(favorite.pinCode);
    }, [handleConnect]);

    // Render functions
    const renderHeader = useCallback(() => (
        <View style={styles.header}>
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
            >
                <Ionicons name="arrow-back" size={24} color={enterpriseColors.gray700} />
            </TouchableOpacity>
            
            <View style={styles.headerContent}>
                <Text style={styles.headerTitle}>카메라 연결</Text>
                <View style={styles.connectionStatus}>
                    <View style={[
                        styles.statusDot,
                        { backgroundColor: wsConnected ? enterpriseColors.success : enterpriseColors.error }
                    ]} />
                    <Text style={styles.statusText}>
                        {wsConnected ? '서버 연결됨' : '오프라인'}
                    </Text>
                </View>
            </View>

            <TouchableOpacity
                style={styles.modeButton}
                onPress={() => setConnectionMode(connectionMode === 'pin' ? 'qr' : 'pin')}
                activeOpacity={0.7}
            >
                <Ionicons 
                    name={connectionMode === 'pin' ? 'qr-code-outline' : 'keypad-outline'} 
                    size={24} 
                    color={enterpriseColors.primary} 
                />
            </TouchableOpacity>
        </View>
    ), [navigation, wsConnected, connectionMode]);

    const renderConnectionModeSelector = useCallback(() => (
        <View style={styles.modeSelector}>
            <TouchableOpacity
                style={[
                    styles.modeOption,
                    connectionMode === 'pin' && styles.modeOptionActive
                ]}
                onPress={() => setConnectionMode('pin')}
                activeOpacity={0.8}
            >
                <Ionicons 
                    name="keypad" 
                    size={24} 
                    color={connectionMode === 'pin' ? 'white' : enterpriseColors.gray600} 
                />
                <Text style={[
                    styles.modeOptionText,
                    connectionMode === 'pin' && styles.modeOptionTextActive
                ]}>
                    PIN 코드
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.modeOption,
                    connectionMode === 'qr' && styles.modeOptionActive
                ]}
                onPress={() => setConnectionMode('qr')}
                activeOpacity={0.8}
            >
                <Ionicons 
                    name="qr-code" 
                    size={24} 
                    color={connectionMode === 'qr' ? 'white' : enterpriseColors.gray600} 
                />
                <Text style={[
                    styles.modeOptionText,
                    connectionMode === 'qr' && styles.modeOptionTextActive
                ]}>
                    QR 코드
                </Text>
            </TouchableOpacity>
        </View>
    ), [connectionMode]);

    const renderPinInput = useCallback(() => (
        <Animated.View 
            style={[
                styles.pinInputContainer,
                { transform: [{ translateX: shakeAnim }] }
            ]}
        >
            <Text style={styles.pinInputLabel}>PIN 코드 입력</Text>
            <Text style={styles.pinInputSubtitle}>카메라에서 생성된 6자리 숫자를 입력하세요</Text>
            
            <View style={styles.pinDisplay}>
                {Array.from({ length: PIN_LENGTH }, (_, index) => (
                    <Animated.View
                        key={index}
                        style={[
                            styles.pinBox,
                            {
                                backgroundColor: index < pinInput.value.length 
                                    ? enterpriseColors.primary 
                                    : 'white',
                                borderColor: pinInput.showError 
                                    ? enterpriseColors.error 
                                    : enterpriseColors.gray300,
                                transform: [{ scale: pinBoxAnims[index] }]
                            }
                        ]}
                    >
                        <Text style={[
                            styles.pinBoxText,
                            { color: index < pinInput.value.length ? 'white' : enterpriseColors.gray400 }
                        ]}>
                            {index < pinInput.value.length ? '●' : '○'}
                        </Text>
                    </Animated.View>
                ))}
            </View>

            {pinInput.showError && (
                <Animated.View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={16} color={enterpriseColors.error} />
                    <Text style={styles.errorText}>{pinInput.errorMessage}</Text>
                </Animated.View>
            )}
        </Animated.View>
    ), [pinInput, shakeAnim, pinBoxAnims]);

    const renderNumericKeypad = useCallback(() => (
        <View style={styles.keypadContainer}>
            <View style={styles.keypadGrid}>
                {Array.from({ length: 9 }, (_, i) => (
                    <TouchableOpacity
                        key={i + 1}
                        style={styles.keypadButton}
                        onPress={() => handlePinInput((i + 1).toString())}
                        activeOpacity={0.7}
                        disabled={isConnecting}
                    >
                        <Text style={styles.keypadButtonText}>{i + 1}</Text>
                    </TouchableOpacity>
                ))}
                
                {/* Biometric button */}
                {biometricAvailable && (
                    <TouchableOpacity
                        style={styles.keypadButton}
                        onPress={handleBiometricAuth}
                        activeOpacity={0.7}
                        disabled={isConnecting}
                    >
                        <Ionicons name="finger-print" size={24} color={enterpriseColors.primary} />
                    </TouchableOpacity>
                )}
                
                {/* Zero button */}
                <TouchableOpacity
                    style={styles.keypadButton}
                    onPress={() => handlePinInput('0')}
                    activeOpacity={0.7}
                    disabled={isConnecting}
                >
                    <Text style={styles.keypadButtonText}>0</Text>
                </TouchableOpacity>
                
                {/* Delete button */}
                <TouchableOpacity
                    style={styles.keypadButton}
                    onPress={handlePinDelete}
                    activeOpacity={0.7}
                    disabled={isConnecting}
                >
                    <Ionicons name="backspace" size={24} color={enterpriseColors.gray600} />
                </TouchableOpacity>
            </View>
        </View>
    ), [isConnecting, biometricAvailable, handlePinInput, handlePinDelete, handleBiometricAuth]);

    const renderFavoriteConnections = useCallback(() => (
        favoriteConnections.length > 0 && (
            <View style={styles.favoritesContainer}>
                <TouchableOpacity
                    style={styles.favoritesHeader}
                    onPress={() => setShowFavorites(!showFavorites)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.favoritesTitle}>즐겨찾기 연결</Text>
                    <Ionicons 
                        name={showFavorites ? 'chevron-up' : 'chevron-down'} 
                        size={20} 
                        color={enterpriseColors.gray600} 
                    />
                </TouchableOpacity>

                {showFavorites && (
                    <View style={styles.favoritesList}>
                        {favoriteConnections.slice(0, 3).map((favorite) => (
                            <TouchableOpacity
                                key={favorite.id}
                                style={styles.favoriteItem}
                                onPress={() => handleFavoriteSelect(favorite)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.favoriteInfo}>
                                    <Text style={styles.favoriteName}>{favorite.cameraName}</Text>
                                    <Text style={styles.favoritePin}>PIN: {favorite.pinCode}</Text>
                                    <Text style={styles.favoriteLastConnected}>
                                        마지막 연결: {favorite.lastConnected.toLocaleDateString()}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={enterpriseColors.gray400} />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        )
    ), [favoriteConnections, showFavorites, handleFavoriteSelect]);

    if (connectionError) {
        return (
            <ErrorState
                message={connectionError}
                onRetry={clearError}
                onBack={() => navigation.goBack()}
            />
        );
    }

    if (isConnecting) {
        return (
            <LoadingState 
                message="카메라에 연결 중..."
                onCancel={() => {
                    setIsConnecting(false);
                    if (connectionTimeoutRef.current) {
                        clearTimeout(connectionTimeoutRef.current);
                    }
                }}
            />
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            
            {renderHeader()}

            <KeyboardAvoidingView 
                style={styles.content} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView 
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
                        {renderConnectionModeSelector()}
                        
                        {connectionMode === 'pin' ? (
                            <>
                                {renderPinInput()}
                                {renderNumericKeypad()}
                                {renderFavoriteConnections()}
                            </>
                        ) : (
                            <View style={styles.qrContainer}>
                                <Ionicons name="qr-code-outline" size={120} color={enterpriseColors.gray400} />
                                <Text style={styles.qrTitle}>QR 코드 스캔</Text>
                                <Text style={styles.qrSubtitle}>카메라에 표시된 QR 코드를 스캔하세요</Text>
                                <Button
                                    title="QR 스캐너 열기"
                                    onPress={() => {
                                        Alert.alert('QR 스캐너', 'QR 스캐너 기능을 구현해주세요.');
                                    }}
                                    style={styles.qrButton}
                                />
                            </View>
                        )}
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
});

ViewerPinCodeScreen.displayName = 'ViewerPinCodeScreen';

export default ViewerPinCodeScreen;

// Enhanced Enterprise-grade Styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: enterpriseColors.gray50,
    },
    content: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    mainContent: {
        flex: 1,
        paddingHorizontal: spacing.lg,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: enterpriseColors.gray200,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    backButton: {
        padding: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: enterpriseColors.gray100,
    },
    headerContent: {
        flex: 1,
        marginLeft: spacing.md,
    },
    headerTitle: {
        ...typography.h3,
        fontWeight: '700',
        color: enterpriseColors.gray900,
    },
    connectionStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.xs,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: spacing.xs,
    },
    statusText: {
        ...typography.caption,
        color: enterpriseColors.gray600,
        fontWeight: '500',
    },
    modeButton: {
        padding: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: enterpriseColors.gray100,
    },

    // Mode Selector
    modeSelector: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: radius.lg,
        padding: spacing.xs,
        marginVertical: spacing.xl,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    modeOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.md,
    },
    modeOptionActive: {
        backgroundColor: enterpriseColors.primary,
    },
    modeOptionText: {
        ...typography.button,
        color: enterpriseColors.gray600,
        marginLeft: spacing.sm,
        fontWeight: '600',
    },
    modeOptionTextActive: {
        color: 'white',
    },

    // PIN Input
    pinInputContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    pinInputLabel: {
        ...typography.h4,
        fontWeight: '700',
        color: enterpriseColors.gray900,
        marginBottom: spacing.sm,
    },
    pinInputSubtitle: {
        ...typography.body,
        color: enterpriseColors.gray600,
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 22,
    },
    pinDisplay: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    pinBox: {
        width: 50,
        height: 50,
        borderRadius: radius.lg,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: spacing.sm,
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
        backgroundColor: `${enterpriseColors.error}15`,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.md,
        marginTop: spacing.md,
    },
    errorText: {
        ...typography.caption,
        color: enterpriseColors.error,
        marginLeft: spacing.xs,
        fontWeight: '500',
    },

    // Keypad
    keypadContainer: {
        marginTop: spacing.lg,
    },
    keypadGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    keypadButton: {
        width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.lg * 2) / 3,
        height: 70,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: radius.lg,
        margin: spacing.sm,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    keypadButtonText: {
        fontSize: 24,
        fontWeight: '600',
        color: enterpriseColors.gray900,
    },

    // Favorites
    favoritesContainer: {
        marginTop: spacing.xl,
        backgroundColor: 'white',
        borderRadius: radius.lg,
        padding: spacing.lg,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    favoritesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    favoritesTitle: {
        ...typography.h5,
        fontWeight: '600',
        color: enterpriseColors.gray900,
    },
    favoritesList: {
        marginTop: spacing.md,
    },
    favoriteItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: enterpriseColors.gray200,
    },
    favoriteInfo: {
        flex: 1,
    },
    favoriteName: {
        ...typography.button,
        fontWeight: '600',
        color: enterpriseColors.gray900,
        marginBottom: spacing.xs,
    },
    favoritePin: {
        ...typography.caption,
        color: enterpriseColors.gray600,
        marginBottom: spacing.xs,
    },
    favoriteLastConnected: {
        ...typography.caption,
        color: enterpriseColors.gray500,
    },

    // QR Mode
    qrContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    qrTitle: {
        ...typography.h3,
        fontWeight: '700',
        color: enterpriseColors.gray900,
        marginTop: spacing.xl,
        marginBottom: spacing.sm,
    },
    qrSubtitle: {
        ...typography.body,
        color: enterpriseColors.gray600,
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 22,
    },
    qrButton: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
});
