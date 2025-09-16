# MIMO Camera Frontend

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/your-org/mimo-camera)
[![Test Coverage](https://img.shields.io/badge/coverage-85%25-brightgreen)](https://github.com/your-org/mimo-camera)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/your-org/mimo-camera)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

> 🎥 **MIMO Camera** - 실시간 카메라 스트리밍 및 모션 감지 모바일 애플리케이션

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

MIMO Camera는 React Native와 Expo를 기반으로 한 실시간 카메라 스트리밍 애플리케이션입니다. WebRTC를 통한 P2P 스트리밍, 실시간 모션 감지, 자동 녹화 기능을 제공합니다.

### 🏗️ Architecture Highlights

- **🔐 보안 강화**: JWT 토큰 관리, SecureStore 활용
- **📡 실시간 통신**: WebSocket 기반 실시간 스트리밍
- **🎥 WebRTC**: P2P 비디오 스트리밍
- **🤖 모션 감지**: 실시간 모션 감지 및 알림
- **📱 크로스 플랫폼**: iOS/Android 지원
- **⚡ 성능 최적화**: 캐싱, 재시도 로직, 에러 처리

## ✨ Features

### 🔐 Authentication & Security
- [x] JWT 기반 인증 시스템
- [x] 자동 토큰 갱신
- [x] SecureStore를 통한 안전한 토큰 저장
- [x] Google OAuth 지원
- [x] 이메일 인증 시스템

### 📹 Camera & Streaming
- [x] 실시간 카메라 스트리밍
- [x] WebRTC P2P 연결
- [x] 다중 카메라 지원
- [x] 스트림 품질 조정
- [x] 자동 재연결 기능

### 🎯 Motion Detection
- [x] 실시간 모션 감지
- [x] 감도 조정
- [x] 감지 영역 설정
- [x] 자동 알림 발송
- [x] 이벤트 로깅

### 📱 Notifications
- [x] 푸시 알림
- [x] 로컬 알림
- [x] 조용한 시간 설정
- [x] 알림 카테고리 관리
- [x] 실시간 알림

### 🎬 Recording
- [x] 자동 녹화
- [x] 수동 녹화
- [x] 스냅샷 촬영
- [x] 녹화 파일 관리
- [x] 갤러리 저장

### ⚙️ Settings & Configuration
- [x] 환경별 설정 관리
- [x] 사용자 설정 저장
- [x] 설정 동기화
- [x] 설정 내보내기/가져오기

## 🏗️ Architecture

Feature-based 아키텍처를 채택하여 도메인별로 코드를 구성합니다. 자세한 내용은 [`FRONTEND_ARCHITECTURE.md`](FRONTEND_ARCHITECTURE.md) 문서를 참고하세요.

```
src/
├── app/                 # App-level configuration
│   ├── navigation/      # Navigation setup
│   ├── providers/       # Context providers
│   └── config/         # App configuration
├── features/           # Feature-based modules
│   ├── auth/           # Authentication
│   ├── camera/         # Camera functionality
│   ├── viewer/         # Video viewing
│   ├── connection/     # Device connection
│   ├── settings/       # App settings
│   └── recording/      # Recording functionality
├── shared/             # Shared resources
│   ├── components/     # Reusable UI components
│   ├── services/      # Core services
│   ├── hooks/         # Reusable hooks
│   ├── stores/        # Global state
│   ├── types/         # Global types
│   └── utils/         # Utility functions
└── design/            # Design system
    ├── tokens/        # Design tokens
    ├── themes/        # Themes
    └── styles/        # Global styles
```

## 🚀 Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI
- iOS Simulator (macOS) or Android Emulator

### Setup

1. **Clone Repository**
```bash
git clone https://github.com/your-org/mimo-camera.git
cd mimo-camera/frontend
```

2. **Install Dependencies**
```bash
npm install
# or
yarn install
```

3. **Environment Configuration**
```bash
cp env.example .env
# Edit .env with your configuration
```

4. **Start Development Server**
```bash
npm start
# or
yarn start
```

5. **Run on Device/Simulator**
```bash
# iOS
npm run ios
# Android
npm run android
```

## ⚙️ Configuration

### Environment Variables

주요 환경 변수들을 설정하세요:

```bash
# App Configuration
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_PROJECT_ID=your-expo-project-id

# API Configuration
EXPO_PUBLIC_API_URL=http://192.168.123.105:4001/api
EXPO_PUBLIC_API_TIMEOUT=10000

# WebSocket Configuration
EXPO_PUBLIC_WS_URL=ws://192.168.123.105:8080
EXPO_PUBLIC_WS_RECONNECT_ATTEMPTS=5

# Security Configuration
EXPO_PUBLIC_TOKEN_REFRESH_THRESHOLD=5
EXPO_PUBLIC_MAX_TOKEN_AGE=60
```

### Configuration Files

- `config/index.ts` - 통합 설정 관리
- `env.example` - 환경 변수 예시
- `.env` - 실제 환경 변수 (gitignore됨)

## 📖 Usage

### 🔐 Authentication

```typescript
import { authService } from './services/authService';

// 로그인
const loginResult = await authService.login({
  email: 'user@example.com',
  password: 'password'
});

// 회원가입
const registerResult = await authService.register({
  email: 'user@example.com',
  password: 'password',
  name: 'User Name',
  nickname: 'nickname',
  agreeTerms: true,
  agreePrivacy: true,
  agreeMicrophone: true,
  agreeLocation: true
});

// 로그아웃
await authService.logout();
```

### 📹 Camera Management

```typescript
import { cameraService } from './services/cameraService';

// 카메라 목록 조회
const cameras = await cameraService.getCameras();

// 새 카메라 등록
const newCamera = await cameraService.createCamera({
  name: 'Living Room Camera',
  location: 'Living Room',
  settings: {
    resolution: '720p',
    frameRate: 30,
    quality: 'medium'
  }
});

// 카메라 설정 업데이트
await cameraService.updateCameraSettings(cameraId, {
  resolution: '1080p',
  motionDetection: {
    enabled: true,
    sensitivity: 'high'
  }
});
```

### 🎥 Streaming

```typescript
import { streamingService } from './services/streamingService';

// WebSocket 연결
await streamingService.connect();

// 스트림 시작 (홈캠 모드)
await streamingService.startStream(cameraId, viewerId);

// 스트림 참여 (뷰어 모드)
await streamingService.joinStream(cameraId, viewerId);

// 이벤트 리스너
streamingService.addEventListener('stream_started', (data) => {
  console.log('Stream started:', data);
});
```

### 🎯 Motion Detection

```typescript
import { motionDetectionService } from './services/motionDetectionService';

// 모션 감지 시작
await motionDetectionService.startDetection(
  cameraRef,
  (event) => {
    console.log('Motion detected:', event);
  },
  (zone, event) => {
    console.log('Zone violation:', zone, event);
  }
);

// 설정 업데이트
motionDetectionService.updateConfig({
  sensitivity: 'high',
  detectionInterval: 500,
  cooldownPeriod: 15000
});
```

### 📱 Notifications

```typescript
import { notificationService } from './services/notificationService';

// 로컬 알림 발송
await notificationService.sendLocalNotification({
  title: '모션 감지됨',
  body: '카메라에서 움직임이 감지되었습니다.',
  data: { type: 'motion', cameraId: '123' }
});

// 설정 업데이트
notificationService.updateSettings({
  motionDetection: true,
  soundEnabled: true,
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '08:00'
  }
});
```

### 🎬 Recording

```typescript
import { recordingService } from './services/recordingService';

// 녹화 시작
const session = await recordingService.startRecording(cameraId);

// 녹화 중지
await recordingService.stopRecording(session.id);

// 스냅샷 촬영
const snapshotPath = await recordingService.takeSnapshot(cameraId);

// 녹화 목록 조회
const recordings = await recordingService.getRecordings();
```

## 🔧 API Reference

### Core Services

#### API Service
- `api.get<T>(url, config?)` - GET 요청
- `api.post<T>(url, data?, config?)` - POST 요청
- `api.put<T>(url, data?, config?)` - PUT 요청
- `api.delete<T>(url, config?)` - DELETE 요청
- `api.uploadFile<T>(url, file, onProgress?)` - 파일 업로드

#### Auth Service
- `authService.login(credentials)` - 로그인
- `authService.register(userData)` - 회원가입
- `authService.logout()` - 로그아웃
- `authService.refreshToken()` - 토큰 갱신
- `authService.getCurrentUser()` - 현재 사용자 조회

#### Camera Service
- `cameraService.getCameras()` - 카메라 목록
- `cameraService.createCamera(data)` - 카메라 생성
- `cameraService.updateCamera(id, updates)` - 카메라 업데이트
- `cameraService.deleteCamera(id)` - 카메라 삭제
- `cameraService.getCameraSettings(id)` - 설정 조회

#### Streaming Service
- `streamingService.connect()` - WebSocket 연결
- `streamingService.startStream(cameraId, viewerId)` - 스트림 시작
- `streamingService.joinStream(cameraId, viewerId)` - 스트림 참여
- `streamingService.stopStream(cameraId)` - 스트림 중지

### Error Handling

```typescript
import { withErrorHandling, withRetry } from './utils/errorHandler';

// 에러 처리 래퍼
const result = await withErrorHandling(async () => {
  return await api.get('/data');
}, { operation: 'get_data' });

// 재시도 로직 포함
const result = await withRetry(async () => {
  return await api.post('/upload', data);
}, 3, { operation: 'upload_data' });
```

### Logging

```typescript
import { logger, createLogger } from './utils/logger';

// 기본 로거
logger.info('Application started');
logger.error('Error occurred', error);

// 서비스별 로거
const serviceLogger = createLogger('MyService');
serviceLogger.logUserAction('Button clicked', { buttonId: 'submit' });
serviceLogger.logApiRequest('POST', '/api/data', data);
```

## 🧪 Testing

### Unit Tests

```bash
# 모든 테스트 실행
npm test

# 특정 파일 테스트
npm test api.test.ts

# 커버리지 리포트
npm run test:coverage
```

### E2E Tests

```bash
# E2E 테스트 실행
npm run test:e2e

# 특정 시나리오 테스트
npm run test:e2e -- --grep "Login Flow"
```

### Test Examples

```typescript
// API Service Test
describe('API Service', () => {
  it('should handle authentication', async () => {
    const result = await apiService.login(credentials);
    expect(result.ok).toBe(true);
  });
});

// Camera Service Test
describe('Camera Service', () => {
  it('should create camera', async () => {
    const camera = await cameraService.createCamera(cameraData);
    expect(camera.name).toBe(cameraData.name);
  });
});
```

## 🚀 Deployment

### Development Build

```bash
# iOS Development Build
eas build --platform ios --profile development

# Android Development Build
eas build --platform android --profile development
```

### Production Build

```bash
# iOS Production Build
eas build --platform ios --profile production

# Android Production Build
eas build --platform android --profile production
```

### App Store Deployment

```bash
# iOS App Store
eas submit --platform ios

# Google Play Store
eas submit --platform android
```

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Code Standards

- **TypeScript**: Strict mode 사용
- **ESLint**: 코드 품질 검사
- **Prettier**: 코드 포맷팅
- **Jest**: 단위 테스트
- **Playwright**: E2E 테스트

### Commit Convention

```
TYPE(SCOPE): description

Examples:
- FEAT(auth): add Google OAuth login
- FIX(streaming): resolve WebRTC connection issues
- REFACTOR(api): improve error handling
- DOCS(readme): update installation guide
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Wiki](https://github.com/your-org/mimo-camera/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-org/mimo-camera/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/mimo-camera/discussions)
- **Email**: support@mimo-camera.com

## 🙏 Acknowledgments

- [Expo](https://expo.dev/) - React Native development platform
- [WebRTC](https://webrtc.org/) - Real-time communication
- [React Native](https://reactnative.dev/) - Mobile app framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety

---

**Made with ❤️ by the MIMO Camera Team** 