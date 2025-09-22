/**
 * CameraSettingsScreen - 모던한 카메라 설정 화면
 * 
 * 핵심 기능:
 * - 영상 품질 설정
 * - 오디오 설정
 * - 녹화 및 동작 감지 설정
 * - 네트워크 및 보안 설정
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    Switch,
    ScrollView,
    Pressable,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CameraStackParamList } from '@/app/navigation/AppNavigator';
// 더 이상 API 호출하지 않으므로 제거

// 홈캠 목록과 일치하는 색상 팔레트
const colors = {
    primary: '#007AFF',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    surfaceAlt: '#F7F4EF',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#E5E5EA',
    accent: '#F5C572',
} as const;

// Types
interface CameraSettingsScreenProps {
    navigation: NativeStackNavigationProp<CameraStackParamList, 'CameraSettings'>;
}

interface CameraSettings {
    videoQuality: string;
    audioEnabled: boolean;
    autoRecord: boolean;
    motionDetection: boolean;
    motionSensitivity: string;
    nightVision: boolean;
}

interface SystemInfo {
    cameraStatus: string;
    networkStatus: string;
    storageUsed: number;
    performance: string;
    lastCheck: string;
    version: string;
    model: string;
    maxResolution: string;
    maxFrameRate: string;
}

interface SettingItemProps {
    icon: string;
    title: string;
    subtitle?: string;
    rightElement?: React.ReactNode;
    onPress?: () => void;
    iconColor?: string;
    disabled?: boolean;
}

interface OptionSelectorProps {
    currentValue: string;
    options: string[];
    onSelect: (value: string) => void;
}

// 컴포넌트들
const SettingItem: React.FC<SettingItemProps> = ({
    icon,
    title,
    subtitle,
    rightElement,
    onPress,
    iconColor = colors.primary,
    disabled = false,
}) => (
    <Pressable
        style={({ pressed }) => [
            styles.settingItem,
            pressed && !disabled && styles.settingItemPressed,
            disabled && styles.settingItemDisabled,
        ]}
        onPress={onPress}
        disabled={disabled || !onPress}
    >
        <View style={styles.settingLeft}>
            <LinearGradient
                colors={[iconColor + '20', iconColor + '10']}
                style={styles.settingIcon}
            >
                <Ionicons name={icon as any} size={20} color={iconColor} />
            </LinearGradient>
            <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, disabled && styles.disabledText]}>
                    {title}
                </Text>
                {subtitle && (
                    <Text style={[styles.settingSubtitle, disabled && styles.disabledText]}>
                        {subtitle}
                    </Text>
                )}
            </View>
        </View>

        {rightElement && (
            <View style={styles.settingRight}>
                {rightElement}
            </View>
        )}

        {onPress && !rightElement && (
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        )}
    </Pressable>
);

const OptionSelector: React.FC<OptionSelectorProps> = ({ currentValue, options, onSelect }) => (
    <Pressable
        style={({ pressed }) => [
            styles.optionSelector,
            pressed && styles.optionSelectorPressed,
        ]}
        onPress={() => {
            const currentIndex = options.indexOf(currentValue);
            const nextIndex = (currentIndex + 1) % options.length;
            onSelect(options[nextIndex]);
        }}
    >
        <Text style={styles.optionText}>{currentValue}</Text>
        <Ionicons name="chevron-down" size={14} color={colors.primary} />
    </Pressable>
);

const CustomSwitch: React.FC<{ value: boolean; onValueChange: (value: boolean) => void; disabled?: boolean }> = ({
    value,
    onValueChange,
    disabled = false,
}) => (
    <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
            false: colors.border,
            true: colors.primary + '40'
        }}
        thumbColor={value ? colors.primary : colors.surface}
        ios_backgroundColor={colors.border}
        style={styles.switch}
    />
);

export default function CameraSettingsScreen({ navigation }: CameraSettingsScreenProps) {
    // API 호출 제거로 인증 관련 코드 불필요

    // 로딩 상태
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // 설정 상태들
    const [settings, setSettings] = useState<CameraSettings>({
        videoQuality: 'HD',
        audioEnabled: true,
        autoRecord: true,
        motionDetection: true,
        motionSensitivity: 'Medium',
        nightVision: false,
    });

    // 시스템 정보
    const [systemInfo, setSystemInfo] = useState<SystemInfo>({
        cameraStatus: '정상',
        networkStatus: '연결됨',
        storageUsed: 0,
        performance: '양호',
        lastCheck: new Date().toLocaleString(),
        version: '1.0.0',
        model: 'MIMO Professional',
        maxResolution: '4K',
        maxFrameRate: '60fps',
    });

    // 설정 로드 (로컬 전용)
    const loadSettings = useCallback(async () => {
        try {
            setIsLoading(true);

            // 로컬 저장소에서 설정 로드
            const savedSettings = await AsyncStorage.getItem('cameraSettings');
            if (savedSettings) {
                setSettings(JSON.parse(savedSettings));
            }

            // 시스템 정보 시뮬레이션 (실제 하드웨어 정보 대신)
            setSystemInfo(prev => ({
                ...prev,
                cameraStatus: '정상',
                networkStatus: '연결됨',
                storageUsed: Math.floor(Math.random() * 60) + 20, // 20-80% 랜덤
                performance: '양호',
                lastCheck: new Date().toLocaleString(),
            }));

        } catch (error) {
            console.error('설정 로드 실패:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 설정 저장 (로컬 전용)
    const saveSettings = useCallback(async (newSettings: CameraSettings) => {
        try {
            setIsSaving(true);

            // 로컬 저장소에만 저장
            await AsyncStorage.setItem('cameraSettings', JSON.stringify(newSettings));

        } catch (error) {
            console.error('설정 저장 실패:', error);
            Alert.alert('오류', '설정 저장에 실패했습니다.');
        } finally {
            setIsSaving(false);
        }
    }, []);

    // 설정 업데이트 헬퍼
    const updateSetting = useCallback(async <K extends keyof CameraSettings>(
        key: K,
        value: CameraSettings[K]
    ) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        await saveSettings(newSettings);
    }, [settings, saveSettings]);

    // 시스템 진단 (로컬 시뮬레이션)
    const runSystemDiagnostic = useCallback(async () => {
        try {
            // 로컬에서 시스템 상태 시뮬레이션
            const diagnosticResult = {
                cameraStatus: '정상',
                networkStatus: navigator.onLine ? '연결됨' : '연결 끊김',
                storageUsed: Math.floor(Math.random() * 60) + 20, // 20-80%
                performance: '양호',
            };

            setSystemInfo(prev => ({
                ...prev,
                ...diagnosticResult,
                lastCheck: new Date().toLocaleString(),
            }));

            Alert.alert(
                '시스템 진단 완료',
                `카메라: ${diagnosticResult.cameraStatus}\n` +
                `네트워크: ${diagnosticResult.networkStatus}\n` +
                `저장소: ${diagnosticResult.storageUsed}% 사용 중\n` +
                `성능: ${diagnosticResult.performance}\n\n` +
                `마지막 점검: ${new Date().toLocaleString()}`
            );
        } catch (error) {
            Alert.alert('오류', '시스템 진단에 실패했습니다.');
        }
    }, []);

    // 설정 초기화
    const handleResetSettings = useCallback(() => {
        Alert.alert(
            '설정 초기화',
            '모든 설정을 기본값으로 초기화하시겠습니까?',
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '초기화',
                    style: 'destructive',
                    onPress: async () => {
                        const defaultSettings: CameraSettings = {
                            videoQuality: 'HD',
                            audioEnabled: true,
                            autoRecord: true,
                            motionDetection: true,
                            motionSensitivity: 'Medium',
                            nightVision: false,
                        };

                        setSettings(defaultSettings);
                        await saveSettings(defaultSettings);
                        Alert.alert('완료', '설정이 초기화되었습니다.');
                    },
                },
            ]
        );
    }, [saveSettings]);

    // 컴포넌트 마운트 시 설정 로드
    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <LinearGradient
                colors={[colors.background, colors.surfaceAlt]}
                style={styles.backgroundGradient}
            />

            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable
                        style={({ pressed }) => [
                            styles.headerButton,
                            pressed && styles.headerButtonPressed,
                        ]}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </Pressable>

                    <Text style={styles.headerTitle}>카메라 설정</Text>

                    <Pressable
                        style={({ pressed }) => [
                            styles.headerButton,
                            pressed && styles.headerButtonPressed,
                        ]}
                        onPress={handleResetSettings}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color={colors.textSecondary} />
                        ) : (
                            <Ionicons name="refresh" size={20} color={colors.textSecondary} />
                        )}
                    </Pressable>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={styles.loadingText}>설정을 불러오는 중...</Text>
                        </View>
                    ) : (
                        <>
                            {/* 기본 설정 */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>기본 설정</Text>
                                <View style={styles.settingCard}>
                                    <SettingItem
                                        icon="videocam"
                                        title="영상 화질"
                                        subtitle={`현재: ${settings.videoQuality}`}
                                        rightElement={
                                            <OptionSelector
                                                currentValue={settings.videoQuality}
                                                options={['HD', 'FHD', '4K']}
                                                onSelect={(value) => updateSetting('videoQuality', value)}
                                            />
                                        }
                                        iconColor={colors.primary}
                                    />

                                    <View style={styles.divider} />

                                    <SettingItem
                                        icon="mic"
                                        title="오디오 녹음"
                                        subtitle="음성과 함께 녹화"
                                        rightElement={
                                            <CustomSwitch
                                                value={settings.audioEnabled}
                                                onValueChange={(value) => updateSetting('audioEnabled', value)}
                                            />
                                        }
                                        iconColor={colors.success}
                                    />

                                    <View style={styles.divider} />

                                    <SettingItem
                                        icon="moon"
                                        title="야간 모드"
                                        subtitle="어두운 환경에서 영상 개선"
                                        rightElement={
                                            <CustomSwitch
                                                value={settings.nightVision}
                                                onValueChange={(value) => updateSetting('nightVision', value)}
                                            />
                                        }
                                        iconColor={colors.accent}
                                    />
                                </View>
                            </View>

                            {/* 녹화 및 동작 감지 */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>녹화 및 동작 감지</Text>
                                <View style={styles.settingCard}>
                                    <SettingItem
                                        icon="radio-button-on"
                                        title="자동 녹화"
                                        subtitle="동작 감지 시 자동 녹화"
                                        rightElement={
                                            <CustomSwitch
                                                value={settings.autoRecord}
                                                onValueChange={(value) => updateSetting('autoRecord', value)}
                                            />
                                        }
                                        iconColor={colors.error}
                                    />

                                    <View style={styles.divider} />

                                    <SettingItem
                                        icon="walk"
                                        title="동작 감지"
                                        subtitle="움직임 자동 감지"
                                        rightElement={
                                            <CustomSwitch
                                                value={settings.motionDetection}
                                                onValueChange={(value) => updateSetting('motionDetection', value)}
                                            />
                                        }
                                        iconColor={colors.success}
                                    />

                                    <View style={styles.divider} />

                                    <SettingItem
                                        icon="eye"
                                        title="감지 민감도"
                                        subtitle={`현재: ${settings.motionSensitivity}`}
                                        rightElement={
                                            <OptionSelector
                                                currentValue={settings.motionSensitivity}
                                                options={['Low', 'Medium', 'High']}
                                                onSelect={(value) => updateSetting('motionSensitivity', value)}
                                            />
                                        }
                                        iconColor={colors.warning}
                                        disabled={!settings.motionDetection}
                                    />
                                </View>
                            </View>

                            {/* 시스템 정보 */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>시스템 정보</Text>
                                <View style={styles.settingCard}>
                                    <SettingItem
                                        icon="analytics"
                                        title="시스템 상태"
                                        subtitle={`카메라: ${systemInfo.cameraStatus} • 네트워크: ${systemInfo.networkStatus}`}
                                        onPress={runSystemDiagnostic}
                                        iconColor={colors.primary}
                                    />

                                    <View style={styles.divider} />

                                    <SettingItem
                                        icon="information-circle"
                                        title="저장소 사용량"
                                        subtitle={`${systemInfo.storageUsed}% 사용 중`}
                                        onPress={() => Alert.alert(
                                            '저장소 정보',
                                            `현재 사용량: ${systemInfo.storageUsed}%\n` +
                                            `상태: ${systemInfo.storageUsed > 80 ? '정리 필요' : '양호'}\n\n` +
                                            `마지막 점검: ${systemInfo.lastCheck}`
                                        )}
                                        iconColor={systemInfo.storageUsed > 80 ? colors.warning : colors.success}
                                    />
                                </View>
                            </View>
                        </>
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
    backgroundGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    safeArea: {
        flex: 1,
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerButton: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: colors.background,
        minWidth: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerButtonPressed: {
        backgroundColor: colors.border,
        transform: [{ scale: 0.95 }],
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },

    // Scroll Content
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },

    // Section
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    settingCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },

    // Setting Items
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        minHeight: 64,
    },
    settingItemPressed: {
        backgroundColor: colors.primary + '08',
    },
    settingItemDisabled: {
        opacity: 0.5,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 16,
    },
    settingIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
        marginBottom: 2,
    },
    settingSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    settingRight: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledText: {
        color: colors.textSecondary,
    },

    // Option Selector
    optionSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 8,
        minWidth: 80,
        justifyContent: 'center',
    },
    optionSelectorPressed: {
        backgroundColor: colors.border,
    },
    optionText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
    },

    // Switch
    switch: {
        transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
    },

    // Divider
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginLeft: 76, // icon width + gap + padding
    },

    // Loading
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
        marginTop: 16,
        textAlign: 'center',
    },
}); 