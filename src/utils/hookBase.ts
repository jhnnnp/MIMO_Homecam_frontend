import { useRef, useCallback, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { logError, normalizeErrorMessage } from './errorHandling';

// 공통 Hook 상태 인터페이스
export interface BaseHookState {
    isLoading: boolean;
    error: string | null;
    isConnected?: boolean;
    reconnectAttempt?: number;
}

// 공통 Hook 액션 인터페이스
export interface BaseHookActions {
    clearError: () => void;
    retry: () => void;
}

// 이벤트 리스너 관리
export interface EventListener {
    event: string;
    handler: (...args: any[]) => void;
    cleanup?: () => void;
}

// 공통 Hook 설정
export interface BaseHookConfig {
    enableAutoReconnect?: boolean;
    maxReconnectAttempts?: number;
    reconnectDelay?: number;
    enableAppStateHandling?: boolean;
    enableErrorHandling?: boolean;
}

// 공통 Hook 베이스 클래스
export class BaseHookManager<TState extends BaseHookState, TActions extends BaseHookActions> {
    private isMountedRef = useRef(true);
    private reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    private eventListenersRef = useRef<EventListener[]>([]);
    private appStateListenerRef = useRef<any>(null);

    protected state: TState;
    protected setState: (updater: (prev: TState) => TState) => void;
    protected config: BaseHookConfig;

    constructor(
        initialState: TState,
        setState: (updater: (prev: TState) => TState) => void,
        config: BaseHookConfig = {}
    ) {
        this.state = initialState;
        this.setState = setState;
        this.config = {
            enableAutoReconnect: true,
            maxReconnectAttempts: 5,
            reconnectDelay: 1000,
            enableAppStateHandling: true,
            enableErrorHandling: true,
            ...config,
        };
    }

    // 안전한 상태 업데이트
    protected safeSetState = useCallback((updater: (prev: TState) => TState) => {
        if (this.isMountedRef.current) {
            this.setState(updater);
        }
    }, []);

    // 에러 처리
    protected handleError = useCallback((error: unknown, context: string) => {
        if (!this.config.enableErrorHandling) return;

        const errorMessage = normalizeErrorMessage(error);
        logError(error, context);

        this.safeSetState(prev => ({
            ...prev,
            error: errorMessage,
            isLoading: false,
        }));
    }, []);

    // 로딩 상태 관리
    protected setLoading = useCallback((isLoading: boolean) => {
        this.safeSetState(prev => ({ ...prev, isLoading }));
    }, []);

    // 에러 클리어
    protected clearError = useCallback(() => {
        this.safeSetState(prev => ({ ...prev, error: null }));
    }, []);

    // 자동 재연결 로직
    protected scheduleReconnect = useCallback(() => {
        if (!this.config.enableAutoReconnect) return;

        const { reconnectAttempt = 0 } = this.state;
        if (reconnectAttempt >= (this.config.maxReconnectAttempts || 5)) {
            logError(new Error('최대 재연결 시도 횟수를 초과했습니다.'), 'Reconnect');
            return;
        }

        const delay = Math.min(
            (this.config.reconnectDelay || 1000) * Math.pow(2, reconnectAttempt),
            30000
        );

        this.reconnectTimeoutRef.current = setTimeout(() => {
            if (this.isMountedRef.current) {
                this.safeSetState(prev => ({
                    ...prev,
                    reconnectAttempt: (prev.reconnectAttempt || 0) + 1,
                }));
                this.onReconnect();
            }
        }, delay);
    }, [this.state.reconnectAttempt]);

    // 재연결 시도 (하위 클래스에서 구현)
    protected onReconnect = () => {
        // 기본 구현은 없음
    };

    // 이벤트 리스너 등록
    protected addEventListener = useCallback((
        target: any,
        event: string,
        handler: (...args: any[]) => void,
        cleanup?: () => void
    ) => {
        if (!target || !target.on) return;

        target.on(event, handler);

        this.eventListenersRef.current.push({
            event,
            handler,
            cleanup,
        });
    }, []);

    // 이벤트 리스너 제거
    protected removeEventListener = useCallback((
        target: any,
        event: string,
        handler: (...args: any[]) => void
    ) => {
        if (!target || !target.off) return;

        target.off(event, handler);

        this.eventListenersRef.current = this.eventListenersRef.current.filter(
            listener => !(listener.event === event && listener.handler === handler)
        );
    }, []);

    // 앱 상태 변경 처리
    protected handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
        if (!this.config.enableAppStateHandling) return;

        if (nextAppState === 'active') {
            this.onAppActivate();
        } else if (nextAppState === 'background') {
            this.onAppBackground();
        }
    }, []);

    // 앱 활성화 시 처리 (하위 클래스에서 구현)
    protected onAppActivate = () => {
        // 기본 구현은 없음
    };

    // 앱 백그라운드 시 처리 (하위 클래스에서 구현)
    protected onAppBackground = () => {
        // 기본 구현은 없음
    };

    // 앱 상태 리스너 등록
    protected setupAppStateListener = useCallback(() => {
        if (!this.config.enableAppStateHandling) return;

        this.appStateListenerRef.current = AppState.addEventListener(
            'change',
            this.handleAppStateChange
        );
    }, []);

    // 앱 상태 리스너 제거
    protected cleanupAppStateListener = useCallback(() => {
        if (this.appStateListenerRef.current) {
            this.appStateListenerRef.current.remove();
            this.appStateListenerRef.current = null;
        }
    }, []);

    // 모든 이벤트 리스너 정리
    protected cleanupEventListeners = useCallback(() => {
        this.eventListenersRef.current.forEach(listener => {
            if (listener.cleanup) {
                listener.cleanup();
            }
        });
        this.eventListenersRef.current = [];
    }, []);

    // 타이머 정리
    protected cleanupTimers = useCallback(() => {
        if (this.reconnectTimeoutRef.current) {
            clearTimeout(this.reconnectTimeoutRef.current);
            this.reconnectTimeoutRef.current = null;
        }
    }, []);

    // 전체 정리
    public cleanup = useCallback(() => {
        this.isMountedRef.current = false;
        this.cleanupTimers();
        this.cleanupEventListeners();
        this.cleanupAppStateListener();
    }, []);

    // 마운트 상태 확인
    public isMounted = () => this.isMountedRef.current;

    // 재시도 액션
    public retry = useCallback(() => {
        this.clearError();
        this.safeSetState(prev => ({ ...prev, reconnectAttempt: 0 }));
        this.onReconnect();
    }, []);

    // 기본 액션들
    public getBaseActions = (): BaseHookActions => ({
        clearError: this.clearError,
        retry: this.retry,
    });
}

// Hook에서 사용할 유틸리티 훅
export const useBaseHook = <TState extends BaseHookState, TActions extends BaseHookActions>(
    initialState: TState,
    config: BaseHookConfig = {}
) => {
    const [state, setState] = useState<TState>(initialState);
    const managerRef = useRef<BaseHookManager<TState, TActions> | null>(null);

    // 매니저 초기화
    if (!managerRef.current) {
        managerRef.current = new BaseHookManager(initialState, setState, config);
    }

    // 컴포넌트 언마운트 시 정리
    useEffect(() => {
        return () => {
            managerRef.current?.cleanup();
        };
    }, []);

    return {
        state,
        manager: managerRef.current,
        setState,
    };
};

// 메모리 누수 방지를 위한 안전한 상태 업데이트
export const useSafeState = <T>(initialState: T) => {
    const [state, setState] = useState<T>(initialState);
    const isMountedRef = useRef(true);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const safeSetState = useCallback((updater: T | ((prev: T) => T)) => {
        if (isMountedRef.current) {
            setState(updater);
        }
    }, []);

    return [state, safeSetState] as const;
}; 