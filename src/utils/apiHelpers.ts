import { APIError, NetworkError, AuthError, ValidationError, withTimeout, withRetry, logError } from './errorHandling';

// API 응답 타입 정의
export interface APIResponse<T = any> {
    ok: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}

// API 요청 옵션
export interface APIRequestOptions extends RequestInit {
    timeout?: number;
    retries?: number;
    retryDelay?: number;
    context?: string;
}

// 기본 API 요청 헬퍼
export const makeAPIRequest = async <T = any>(
    url: string,
    options: APIRequestOptions = {}
): Promise<APIResponse<T>> => {
    const {
        timeout = 15000,
        retries = 3,
        retryDelay = 1000,
        context = 'API Request',
        ...fetchOptions
    } = options;

    const requestFn = async (): Promise<APIResponse<T>> => {
        const controller = new AbortController();

        try {
            const response = await withTimeout(
                fetch(url, {
                    ...fetchOptions,
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        ...fetchOptions.headers,
                    },
                }),
                timeout,
                context
            );

            // 응답 상태 체크
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                // 인증 에러 처리
                if (response.status === 401) {
                    throw new AuthError(errorData.message || '인증이 만료되었습니다.');
                }

                // 네트워크 에러 처리
                if (response.status >= 500) {
                    throw new NetworkError('서버 오류가 발생했습니다.');
                }

                throw new APIError(
                    errorData.message || `HTTP Error: ${response.status}`,
                    response.status,
                    errorData.code,
                    context
                );
            }

            const data = await response.json();
            return { ok: true, data };
        } catch (error) {
            // AbortController 에러 처리
            if (error instanceof Error && error.name === 'AbortError') {
                throw new NetworkError('요청 시간이 초과되었습니다.');
            }

            throw error;
        }
    };

    return withRetry(requestFn, retries, retryDelay, context);
};

// 인증 토큰이 포함된 API 요청
export async function makeAuthenticatedRequest<T = any>(
    url: string,
    getAccessToken: () => string | null,
    options: APIRequestOptions = {}
): Promise<T> {
    const { context = 'API Request', ...requestOptions } = options;

    // 토큰 획득
    const token = getAccessToken();
    console.log('🔑 [API Debug] Token check:', {
        hasToken: !!token,
        tokenLength: token?.length,
        tokenPrefix: token?.substring(0, 20) + '...',
        url,
        context
    });

    if (!token) {
        console.error('❌ [API Debug] No access token available');
        throw new APIError('인증이 필요합니다.', 401);
    }

    // 헤더 설정
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...requestOptions.headers,
    };

    console.log('📤 [API Debug] Request headers:', {
        'Content-Type': headers['Content-Type'],
        'Authorization': `Bearer ${token.substring(0, 20)}...`,
        url
    });

    const requestConfig = {
        ...requestOptions,
        headers,
    };

    return makeAPIRequest<T>(url, requestConfig, context);
}

// 파일 업로드용 API 요청
export const makeFileUploadRequest = async <T = any>(
    url: string,
    file: File | Blob,
    fieldName: string = 'file',
    options: APIRequestOptions = {}
): Promise<APIResponse<T>> => {
    const formData = new FormData();
    formData.append(fieldName, file);

    return makeAPIRequest<T>(url, {
        ...options,
        method: 'POST',
        headers: {
            // Content-Type은 자동으로 설정됨
            ...options.headers,
        },
        body: formData,
    });
};

// 스트리밍 API 요청 (EventSource 대체)
export const makeStreamingRequest = async <T = any>(
    url: string,
    onData: (data: T) => void,
    onError: (error: Error) => void,
    options: APIRequestOptions = {}
): Promise<() => void> => {
    const controller = new AbortController();

    const requestFn = async () => {
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Accept': 'text/event-stream',
                    ...options.headers,
                },
            });

            if (!response.ok) {
                throw new APIError(`Streaming Error: ${response.status}`, response.status);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new NetworkError('스트림을 읽을 수 없습니다.');
            }

            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            onData(data);
                        } catch (parseError) {
                            logError(parseError, 'Streaming Parse');
                        }
                    }
                }
            }
        } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') {
                onError(error);
            }
        }
    };

    requestFn();

    // 클린업 함수 반환
    return () => {
        controller.abort();
    };
};

// API 응답 검증
export const validateAPIResponse = <T>(
    response: APIResponse<T>,
    schema?: (data: any) => data is T
): T => {
    if (!response.ok) {
        throw new APIError(
            response.error?.message || 'API 응답 오류',
            undefined,
            response.error?.code
        );
    }

    if (!response.data) {
        throw new APIError('API 응답에 데이터가 없습니다.');
    }

    if (schema && !schema(response.data)) {
        throw new ValidationError('API 응답 데이터 형식이 올바르지 않습니다.');
    }

    return response.data;
};

// Mock 데이터 생성 헬퍼
export const createMockResponse = <T>(data: T): APIResponse<T> => ({
    ok: true,
    data,
});

export const createMockError = (message: string, code?: string): APIResponse => ({
    ok: false,
    error: {
        code: code || 'MOCK_ERROR',
        message,
    },
}); 