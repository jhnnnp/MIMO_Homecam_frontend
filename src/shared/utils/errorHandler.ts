import { logger } from './logger';
import config from '@/app/config';

// 에러 타입 정의
export enum ErrorType {
    NETWORK = 'NETWORK',
    AUTHENTICATION = 'AUTHENTICATION',
    AUTHORIZATION = 'AUTHORIZATION',
    VALIDATION = 'VALIDATION',
    NOT_FOUND = 'NOT_FOUND',
    SERVER_ERROR = 'SERVER_ERROR',
    TIMEOUT = 'TIMEOUT',
    UNKNOWN = 'UNKNOWN',
}

// 에러 심각도 정의
export enum ErrorSeverity {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL',
}

// 커스텀 에러 클래스
export class AppError extends Error {
    public readonly type: ErrorType;
    public readonly severity: ErrorSeverity;
    public readonly code: string;
    public readonly retryable: boolean;
    public readonly timestamp: Date;
    public readonly context?: Record<string, any>;

    constructor(
        message: string,
        type: ErrorType = ErrorType.UNKNOWN,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        code: string = 'UNKNOWN_ERROR',
        retryable: boolean = false,
        context?: Record<string, any>
    ) {
        super(message);
        this.name = 'AppError';
        this.type = type;
        this.severity = severity;
        this.code = code;
        this.retryable = retryable;
        this.timestamp = new Date();
        this.context = context;

        // 스택 트레이스 보존
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }
    }

    // 에러 정보를 객체로 변환
    toJSON(): Record<string, any> {
        return {
            name: this.name,
            message: this.message,
            type: this.type,
            severity: this.severity,
            code: this.code,
            retryable: this.retryable,
            timestamp: this.timestamp.toISOString(),
            context: this.context,
            stack: this.stack,
        };
    }
}

// 네트워크 에러 클래스
export class NetworkError extends AppError {
    constructor(
        message: string = '네트워크 연결에 실패했습니다.',
        code: string = 'NETWORK_ERROR',
        context?: Record<string, any>
    ) {
        super(message, ErrorType.NETWORK, ErrorSeverity.HIGH, code, true, context);
        this.name = 'NetworkError';
    }
}

// 인증 에러 클래스
export class AuthenticationError extends AppError {
    constructor(
        message: string = '인증에 실패했습니다.',
        code: string = 'AUTH_ERROR',
        context?: Record<string, any>
    ) {
        super(message, ErrorType.AUTHENTICATION, ErrorSeverity.HIGH, code, false, context);
        this.name = 'AuthenticationError';
    }
}

// 권한 에러 클래스
export class AuthorizationError extends AppError {
    constructor(
        message: string = '권한이 없습니다.',
        code: string = 'FORBIDDEN',
        context?: Record<string, any>
    ) {
        super(message, ErrorType.AUTHORIZATION, ErrorSeverity.HIGH, code, false, context);
        this.name = 'AuthorizationError';
    }
}

// 검증 에러 클래스
export class ValidationError extends AppError {
    constructor(
        message: string = '입력 데이터가 유효하지 않습니다.',
        code: string = 'VALIDATION_ERROR',
        context?: Record<string, any>
    ) {
        super(message, ErrorType.VALIDATION, ErrorSeverity.MEDIUM, code, false, context);
        this.name = 'ValidationError';
    }
}

// 타임아웃 에러 클래스
export class TimeoutError extends AppError {
    constructor(
        message: string = '요청 시간이 초과되었습니다.',
        code: string = 'TIMEOUT_ERROR',
        context?: Record<string, any>
    ) {
        super(message, ErrorType.TIMEOUT, ErrorSeverity.MEDIUM, code, true, context);
        this.name = 'TimeoutError';
    }
}

// 에러 처리 인터페이스
export interface ErrorHandler {
    handle(error: Error | AppError, context?: Record<string, any>): Promise<void>;
    isRetryable(error: Error | AppError): boolean;
    shouldRetry(error: Error | AppError, attempt: number): boolean;
    getRetryDelay(attempt: number): number;
}

// 기본 에러 핸들러 클래스
export class DefaultErrorHandler implements ErrorHandler {
    private maxRetries: number;
    private baseDelay: number;

