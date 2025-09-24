import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert,
    TextInput,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMotionDetection } from '../../camera/hooks/useMotionDetection';
import { MotionZone } from '../../camera/services/motionDetectionService';

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

interface MotionDetectionSettingsScreenProps {
    navigation: any;
}

export default function MotionDetectionSettingsScreen({ navigation }: MotionDetectionSettingsScreenProps) {
    const [motionState, motionActions] = useMotionDetection();
    const [newZoneName, setNewZoneName] = useState('');
    const [selectedZone, setSelectedZone] = useState<MotionZone | null>(null);

    const handleToggleMotionDetection = async () => {
        if (motionState.isEnabled) {
            motionActions.disableDetection();
        } else {
            await motionActions.enableDetection();
        }
    };

    const handleSensitivityChange = (sensitivity: 'low' | 'medium' | 'high') => {
        motionActions.updateConfig({ sensitivity });
    };

    const handleDetectionIntervalChange = (interval: number) => {
        motionActions.updateConfig({ detectionInterval: interval * 1000 });
    };

    const handleThresholdChange = (min: number, max: number) => {
        motionActions.updateConfig({
            minMotionThreshold: min,
            maxMotionThreshold: max,
        });
    };

    const handleCooldownChange = (cooldown: number) => {
        motionActions.updateConfig({ cooldownPeriod: cooldown * 1000 });
    };

    const handleToggleRecordingOnMotion = () => {
        motionActions.updateConfig({
            recordingOnMotion: !motionState.config.recordingOnMotion,
        });
    };

    const handleToggleNotificationOnMotion = () => {
        motionActions.updateConfig({
            notificationOnMotion: !motionState.config.notificationOnMotion,
        });
    };

    const handleAddZone = () => {
        if (!newZoneName.trim()) {
            Alert.alert('오류', '존 이름을 입력해주세요.');
            return;
        }

        const newZone: MotionZone = {
            id: `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: newZoneName.trim(),
            x: 0.1,
            y: 0.1,
            width: 0.3,
            height: 0.3,
            enabled: true,
            sensitivity: 'medium',
        };

        motionActions.addZone(newZone);
        setNewZoneName('');
        Alert.alert('완료', `"${newZone.name}" 존이 추가되었습니다.`);
    };

    const handleRemoveZone = (zone: MotionZone) => {
        Alert.alert(
            '존 삭제',
            `"${zone.name}" 존을 삭제하시겠습니까?`,
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '삭제',
                    style: 'destructive',
                    onPress: () => {
                        motionActions.removeZone(zone.id);
                        Alert.alert('완료', '존이 삭제되었습니다.');
                    },
                },
            ]
        );
    };

    const handleZoneSensitivityChange = (zone: MotionZone, sensitivity: 'low' | 'medium' | 'high') => {
        motionActions.updateZone(zone.id, { sensitivity });
    };

    const handleZoneToggle = (zone: MotionZone) => {
        motionActions.updateZone(zone.id, { enabled: !zone.enabled });
    };

    const handleCleanupEvents = () => {
        Alert.alert(
            '이벤트 정리',
            '7일 이상 된 모션 이벤트를 삭제하시겠습니까?',
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '정리',
                    style: 'destructive',
                    onPress: () => {
                        const deletedCount = motionActions.cleanupEvents();
                        Alert.alert('완료', `${deletedCount}개의 오래된 이벤트가 정리되었습니다.`);
                    },
                },
            ]
        );
    };

    const getSensitivityColor = (sensitivity: string) => {
        switch (sensitivity) {
            case 'low':
                return SETTINGS_COLORS.success;
            case 'high':
                return SETTINGS_COLORS.error;
            default:
                return SETTINGS_COLORS.warning;
        }
    };

    const getSensitivityText = (sensitivity: string) => {
        switch (sensitivity) {
            case 'low':
                return '낮음';
            case 'high':
                return '높음';
            default:
                return '보통';
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
                    <Text style={styles.headerTitle}>모션 감지 설정</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* 모션 감지 활성화 */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="eye" size={24} color={SETTINGS_COLORS.primary} />
                            <Text style={styles.sectionTitle}>모션 감지</Text>
                        </View>

                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>모션 감지 활성화</Text>
                                <Text style={styles.settingDescription}>
                                    카메라를 통해 움직임을 감지합니다
                                </Text>
                            </View>
                            <Switch
                                value={motionState.isEnabled}
                                onValueChange={handleToggleMotionDetection}
                                trackColor={{ false: SETTINGS_COLORS.border, true: SETTINGS_COLORS.primary }}
                                thumbColor={SETTINGS_COLORS.surface}
                            />
                        </View>

                        {motionState.error && (
                            <View style={styles.errorContainer}>
                                <Ionicons name="warning" size={16} color={SETTINGS_COLORS.error} />
                                <Text style={styles.errorText}>{motionState.error}</Text>
                            </View>
                        )}
                    </View>

                    {/* 감도 설정 */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="settings-outline" size={24} color={SETTINGS_COLORS.primary} />
                            <Text style={styles.sectionTitle}>감도 설정</Text>
                        </View>

                        <View style={styles.sensitivityContainer}>
                            {(['low', 'medium', 'high'] as const).map((sensitivity) => (
                                <TouchableOpacity
                                    key={sensitivity}
                                    style={[
                                        styles.sensitivityButton,
                                        motionState.config.sensitivity === sensitivity && styles.sensitivityButtonActive,
                                    ]}
                                    onPress={() => handleSensitivityChange(sensitivity)}
                                >
                                    <View
                                        style={[
                                            styles.sensitivityDot,
                                            { backgroundColor: getSensitivityColor(sensitivity) },
                                        ]}
                                    />
                                    <Text
                                        style={[
                                            styles.sensitivityText,
                                            motionState.config.sensitivity === sensitivity && styles.sensitivityTextActive,
                                        ]}
                                    >
                                        {getSensitivityText(sensitivity)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* 고급 설정 */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="settings" size={24} color={SETTINGS_COLORS.primary} />
                            <Text style={styles.sectionTitle}>고급 설정</Text>
                        </View>

                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>감지 간격</Text>
                                <Text style={styles.settingDescription}>
                                    {motionState.config.detectionInterval / 1000}초마다 감지
                                </Text>
                            </View>
                            <View style={styles.settingControl}>
                                <TouchableOpacity
                                    style={styles.controlButton}
                                    onPress={() => handleDetectionIntervalChange(Math.max(0.5, motionState.config.detectionInterval / 1000 - 0.5))}
                                >
                                    <Ionicons name="remove" size={20} color={SETTINGS_COLORS.text} />
                                </TouchableOpacity>
                                <Text style={styles.controlValue}>
                                    {motionState.config.detectionInterval / 1000}s
                                </Text>
                                <TouchableOpacity
                                    style={styles.controlButton}
                                    onPress={() => handleDetectionIntervalChange(motionState.config.detectionInterval / 1000 + 0.5)}
                                >
                                    <Ionicons name="add" size={20} color={SETTINGS_COLORS.text} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>쿨다운 시간</Text>
                                <Text style={styles.settingDescription}>
                                    {motionState.config.cooldownPeriod / 1000}초 후 재감지
                                </Text>
                            </View>
                            <View style={styles.settingControl}>
                                <TouchableOpacity
                                    style={styles.controlButton}
                                    onPress={() => handleCooldownChange(Math.max(5, motionState.config.cooldownPeriod / 1000 - 5))}
                                >
                                    <Ionicons name="remove" size={20} color={SETTINGS_COLORS.text} />
                                </TouchableOpacity>
                                <Text style={styles.controlValue}>
                                    {motionState.config.cooldownPeriod / 1000}s
                                </Text>
                                <TouchableOpacity
                                    style={styles.controlButton}
                                    onPress={() => handleCooldownChange(motionState.config.cooldownPeriod / 1000 + 5)}
                                >
                                    <Ionicons name="add" size={20} color={SETTINGS_COLORS.text} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* 자동화 설정 */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="flash" size={24} color={SETTINGS_COLORS.primary} />
                            <Text style={styles.sectionTitle}>자동화</Text>
                        </View>

                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>모션 감지 시 녹화</Text>
                                <Text style={styles.settingDescription}>
                                    움직임이 감지되면 자동으로 녹화를 시작합니다
                                </Text>
                            </View>
                            <Switch
                                value={motionState.config.recordingOnMotion}
                                onValueChange={handleToggleRecordingOnMotion}
                                trackColor={{ false: SETTINGS_COLORS.border, true: SETTINGS_COLORS.primary }}
                                thumbColor={SETTINGS_COLORS.surface}
                            />
                        </View>

                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>모션 감지 시 알림</Text>
                                <Text style={styles.settingDescription}>
                                    움직임이 감지되면 푸시 알림을 보냅니다
                                </Text>
                            </View>
                            <Switch
                                value={motionState.config.notificationOnMotion}
                                onValueChange={handleToggleNotificationOnMotion}
                                trackColor={{ false: SETTINGS_COLORS.border, true: SETTINGS_COLORS.primary }}
                                thumbColor={SETTINGS_COLORS.surface}
                            />
                        </View>
                    </View>

                    {/* 모션 존 관리 */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="map" size={24} color={SETTINGS_COLORS.primary} />
                            <Text style={styles.sectionTitle}>모션 존</Text>
                        </View>

                        {/* 새 존 추가 */}
                        <View style={styles.addZoneContainer}>
                            <TextInput
                                style={styles.zoneInput}
                                placeholder="새 존 이름 입력"
                                value={newZoneName}
                                onChangeText={setNewZoneName}
                                placeholderTextColor={SETTINGS_COLORS.textSecondary}
                            />
                            <TouchableOpacity
                                style={styles.addZoneButton}
                                onPress={handleAddZone}
                            >
                                <Ionicons name="add" size={20} color={SETTINGS_COLORS.surface} />
                            </TouchableOpacity>
                        </View>

                        {/* 존 목록 */}
                        {motionState.config.zones.map((zone: MotionZone) => (
                            <View key={zone.id} style={styles.zoneItem}>
                                <View style={styles.zoneInfo}>
                                    <View style={styles.zoneHeader}>
                                        <Text style={styles.zoneName}>{zone.name}</Text>
                                        <View
                                            style={[
                                                styles.zoneStatus,
                                                { backgroundColor: zone.enabled ? SETTINGS_COLORS.success : SETTINGS_COLORS.textSecondary },
                                            ]}
                                        />
                                    </View>
                                    <Text style={styles.zoneDescription}>
                                        감도: {getSensitivityText(zone.sensitivity)}
                                    </Text>
                                </View>

                                <View style={styles.zoneControls}>
                                    <Switch
                                        value={zone.enabled}
                                        onValueChange={() => handleZoneToggle(zone)}
                                        trackColor={{ false: SETTINGS_COLORS.border, true: SETTINGS_COLORS.primary }}
                                        thumbColor={SETTINGS_COLORS.surface}
                                    />
                                    <TouchableOpacity
                                        style={styles.zoneDeleteButton}
                                        onPress={() => handleRemoveZone(zone)}
                                    >
                                        <Ionicons name="trash-outline" size={20} color={SETTINGS_COLORS.error} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}

                        {motionState.config.zones.length === 0 && (
                            <View style={styles.emptyZones}>
                                <Ionicons name="map-outline" size={48} color={SETTINGS_COLORS.textSecondary} />
                                <Text style={styles.emptyZonesText}>설정된 모션 존이 없습니다</Text>
                                <Text style={styles.emptyZonesDescription}>
                                    위에서 새 존을 추가하여 특정 구역을 모니터링하세요
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* 통계 및 관리 */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="stats-chart" size={24} color={SETTINGS_COLORS.primary} />
                            <Text style={styles.sectionTitle}>통계</Text>
                        </View>

                        <View style={styles.statsContainer}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{motionState.stats.totalEvents}</Text>
                                <Text style={styles.statLabel}>총 이벤트</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{motionState.stats.eventsToday}</Text>
                                <Text style={styles.statLabel}>오늘</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>
                                    {Math.round(motionState.stats.averageIntensity)}%
                                </Text>
                                <Text style={styles.statLabel}>평균 강도</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.cleanupButton}
                            onPress={handleCleanupEvents}
                        >
                            <Ionicons name="trash-outline" size={20} color={SETTINGS_COLORS.error} />
                            <Text style={styles.cleanupButtonText}>오래된 이벤트 정리</Text>
                        </TouchableOpacity>
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
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
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
    settingLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: SETTINGS_COLORS.text,
        marginBottom: 8,
    },
    settingDescription: {
        fontSize: 14,
        color: SETTINGS_COLORS.textSecondary,
    },
    settingControl: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    controlButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: SETTINGS_COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlValue: {
        fontSize: 16,
        fontWeight: '500',
        color: SETTINGS_COLORS.text,
        marginHorizontal: 16,
        minWidth: 40,
        textAlign: 'center',
    },
    sensitivityContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    sensitivityButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12,
        marginHorizontal: 8,
        borderRadius: 12,
        backgroundColor: SETTINGS_COLORS.surface,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    sensitivityButtonActive: {
        borderColor: SETTINGS_COLORS.primary,
        backgroundColor: SETTINGS_COLORS.primary + '20',
    },
    sensitivityDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    sensitivityText: {
        fontSize: 14,
        fontWeight: '500',
        color: SETTINGS_COLORS.textSecondary,
    },
    sensitivityTextActive: {
        color: SETTINGS_COLORS.primary,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: SETTINGS_COLORS.error + '20',
        borderRadius: 12,
        marginTop: 12,
    },
    errorText: {
        fontSize: 14,
        color: SETTINGS_COLORS.error,
        marginLeft: 8,
    },
    addZoneContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    zoneInput: {
        flex: 1,
        height: 44,
        paddingHorizontal: 16,
        backgroundColor: SETTINGS_COLORS.surface,
        borderRadius: 12,
        fontSize: 16,
        color: SETTINGS_COLORS.text,
        marginRight: 12,
    },
    addZoneButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: SETTINGS_COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    zoneItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: SETTINGS_COLORS.surface,
        borderRadius: 12,
        marginBottom: 12,
    },
    zoneInfo: {
        flex: 1,
    },
    zoneHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    zoneName: {
        fontSize: 16,
        fontWeight: '500',
        color: SETTINGS_COLORS.text,
        marginRight: 12,
    },
    zoneStatus: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    zoneDescription: {
        fontSize: 14,
        color: SETTINGS_COLORS.textSecondary,
    },
    zoneControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    zoneDeleteButton: {
        padding: 12,
        marginLeft: 12,
    },
    emptyZones: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    emptyZonesText: {
        fontSize: 16,
        fontWeight: '500',
        color: SETTINGS_COLORS.text,
        marginTop: 16,
        marginBottom: 12,
    },
    emptyZonesDescription: {
        fontSize: 14,
        color: SETTINGS_COLORS.textSecondary,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
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
    cleanupButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        backgroundColor: SETTINGS_COLORS.error + '20',
        borderRadius: 12,
    },
    cleanupButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: SETTINGS_COLORS.error,
        marginLeft: 12,
    },
}); 