import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert,
    Animated,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, elevation, typography } from '../../design/tokens';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

const { width: screenWidth } = Dimensions.get('window');

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
    isFirst?: boolean;
    isLast?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
    icon,
    title,
    subtitle,
    rightElement,
    onPress,
    showArrow = true,
    iconColor = colors.primary,
    isFirst = false,
    isLast = false,
}) => (
    <TouchableOpacity
        style={[
            styles.settingItem,
            isFirst && styles.settingItemFirst,
            isLast && styles.settingItemLast,
        ]}
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={0.7}
    >
        <View style={styles.settingLeft}>
            <View style={styles.iconContainer}>
                <LinearGradient
                    colors={[iconColor + '20', iconColor + '10']}
                    style={styles.iconGradient}
                >
                    <Ionicons name={icon as any} size={20} color={iconColor} />
                </LinearGradient>
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

    // 애니메이션 값들
    const [fadeAnim] = useState(new Animated.Value(0));
    const [slideAnim] = useState(new Animated.Value(50));

    useEffect(() => {
        // 화면 진입 애니메이션
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

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
                        Alert.alert('완료! ✅', '설정이 초기화되었습니다.');
                    },
                },
            ]
        );
    };

    const renderHeader = () => (
        <Animated.View
            style={[
                styles.header,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
        >
            <TouchableOpacity
                style={styles.headerButton}
                onPress={() => navigation.goBack()}
            >
                <LinearGradient
                    colors={[colors.surface, colors.surfaceAlt]}
                    style={styles.headerButtonGradient}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </LinearGradient>
            </TouchableOpacity>

            <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>⚙️ 카메라 설정</Text>
                <Text style={styles.headerSubtitle}>홈캠 환경 구성</Text>
            </View>

            <View style={styles.headerSpacer} />
        </Animated.View>
    );

    const renderSection = (title: string, children: React.ReactNode, index: number) => (
        <Animated.View
            style={[
                styles.section,
                {
                    opacity: fadeAnim,
                    transform: [{
                        translateY: slideAnim.interpolate({
                            inputRange: [0, 50],
                            outputRange: [0, 50 + (index * 20)],
                        })
                    }]
                }
            ]}
        >
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.sectionCard}>
                <LinearGradient
                    colors={[colors.surface, colors.surfaceAlt]}
                    style={styles.sectionCardGradient}
                >
                    {children}
                </LinearGradient>
            </View>
        </Animated.View>
    );

    const createSwitch = (value: boolean, onValueChange: (value: boolean) => void) => (
        <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{
                false: colors.divider,
                true: colors.primary + '40'
            }}
            thumbColor={value ? colors.primary : colors.surface}
            ios_backgroundColor={colors.divider}
            style={styles.switchStyle}
        />
    );

    const renderRecordingSettings = () => renderSection(
        "📹 녹화 설정",
        <>
            <SettingItem
                icon="radio-button-on"
                title="자동 녹화"
                subtitle="동작 감지 시 자동으로 녹화 시작"
                rightElement={createSwitch(autoRecord, setAutoRecord)}
                showArrow={false}
                iconColor={colors.primary}
                isFirst={true}
            />
            <View style={styles.divider} />
            <SettingItem
                icon="walk"
                title="동작 감지"
                subtitle="움직임이 감지되면 알림 및 녹화"
                rightElement={createSwitch(motionDetection, setMotionDetection)}
                showArrow={false}
                iconColor={colors.warning}
            />
            <View style={styles.divider} />
            <SettingItem
                icon="mic"
                title="오디오 녹화"
                subtitle="녹화 시 소리도 함께 저장"
                rightElement={createSwitch(audioRecording, setAudioRecording)}
                showArrow={false}
                iconColor={colors.accent}
                isLast={true}
            />
        </>,
        0
    );

    const renderVideoSettings = () => renderSection(
        "🎬 영상 설정",
        <>
            <SettingItem
                icon="videocam"
                title="화질"
                subtitle={`현재: ${videoQuality} • 탭해서 변경`}
                onPress={handleQualityChange}
                iconColor={colors.primary}
                isFirst={true}
            />
            <View style={styles.divider} />
            <SettingItem
                icon="speedometer"
                title="프레임 레이트"
                subtitle={`현재: ${frameRate} • 탭해서 변경`}
                onPress={handleFrameRateChange}
                iconColor={colors.accent}
            />
            <View style={styles.divider} />
            <SettingItem
                icon="moon"
                title="야간 모드"
                subtitle="어두운 환경에서 자동으로 밝기 조정"
                rightElement={createSwitch(nightVision, setNightVision)}
                showArrow={false}
                iconColor={colors.warning}
                isLast={true}
            />
        </>,
        1
    );

    const renderStorageSettings = () => renderSection(
        "💾 저장소 설정",
        <>
            <SettingItem
                icon="save"
                title="저장 용량 제한"
                subtitle={`현재: ${storageLimit} • 탭해서 변경`}
                onPress={handleStorageLimitChange}
                iconColor={colors.success}
                isFirst={true}
            />
            <View style={styles.divider} />
            <SettingItem
                icon="trash"
                title="저장된 영상 관리"
                subtitle="오래된 영상 자동 삭제 설정"
                onPress={() => Alert.alert('준비 중 🚧', '저장된 영상 관리 기능은 준비 중입니다.')}
                iconColor={colors.error}
                isLast={true}
            />
        </>,
        2
    );

    const renderNetworkSettings = () => renderSection(
        "🌐 네트워크 설정",
        <>
            <SettingItem
                icon="wifi"
                title="Wi-Fi 설정"
                subtitle="연결된 네트워크 정보"
                onPress={() => Alert.alert('준비 중 🚧', 'Wi-Fi 설정 기능은 준비 중입니다.')}
                iconColor={colors.primary}
                isFirst={true}
            />
            <View style={styles.divider} />
            <SettingItem
                icon="qr-code"
                title="연결 QR 코드"
                subtitle="다른 기기에서 이 카메라에 연결"
                onPress={() => Alert.alert('준비 중 🚧', 'QR 코드 생성 기능은 준비 중입니다.')}
                iconColor={colors.accent}
                isLast={true}
            />
        </>,
        3
    );

    const renderAdvancedSettings = () => renderSection(
        "🔧 고급 설정",
        <>
            <SettingItem
                icon="refresh"
                title="설정 초기화"
                subtitle="모든 설정을 기본값으로 되돌리기"
                onPress={handleResetSettings}
                iconColor={colors.warning}
                isFirst={true}
            />
            <View style={styles.divider} />
            <SettingItem
                icon="information-circle"
                title="카메라 정보"
                subtitle="하드웨어 및 소프트웨어 정보"
                onPress={() => Alert.alert(
                    '📱 카메라 정보',
                    'MIMO 홈캠 v1.0.0\n© 2024 MIMO Team\n\n🔧 빌드 정보:\n- React Native 0.73.x\n- Expo SDK 50.x\n- WebRTC 지원'
                )}
                iconColor={colors.textSecondary}
                isLast={true}
            />
        </>,
        4
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.background, colors.surfaceAlt]}
                style={styles.gradientBackground}
            />

            <SafeAreaView style={styles.safeArea}>
                {renderHeader()}

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {renderRecordingSettings()}
                    {renderVideoSettings()}
                    {renderStorageSettings()}
                    {renderNetworkSettings()}
                    {renderAdvancedSettings()}

                    {/* Footer */}
                    <Animated.View
                        style={[
                            styles.footer,
                            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                        ]}
                    >
                        <Text style={styles.footerText}>
                            💡 설정 변경사항은 자동으로 저장됩니다
                        </Text>
                    </Animated.View>
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
    headerButton: {
        padding: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        ...elevation['1'],
    },
    headerButtonGradient: {
        padding: spacing.sm,
        borderRadius: radius.md,
    },
    headerCenter: {
        alignItems: 'center',
    },
    headerTitle: {
        ...typography.h2,
        color: colors.text,
    },
    headerSubtitle: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: spacing['2xs'],
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
        ...typography.h3,
        color: colors.text,
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.sm,
    },
    sectionCard: {
        borderRadius: radius.lg,
        overflow: 'hidden',
        ...elevation['2'],
    },
    sectionCardGradient: {
        borderRadius: radius.lg,
        padding: spacing.lg,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.lg,
        minHeight: 64,
    },
    settingItemFirst: {
        borderTopLeftRadius: radius.lg,
        borderTopRightRadius: radius.lg,
    },
    settingItemLast: {
        borderBottomLeftRadius: radius.lg,
        borderBottomRightRadius: radius.lg,
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
    iconGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingContent: {
        flex: 1,
        gap: spacing['2xs'],
    },
    settingTitle: {
        ...typography.bodyLg,
        fontWeight: '600',
        color: colors.text,
    },
    settingSubtitle: {
        ...typography.body,
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
    switchStyle: {
        transform: [{ scale: 0.9 }], // 스위치 크기 조정
    },
    footer: {
        padding: spacing.lg,
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderTopLeftRadius: radius.lg,
        borderTopRightRadius: radius.lg,
        ...elevation['1'],
    },
    footerText: {
        ...typography.body,
        color: colors.textSecondary,
    },
}); 