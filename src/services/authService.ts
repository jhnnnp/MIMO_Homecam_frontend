import apiService from './api';
import {
    LoginRequest,
    RegisterRequest,
    AuthResponse,
    User,
    EmailVerificationRequest,
    EmailVerificationConfirmRequest,
    EmailVerificationStatus,
    ApiResponse,
} from '../types/api';

class AuthService {
    // 로그인
    async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
        const response = await apiService.post<AuthResponse>('/auth/login', credentials);

        if (response.ok && response.data) {
            // 토큰 저장
            await apiService.setTokens(
                response.data.accessToken,
                response.data.refreshToken
            );
        }

        return response;
    }

    // 회원가입
    async register(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
        const response = await apiService.post<AuthResponse>('/auth/signup', userData);

        if (response.ok && response.data) {
            // 토큰 저장
            await apiService.setTokens(
                response.data.accessToken,
                response.data.refreshToken
            );
        }

        return response;
    }

    // Google OAuth 로그인
    async googleLogin(googleToken: string): Promise<ApiResponse<AuthResponse>> {
        const response = await apiService.post<AuthResponse>('/auth/google', {
            token: googleToken,
        });

        if (response.ok && response.data) {
            // 토큰 저장
            await apiService.setTokens(
                response.data.accessToken,
                response.data.refreshToken
            );
        }

        return response;
    }

    // 로그아웃
    async logout(): Promise<ApiResponse<void>> {
        const response = await apiService.post<void>('/auth/logout');

        // 로컬 토큰 제거
        await apiService.clearTokens();

        return response;
    }

    // 토큰 갱신
    async refreshToken(): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
        const refreshToken = await apiService.getRefreshToken();

        if (!refreshToken) {
            return {
                ok: false,
                error: {
                    code: 'NO_REFRESH_TOKEN',
                    message: '리프레시 토큰이 없습니다.',
                },
            };
        }

        const response = await apiService.post<{ accessToken: string; refreshToken: string }>(
            '/auth/refresh',
            { refreshToken }
        );

        if (response.ok && response.data) {
            // 새로운 토큰 저장
            await apiService.setTokens(
                response.data.accessToken,
                response.data.refreshToken
            );
        }

        return response;
    }

    // 현재 사용자 정보 조회
    async getCurrentUser(): Promise<ApiResponse<User>> {
        return await apiService.get<User>('/profile');
    }

    // 비밀번호 재설정 요청
    async requestPasswordReset(email: string): Promise<ApiResponse<void>> {
        return await apiService.post<void>('/auth/forgot-password', { email });
    }

    // 비밀번호 재설정
    async resetPassword(
        token: string,
        newPassword: string
    ): Promise<ApiResponse<void>> {
        return await apiService.post<void>('/auth/reset-password', {
            token,
            password: newPassword,
        });
    }

    // 이메일 인증 코드 요청
    async requestEmailVerification(
        request: EmailVerificationRequest
    ): Promise<ApiResponse<void>> {
        return await apiService.post<void>('/profile/email-verification', request);
    }

    // 이메일 인증 코드 확인
    async confirmEmailVerification(
        request: EmailVerificationConfirmRequest
    ): Promise<ApiResponse<void>> {
        return await apiService.post<void>('/profile/verify-email', request);
    }

    // 이메일 인증 상태 확인
    async getEmailVerificationStatus(): Promise<ApiResponse<EmailVerificationStatus>> {
        return await apiService.get<EmailVerificationStatus>('/profile/email-verification-status');
    }

    // 프로필 업데이트
    async updateProfile(updates: Partial<User>): Promise<ApiResponse<User>> {
        return await apiService.put<User>('/profile', updates);
    }

    // 비밀번호 변경
    async changePassword(
        currentPassword: string,
        newPassword: string
    ): Promise<ApiResponse<void>> {
        return await apiService.post<void>('/auth/change-password', {
            currentPassword,
            newPassword,
        });
    }

    // 인증 상태 확인
    async isAuthenticated(): Promise<boolean> {
        return await apiService.isAuthenticated();
    }

    // 계정 삭제
    async deleteAccount(password: string): Promise<ApiResponse<void>> {
        return await apiService.post<void>('/auth/delete-account', { password });
    }
}

export const authService = new AuthService();
export default authService; 