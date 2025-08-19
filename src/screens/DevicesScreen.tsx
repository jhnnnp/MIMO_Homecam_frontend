import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Image,
    RefreshControl,
    Alert,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, Card, Badge, Button, LoadingState, EmptyState, ErrorState } from '../components';
import { colors, typography, spacing, radius, elevation } from '../design/tokens';
import { useCameras, useDeleteCamera, useSendHeartbeat } from '../hooks/useCamera';
import Toast from 'react-native-toast-message';
import { Camera } from '../types/api';

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = (screenWidth - (spacing.xl * 2) - spacing.md) / 2;

interface DevicesScreenProps {
    navigation: any;
}

export default function DevicesScreen({ navigation }: DevicesScreenProps) {
    const [sortBy, setSortBy] = useState<'name' | 'status' | 'location'>('name');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const {
        data: devices,
        isLoading,
        error,
        refetch
    } = useCameras();

    const deleteCamera = useDeleteCamera();

    const onRefresh = async () => {
        await refetch();
    };

    const handleDevicePress = (device: Camera) => {
        if (device.isOnline) {
            navigation.navigate('LiveStream', {
                cameraId: device.id,
                cameraName: device.name,
            });
        } else {
            Alert.alert(
                '디바이스 오프라인',
                '이 디바이스는 현재 오프라인 상태입니다. 네트워크 연결을 확인해 주세요.',
                [{ text: '확인' }]
            );
        }
    };

    const handleAddDevice = () => {
        Alert.alert('새 디바이스 추가', '이 기능은 곧 추가될 예정입니다.');
    };

    const handleRemoveDevice = (device: Camera) => {
        Alert.alert(
            '디바이스 제거',
            `'${device.name}'를 제거하시겠어요? 이 작업은 되돌릴 수 없습니다.`,
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '제거',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteCamera.mutateAsync(device.id);
                            Toast.show({
                                type: 'success',
                                text1: '디바이스 제거 완료',
                            });
                        } catch (err) {
                            Toast.show({
                                type: 'error',
                                text1: '디바이스 제거 실패',
                                text2: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.',
                            });
                        }
                    },
                },
            ]
        );
    };

    const getSortedDevices = () => {
        if (!devices) return [];
        return [...devices].sort((a, b) => {
            switch (sortBy) {
                case 'status':
                    if (a.isOnline === b.isOnline) return a.name.localeCompare(b.name);
                    return a.isOnline ? -1 : 1;
                case 'location':
                    return (a.location || '').localeCompare(b.location || '');
                default:
                    return a.name.localeCompare(b.name);
            }
        });
    };

    const sortedDevices = getSortedDevices();
    const onlineCount = devices?.filter(d => d.isOnline).length || 0;
    const totalCount = devices?.length || 0;
    const offlineCount = totalCount - onlineCount;

    const renderDeviceCard = (device: Camera) => (
        <TouchableOpacity
            key={device.id}
            style={[styles.deviceCard, viewMode === 'grid' ? styles.gridCard : styles.listCard]}
            onPress={() => handleDevicePress(device)}
            activeOpacity={0.7}
        >
            <Card style={styles.deviceCardInner}>
                <View style={styles.deviceHeader}>
                    <View style={[styles.statusIndicator, {
                        backgroundColor: device.isOnline ? colors.success : colors.error
                    }]} />
                    <TouchableOpacity
                        style={styles.moreButton}
                        onPress={() => handleRemoveDevice(device)}
                    >
                        <Ionicons name="ellipsis-horizontal" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.devicePreview}>
                    <LinearGradient
                        colors={device.isOnline ?
                            [colors.primary + '20', colors.primaryLight] :
                            [colors.textSecondary + '20', colors.disabledBg]
                        }
                        style={styles.previewGradient}
                    >
                        <Ionicons
                            name="videocam-outline"
                            size={32}
                            color={device.isOnline ? colors.primary : colors.textSecondary}
                        />
                    </LinearGradient>
                </View>

                <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName} numberOfLines={1}>
                        {device.name}
                    </Text>
                    <Text style={styles.deviceLocation} numberOfLines={1}>
                        {device.location || '위치 정보 없음'}
                    </Text>
                    <View style={styles.deviceStatus}>
                        <Badge
                            type={device.isOnline ? 'success' : 'error'}
                            variant="status"
                            label={device.isOnline ? '온라인' : '오프라인'}
                        />
                    </View>
                </View>
            </Card>
        </TouchableOpacity>
    );

    if (isLoading) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.background, colors.surfaceAlt]}
                    style={styles.gradientBackground}
                />
                <SafeAreaView style={styles.safeArea}>
                    <AppBar title="디바이스" variant="transparent" />
                    <LoadingState message="디바이스 목록을 불러오는 중..." />
                </SafeAreaView>
            </View>
        )
    }

    if (error) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.background, colors.surfaceAlt]}
                    style={styles.gradientBackground}
                />
                <SafeAreaView style={styles.safeArea}>
                    <AppBar title="디바이스" variant="transparent" />
                    <ErrorState
                        title="오류 발생"
                        message="디바이스 목록을 불러올 수 없습니다."
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
                    title="디바이스"
                    variant="transparent"
                    actions={[
                        {
                            icon: viewMode === 'grid' ? 'list-outline' : 'grid-outline',
                            onPress: () => setViewMode(viewMode === 'grid' ? 'list' : 'grid'),
                            accessibilityLabel: '보기 모드 변경',
                        },
                        {
                            icon: 'add-circle-outline',
                            onPress: handleAddDevice,
                            accessibilityLabel: '디바이스 추가',
                        },
                    ]}
                />

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Statistics Section */}
                    <View style={styles.statsSection}>
                        <Text style={styles.sectionTitle}>통계</Text>
                        <View style={styles.statsGrid}>
                            <Card style={[styles.statCard, styles.totalCard]}>
                                <View style={styles.statContent}>
                                    <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
                                        <Ionicons name="videocam" size={20} color={colors.primary} />
                                    </View>
                                    <View style={styles.statInfo}>
                                        <Text style={styles.statNumber}>{totalCount}</Text>
                                        <Text style={styles.statLabel}>총 디바이스</Text>
                                    </View>
                                </View>
                            </Card>

                            <Card style={[styles.statCard, styles.onlineCard]}>
                                <View style={styles.statContent}>
                                    <View style={[styles.statIcon, { backgroundColor: colors.success + '20' }]}>
                                        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                                    </View>
                                    <View style={styles.statInfo}>
                                        <Text style={styles.statNumber}>{onlineCount}</Text>
                                        <Text style={styles.statLabel}>온라인</Text>
                                    </View>
                                </View>
                            </Card>

                            <Card style={[styles.statCard, styles.offlineCard]}>
                                <View style={styles.statContent}>
                                    <View style={[styles.statIcon, { backgroundColor: colors.error + '20' }]}>
                                        <Ionicons name="close-circle" size={20} color={colors.error} />
                                    </View>
                                    <View style={styles.statInfo}>
                                        <Text style={styles.statNumber}>{offlineCount}</Text>
                                        <Text style={styles.statLabel}>오프라인</Text>
                                    </View>
                                </View>
                            </Card>
                        </View>
                    </View>

                    {/* Filter Section */}
                    <View style={styles.filterSection}>
                        <View style={styles.filterHeader}>
                            <Text style={styles.sectionTitle}>디바이스 목록</Text>
                            <View style={styles.sortContainer}>
                                <TouchableOpacity
                                    style={styles.sortButton}
                                    onPress={() => {
                                        const sorts: Array<'name' | 'status' | 'location'> = ['name', 'status', 'location'];
                                        const currentIndex = sorts.indexOf(sortBy);
                                        const nextSort = sorts[(currentIndex + 1) % sorts.length];
                                        setSortBy(nextSort);
                                    }}
                                >
                                    <Ionicons name="swap-vertical-outline" size={16} color={colors.primary} />
                                    <Text style={styles.sortText}>
                                        {sortBy === 'name' ? '이름순' : sortBy === 'status' ? '상태순' : '위치순'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Devices Grid/List */}
                    {sortedDevices.length > 0 ? (
                        <View style={[
                            styles.devicesContainer,
                            viewMode === 'grid' ? styles.gridContainer : styles.listContainer
                        ]}>
                            {sortedDevices.map(renderDeviceCard)}
                        </View>
                    ) : (
                        <Card style={styles.emptyCard}>
                            <EmptyState
                                title="등록된 디바이스가 없어요"
                                message="새 카메라를 추가해서 홈 보안을 시작해 보세요."
                                buttonText="디바이스 추가"
                                onAction={handleAddDevice}
                                icon="videocam-off-outline"
                            />
                        </Card>
                    )}
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

    // Statistics Section
    statsSection: {
        marginBottom: spacing['2xl'],
    },
    sectionTitle: {
        ...typography.h2,
        color: colors.text,
        fontWeight: '700',
        marginBottom: spacing.lg,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    statCard: {
        flex: 1,
        padding: spacing.lg,
        ...elevation['1'],
    },
    totalCard: {
        backgroundColor: colors.primary + '10',
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
    },
    onlineCard: {
        backgroundColor: colors.success + '10',
        borderLeftWidth: 4,
        borderLeftColor: colors.success,
    },
    offlineCard: {
        backgroundColor: colors.error + '10',
        borderLeftWidth: 4,
        borderLeftColor: colors.error,
    },
    statContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    statIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statInfo: {
        flex: 1,
    },
    statNumber: {
        ...typography.h2,
        color: colors.text,
        fontWeight: '700',
    },
    statLabel: {
        ...typography.caption,
        color: colors.textSecondary,
    },

    // Filter Section
    filterSection: {
        marginBottom: spacing.lg,
    },
    filterHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sortContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.sm,
        backgroundColor: colors.primaryLight,
    },
    sortText: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '600',
    },

    // Devices Container
    devicesContainer: {
        marginBottom: spacing.xl,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    listContainer: {
        gap: spacing.md,
    },

    // Device Cards
    deviceCard: {
        marginBottom: 0,
    },
    gridCard: {
        width: cardWidth,
    },
    listCard: {
        width: '100%',
    },
    deviceCardInner: {
        padding: spacing.lg,
        ...elevation['2'],
        backgroundColor: colors.surface,
    },
    deviceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    moreButton: {
        padding: spacing.xs,
        borderRadius: radius.sm,
        backgroundColor: colors.surfaceAlt,
    },
    devicePreview: {
        marginBottom: spacing.md,
    },
    previewGradient: {
        height: 80,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deviceInfo: {
        gap: spacing.xs,
    },
    deviceName: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
    },
    deviceLocation: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    deviceStatus: {
        marginTop: spacing.xs,
        alignSelf: 'flex-start',
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