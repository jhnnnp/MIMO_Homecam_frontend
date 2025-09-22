import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Toast from 'react-native-toast-message';

import { useAuthStore } from '@/shared/stores/authStore';
// 실제 앱에서는 이 컴포넌트들을 별도 파일로 분리하여 관리하는 것이 좋습니다.
// import { Button, TextField, Card } from '@/features/../shared/components';
// 
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// 홈캠 목록과 일치하는 iOS 스타일 색상 팔레트
const mimoColors = {
    primary: '#007AFF',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
    textOnPrimary: '#FFFFFF',
    border: '#C6C6C8',
    divider: '#C6C6C8',
    shadow: 'rgba(0, 0, 0, 0.1)',
    focusRing: '#007AFF',
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

    // TextInput ref 추가 - 포커스 관리를 위해
    const emailInputRef = useRef<TextInput>(null);
    const passwordInputRef = useRef<TextInput>(null);

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

                <SafeAreaView style={styles.safeArea}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.keyboardAvoidingView}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                    >
                        <ScrollView
                            contentContainerStyle={styles.scrollContainer}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="always"
                            keyboardDismissMode="none"
                            bounces={false}
                            scrollEnabled={true}
                        >
                            <View style={styles.headerSection}>
                                <View style={styles.logoContainer}>
                                    <View style={styles.logoWrapper}>
                                        <Image
                                            source={require('../../../../MainLogo.png')}
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
                                                    <Pressable
                                                        style={[
                                                            styles.inputFieldContainer,
                                                            focusedField === 'email' && styles.inputFieldFocused,
                                                            errors.email && styles.inputFieldError
                                                        ]}
                                                        onPress={() => {
                                                            emailInputRef.current?.focus();
                                                        }}
                                                    >
                                                        <Ionicons name="mail-outline" size={20} color={mimoColors.primary} style={styles.inputIcon} />
                                                        <TextInput
                                                            ref={emailInputRef}
                                                            placeholder="이메일을 입력해 주세요"
                                                            value={value || ''}
                                                            onChangeText={(text) => {
                                                                onChange(text);
                                                                setEmailValue(text);
                                                            }}
                                                            onFocus={() => {
                                                                setFocusedField('email');
                                                            }}
                                                            onBlur={() => {
                                                                // 약간의 지연을 두어 다른 요소로의 포커스 이동 시간을 줍니다
                                                                setTimeout(() => {
                                                                    onBlur();
                                                                    setFocusedField(null);
                                                                }, 100);
                                                            }}
                                                            keyboardType="email-address"
                                                            autoCapitalize="none"
                                                            autoComplete="email"
                                                            autoCorrect={false}
                                                            textContentType="emailAddress"
                                                            returnKeyType="next"
                                                            onSubmitEditing={() => passwordInputRef.current?.focus()}
                                                            blurOnSubmit={false}
                                                            editable={!isLoading}
                                                            style={styles.enhancedInput}
                                                            placeholderTextColor={mimoColors.textSecondary}
                                                            accessibilityLabel="이메일 입력"
                                                            accessibilityHint="이메일 주소를 입력하세요"
                                                        />
                                                    </Pressable>
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
                                                    <Pressable
                                                        style={[
                                                            styles.inputFieldContainer,
                                                            focusedField === 'password' && styles.inputFieldFocused,
                                                            errors.password && styles.inputFieldError
                                                        ]}
                                                        onPress={() => {
                                                            passwordInputRef.current?.focus();
                                                        }}
                                                    >
                                                        <Ionicons name="lock-closed-outline" size={20} color={mimoColors.primary} style={styles.inputIcon} />
                                                        <TextInput
                                                            ref={passwordInputRef}
                                                            placeholder="비밀번호를 입력해 주세요"
                                                            value={value || ''}
                                                            onChangeText={(text) => {
                                                                onChange(text);
                                                                setPasswordValue(text);
                                                            }}
                                                            onFocus={() => {
                                                                setFocusedField('password');
                                                            }}
                                                            onBlur={() => {
                                                                // 약간의 지연을 두어 다른 요소로의 포커스 이동 시간을 줍니다
                                                                setTimeout(() => {
                                                                    onBlur();
                                                                    setFocusedField(null);
                                                                }, 100);
                                                            }}
                                                            secureTextEntry={!isPasswordVisible}
                                                            autoCapitalize="none"
                                                            autoComplete="password"
                                                            autoCorrect={false}
                                                            textContentType="password"
                                                            returnKeyType="done"
                                                            onSubmitEditing={handleSubmit(onLogin)}
                                                            editable={!isLoading}
                                                            style={styles.enhancedInput}
                                                            placeholderTextColor={mimoColors.textSecondary}
                                                            accessibilityLabel="비밀번호 입력"
                                                            accessibilityHint="비밀번호를 입력하세요"
                                                        />
                                                        <TouchableOpacity
                                                            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                                                            style={styles.passwordToggle}
                                                            accessibilityLabel={isPasswordVisible ? "비밀번호 숨기기" : "비밀번호 보기"}
                                                            accessibilityRole="button"
                                                            disabled={isLoading}
                                                        >
                                                            <Ionicons name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} size={20} color={mimoColors.textSecondary} />
                                                        </TouchableOpacity>
                                                    </Pressable>
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
                                            <View style={styles.loginButton}>
                                                {isLoading ? (
                                                    <ActivityIndicator size="small" color={mimoColors.textOnPrimary} />
                                                ) : (
                                                    <Text style={styles.loginButtonText}>로그인</Text>
                                                )}
                                            </View>
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
        backgroundColor: mimoColors.primary,
        borderRadius: 3,
        shadowColor: mimoColors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 3,
    },
    formSection: {
        // paddingBottom: 20,
    },
    formCard: {
        backgroundColor: mimoColors.surface,
        borderRadius: 16,
        padding: 24,
        marginHorizontal: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
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
        borderColor: mimoColors.border,
        paddingHorizontal: 14,
        paddingVertical: 2,
        minHeight: 52,
    },
    inputFieldFocused: {
        borderColor: mimoColors.primary,
        shadowColor: mimoColors.primary,
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
        fontSize: 16,
        color: mimoColors.text,
        paddingVertical: 12,
        fontWeight: '500',
        textAlignVertical: 'center',
        includeFontPadding: false,
        minHeight: 44, // 터치 영역 보장
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
        backgroundColor: mimoColors.primary,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginTop: 8,
        marginBottom: 0,
    },
    loginButtonDisabled: {
        opacity: 0.6,
    },
    loginButtonPressed: {
        transform: [{ translateY: 1 }],
        shadowOpacity: 0.05,
    },
    loginButton: {
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
        backgroundColor: mimoColors.primary,
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
        backgroundColor: mimoColors.background,
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