    constructor() {
        // config가 안전하게 로드되었는지 확인
        try {
            const apiConfig = config.getApiConfig();
            this.maxRetries = apiConfig?.retryAttempts || 3;
            this.baseDelay = apiConfig?.retryDelay || 1000;
        } catch (error) {
            // config 로드 실패 시 기본값 사용
            this.maxRetries = 3;
            this.baseDelay = 1000;
        }
    }

    // 에러 처리
    async handle(error: Error | AppError, context?: Record<string, any>): Promise<void> {
        const appError = this.normalizeError(error);

        // 에러 로깅
        this.logError(appError, context);

        // 에러 타입별 처리
        switch (appError.type) {
            case ErrorType.AUTHENTICATION:
                await this.handleAuthenticationError(appError);
                break;
            case ErrorType.AUTHORIZATION:
                await this.handleAuthorizationError(appError);
                break;
            case ErrorType.NETWORK:
                await this.handleNetworkError(appError);
                break;
            case ErrorType.TIMEOUT:
                await this.handleTimeoutError(appError);
                break;
            case ErrorType.VALIDATION:
                await this.handleValidationError(appError);
                break;
            case ErrorType.SERVER_ERROR:
                await this.handleServerError(appError);
                break;
            default:
                await this.handleUnknownError(appError);
        }
    }

    // 에러 정규화 (방어 코드 강화)
    private normalizeError(error: unknown): AppError {
        // 안전 가드
        if (error instanceof AppError) {
            return error;
        }

        // Error 객체가 아닌 경우 처리
        if (!(error instanceof Error)) {
            return new AppError(
                String(error || 'Unknown error'),
                ErrorType.UNKNOWN,
                ErrorSeverity.MEDIUM,
                'UNKNOWN_ERROR',
                false,
                { originalError: error }
            );
        }

        // 일반 Error를 AppError로 변환
        let type = ErrorType.UNKNOWN;
        let severity = ErrorSeverity.MEDIUM;
        let code = 'UNKNOWN_ERROR';
        let retryable = false;

        // 에러 메시지 기반 타입 추정
        const message = error.message.toLowerCase();
        if (message.includes('network') || message.includes('fetch')) {
            type = ErrorType.NETWORK;
            severity = ErrorSeverity.HIGH;
            code = 'NETWORK_ERROR';
            retryable = true;
        } else if (message.includes('timeout')) {
            type = ErrorType.TIMEOUT;
            severity = ErrorSeverity.MEDIUM;
            code = 'TIMEOUT_ERROR';
            retryable = true;
        } else if (message.includes('unauthorized') || message.includes('401')) {
            type = ErrorType.AUTHENTICATION;
            severity = ErrorSeverity.HIGH;
            code = 'AUTH_ERROR';
            retryable = false;
        } else if (message.includes('forbidden') || message.includes('403')) {
            type = ErrorType.AUTHORIZATION;
            severity = ErrorSeverity.HIGH;
            code = 'FORBIDDEN';
            retryable = false;
        } else if (message.includes('cannot read property') || message.includes('undefined')) {
            type = ErrorType.UNKNOWN;
            severity = ErrorSeverity.HIGH;
            code = 'CONFIG_ERROR';
            retryable = false;
        }

        return new AppError(
            error.message,
            type,
            severity,
            code,
            retryable,
            { originalError: error }
        );
    }

    // 에러 로깅
    private logError(error: AppError, context?: Record<string, any>): void {
        const logData = {
            error: error.toJSON(),
            context,
        };

        switch (error.severity) {
            case ErrorSeverity.CRITICAL:
                logger.critical(`Critical error: ${error.message}`, { error: error.toJSON(), context } as any);
                break;
            case ErrorSeverity.HIGH:
                logger.error(`High severity error: ${error.message}`, { error: error.toJSON(), context } as any);
                break;
            case ErrorSeverity.MEDIUM:
                logger.warn(`Medium severity error: ${error.message}`, { error: error.toJSON(), context } as any);
                break;
            case ErrorSeverity.LOW:
                logger.info(`Low severity error: ${error.message}`, { error: error.toJSON(), context } as any);
                break;
        }
    }

    // 인증 에러 처리
    private async handleAuthenticationError(error: AppError): Promise<void> {
        logger.warn('Authentication failed', { error: error.toJSON() });

        // 토큰 갱신 시도 또는 로그아웃 처리
        // authService.refreshToken() 또는 authService.logout() 호출
    }

