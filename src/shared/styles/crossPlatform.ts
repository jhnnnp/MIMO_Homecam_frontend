import { Platform } from 'react-native';

interface ElevationStyle {
    shadowColor?: string;
    shadowOffset?: { width: number; height: number };
    shadowOpacity?: number;
    shadowRadius?: number;
    elevation?: number;
}

export const getElevation = (level: 1 | 2 | 3 = 1): ElevationStyle => {
    // 기본값(디자인 토큰과 어울리도록 약한 섀도우)
    const presets: Record<number, ElevationStyle> = {
        1: {
            shadowColor: 'rgba(58, 63, 71, 0.1)',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.8,
            shadowRadius: 4,
            elevation: 2
        },
        2: {
            shadowColor: 'rgba(58, 63, 71, 0.12)',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.8,
            shadowRadius: 8,
            elevation: 4
        },
        3: {
            shadowColor: 'rgba(58, 63, 71, 0.15)',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.8,
            shadowRadius: 16,
            elevation: 8
        }
    };

    const style = presets[level] || presets[1];

    // 플랫폼별 호환 처리: iOS는 shadow*, Android는 elevation 중심
    if (Platform.OS === 'ios') {
        const { elevation, ...iosStyle } = style;
        return iosStyle;
    }
    return { elevation: style.elevation };
};


