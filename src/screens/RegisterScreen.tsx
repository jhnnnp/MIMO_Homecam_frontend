import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    Dimensions,
    TextInput,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../stores/authStore';
import { Button, TextField, Card, AppBar } from '../components';
import { colors, typography, spacing, radius, elevation } from '../design/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// MIMO 로고 기반 따뜻한 컬러 시스템 (로그인 화면과 동일)
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

// 개선된 회원가입 폼 스키마
const registerSchema = z.object({
    email: z
        .string()
        .min(1, '이메일을 입력해 주세요.')
        .email('올바른 이메일 형식이 아니에요.'),
    password: z
        .string()
        .min(8, '비밀번호는 최소 8자 이상이어야 해요.')
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
            '비밀번호는 대문자, 소문자, 숫자, 특수문자를 포함해야 해요.'
        ),
    confirmPassword: z.string().min(1, '비밀번호 확인을 입력해 주세요.'),
    name: z.string().min(1, '이름을 입력해 주세요.'),
    nickname: z.string().min(1, '닉네임을 입력해 주세요.'),
    agreeTerms: z.boolean().refine((val) => val === true, {
        message: '서비스 이용약관에 동의해 주세요.',
    }),
    agreePrivacy: z.boolean().refine((val) => val === true, {
        message: '개인정보 처리방침에 동의해 주세요.',
    }),
    agreeMicrophone: z.boolean().refine((val) => val === true, {
        message: '마이크 권한에 동의해 주세요.',
    }),
    agreeLocation: z.boolean().refine((val) => val === true, {
        message: '위치 권한에 동의해 주세요.',
    }),
}).refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않아요.',
    path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterScreenProps {
    navigation: any;
}

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const { register, isLoading, error, clearError } = useAuthStore();

    const {
        control,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isValid },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        mode: 'onChange',
        defaultValues: {
            agreeTerms: false,
            agreePrivacy: false,
            agreeMicrophone: false,
            agreeLocation: false,
        }
    });

    const watchedValues = watch();
    const completedFieldsCount = Object.values({
        email: !!watchedValues.email,
        name: !!watchedValues.name,
        nickname: !!watchedValues.nickname,
        password: !!watchedValues.password,
        confirmPassword: !!watchedValues.confirmPassword,
        agreements: watchedValues.agreeTerms && watchedValues.agreePrivacy && watchedValues.agreeMicrophone && watchedValues.agreeLocation,
    }).filter(Boolean).length;
    const progressPercentage = (completedFieldsCount / 6) * 100;

    const onSubmit = async (data: RegisterFormData) => {
        clearError();
        const success = await register({
            email: data.email,
            password: data.password,
            name: data.name,
            nickname: data.nickname,
            agreeTerms: data.agreeTerms,
            agreePrivacy: data.agreePrivacy,
            agreeMicrophone: data.agreeMicrophone,
            agreeLocation: data.agreeLocation,
            agreeMarketing: false,
        });
        if (success) {
            // 회원가입 성공 후 모드 선택 화면으로 이동
            navigation.navigate('ModeSelection');
        }
    };

    const getPasswordStrength = (password: string) => {
        if (!password) return { strength: 0, text: '', color: mimoColors.textSecondary };

        let score = 0;
        if (password.length >= 8) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[@$!%*?&]/.test(password)) score++;

        if (score <= 2) return { strength: score * 20, text: '약함', color: mimoColors.error };
        if (score <= 4) return { strength: score * 20, text: '보통', color: mimoColors.warning };
        return { strength: 100, text: '강함', color: mimoColors.success };
    };

    const passwordStrength = getPasswordStrength(watchedValues.password || '');

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
                    {/* Enhanced AppBar */}
                    <View style={styles.appBarContainer}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="arrow-back" size={24} color={mimoColors.text} />
                        </TouchableOpacity>
                        <Text style={styles.appBarTitle}>회원가입</Text>
                        <View style={styles.appBarSpacer} />
                    </View>

                    <KeyboardAvoidingView
                        style={styles.keyboardAvoidingView}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    >
                        <ScrollView
                            style={styles.scrollView}
                            contentContainerStyle={styles.scrollContent}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Enhanced Header Section */}
                            <View style={styles.headerSection}>
                                <View style={styles.titleContainer}>
                                    <Text style={styles.title}>계정 만들기</Text>
                                    <Text style={styles.subtitle}>
                                        MIMO와 함께 안전한 홈캠 시스템을 시작해 보세요
                                    </Text>
                                    <View style={styles.brandAccent} />
                                </View>

                                {/* Enhanced Progress Indicator */}
                                <View style={styles.progressCard}>
                                    <LinearGradient
                                        colors={[
                                            'rgba(255, 255, 255, 0.9)',
                                            'rgba(251, 249, 244, 0.8)'
                                        ]}
                                        style={styles.progressCardGradient}
                                    >
                                        <View style={styles.progressContainer}>
                                            <View style={styles.progressHeader}>
                                                <Text style={styles.progressLabel}>진행률</Text>
                                                <Text style={styles.progressPercentage}>
                                                    {Math.round(progressPercentage)}%
                                                </Text>
                                            </View>
                                            <View style={styles.progressBarContainer}>
                                                <View style={styles.progressBarBackground} />
                                                <LinearGradient
                                                    colors={[mimoColors.primary, mimoColors.accent]}
                                                    style={[
                                                        styles.progressBarFill,
                                                        { width: `${progressPercentage}%` }
                                                    ]}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                />
                                            </View>
                                        </View>
                                    </LinearGradient>
                                </View>
                            </View>

                            {/* Enhanced Error Message */}
                            {error && (
                                <View style={styles.errorCard}>
                                    <View style={styles.errorContainer}>
                                        <Ionicons name="alert-circle" size={20} color={mimoColors.error} />
                                        <Text style={styles.errorText}>{error}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Enhanced Form Section */}
                            <View style={styles.glassCard}>
                                <LinearGradient
                                    colors={[
                                        'rgba(255, 255, 255, 0.95)',
                                        'rgba(251, 249, 244, 0.8)'
                                    ]}
                                    style={styles.glassSurface}
                                >
                                    <View style={styles.formHeader}>
                                        <Text style={styles.formTitle}>기본 정보</Text>
                                        <Text style={styles.formSubtitle}>
                                            계정 생성에 필요한 정보를 입력해주세요
                                        </Text>
                                    </View>

                                    <View style={styles.formContent}>
                                        {/* Email Input */}
                                        <View style={styles.inputGroup}>
                                            <Controller
                                                control={control}
                                                name="email"
                                                render={({ field: { onChange, onBlur, value } }) => (
                                                    <View style={styles.enhancedInputWrapper}>
                                                        <Text style={styles.inputLabel}>이메일 *</Text>
                                                        <View style={[
                                                            styles.inputFieldContainer,
                                                            focusedField === 'email' && styles.inputFieldFocused,
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
                                                                onBlur={() => {
                                                                    onBlur();
                                                                    setFocusedField(null);
                                                                }}
                                                                onFocus={() => setFocusedField('email')}
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

                                        {/* Name Input */}
                                        <View style={styles.inputGroup}>
                                            <Controller
                                                control={control}
                                                name="name"
                                                render={({ field: { onChange, onBlur, value } }) => (
                                                    <View style={styles.enhancedInputWrapper}>
                                                        <Text style={styles.inputLabel}>이름 *</Text>
                                                        <View style={[
                                                            styles.inputFieldContainer,
                                                            focusedField === 'name' && styles.inputFieldFocused,
                                                            errors.name && styles.inputFieldError
                                                        ]}>
                                                            <Ionicons
                                                                name="person-outline"
                                                                size={20}
                                                                color={mimoColors.primary}
                                                                style={styles.inputIcon}
                                                            />
                                                            <TextInput
                                                                placeholder="이름을 입력해 주세요"
                                                                value={value}
                                                                onChangeText={onChange}
                                                                onBlur={() => {
                                                                    onBlur();
                                                                    setFocusedField(null);
                                                                }}
                                                                onFocus={() => setFocusedField('name')}
                                                                autoCapitalize="words"
                                                                style={styles.enhancedInput}
                                                                placeholderTextColor={mimoColors.textSecondary}
                                                            />
                                                        </View>
                                                        {errors.name && (
                                                            <Text style={styles.errorText}>
                                                                {errors.name.message}
                                                            </Text>
                                                        )}
                                                    </View>
                                                )}
                                            />
                                        </View>

                                        {/* Nickname Input */}
                                        <View style={styles.inputGroup}>
                                            <Controller
                                                control={control}
                                                name="nickname"
                                                render={({ field: { onChange, onBlur, value } }) => (
                                                    <View style={styles.enhancedInputWrapper}>
                                                        <Text style={styles.inputLabel}>닉네임 *</Text>
                                                        <View style={[
                                                            styles.inputFieldContainer,
                                                            focusedField === 'nickname' && styles.inputFieldFocused,
                                                            errors.nickname && styles.inputFieldError
                                                        ]}>
                                                            <Ionicons
                                                                name="at-outline"
                                                                size={20}
                                                                color={mimoColors.primary}
                                                                style={styles.inputIcon}
                                                            />
                                                            <TextInput
                                                                placeholder="닉네임을 입력해 주세요"
                                                                value={value}
                                                                onChangeText={onChange}
                                                                onBlur={() => {
                                                                    onBlur();
                                                                    setFocusedField(null);
                                                                }}
                                                                onFocus={() => setFocusedField('nickname')}
                                                                autoCapitalize="none"
                                                                style={styles.enhancedInput}
                                                                placeholderTextColor={mimoColors.textSecondary}
                                                            />
                                                        </View>
                                                        {errors.nickname && (
                                                            <Text style={styles.errorText}>
                                                                {errors.nickname.message}
                                                            </Text>
                                                        )}
                                                    </View>
                                                )}
                                            />
                                        </View>

                                        {/* Password Input */}
                                        <View style={styles.inputGroup}>
                                            <Controller
                                                control={control}
                                                name="password"
                                                render={({ field: { onChange, onBlur, value } }) => (
                                                    <View style={styles.enhancedInputWrapper}>
                                                        <Text style={styles.inputLabel}>비밀번호 *</Text>
                                                        <View style={[
                                                            styles.inputFieldContainer,
                                                            focusedField === 'password' && styles.inputFieldFocused,
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
                                                                onBlur={() => {
                                                                    onBlur();
                                                                    setFocusedField(null);
                                                                }}
                                                                onFocus={() => setFocusedField('password')}
                                                                secureTextEntry={!showPassword}
                                                                style={styles.enhancedInput}
                                                                placeholderTextColor={mimoColors.textSecondary}
                                                            />
                                                            <TouchableOpacity
                                                                onPress={() => setShowPassword(!showPassword)}
                                                                style={styles.passwordToggle}
                                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                            >
                                                                <Ionicons
                                                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                                                    size={20}
                                                                    color={mimoColors.textSecondary}
                                                                />
                                                            </TouchableOpacity>
                                                        </View>

                                                        {/* Password Strength Indicator */}
                                                        {value && (
                                                            <View style={styles.passwordStrengthContainer}>
                                                                <View style={styles.passwordStrengthBar}>
                                                                    <View style={styles.passwordStrengthBarBackground} />
                                                                    <View
                                                                        style={[
                                                                            styles.passwordStrengthBarFill,
                                                                            {
                                                                                width: `${passwordStrength.strength}%`,
                                                                                backgroundColor: passwordStrength.color
                                                                            }
                                                                        ]}
                                                                    />
                                                                </View>
                                                                <Text style={[styles.passwordStrengthText, { color: passwordStrength.color }]}>
                                                                    {passwordStrength.text}
                                                                </Text>
                                                            </View>
                                                        )}

                                                        <Text style={styles.helperText}>
                                                            8자 이상, 대소문자, 숫자, 특수문자 포함
                                                        </Text>

                                                        {errors.password && (
                                                            <Text style={styles.errorText}>
                                                                {errors.password.message}
                                                            </Text>
                                                        )}
                                                    </View>
                                                )}
                                            />
                                        </View>

                                        {/* Confirm Password Input */}
                                        <View style={styles.inputGroup}>
                                            <Controller
                                                control={control}
                                                name="confirmPassword"
                                                render={({ field: { onChange, onBlur, value } }) => (
                                                    <View style={styles.enhancedInputWrapper}>
                                                        <Text style={styles.inputLabel}>비밀번호 확인 *</Text>
                                                        <View style={[
                                                            styles.inputFieldContainer,
                                                            focusedField === 'confirmPassword' && styles.inputFieldFocused,
                                                            errors.confirmPassword && styles.inputFieldError
                                                        ]}>
                                                            <Ionicons
                                                                name="lock-closed-outline"
                                                                size={20}
                                                                color={mimoColors.primary}
                                                                style={styles.inputIcon}
                                                            />
                                                            <TextInput
                                                                placeholder="비밀번호를 다시 입력해 주세요"
                                                                value={value}
                                                                onChangeText={onChange}
                                                                onBlur={() => {
                                                                    onBlur();
                                                                    setFocusedField(null);
                                                                }}
                                                                onFocus={() => setFocusedField('confirmPassword')}
                                                                secureTextEntry={!showConfirmPassword}
                                                                style={styles.enhancedInput}
                                                                placeholderTextColor={mimoColors.textSecondary}
                                                            />
                                                            <TouchableOpacity
                                                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                                                style={styles.passwordToggle}
                                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                            >
                                                                <Ionicons
                                                                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                                                                    size={20}
                                                                    color={mimoColors.textSecondary}
                                                                />
                                                            </TouchableOpacity>
                                                        </View>
                                                        {errors.confirmPassword && (
                                                            <Text style={styles.errorText}>
                                                                {errors.confirmPassword.message}
                                                            </Text>
                                                        )}
                                                    </View>
                                                )}
                                            />
                                        </View>
                                    </View>
                                </LinearGradient>
                            </View>

                            {/* Enhanced Terms Section */}
                            <View style={styles.termsCard}>
                                <LinearGradient
                                    colors={[
                                        'rgba(255, 255, 255, 0.95)',
                                        'rgba(251, 249, 244, 0.8)'
                                    ]}
                                    style={styles.glassSurface}
                                >
                                    <View style={styles.termsHeader}>
                                        <Text style={styles.termsTitle}>약관 동의</Text>
                                        <Text style={styles.termsSubtitle}>
                                            서비스 이용을 위해 약관에 동의해주세요
                                        </Text>
                                    </View>

                                    <View style={styles.termsContent}>
                                        <View style={styles.agreementItem}>
                                            <Controller
                                                control={control}
                                                name="agreeTerms"
                                                render={({ field: { value } }) => (
                                                    <TouchableOpacity
                                                        style={styles.checkboxRow}
                                                        onPress={() => setValue('agreeTerms', !value, { shouldValidate: true })}
                                                        activeOpacity={0.7}
                                                    >
                                                        <View style={[
                                                            styles.checkbox,
                                                            value && styles.checkboxChecked
                                                        ]}>
                                                            {value && (
                                                                <Ionicons name="checkmark" size={16} color={mimoColors.textOnPrimary} />
                                                            )}
                                                        </View>
                                                        <Text style={styles.checkboxLabel}>
                                                            서비스 이용약관 동의 (필수)
                                                        </Text>
                                                        <TouchableOpacity style={styles.linkButton}>
                                                            <Ionicons name="chevron-forward" size={16} color={mimoColors.primary} />
                                                        </TouchableOpacity>
                                                    </TouchableOpacity>
                                                )}
                                            />
                                            {errors.agreeTerms && (
                                                <Text style={styles.agreementError}>{errors.agreeTerms.message}</Text>
                                            )}
                                        </View>

                                        <View style={styles.agreementItem}>
                                            <Controller
                                                control={control}
                                                name="agreePrivacy"
                                                render={({ field: { value } }) => (
                                                    <TouchableOpacity
                                                        style={styles.checkboxRow}
                                                        onPress={() => setValue('agreePrivacy', !value, { shouldValidate: true })}
                                                        activeOpacity={0.7}
                                                    >
                                                        <View style={[
                                                            styles.checkbox,
                                                            value && styles.checkboxChecked
                                                        ]}>
                                                            {value && (
                                                                <Ionicons name="checkmark" size={16} color={mimoColors.textOnPrimary} />
                                                            )}
                                                        </View>
                                                        <Text style={styles.checkboxLabel}>
                                                            개인정보 처리방침 동의 (필수)
                                                        </Text>
                                                        <TouchableOpacity style={styles.linkButton}>
                                                            <Ionicons name="chevron-forward" size={16} color={mimoColors.primary} />
                                                        </TouchableOpacity>
                                                    </TouchableOpacity>
                                                )}
                                            />
                                            {errors.agreePrivacy && (
                                                <Text style={styles.agreementError}>{errors.agreePrivacy.message}</Text>
                                            )}
                                        </View>

                                        <View style={styles.agreementItem}>
                                            <Controller
                                                control={control}
                                                name="agreeMicrophone"
                                                render={({ field: { value } }) => (
                                                    <TouchableOpacity
                                                        style={styles.checkboxRow}
                                                        onPress={() => setValue('agreeMicrophone', !value, { shouldValidate: true })}
                                                        activeOpacity={0.7}
                                                    >
                                                        <View style={[
                                                            styles.checkbox,
                                                            value && styles.checkboxChecked
                                                        ]}>
                                                            {value && (
                                                                <Ionicons name="checkmark" size={16} color={mimoColors.textOnPrimary} />
                                                            )}
                                                        </View>
                                                        <Text style={styles.checkboxLabel}>
                                                            마이크 권한 동의 (필수)
                                                        </Text>
                                                        <TouchableOpacity style={styles.linkButton}>
                                                            <Ionicons name="chevron-forward" size={16} color={mimoColors.primary} />
                                                        </TouchableOpacity>
                                                    </TouchableOpacity>
                                                )}
                                            />
                                            {errors.agreeMicrophone && (
                                                <Text style={styles.agreementError}>{errors.agreeMicrophone.message}</Text>
                                            )}
                                        </View>

                                        <View style={styles.agreementItem}>
                                            <Controller
                                                control={control}
                                                name="agreeLocation"
                                                render={({ field: { value } }) => (
                                                    <TouchableOpacity
                                                        style={styles.checkboxRow}
                                                        onPress={() => setValue('agreeLocation', !value, { shouldValidate: true })}
                                                        activeOpacity={0.7}
                                                    >
                                                        <View style={[
                                                            styles.checkbox,
                                                            value && styles.checkboxChecked
                                                        ]}>
                                                            {value && (
                                                                <Ionicons name="checkmark" size={16} color={mimoColors.textOnPrimary} />
                                                            )}
                                                        </View>
                                                        <Text style={styles.checkboxLabel}>
                                                            위치 권한 동의 (필수)
                                                        </Text>
                                                        <TouchableOpacity style={styles.linkButton}>
                                                            <Ionicons name="chevron-forward" size={16} color={mimoColors.primary} />
                                                        </TouchableOpacity>
                                                    </TouchableOpacity>
                                                )}
                                            />
                                            {errors.agreeLocation && (
                                                <Text style={styles.agreementError}>{errors.agreeLocation.message}</Text>
                                            )}
                                        </View>
                                    </View>
                                </LinearGradient>
                            </View>

                            {/* Enhanced Register Button */}
                            <TouchableOpacity
                                onPress={handleSubmit(onSubmit)}
                                disabled={!isValid || isLoading}
                                style={[
                                    styles.registerButtonContainer,
                                    (!isValid || isLoading) && styles.registerButtonDisabled
                                ]}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={[mimoColors.primary, mimoColors.primaryLight]}
                                    style={styles.registerButton}
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
                                            <Text style={styles.registerButtonText}>회원가입 중...</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.registerButtonText}>회원가입</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Enhanced Footer */}
                            <View style={styles.footer}>
                                <Text style={styles.footerText}>이미 계정이 있으신가요? </Text>
                                <TouchableOpacity
                                    onPress={() => navigation.navigate('Login')}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Text style={styles.loginLink}>로그인</Text>
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
        left: -20,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: mimoColors.accent + '30',
        opacity: 0.6,
    },
    floatingElement2: {
        position: 'absolute',
        top: 300,
        right: -30,
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: mimoColors.primary + '20',
        opacity: 0.4,
    },
    floatingElement3: {
        position: 'absolute',
        bottom: 100,
        left: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: mimoColors.accent + '40',
        opacity: 0.3,
    },
    safeArea: {
        flex: 1,
    },

    // Enhanced AppBar
    appBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: 'transparent',
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: mimoColors.surface,
        shadowColor: mimoColors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    appBarTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        color: mimoColors.text,
        textAlign: 'center',
        marginLeft: -40, // Compensate for back button
    },
    appBarSpacer: {
        width: 40,
    },

    keyboardAvoidingView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 40,
    },

    // Enhanced Header Section
    headerSection: {
        paddingVertical: 20,
    },
    titleContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: mimoColors.text,
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: mimoColors.textSecondary,
        textAlign: 'center',
        maxWidth: 300,
        lineHeight: 22,
        marginBottom: 16,
    },
    brandAccent: {
        width: 40,
        height: 3,
        backgroundColor: mimoColors.accent,
        borderRadius: 2,
    },

    // Enhanced Progress Section
    progressCard: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: mimoColors.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(234, 230, 221, 0.3)',
    },
    progressCardGradient: {
        padding: 20,
    },
    progressContainer: {
        gap: 12,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressLabel: {
        fontSize: 15,
        color: mimoColors.text,
        fontWeight: '600',
    },
    progressPercentage: {
        fontSize: 15,
        color: mimoColors.primary,
        fontWeight: '700',
    },
    progressBarContainer: {
        position: 'relative',
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: mimoColors.divider,
    },
    progressBarFill: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        borderRadius: 4,
    },

    // Enhanced Error Section
    errorCard: {
        marginBottom: 16,
        padding: 16,
        backgroundColor: mimoColors.error + '15',
        borderWidth: 1,
        borderColor: mimoColors.error + '30',
        borderRadius: 12,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    errorText: {
        fontSize: 12,
        color: mimoColors.error,
        flex: 1,
        marginTop: 6,
        marginLeft: 4,
    },

    // Enhanced Form Section
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
        marginBottom: 20,
    },
    glassSurface: {
        padding: 24,
    },
    formHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    formTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: mimoColors.text,
        marginBottom: 6,
    },
    formSubtitle: {
        fontSize: 14,
        color: mimoColors.textSecondary,
        textAlign: 'center',
    },
    formContent: {
        gap: 20,
    },
    inputGroup: {
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
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: mimoColors.divider,
        paddingHorizontal: 16,
        shadowColor: mimoColors.shadow,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    inputFieldFocused: {
        borderColor: mimoColors.primary,
        shadowColor: mimoColors.primary,
        shadowOpacity: 0.2,
    },
    inputFieldError: {
        borderColor: mimoColors.error,
    },
    inputIcon: {
        marginRight: 12,
    },
    enhancedInput: {
        flex: 1,
        fontSize: 16,
        color: mimoColors.text,
        paddingVertical: 16,
    },
    passwordToggle: {
        padding: 8,
    },
    helperText: {
        fontSize: 12,
        color: mimoColors.textSecondary,
        marginTop: 6,
        marginLeft: 4,
    },

    // Password Strength Indicator
    passwordStrengthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 8,
    },
    passwordStrengthBar: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
        position: 'relative',
    },
    passwordStrengthBarBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: mimoColors.divider,
    },
    passwordStrengthBarFill: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        borderRadius: 2,
    },
    passwordStrengthText: {
        fontSize: 12,
        fontWeight: '600',
        minWidth: 30,
    },

    // Enhanced Terms Section
    termsCard: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: mimoColors.shadow,
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.12,
        shadowRadius: 25,
        elevation: 12,
        borderWidth: 1,
        borderColor: 'rgba(234, 230, 221, 0.3)',
        marginBottom: 24,
    },
    termsHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    termsTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: mimoColors.text,
        marginBottom: 6,
    },
    termsSubtitle: {
        fontSize: 14,
        color: mimoColors.textSecondary,
        textAlign: 'center',
    },
    termsContent: {
        gap: 20,
    },
    agreementItem: {
        gap: 8,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 8,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: mimoColors.divider,
        backgroundColor: mimoColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: mimoColors.primary,
        borderColor: mimoColors.primary,
    },
    checkboxLabel: {
        fontSize: 14,
        color: mimoColors.text,
        flex: 1,
        fontWeight: '500',
    },
    linkButton: {
        padding: 4,
    },
    agreementError: {
        fontSize: 12,
        color: mimoColors.error,
        marginLeft: 36,
    },

    // Enhanced Register Button
    registerButtonContainer: {
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: mimoColors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
        marginBottom: 24,
    },
    registerButtonDisabled: {
        opacity: 0.7,
    },
    registerButton: {
        paddingVertical: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    registerButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: mimoColors.textOnPrimary,
        letterSpacing: 0.3,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loadingSpinner: {
        marginRight: 8,
    },

    // Enhanced Footer
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
    },
    footerText: {
        fontSize: 15,
        color: mimoColors.textSecondary,
    },
    loginLink: {
        fontSize: 15,
        color: mimoColors.primary,
        fontWeight: '700',
    },
}); 
