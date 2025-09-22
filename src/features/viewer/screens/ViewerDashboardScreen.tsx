/**
 * ViewerDashboardScreen - 뷰어 대시보드 화면
 * 
 * 핵심 기능:
 * - 내 계정에 등록된 홈캠 목록 표시
 * - 홈캠별 실시간 연결/시청 기능
 * - 새 홈캠 등록 버튼
 * 
 * 뷰어 모드에서 등록된 홈캠이 있을 때 표시되는 메인 화면
 */

import React, { useEffect, useCallback, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    FlatList,
    RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Components
import SwipeableCameraCard from '../components/SwipeableCameraCard';

// Hooks
import { useCameraList } from '../hooks/useCameraList';

// Constants
import { CAMERA_COLORS, MESSAGES } from '../constants/cameraConstants';

// Design tokens 제거 - 하드코딩된 값 사용

// Navigation Types
import { RootStackParamList } from '@/app/navigation/AppNavigator';

// Services
import { Camera } from '../services/cameraService';

type ViewerDashboardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ViewerDashboard'>;

interface ViewerDashboardScreenProps {
    navigation: ViewerDashboardScreenNavigationProp;
}

const ViewerDashboardScreen = memo(({ navigation }: ViewerDashboardScreenProps) => {
    // Custom Hook으로 상태 관리
    const {
        cameras,
        isLoading,
        isRefreshing,
        error,
        loadCameras,
        refreshCameras,
        deleteCameraById,
        deleteCameraDirectly,
        connectToCameraById,
    } = useCameraList();

    // Effects
    useEffect(() => {
        loadCameras();
    }, [loadCameras]);

    // Event Handlers
    const handleConnectToCamera = useCallback((camera: Camera) => {
        navigation.navigate('LiveStream', {
            cameraId: camera.device_id,
            cameraName: camera.name,
            ipAddress: '192.168.1.100', // Mock IP
            quality: '1080p'
        });
    }, [navigation]);

    const handleAddNewCamera = useCallback(() => {
        navigation.navigate('ViewerHome'); // 홈캠 등록 화면으로 이동
    }, [navigation]);

    const handleDeleteCamera = useCallback(async (cameraId: number) => {
        await deleteCameraDirectly(cameraId);
    }, [deleteCameraDirectly]);

    const handleConnectToCameraById = useCallback(async (cameraId: number) => {
        await connectToCameraById(cameraId);
        // 연결 성공 후 LiveStream으로 이동
        const camera = cameras.find(c => c.id === cameraId);
        if (camera) {
            handleConnectToCamera(camera);
        }
    }, [connectToCameraById, cameras, handleConnectToCamera]);

    // Render Functions
    const renderCameraItem = useCallback(({ item: camera }: { item: Camera }) => (
        <SwipeableCameraCard
            camera={camera}
            onConnect={handleConnectToCamera}
            onDelete={handleDeleteCamera}
        />
    ), [handleConnectToCamera, handleDeleteCamera]);

    const renderEmptyState = useCallback(() => (
        <View style={styles.emptyContainer}>
            <Ionicons name="home-outline" size={64} color={CAMERA_COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>등록된 홈캠이 없습니다</Text>
            <Text style={styles.emptySubtitle}>
                홈캠에서 생성된 연결 코드로 등록하세요
            </Text>
            <TouchableOpacity
                style={styles.addFirstCameraButton}
                onPress={handleAddNewCamera}
            >
                <LinearGradient
                    colors={[CAMERA_COLORS.primary, '#2196F3']}
                    style={styles.addFirstCameraGradient}
                >
                    <Ionicons name="add" size={24} color="white" />
                    <Text style={styles.addFirstCameraText}>홈캠 등록하기</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    ), [handleAddNewCamera]);

    const renderRecentlyAddedBanner = useCallback(() => {
        // 가장 최근에 등록된 홈캠이 있고, 1분 이내에 등록된 경우만 표시
        if (cameras.length === 0) return null;

        const latestCamera = cameras[0]; // 최신 등록 순으로 정렬되어 있다고 가정
        const now = new Date();
        const cameraCreatedAt = new Date(latestCamera.created_at);
        const timeDiff = (now.getTime() - cameraCreatedAt.getTime()) / 1000 / 60; // 분 단위

        if (timeDiff > 2) return null; // 2분이 지나면 표시하지 않음

        return (
            <TouchableOpacity
                style={styles.recentlyAddedBanner}
                onPress={() => handleConnectToCamera(latestCamera)}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={[CAMERA_COLORS.success, '#4CAF50']}
                    style={styles.recentlyAddedGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.recentlyAddedIcon}>
                        <Ionicons name="checkmark-circle" size={24} color="white" />
                    </View>
                    <View style={styles.recentlyAddedContent}>
                        <Text style={styles.recentlyAddedTitle}>
                            홈캠 등록 완료!
                        </Text>
                        <Text style={styles.recentlyAddedSubtitle}>
                            {latestCamera.name} • 지금 시청하기
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="white" />
                </LinearGradient>
            </TouchableOpacity>
        );
    }, [cameras, handleConnectToCamera]);

    if (isLoading) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor={CAMERA_COLORS.background} />
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.loadingContainer}>
                        <Ionicons name="videocam" size={64} color={CAMERA_COLORS.primary} />
                        <Text style={styles.loadingText}>홈캠 목록 불러오는 중...</Text>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor={CAMERA_COLORS.background} />
                <SafeAreaView style={styles.safeArea}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.profileButton}
                            onPress={() => navigation.navigate('Settings')}
                        >
                            <Ionicons name="person-circle-outline" size={24} color={CAMERA_COLORS.text} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>내 홈캠 목록</Text>
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={handleAddNewCamera}
                        >
                            <Ionicons name="add" size={24} color={CAMERA_COLORS.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* 홈캠 목록 */}
                    <FlatList
                        data={cameras}
                        renderItem={renderCameraItem}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.listContainer}
                        ListEmptyComponent={renderEmptyState}
                        ListHeaderComponent={() => (
                            <View>
                                {/* 최근 등록된 홈캠 배너 */}
                                {renderRecentlyAddedBanner()}

                                {/* 힌트 메시지 */}
                                {cameras.length > 0 && (
                                    <View style={styles.hintContainer}>
                                        <Ionicons name="information-circle-outline" size={16} color={CAMERA_COLORS.textSecondary} />
                                        <Text style={styles.hintText}>홈캠을 ← 스와이프하여 삭제</Text>
                                    </View>
                                )}
                            </View>
                        )}
                        refreshControl={
                            <RefreshControl
                                refreshing={isRefreshing}
                                onRefresh={refreshCameras}
                                tintColor={CAMERA_COLORS.primary}
                            />
                        }
                        showsVerticalScrollIndicator={false}
                    />
                </SafeAreaView>
            </View>
        </GestureHandlerRootView>
    );
});

