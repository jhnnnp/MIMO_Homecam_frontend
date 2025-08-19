import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import queryClient from './src/utils/queryClient';
import { useAuthStore } from './src/stores/authStore';
import AppNavigator from './src/navigation/AppNavigator';
import { LoadingState } from './src/components';

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const { isLoading, initializeAuth } = useAuthStore();

  // 앱 초기화
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('🚀 Starting MIMO app initialization...');
        await initializeAuth();
        console.log('✅ MIMO app initialization completed');
      } catch (error) {
        console.log('⚠️ MIMO app initialization failed (backend not available):', error);
        // 백엔드가 없어도 앱은 실행되어야 함
      } finally {
        setIsInitialized(true);
        console.log('🏁 MIMO app is ready');
      }
    };

    // 약간의 지연 후 초기화 (UI 렌더링 완료 대기)
    const timer = setTimeout(initialize, 100);

    return () => clearTimeout(timer);
  }, []);

  // 초기화 중이면 로딩 화면 표시
  if (!isInitialized || isLoading) {
    return (
      <SafeAreaProvider>
        <LoadingState
          message="MIMO를 시작하는 중..."
          overlay
        />
        <StatusBar style="dark" />
      </SafeAreaProvider>
    );
  }

  console.log('🎯 Main App render - isInitialized:', isInitialized, 'isLoading:', isLoading);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AppNavigator />

        {/* Toast 알림 */}
        <Toast />

        {/* 상태바 설정 */}
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}


