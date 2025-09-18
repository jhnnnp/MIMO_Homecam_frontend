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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Design System
import { spacing, radius } from '@/design/tokens';

// Navigation Types
import { RootStackParamList } from '@/app/navigation/AppNavigator';

// Constants
const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.navigate('ModeSelection')}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>뷰어 모드</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* 메인 컨텐츠 */}
                <View style={styles.content}>
                    {/* 타이틀 */}
                    <View style={styles.titleContainer}>
                        <Ionicons name="videocam" size={48} color={colors.primary} />
                        <Text style={styles.title}>첫 홈캠 등록하기</Text>
                        <Text style={styles.subtitle}>
                            홈캠에서 생성된 연결 코드로{'\n'}내 계정에 홈캠을 등록하세요
                        </Text>
                    </View>

                    {/* 연결 방법 */}
                    <View style={styles.connectionMethods}>
                        {/* PIN 코드 연결 */}
                        <TouchableOpacity
                            style={styles.connectionCard}
                            onPress={handleConnectWithPin}
                        >
                            <LinearGradient
                                colors={[colors.primary, '#2196F3']}
                                style={styles.connectionCardGradient}
                            >
                                <View style={styles.connectionIconContainer}>
                                    <Ionicons name="keypad" size={32} color="white" />
                                </View>
                                <Text style={styles.connectionCardTitle}>PIN 코드</Text>
                                <Text style={styles.connectionCardSubtitle}>6자리 숫자 입력</Text>
                                <View style={styles.connectionCardArrow}>
                                    <Ionicons name="arrow-forward" size={20} color="white" />
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* QR 코드 연결 */}
                        <TouchableOpacity
                            style={styles.connectionCard}
                            onPress={handleConnectWithQR}
                        >
                            <LinearGradient
                                colors={[colors.success, '#4CAF50']}
                                style={styles.connectionCardGradient}
                            >
                                <View style={styles.connectionIconContainer}>
                                    <Ionicons name="qr-code" size={32} color="white" />
                                </View>
                                <Text style={styles.connectionCardTitle}>QR 코드</Text>
                                <Text style={styles.connectionCardSubtitle}>카메라로 스캔</Text>
                                <View style={styles.connectionCardArrow}>
                                    <Ionicons name="arrow-forward" size={20} color="white" />
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* 도움말 */}
                    <View style={styles.helpContainer}>
                        <View style={styles.helpItem}>
                            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                            <Text style={styles.helpText}>
                                홈캠 화면에서 "연결 코드 보기"를 눌러 등록용 PIN/QR 코드를 확인하세요
                            </Text>
                        </View>
                        <View style={styles.helpItem}>
                            <Ionicons name="shield-checkmark-outline" size={20} color={colors.success} />
                            <Text style={styles.helpText}>
                                연결 코드는 보안을 위해 주기적으로 변경됩니다
                            </Text>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
});

ViewerHomeScreen.displayName = 'ViewerHomeScreen';

export default ViewerHomeScreen;

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
    placeholder: {
        width: 40, // backButton과 같은 크기
    },

    // 메인 컨텐츠
    content: {
        flex: 1,
        padding: spacing.lg,
    },
    titleContainer: {
        alignItems: 'center',
        marginTop: spacing.xl,
        marginBottom: spacing.xl * 2,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },

    // 연결 방법
    connectionMethods: {
        gap: spacing.lg,
        marginBottom: spacing.xl * 2,
    },
    connectionCard: {
        borderRadius: radius.xl,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    connectionCardGradient: {
        padding: spacing.xl,
        minHeight: 120,
        justifyContent: 'center',
        position: 'relative',
    },
    connectionIconContainer: {
        marginBottom: spacing.md,
    },
    connectionCardTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: 'white',
        marginBottom: spacing.xs,
    },
    connectionCardSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: spacing.sm,
    },
    connectionCardArrow: {
        position: 'absolute',
        right: spacing.lg,
        top: '50%',
        marginTop: -10,
    },

    // 도움말
    helpContainer: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        gap: spacing.md,
    },
    helpItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
    },
    helpText: {
        flex: 1,
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
});