    // 권한 에러 처리
    private async handleAuthorizationError(error: AppError): Promise<void> {
        logger.warn('Authorization failed', { error: error.toJSON() });

        // 사용자에게 권한 부족 알림
    }

    // 네트워크 에러 처리
    private async handleNetworkError(error: AppError): Promise<void> {
        logger.error('Network error', { error: error.toJSON() } as any);

        // 네트워크 상태 확인 및 재시도 로직
    }

    // 타임아웃 에러 처리
    private async handleTimeoutError(error: AppError): Promise<void> {
        logger.warn('Request timeout', { error: error.toJSON() });

        // 재시도 로직
    }

    // 검증 에러 처리
    private async handleValidationError(error: AppError): Promise<void> {
        logger.warn('Validation error', { error: error.toJSON() });

        // 사용자에게 입력 오류 알림
    }

    // 서버 에러 처리
    private async handleServerError(error: AppError): Promise<void> {
        logger.error('Server error', { error: error.toJSON() } as any);

        // 서버 상태 확인 및 재시도 로직
    }

    // 알 수 없는 에러 처리
    private async handleUnknownError(error: AppError): Promise<void> {
        logger.error('Unknown error', { error: error.toJSON() } as any);

        // 일반적인 에러 처리
    }

    // 재시도 가능 여부 확인
    isRetryable(error: Error | AppError): boolean {
        const appError = this.normalizeError(error);
        return appError.retryable;
    }

    // 재시도 여부 결정
    shouldRetry(error: Error | AppError, attempt: number): boolean {
        if (attempt >= this.maxRetries) {
            return false;
        }

        const appError = this.normalizeError(error);
        return appError.retryable;
    }

    // 재시도 지연 시간 계산 (지수 백오프)
    getRetryDelay(attempt: number): number {
        return Math.min(this.baseDelay * Math.pow(2, attempt), 30000); // 최대 30초
    }
}

// 에러 처리 유틸리티 함수들
export const createError = (
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    code?: string,
    retryable?: boolean,
    context?: Record<string, any>
): AppError => {
    return new AppError(message, type, severity, code, retryable, context);
};

export const createNetworkError = (
    message?: string,
    code?: string,
    context?: Record<string, any>
): NetworkError => {
    return new NetworkError(message, code, context);
};

export const createAuthError = (
    message?: string,
    code?: string,
    context?: Record<string, any>
): AuthenticationError => {
    return new AuthenticationError(message, code, context);
};

export const createValidationError = (
    message?: string,
    code?: string,
    context?: Record<string, any>
): ValidationError => {
    return new ValidationError(message, code, context);
};

export const createTimeoutError = (
    message?: string,
    code?: string,
    context?: Record<string, any>
): TimeoutError => {
    return new TimeoutError(message, code, context);
};

// 에러 처리 래퍼 함수
export const withErrorHandling = async <T>(
    operation: () => Promise<T>,
    context?: Record<string, any>
): Promise<T> => {
    const errorHandler = new DefaultErrorHandler();

    try {
        return await operation();
    } catch (error) {
        await errorHandler.handle(error as Error, context);
        throw error;
    }
};

// 재시도 로직이 포함된 에러 처리 래퍼
export const withRetry = async <T>(
    operation: () => Promise<T>,
    maxRetries?: number,
    context?: Record<string, any>
): Promise<T> => {
    // 기본값 설정
    const defaultMaxRetries = (() => {
        try {
            return config.getApiConfig()?.retryAttempts || 3;
        } catch (error) {
            return 3;
        }
    })();

    const finalMaxRetries = maxRetries ?? defaultMaxRetries;
    const errorHandler = new DefaultErrorHandler();
    let lastError: Error | AppError = new Error('Unknown error');

    for (let attempt = 0; attempt <= finalMaxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error | AppError;

            if (!errorHandler.shouldRetry(lastError, attempt)) {
                break;
            }

            if (attempt < finalMaxRetries) {
                const delay = errorHandler.getRetryDelay(attempt);
                logger.warn(`Retry attempt ${attempt + 1}/${finalMaxRetries} after ${delay}ms`, {
                    error: lastError.message,
                    context,
                });
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    await errorHandler.handle(lastError, context);
    throw lastError;
};

// 기본 에러 핸들러 인스턴스
export const errorHandler = new DefaultErrorHandler();

export default errorHandler; 