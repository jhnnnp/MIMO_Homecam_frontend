import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { colors, spacing, radius, elevation } from '../design/tokens';
import { useNotifications, useUnreadNotifications, useNotificationStats } from '../hooks/useNotification';

interface NotificationSettingsScreenProps {
    navigation: any;
}

export default function NotificationSettingsScreen({ navigation }: NotificationSettingsScreenProps) {
    const [notificationSettings, setNotificationSettings] = useState({
        motion: true,
        system: true,
        security: true,
        maintenance: false,
        sound: true,
        vibration: true,
        quietHours: false,
        quietStart: '22:00',
        quietEnd: '08:00',
    });

    const { data: notifications } = useNotifications();
    const { data: unreadCount } = useUnreadNotifications();
    const { data: stats } = useNotificationStats();

    useEffect(() => {
        loadNotificationSettings();
    }, []);

    const loadNotificationSettings = async () => {
        try {
            // 실제로는 AsyncStorage나 서버에서 설정을 로드
            console.log('📱 알림 설정 로드');
        } catch (error) {
            console.error('❌ 알림 설정 로드 실패:', error);
        }
    };

    const saveNotificationSettings = async () => {
        try {
            // 실제로는 AsyncStorage나 서버에 설정을 저장
            console.log('💾 알림 설정 저장:', notificationSettings);
        } catch (error) {
            console.error('❌ 알림 설정 저장 실패:', error);
        }
    };

    const handleToggleSetting = (key: string) => {
        setNotificationSettings(prev => ({
            ...prev,
            [key]: !prev[key as keyof typeof prev],
        }));
        saveNotificationSettings();
    };

    const handleTestNotification = async () => {
        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: '테스트 알림',
                    body: '알림 설정이 정상적으로 작동합니다!',
                    data: { type: 'test' },
                },
                trigger: null, // 즉시 전송
            });
            Alert.alert('완료', '테스트 알림이 전송되었습니다.');
        } catch (error) {
            console.error('❌ 테스트 알림 전송 실패:', error);
            Alert.alert('오류', '테스트 알림을 전송할 수 없습니다.');
        }
    };

    const handleClearAllNotifications = () => {
        Alert.alert(
            '모든 알림 삭제',
            '모든 알림을 삭제하시겠습니까?',
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '삭제',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await Notifications.dismissAllNotificationsAsync();
                            Alert.alert('완료', '모든 알림이 삭제되었습니다.');
                        } catch (error) {
                            console.error('❌ 알림 삭제 실패:', error);
                            Alert.alert('오류', '알림을 삭제할 수 없습니다.');
                        }
                    },
                },
            ]
        );
    };

    const handleRequestPermissions = async () => {
        try {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status === 'granted') {
                Alert.alert('완료', '알림 권한이 허용되었습니다.');
            } else {
                Alert.alert('오류', '알림 권한이 필요합니다.');
            }
        } catch (error) {
            console.error('❌ 알림 권한 요청 실패:', error);
            Alert.alert('오류', '알림 권한을 요청할 수 없습니다.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>

                <View style={styles.headerContent}>
                    <Text style={styles.title}>알림 설정</Text>
                    <Text style={styles.subtitle}>알림을 관리하고 설정하세요</Text>
                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* 알림 통계 */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="analytics" size={24} color={colors.primary} />
                        <Text style={styles.sectionTitle}>알림 통계</Text>
                    </View>

                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{notifications?.length || 0}</Text>
                            <Text style={styles.statLabel}>총 알림</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{unreadCount?.count || 0}</Text>
                            <Text style={styles.statLabel}>읽지 않음</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{stats?.todayNotifications || 0}</Text>
                            <Text style={styles.statLabel}>오늘</Text>
                        </View>
                    </View>
                </View>

                {/* 알림 유형 설정 */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="notifications" size={24} color={colors.primary} />
                        <Text style={styles.sectionTitle}>알림 유형</Text>
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <View style={styles.settingHeader}>
                                <Ionicons name="eye" size={20} color={colors.warning} />
                                <Text style={styles.settingLabel}>모션 감지</Text>
                            </View>
                            <Text style={styles.settingDescription}>
                                움직임이 감지될 때 알림을 받습니다
                            </Text>
                        </View>
                        <Switch
                            value={notificationSettings.motion}
                            onValueChange={() => handleToggleSetting('motion')}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.surface}
                        />
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <View style={styles.settingHeader}>
                                <Ionicons name="shield" size={20} color={colors.error} />
                                <Text style={styles.settingLabel}>보안 알림</Text>
                            </View>
                            <Text style={styles.settingDescription}>
                                보안 관련 중요 알림을 받습니다
                            </Text>
                        </View>
                        <Switch
                            value={notificationSettings.security}
                            onValueChange={() => handleToggleSetting('security')}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.surface}
                        />
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <View style={styles.settingHeader}>
                                <Ionicons name="settings" size={20} color={colors.textSecondary} />
                                <Text style={styles.settingLabel}>시스템 알림</Text>
                            </View>
                            <Text style={styles.settingDescription}>
                                시스템 상태 및 업데이트 알림을 받습니다
                            </Text>
                        </View>
                        <Switch
                            value={notificationSettings.system}
                            onValueChange={() => handleToggleSetting('system')}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.surface}
                        />
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <View style={styles.settingHeader}>
                                <Ionicons name="construct" size={20} color={colors.textSecondary} />
                                <Text style={styles.settingLabel}>유지보수 알림</Text>
                            </View>
                            <Text style={styles.settingDescription}>
                                장비 점검 및 유지보수 알림을 받습니다
                            </Text>
                        </View>
                        <Switch
                            value={notificationSettings.maintenance}
                            onValueChange={() => handleToggleSetting('maintenance')}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.surface}
                        />
                    </View>
                </View>

                {/* 알림 설정 */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="tune" size={24} color={colors.primary} />
                        <Text style={styles.sectionTitle}>알림 설정</Text>
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <View style={styles.settingHeader}>
                                <Ionicons name="volume-high" size={20} color={colors.text} />
                                <Text style={styles.settingLabel}>소리</Text>
                            </View>
                            <Text style={styles.settingDescription}>
                                알림 소리를 재생합니다
                            </Text>
                        </View>
                        <Switch
                            value={notificationSettings.sound}
                            onValueChange={() => handleToggleSetting('sound')}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.surface}
                        />
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <View style={styles.settingHeader}>
                                <Ionicons name="phone-portrait" size={20} color={colors.text} />
                                <Text style={styles.settingLabel}>진동</Text>
                            </View>
                            <Text style={styles.settingDescription}>
                                알림 시 진동을 울립니다
                            </Text>
                        </View>
                        <Switch
                            value={notificationSettings.vibration}
                            onValueChange={() => handleToggleSetting('vibration')}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.surface}
                        />
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <View style={styles.settingHeader}>
                                <Ionicons name="moon" size={20} color={colors.text} />
                                <Text style={styles.settingLabel}>방해 금지 시간</Text>
                            </View>
                            <Text style={styles.settingDescription}>
                                지정된 시간에는 알림을 받지 않습니다
                            </Text>
                        </View>
                        <Switch
                            value={notificationSettings.quietHours}
                            onValueChange={() => handleToggleSetting('quietHours')}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.surface}
                        />
                    </View>
                </View>

                {/* 알림 관리 */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="manage" size={24} color={colors.primary} />
                        <Text style={styles.sectionTitle}>알림 관리</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleTestNotification}
                    >
                        <Ionicons name="play" size={20} color={colors.primary} />
                        <Text style={styles.actionButtonText}>테스트 알림 전송</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleRequestPermissions}
                    >
                        <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
                        <Text style={styles.actionButtonText}>권한 확인</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.dangerButton]}
                        onPress={handleClearAllNotifications}
                    >
                        <Ionicons name="trash" size={20} color={colors.error} />
                        <Text style={[styles.actionButtonText, styles.dangerText]}>
                            모든 알림 삭제
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* 최근 알림 */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="time" size={24} color={colors.primary} />
                        <Text style={styles.sectionTitle}>최근 알림</Text>
                    </View>

                    {notifications && notifications.length > 0 ? (
                        notifications.slice(0, 5).map((notification, index) => (
                            <View key={index} style={styles.notificationItem}>
                                <View style={styles.notificationIcon}>
                                    <Ionicons
                                        name={
                                            notification.type === 'motion' ? 'eye' :
                                                notification.type === 'security' ? 'shield' :
                                                    notification.type === 'system' ? 'settings' :
                                                        'notifications'
                                        }
                                        size={16}
                                        color={
                                            notification.type === 'motion' ? colors.warning :
                                                notification.type === 'security' ? colors.error :
                                                    colors.textSecondary
                                        }
                                    />
                                </View>
                                <View style={styles.notificationContent}>
                                    <Text style={styles.notificationTitle} numberOfLines={1}>
                                        {notification.title || '알림'}
                                    </Text>
                                    <Text style={styles.notificationMessage} numberOfLines={2}>
                                        {notification.message || '알림 내용이 없습니다.'}
                                    </Text>
                                    <Text style={styles.notificationTime}>
                                        {new Date(notification.created_at).toLocaleString('ko-KR')}
                                    </Text>
                                </View>
                                {!notification.is_read && (
                                    <View style={styles.unreadDot} />
                                )}
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyNotifications}>
                            <Ionicons name="notifications-off" size={48} color={colors.textSecondary} />
                            <Text style={styles.emptyNotificationsText}>알림이 없습니다</Text>
                            <Text style={styles.emptyNotificationsDescription}>
                                새로운 알림이 오면 여기에 표시됩니다
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    content: {
        flex: 1,
        padding: spacing.lg,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginLeft: spacing.sm,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        ...elevation.small,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: spacing.xs,
    },
    statLabel: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    settingInfo: {
        flex: 1,
        marginRight: spacing.md,
    },
    settingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
        marginLeft: spacing.sm,
    },
    settingDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        marginLeft: spacing.xl,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        marginBottom: spacing.sm,
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
        marginLeft: spacing.sm,
    },
    dangerButton: {
        backgroundColor: colors.error + '20',
    },
    dangerText: {
        color: colors.error,
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        marginBottom: spacing.sm,
        position: 'relative',
    },
    notificationIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.surfaceAlt,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    notificationContent: {
        flex: 1,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    notificationMessage: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    notificationTime: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
        marginLeft: spacing.sm,
    },
    emptyNotifications: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    emptyNotificationsText: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    emptyNotificationsDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: spacing.lg,
    },
}); 