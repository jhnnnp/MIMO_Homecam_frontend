import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ApiResponse } from '../types/api';
import { Platform } from 'react-native';

// 동적 IP 감지 함수
const getLocalIPAddress = async (): Promise<string> => {
    try {
        // Expo Go에서 실행 중인 경우 자동으로 감지된 IP 사용
        if (__DEV__) {
            // 개발 환경에서는 실제 네트워크 IP 사용
            // 현재 감지된 IP: 192.168.123.105
            return '192.168.123.105';
        }
        return 'localhost';
    } catch (error) {
        console.warn('IP 감지 실패, 기본 IP 사용:', error);
        return '192.168.123.105'; // 기본값으로 실제 IP 사용
    }
};

// 환경별 API URL 설정
const getApiBaseUrl = async (): Promise<string> => {
    // 환경 변수로 우선 설정
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }

    // 환경별 기본값
    if (__DEV__) {
        // 개발 환경: 동적으로 IP 감지
        const localIP = await getLocalIPAddress();
        return `http://${localIP}:4001/api`;
    }

    // 스테이징 환경
    if (process.env.EXPO_PUBLIC_ENV === 'staging') {
        return 'https://staging-api.mimo-camera.com/api';
    }

    // 프로덕션 환경 (기본값)
    return 'https://api.mimo-camera.com/api';
};

// 동적 API URL을 위한 클래스
class DynamicApiService {
    private client: AxiosInstance | null = null;
    private baseURL: string = '';

    constructor() {
        this.initializeClient();
    }

    private async initializeClient() {
        this.baseURL = await getApiBaseUrl();
        console.log('🌐 API URL 설정:', this.baseURL);

        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.setupInterceptors();
    }

    private setupInterceptors() {
        if (!this.client) return;

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
                            return this.client!(originalRequest);
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

    // 클라이언트가 준비될 때까지 대기
    private async ensureClient(): Promise<AxiosInstance> {
        if (!this.client) {
            await this.initializeClient();
        }
        return this.client!;
    }

    // 토큰 관리
    async getAccessToken(): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync('access_token');
        } catch (error) {
            console.error('Failed to get access token:', error);
            return null;
        }
    }

    async getRefreshToken(): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync('refresh_token');
        } catch (error) {
            console.error('Failed to get refresh token:', error);
            return null;
        }
    }

    async setTokens(accessToken: string, refreshToken: string): Promise<void> {
        try {
            await SecureStore.setItemAsync('access_token', accessToken);
            await SecureStore.setItemAsync('refresh_token', refreshToken);
        } catch (error) {
            console.error('Failed to store tokens:', error);
        }
    }

    async clearTokens(): Promise<void> {
        try {
            await SecureStore.deleteItemAsync('access_token');
            await SecureStore.deleteItemAsync('refresh_token');
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

            const client = await this.ensureClient();
            const response = await client.post('/auth/refresh', {
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
            const client = await this.ensureClient();
            const response: AxiosResponse<ApiResponse<T>> = await client.get(url, config);
            return response.data;
        } catch (error) {
            return this.handleError(error);
        }
    }

    async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        try {
            const client = await this.ensureClient();
            const response: AxiosResponse<ApiResponse<T>> = await client.post(url, data, config);
            return response.data;
        } catch (error) {
            return this.handleError(error);
        }
    }

    async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        try {
            const client = await this.ensureClient();
            const response: AxiosResponse<ApiResponse<T>> = await client.put(url, data, config);
            return response.data;
        } catch (error) {
            return this.handleError(error);
        }
    }

    async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        try {
            const client = await this.ensureClient();
            const response: AxiosResponse<ApiResponse<T>> = await client.delete(url, config);
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
            const client = await this.ensureClient();
            const response: AxiosResponse<ApiResponse<T>> = await client.post(url, file, {
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
export const apiService = new DynamicApiService();
export default apiService; 