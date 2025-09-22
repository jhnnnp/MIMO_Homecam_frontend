import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Switch,
    Alert,
    StatusBar,
    Pressable,
    Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/features/../shared/stores/authStore';
import { spacing } from '@/design/tokens';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/app/navigation/AppNavigator';

// 홈캠 목록 스타일과 일치하는 색상 사용
const SETTINGS_COLORS = {
    primary: '#007AFF',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#C6C6C8',
} as const;

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

interface SettingsScreenProps {
    navigation: SettingsScreenNavigationProp;
}

interface SettingItemProps {
    icon: string;
    title: string;
    subtitle?: string;
    rightElement?: React.ReactNode;
    onPress?: () => void;
    showArrow?: boolean;
    iconColor?: string;
}

const SettingItem: React.FC<SettingItemProps> = ({
    icon,
    title,
    subtitle,
    rightElement,
    onPress,
    showArrow = true,
    iconColor = SETTINGS_COLORS.primary,
}) => (
    <Pressable
        style={({ pressed }) => [
            styles.settingItem,
            pressed && styles.settingItemPressed,
        ]}
        onPress={() => {
            console.log(`Setting item pressed: ${title}`);
            onPress?.();
        }}
        disabled={!onPress}
        android_ripple={{
            color: SETTINGS_COLORS.primary + '20',
            borderless: false,
        }}
    >
        <View style={styles.settingLeft}>
            <LinearGradient
                colors={[iconColor + '20', iconColor + '10']}
                style={styles.iconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <Ionicons name={icon as any} size={20} color={iconColor} />
            </LinearGradient>
            <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{title}</Text>
                {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
            </View>
        </View>

        <View style={styles.settingRight}>
            {rightElement}
            {showArrow && onPress && (
                <View style={styles.arrowContainer}>
                    <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={SETTINGS_COLORS.textSecondary}
                        style={styles.arrowIcon}
                    />
                </View>
            )}
        </View>
    </Pressable>
);

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
    const { user, logout } = useAuthStore();

    // 설정 상태들
    const [pushNotifications, setPushNotifications] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [motionDetection, setMotionDetection] = useState(true);
    const [autoBackup, setAutoBackup] = useState(true);
    const [biometricLogin, setBiometricLogin] = useState(false);
    const [dataUsage, setDataUsage] = useState<'wifi' | 'all'>('wifi');
    const [videoQuality, setVideoQuality] = useState<'480p' | '720p' | '1080p'>('720p');

    const handleLogout = () => {
        Alert.alert(
            '로그아웃',
            '정말 로그아웃하시겠어요?',
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '로그아웃',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                    },
                },
            ]
        );
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            '계정 삭제',
            '계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다.\n\n정말 계속하시겠어요?',
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '삭제',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert('준비 중', '계정 삭제 기능은 준비 중입니다.');
                    },
                },
            ]
        );
    };

    const handleEditProfile = () => {
        Alert.alert('프로필 편집', '프로필 편집 기능은 준비 중입니다.');
    };

    const handleEditAvatar = () => {
        Alert.alert('프로필 사진 변경', '프로필 사진 변경 기능은 준비 중입니다.');
    };

    const handlePasswordChange = () => {
        Alert.alert('비밀번호 변경', '비밀번호 변경 기능은 준비 중입니다.');
    };

    const handleCustomerSupport = () => {
        Alert.alert(
            '고객 지원',
            '고객 지원이 필요하시면 다음 방법으로 연락해 주세요:\n\n📧 이메일: support@mimo.com\n📞 전화: 1588-0000\n⏰ 운영시간: 평일 9:00-18:00'
        );
    };

    const handlePrivacyPolicy = () => {
        Alert.alert(
            '개인정보 처리방침',
            'MIMO는 사용자의 개인정보 보호를 위해 최선을 다하고 있습니다.\n\n자세한 내용은 웹사이트에서 확인하실 수 있습니다.'
        );
    };

    const handleTermsOfService = () => {
        Alert.alert(
            '서비스 이용약관',
            'MIMO 서비스 이용약관을 확인해 주세요.\n\n자세한 내용은 웹사이트에서 확인하실 수 있습니다.'
        );
    };

    const handleAppInfo = () => {
        Alert.alert(
            'MIMO 홈캠',
            '버전: 1.0.0\n빌드: 2024.01.15\n\n© 2024 MIMO Team\n모든 권리 보유'
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={SETTINGS_COLORS.background} />
            <SafeAreaView style={styles.safeArea}>
                {/* Header - 홈캠 목록과 동일한 스타일 */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.profileButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="chevron-back" size={24} color={SETTINGS_COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>설정</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Profile Card - 카드 스타일로 변경 */}
                    <View style={styles.profileCard}>
                        <View style={styles.profileHeader}>
                            <View style={styles.profileAvatarContainer}>
                                <LinearGradient
                                    colors={[SETTINGS_COLORS.primary, '#5AC8FA']}
                                    style={styles.profileAvatar}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Text style={styles.profileInitial}>
                                        {(user?.name || user?.email || 'U')[0].toUpperCase()}
                                    </Text>
                                </LinearGradient>
                                <TouchableOpacity
                                    style={styles.editAvatarButton}
                                    onPress={handleEditAvatar}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="camera" size={12} color={SETTINGS_COLORS.surface} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.profileInfo}>
                                <Text style={styles.profileName}>
                                    {user?.name || '테스트 사용자'}
                                </Text>
                                <Text style={styles.profileEmail}>{user?.email || 'test@test.com'}</Text>
                                {user?.emailVerified && (
                                    <View style={styles.verifiedBadge}>
                                        <Ionicons name="checkmark-circle" size={12} color={SETTINGS_COLORS.success} />
                                        <Text style={styles.verifiedText}>인증됨</Text>
                                    </View>
                                )}
                            </View>

                            <TouchableOpacity
                                style={styles.editProfileButton}
                                onPress={handleEditProfile}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="create-outline" size={16} color={SETTINGS_COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Account Settings */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>계정</Text>
                        <View style={styles.sectionCard}>
                            <SettingItem
                                icon="person-outline"
                                title="프로필 편집"
                                subtitle="이름, 프로필 사진 변경"
                                onPress={handleEditProfile}
                                iconColor={SETTINGS_COLORS.primary}
                            />
                            <View style={styles.divider} />
                            <SettingItem
                                icon="lock-closed-outline"
                                title="비밀번호 변경"
                                subtitle="새 비밀번호로 변경"
                                onPress={handlePasswordChange}
                                iconColor={SETTINGS_COLORS.warning}
                            />
                            <View style={styles.divider} />
                            <SettingItem
                                icon="finger-print-outline"
                                title="생체 인증 로그인"
                                subtitle="지문 또는 Face ID로 빠른 로그인"
                                rightElement={
                                    <Switch
                                        value={biometricLogin}
                                        onValueChange={setBiometricLogin}
                                        trackColor={{ false: SETTINGS_COLORS.border, true: SETTINGS_COLORS.primary + '40' }}
                                        thumbColor={biometricLogin ? SETTINGS_COLORS.primary : SETTINGS_COLORS.surface}
                                        ios_backgroundColor={SETTINGS_COLORS.border}
                                    />
                                }
                                showArrow={false}
                                iconColor={SETTINGS_COLORS.success}
                            />
                        </View>
                    </View>

                    {/* Notifications Settings */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>알림</Text>
                        <View style={styles.sectionCard}>
                            <SettingItem
                                icon="notifications-outline"
                                title="푸시 알림"
                                subtitle="새 이벤트 알림 받기"
                                rightElement={
                                    <Switch
                                        value={pushNotifications}
                                        onValueChange={setPushNotifications}
                                        trackColor={{ false: SETTINGS_COLORS.border, true: SETTINGS_COLORS.primary + '40' }}
                                        thumbColor={pushNotifications ? SETTINGS_COLORS.primary : SETTINGS_COLORS.surface}
                                        ios_backgroundColor={SETTINGS_COLORS.border}
                                    />
                                }
                                showArrow={false}
                                iconColor={SETTINGS_COLORS.error}
                            />
                            <View style={styles.divider} />
                            <SettingItem
                                icon="mail-outline"
                                title="이메일 알림"
                                subtitle="중요한 이벤트를 이메일로 받기"
                                rightElement={
                                    <Switch
                                        value={emailNotifications}
                                        onValueChange={setEmailNotifications}
                                        trackColor={{ false: SETTINGS_COLORS.border, true: SETTINGS_COLORS.primary + '40' }}
                                        thumbColor={emailNotifications ? SETTINGS_COLORS.primary : SETTINGS_COLORS.surface}
                                        ios_backgroundColor={SETTINGS_COLORS.border}
                                    />
                                }
                                showArrow={false}
                                iconColor={SETTINGS_COLORS.warning}
                            />
                            <View style={styles.divider} />
                            <SettingItem
                                icon="walk-outline"
                                title="동작 감지 알림"
                                subtitle="동작이 감지되면 즉시 알림"
                                rightElement={
                                    <Switch
                                        value={motionDetection}
                                        onValueChange={setMotionDetection}
                                        trackColor={{ false: SETTINGS_COLORS.border, true: SETTINGS_COLORS.primary + '40' }}
                                        thumbColor={motionDetection ? SETTINGS_COLORS.primary : SETTINGS_COLORS.surface}
                                        ios_backgroundColor={SETTINGS_COLORS.border}
                                    />
                                }
                                showArrow={false}
                                iconColor={SETTINGS_COLORS.success}
                            />
                        </View>
                    </View>

                    {/* Video Settings */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>영상</Text>
                        <View style={styles.sectionCard}>
                            <SettingItem
                                icon="videocam-outline"
                                title="기본 화질"
                                subtitle={`현재: ${videoQuality}`}
                                onPress={() => {
                                    const qualities: Array<'480p' | '720p' | '1080p'> = ['480p', '720p', '1080p'];
                                    const currentIndex = qualities.indexOf(videoQuality);
                                    const nextQuality = qualities[(currentIndex + 1) % qualities.length];
                                    setVideoQuality(nextQuality);
                                }}
                                iconColor={SETTINGS_COLORS.primary}
                            />
                            <View style={styles.divider} />
                            <SettingItem
                                icon="wifi-outline"
                                title="데이터 사용"
                                subtitle={dataUsage === 'wifi' ? 'Wi-Fi에서만' : '모든 연결에서'}
                                onPress={() => {
                                    setDataUsage(dataUsage === 'wifi' ? 'all' : 'wifi');
                                }}
                                iconColor={SETTINGS_COLORS.warning}
                            />
                            <View style={styles.divider} />
                            <SettingItem
                                icon="cloud-upload-outline"
                                title="자동 백업"
                                subtitle="클라우드에 자동으로 백업"
                                rightElement={
                                    <Switch
                                        value={autoBackup}
                                        onValueChange={setAutoBackup}
                                        trackColor={{ false: SETTINGS_COLORS.border, true: SETTINGS_COLORS.primary + '40' }}
                                        thumbColor={autoBackup ? SETTINGS_COLORS.primary : SETTINGS_COLORS.surface}
                                        ios_backgroundColor={SETTINGS_COLORS.border}
                                    />
                                }
                                showArrow={false}
                                iconColor={SETTINGS_COLORS.success}
                            />
                        </View>
                    </View>

                    {/* Support and Info */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>지원 및 정보</Text>
                        <View style={styles.sectionCard}>
                            <SettingItem
                                icon="help-circle-outline"
                                title="고객 지원"
                                subtitle="도움이 필요하신가요?"
                                onPress={handleCustomerSupport}
                                iconColor={SETTINGS_COLORS.primary}
                            />
                            <View style={styles.divider} />
                            <SettingItem
                                icon="document-text-outline"
                                title="개인정보 처리방침"
                                onPress={handlePrivacyPolicy}
                                iconColor={SETTINGS_COLORS.warning}
                            />
                            <View style={styles.divider} />
                            <SettingItem
                                icon="document-outline"
                                title="서비스 이용약관"
                                onPress={handleTermsOfService}
                                iconColor={SETTINGS_COLORS.warning}
                            />
                            <View style={styles.divider} />
                            <SettingItem
                                icon="information-circle-outline"
                                title="앱 정보"
                                subtitle="버전 1.0.0"
                                onPress={handleAppInfo}
                                iconColor={SETTINGS_COLORS.textSecondary}
                            />
                        </View>
                    </View>

                    {/* Developer Tools */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>개발자 도구</Text>
                        <View style={styles.sectionCard}>
                            <SettingItem
                                icon="wifi"
                                title="WebSocket 테스트"
                                subtitle="실시간 통신 연결 및 메시지 테스트"
                                onPress={() => navigation.navigate('WebSocketTest')}
                                iconColor={SETTINGS_COLORS.primary}
                            />

                            <View style={styles.divider} />

                            <SettingItem
                                icon="server"
                                title="API 테스트"
                                subtitle="REST API 엔드포인트 테스트"
                                onPress={() => navigation.navigate('APITest')}
                                iconColor={SETTINGS_COLORS.success}
                            />

                            <View style={styles.divider} />

                            <SettingItem
                                icon="speedometer"
                                title="성능 모니터링"
                                subtitle="앱 성능 및 메모리 사용량 측정"
                                onPress={() => Alert.alert(
                                    '성능 정보',
                                    `메모리 사용량: ${Platform.OS === 'web' && (performance as any).memory
                                        ? `${((performance as any).memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`
                                        : '측정 불가'}\n` +
                                    `플랫폼: ${Platform.OS}\n` +
                                    `네트워크: ${navigator.onLine ? '온라인' : '오프라인'}\n` +
                                    `타임스탬프: ${new Date().toLocaleString()}`
                                )}
                                iconColor={SETTINGS_COLORS.warning}
                            />

                            <View style={styles.divider} />

                            <SettingItem
                                icon="analytics"
                                title="로그 뷰어"
                                subtitle="앱 로그 및 디버그 정보 확인"
                                onPress={() => Alert.alert(
                                    '로그 정보',
                                    '개발 모드에서만 사용 가능한 기능입니다.\n\n' +
                                    '현재 로그 레벨: INFO\n' +
                                    '로그 위치: React Native Debugger\n' +
                                    '실시간 로그: Console 확인'
                                )}
                                iconColor={SETTINGS_COLORS.textSecondary}
                            />
                        </View>
                    </View>

                    {/* Account Management */}
                    <View style={styles.section}>
                        <Text style={styles.dangerTitle}>위험 구역</Text>

                        <View style={styles.dangerCard}>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.dangerItem,
                                    pressed && styles.dangerItemPressed,
                                ]}
                                onPress={handleLogout}
                                android_ripple={{
                                    color: SETTINGS_COLORS.textSecondary + '20',
                                    borderless: false,
                                }}
                            >
                                <View style={styles.dangerLeft}>
                                    <LinearGradient
                                        colors={[SETTINGS_COLORS.textSecondary + '20', SETTINGS_COLORS.textSecondary + '10']}
                                        style={styles.iconContainer}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <Ionicons name="log-out-outline" size={20} color={SETTINGS_COLORS.textSecondary} />
                                    </LinearGradient>
                                    <Text style={styles.dangerText}>로그아웃</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={SETTINGS_COLORS.textSecondary} />
                            </Pressable>
                        </View>

                        <View style={styles.dangerCard}>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.dangerItem,
                                    pressed && styles.dangerItemPressed,
                                ]}
                                onPress={handleDeleteAccount}
                                android_ripple={{
                                    color: SETTINGS_COLORS.error + '20',
                                    borderless: false,
                                }}
                            >
                                <View style={styles.dangerLeft}>
                                    <LinearGradient
                                        colors={[SETTINGS_COLORS.error + '20', SETTINGS_COLORS.error + '10']}
                                        style={styles.iconContainer}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <Ionicons name="trash-outline" size={20} color={SETTINGS_COLORS.error} />
                                    </LinearGradient>
                                    <Text style={[styles.dangerText, { color: SETTINGS_COLORS.error }]}>계정 삭제</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={SETTINGS_COLORS.error} />
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: SETTINGS_COLORS.background,
    },
    safeArea: {
        flex: 1,
    },

    // Header - 홈캠 목록과 동일한 스타일
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: SETTINGS_COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: SETTINGS_COLORS.border,
    },
    profileButton: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: SETTINGS_COLORS.background,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: SETTINGS_COLORS.text,
    },
    headerSpacer: {
        width: 44,
    },

    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: spacing['3xl'],
    },

    // Profile Card - 카드 스타일
    profileCard: {
        backgroundColor: SETTINGS_COLORS.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    profileAvatarContainer: {
        position: 'relative',
    },
    profileAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    editAvatarButton: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: SETTINGS_COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: SETTINGS_COLORS.surface,
    },
    profileInitial: {
        fontSize: 24,
        color: SETTINGS_COLORS.surface,
        fontWeight: '700',
    },
    profileInfo: {
        flex: 1,
        gap: spacing['3xs'],
    },
    profileName: {
        fontSize: 17,
        fontWeight: '600',
        color: SETTINGS_COLORS.text,
    },
    profileEmail: {
        fontSize: 14,
        color: SETTINGS_COLORS.textSecondary,
        fontWeight: '400',
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing['3xs'],
        marginTop: spacing['3xs'],
    },
    verifiedText: {
        fontSize: 10,
        color: SETTINGS_COLORS.success,
        fontWeight: '500',
    },
    editProfileButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: SETTINGS_COLORS.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Section Styles
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: SETTINGS_COLORS.textSecondary,
        marginBottom: 12,
        paddingHorizontal: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionCard: {
        backgroundColor: SETTINGS_COLORS.surface,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },

    // Setting Items
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        minHeight: 56,
        backgroundColor: 'transparent',
    },
    settingItemPressed: {
        backgroundColor: SETTINGS_COLORS.primary + '08',
        transform: [{ scale: 0.98 }],
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 16,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingContent: {
        flex: 1,
        gap: spacing['3xs'],
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '400',
        color: SETTINGS_COLORS.text,
    },
    settingSubtitle: {
        fontSize: 13,
        color: SETTINGS_COLORS.textSecondary,
        fontWeight: '400',
    },
    settingRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    arrowContainer: {
        padding: 4,
        borderRadius: 8,
        backgroundColor: SETTINGS_COLORS.border + '30',
    },
    arrowIcon: {
        opacity: 0.8,
    },
    divider: {
        height: 0.5,
        backgroundColor: SETTINGS_COLORS.border,
        marginLeft: 20 + 16 + 32,
        marginRight: 20,
    },

    // Danger Zone
    dangerTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: SETTINGS_COLORS.error,
        marginBottom: 12,
        paddingHorizontal: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dangerCard: {
        backgroundColor: SETTINGS_COLORS.surface,
        borderRadius: 16,
        marginBottom: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: SETTINGS_COLORS.error + '20',
    },
    dangerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        minHeight: 56,
        backgroundColor: SETTINGS_COLORS.error + '05',
    },
    dangerItemPressed: {
        backgroundColor: SETTINGS_COLORS.error + '15',
        transform: [{ scale: 0.98 }],
    },
    dangerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    dangerText: {
        fontSize: 16,
        color: SETTINGS_COLORS.textSecondary,
        fontWeight: '400',
    },
}); 