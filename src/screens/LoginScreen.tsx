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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Toast from 'react-native-toast-message';

import { useAuthStore } from '../stores/authStore';
import { Button, TextField, Card } from '../components';
import { colors, typography, spacing, radius, elevation } from '../design/tokens';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// MIMO 로고 기반 따뜻한 컬러 시스템
const mimoColors = {
    // Core Colors - 로고의 색상을 기반으로 함
    primary: '#607A78',      // Muted Green: 핵심 상호작용 요소
    primaryLight: '#D9E0DF', // Primary의 밝은 버전
    accent: '#F5C572',       // Warm Yellow: 강조, 하이라이트

    // Background & Surface
    background: '#FBF9F4',   // Cream: 앱 전체 배경
    surface: '#FFFFFF',      // Pure White: 카드, 모달 등
    surfaceAlt: '#F7F4EF',   // Slightly darker cream

    // Text Colors
    text: '#3A3F47',         // Warm Dark Gray: 기본 텍스트
    textSecondary: '#7A8089', // 보조 텍스트
    textOnPrimary: '#FFFFFF', // Primary 색상 위의 텍스트

    // Feedback Colors
    success: '#58A593',      // Muted Teal: 성공 상태
    error: '#D97373',        // Muted Red: 오류 상태
    warning: '#E6A556',      // Warm Orange: 경고 상태

    // Neutral & Utility
    divider: '#EAE6DD',      // Warm Gray: 구분선
    border: '#EAE6DD',       // 테두리
    shadow: 'rgba(96, 122, 120, 0.15)', // 그림자
    focusRing: '#F5C572',    // 포커스 링
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

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const onLogin = async (data: LoginFormData) => {
        try {
            await login(data.email, data.password);
            Toast.show({
                type: 'success',
                text1: '로그인 성공',
                text2: 'MIMO에 오신 것을 환영합니다!',
            });
            // 로그인 성공 후 모드 선택 화면으로 이동
            navigation.navigate('ModeSelection');
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
                {/* Warm Gradient Background */}
                <LinearGradient
                    colors={[
                        mimoColors.background,
                        mimoColors.surfaceAlt,
                        '#F9F6F0'
                    ]}
                    style={styles.gradientBackground}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />

                {/* Warm Floating Elements */}
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
                            {/* Header Section */}
                            <View style={styles.headerSection}>
                                <View style={styles.logoContainer}>
                                    {/* Enhanced Logo Container with Warm Colors */}
                                    <View style={styles.logoWrapper}>
                                        <LinearGradient
                                            colors={[mimoColors.accent, '#F7D794']}
                                            style={styles.logoGradient}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        >
                                            <View style={styles.logoBackground}>
                                                <Image
                                                    source={require('../../MainLogo.png')}
                                                    style={styles.logo}
                                                    resizeMode="contain"
                                                />
                                            </View>
                                        </LinearGradient>
                                        {/* Warm Glow Effect */}
                                        <View style={styles.logoGlow} />
                                    </View>

                                    <View style={styles.brandInfo}>
                                        <Text style={styles.brandTitle}>MIMO</Text>
                                        <Text style={styles.brandSubtitle}>
                                            홈캠과 함께하는 안전한 일상
                                        </Text>
                                        <View style={styles.brandAccent} />
                                    </View>
                                </View>
                            </View>

                            {/* Login Form */}
                            <View style={styles.formSection}>
                                {/* Warm Glass Card Effect */}
                                <View style={styles.glassCard}>
                                    <LinearGradient
                                        colors={[
                                            'rgba(255, 255, 255, 0.95)',
                                            'rgba(251, 249, 244, 0.8)'
                                        ]}
                                        style={styles.glassSurface}
                                    >
                                        <View style={styles.formHeader}>
                                            <Text style={styles.formTitle}>로그인</Text>
                                            <Text style={styles.formSubtitle}>
                                                계정에 로그인해주세요
                                            </Text>
                                        </View>

                                        <View style={styles.formContent}>
                                            {/* Email Input */}
                                            <View style={styles.inputContainer}>
                                                <Controller
                                                    control={control}
                                                    name="email"
                                                    render={({ field: { onChange, onBlur, value } }) => (
                                                        <View style={styles.enhancedInputWrapper}>
                                                            <Text style={styles.inputLabel}>이메일</Text>
                                                            <View style={[
                                                                styles.inputFieldContainer,
                                                                errors.email && styles.inputFieldError
                                                            ]}>
                                                                <Ionicons
                                                                    name="mail-outline"
                                                                    size={20}
                                                                    color={mimoColors.primary}
                                                                    style={styles.inputIcon}
                                                                />
                                                                <TextInput
                                                                    placeholder="이메일을 입력해 주세요"
                                                                    value={value}
                                                                    onChangeText={onChange}
                                                                    onBlur={onBlur}
                                                                    keyboardType="email-address"
                                                                    autoCapitalize="none"
                                                                    style={styles.enhancedInput}
                                                                    placeholderTextColor={mimoColors.textSecondary}
                                                                />
                                                            </View>
                                                            {errors.email && (
                                                                <Text style={styles.errorText}>
                                                                    {errors.email.message}
                                                                </Text>
                                                            )}
                                                        </View>
                                                    )}
                                                />
                                            </View>

                                            {/* Password Input */}
                                            <View style={styles.inputContainer}>
                                                <Controller
                                                    control={control}
                                                    name="password"
                                                    render={({ field: { onChange, onBlur, value } }) => (
                                                        <View style={styles.enhancedInputWrapper}>
                                                            <Text style={styles.inputLabel}>비밀번호</Text>
                                                            <View style={[
                                                                styles.inputFieldContainer,
                                                                errors.password && styles.inputFieldError
                                                            ]}>
                                                                <Ionicons
                                                                    name="lock-closed-outline"
                                                                    size={20}
                                                                    color={mimoColors.primary}
                                                                    style={styles.inputIcon}
                                                                />
                                                                <TextInput
                                                                    placeholder="비밀번호를 입력해 주세요"
                                                                    value={value}
                                                                    onChangeText={onChange}
                                                                    onBlur={onBlur}
                                                                    secureTextEntry={!isPasswordVisible}
                                                                    style={styles.enhancedInput}
                                                                    placeholderTextColor={mimoColors.textSecondary}
                                                                />
                                                                <TouchableOpacity
                                                                    onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                                                                    style={styles.passwordToggle}
                                                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                                >
                                                                    <Ionicons
                                                                        name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                                                                        size={20}
                                                                        color={mimoColors.textSecondary}
                                                                    />
                                                                </TouchableOpacity>
                                                            </View>
                                                            {errors.password && (
                                                                <Text style={styles.errorText}>
                                                                    {errors.password.message}
                                                                </Text>
                                                            )}
                                                        </View>
                                                    )}
                                                />
                                            </View>

                                            {/* Forgot Password Link */}
                                            <TouchableOpacity
                                                onPress={() => Toast.show({
                                                    type: 'info',
                                                    text1: '준비 중인 기능입니다.',
                                                    text2: '관리자에게 문의해주세요.'
                                                })}
                                                style={styles.forgotPasswordContainer}
                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            >
                                                <Text style={styles.forgotPasswordText}>
                                                    비밀번호를 잊으셨나요?
                                                </Text>
                                            </TouchableOpacity>

                                            {/* Enhanced Login Button */}
                                            <TouchableOpacity
                                                onPress={handleSubmit(onLogin)}
                                                disabled={isLoading}
                                                style={[
                                                    styles.loginButtonContainer,
                                                    isLoading && styles.loginButtonDisabled
                                                ]}
                                                activeOpacity={0.8}
                                            >
                                                <LinearGradient
                                                    colors={[mimoColors.primary, mimoColors.primaryLight]}
                                                    style={styles.loginButton}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                >
                                                    {isLoading ? (
                                                        <View style={styles.loadingContainer}>
                                                            <ActivityIndicator
                                                                size="small"
                                                                color={mimoColors.textOnPrimary}
                                                                style={styles.loadingSpinner}
                                                            />
                                                            <Text style={styles.loginButtonText}>로그인 중...</Text>
                                                        </View>
                                                    ) : (
                                                        <Text style={styles.loginButtonText}>로그인</Text>
                                                    )}
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        </View>
                                    </LinearGradient>
                                </View>

                                {/* Social Login Section */}
                                <View style={styles.socialSection}>
                                    <View style={styles.dividerContainer}>
                                        <View style={styles.divider} />
                                        <Text style={styles.dividerText}>또는</Text>
                                        <View style={styles.divider} />
                                    </View>

                                    <TouchableOpacity
                                        onPress={() => Toast.show({
                                            type: 'info',
                                            text1: '준비 중인 기능입니다.'
                                        })}
                                        style={styles.socialButton}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.socialButtonContent}>
                                            <Ionicons name="logo-google" size={24} color="#DB4437" />
                                            <Text style={styles.socialButtonText}>Google로 로그인</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>

                                {/* Footer */}
                                <View style={styles.footer}>
                                    <Text style={styles.footerText}>아직 계정이 없으신가요?</Text>
                                    <TouchableOpacity
                                        onPress={() => navigation.navigate('Register')}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <Text style={styles.signupLink}>회원가입</Text>
                                    </TouchableOpacity>
                                </View>
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
        top: 80,
        right: -20,
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: mimoColors.accent + '30',
        opacity: 0.6,
    },
    floatingElement2: {
        position: 'absolute',
        top: 180,
        left: -30,
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: mimoColors.primary + '25',
        opacity: 0.4,
    },
    floatingElement3: {
        position: 'absolute',
        bottom: 200,
        right: 30,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: mimoColors.accent + '40',
        opacity: 0.3,
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
        paddingVertical: 20,
    },

    // Header Section
    headerSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: screenHeight * 0.3,
        paddingBottom: 40,
    },
    logoContainer: {
        alignItems: 'center',
    },
    logoWrapper: {
        position: 'relative',
        marginBottom: 32,
    },
    logoGradient: {
        width: 120,
        height: 120,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: mimoColors.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 10,
    },
    logoBackground: {
        width: 110,
        height: 110,
        borderRadius: 20,
        backgroundColor: mimoColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoGlow: {
        position: 'absolute',
        top: -8,
        left: -8,
        right: -8,
        bottom: -8,
        borderRadius: 32,
        backgroundColor: mimoColors.accent,
        opacity: 0.15,
        zIndex: -1,
    },
    logo: {
        width: 70,
        height: 70,
    },
    brandInfo: {
        alignItems: 'center',
    },
    brandTitle: {
        fontSize: 38,
        fontWeight: '800',
        color: mimoColors.primary,
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    brandSubtitle: {
        fontSize: 16,
        color: mimoColors.textSecondary,
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 22,
        maxWidth: 280,
    },
    brandAccent: {
        width: 50,
        height: 3,
        backgroundColor: mimoColors.accent,
        borderRadius: 2,
    },

    // Form Section
    formSection: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingBottom: 20,
    },
    glassCard: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: mimoColors.shadow,
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.12,
        shadowRadius: 25,
        elevation: 12,
        borderWidth: 1,
        borderColor: 'rgba(234, 230, 221, 0.3)',
    },
    glassSurface: {
        paddingVertical: 24,
        paddingHorizontal: 20,
    },
    formHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    formTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: mimoColors.text,
        letterSpacing: -0.4,
        marginBottom: 4,
    },
    formSubtitle: {
        fontSize: 14,
        color: mimoColors.textSecondary,
        textAlign: 'center',
    },
    formContent: {
        gap: 14,
    },
    inputContainer: {
        marginBottom: 6,
    },
    enhancedInputWrapper: {
        marginBottom: 12,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: mimoColors.text,
        marginBottom: 8,
        marginLeft: 4,
    },
    inputFieldContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: mimoColors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: mimoColors.divider,
        paddingHorizontal: 14,
        shadowColor: 'transparent',
        elevation: 0,
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
        paddingVertical: 8,
        marginBottom: 8,
    },
    forgotPasswordText: {
        fontSize: 14,
        color: mimoColors.primary,
        fontWeight: '600',
    },
    loginButtonContainer: {
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: mimoColors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
        marginTop: 8,
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButton: {
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loginButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: mimoColors.textOnPrimary,
        letterSpacing: 0.2,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loadingSpinner: {
        marginRight: 8,
    },

    // Social Section
    socialSection: {
        marginVertical: 28,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: mimoColors.divider,
    },
    dividerText: {
        fontSize: 14,
        color: mimoColors.textSecondary,
        marginHorizontal: 16,
        backgroundColor: mimoColors.background,
        paddingHorizontal: 8,
    },
    socialButton: {
        backgroundColor: mimoColors.surface,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: mimoColors.divider,
        shadowColor: mimoColors.shadow,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    socialButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
    },
    socialButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: mimoColors.text,
        marginLeft: 12,
    },

    // Footer
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
    },
    footerText: {
        fontSize: 15,
        color: mimoColors.textSecondary,
    },
    signupLink: {
        fontSize: 15,
        color: mimoColors.primary,
        fontWeight: '700',
        marginLeft: 6,
    },
});
