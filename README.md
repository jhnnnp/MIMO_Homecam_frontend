# 📱 MIMO 홈캠 앱

[![React Native](https://img.shields.io/badge/React%20Native-0.79.5-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-53.0.0-blue.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **🎥 MIMO 홈캠 시스템의 모바일 클라이언트 앱**  
> React Native + Expo로 구현한 iOS/Android 크로스플랫폼 앱

## 📚 목차

- [개요](#개요)
- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [빠른 시작](#빠른-시작)
- [프로젝트 구조](#프로젝트-구조)
- [개발 가이드](#개발-가이드)
- [디자인 시스템](#디자인-시스템)
- [API 연동](#api-연동)
- [테스트](#테스트)
- [빌드 및 배포](#빌드-및-배포)

## 🎯 개요

MIMO 홈캠 앱은 가정용 보안 카메라 시스템을 위한 모바일 클라이언트입니다. 실시간 영상 모니터링, 이벤트 알림, 녹화 영상 관리 등의 기능을 제공합니다.

### 핵심 특징

- 🎨 **일관된 디자인**: 라이트 모드 전용, 한국어 최적화된 UI/UX
- 📱 **크로스플랫폼**: iOS/Android 동시 지원
- 🔐 **보안 우선**: JWT 토큰 기반 인증, 자동 토큰 갱신
- 📡 **실시간 통신**: WebSocket 기반 라이브 스트리밍
- ♿ **접근성**: WCAG 2.1 AA 준수, 터치 타겟 44dp+
- ⚡ **성능 최적화**: 60fps 스크롤, 1.5s 내 초기 렌더링

## 🚀 주요 기능

### 인증 & 계정 관리
- 이메일/비밀번호 로그인
- Google OAuth 2.0 소셜 로그인
- 이메일 인증 시스템 (6자리 코드)
- 자동 로그인 및 토큰 갱신
- 프로필 관리 및 비밀번호 변경

### 디바이스 & 모니터링
- 카메라 디바이스 목록 및 상태 확인
- 실시간 라이브 스트리밍 (WebRTC)
- 온라인/오프라인 상태 실시간 업데이트
- 디바이스별 설정 관리

### 이벤트 & 녹화
- 동작 감지 이벤트 타임라인
- 녹화 영상 재생 및 다운로드
- 이벤트 필터링 및 검색
- 중요 이벤트 북마크 (Pin)

### 알림 시스템
- 실시간 푸시 알림
- 알림 타입별 분류 (동작, 시스템, 보안)
- 읽음/안읽음 상태 관리
- 알림 설정 개인화

### 설정 & 개인화
- 알림 설정 (이메일, 푸시)
- 동작 감지 민감도 조절
- 녹화 품질 설정 (480p/720p/1080p)
- 데이터 보관 기간 설정

## 🛠 기술 스택

### 코어 프레임워크
- **React Native**: 0.79.5 (크로스플랫폼 개발)
- **Expo**: 53.0.0 (개발 도구 및 배포)
- **TypeScript**: 5.8.3 (타입 안전성)

### 상태 관리 & 데이터
- **Zustand**: 경량 상태 관리
- **React Query**: 서버 상태 캐싱 및 동기화
- **React Hook Form + Zod**: 폼 관리 및 검증

### UI/UX & 디자인
- **디자인 토큰**: 일관된 색상/타이포/간격 시스템
- **Vector Icons**: @expo/vector-icons
- **Toast Messages**: 사용자 피드백
- **Modal**: 오버레이 인터랙션

### 네트워킹 & 보안
- **Axios**: HTTP 클라이언트 + 인터셉터
- **Expo SecureStore**: 토큰 암호화 저장
- **JWT**: 액세스/리프레시 토큰 자동 관리

### 미디어 & 실시간
- **Expo AV**: 비디오 재생
- **Expo Camera**: 카메라 접근
- **WebRTC**: 실시간 스트리밍 (예정)
- **File System**: 파일 다운로드 및 관리

### 개발 도구
- **Flash List**: 성능 최적화된 리스트
- **React Native Reanimated**: 고성능 애니메이션
- **Safe Area Context**: 안전 영역 처리

## ⚡ 빠른 시작

### 시스템 요구사항

- **Node.js**: 18.0.0 이상
- **npm**: 8.0.0 이상
- **iOS 개발**: Xcode 14+ (macOS)
- **Android 개발**: Android Studio + JDK 11+

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/your-org/MIMO-frontend.git
cd MIMO-frontend

# 의존성 설치
npm install

# Expo 호환 패키지 버전 맞추기
npx expo install --fix

# 개발 서버 시작
npx expo start

# 플랫폼별 실행
npx expo start --ios     # iOS 시뮬레이터
npx expo start --android # Android 에뮬레이터
npx expo start --web     # 웹 브라우저
```

### 환경 설정

환경별 API 엔드포인트는 `src/services/api.ts`에서 설정합니다:

```typescript
// 개발 환경
const API_BASE_URL = 'http://localhost:4001/api';

// 프로덕션 환경  
const API_BASE_URL = 'https://your-api.com/api';
```

## 📁 프로젝트 구조

```
src/
├── components/           # 재사용 가능한 UI 컴포넌트
│   ├── Button.tsx       # 버튼 컴포넌트
│   ├── TextField.tsx    # 입력 필드
│   ├── Card.tsx         # 카드 레이아웃
│   ├── Badge.tsx        # 상태 배지
│   ├── AppBar.tsx       # 상단 앱바
│   ├── LoadingState.tsx # 로딩 상태
│   ├── ErrorState.tsx   # 에러 상태
│   ├── EmptyState.tsx   # 빈 상태
│   └── index.ts         # 컴포넌트 내보내기
├── screens/             # 화면 컴포넌트
│   └── LoginScreen.tsx  # 로그인 화면
├── services/            # API 서비스 레이어
│   ├── api.ts          # HTTP 클라이언트
│   └── authService.ts  # 인증 서비스
├── stores/              # 상태 관리 (Zustand)
│   └── authStore.ts    # 인증 상태
├── types/               # TypeScript 타입 정의
│   └── api.ts          # API 타입
├── design/              # 디자인 시스템
│   └── tokens.ts       # 디자인 토큰
├── utils/               # 유틸리티 함수
│   └── queryClient.ts  # React Query 설정
├── navigation/          # 네비게이션 설정
└── hooks/               # 커스텀 훅
```

## 👨‍💻 개발 가이드

### 코딩 규칙

1. **TypeScript 필수**: 모든 컴포넌트와 함수에 타입 정의
2. **컴포넌트 규칙**: 
   - Props 인터페이스 정의
   - 기본값 설정
   - 접근성 속성 포함
3. **네이밍 컨벤션**:
   - 컴포넌트: PascalCase
   - 파일: PascalCase (.tsx), camelCase (.ts)
   - 함수/변수: camelCase

### 컴포넌트 작성 가이드

```typescript
// ✅ Good: 완전한 컴포넌트 예시
interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
}

export default function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled = false,
  ...props
}: ButtonProps) {
  return (
    <TouchableOpacity
      {...props}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Text>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
```

### 상태 관리 패턴

```typescript
// ✅ Good: Zustand 스토어 패턴
interface StoreState {
  // 상태
  data: DataType | null;
  isLoading: boolean;
  error: string | null;

  // 액션
  fetchData: () => Promise<void>;
  updateData: (updates: Partial<DataType>) => Promise<boolean>;
  clearError: () => void;
}
```

## 🎨 디자인 시스템

### 디자인 토큰 사용

```typescript
import { colors, typography, spacing } from '../design/tokens';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    padding: spacing.container,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.lg,
  },
});
```

### 색상 팔레트 (라이트 모드)

- **Primary**: `#2563EB` (블루-600)
- **Success**: `#10B981` (그린-500)  
- **Warning**: `#F59E0B` (앰버-500)
- **Error**: `#EF4444` (레드-500)
- **Text**: `#111827` (그레이-900)
- **Background**: `#FFFFFF` (화이트)

### 타이포그래피 (한글 최적화)

- **H1**: 24px/34px, Bold
- **H2**: 20px/28px, SemiBold  
- **Body Large**: 16px/24px, Medium
- **Body Medium**: 14px/22px, Regular
- **Caption**: 12px/18px, Regular

## 🔌 API 연동

### 서비스 레이어 패턴

```typescript
// 1. API 타입 정의
interface LoginRequest {
  email: string;
  password: string;
}

// 2. 서비스 함수
class AuthService {
  async login(credentials: LoginRequest) {
    return await apiService.post('/auth/login', credentials);
  }
}

// 3. 상태 관리에서 사용
const login = async (email: string, password: string) => {
  const response = await authService.login({ email, password });
  // 상태 업데이트
};
```

### 자동 토큰 관리

- JWT 토큰 자동 첨부 (axios 인터셉터)
- 토큰 만료 시 자동 갱신
- 리프레시 실패 시 자동 로그아웃

## 🧪 테스트

### 테스트 실행 (준비 중)

```bash
# 단위 테스트
npm test

# 테스트 커버리지
npm run test:coverage

# E2E 테스트
npm run test:e2e
```

### 테스트 작성 예시

```typescript
describe('Button Component', () => {
  it('should render title correctly', () => {
    render(<Button title="Test Button" />);
    expect(screen.getByText('Test Button')).toBeTruthy();
  });

  it('should show loading state', () => {
    render(<Button title="Test" loading />);
    expect(screen.getByLabelText('로딩 중')).toBeTruthy();
  });
});
```

## 📦 빌드 및 배포

### 개발 빌드

```bash
# EAS Build 설정
npx eas build:configure

# 개발 빌드
npx eas build --profile development --platform ios
npx eas build --profile development --platform android
```

### 프로덕션 배포

```bash
# 프로덕션 빌드
npx eas build --profile production --platform all

# 앱스토어 제출
npx eas submit --profile production --platform ios
npx eas submit --profile production --platform android
```

### 성능 최적화

- **Bundle Analyzer**: 번들 크기 최적화
- **Hermes**: Android 성능 향상
- **Code Splitting**: 지연 로딩
- **Image Optimization**: 이미지 압축 및 캐싱

## 📱 플랫폼별 고려사항

### iOS
- Safe Area 처리
- Human Interface Guidelines 준수
- TestFlight 베타 테스트

### Android
- Material Design 가이드라인
- 다양한 화면 크기 대응
- Google Play Console 배포

## 🔧 문제 해결

### 일반적인 문제

1. **Metro Bundler 오류**
   ```bash
   npx expo start --clear
   ```

2. **패키지 버전 충돌**
   ```bash
   npx expo install --fix
   ```

3. **iOS 시뮬레이터 연결 실패**
   - Xcode 및 시뮬레이터 재시작
   - `npx expo run:ios` 사용

4. **Android 에뮬레이터 이슈**
   - Android Studio에서 가상 디바이스 확인
   - `npx expo run:android` 사용

## 🤝 기여 가이드

### 개발 프로세스

1. **이슈 생성**: 버그 리포트나 기능 요청
2. **브랜치 생성**: `feature/기능명` 또는 `bugfix/버그명`
3. **개발**: 코딩 표준 및 컨벤션 준수
4. **테스트**: 단위 테스트 및 E2E 테스트 작성
5. **Pull Request**: 상세한 설명과 스크린샷 포함

### Pull Request 체크리스트

- [ ] TypeScript 컴파일 오류 없음
- [ ] ESLint/Prettier 통과
- [ ] 새로운 컴포넌트에 접근성 속성 추가
- [ ] 적절한 에러 처리 및 로딩 상태
- [ ] 디자인 토큰 사용
- [ ] 테스트 커버리지 유지

## 📄 라이선스

이 프로젝트는 [MIT 라이선스](LICENSE)를 따릅니다.

## 📞 지원 및 연락처

### 개발자
- **이름**: 박진한 (JinHan Park)
- **이메일**: [jhnnn.park@gmail.com](mailto:jhnnn.park@gmail.com)
- **GitHub**: [@jhnnnp](https://github.com/jhnnnp)

### 프로젝트 링크
- **백엔드**: [MIMO Backend Repository](https://github.com/jhnnnp/MIMO_Homecam_backend)
- **프론트엔드**: [MIMO Frontend Repository](https://github.com/jhnnnp/MIMO_Homecam_frontend)

### 지원 채널
- **이슈 트래커**: [GitHub Issues](https://github.com/jhnnnp/MIMO_Homecam_frontend/issues)
- **토론**: [GitHub Discussions](https://github.com/jhnnnp/MIMO_Homecam_frontend/discussions)

---

**MIMO Team**과 함께 만들어가는 스마트 홈 솔루션입니다. 📱✨ 