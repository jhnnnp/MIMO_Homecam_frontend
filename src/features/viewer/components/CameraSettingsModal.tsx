/**
 * CameraSettingsModal - 홈캠별 상세 설정 모달
 * 
 * 기능:
 * - 화질 설정 (1080p, 720p, 480p)
 * - 밤간 모드 설정
 * - 움직임 감지 설정
 * - 녹화 설정
 * - 알림 설정
 */

import React, { useState, useCallback, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Switch,
    ScrollView,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

// Design System
import { spacing, radius } from '@/design/tokens';

// Types
interface Camera {
    id: number;
    name: string;
    device_id: string;
    location: string;
    status: 'online' | 'offline' | 'error';
    last_seen: string;
    created_at: string;
}

interface CameraSettings {
    resolution: '1080p' | '720p' | '480p';
    nightVision: boolean;
    motionDetection: boolean;
    autoRecording: boolean;
    notifications: boolean;
    soundDetection: boolean;
}

interface CameraSettingsModalProps {
    visible: boolean;
    camera: Camera | null;
    onClose: () => void;
    onSave: (settings: CameraSettings) => void;
}

// Constants
const colors = {
    primary: '#007AFF',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#C6C6C8',
};

const RESOLUTION_OPTIONS = [
    { value: '1080p', label: '1080p (Full HD)', description: '고화질, 많은 데이터 사용' },
    { value: '720p', label: '720p (HD)', description: '표준화질, 적당한 데이터 사용' },
    { value: '480p', label: '480p (SD)', description: '저화질, 낮은 데이터 사용' },
] as const;

const CameraSettingsModal = memo<CameraSettingsModalProps>(({
    visible,
    camera,
    onClose,
    onSave
}) => {
    // State
    const [settings, setSettings] = useState<CameraSettings>({
        resolution: '1080p',
        nightVision: false,
        motionDetection: true,
        autoRecording: false,
        notifications: true,
        soundDetection: false,
    });

    const [isLoading, setIsLoading] = useState(false);

    // Event Handlers
    const handleSave = useCallback(async () => {
        if (!camera) return;

        setIsLoading(true);
        try {
            // TODO: API 호출로 설정 저장
            await new Promise(resolve => setTimeout(resolve, 1000));

            onSave(settings);
            Alert.alert('설정 저장 완료', '홈캠 설정이 성공적으로 저장되었습니다.');
            onClose();
        } catch (error) {
            Alert.alert('저장 실패', '설정 저장 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [camera, settings, onSave, onClose]);

    const updateSetting = useCallback(<K extends keyof CameraSettings>(
        key: K,
        value: CameraSettings[K]
    ) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    }, []);

    if (!camera) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{camera.name} 설정</Text>
                    <TouchableOpacity
                        onPress={handleSave}
                        style={styles.saveButton}
                        disabled={isLoading}
                    >
                        <Text style={[styles.saveButtonText, {
                            opacity: isLoading ? 0.5 : 1
                        }]}>
                            저장
                        </Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* 카메라 정보 */}
                    <View style={styles.cameraInfoCard}>
                        <View style={styles.cameraInfoRow}>
                            <Ionicons name="videocam" size={24} color={colors.primary} />
                            <View style={styles.cameraInfoText}>
                                <Text style={styles.cameraInfoName}>{camera.name}</Text>
                                <Text style={styles.cameraInfoLocation}>📍 {camera.location}</Text>
                            </View>
                            <View style={[styles.statusIndicator, {
                                backgroundColor: camera.status === 'online' ? colors.success : colors.error
                            }]} />
                        </View>
                    </View>

                    {/* 화질 설정 */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>화질 설정</Text>
                        <View style={styles.sectionCard}>
                            {RESOLUTION_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.resolutionOption,
                                        settings.resolution === option.value && styles.resolutionOptionSelected
                                    ]}
                                    onPress={() => updateSetting('resolution', option.value)}
                                >
                                    <View style={styles.resolutionInfo}>
                                        <Text style={[
                                            styles.resolutionLabel,
                                            settings.resolution === option.value && styles.resolutionLabelSelected
                                        ]}>
                                            {option.label}
                                        </Text>
                                        <Text style={[
                                            styles.resolutionDescription,
                                            settings.resolution === option.value && styles.resolutionDescriptionSelected
                                        ]}>
                                            {option.description}
                                        </Text>
                                    </View>
                                    <View style={[
                                        styles.radioButton,
                                        settings.resolution === option.value && styles.radioButtonSelected
                                    ]}>
                                        {settings.resolution === option.value && (
                                            <View style={styles.radioButtonInner} />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* 기능 설정 */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>기능 설정</Text>
                        <View style={styles.sectionCard}>
                            <View style={styles.settingItem}>
                                <View style={styles.settingInfo}>
                                    <View style={styles.settingIconContainer}>
                                        <Ionicons name="moon" size={20} color={colors.primary} />
                                    </View>
                                    <View style={styles.settingText}>
                                        <Text style={styles.settingLabel}>야간 모드</Text>
                                        <Text style={styles.settingDescription}>어두운 환경에서 자동 야간 모드</Text>
                                    </View>
                                </View>
                                <Switch
                                    value={settings.nightVision}
                                    onValueChange={(value) => updateSetting('nightVision', value)}
                                    trackColor={{ false: colors.border, true: colors.primary }}
                                    thumbColor={colors.surface}
                                />
                            </View>

                            <View style={styles.settingItem}>
                                <View style={styles.settingInfo}>
                                    <View style={styles.settingIconContainer}>
                                        <Ionicons name="walk" size={20} color={colors.warning} />
                                    </View>
                                    <View style={styles.settingText}>
                                        <Text style={styles.settingLabel}>움직임 감지</Text>
                                        <Text style={styles.settingDescription}>움직임 감지 시 알림 발송</Text>
                                    </View>
                                </View>
                                <Switch
                                    value={settings.motionDetection}
                                    onValueChange={(value) => updateSetting('motionDetection', value)}
                                    trackColor={{ false: colors.border, true: colors.warning }}
                                    thumbColor={colors.surface}
                                />
                            </View>

                            <View style={styles.settingItem}>
                                <View style={styles.settingInfo}>
                                    <View style={styles.settingIconContainer}>
                                        <Ionicons name="recording" size={20} color={colors.error} />
                                    </View>
                                    <View style={styles.settingText}>
                                        <Text style={styles.settingLabel}>자동 녹화</Text>
                                        <Text style={styles.settingDescription}>움직임 감지 시 자동으로 녹화</Text>
                                    </View>
                                </View>
                                <Switch
                                    value={settings.autoRecording}
                                    onValueChange={(value) => updateSetting('autoRecording', value)}
                                    trackColor={{ false: colors.border, true: colors.error }}
                                    thumbColor={colors.surface}
                                />
                            </View>

                            <View style={styles.settingItem}>
                                <View style={styles.settingInfo}>
                                    <View style={styles.settingIconContainer}>
                                        <Ionicons name="notifications" size={20} color={colors.success} />
                                    </View>
                                    <View style={styles.settingText}>
                                        <Text style={styles.settingLabel}>알림</Text>
                                        <Text style={styles.settingDescription}>중요한 이벤트 알림 받기</Text>
                                    </View>
                                </View>
                                <Switch
                                    value={settings.notifications}
                                    onValueChange={(value) => updateSetting('notifications', value)}
                                    trackColor={{ false: colors.border, true: colors.success }}
                                    thumbColor={colors.surface}
                                />
                            </View>

                            <View style={styles.settingItem}>
                                <View style={styles.settingInfo}>
                                    <View style={styles.settingIconContainer}>
                                        <Ionicons name="volume-high" size={20} color={colors.primary} />
                                    </View>
                                    <View style={styles.settingText}>
                                        <Text style={styles.settingLabel}>소음 감지</Text>
                                        <Text style={styles.settingDescription}>비정상적인 소음 감지 및 알림</Text>
                                    </View>
                                </View>
                                <Switch
                                    value={settings.soundDetection}
                                    onValueChange={(value) => updateSetting('soundDetection', value)}
                                    trackColor={{ false: colors.border, true: colors.primary }}
                                    thumbColor={colors.surface}
                                />
                            </View>
                        </View>
                    </View>

                    {/* 고급 설정 */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>고급 설정</Text>
                        <View style={styles.sectionCard}>
                            <TouchableOpacity style={styles.advancedOption}>
                                <View style={styles.advancedOptionInfo}>
                                    <Ionicons name="trash" size={20} color={colors.error} />
                                    <Text style={[styles.advancedOptionText, { color: colors.error }]}>
                                        홈캠 삭제
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.advancedOption}>
                                <View style={styles.advancedOptionInfo}>
                                    <Ionicons name="refresh" size={20} color={colors.primary} />
                                    <Text style={styles.advancedOptionText}>공장 초기화</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
});

CameraSettingsModal.displayName = 'CameraSettingsModal';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    closeButton: {
        padding: spacing.sm,
        borderRadius: radius.md,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    saveButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.md,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.primary,
    },

    // Content
    content: {
        flex: 1,
        padding: spacing.lg,
    },

    // Camera Info Card
    cameraInfoCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cameraInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cameraInfoText: {
        flex: 1,
        marginLeft: spacing.md,
    },
    cameraInfoName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    cameraInfoLocation: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },

    // Section
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.md,
    },
    sectionCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },

    // Resolution Options
    resolutionOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    resolutionOptionSelected: {
        backgroundColor: `${colors.primary}10`,
    },
    resolutionInfo: {
        flex: 1,
    },
    resolutionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    resolutionLabelSelected: {
        color: colors.primary,
    },
    resolutionDescription: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    resolutionDescriptionSelected: {
        color: colors.primary,
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioButtonSelected: {
        borderColor: colors.primary,
    },
    radioButtonInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary,
    },

    // Setting Items
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: `${colors.primary}15`,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    settingText: {
        flex: 1,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    settingDescription: {
        fontSize: 14,
        color: colors.textSecondary,
    },

    // Advanced Options
    advancedOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    advancedOptionInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    advancedOptionText: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
        marginLeft: spacing.md,
    },
});

export default CameraSettingsModal;

