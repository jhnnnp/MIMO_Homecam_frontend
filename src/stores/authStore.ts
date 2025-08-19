import { create } from 'zustand';
import { User } from '../types/api';
import authService from '../services/authService';

export interface AuthState {
    // 상태
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // 액션
    login: (email: string, password: string) => Promise<boolean>;
    register: (userData: RegisterRequest) => Promise<boolean>;
    googleLogin: (googleToken: string) => Promise<boolean>;
    logout: () => Promise<void>;
    getCurrentUser: () => Promise<void>;
    updateProfile: (updates: Partial<User>) => Promise<boolean>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
    clearError: () => void;
    initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    // 초기 상태
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    // 로그인
    login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
            const response = await authService.login({ email, password });

            if (response.ok && response.data) {
                set({
                    user: response.data.user,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null,
                });
                return true;
            } else {
                set({
                    isLoading: false,
                    error: response.error?.message || '로그인에 실패했어요.',
                });
                return false;
            }
        } catch (error) {
            set({
                isLoading: false,
                error: '네트워크 오류가 발생했어요. 다시 시도해 주세요.',
            });
            return false;
        }
    },

    // 회원가입
    register: async (userData: RegisterRequest) => {
        set({ isLoading: true, error: null });

        try {
            const response = await authService.register(userData);

            if (response.ok && response.data) {
                set({
                    user: response.data.user,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null,
                });
                return true;
            } else {
                set({
                    isLoading: false,
                    error: response.error?.message || '회원가입에 실패했어요.',
                });
                return false;
            }
        } catch (error) {
            set({
                isLoading: false,
                error: '네트워크 오류가 발생했어요. 다시 시도해 주세요.',
            });
            return false;
        }
    },

    // Google 로그인
    googleLogin: async (googleToken: string) => {
        set({ isLoading: true, error: null });

        try {
            const response = await authService.googleLogin(googleToken);

            if (response.ok && response.data) {
                set({
                    user: response.data.user,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null,
                });
                return true;
            } else {
                set({
                    isLoading: false,
                    error: response.error?.message || 'Google 로그인에 실패했어요.',
                });
                return false;
            }
        } catch (error) {
            set({
                isLoading: false,
                error: '네트워크 오류가 발생했어요. 다시 시도해 주세요.',
            });
            return false;
        }
    },

    // 로그아웃
    logout: async () => {
        set({ isLoading: true });

        try {
            await authService.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
            });
        }
    },

    // 현재 사용자 정보 가져오기
    getCurrentUser: async () => {
        set({ isLoading: true, error: null });

        try {
            const response = await authService.getCurrentUser();

            if (response.ok && response.data) {
                set({
                    user: response.data,
                    isAuthenticated: true,
                    isLoading: false,
                });
            } else {
                set({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                    error: response.error?.message,
                });
            }
        } catch (error) {
            set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: '사용자 정보를 가져올 수 없어요.',
            });
        }
    },

    // 프로필 업데이트
    updateProfile: async (updates: Partial<User>) => {
        set({ isLoading: true, error: null });

        try {
            const response = await authService.updateProfile(updates);

            if (response.ok && response.data) {
                set({
                    user: response.data,
                    isLoading: false,
                    error: null,
                });
                return true;
            } else {
                set({
                    isLoading: false,
                    error: response.error?.message || '프로필 업데이트에 실패했어요.',
                });
                return false;
            }
        } catch (error) {
            set({
                isLoading: false,
                error: '네트워크 오류가 발생했어요. 다시 시도해 주세요.',
            });
            return false;
        }
    },

    // 비밀번호 변경
    changePassword: async (currentPassword: string, newPassword: string) => {
        set({ isLoading: true, error: null });

        try {
            const response = await authService.changePassword(currentPassword, newPassword);

            if (response.ok) {
                set({
                    isLoading: false,
                    error: null,
                });
                return true;
            } else {
                set({
                    isLoading: false,
                    error: response.error?.message || '비밀번호 변경에 실패했어요.',
                });
                return false;
            }
        } catch (error) {
            set({
                isLoading: false,
                error: '네트워크 오류가 발생했어요. 다시 시도해 주세요.',
            });
            return false;
        }
    },

    // 에러 초기화
    clearError: () => {
        set({ error: null });
    },

    // 인증 상태 초기화 (앱 시작 시 호출)
    initializeAuth: async () => {
        set({ isLoading: true });

        try {
            // 개발 중에는 백엔드 없이도 작동하도록 임시 처리
            const isAuthenticated = await authService.isAuthenticated();

            if (isAuthenticated) {
                // 토큰이 있으면 사용자 정보 가져오기
                await get().getCurrentUser();
            } else {
                // 백엔드가 없어도 로그인 화면을 보여주기 위해 인증되지 않은 상태로 설정
                set({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                });
            }
        } catch (error) {
            console.log('Authentication initialization failed (expected during development):', error);
            // 백엔드가 없어도 앱이 실행되도록 설정
            set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
            });
        }
    },
})); 