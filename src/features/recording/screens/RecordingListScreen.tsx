// 홈캠 목록과 일치하는 iOS 스타일 색상 팔레트
const SCREEN_COLORS = {
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

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppBar from '@/shared/components/layout/AppBar';

import RecordingList from '@/features/recording/components/RecordingList';
import { RecordingSession, recordingService } from '@/features/recording/services/recordingService';
import { LinearGradient } from 'expo-linear-gradient';

interface RecordingListScreenProps {
    navigation: any;
}

export default function RecordingListScreen({ navigation }: RecordingListScreenProps) {
    const [selectedRecording, setSelectedRecording] = useState<RecordingSession | null>(null);
    const [storageUsage, setStorageUsage] = useState({ used: 0, total: 0 });

    useEffect(() => {
        loadStorageUsage();
    }, []);

    const loadStorageUsage = async () => {
        try {
            const usage = await recordingService.getStorageUsage();
            setStorageUsage(usage);
        } catch (error) {
            console.error('❌ 저장 공간 사용량 조회 실패:', error);
        }
    };

    const handleRecordingSelect = (recording: RecordingSession) => {
        setSelectedRecording(recording);
        // 여기서 녹화 재생 화면으로 이동하거나 상세 정보를 표시할 수 있습니다
        Alert.alert(
            '녹화 정보',
            `파일명: ${recording.fileName}\n카메라: ${recording.cameraId}\n크기: ${formatFileSize(recording.size)}\n생성일: ${formatDate(recording.createdAt)}`,
            [
                { text: '닫기', style: 'cancel' },
                { text: '재생', onPress: () => handlePlayRecording(recording) },
                { text: '공유', onPress: () => handleShareRecording(recording) },
            ]
        );
    };

    const handlePlayRecording = (recording: RecordingSession) => {
        // 녹화 재생 기능 구현
        Alert.alert('재생', '녹화 재생 기능은 추후 구현됩니다.');
    };

    const handleShareRecording = (recording: RecordingSession) => {
        // 녹화 공유 기능 구현
        Alert.alert('공유', '녹화 공유 기능은 추후 구현됩니다.');
    };

    const handleCleanupOldRecordings = () => {
        Alert.alert(
            '오래된 녹화 정리',
            '7일 이상 된 녹화 파일을 삭제하시겠습니까?',
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '정리',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const deletedCount = await recordingService.cleanupOldRecordings();
                            Alert.alert('완료', `${deletedCount}개의 오래된 녹화 파일이 정리되었습니다.`);
                            // 목록 새로고침
                            // RecordingList 컴포넌트에서 자동으로 새로고침됩니다
                        } catch (error) {
                            console.error('❌ 오래된 녹화 정리 실패:', error);
                            Alert.alert('오류', '오래된 녹화 파일 정리에 실패했습니다.');
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

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <AppBar
                title="녹화 목록"
                showBackButton
                onBackPress={() => navigation.goBack()}
                actions={[
                    { icon: 'refresh' as any, onPress: loadStorageUsage, accessibilityLabel: '새로고침' },
                ]}
            />
            <ScrollView style={styles.scrollContainer}>
                {/* Storage Info */}
                <View style={styles.storageCard}>
                    <LinearGradient
                        colors={[SCREEN_COLORS.surface, SCREEN_COLORS.surfaceAlt]}
                        style={styles.storageGradient}
                    >
                        <View style={styles.storageHeader}>
                            <Ionicons name="hardware-chip" size={24} color={SCREEN_COLORS.primary} />
                            <Text style={styles.storageTitle}>저장 공간</Text>
                        </View>

                        <View style={styles.storageInfo}>
                            <Text style={styles.storageText}>
                                사용 중: {formatFileSize(storageUsage.used)}
                            </Text>
                            <Text style={styles.storageText}>
                                전체: {formatFileSize(storageUsage.total || 0)}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.cleanupButton}
                            onPress={handleCleanupOldRecordings}
                        >
                            <Ionicons name="trash-outline" size={16} color={SCREEN_COLORS.error} />
                            <Text style={styles.cleanupButtonText}>오래된 파일 정리</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>

                {/* Recording List */}
                <View style={styles.listContainer}>
                    <RecordingList
                        onRecordingSelect={handleRecordingSelect}
                        onRefresh={loadStorageUsage}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: SCREEN_COLORS.background,
    },
    scrollContainer: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: SCREEN_COLORS.border,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: SCREEN_COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: SCREEN_COLORS.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: SCREEN_COLORS.textSecondary,
    },
    settingsButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: SCREEN_COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    storageCard: {
        margin: 20,
        borderRadius: 16,
        backgroundColor: SCREEN_COLORS.surface,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
    },
    storageGradient: {
        padding: 20,
    },
    storageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    storageTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: SCREEN_COLORS.text,
        marginLeft: 12,
    },
    storageInfo: {
        marginBottom: 16,
    },
    storageText: {
        fontSize: 14,
        color: SCREEN_COLORS.textSecondary,
        marginBottom: 8,
    },
    cleanupButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: SCREEN_COLORS.error + '20',
        borderRadius: 12,
    },
    cleanupButtonText: {
        fontSize: 14,
        color: SCREEN_COLORS.error,
        fontWeight: '500',
        marginLeft: 8,
    },
    listContainer: {
        flex: 1,
    },
}); 