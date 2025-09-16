import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, elevation } from '@/design/tokens';
import { RecordingSession, recordingService } from '@/features/recording/services/recordingService';

interface RecordingListProps {
    onRecordingSelect?: (recording: RecordingSession) => void;
    onRefresh?: () => void;
    style?: any;
}

export default function RecordingList({
    onRecordingSelect,
    onRefresh,
    style,
}: RecordingListProps) {
    const [recordings, setRecordings] = useState<RecordingSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [storageUsage, setStorageUsage] = useState({ used: 0, total: 0 });

    useEffect(() => {
        loadRecordings();
    }, []);

    const loadRecordings = async () => {
        try {
            setLoading(true);
            const [recordingsData, usage] = await Promise.all([
                recordingService.getRecordings(),
                recordingService.getStorageUsage(),
            ]);

            setRecordings(recordingsData);
            setStorageUsage(usage);
        } catch (error) {
            console.error('❌ 녹화 목록 로드 실패:', error);
            Alert.alert('오류', '녹화 목록을 불러올 수 없습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadRecordings();
        onRefresh?.();
        setRefreshing(false);
    };

    const handleRecordingPress = (recording: RecordingSession) => {
        onRecordingSelect?.(recording);
    };

    const handleDeleteRecording = (recording: RecordingSession) => {
        Alert.alert(
            '녹화 삭제',
            `"${recording.fileName}"을 삭제하시겠습니까?`,
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '삭제',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const deleted = await recordingService.deleteRecording(recording.id);
                            if (deleted) {
                                setRecordings(prev => prev.filter(r => r.id !== recording.id));
                                Alert.alert('완료', '녹화가 삭제되었습니다.');
                            } else {
                                Alert.alert('오류', '녹화 삭제에 실패했습니다.');
                            }
                        } catch (error) {
                            console.error('❌ 녹화 삭제 실패:', error);
                            Alert.alert('오류', '녹화 삭제에 실패했습니다.');
                        }
                    },
                },
            ]
        );
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDuration = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderRecordingItem = ({ item }: { item: RecordingSession }) => (
        <TouchableOpacity
            style={styles.recordingItem}
            onPress={() => handleRecordingPress(item)}
        >
            <View style={styles.recordingInfo}>
                <View style={styles.recordingHeader}>
                    <Text style={styles.fileName} numberOfLines={1}>
                        {item.fileName}
                    </Text>
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteRecording(item)}
                    >
                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                </View>

                <View style={styles.recordingDetails}>
                    <View style={styles.detailRow}>
                        <Ionicons name="videocam" size={16} color={colors.textSecondary} />
                        <Text style={styles.detailText}>{item.cameraId}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Ionicons name="time" size={16} color={colors.textSecondary} />
                        <Text style={styles.detailText}>
                            {formatDuration(item.duration)}
                        </Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Ionicons name="folder" size={16} color={colors.textSecondary} />
                        <Text style={styles.detailText}>
                            {formatFileSize(item.size)}
                        </Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Ionicons name="calendar" size={16} color={colors.textSecondary} />
                        <Text style={styles.detailText}>
                            {formatDate(item.createdAt)}
                        </Text>
                    </View>
                </View>

                <View style={styles.statusContainer}>
                    <View
                        style={[
                            styles.statusDot,
                            {
                                backgroundColor:
                                    item.status === 'completed'
                                        ? colors.success
                                        : item.status === 'recording'
                                            ? colors.warning
                                            : colors.error,
                            },
                        ]}
                    />
                    <Text style={styles.statusText}>
                        {item.status === 'completed'
                            ? '완료'
                            : item.status === 'recording'
                                ? '녹화 중'
                                : '실패'}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons name="videocam-off" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>녹화 파일이 없습니다</Text>
            <Text style={styles.emptyStateText}>
                홈캠 모드에서 녹화를 시작하면 여기에 표시됩니다.
            </Text>
        </View>
    );

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerInfo}>
                <Text style={styles.headerTitle}>녹화 목록</Text>
                <Text style={styles.headerSubtitle}>
                    {recordings.length}개의 녹화 파일
                </Text>
            </View>
            <View style={styles.storageInfo}>
                <Text style={styles.storageText}>
                    사용 중: {formatFileSize(storageUsage.used)}
                </Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, style]}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>녹화 목록을 불러오는 중...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, style]}>
            <FlatList
                data={recordings}
                renderItem={renderRecordingItem}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    listContent: {
        flexGrow: 1,
        padding: spacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerInfo: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    headerSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    storageInfo: {
        alignItems: 'flex-end',
    },
    storageText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    recordingItem: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        ...elevation.small,
    },
    recordingInfo: {
        flex: 1,
    },
    recordingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    fileName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
        marginRight: spacing.sm,
    },
    deleteButton: {
        padding: spacing.xs,
    },
    recordingDetails: {
        marginBottom: spacing.sm,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    detailText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginLeft: spacing.xs,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: spacing.xs,
    },
    statusText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.xl * 2,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    emptyStateText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: spacing.lg,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
    },
}); 