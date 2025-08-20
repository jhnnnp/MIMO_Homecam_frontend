import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    Image,
    ScrollView,
    Dimensions,
    StatusBar,
    TextInput,
    ActivityIndicator,
    Pressable, // TouchableOpacity 대신 Pressable을 사용하여 더 세밀한 상호작용 제어
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Toast from 'react-native-toast-message';

import { useAuthStore } from '../stores/authStore';
// 실제 앱에서는 이 컴포넌트들을 별도 파일로 분리하여 관리하는 것이 좋습니다.
// import { Button, TextField, Card } from '../components';
// import { colors, typography, spacing, radius, elevation } from '../design/tokens';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// MIMO 로고 기반 따뜻한 컬러 시스템
const mimoColors = {
    primary: '#607A78',
    primaryLight: '#D9E0DF',
    accent: '#F5C572',
    background: '#FBF9F4',
    surface: '#FFFFFF',
    surfaceAlt: '#F7F4EF',
    text: '#3A3F47',
    textSecondary: '#7A8089',
    textOnPrimary: '#FFFFFF',
    success: '#58A593',
    error: '#D97373',
    warning: '#E6A556',
    divider: '#EAE6DD',
    border: '#EAE6DD',
    shadow: 'rgba(96, 122, 120, 0.15)',
    focusRing: '#607A78', // 포커스 색상을 primary로 변경
};

