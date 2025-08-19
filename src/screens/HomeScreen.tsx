import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Image,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/authStore';
import { AppBar, Card, Badge, Button, LoadingState, EmptyState, ErrorState } from '../components';
import { colors, typography, spacing, radius } from '../design/tokens';
import { useCameras } from '../hooks/useCamera';
import { useQuery } from '@tanstack/react-query';
import eventService from '../services/eventService';
import notificationService from '../services/notificationService';
import { Camera, Event as EventType } from '../types/api';

interface HomeScreenProps {
    navigation: any;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
    const { user } = useAuthStore();

    const {
        data: cameras,
        isLoading: camerasLoading,
        error: camerasError,
        refetch: refetchCameras
    } = useCameras();

    const {
        data: recentEvents,
        isLoading: eventsLoading,
        error: eventsError,
        refetch: refetchEvents
    } = useQuery({
        queryKey: ['events', 'recent'],
        queryFn: async () => {
            const response = await eventService.getEvents({ limit: 5 });
            if (!response.ok) throw new Error(response.error?.message || '최근 이벤트를 불러올 수 없습니다');
            return response.data;
        },
    });

    const {
        data: unreadNotifications,
        refetch: refetchNotifications
    } = useQuery({
        queryKey: ['notifications', 'unread'],
        queryFn: async () => {
            const response = await notificationService.getUnreadCount();
            if (!response.ok) throw new Error(response.error?.message || '알림 수를 불러올 수 없습니다');
            return response.data;
        },
    });

    const isLoading = camerasLoading || eventsLoading;
    const hasError = !!camerasError || !!eventsError;

    const onRefresh = async () => {
        await Promise.all([refetchCameras(), refetchEvents(), refetchNotifications()]);
    };

    const handleCameraPress = (camera: Camera) => {
        if (camera.isOnline) {
            navigation.navigate('LiveStream', { cameraId: camera.id, cameraName: camera.name });
        }
    };

    const handleEventPress = (event: EventType) => {
        navigation.navigate('Events', { eventId: event.id });
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return '좋은 아침이에요';
        if (hour < 18) return '좋은 오후에요';
        return '좋은 저녁이에요';
    };

    const getEventTypeIcon = (type: string) => {
        switch (type) {
            case 'motion': return 'walk-outline';
            case 'person': return 'person-outline';
            case 'vehicle': return 'car-outline';
            default: return 'alert-circle-outline';
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <AppBar title="MIMO" />
                <LoadingState message="홈 화면을 불러오는 중..." />
            </SafeAreaView>
        );
    }

    if (hasError) {
        return (
            <SafeAreaView style={styles.container}>
                <AppBar title="MIMO" />
                <ErrorState
                    title="오류 발생"
                    message="홈 화면을 불러올 수 없습니다."
                    buttonText="다시 시도"
                    onRetry={onRefresh}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <AppBar
                title="MIMO"
                actions={[
                    {
                        icon: 'notifications-outline',
                        onPress: () => navigation.navigate('Events', { screen: 'Notifications' }), // Assuming notifications are part of Events tab
                        accessibilityLabel: '알림',
                        badge: unreadNotifications?.count || 0,
                    },
                    {
                        icon: 'person-circle-outline',
                        onPress: () => navigation.navigate('Settings'),
                        accessibilityLabel: '프로필',
                    },
                ]}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
            >
                <View style={styles.header}>
                    <Text style={styles.greeting}>{getGreeting()},</Text>
                    <Text style={styles.userName}>{user?.name || user?.email}님!</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>즐겨찾기 카메라</Text>
                    {cameras && cameras.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cameraList}>
                            {cameras.map((camera) => (
                                <TouchableOpacity key={camera.id} onPress={() => handleCameraPress(camera)} style={styles.cameraCard} disabled={!camera.isOnline}>
                                    <View style={styles.cameraPlaceholder}>
                                        <Ionicons name="videocam-outline" size={32} color={camera.isOnline ? colors.primary : colors.textSecondary} />
                                    </View>
                                    <Badge type={camera.isOnline ? 'online' : 'offline'} variant="dot" style={styles.cameraBadge} />
                                    <Text style={styles.cameraName} numberOfLines={1}>{camera.name}</Text>
                                    <Text style={styles.cameraLocation} numberOfLines={1}>{camera.location || ' '}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    ) : (
                        <EmptyState title="카메라 없음" message="새 카메라를 추가해 시작해보세요." icon="videocam-off-outline" />
                    )}
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>최근 이벤트</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Events')}>
                            <Text style={styles.sectionAction}>전체 보기</Text>
                        </TouchableOpacity>
                    </View>
                    {recentEvents && recentEvents.length > 0 ? (
                        recentEvents.map(event => (
                            <Card key={event.id} style={styles.eventCard} pressable onPress={() => handleEventPress(event)}>
                                <View style={styles.eventContent}>
                                    <View style={styles.eventIcon}>
                                        <Ionicons name={getEventTypeIcon(event.type)} size={20} color={colors.primary} />
                                    </View>
                                    <View style={styles.eventDetails}>
                                        <Text style={styles.eventText}>{`${event.cameraName || '카메라'}에서 ${event.type} 감지`}</Text>
                                        <Text style={styles.eventTime}>{new Date(event.createdAt).toLocaleTimeString('ko-KR')}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                </View>
                            </Card>
                        ))
                    ) : (
                        <EmptyState title="이벤트 없음" message="새 이벤트가 여기에 표시됩니다." icon="film-outline" />
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollView: { flex: 1 },
    scrollContent: { padding: spacing.xl },
    header: { marginBottom: spacing.xl },
    greeting: { ...typography.h2, color: colors.textSecondary },
    userName: { ...typography.h1, color: colors.text },
    section: { marginBottom: spacing.xl },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    sectionTitle: { ...typography.h2, color: colors.text },
    sectionAction: { ...typography.body, color: colors.primary, fontWeight: '600' },
    cameraList: { paddingRight: spacing.xl },
    cameraCard: { width: 120, marginRight: spacing.md, alignItems: 'center' },
    cameraPlaceholder: { width: 120, height: 80, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center' },
    cameraBadge: { position: 'absolute', top: spacing.xs, right: spacing.xs },
    cameraName: { ...typography.body, fontWeight: '600', color: colors.text, marginTop: spacing.sm },
    cameraLocation: { ...typography.caption, color: colors.textSecondary },
    eventCard: { marginBottom: spacing.sm, padding: spacing.md },
    eventContent: { flexDirection: 'row', alignItems: 'center' },
    eventIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
    eventDetails: { flex: 1 },
    eventText: { ...typography.body, color: colors.text },
    eventTime: { ...typography.caption, color: colors.textSecondary },
}); 