ViewerDashboardScreen.displayName = 'ViewerDashboardScreen';

export default ViewerDashboardScreen;

// 간결한 스타일
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: CAMERA_COLORS.background,
    },
    safeArea: {
        flex: 1,
    },

    // Loading
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
    },
    loadingText: {
        fontSize: 16,
        color: CAMERA_COLORS.textSecondary,
        fontWeight: '500',
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: CAMERA_COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: CAMERA_COLORS.border,
    },
    profileButton: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: CAMERA_COLORS.background,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: CAMERA_COLORS.text,
    },
    addButton: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: CAMERA_COLORS.background,
    },

    // List
    listContainer: {
        paddingVertical: 20,
        flexGrow: 1,
    },


    // Empty State
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: CAMERA_COLORS.text,
        marginTop: 20,
        marginBottom: 12,
    },
    emptySubtitle: {
        fontSize: 16,
        color: CAMERA_COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    addFirstCameraButton: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    addFirstCameraGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        paddingHorizontal: 24,
        gap: 12,
    },
    addFirstCameraText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },

    // Hint Container
    hintContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${CAMERA_COLORS.primary}08`,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${CAMERA_COLORS.primary}15`,
    },
    hintText: {
        fontSize: 13,
        color: CAMERA_COLORS.textSecondary,
        marginLeft: 8,
        flex: 1,
        fontWeight: '500',
    },

    // Recently Added Banner
    recentlyAddedBanner: {
        marginHorizontal: 20,
        marginTop: 16,
        marginBottom: 20,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: CAMERA_COLORS.success,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    recentlyAddedGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 20,
    },
    recentlyAddedIcon: {
        marginRight: 16,
    },
    recentlyAddedContent: {
        flex: 1,
    },
    recentlyAddedTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: 'white',
        marginBottom: 2,
    },
    recentlyAddedSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '500',
    },
});
