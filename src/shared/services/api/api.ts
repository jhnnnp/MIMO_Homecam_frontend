import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ApiResponse } from '@/shared/types/api';
import { getApiBaseUrl } from '@/app/config';
import { logger, createLogger } from '@/shared/utils/logger';
import {
    errorHandler,
    withRetry,
    createNetworkError,
    createAuthError,
    createTimeoutError,
    ErrorType
} from '@/shared/utils/errorHandler';

// API 서비스 로거
const apiLogger = createLogger('ApiService');

// 토큰 관리 인터페이스
interface TokenManager {
    getAccessToken(): Promise<string | null>;
    getRefreshToken(): Promise<string | null>;
    setTokens(accessToken: string, refreshToken: string): Promise<void>;
    clearTokens(): Promise<void>;
    refreshAccessToken(): Promise<string | null>;
}

// 보안 토큰 관리자
class SecureTokenManager implements TokenManager {
    private readonly accessTokenKey: string;
    private readonly refreshTokenKey: string;

    constructor() {
        this.accessTokenKey = 'mimo_access_token';
        this.refreshTokenKey = 'mimo_refresh_token';
    }

    async getAccessToken(): Promise<string | null> {
        try {
            const token = await SecureStore.getItemAsync(this.accessTokenKey);
            if (token) {
                apiLogger.debug('Access token retrieved');
            }
            return token;
        } catch (error) {
            apiLogger.error('Failed to get access token', error as Error);
            return null;
        }
    }

    async getRefreshToken(): Promise<string | null> {
        try {
            const token = await SecureStore.getItemAsync(this.refreshTokenKey);
            if (token) {
                apiLogger.debug('Refresh token retrieved');
            }
            return token;
        } catch (error) {
            apiLogger.error('Failed to get refresh token', error as Error);
            return null;
        }
    }

    async setTokens(accessToken: string, refreshToken: string): Promise<void> {
        try {
            await Promise.all([
                SecureStore.setItemAsync(this.accessTokenKey, accessToken),
                SecureStore.setItemAsync(this.refreshTokenKey, refreshToken)
            ]);
            apiLogger.info('Tokens stored successfully');
        } catch (error) {
            apiLogger.error('Failed to store tokens', error as Error);
            throw createAuthError('토큰 저장에 실패했습니다.', 'TOKEN_STORE_ERROR');
        }
    }

    async clearTokens(): Promise<void> {
        try {
            await Promise.all([
                SecureStore.deleteItemAsync(this.accessTokenKey),
                SecureStore.deleteItemAsync(this.refreshTokenKey)
            ]);
            apiLogger.info('Tokens cleared successfully');
        } catch (error) {
            apiLogger.error('Failed to clear tokens', error as Error);
        }
    }

    async refreshAccessToken(): Promise<string | null> {
        try {
            const refreshToken = await this.getRefreshToken();
            if (!refreshToken) {
                throw createAuthError('리프레시 토큰이 없습니다.', 'NO_REFRESH_TOKEN');
            }

            // 토큰 갱신 API 호출
            const response = await axios.post(`${getApiBaseUrl()}/auth/refresh`, {
                refreshToken,
            }, {
                timeout: 10000,
            });

            if (response.data?.ok && response.data?.data?.accessToken) {
                const { accessToken, refreshToken: newRefreshToken } = response.data.data;

                // 기존 토큰 제거 후 새 토큰 저장 (단일 세션 보장)
                await this.clearTokens();
                await this.setTokens(accessToken, newRefreshToken);

                apiLogger.info('Token refreshed successfully');
                return accessToken;
            }

            throw createAuthError('토큰 갱신에 실패했습니다.', 'REFRESH_FAILED');
        } catch (error) {
            apiLogger.error('Token refresh failed', error as Error);
            // 토큰 갱신 실패 시 기존 토큰도 제거
            await this.clearTokens();
            return null;
        }
    }
}

// API 클라이언트 클래스
class ApiClient {
    private client: AxiosInstance;
    private tokenManager: TokenManager;
    private isRefreshing = false;
    private refreshSubscribers: Array<(token: string | null) => void> = [];

    constructor() {
        this.tokenManager = new SecureTokenManager();
        this.client = this.createAxiosInstance();
        this.setupInterceptors();
    }

