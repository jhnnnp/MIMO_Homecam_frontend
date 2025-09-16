import { create } from 'zustand';
import { User } from '@/shared/types/api';
import authService from '@/features/auth/services/authService';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AuthState {
    // 상태
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
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
    getAccessToken: () => string | null;
}

// 전역 인증 이벤트 관리자
class AuthEventManager {
    private listeners: Array<(reason?: string) => void> = [];

    addListener(listener: (reason?: string) => void) {
        this.listeners.push(listener);
    }

    removeListener(listener: (reason?: string) => void) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    emit(reason?: string) {
        this.listeners.forEach(listener => {
            try {
                listener(reason);
            } catch (error) {
                console.error('인증 이벤트 리스너 오류:', error);
            }
        });
    }
}

const authEventManager = new AuthEventManager();

export const useAuthStore = create<AuthState>((set, get) => {
    // React Native 환경에서 전역 인증 이벤트 리스너 설정
    authEventManager.addListener(async (reason?: string) => {
        console.log('🔄 전역 인증 실패 이벤트 수신:', reason);
        await get().logout();
    });

    return {
        // 초기 상태
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        // 로그인
        login: async (email: string, password: string) => {
            set({ isLoading: true, error: null });

            try {
                const response = await authService.login({ email, password });

                if (response.ok && response.data) {
                    // 토큰 먼저 저장
                    set({
                        user: null, // 나중에 getCurrentUser로 가져옴
                        accessToken: response.data.accessToken,
                        refreshToken: response.data.refreshToken,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                    });

                    console.log('✅ 로그인 성공 - 토큰 저장됨:', {
                        hasAccessToken: !!response.data.accessToken,
                        hasRefreshToken: !!response.data.refreshToken,
                        tokenLength: response.data.accessToken?.length
                    });

                    // 사용자 정보 가져오기
                    try {
                        await get().getCurrentUser();
                        console.log('✅ 사용자 정보 가져오기 성공');
                    } catch (userError) {
                        console.log('⚠️ 사용자 정보 가져오기 실패:', userError);
                        // 사용자 정보 가져오기 실패해도 로그인은 성공으로 처리
                    }

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
            try {
                // 모든 토큰 삭제
                await SecureStore.deleteItemAsync('accessToken');
                await SecureStore.deleteItemAsync('refreshToken');
                await SecureStore.deleteItemAsync('userData');

                // AsyncStorage에서도 삭제 (이전 버전 호환성)
                await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userData']);

                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                    isLoading: false,
                });

                console.log('✅ 로그아웃 완료 - 모든 토큰 삭제됨');
            } catch (error) {
                console.error('❌ 로그아웃 중 오류:', error);
            }
        },

        // 현재 사용자 정보 가져오기
        getCurrentUser: async () => {
            const currentState = get();

            // 이미 로딩 중이거나 토큰이 없으면 스킵
            if (currentState.isLoading || !currentState.accessToken) {
                console.log('🔄 [GET CURRENT USER] 스킵 - 로딩 중이거나 토큰 없음');
                return;
            }

            set({ isLoading: true, error: null });

            try {
                console.log('👤 [GET CURRENT USER] 사용자 정보 요청 시작');
                const response = await authService.getCurrentUser();
                console.log('📊 [GET CURRENT USER] 응답:', {
                    ok: response.ok,
                    hasData: !!response.data,
                    error: response.error?.message
                });

                if (response.ok && response.data) {
                    console.log('✅ [GET CURRENT USER] 사용자 정보 설정 완료');
                    set({
                        user: response.data,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                    });
                } else {
                    console.log('❌ [GET CURRENT USER] 사용자 정보 가져오기 실패:', response.error?.message);

                    // 403/401 에러인 경우 토큰 문제로 간주하여 로그아웃
                    if (response.error?.code === 'UNAUTHORIZED' || response.error?.code === 'FORBIDDEN') {
                        console.log('🔓 [GET CURRENT USER] 인증 오류 - 자동 로그아웃');
                        await get().logout();
                    } else {
                        set({
                            isLoading: false,
                            error: response.error?.message || '사용자 정보를 가져올 수 없어요.',
                        });
                    }
                }
            } catch (error: any) {
                console.log('❌ [GET CURRENT USER] 네트워크 오류:', {
                    message: error.message,
                    status: error.response?.status
                });

                // 네트워크 오류인 경우에는 로그아웃하지 않고 에러만 표시
                if (error.response?.status === 401 || error.response?.status === 403) {
                    console.log('🔓 [GET CURRENT USER] 인증 오류 - 자동 로그아웃');
                    await get().logout();
                } else {
                    set({
                        isLoading: false,
                        error: '사용자 정보를 가져올 수 없어요. 네트워크를 확인해주세요.',
                    });
                }
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

        // 액세스 토큰 가져오기
        getAccessToken: () => {
            const state = get();
            console.log('🔐 [Auth Debug] Getting access token:', {
                hasToken: !!state.accessToken,
                tokenLength: state.accessToken?.length,
                isAuthenticated: state.isAuthenticated,
                user: state.user?.email
            });
            return state.accessToken;
        },

        // 인증 상태 초기화 (앱 시작 시 호출)
        initializeAuth: async () => {
            set({ isLoading: true });

            try {
                // SecureStore에서 토큰 직접 로드
                const accessToken = await authService.getAccessToken();
                const refreshToken = await authService.getRefreshToken();

                console.log('🔍 [AUTH INIT] 토큰 로드:', {
                    hasAccessToken: !!accessToken,
                    hasRefreshToken: !!refreshToken
                });

                if (accessToken && refreshToken) {
                    // 토큰을 상태에 저장
                    set({
                        accessToken,
                        refreshToken,
                        isAuthenticated: true,
                        isLoading: false,
                    });

                    // 사용자 정보 가져오기 시도
                    try {
                        console.log('👤 [AUTH INIT] 사용자 정보 가져오기 시도');
                        await get().getCurrentUser();
                        console.log('✅ [AUTH INIT] 사용자 정보 가져오기 성공');
                    } catch (userError) {
                        console.log('❌ [AUTH INIT] 사용자 정보 가져오기 실패:', userError);
                        // 사용자 정보 가져오기 실패 시 토큰 무효화
                        try {
                            await authService.logout();
                            console.log('🧹 [AUTH INIT] 토큰 무효화 완료');
                        } catch (logoutError) {
                            console.log('⚠️ [AUTH INIT] 토큰 무효화 실패:', logoutError);
                        }

                        set({
                            user: null,
                            accessToken: null,
                            refreshToken: null,
                            isAuthenticated: false,
                            isLoading: false,
                        });
                    }
                } else {
                    // 토큰이 없으면 인증되지 않은 상태로 설정
                    console.log('🔒 [AUTH INIT] 토큰 없음 - 인증되지 않은 상태');
                    set({
                        user: null,
                        accessToken: null,
                        refreshToken: null,
                        isAuthenticated: false,
                        isLoading: false,
                    });
                }
            } catch (error) {
                console.log('❌ [AUTH INIT] 인증 초기화 실패:', error);
                // 초기화 실패 시 안전하게 인증되지 않은 상태로 설정
                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                    isLoading: false,
                });
            }
        },
    };
});

// 외부에서 인증 로그아웃을 트리거할 수 있는 함수
export const triggerAuthLogout = (reason?: string) => {
    authEventManager.emit(reason);
}; 