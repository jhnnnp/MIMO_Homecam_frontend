/**
 * CameraRegistrationScreen - 홈캠 등록 화면
 * 
 * 핵심 기능:
 * - PIN 코드 입력으로 홈캠 등록
 * - QR 코드 스캔으로 홈캠 등록
 * 
 * 회원가입 후 등록된 홈캠이 없을 때 표시되는 화면
 */

import React, { useState, useCallback, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
    Dimensions,
    Pressable,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Design tokens 제거 - 하드코딩된 값 사용
import { RootStackParamList } from '@/app/navigation/AppNavigator';

// Constants
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 홈캠 목록과 일치하는 색상 팔레트
const SCREEN_COLORS = {
    primary: '#007AFF',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    surfaceAlt: '#F7F4EF',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#C6C6C8',
    accent: '#F5C572',
} as const;

// Types
type ViewerHomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ViewerHome'>;

interface ViewerHomeScreenProps {
    navigation: ViewerHomeScreenNavigationProp;
}

const ViewerHomeScreen = memo(({ navigation }: ViewerHomeScreenProps) => {

    // Navigation handlers
    const handleConnectWithPin = useCallback(() => {
        navigation.navigate('ViewerPinCode');
    }, [navigation]);

    const handleConnectWithQR = useCallback(() => {
        navigation.navigate('ViewerQRScan');
    }, [navigation]);

    const handleRegistrationComplete = useCallback(() => {
        // 홈캠 등록 완료 후 뷰어 대시보드로 이동
        navigation.replace('ViewerDashboard');
    }, [navigation]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={SCREEN_COLORS.background} />
            <LinearGradient
                colors={[SCREEN_COLORS.background, SCREEN_COLORS.surfaceAlt]}
                style={styles.backgroundGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable
                        style={({ pressed }) => [
                            styles.backButton,
                            pressed && styles.backButtonPressed,
                        ]}
                        onPress={() => navigation.navigate('ModeSelection')}
                    >
                        <Ionicons name="arrow-back" size={24} color={SCREEN_COLORS.text} />
                    </Pressable>
                    <Text style={styles.headerTitle}>뷰어 모드</Text>
                    <View style={styles.placeholder} />
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Hero Section */}
                    <View style={styles.heroSection}>
                        <LinearGradient
                            colors={[SCREEN_COLORS.primary + '15', SCREEN_COLORS.accent + '10']}
                            style={styles.heroIconContainer}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Ionicons name="videocam" size={48} color={SCREEN_COLORS.primary} />
                        </LinearGradient>
                        <Text style={styles.heroTitle}>홈캠 등록하기</Text>
                        <Text style={styles.heroSubtitle}>
                            홈캠에서 생성된 연결 코드로{'\n'}내 계정에 홈캠을 등록하세요
                        </Text>
                    </View>

                    {/* Connection Methods */}
                    <View style={styles.methodsContainer}>
                        {/* PIN 코드 연결 */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.methodCard,
                                pressed && styles.methodCardPressed,
                            ]}
                            onPress={handleConnectWithPin}
                        >
                            <LinearGradient
                                colors={[SCREEN_COLORS.primary, '#5AC8FA']}
                                style={styles.methodGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <View style={styles.methodContent}>
                                    <View style={styles.methodIcon}>
                                        <Ionicons name="keypad" size={24} color="white" />
                                    </View>
                                    <View style={styles.methodInfo}>
                                        <Text style={styles.methodTitle}>PIN 코드</Text>
                                        <Text style={styles.methodSubtitle}>6자리 숫자 입력</Text>
                                    </View>
                                    <View style={styles.methodArrow}>
                                        <Ionicons name="arrow-forward" size={18} color="white" />
                                    </View>
                                </View>
                            </LinearGradient>
                        </Pressable>

                        {/* QR 코드 연결 */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.methodCard,
                                pressed && styles.methodCardPressed,
                            ]}
                            onPress={handleConnectWithQR}
                        >
                            <LinearGradient
                                colors={[SCREEN_COLORS.success, '#58A593']}
                                style={styles.methodGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <View style={styles.methodContent}>
                                    <View style={styles.methodIcon}>
                                        <Ionicons name="qr-code" size={24} color="white" />
                                    </View>
                                    <View style={styles.methodInfo}>
                                        <Text style={styles.methodTitle}>QR 코드</Text>
                                        <Text style={styles.methodSubtitle}>카메라로 스캔</Text>
                                    </View>
                                    <View style={styles.methodArrow}>
                                        <Ionicons name="arrow-forward" size={18} color="white" />
                                    </View>
                                </View>
                            </LinearGradient>
                        </Pressable>
                    </View>

                    {/* Help Section */}
                    <View style={styles.helpSection}>
                        <Text style={styles.helpTitle}>도움말</Text>
                        <View style={styles.helpCard}>
                            <View style={styles.helpItem}>
                                <LinearGradient
                                    colors={[SCREEN_COLORS.primary + '20', SCREEN_COLORS.primary + '10']}
                                    style={styles.helpIconContainer}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Ionicons name="information-circle-outline" size={18} color={SCREEN_COLORS.primary} />
                                </LinearGradient>
                                <Text style={styles.helpText}>
                                    홈캠 화면에서 "연결 코드 보기"를 눌러 등록용{'\n'}PIN/QR 코드를 확인하세요
                                </Text>
                            </View>

                            <View style={styles.helpDivider} />

                            <View style={styles.helpItem}>
                                <LinearGradient
                                    colors={[SCREEN_COLORS.success + '20', SCREEN_COLORS.success + '10']}
                                    style={styles.helpIconContainer}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Ionicons name="shield-checkmark-outline" size={18} color={SCREEN_COLORS.success} />
                                </LinearGradient>
                                <Text style={styles.helpText}>
                                    연결 코드는 보안을 위해 주기적으로 변경됩니다
                                </Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
});

ViewerHomeScreen.displayName = 'ViewerHomeScreen';

export default ViewerHomeScreen;

// 홈캠 목록 스타일과 일치하는 현대적인 스타일
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: SCREEN_COLORS.background,
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

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: SCREEN_COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: SCREEN_COLORS.border,
    },
    backButton: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: SCREEN_COLORS.background,
    },
    backButtonPressed: {
        backgroundColor: SCREEN_COLORS.border,
        transform: [{ scale: 0.95 }],
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: SCREEN_COLORS.text,
    },
    placeholder: {
        width: 48,
    },

    // Scroll Content
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },

    // Hero Section
    heroSection: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 32,
    },
    heroIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        shadowColor: SCREEN_COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: SCREEN_COLORS.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    heroSubtitle: {
        fontSize: 16,
        color: SCREEN_COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: 280,
    },

    // Connection Methods
    methodsContainer: {
        gap: 16,
        marginBottom: 32,
    },
    methodCard: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    methodCardPressed: {
        transform: [{ scale: 0.98 }],
    },
    methodGradient: {
        padding: 20,
        minHeight: 80,
    },
    methodContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    methodIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    methodInfo: {
        flex: 1,
        marginLeft: 16,
    },
    methodTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: 'white',
        marginBottom: 4,
    },
    methodSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
    },
    methodArrow: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Help Section
    helpSection: {
        marginTop: 8,
    },
    helpTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: SCREEN_COLORS.text,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    helpCard: {
        backgroundColor: SCREEN_COLORS.surface,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    helpItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
    },
    helpIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    helpText: {
        flex: 1,
        fontSize: 14,
        color: SCREEN_COLORS.textSecondary,
        lineHeight: 20,
    },
    helpDivider: {
        height: 1,
        backgroundColor: SCREEN_COLORS.border,
        marginVertical: 16,
        marginLeft: 52, // icon container width + gap
    },
});