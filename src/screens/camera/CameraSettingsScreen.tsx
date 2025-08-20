import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, elevation } from '../../design/tokens';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

type CameraSettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CameraSettings'>;

interface CameraSettingsScreenProps {
    navigation: CameraSettingsScreenNavigationProp;
}

interface SettingItemProps {
    icon: string;
    title: string;
    subtitle?: string;
    rightElement?: React.ReactNode;
    onPress?: () => void;
    showArrow?: boolean;
    iconColor?: string;
}

const SettingItem: React.FC<SettingItemProps> = ({
    icon,
    title,
    subtitle,
    rightElement,
    onPress,
    showArrow = true,
    iconColor = colors.primary,
}) => (
    <TouchableOpacity
        style={styles.settingItem}
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={0.7}
    >
        <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
                <Ionicons name={icon as any} size={20} color={iconColor} />
            </View>
            <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{title}</Text>
                {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
            </View>
        </View>

        <View style={styles.settingRight}>
            {rightElement}
            {showArrow && onPress && (
                <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textSecondary}
                    style={styles.arrowIcon}
                />
            )}
        </View>
    </TouchableOpacity>
);

export default function CameraSettingsScreen({ navigation }: CameraSettingsScreenProps) {
    const [autoRecord, setAutoRecord] = useState(true);
    const [motionDetection, setMotionDetection] = useState(true);
    const [nightVision, setNightVision] = useState(false);
    const [audioRecording, setAudioRecording] = useState(true);
    const [videoQuality, setVideoQuality] = useState<'480p' | '720p' | '1080p'>('720p');
    const [frameRate, setFrameRate] = useState<'15fps' | '30fps' | '60fps'>('30fps');
    const [storageLimit, setStorageLimit] = useState<'1GB' | '5GB' | '10GB' | 'unlimited'>('5GB');

    const handleQualityChange = () => {
        const qualities: Array<'480p' | '720p' | '1080p'> = ['480p', '720p', '1080p'];
        const currentIndex = qualities.indexOf(videoQuality);
        const nextQuality = qualities[(currentIndex + 1) % qualities.length];
        setVideoQuality(nextQuality);
    };

    const handleFrameRateChange = () => {
        const rates: Array<'15fps' | '30fps' | '60fps'> = ['15fps', '30fps', '60fps'];
        const currentIndex = rates.indexOf(frameRate);
        const nextRate = rates[(currentIndex + 1) % rates.length];
        setFrameRate(nextRate);
    };

    const handleStorageLimitChange = () => {
        const limits: Array<'1GB' | '5GB' | '10GB' | 'unlimited'> = ['1GB', '5GB', '10GB', 'unlimited'];
        const currentIndex = limits.indexOf(storageLimit);
        const nextLimit = limits[(currentIndex + 1) % limits.length];
        setStorageLimit(nextLimit);
    };

    const handleResetSettings = () => {
        Alert.alert(
            '설정 초기화',
            '모든 카메라 설정을 기본값으로 초기화하시겠어요?',
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '초기화',
                    style: 'destructive',
                    onPress: () => {
                        setAutoRecord(true);
                        setMotionDetection(true);
                        setNightVision(false);
                        setAudioRecording(true);
                        setVideoQuality('720p');
                        setFrameRate('30fps');
                        setStorageLimit('5GB');
                        Alert.alert('완료', '설정이 초기화되었습니다.');
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.background, colors.surfaceAlt]}
                style={styles.gradientBackground}
            />

            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>카메라 설정</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Recording Settings */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>녹화 설정</Text>
                        <View style={styles.sectionCard}>
                            <SettingItem
                                icon="radio-button-on"
                                title="자동 녹화"
                                subtitle="동작 감지 시 자동으로 녹화 시작"
                                rightElement={
                                    <Switch
                                        value={autoRecord}
                                        onValueChange={setAutoRecord}
                                        trackColor={{ false: colors.divider, true: colors.primary + '40' }}
                                        thumbColor={autoRecord ? colors.primary : colors.surface}
                                        ios_backgroundColor={colors.divider}
                                    />
                                }
                                showArrow={false}
                                iconColor={colors.primary}
                            />
                            <View style={styles.divider} />
                            <SettingItem
                                icon="walk"
                                title="동작 감지"
                                subtitle="움직임이 감지되면 알림 및 녹화"
                                rightElement={
                                    <Switch
                                        value={motionDetection}
                                        onValueChange={setMotionDetection}
                                        trackColor={{ false: colors.divider, true: colors.primary + '40' }}
                                        thumbColor={motionDetection ? colors.primary : colors.surface}
                                        ios_backgroundColor={colors.divider}
                                    />
                                }
                                showArrow={false}
                                iconColor={colors.warning}
                            />
                            <View style={styles.divider} />
                            <SettingItem
                                icon="mic"
                                title="오디오 녹화"
                                subtitle="녹화 시 소리도 함께 저장"
                                rightElement={
                                    <Switch
                                        value={audioRecording}
                                        onValueChange={setAudioRecording}
                                        trackColor={{ false: colors.divider, true: colors.primary + '40' }}
                                        thumbColor={audioRecording ? colors.primary : colors.surface}
                                        ios_backgroundColor={colors.divider}
                                    />
                                }
                                showArrow={false}
                                iconColor={colors.accent}
                            />
                        </View>
                    </View>

                    {/* Video Settings */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>영상 설정</Text>
                        <View style={styles.sectionCard}>
                            <SettingItem
                                icon="videocam"
                                title="화질"
                                subtitle={`현재: ${videoQuality}`}
                                onPress={handleQualityChange}
                                iconColor={colors.primary}
                            />
                            <View style={styles.divider} />
                            <SettingItem
                                icon="speedometer"
                                title="프레임 레이트"
                                subtitle={`현재: ${frameRate}`}
                                onPress={handleFrameRateChange}
                                iconColor={colors.accent}
                            />
                            <View style={styles.divider} />
                            <SettingItem
                                icon="moon"
                                title="야간 모드"
                                subtitle="어두운 환경에서 자동으로 밝기 조정"
                                rightElement={
                                    <Switch
                                        value={nightVision}
                                        onValueChange={setNightVision}
                                        trackColor={{ false: colors.divider, true: colors.primary + '40' }}
                                        thumbColor={nightVision ? colors.primary : colors.surface}
                                        ios_backgroundColor={colors.divider}
                                    />
                                }
                                showArrow={false}
                                iconColor={colors.warning}
                            />
                        </View>
                    </View>

                    {/* Storage Settings */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>저장소 설정</Text>
                        <View style={styles.sectionCard}>
                            <SettingItem
                                icon="save"
                                title="저장 용량 제한"
                                subtitle={`현재: ${storageLimit}`}
                                onPress={handleStorageLimitChange}
                                iconColor={colors.success}
                            />
                            <View style={styles.divider} />
                            <SettingItem
                                icon="trash"
                                title="저장된 영상 관리"
                                subtitle="오래된 영상 자동 삭제 설정"
                                onPress={() => Alert.alert('준비 중', '저장된 영상 관리 기능은 준비 중입니다.')}
                                iconColor={colors.error}
                            />
                        </View>
                    </View>

                    {/* Network Settings */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>네트워크 설정</Text>
                        <View style={styles.sectionCard}>
                            <SettingItem
                                icon="wifi"
                                title="Wi-Fi 설정"
                                subtitle="연결된 네트워크 정보"
                                onPress={() => Alert.alert('준비 중', 'Wi-Fi 설정 기능은 준비 중입니다.')}
                                iconColor={colors.primary}
                            />
                            <View style={styles.divider} />
                            <SettingItem
                                icon="qr-code"
                                title="연결 QR 코드"
                                subtitle="다른 기기에서 이 카메라에 연결"
                                onPress={() => Alert.alert('준비 중', 'QR 코드 생성 기능은 준비 중입니다.')}
                                iconColor={colors.accent}
                            />
                        </View>
                    </View>

                    {/* Advanced Settings */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>고급 설정</Text>
                        <View style={styles.sectionCard}>
                            <SettingItem
                                icon="refresh"
                                title="설정 초기화"
                                subtitle="모든 설정을 기본값으로 되돌리기"
                                onPress={handleResetSettings}
                                iconColor={colors.warning}
                            />
                            <View style={styles.divider} />
                            <SettingItem
                                icon="information-circle"
                                title="카메라 정보"
                                subtitle="하드웨어 및 소프트웨어 정보"
                                onPress={() => Alert.alert('카메라 정보', 'MIMO 홈캠 v1.0.0\n© 2024 MIMO Team')}
                                iconColor={colors.textSecondary}
                            />
                        </View>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    headerSpacer: {
        width: 24,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.xl,
        paddingBottom: spacing['3xl'],
    },
    section: {
        marginBottom: spacing['2xl'],
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.sm,
    },
    sectionCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        overflow: 'hidden',
        ...elevation['2'],
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.lg,
        minHeight: 64,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: spacing.md,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingContent: {
        flex: 1,
        gap: spacing['2xs'],
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    settingSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    settingRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    arrowIcon: {
        marginLeft: spacing.xs,
    },
    divider: {
        height: 1,
        backgroundColor: colors.divider,
        marginLeft: spacing.lg + spacing.md + 44,
        marginRight: spacing.lg,
    },
}); 