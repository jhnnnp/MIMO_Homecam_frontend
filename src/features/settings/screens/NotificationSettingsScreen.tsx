import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useNotifications, useUnreadNotifications, useNotificationStats } from '@/features/settings/hooks/useNotification';

// 홈캠 목록과 일치하는 iOS 스타일 색상 팔레트
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
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={SETTINGS_COLORS.background} />
            <SafeAreaView style={styles.safeArea}>
                {/* Header - 홈캠 목록과 동일한 스타일 */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="chevron-back" size={24} color={SETTINGS_COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>알림 설정</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* 알림 통계 */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="analytics" size={24} color={SETTINGS_COLORS.primary} />
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
                            <Ionicons name="notifications" size={24} color={SETTINGS_COLORS.primary} />
                            <Text style={styles.sectionTitle}>알림 유형</Text>
                        </View>

                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <View style={styles.settingHeader}>
                                    <Ionicons name="eye" size={20} color={SETTINGS_COLORS.warning} />
                                    <Text style={styles.settingLabel}>모션 감지</Text>
                                </View>
                                <Text style={styles.settingDescription}>
                                    움직임이 감지될 때 알림을 받습니다
                                </Text>
                            </View>
                            <Switch
                                value={notificationSettings.motion}
                                onValueChange={() => handleToggleSetting('motion')}
                                trackColor={{ false: SETTINGS_COLORS.border, true: SETTINGS_COLORS.primary }}
                                thumbColor={SETTINGS_COLORS.surface}
                            />
                        </View>

                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <View style={styles.settingHeader}>
                                    <Ionicons name="shield" size={20} color={SETTINGS_COLORS.error} />
                                    <Text style={styles.settingLabel}>보안 알림</Text>
                                </View>
                                <Text style={styles.settingDescription}>
                                    보안 관련 중요 알림을 받습니다
                                </Text>
                            </View>
                            <Switch
                                value={notificationSettings.security}
                                onValueChange={() => handleToggleSetting('security')}
                                trackColor={{ false: SETTINGS_COLORS.border, true: SETTINGS_COLORS.primary }}
                                thumbColor={SETTINGS_COLORS.surface}
                            />
                        </View>

                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <View style={styles.settingHeader}>
                                    <Ionicons name="settings" size={20} color={SETTINGS_COLORS.textSecondary} />
                                    <Text style={styles.settingLabel}>시스템 알림</Text>
                                </View>
                                <Text style={styles.settingDescription}>
                                    시스템 상태 및 업데이트 알림을 받습니다
                                </Text>
                            </View>
                            <Switch
                                value={notificationSettings.system}
                                onValueChange={() => handleToggleSetting('system')}
                                trackColor={{ false: SETTINGS_COLORS.border, true: SETTINGS_COLORS.primary }}
                                thumbColor={SETTINGS_COLORS.surface}
                            />
                        </View>

                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <View style={styles.settingHeader}>
                                    <Ionicons name="construct" size={20} color={SETTINGS_COLORS.textSecondary} />
                                    <Text style={styles.settingLabel}>유지보수 알림</Text>
                                </View>
                                <Text style={styles.settingDescription}>
                                    장비 점검 및 유지보수 알림을 받습니다
                                </Text>
                            </View>
                            <Switch
                                value={notificationSettings.maintenance}
                                onValueChange={() => handleToggleSetting('maintenance')}
                                trackColor={{ false: SETTINGS_COLORS.border, true: SETTINGS_COLORS.primary }}
                                thumbColor={SETTINGS_COLORS.surface}
                            />
                        </View>
                    </View>

                    {/* 알림 설정 */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="tune" size={24} color={SETTINGS_COLORS.primary} />
                            <Text style={styles.sectionTitle}>알림 설정</Text>
                        </View>

                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <View style={styles.settingHeader}>
                                    <Ionicons name="volume-high" size={20} color={SETTINGS_COLORS.text} />
                                    <Text style={styles.settingLabel}>소리</Text>
                                </View>
                                <Text style={styles.settingDescription}>
                                    알림 소리를 재생합니다
                                </Text>
                            </View>
                            <Switch
                                value={notificationSettings.sound}
                                onValueChange={() => handleToggleSetting('sound')}
                                trackColor={{ false: SETTINGS_COLORS.border, true: SETTINGS_COLORS.primary }}
                                thumbColor={SETTINGS_COLORS.surface}
                            />
                        </View>

                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <View style={styles.settingHeader}>
                                    <Ionicons name="phone-portrait" size={20} color={SETTINGS_COLORS.text} />
                                    <Text style={styles.settingLabel}>진동</Text>
                                </View>
                                <Text style={styles.settingDescription}>
                                    알림 시 진동을 울립니다
                                </Text>
                            </View>
                            <Switch
                                value={notificationSettings.vibration}
                                onValueChange={() => handleToggleSetting('vibration')}
                                trackColor={{ false: SETTINGS_COLORS.border, true: SETTINGS_COLORS.primary }}
                                thumbColor={SETTINGS_COLORS.surface}
                            />
                        </View>

                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <View style={styles.settingHeader}>
                                    <Ionicons name="moon" size={20} color={SETTINGS_COLORS.text} />
                                    <Text style={styles.settingLabel}>방해 금지 시간</Text>
                                </View>
                                <Text style={styles.settingDescription}>
                                    지정된 시간에는 알림을 받지 않습니다
                                </Text>
                            </View>
                            <Switch
                                value={notificationSettings.quietHours}
                                onValueChange={() => handleToggleSetting('quietHours')}
                                trackColor={{ false: SETTINGS_COLORS.border, true: SETTINGS_COLORS.primary }}
                                thumbColor={SETTINGS_COLORS.surface}
                            />
                        </View>
                    </View>

                    {/* 알림 관리 */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="manage" size={24} color={SETTINGS_COLORS.primary} />
                            <Text style={styles.sectionTitle}>알림 관리</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={handleTestNotification}
                        >
                            <Ionicons name="play" size={20} color={SETTINGS_COLORS.primary} />
                            <Text style={styles.actionButtonText}>테스트 알림 전송</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={handleRequestPermissions}
                        >
                            <Ionicons name="shield-checkmark" size={20} color={SETTINGS_COLORS.primary} />
                            <Text style={styles.actionButtonText}>권한 확인</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, styles.dangerButton]}
                            onPress={handleClearAllNotifications}
                        >
                            <Ionicons name="trash" size={20} color={SETTINGS_COLORS.error} />
                            <Text style={[styles.actionButtonText, styles.dangerText]}>
                                모든 알림 삭제
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* 최근 알림 */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="time" size={24} color={SETTINGS_COLORS.primary} />
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
                                                notification.type === 'motion' ? SETTINGS_COLORS.warning :
                                                    notification.type === 'security' ? SETTINGS_COLORS.error :
                                                        SETTINGS_COLORS.textSecondary
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
                                <Ionicons name="notifications-off" size={48} color={SETTINGS_COLORS.textSecondary} />
                                <Text style={styles.emptyNotificationsText}>알림이 없습니다</Text>
                                <Text style={styles.emptyNotificationsDescription}>
                                    새로운 알림이 오면 여기에 표시됩니다
                                </Text>
                            </View>
                        )}
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
    backButton: {
        padding: 8,
        borderRadius: 20,
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
    content: {
        flex: 1,
        padding: 20,
    },
    section: {
        backgroundColor: SETTINGS_COLORS.surface,
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: SETTINGS_COLORS.text,
        marginLeft: 12,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: SETTINGS_COLORS.surface,
        borderRadius: 20,
        padding: 20,
        fontSize: 12,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: SETTINGS_COLORS.primary,
        marginBottom: 8,
    },
    statLabel: {
        fontSize: 14,
        color: SETTINGS_COLORS.textSecondary,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: SETTINGS_COLORS.border,
    },
    settingInfo: {
        flex: 1,
        marginRight: 16,
    },
    settingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: SETTINGS_COLORS.text,
        marginLeft: 12,
    },
    settingDescription: {
        fontSize: 14,
        color: SETTINGS_COLORS.textSecondary,
        marginLeft: 24,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: SETTINGS_COLORS.surface,
        borderRadius: 16,
        marginBottom: 12,
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: SETTINGS_COLORS.text,
        marginLeft: 12,
    },
    dangerButton: {
        backgroundColor: SETTINGS_COLORS.error + '20',
    },
    dangerText: {
        color: SETTINGS_COLORS.error,
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: SETTINGS_COLORS.surface,
        borderRadius: 16,
        marginBottom: 12,
        position: 'relative',
    },
    notificationIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: SETTINGS_COLORS.surfaceAlt,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    notificationContent: {
        flex: 1,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: SETTINGS_COLORS.text,
        marginBottom: 8,
    },
    notificationMessage: {
        fontSize: 14,
        color: SETTINGS_COLORS.textSecondary,
        marginBottom: 8,
    },
    notificationTime: {
        fontSize: 12,
        color: SETTINGS_COLORS.textSecondary,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: SETTINGS_COLORS.primary,
        marginLeft: 12,
    },
    emptyNotifications: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    emptyNotificationsText: {
        fontSize: 16,
        fontWeight: '500',
        color: SETTINGS_COLORS.text,
        marginTop: 16,
        marginBottom: 12,
    },
    emptyNotificationsDescription: {
        fontSize: 14,
        color: SETTINGS_COLORS.textSecondary,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
}); 