import api from '@/shared/services/api/api';
import {
    LoginRequest,
    RegisterRequest,
    AuthResponse,
    User,
    EmailVerificationRequest,
    EmailVerificationConfirmRequest,
    EmailVerificationStatus,
    ApiResponse,
} from '@/features/../shared/types/api';
import { createLogger } from '@/shared/utils/logger';
import {
    withErrorHandling,
    createAuthError,
    createValidationError,
    ErrorType
} from '../../../shared/utils/errorHandler';
import config from '@/app/config';

// 인증 서비스 로거
const authLogger = createLogger('AuthService');

// 인증 상태 인터페이스
export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    isLoading: boolean;
    lastActivity: Date;
}

// 인증 이벤트 타입
export type AuthEvent =
    | 'login_success'
    | 'login_failed'
    | 'logout_success'
    | 'logout_failed'
    | 'token_refresh_success'
    | 'token_refresh_failed'
    | 'registration_success'
    | 'registration_failed';

// 인증 이벤트 리스너
export type AuthEventListener = (event: AuthEvent, data?: any) => void;

class AuthService {
    private authState: AuthState = {
        isAuthenticated: false,
        user: null,
        isLoading: false,
        lastActivity: new Date(),
    };

    private eventListeners: AuthEventListener[] = [];

    // 이벤트 리스너 등록
    addEventListener(listener: AuthEventListener): void {
        this.eventListeners.push(listener);
    }

    // 이벤트 리스너 제거
    removeEventListener(listener: AuthEventListener): void {
        this.eventListeners = this.eventListeners.filter(l => l !== listener);
    }

    // 이벤트 발생
    private emitEvent(event: AuthEvent, data?: any): void {
        authLogger.info(`Auth event: ${event}`, { data });
        this.eventListeners.forEach(listener => listener(event, data));
    }

