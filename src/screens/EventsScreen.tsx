import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { AppBar, Card, Badge, Button, LoadingState, EmptyState, ErrorState } from '../components';
import { colors, typography, spacing, radius, elevation } from '../design/tokens';
import { useEvents, useDeleteEvent, useToggleEventPin } from '../hooks/useEvent';
import Toast from 'react-native-toast-message';
import { Event } from '../types/api';

const { width: screenWidth } = Dimensions.get('window');

interface EventsScreenProps {
    navigation: any;
}

const eventTypeConfig = {
    motion: { icon: 'walk-outline' as keyof typeof Ionicons.glyphMap, label: '동작 감지', color: colors.warning },
    person: { icon: 'person-outline' as keyof typeof Ionicons.glyphMap, label: '사람 감지', color: colors.primary },
    vehicle: { icon: 'car-outline' as keyof typeof Ionicons.glyphMap, label: '차량 감지', color: colors.accent },
    sound: { icon: 'volume-high-outline' as keyof typeof Ionicons.glyphMap, label: '소음 감지', color: colors.error },
    default: { icon: 'alert-circle-outline' as keyof typeof Ionicons.glyphMap, label: '기타', color: colors.textSecondary },
};

export default function EventsScreen({ navigation }: EventsScreenProps) {
    const [filterType, setFilterType] = useState<'all' | 'motion' | 'person' | 'vehicle' | 'sound'>('all');
    const [showPinnedOnly, setShowPinnedOnly] = useState(false);
    const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');

    const filters = {
        type: filterType === 'all' ? undefined : filterType,
        isPinned: showPinnedOnly ? true : undefined,
        timeRange: timeFilter,
    };

    const {
        data: events,
        isLoading,
        error,
        refetch
    } = useEvents(filters);

    const deleteEvent = useDeleteEvent();
    const toggleEventPin = useToggleEventPin();

    const onRefresh = async () => {
        await refetch();
    };

    const handlePinEvent = async (event: Event) => {
        try {
            await toggleEventPin.mutateAsync(event.id);
            Toast.show({
                type: 'success',
                text1: event.isPinned ? '즐겨찾기 해제' : '즐겨찾기 추가',
            });
        } catch (e) {
            Toast.show({
                type: 'error',
                text1: '오류가 발생했습니다',
            });
        }
    };

    const handleDeleteEvent = (event: Event) => {
        Alert.alert(
            '이벤트 삭제',
            '이 이벤트를 영구적으로 삭제하시겠어요?',
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '삭제',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteEvent.mutateAsync(event.id);
                            Toast.show({
                                type: 'success',
                                text1: '이벤트가 삭제되었습니다',
                            });
                        } catch (e) {
                            Toast.show({
                                type: 'error',
                                text1: '삭제에 실패했습니다',
                            });
                        }
                    },
                },
            ]
        );
    };

    const getEventConfig = (type: string) => {
        return eventTypeConfig[type as keyof typeof eventTypeConfig] || eventTypeConfig.default;
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 1) {
            const diffInMinutes = Math.floor(diffInHours * 60);
            return `${diffInMinutes}분 전`;
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)}시간 전`;
        } else {
            return date.toLocaleDateString('ko-KR', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    };

    const getEventStats = () => {
        if (!events) return { total: 0, today: 0, pinned: 0, byType: {} };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayEvents = events.filter(event =>
            new Date(event.createdAt) >= today
        );

        const pinnedEvents = events.filter(event => event.isPinned);

        const byType = events.reduce((acc, event) => {
            acc[event.type] = (acc[event.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            total: events.length,
            today: todayEvents.length,
            pinned: pinnedEvents.length,
            byType
        };
    };

    const stats = getEventStats();

    const renderEventItem = ({ item, index }: { item: Event; index: number }) => {
        const config = getEventConfig(item.type);
        const isLastItem = index === events?.length! - 1;

        return (
            <View style={styles.timelineItem}>
                {/* Timeline Line */}
                <View style={styles.timelineLineContainer}>
                    <View style={[styles.timelineNode, { backgroundColor: config.color }]}>
                        <Ionicons name={config.icon} size={12} color={colors.surface} />
                    </View>
                    {!isLastItem && <View style={styles.timelineLine} />}
                </View>

                {/* Event Card */}
                <Card style={styles.eventCard}>
                    <View style={styles.eventHeader}>
                        <View style={styles.eventTypeContainer}>
                            <View style={[styles.eventTypeIcon, { backgroundColor: config.color + '20' }]}>
                                <Ionicons name={config.icon} size={16} color={config.color} />
                            </View>
                            <View style={styles.eventTitleContainer}>
                                <Text style={styles.eventTitle}>
                                    카메라 {item.cameraId}
                                </Text>
                                <Text style={styles.eventSubtitle}>
                                    {config.label}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.eventActions}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handlePinEvent(item)}
                            >
                                <Ionicons
                                    name={item.isPinned ? 'star' : 'star-outline'}
                                    size={16}
                                    color={item.isPinned ? colors.accent : colors.textSecondary}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handleDeleteEvent(item)}
                            >
                                <Ionicons name="trash-outline" size={16} color={colors.error} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.eventContent}>
                        <View style={styles.eventThumbnail}>
                            <LinearGradient
                                colors={[config.color + '20', config.color + '10']}
                                style={styles.thumbnailGradient}
                            >
                                <Ionicons name="videocam-outline" size={20} color={config.color} />
                            </LinearGradient>
                        </View>

                        <View style={styles.eventDetails}>
                            <Text style={styles.eventDescription}>
                                이벤트 ID: {item.id}
                            </Text>
                            <Text style={styles.eventTime}>
                                {formatTimestamp(item.createdAt)}
                            </Text>
                            {item.score && (
                                <View style={styles.confidenceContainer}>
                                    <Text style={styles.confidenceLabel}>신뢰도: </Text>
                                    <Badge
                                        type={item.score > 80 ? 'success' : item.score > 60 ? 'warning' : 'error'}
                                        variant="status"
                                        label={`${item.score}%`}
                                    />
                                </View>
                            )}
                        </View>
                    </View>
                </Card>
            </View>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.background, colors.surfaceAlt]}
                    style={styles.gradientBackground}
                />
                <SafeAreaView style={styles.safeArea}>
                    <AppBar title="이벤트" variant="transparent" />
                    <LoadingState message="이벤트를 불러오는 중..." />
                </SafeAreaView>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.background, colors.surfaceAlt]}
                    style={styles.gradientBackground}
                />
                <SafeAreaView style={styles.safeArea}>
                    <AppBar title="이벤트" variant="transparent" />
                    <ErrorState
                        title="오류 발생"
                        message="이벤트 목록을 불러올 수 없습니다."
                        buttonText="다시 시도"
                        onRetry={onRefresh}
                    />
                </SafeAreaView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.background, colors.surfaceAlt]}
                style={styles.gradientBackground}
            />

            <SafeAreaView style={styles.safeArea}>
                <AppBar
                    title="이벤트"
                    variant="transparent"
                    actions={[
                        {
                            icon: showPinnedOnly ? 'star' : 'star-outline',
                            onPress: () => setShowPinnedOnly(!showPinnedOnly),
                            accessibilityLabel: '즐겨찾기 필터'
                        },
                        {
                            icon: 'funnel-outline',
                            onPress: () => { },
                            accessibilityLabel: '필터'
                        },
                    ]}
                />

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Statistics Section */}
                    <View style={styles.statsSection}>
                        <Text style={styles.sectionTitle}>통계</Text>
                        <View style={styles.statsGrid}>
                            <Card style={[styles.statCard, styles.totalCard]}>
                                <View style={styles.statContent}>
                                    <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
                                        <Ionicons name="film" size={18} color={colors.primary} />
                                    </View>
                                    <View style={styles.statInfo}>
                                        <Text style={styles.statNumber}>{stats.total}</Text>
                                        <Text style={styles.statLabel}>총 이벤트</Text>
                                    </View>
                                </View>
                            </Card>

                            <Card style={[styles.statCard, styles.todayCard]}>
                                <View style={styles.statContent}>
                                    <View style={[styles.statIcon, { backgroundColor: colors.accent + '20' }]}>
                                        <Ionicons name="today" size={18} color={colors.accent} />
                                    </View>
                                    <View style={styles.statInfo}>
                                        <Text style={styles.statNumber}>{stats.today}</Text>
                                        <Text style={styles.statLabel}>오늘</Text>
                                    </View>
                                </View>
                            </Card>

                            <Card style={[styles.statCard, styles.pinnedCard]}>
                                <View style={styles.statContent}>
                                    <View style={[styles.statIcon, { backgroundColor: colors.warning + '20' }]}>
                                        <Ionicons name="star" size={18} color={colors.warning} />
                                    </View>
                                    <View style={styles.statInfo}>
                                        <Text style={styles.statNumber}>{stats.pinned}</Text>
                                        <Text style={styles.statLabel}>즐겨찾기</Text>
                                    </View>
                                </View>
                            </Card>
                        </View>
                    </View>

                    {/* Filter Section */}
                    <View style={styles.filterSection}>
                        <Text style={styles.sectionTitle}>필터</Text>

                        {/* Type Filters */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.filterRow}
                        >
                            {[
                                { key: 'all', label: '전체', icon: 'apps-outline' },
                                { key: 'person', label: '사람', icon: 'person-outline' },
                                { key: 'motion', label: '동작', icon: 'walk-outline' },
                                { key: 'vehicle', label: '차량', icon: 'car-outline' },
                                { key: 'sound', label: '소음', icon: 'volume-high-outline' },
                            ].map((filter) => (
                                <TouchableOpacity
                                    key={filter.key}
                                    style={[
                                        styles.filterChip,
                                        filterType === filter.key && styles.filterChipActive,
                                    ]}
                                    onPress={() => setFilterType(filter.key as any)}
                                >
                                    <Ionicons
                                        name={filter.icon as keyof typeof Ionicons.glyphMap}
                                        size={16}
                                        color={filterType === filter.key ? colors.textOnPrimary : colors.text}
                                    />
                                    <Text
                                        style={[
                                            styles.filterChipText,
                                            filterType === filter.key && styles.filterChipTextActive,
                                        ]}
                                    >
                                        {filter.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Time Filters */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.filterRow}
                        >
                            {[
                                { key: 'all', label: '전체' },
                                { key: 'today', label: '오늘' },
                                { key: 'week', label: '이번 주' },
                                { key: 'month', label: '이번 달' },
                            ].map((filter) => (
                                <TouchableOpacity
                                    key={filter.key}
                                    style={[
                                        styles.timeFilterChip,
                                        timeFilter === filter.key && styles.timeFilterChipActive,
                                    ]}
                                    onPress={() => setTimeFilter(filter.key as any)}
                                >
                                    <Text
                                        style={[
                                            styles.timeFilterText,
                                            timeFilter === filter.key && styles.timeFilterTextActive,
                                        ]}
                                    >
                                        {filter.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Events Timeline */}
                    <View style={styles.timelineSection}>
                        <Text style={styles.sectionTitle}>이벤트 타임라인</Text>

                        {events && events.length > 0 ? (
                            <View style={styles.timelineContainer}>
                                {events.map((event, index) => renderEventItem({ item: event, index }))}
                            </View>
                        ) : (
                            <Card style={styles.emptyCard}>
                                <EmptyState
                                    title="이벤트가 없습니다"
                                    message="새로운 이벤트가 감지되면 여기에 표시됩니다."
                                    icon="film-outline"
                                />
                            </Card>
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.xl,
        paddingBottom: spacing['3xl'],
    },

    // Section Titles
    sectionTitle: {
        ...typography.h2,
        color: colors.text,
        fontWeight: '700',
        marginBottom: spacing.lg,
    },

    // Statistics Section
    statsSection: {
        marginBottom: spacing['2xl'],
    },
    statsGrid: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    statCard: {
        flex: 1,
        padding: spacing.md,
        ...elevation['1'],
    },
    totalCard: {
        backgroundColor: colors.primary + '10',
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    todayCard: {
        backgroundColor: colors.accent + '10',
        borderLeftWidth: 3,
        borderLeftColor: colors.accent,
    },
    pinnedCard: {
        backgroundColor: colors.warning + '10',
        borderLeftWidth: 3,
        borderLeftColor: colors.warning,
    },
    statContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    statIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statInfo: {
        flex: 1,
    },
    statNumber: {
        ...typography.h3,
        color: colors.text,
        fontWeight: '700',
    },
    statLabel: {
        ...typography.caption,
        color: colors.textSecondary,
    },

    // Filter Section
    filterSection: {
        marginBottom: spacing['2xl'],
    },
    filterRow: {
        gap: spacing.sm,
        paddingBottom: spacing.sm,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.divider,
        ...elevation['1'],
    },
    filterChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterChipText: {
        ...typography.caption,
        color: colors.text,
        fontWeight: '600',
    },
    filterChipTextActive: {
        color: colors.textOnPrimary,
    },
    timeFilterChip: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceAlt,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    timeFilterChipActive: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primary,
    },
    timeFilterText: {
        ...typography.caption,
        color: colors.text,
        fontWeight: '500',
    },
    timeFilterTextActive: {
        color: colors.primary,
        fontWeight: '700',
    },

    // Timeline Section
    timelineSection: {
        marginBottom: spacing.xl,
    },
    timelineContainer: {
        paddingLeft: spacing.md,
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: spacing.lg,
    },
    timelineLineContainer: {
        alignItems: 'center',
        marginRight: spacing.lg,
        width: 24,
    },
    timelineNode: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    timelineLine: {
        flex: 1,
        width: 2,
        backgroundColor: colors.divider,
        marginTop: spacing.sm,
    },

    // Event Cards
    eventCard: {
        flex: 1,
        padding: spacing.lg,
        ...elevation['2'],
        backgroundColor: colors.surface,
    },
    eventHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
    },
    eventTypeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    eventTypeIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    eventTitleContainer: {
        flex: 1,
    },
    eventTitle: {
        ...typography.body,
        color: colors.text,
        fontWeight: '600',
    },
    eventSubtitle: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: spacing['2xs'],
    },
    eventActions: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    actionButton: {
        padding: spacing.sm,
        borderRadius: radius.sm,
        backgroundColor: colors.surfaceAlt,
    },
    eventContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    eventThumbnail: {
        width: 48,
        height: 48,
        borderRadius: radius.md,
        overflow: 'hidden',
    },
    thumbnailGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    eventDetails: {
        flex: 1,
        gap: spacing.xs,
    },
    eventDescription: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    eventTime: {
        ...typography.caption,
        color: colors.text,
        fontWeight: '600',
    },
    confidenceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.xs,
    },
    confidenceLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        marginRight: spacing.xs,
    },

    // Empty State
    emptyCard: {
        padding: spacing['2xl'],
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
        ...elevation['1'],
    },
}); 