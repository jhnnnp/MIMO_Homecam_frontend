import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/navigation/AppNavigator';
import { networkUtils } from './src/utils/networkUtils';
import { notificationService } from './src/services/notificationService';
import { recordingService } from './src/services/recordingService';
import { webrtcService } from './src/services/webrtcService';
import { useAuthStore } from './src/stores/authStore';
import { initializeConfig, default as configService } from './src/config';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5분
    },
  },
});

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    try {
      console.log('🚀 MIMO 앱 초기화 시작...');

      // 1. 네트워크 자동 디스커버리 초기화
      await initializeConfig();
      console.log('✅ 네트워크 자동 디스커버리 완료');

      // 2. 네트워크 환경 변수 설정 (기존 방식도 유지)
      await networkUtils.updateEnvironmentVariables();
      console.log('✅ 네트워크 설정 완료');

      // 확인용 현재 URL 로그
      console.log('🌐 API Base URL:', configService.getApiBaseUrl());
      console.log('🔌 WS Base URL:', configService.getWsBaseUrl());

      // 3. 인증 초기화
      await initializeAuth();
      console.log('✅ 인증 초기화 완료');

      // 4. 알림 서비스 초기화
      await notificationService.setupNotificationCategories();
      console.log('✅ 알림 서비스 초기화 완료');

      // 5. WebRTC 서비스 초기화
      // (카메라 참조는 각 화면에서 설정)
      console.log('✅ WebRTC 서비스 준비 완료');

      // 6. 녹화 서비스 초기화
      // (카메라 참조는 각 화면에서 설정)
      console.log('✅ 녹화 서비스 준비 완료');

      setIsInitialized(true);
      console.log('🎉 MIMO 앱 초기화 완료!');
    } catch (error) {
      console.error('❌ 앱 초기화 실패:', error);
      setIsInitialized(true); // 에러가 있어도 앱은 실행
    }
  };

  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>앱을 초기화하는 중입니다...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="auto" />
        <AppNavigator />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0', // 배경색
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
});


