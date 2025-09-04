import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, elevation, typography } from '../../design/tokens';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useViewerConnection } from '../../hooks/useViewerConnection';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type ViewerPinCodeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ViewerPinCode'>;

interface ViewerPinCodeScreenProps {
    navigation: ViewerPinCodeScreenNavigationProp;
}

export default function ViewerPinCodeScreen({ navigation }: ViewerPinCodeScreenProps) {
    const viewerId = `viewer_${Date.now()}`;
    const [connectionState, connectionActions] = useViewerConnection(viewerId);
    const [pinCode, setPinCode] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);

    // 애니메이션 값들
    const [fadeAnim] = useState(new Animated.Value(0));
    const [slideAnim] = useState(new Animated.Value(50));
    const [pinAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        // 화면 진입 애니메이션
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // PIN 코드 입력 시 애니메이션
    useEffect(() => {
        if (pinCode.length > 0) {
            Animated.spring(pinAnim, {
                toValue: 1,
                useNativeDriver: true,
            }).start();
        } else {
            pinAnim.setValue(0);
        }
    }, [pinCode]);

    const handleConnect = async () => {
        if (!pinCode || pinCode.length !== 6) {
            console.error('❌ [뷰어 화면] PIN 코드 길이 오류:', pinCode.length);
            Alert.alert('오류', '6자리 PIN 코드를 입력해주세요.');
            return;
        }

        console.log('🔍 [뷰어 화면] 연결 시도 시작');
        console.log('🔍 [뷰어 화면] 입력된 PIN 코드:', pinCode);
        console.log('🔍 [뷰어 화면] 뷰어 ID:', viewerId);

        setIsConnecting(true);

        try {
            console.log('🔗 [뷰어 화면] PIN 코드로 연결 시작...');
            const success = await connectionActions.connectByPinCode(pinCode);

            if (success) {
                console.log('✅ [뷰어 화면] 연결 성공!');
                Alert.alert(
                    '연결 성공',
                    '홈캠에 성공적으로 연결되었습니다!',
                    [
                        {
                            text: '확인',
                            onPress: () => navigation.navigate('ViewerHome')
                        }
                    ]
                );
            } else {
                console.error('❌ [뷰어 화면] 연결 실패');
                Alert.alert('연결 실패', 'PIN 코드가 올바르지 않거나 만료되었습니다.');
            }
        } catch (error) {
            console.error('❌ [뷰어 화면] 연결 중 오류:', error);
            Alert.alert('오류', '연결 중 오류가 발생했습니다.');
        } finally {
            setIsConnecting(false);
        }
    };

    const handleClearPin = () => {
        setPinCode('');
    };

    const handleKeyPress = (key: string) => {
        if (pinCode.length < 6) {
            setPinCode(prev => prev + key);
        }
    };

    const handleBackspace = () => {
        setPinCode(prev => prev.slice(0, -1));
    };

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor={colors.background} />
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.background, colors.surfaceAlt]}
                    style={styles.backgroundGradient}
                />

                <SafeAreaView style={styles.safeArea}>
                    {/* Header */}
                    <Animated.View
                        style={[
                            styles.header,
                            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                        ]}
                    >
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <LinearGradient
                                colors={[colors.surface, colors.surfaceAlt]}
                                style={styles.backButtonGradient}
                            >
                                <Ionicons name="arrow-back" size={24} color={colors.text} />
                            </LinearGradient>
                        </TouchableOpacity>
                        <Text style={styles.title}>PIN 코드 입력</Text>
                        <View style={styles.headerRight} />
                    </Animated.View>

                    <KeyboardAvoidingView
                        style={styles.content}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    >
                        {/* 설명 */}
                        <Animated.View
                            style={[
                                styles.descriptionContainer,
                                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                            ]}
                        >
                            <LinearGradient
                                colors={[colors.primary, colors.accent]}
                                style={styles.iconGradient}
                            >
                                <Ionicons name="key" size={64} color={colors.surface} />
                            </LinearGradient>
                            <Text style={styles.descriptionTitle}>홈캠 PIN 코드 입력</Text>
                            <Text style={styles.descriptionText}>
                                홈캠 디바이스에 표시된 6자리 PIN 코드를 입력하세요
                            </Text>
                        </Animated.View>

                        {/* PIN 코드 표시 */}
                        <Animated.View
                            style={[
                                styles.pinDisplayContainer,
                                {
                                    opacity: fadeAnim,
                                    transform: [
                                        { translateY: slideAnim },
                                        {
                                            scale: pinAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0.9, 1]
                                            })
                                        }
                                    ]
                                }
                            ]}
                        >
                            <View style={styles.pinDisplay}>
                                {Array.from({ length: 6 }, (_, index) => (
                                    <Animated.View
                                        key={index}
                                        style={[
                                            styles.pinDigit,
                                            {
                                                transform: [{
                                                    scale: pinCode[index] ?
                                                        pinAnim.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [1, 1.1]
                                                        }) : 1
                                                }]
                                            }
                                        ]}
                                    >
                                        <Text style={styles.pinDigitText}>
                                            {pinCode[index] || ''}
                                        </Text>
                                    </Animated.View>
                                ))}
                            </View>

                            {pinCode.length > 0 && (
                                <TouchableOpacity
                                    style={styles.clearButton}
                                    onPress={handleClearPin}
                                >
                                    <LinearGradient
                                        colors={[colors.surface, colors.surfaceAlt]}
                                        style={styles.clearButtonGradient}
                                    >
                                        <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                        </Animated.View>

                        {/* 숫자 키패드 */}
                        <Animated.View
                            style={[
                                styles.keypadContainer,
                                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                            ]}
                        >
                            <View style={styles.keypad}>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                    <TouchableOpacity
                                        key={num}
                                        style={styles.keypadButton}
                                        onPress={() => handleKeyPress(num.toString())}
                                        disabled={pinCode.length >= 6}
                                    >
                                        <LinearGradient
                                            colors={pinCode.length >= 6 ?
                                                [colors.disabledBg, colors.disabledBg] :
                                                [colors.surface, colors.surfaceAlt]
                                            }
                                            style={styles.keypadButtonGradient}
                                        >
                                            <Text style={[
                                                styles.keypadButtonText,
                                                pinCode.length >= 6 && styles.keypadButtonTextDisabled
                                            ]}>
                                                {num}
                                            </Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                ))}

                                <View style={styles.keypadButton} />

                                <TouchableOpacity
                                    style={styles.keypadButton}
                                    onPress={() => handleKeyPress('0')}
                                    disabled={pinCode.length >= 6}
                                >
                                    <LinearGradient
                                        colors={pinCode.length >= 6 ?
                                            [colors.disabledBg, colors.disabledBg] :
                                            [colors.surface, colors.surfaceAlt]
                                        }
                                        style={styles.keypadButtonGradient}
                                    >
                                        <Text style={[
                                            styles.keypadButtonText,
                                            pinCode.length >= 6 && styles.keypadButtonTextDisabled
                                        ]}>
                                            0
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.keypadButton}
                                    onPress={handleBackspace}
                                    disabled={pinCode.length === 0}
                                >
                                    <LinearGradient
                                        colors={pinCode.length === 0 ?
                                            [colors.disabledBg, colors.disabledBg] :
                                            [colors.surface, colors.surfaceAlt]
                                        }
                                        style={styles.keypadButtonGradient}
                                    >
                                        <Ionicons
                                            name="backspace-outline"
                                            size={24}
                                            color={pinCode.length === 0 ? colors.disabledText : colors.text}
                                        />
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>

                        {/* 연결 버튼 */}
                        <Animated.View
                            style={[
                                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                            ]}
                        >
                            <TouchableOpacity
                                style={[
                                    styles.connectButton,
                                    pinCode.length === 6 && styles.connectButtonActive
                                ]}
                                onPress={handleConnect}
                                disabled={pinCode.length !== 6 || isConnecting}
                            >
                                <LinearGradient
                                    colors={pinCode.length === 6 ? [colors.primary, colors.accent] : [colors.surface, colors.surfaceAlt]}
                                    style={styles.connectButtonGradient}
                                >
                                    <Ionicons
                                        name={isConnecting ? "hourglass" : "wifi"}
                                        size={20}
                                        color={pinCode.length === 6 ? colors.surface : colors.textSecondary}
                                    />
                                    <Text style={[
                                        styles.connectButtonText,
                                        pinCode.length === 6 && styles.connectButtonTextActive
                                    ]}>
                                        {isConnecting ? '연결 중...' : '홈캠 연결'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* 도움말 */}
                        <Animated.View
                            style={[
                                styles.helpContainer,
                                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                            ]}
                        >
                            <LinearGradient
                                colors={[colors.surface, colors.surfaceAlt]}
                                style={styles.helpGradient}
                            >
                                <Ionicons name="information-circle" size={16} color={colors.primary} />
                                <Text style={styles.helpText}>
                                    PIN 코드는 10분간 유효하며, 홈캠과 같은 Wi-Fi 네트워크에 연결되어 있어야 합니다.
                                </Text>
                            </LinearGradient>
                        </Animated.View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    backButton: {
        padding: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        ...elevation['1'],
    },
    backButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.sm,
        borderRadius: radius.md,
    },
    title: {
        ...typography.h2,
        color: colors.text,
    },
    headerRight: {
        width: 40,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xl,
    },
    descriptionContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    iconGradient: {
        borderRadius: radius.lg,
        padding: spacing.sm,
        marginBottom: spacing.sm,
    },
    descriptionTitle: {
        ...typography.h3,
        color: colors.text,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    descriptionText: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    pinDisplayContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
        position: 'relative',
    },
    pinDisplay: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    pinDigit: {
        width: 60,
        height: 60,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        ...elevation['2'],
    },
    pinDigitText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
    },
    clearButton: {
        position: 'absolute',
        right: -40,
        top: 18,
        padding: spacing.sm,
    },
    clearButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.sm,
        borderRadius: radius.md,
    },
    keypadContainer: {
        flex: 1,
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    keypad: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: spacing.md,
    },
    keypadButton: {
        width: 80,
        height: 80,
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        ...elevation['2'],
    },
    keypadButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.sm,
        borderRadius: radius.lg,
    },
    keypadButtonText: {
        fontSize: 24,
        fontWeight: '600',
        color: colors.text,
    },
    keypadButtonTextDisabled: {
        color: colors.textSecondary,
    },
    connectButton: {
        borderRadius: radius.lg,
        overflow: 'hidden',
        marginBottom: spacing.lg,
        ...elevation['2'],
    },
    connectButtonActive: {
        // 활성화된 상태는 그라데이션으로 처리
    },
    connectButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xl,
    },
    connectButtonText: {
        ...typography.bodyLg,
        color: colors.textSecondary,
        fontWeight: '600',
        marginLeft: spacing.sm,
    },
    connectButtonTextActive: {
        color: colors.surface,
    },
    helpContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: spacing.md,
        ...elevation['1'],
    },
    helpGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: radius.md,
        padding: spacing.sm,
    },
    helpText: {
        ...typography.caption,
        color: colors.textSecondary,
        marginLeft: spacing.sm,
        flex: 1,
        lineHeight: 18,
    },
}); 