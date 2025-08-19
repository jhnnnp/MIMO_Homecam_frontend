/**
 * MIMO 홈캠 앱 디자인 시스템 토큰
 *
 * @description
 * 이 파일은 앱 전체의 디자인 일관성을 유지하기 위한 중앙 집중식 스타일 가이드입니다.
 * 색상, 타이포그래피, 간격, 그림자 등 모든 UI 요소의 기본 값을 정의합니다.
 * 로고의 따뜻하고 신뢰감 있는 브랜딩을 반영하여 재설계되었습니다.
 */

// 1. 색상 (Color Palette)
// 로고의 색상(Muted Green, Warm Yellow, Cream)을 기반으로 한 전문적인 팔레트
export const colors = {
    // Core Colors
    primary: '#607A78', // Muted Green: 핵심 상호작용 요소 (버튼, 활성 상태)
    primaryLight: '#D9E0DF', // Primary의 밝은 버전
    accent: '#F5C572',  // Warm Yellow: 강조, 하이라이트, 긍정적 피드백

    // Background & Surface
    background: '#FBF9F4', // Cream: 앱 전체 배경
    surface: '#FFFFFF', // Pure White: 카드, 모달 등 배경 위에 떠 있는 요소
    surfaceAlt: '#F7F4EF',  // Slightly darker cream

    // Text Colors
    text: '#3A3F47',      // Warm Dark Gray: 기본 텍스트
    textSecondary: '#7A8089', // 보조 텍스트 (설명, 비활성 상태)
    textOnPrimary: '#FFFFFF',  // Primary 색상 위의 텍스트

    // Feedback Colors
    success: '#58A593', // Muted Teal: 성공 상태
    error: '#D97373',   // Muted Red: 오류 상태
    warning: '#E6A556', // Warm Orange: 경고 상태

    // Neutral & Utility
    divider: '#EAE6DD',  // Warm Gray: 구분선
    disabledBg: '#F0EEE9',   // 비활성 요소 배경
    disabledText: '#B0B5BB', // 비활성 요소 텍스트
    dimOverlay: 'rgba(58, 63, 71, 0.6)', // 어두운 오버레이 (모달 배경 등)
    focusRing: '#F5C572', // 포커스 링 (접근성)

    // Aliases for legacy/component usage
    border: '#EAE6DD',
    textWeak: '#7A8089', // alias for textSecondary
    offline: '#7A8089',
    statusCritical: '#D97373', // alias for error
};

// 2. 타이포그래피 (Typography)
// 가독성과 전문성을 높이기 위해 스케일을 재정의
export const typography = {
    // Display & Headline
    display: { fontSize: 32, lineHeight: 40, fontWeight: '700' as const },
    h1: { fontSize: 24, lineHeight: 32, fontWeight: '700' as const },
    h2: { fontSize: 20, lineHeight: 28, fontWeight: '600' as const },
    h3: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },

    // Body & Paragraph
    bodyLg: { fontSize: 16, lineHeight: 24, fontWeight: '500' as const },
    body: { fontSize: 14, lineHeight: 22, fontWeight: '400' as const },
    bodySm: { fontSize: 13, lineHeight: 20, fontWeight: '400' as const },

    // Label & Caption
    label: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const },
    caption: { fontSize: 12, lineHeight: 18, fontWeight: '400' as const },

    // Aliases for legacy/component usage
    bodyMedium: { fontSize: 14, lineHeight: 22, fontWeight: '400' as const },
    bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: '500' as const },
};

// 3. 간격 (Spacing)
// 8pt 그리드 시스템을 기반으로 한 일관된 간격 체계
export const spacing = {
    '3xs': 2,
    '2xs': 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
    // Aliases for components
    cardPadding: 16,
    container: 24,
};

// 4. 모서리 둥글기 (Radius)
// 로고의 둥근 형태를 반영하여 부드럽고 친근한 느낌 강조
export const radius = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
    // Aliases
    card: 12,
    medium: 12,
    large: 16,
};

// 5. 그림자 & 입체감 (Elevation)
// 섬세하고 부드러운 그림자로 UI의 깊이감을 표현
export const elevation = {
    '1': {
        shadowColor: 'rgba(58, 63, 71, 0.1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 2,
    },
    '2': {
        shadowColor: 'rgba(58, 63, 71, 0.12)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
        elevation: 4,
    },
    '3': {
        shadowColor: 'rgba(58, 63, 71, 0.15)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.8,
        shadowRadius: 16,
        elevation: 8,
    },
    // Alias
    level1: {
        shadowColor: 'rgba(58, 63, 71, 0.1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 2,
    },
};

// 6. 모션 & 애니메이션 (Motion)
export const motion = {
    fast: 150,
    normal: 250,
    slow: 400,
};

// 7. 레이아웃 (Layout)
export const layout = {
    containerPadding: spacing.xl,
    isSmallDevice: false, // This could be updated based on screen dimensions
    // Aliases
    appBarHeight: 56,
    appBarHeightCompressed: 48,
};

// 8. Z-인덱스 (zIndex)
export const zIndex = {
    background: -1,
    base: 0,
    appBar: 10,
    fab: 20,
    bottomSheet: 30,
    modal: 40,
    toast: 50,
}; 