    private createAxiosInstance(): AxiosInstance {
        return axios.create({
            baseURL: getApiBaseUrl(),
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    private setupInterceptors(): void {
        // 요청 인터셉터
        this.client.interceptors.request.use(
            async (config) => {
                const token = await this.tokenManager.getAccessToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }

                apiLogger.logApiRequest(config.method?.toUpperCase() || 'GET', config.url || '', config.data);
                return config;
            },
            (error) => {
                apiLogger.logApiError('Request', 'Unknown', error);
                return Promise.reject(error);
            }
        );

        // 응답 인터셉터
        this.client.interceptors.response.use(
            (response) => {
                apiLogger.logApiResponse(
                    response.config.method?.toUpperCase() || 'GET',
                    response.config.url || '',
                    response.status,
                    response.data
                );
                return response;
            },
            async (error) => {
                const originalRequest = error.config;

                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;

                    try {
                        const newToken = await this.handleTokenRefresh();
                        if (newToken) {
                            originalRequest.headers.Authorization = `Bearer ${newToken}`;
                            return this.client(originalRequest);
                        }
                    } catch (refreshError) {
                        // 리프레시 토큰도 만료된 경우 로그아웃 처리
                        await this.tokenManager.clearTokens();
                        apiLogger.logAuthEvent('Auto logout due to token refresh failure');
                    }
                }

                apiLogger.logApiError(
                    originalRequest?.method?.toUpperCase() || 'Unknown',
                    originalRequest?.url || 'Unknown',
                    error
                );

                return Promise.reject(error);
            }
        );
    }

    private async handleTokenRefresh(): Promise<string | null> {
        if (this.isRefreshing) {
            // 이미 갱신 중인 경우 대기
            return new Promise((resolve) => {
                this.refreshSubscribers.push(resolve);
            });
        }

        this.isRefreshing = true;

        try {
            const newToken = await this.tokenManager.refreshAccessToken();
            this.refreshSubscribers.forEach((callback) => callback(newToken));
            this.refreshSubscribers = [];
            return newToken;
        } catch (error) {
            this.refreshSubscribers.forEach((callback) => callback(null));
            this.refreshSubscribers = [];
            throw error;
        } finally {
            this.isRefreshing = false;
        }
    }

    // HTTP 메서드 래퍼들
    async get<T>(url: string, requestConfig?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return withRetry(async () => {
            const response: AxiosResponse<ApiResponse<T>> = await this.client.get(url, requestConfig);
            return response.data;
        }, 3, { method: 'GET', url });
    }

    async post<T>(url: string, data?: any, requestConfig?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return withRetry(async () => {
            const response: AxiosResponse<ApiResponse<T>> = await this.client.post(url, data, requestConfig);
            return response.data;
        }, 3, { method: 'POST', url, data });
    }

    async put<T>(url: string, data?: any, requestConfig?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return withRetry(async () => {
            const response: AxiosResponse<ApiResponse<T>> = await this.client.put(url, data, requestConfig);
            return response.data;
        }, 3, { method: 'PUT', url, data });
    }

    async delete<T>(url: string, requestConfig?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return withRetry(async () => {
            const response: AxiosResponse<ApiResponse<T>> = await this.client.delete(url, requestConfig);
            return response.data;
        }, 3, { method: 'DELETE', url });
    }

    // 파일 업로드
    async uploadFile<T>(
        url: string,
        file: FormData,
        onUploadProgress?: (progressEvent: any) => void
    ): Promise<ApiResponse<T>> {
        return withRetry(async () => {
            const response: AxiosResponse<ApiResponse<T>> = await this.client.post(url, file, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress,
            });
            return response.data;
        }, 3, { method: 'UPLOAD', url });
    }

    // 토큰 관리 메서드들
    async setTokens(accessToken: string, refreshToken: string): Promise<void> {
        return this.tokenManager.setTokens(accessToken, refreshToken);
    }

    async clearTokens(): Promise<void> {
        return this.tokenManager.clearTokens();
    }

    async getAccessToken(): Promise<string | null> {
        return this.tokenManager.getAccessToken();
    }

    async getRefreshToken(): Promise<string | null> {
        return this.tokenManager.getRefreshToken();
    }

    // 인증 상태 확인
    async isAuthenticated(): Promise<boolean> {
        const token = await this.tokenManager.getAccessToken();
        return !!token;
    }

    // 클라이언트 인스턴스 접근 (고급 사용자용)
    getClient(): AxiosInstance {
        return this.client;
    }
}

// 싱글톤 API 클라이언트 인스턴스
const apiService = new ApiClient();

// 타입 안전성을 위한 래퍼 함수들
export const api = {
    get: <T>(url: string, requestConfig?: AxiosRequestConfig) => apiService.get<T>(url, requestConfig),
    post: <T>(url: string, data?: any, requestConfig?: AxiosRequestConfig) => apiService.post<T>(url, data, requestConfig),
    put: <T>(url: string, data?: any, requestConfig?: AxiosRequestConfig) => apiService.put<T>(url, data, requestConfig),
    delete: <T>(url: string, requestConfig?: AxiosRequestConfig) => apiService.delete<T>(url, requestConfig),
    uploadFile: <T>(url: string, file: FormData, onUploadProgress?: (progressEvent: any) => void) =>
        apiService.uploadFile<T>(url, file, onUploadProgress),
    setTokens: (accessToken: string, refreshToken: string) => apiService.setTokens(accessToken, refreshToken),
    clearTokens: () => apiService.clearTokens(),
    getAccessToken: () => apiService.getAccessToken(),
    getRefreshToken: () => apiService.getRefreshToken(),
    isAuthenticated: () => apiService.isAuthenticated(),
};

// default export도 제공 (양쪽 import와 호환)
export default api; 