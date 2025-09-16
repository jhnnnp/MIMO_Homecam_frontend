import { QueryClient } from '@tanstack/react-query';

// React Query 클라이언트 설정
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // 캐시 시간 설정
            gcTime: 1000 * 60 * 60 * 24, // 24시간
            staleTime: 1000 * 60 * 5, // 5분

            // 네트워크 재연결 시 자동 refetch
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,

            // 에러 재시도 설정
            retry: (failureCount, error: any) => {
                // 인증 에러나 404는 재시도하지 않음
                if (error?.response?.status === 401 || error?.response?.status === 404) {
                    return false;
                }
                // 최대 3번까지 재시도
                return failureCount < 3;
            },

            // 재시도 지연 시간 (지수 백오프)
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        },
        mutations: {
            // 뮤테이션 에러 재시도 설정
            retry: false,
        },
    },
});

export default queryClient; 