    // 로그인
    async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
        return withErrorHandling(async () => {
            authLogger.logUserAction('Login attempt', { email: credentials.email });

            // 입력 검증
            this.validateLoginCredentials(credentials);

            const response = await api.post<AuthResponse>('/auth/login', credentials);

            if (response.ok && response.data) {
                // 토큰 저장
                await api.setTokens(
                    response.data.accessToken,
                    response.data.refreshToken
                );

                // 인증 상태 업데이트 (백엔드에서 user 객체를 반환하지 않으므로 null로 설정)
                this.authState = {
                    isAuthenticated: true,
                    user: null, // 백엔드에서 user 객체를 반환하지 않음
                    isLoading: false,
                    lastActivity: new Date(),
                };

                authLogger.logAuthEvent('Login successful', { email: credentials.email });
                this.emitEvent('login_success', response.data);
            } else {
                authLogger.logAuthEvent('Login failed', { email: credentials.email });
                this.emitEvent('login_failed', response.error);
            }

            return response;
        }, { operation: 'login', credentials: { email: credentials.email } });
    }

    // 회원가입
    async register(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
        return withErrorHandling(async () => {
            authLogger.logUserAction('Registration attempt', { email: userData.email });

            // 입력 검증
            this.validateRegistrationData(userData);

            const response = await api.post<AuthResponse>('/auth/signup', userData);

            if (response.ok && response.data) {
                // 토큰 저장
                await api.setTokens(
                    response.data.accessToken,
                    response.data.refreshToken
                );

                // 인증 상태 업데이트 (백엔드에서 user 객체를 반환하지 않으므로 null로 설정)
                this.authState = {
                    isAuthenticated: true,
                    user: null, // 백엔드에서 user 객체를 반환하지 않음
                    isLoading: false,
                    lastActivity: new Date(),
                };

                authLogger.logAuthEvent('Registration successful', { email: userData.email });
                this.emitEvent('registration_success', response.data);
            } else {
                authLogger.logAuthEvent('Registration failed', { email: userData.email });
                this.emitEvent('registration_failed', response.error);
            }

            return response;
        }, { operation: 'register', userData: { email: userData.email } });
    }

    // Google OAuth 로그인
    async googleLogin(googleToken: string): Promise<ApiResponse<AuthResponse>> {
        return withErrorHandling(async () => {
            authLogger.logUserAction('Google OAuth login attempt');

            if (!googleToken) {
                throw createValidationError('Google 토큰이 필요합니다.', 'MISSING_GOOGLE_TOKEN');
            }

            const response = await api.post<AuthResponse>('/auth/google', {
                token: googleToken,
            });

            if (response.ok && response.data) {
                // 토큰 저장
                await api.setTokens(
                    response.data.accessToken,
                    response.data.refreshToken
                );

                // 인증 상태 업데이트 (백엔드에서 user 객체를 반환하지 않으므로 null로 설정)
                this.authState = {
                    isAuthenticated: true,
                    user: null, // 백엔드에서 user 객체를 반환하지 않음
                    isLoading: false,
                    lastActivity: new Date(),
                };

                authLogger.logAuthEvent('Google OAuth login successful', { googleToken: googleToken.substring(0, 10) + '...' });
                this.emitEvent('login_success', response.data);
            } else {
                authLogger.logAuthEvent('Google OAuth login failed');
                this.emitEvent('login_failed', response.error);
            }

            return response;
        }, { operation: 'google_login' });
    }

    // 로그아웃
    async logout(): Promise<ApiResponse<void>> {
        return withErrorHandling(async () => {
            authLogger.logUserAction('Logout attempt');

            try {
                // 서버에 로그아웃 요청
                const response = await api.post<void>('/auth/logout');

                // 로컬 토큰 제거
                await api.clearTokens();

                // 인증 상태 초기화
                this.authState = {
                    isAuthenticated: false,
                    user: null,
                    isLoading: false,
                    lastActivity: new Date(),
                };

                authLogger.logAuthEvent('Logout successful');
                this.emitEvent('logout_success');

                return response;
            } catch (error) {
                // 서버 요청 실패해도 로컬 토큰은 제거
                await api.clearTokens();
                this.authState = {
                    isAuthenticated: false,
                    user: null,
                    isLoading: false,
                    lastActivity: new Date(),
                };

                authLogger.logAuthEvent('Logout completed (server request failed)');
                this.emitEvent('logout_success');

                return {
                    ok: true,
                    data: undefined,
                };
            }
        }, { operation: 'logout' });
    }

    // 토큰 갱신
    async refreshToken(): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
        return withErrorHandling(async () => {
            authLogger.logUserAction('Token refresh attempt');

            const refreshToken = await api.getRefreshToken();

            if (!refreshToken) {
                throw createAuthError('리프레시 토큰이 없습니다.', 'NO_REFRESH_TOKEN');
            }

            const response = await api.post<{ accessToken: string; refreshToken: string }>(
                '/auth/refresh',
                { refreshToken }
            );

            if (response.ok && response.data) {
                // 새로운 토큰 저장
                await api.setTokens(
                    response.data.accessToken,
                    response.data.refreshToken
                );

                authLogger.logAuthEvent('Token refresh successful');
                this.emitEvent('token_refresh_success', response.data);
            } else {
                authLogger.logAuthEvent('Token refresh failed');
                this.emitEvent('token_refresh_failed', response.error);
            }

            return response;
        }, { operation: 'token_refresh' });
    }

    // 현재 사용자 정보 조회
    async getCurrentUser(): Promise<ApiResponse<User>> {
        return withErrorHandling(async () => {
            authLogger.logUserAction('Get current user');

            const response = await api.get<User>('/profile');

            if (response.ok && response.data) {
                // 인증 상태 업데이트
                this.authState.user = response.data;
                this.authState.lastActivity = new Date();
            }

            return response;
        }, { operation: 'get_current_user' });
    }

    // 비밀번호 재설정 요청
    async requestPasswordReset(email: string): Promise<ApiResponse<void>> {
        return withErrorHandling(async () => {
            authLogger.logUserAction('Password reset request', { email });

            if (!this.validateEmail(email)) {
                throw createValidationError('유효한 이메일 주소를 입력해주세요.', 'INVALID_EMAIL');
            }

            const response = await api.post<void>('/auth/forgot-password', { email });
            return response;
        }, { operation: 'password_reset_request', email });
    }

    // 비밀번호 재설정
    async resetPassword(token: string, newPassword: string): Promise<ApiResponse<void>> {
        return withErrorHandling(async () => {
            authLogger.logUserAction('Password reset');

            if (!this.validatePassword(newPassword)) {
                throw createValidationError('비밀번호는 8자 이상이어야 합니다.', 'INVALID_PASSWORD');
            }

            const response = await api.post<void>('/auth/reset-password', {
                token,
                password: newPassword,
            });
            return response;
        }, { operation: 'password_reset' });
    }

    // 이메일 인증 코드 요청
    async requestEmailVerification(request: EmailVerificationRequest): Promise<ApiResponse<void>> {
        return withErrorHandling(async () => {
            authLogger.logUserAction('Email verification request', { email: request.email });

            if (!this.validateEmail(request.email)) {
                throw createValidationError('유효한 이메일 주소를 입력해주세요.', 'INVALID_EMAIL');
            }

            const response = await api.post<void>('/profile/email-verification', request);
            return response;
        }, { operation: 'email_verification_request', email: request.email });
    }

    // 이메일 인증 코드 확인
    async confirmEmailVerification(request: EmailVerificationConfirmRequest): Promise<ApiResponse<void>> {
        return withErrorHandling(async () => {
            authLogger.logUserAction('Email verification confirm', { email: request.email });

            if (!this.validateEmail(request.email)) {
                throw createValidationError('유효한 이메일 주소를 입력해주세요.', 'INVALID_EMAIL');
            }

            if (!request.verificationCode || request.verificationCode.length !== 6) {
                throw createValidationError('6자리 인증 코드를 입력해주세요.', 'INVALID_VERIFICATION_CODE');
            }

            const response = await api.post<void>('/profile/verify-email', request);
            return response;
        }, { operation: 'email_verification_confirm', email: request.email });
    }

    // 이메일 인증 상태 확인
    async getEmailVerificationStatus(): Promise<ApiResponse<EmailVerificationStatus>> {
        return withErrorHandling(async () => {
            authLogger.logUserAction('Get email verification status');

            const response = await api.get<EmailVerificationStatus>('/profile/email-verification-status');
            return response;
        }, { operation: 'get_email_verification_status' });
    }

    // 프로필 업데이트
    async updateProfile(updates: Partial<User>): Promise<ApiResponse<User>> {
        return withErrorHandling(async () => {
            authLogger.logUserAction('Profile update', { updates });

            // 업데이트 데이터 검증
            this.validateProfileUpdates(updates);

            const response = await api.put<User>('/profile', updates);

            if (response.ok && response.data) {
                // 인증 상태 업데이트
                this.authState.user = response.data;
                this.authState.lastActivity = new Date();
            }

            return response;
        }, { operation: 'profile_update', updates });
    }

    // 비밀번호 변경
    async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
        return withErrorHandling(async () => {
            authLogger.logUserAction('Password change');

            if (!this.validatePassword(newPassword)) {
                throw createValidationError('새 비밀번호는 8자 이상이어야 합니다.', 'INVALID_PASSWORD');
            }

            if (currentPassword === newPassword) {
                throw createValidationError('새 비밀번호는 현재 비밀번호와 달라야 합니다.', 'SAME_PASSWORD');
            }

            const response = await api.post<void>('/auth/change-password', {
                currentPassword,
                newPassword,
            });
            return response;
        }, { operation: 'password_change' });
    }

    // 인증 상태 확인
    async isAuthenticated(): Promise<boolean> {
        const token = await api.getAccessToken();
        const authenticated = !!token;

        this.authState.isAuthenticated = authenticated;
        this.authState.lastActivity = new Date();

        return authenticated;
    }

    // 액세스 토큰 가져오기
    async getAccessToken(): Promise<string | null> {
        return await api.getAccessToken();
    }

    // 리프레시 토큰 가져오기
    async getRefreshToken(): Promise<string | null> {
        return await api.getRefreshToken();
    }

    // 계정 삭제
    async deleteAccount(password: string): Promise<ApiResponse<void>> {
        return withErrorHandling(async () => {
            authLogger.logUserAction('Account deletion');

            if (!password) {
                throw createValidationError('비밀번호를 입력해주세요.', 'MISSING_PASSWORD');
            }

            const response = await api.post<void>('/auth/delete-account', { password });

            if (response.ok) {
                // 계정 삭제 성공 시 로그아웃 처리
                await this.logout();
            }

            return response;
        }, { operation: 'account_deletion' });
    }

    // 현재 인증 상태 조회
    getAuthState(): AuthState {
        return { ...this.authState };
    }

    // 사용자 정보 조회
    getCurrentUserData(): User | null {
        return this.authState.user;
    }

    // 입력 검증 메서드들
    private validateLoginCredentials(credentials: LoginRequest): void {
        if (!credentials.email || !this.validateEmail(credentials.email)) {
            throw createValidationError('유효한 이메일 주소를 입력해주세요.', 'INVALID_EMAIL');
        }

        if (!credentials.password || credentials.password.length < 1) {
            throw createValidationError('비밀번호를 입력해주세요.', 'MISSING_PASSWORD');
        }
    }

    private validateRegistrationData(userData: RegisterRequest): void {
        if (!userData.email || !this.validateEmail(userData.email)) {
            throw createValidationError('유효한 이메일 주소를 입력해주세요.', 'INVALID_EMAIL');
        }

        if (!userData.password || !this.validatePassword(userData.password)) {
            throw createValidationError('비밀번호는 8자 이상이어야 합니다.', 'INVALID_PASSWORD');
        }

        if (!userData.name || userData.name.trim().length < 2) {
            throw createValidationError('이름은 2자 이상이어야 합니다.', 'INVALID_NAME');
        }

        if (!userData.nickname || userData.nickname.trim().length < 2) {
            throw createValidationError('닉네임은 2자 이상이어야 합니다.', 'INVALID_NICKNAME');
        }

        if (!userData.agreeTerms || !userData.agreePrivacy) {
            throw createValidationError('필수 약관에 동의해주세요.', 'TERMS_NOT_AGREED');
        }
    }

    private validateProfileUpdates(updates: Partial<User>): void {
        if (updates.email && !this.validateEmail(updates.email)) {
            throw createValidationError('유효한 이메일 주소를 입력해주세요.', 'INVALID_EMAIL');
        }

        if (updates.name && updates.name.trim().length < 2) {
            throw createValidationError('이름은 2자 이상이어야 합니다.', 'INVALID_NAME');
        }

        if (updates.nickname && updates.nickname.trim().length < 2) {
            throw createValidationError('닉네임은 2자 이상이어야 합니다.', 'INVALID_NICKNAME');
        }
    }

    private validateEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    private validatePassword(password: string): boolean {
        return password.length >= 8;
    }

    // 인증 상태 초기화
    async initializeAuth(): Promise<void> {
        try {
            this.authState.isLoading = true;

            const isAuth = await this.isAuthenticated();
            if (isAuth) {
                const userResponse = await this.getCurrentUser();
                if (userResponse.ok && userResponse.data) {
                    this.authState.user = userResponse.data;
                }
            }
        } catch (error) {
            authLogger.error('Auth initialization failed', error as Error);
        } finally {
            this.authState.isLoading = false;
        }
    }
}

export const authService = new AuthService();
export default authService; 