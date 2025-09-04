import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Switch,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/authStore';
import { colors, spacing, radius, elevation } from '../design/tokens';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

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
    iconColor = colors.primary,
}) => (
    <TouchableOpacity
        style={styles.settingItem}
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={0.7}
    >
        <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
                <Ionicons name={icon as any} size={20} color={iconColor} />
            </View>
            <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{title}</Text>
                {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
            </View>
        </View>

        <View style={styles.settingRight}>
            {rightElement}
            {showArrow && onPress && (
                <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textSecondary}
                    style={styles.arrowIcon}
                />
            )}
        </View>
    </TouchableOpacity>
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

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.background, colors.surfaceAlt]}
                style={styles.gradientBackground}
            />

            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>설정</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Profile Card */}
                    <View style={styles.profileCard}>
                        <LinearGradient
                            colors={[colors.primary + '10', colors.surface]}
                            style={styles.profileGradient}
                        >
                            <View style={styles.profileHeader}>
                                <View style={styles.profileAvatarContainer}>
                                    <LinearGradient
                                        colors={[colors.primary, colors.accent]}
                                        style={styles.profileAvatar}
                                    >
                                        <Text style={styles.profileInitial}>
                                            {(user?.name || user?.email || 'U')[0].toUpperCase()}
                                        </Text>
                                    </LinearGradient>
                                    <TouchableOpacity style={styles.editAvatarButton}>
                                        <Ionicons name="camera" size={16} color={colors.surface} />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.profileInfo}>
                                    <Text style={styles.profileName}>
                                        {user?.name || '사용자'}
                                    </Text>
                                    <Text style={styles.profileEmail}>{user?.email}</Text>
                                    {user?.emailVerified && (
                                        <View style={styles.verifiedBadge}>
                                            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                                            <Text style={styles.verifiedText}>인증됨</Text>
                                        </View>
                                    )}
                                </View>

                                <TouchableOpacity style={styles.editProfileButton}>
                                    <Ionicons name="create-outline" size={20} color={colors.primary} />
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>
                    </View>

                    {/* Account Settings */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>계정</Text>
                        <View style={styles.sectionCard}>
                            <SettingItem
                                icon="person-outline"
                                title="프로필 편집"
                                subtitle="이름, 프로필 사진 변경"
                                onPress={() => Alert.alert('준비 중', '프로필 편집 기능은 준비 중입니다.')}
                                iconColor={colors.primary}
                            />
                            <View style={styles.divider} />
                            <SettingItem
                                icon="lock-closed-outline"
                                title="비밀번호 변경"
                                subtitle="새 비밀번호로 변경"
                                onPress={() => Alert.alert('준비 중', '비밀번호 변경 기능은 준비 중입니다.')}
                                iconColor={colors.warning}
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
                                        trackColor={{ false: colors.divider, true: colors.primary + '40' }}
                                        thumbColor={biometricLogin ? colors.primary : colors.surface}
                                        ios_backgroundColor={colors.divider}
                                    />
                                }
                                showArrow={false}
                                iconColor={colors.accent}
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
                                        trackColor={{ false: colors.divider, true: colors.primary + '40' }}
                                        thumbColor={pushNotifications ? colors.primary : colors.surface}
                                        ios_backgroundColor={colors.divider}
                                    />
                                }
                                showArrow={false}
                                iconColor={colors.error}
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
                                        trackColor={{ false: colors.divider, true: colors.primary + '40' }}
                                        thumbColor={emailNotifications ? colors.primary : colors.surface}
                                        ios_backgroundColor={colors.divider}
                                    />
                                }
                                showArrow={false}
                                iconColor={colors.accent}
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
                                        trackColor={{ false: colors.divider, true: colors.primary + '40' }}
                                        thumbColor={motionDetection ? colors.primary : colors.surface}
                                        ios_backgroundColor={colors.divider}
                                    />
                                }
                                showArrow={false}
                                iconColor={colors.warning}
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
                                iconColor={colors.primary}
                            />
                            <View style={styles.divider} />
                            <SettingItem
                                icon="wifi-outline"
                                title="데이터 사용"
                                subtitle={dataUsage === 'wifi' ? 'Wi-Fi에서만' : '모든 연결에서'}
                                onPress={() => {
                                    setDataUsage(dataUsage === 'wifi' ? 'all' : 'wifi');
                                }}
                                iconColor={colors.accent}
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
                                        trackColor={{ false: colors.divider, true: colors.primary + '40' }}
                                        thumbColor={autoBackup ? colors.primary : colors.surface}
                                        ios_backgroundColor={colors.divider}
                                    />
                                }
                                showArrow={false}
                                iconColor={colors.success}
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
                                onPress={() => Alert.alert('고객 지원', '고객 지원 기능은 준비 중입니다.')}
                                iconColor={colors.primary}
                            />
                            <View style={styles.divider} />
                            <SettingItem
                                icon="document-text-outline"
                                title="개인정보 처리방침"
                                onPress={() => Alert.alert('개인정보 처리방침', '웹사이트에서 확인하실 수 있습니다.')}
                                iconColor={colors.warning}
                            />
                            <View style={styles.divider} />
                            <SettingItem
                                icon="document-outline"
                                title="서비스 이용약관"
                                onPress={() => Alert.alert('서비스 이용약관', '웹사이트에서 확인하실 수 있습니다.')}
                                iconColor={colors.accent}
                            />
                            <View style={styles.divider} />
                            <SettingItem
                                icon="information-circle-outline"
                                title="앱 정보"
                                subtitle="버전 1.0.0"
                                onPress={() => Alert.alert('MIMO 홈캠', '버전 1.0.0\n© 2024 MIMO Team')}
                                iconColor={colors.textSecondary}
                            />
                        </View>
                    </View>

                    {/* Developer Tools */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>개발자 도구</Text>
                        <View style={styles.sectionCard}>
                            <SettingItem
                                icon="bug-outline"
                                title="WebSocket 테스트"
                                subtitle="실시간 통신 연결 테스트"
                                onPress={() => navigation.navigate('WebSocketTest')}
                                iconColor={colors.accent}
                            />
                        </View>
                    </View>

                    {/* Account Management */}
                    <View style={styles.section}>
                        <Text style={styles.dangerTitle}>위험 구역</Text>

                        <View style={styles.dangerCard}>
                            <TouchableOpacity
                                style={styles.dangerItem}
                                onPress={handleLogout}
                            >
                                <View style={styles.dangerLeft}>
                                    <View style={[styles.iconContainer, { backgroundColor: colors.textSecondary + '20' }]}>
                                        <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
                                    </View>
                                    <Text style={styles.dangerText}>로그아웃</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.dangerCard}>
                            <TouchableOpacity
                                style={styles.dangerItem}
                                onPress={handleDeleteAccount}
                            >
                                <View style={styles.dangerLeft}>
                                    <View style={[styles.iconContainer, { backgroundColor: colors.error + '20' }]}>
                                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                                    </View>
                                    <Text style={[styles.dangerText, { color: colors.error }]}>계정 삭제</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.error} />
                            </TouchableOpacity>
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
        backgroundColor: colors.background,
    },
    gradientBackground: {
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
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    headerSpacer: {
        width: 24,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.xl,
        paddingBottom: spacing['3xl'],
    },

    // Profile Card
    profileCard: {
        marginBottom: spacing['2xl'],
        borderRadius: radius.lg,
        overflow: 'hidden',
        ...elevation['3'],
    },
    profileGradient: {
        padding: spacing.xl,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
    },
    profileAvatarContainer: {
        position: 'relative',
    },
    profileAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        ...elevation['2'],
    },
    editAvatarButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: colors.surface,
    },
    profileInitial: {
        fontSize: 32,
        color: colors.surface,
        fontWeight: '800',
    },
    profileInfo: {
        flex: 1,
        gap: spacing.xs,
    },
    profileName: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    profileEmail: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.xs,
    },
    verifiedText: {
        fontSize: 12,
        color: colors.success,
        fontWeight: '600',
    },
    editProfileButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primary + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Section Styles
    section: {
        marginBottom: spacing['2xl'],
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.sm,
    },
    sectionCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        overflow: 'hidden',
        ...elevation['2'],
    },

    // Setting Items
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.lg,
        minHeight: 64,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: spacing.md,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingContent: {
        flex: 1,
        gap: spacing['2xs'],
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    settingSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    settingRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    arrowIcon: {
        marginLeft: spacing.xs,
    },
    divider: {
        height: 1,
        backgroundColor: colors.divider,
        marginLeft: spacing.lg + spacing.md + 44,
        marginRight: spacing.lg,
    },

    // Danger Zone
    dangerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.error,
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.sm,
    },
    dangerCard: {
        marginBottom: spacing.md,
        backgroundColor: colors.error + '05',
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.error + '20',
        overflow: 'hidden',
    },
    dangerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.lg,
    },
    dangerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    dangerText: {
        fontSize: 16,
        color: colors.textSecondary,
        fontWeight: '600',
    },
}); 