// Zod 스키마 정의
const loginSchema = z.object({
    email: z.string().email('유효한 이메일을 입력해주세요.'),
    password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다.'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen({ navigation }: any) {
    const { login, isLoading } = useAuthStore();
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    // 현재 포커스된 입력 필드를 추적하기 위한 상태 추가
    const [focusedField, setFocusedField] = useState<string | null>(null);
    // 입력 필드 값 추적을 위한 상태
    const [emailValue, setEmailValue] = useState('');
    const [passwordValue, setPasswordValue] = useState('');

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    // 동적 제목 계산
    const getDynamicTitle = () => {
        if (emailValue || passwordValue) {
            return '계정에 로그인해주세요';
        }
        return 'MIMO에 오신 것을 환영합니다!';
    };

    const onLogin = async (data: LoginFormData) => {
        try {
            const success = await login(data.email, data.password);
            if (success) {
                Toast.show({
                    type: 'success',
                    text1: '로그인 성공',
                    text2: 'MIMO에 오신 것을 환영합니다!',
                });
                // 인증 상태가 업데이트되면 AppNavigator가 자동으로 ModeSelection으로 이동
            } else {
                Toast.show({
                    type: 'error',
                    text1: '로그인 실패',
                    text2: '이메일 또는 비밀번호를 확인해주세요.',
                });
            }
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: '로그인 실패',
                text2: error.message || '이메일 또는 비밀번호를 확인해주세요.',
            });
        }
    };

    return (
        <>
            <StatusBar barStyle="dark-content" backgroundColor={mimoColors.background} />
            <View style={styles.container}>
                <LinearGradient
                    colors={[mimoColors.background, mimoColors.surfaceAlt, '#F9F6F0']}
                    style={styles.gradientBackground}
                />
                <View style={styles.floatingElement1} />
                <View style={styles.floatingElement2} />
                <View style={styles.floatingElement3} />

                <SafeAreaView style={styles.safeArea}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.keyboardAvoidingView}
                    >
                        <ScrollView
                            contentContainerStyle={styles.scrollContainer}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View style={styles.headerSection}>
                                <View style={styles.logoContainer}>
                                    <View style={styles.logoWrapper}>
                                        <Image
                                            source={require('../../MainLogo.png')}
                                            style={styles.logo}
                                            resizeMode="contain"
                                        />

                                    </View>
                                    <View style={styles.brandInfo}>
                                        <View style={styles.brandAccent} />
                                    </View>
                                </View>
                            </View>

                            <View style={styles.formSection}>
                                <View style={styles.formCard}>
                                    <LinearGradient
                                        colors={['rgba(255, 255, 255, 0.95)', 'rgba(251, 249, 244, 0.9)']}
                                        style={styles.formSurface}
                                    >
                                        <View style={styles.formHeader}>
                                            <Text style={styles.formSubtitle}>{getDynamicTitle()}</Text>
                                        </View>
                                        <View style={styles.formContent}>
                                            <Controller
                                                control={control}
                                                name="email"
                                                render={({ field: { onChange, onBlur, value } }) => (
                                                    <View style={styles.inputGroup}>
                                                        <Text style={styles.inputLabel}>이메일</Text>
                                                        <View style={[
                                                            styles.inputFieldContainer,
                                                            focusedField === 'email' && styles.inputFieldFocused,
                                                            errors.email && styles.inputFieldError
                                                        ]}>
                                                            <Ionicons name="mail-outline" size={20} color={mimoColors.primary} style={styles.inputIcon} />
                                                            <TextInput
                                                                placeholder="이메일을 입력해 주세요"
                                                                value={value}
                                                                onChangeText={(text) => {
                                                                    onChange(text);
                                                                    setEmailValue(text);
                                                                }}
                                                                onFocus={() => setFocusedField('email')}
                                                                onBlur={() => { onBlur(); setFocusedField(null); }}
                                                                keyboardType="email-address"
                                                                autoCapitalize="none"
                                                                style={styles.enhancedInput}
                                                                placeholderTextColor={mimoColors.textSecondary}
                                                            />
                                                        </View>
                                                        {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
                                                    </View>
                                                )}
                                            />

                                            <Controller
                                                control={control}
                                                name="password"
                                                render={({ field: { onChange, onBlur, value } }) => (
                                                    <View style={styles.inputGroup}>
                                                        <Text style={styles.inputLabel}>비밀번호</Text>
                                                        <View style={[
                                                            styles.inputFieldContainer,
                                                            focusedField === 'password' && styles.inputFieldFocused,
                                                            errors.password && styles.inputFieldError
                                                        ]}>
                                                            <Ionicons name="lock-closed-outline" size={20} color={mimoColors.primary} style={styles.inputIcon} />
                                                            <TextInput
                                                                placeholder="비밀번호를 입력해 주세요"
                                                                value={value}
                                                                onChangeText={(text) => {
                                                                    onChange(text);
                                                                    setPasswordValue(text);
                                                                }}
                                                                onFocus={() => setFocusedField('password')}
                                                                onBlur={() => { onBlur(); setFocusedField(null); }}
                                                                secureTextEntry={!isPasswordVisible}
                                                                style={styles.enhancedInput}
                                                                placeholderTextColor={mimoColors.textSecondary}
                                                            />
                                                            <TouchableOpacity
                                                                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                                                                style={styles.passwordToggle}
                                                            >
                                                                <Ionicons name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} size={20} color={mimoColors.textSecondary} />
                                                            </TouchableOpacity>
                                                        </View>
                                                        {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
                                                    </View>
                                                )}
                                            />

                                            <TouchableOpacity
                                                onPress={() => Toast.show({ type: 'info', text1: '준비 중인 기능입니다.' })}
                                                style={styles.forgotPasswordContainer}
                                            >
                                                <Text style={styles.forgotPasswordText}>비밀번호를 잊으셨나요?</Text>
                                            </TouchableOpacity>

                                            <Pressable
                                                onPress={handleSubmit(onLogin)}
                                                disabled={isLoading}
                                                style={({ pressed }) => [
                                                    styles.loginButtonContainer,
                                                    (isLoading) && styles.loginButtonDisabled,
                                                    pressed && !isLoading && styles.loginButtonPressed,
                                                ]}
                                            >
                                                <LinearGradient
                                                    colors={[mimoColors.primary, '#4a615f']}
                                                    style={styles.loginButton}
                                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                                >
                                                    {isLoading ? (
                                                        <ActivityIndicator size="small" color={mimoColors.textOnPrimary} />
                                                    ) : (
                                                        <Text style={styles.loginButtonText}>로그인</Text>
                                                    )}
                                                </LinearGradient>
                                            </Pressable>

                                            <View style={styles.googleLoginSection}>
                                                <View style={styles.dividerContainer}>
                                                    <View style={styles.divider} />
                                                    <Text style={styles.dividerText}>또는</Text>
                                                    <View style={styles.divider} />
                                                </View>

                                                <Pressable
                                                    onPress={() => Toast.show({ type: 'info', text1: '준비 중인 기능입니다.' })}
                                                    style={({ pressed }) => [
                                                        styles.googleButton,
                                                        pressed && styles.googleButtonPressed
                                                    ]}
                                                >
                                                    <View style={styles.googleButtonContent}>
                                                        <View style={styles.googleIconContainer}>
                                                            <Ionicons name="logo-google" size={20} color="#DB4437" />
                                                        </View>
                                                        <Text style={styles.googleButtonText}>Google로 계속하기</Text>
                                                    </View>
                                                </Pressable>
                                            </View>
                                        </View>
                                    </LinearGradient>
                                </View>
                            </View>

                            <View style={styles.footer}>
                                <Text style={styles.footerText}>아직 계정이 없으신가요?</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                                    <Text style={styles.signupLink}>회원가입</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: mimoColors.background,
    },
    gradientBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    floatingElement1: {
        position: 'absolute',
        top: 60,
        right: -15,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: mimoColors.accent + '25',
        shadowColor: mimoColors.accent,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    floatingElement2: {
        position: 'absolute',
        top: 200,
        left: -25,
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: mimoColors.primary + '20',
        shadowColor: mimoColors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
    },
    floatingElement3: {
        position: 'absolute',
        bottom: 180,
        right: 40,
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: mimoColors.accent + '35',
        shadowColor: mimoColors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    safeArea: {
        flex: 1,
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingVertical: 0,
        justifyContent: 'flex-start',
        paddingTop: 30,
    },
    headerSection: {
        alignItems: 'center',
        marginBottom: 8,
    },
    logoContainer: {
        alignItems: 'center',
    },
    logoWrapper: {
        position: 'relative',
        marginBottom: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },

    logo: {
        width: 250,
        height: 250,
        shadowColor: mimoColors.shadow,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 10,
    },
    brandInfo: {
        alignItems: 'center',
    },
    brandTitle: {
        fontSize: 42,
        fontWeight: '900',
        color: mimoColors.primary,
        marginBottom: 10,
        letterSpacing: 1,
    },
    brandSubtitle: {
        fontSize: 18,
        color: mimoColors.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
        maxWidth: 320,
        lineHeight: 24,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    brandAccent: {
        width: 70,
        height: 5,
        backgroundColor: mimoColors.accent,
        borderRadius: 3,
        shadowColor: mimoColors.accent,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 3,
    },
    formSection: {
        // paddingBottom: 20,
    },
    formCard: {
        backgroundColor: 'transparent',
        borderRadius: 20,
        shadowColor: mimoColors.shadow,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    formSurface: {
        padding: 24,
        borderRadius: 20,
    },
    formHeader: {
        alignItems: 'center',
        marginBottom: 16,
    },
    formTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: mimoColors.text,
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    formSubtitle: {
        fontSize: 16,
        color: mimoColors.textSecondary,
        fontWeight: '500',
        letterSpacing: 0.2,
    },
    formContent: {
        gap: 12,
    },
    inputGroup: { // inputContainer를 inputGroup으로 변경하여 의미 명확화
        // marginBottom: 6,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: mimoColors.text,
        marginBottom: 4,
        letterSpacing: 0.2,
    },
    inputFieldContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: mimoColors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: mimoColors.divider,
        paddingHorizontal: 14,
        paddingVertical: 4,
        shadowColor: mimoColors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    inputFieldFocused: {
        borderColor: mimoColors.focusRing,
        shadowColor: mimoColors.focusRing,
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    inputFieldError: {
        borderColor: mimoColors.error,
    },
    inputIcon: {
        marginRight: 12,
    },
    enhancedInput: {
        flex: 1,
        fontSize: 15,
        color: mimoColors.text,
        paddingVertical: 12,
        fontWeight: '500',
    },
    passwordToggle: {
        padding: 8,
    },
    errorText: {
        fontSize: 12,
        color: mimoColors.error,
        marginTop: 6,
        marginLeft: 4,
    },
    forgotPasswordContainer: {
        alignSelf: 'flex-end',
        paddingVertical: 2,
    },
    forgotPasswordText: {
        fontSize: 12,
        color: mimoColors.primary,
        fontWeight: '500',
        letterSpacing: 0.1,
    },
    loginButtonContainer: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: mimoColors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
        marginTop: 0,
        marginBottom: 0,
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonPressed: { // 눌렸을 때 효과
        transform: [{ translateY: 1 }],
        shadowOpacity: 0.15,
    },
    loginButton: {
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    loginButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: mimoColors.textOnPrimary,
        letterSpacing: 0.2,
    },
    googleLoginSection: {
        marginTop: -8,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 8,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: mimoColors.divider,
    },
    dividerText: {
        fontSize: 12,
        color: mimoColors.textSecondary,
        marginHorizontal: 16,
        fontWeight: '500',
        letterSpacing: 0.2,
    },
    googleButton: {
        backgroundColor: mimoColors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: mimoColors.divider,
        shadowColor: mimoColors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
        width: '100%',
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    googleButtonPressed: {
        backgroundColor: mimoColors.surfaceAlt,
        transform: [{ translateY: 1 }],
    },
    googleButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    googleIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#DB44370A',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    googleButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: mimoColors.text,
        letterSpacing: 0.1,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        marginTop: 6,
    },
    footerText: {
        fontSize: 16,
        color: mimoColors.textSecondary,
        fontWeight: '500',
    },
    signupLink: {
        fontSize: 16,
        color: mimoColors.primary,
        fontWeight: '800',
        marginLeft: 8,
        letterSpacing: 0.3,
    },
});
