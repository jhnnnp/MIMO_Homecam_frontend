import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ApiResponse } from '../types/api';

// 환경 설정 (백엔드 README에 따라 포트 4001 사용)
const API_BASE_URL = __DEV__
    ? 'http://localhost:4001/api'  // 개발 환경
    : 'https://api.mimo-camera.com/api'; // 프로덕션 환경

// 토큰 저장 키
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

class ApiService {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: API_BASE_URL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.setupInterceptors();
    }

    private setupInterceptors() {
        // 요청 인터셉터 - 토큰 자동 첨부
        this.client.interceptors.request.use(
            async (config) => {
                const token = await this.getAccessToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // 응답 인터셉터 - 토큰 만료 시 자동 갱신
        this.client.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;

                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;

                    try {
                        const newToken = await this.refreshAccessToken();
                        if (newToken) {
                            originalRequest.headers.Authorization = `Bearer ${newToken}`;
                            return this.client(originalRequest);
                        }
                    } catch (refreshError) {
                        // 리프레시 토큰도 만료된 경우 로그아웃 처리
                        await this.clearTokens();
                        // 로그인 화면으로 리다이렉트 (상태 관리에서 처리)
                    }
                }

                return Promise.reject(error);
            }
        );
    }

    // 토큰 관리
    async getAccessToken(): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        } catch (error) {
            console.error('Failed to get access token:', error);
            return null;
        }
    }

    async getRefreshToken(): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        } catch (error) {
            console.error('Failed to get refresh token:', error);
            return null;
        }
    }

    async setTokens(accessToken: string, refreshToken: string): Promise<void> {
        try {
            await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
            await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
        } catch (error) {
            console.error('Failed to store tokens:', error);
        }
    }

    async clearTokens(): Promise<void> {
        try {
            await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
            await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        } catch (error) {
            console.error('Failed to clear tokens:', error);
        }
    }

    async refreshAccessToken(): Promise<string | null> {
        try {
            const refreshToken = await this.getRefreshToken();
            if (!refreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                refreshToken,
            });

            if (response.data.ok && response.data.data.accessToken) {
                const { accessToken, refreshToken: newRefreshToken } = response.data.data;
                await this.setTokens(accessToken, newRefreshToken);
                return accessToken;
            }

            throw new Error('Failed to refresh token');
        } catch (error) {
            console.error('Token refresh failed:', error);
            return null;
        }
    }

    // HTTP 메서드 래퍼
    async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        try {
            const response: AxiosResponse<ApiResponse<T>> = await this.client.get(url, config);
            return response.data;
        } catch (error) {
            return this.handleError(error);
        }
    }

    async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        try {
            const response: AxiosResponse<ApiResponse<T>> = await this.client.post(url, data, config);
            return response.data;
        } catch (error) {
            return this.handleError(error);
        }
    }

    async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        try {
            const response: AxiosResponse<ApiResponse<T>> = await this.client.put(url, data, config);
            return response.data;
        } catch (error) {
            return this.handleError(error);
        }
    }

    async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        try {
            const response: AxiosResponse<ApiResponse<T>> = await this.client.delete(url, config);
            return response.data;
        } catch (error) {
            return this.handleError(error);
        }
    }

    private handleError(error: any): ApiResponse {
        if (error.response?.data) {
            return error.response.data;
        }

        // 네트워크 오류 등의 경우
        return {
            ok: false,
            error: {
                code: 'NETWORK_ERROR',
                message: error.message || '네트워크 오류가 발생했어요. 연결을 확인해 주세요.',
            },
        };
    }

    // 파일 업로드를 위한 멀티파트 폼 데이터 전송
    async uploadFile<T>(
        url: string,
        file: FormData,
        onUploadProgress?: (progressEvent: any) => void
    ): Promise<ApiResponse<T>> {
        try {
            const response: AxiosResponse<ApiResponse<T>> = await this.client.post(url, file, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress,
            });
            return response.data;
        } catch (error) {
            return this.handleError(error);
        }
    }

    // 인증 상태 확인
    async isAuthenticated(): Promise<boolean> {
        const token = await this.getAccessToken();
        return !!token;
    }
}

// 싱글톤 인스턴스 생성
export const apiService = new ApiService();
export default apiService; 