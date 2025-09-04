// 공통 에러 클래스들
export class APIError extends Error {
    status?: number;
    code?: string;
    context?: string;

    constructor(message: string, status?: number, code?: string, context?: string) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.code = code;
        this.context = context;
    }
}

export class NetworkError extends Error {
    constructor(message: string = '네트워크 연결을 확인해 주세요.') {
        super(message);
        this.name = 'NetworkError';
    }
}

export class AuthError extends Error {
    constructor(message: string = '인증이 필요합니다. 다시 로그인해 주세요.') {
        super(message);
        this.name = 'AuthError';
    }
}

export class ValidationError extends Error {
    field?: string;

    constructor(message: string, field?: string) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}

// 에러 타입 가드
export const isAPIError = (error: unknown): error is APIError => {
    return error instanceof APIError;
};

export const isNetworkError = (error: unknown): error is NetworkError => {
    return error instanceof NetworkError;
};

export const isAuthError = (error: unknown): error is AuthError => {
    return error instanceof AuthError;
};

export const isValidationError = (error: unknown): error is ValidationError => {
    return error instanceof ValidationError;
};

// 에러 메시지 정규화
export const normalizeErrorMessage = (error: unknown): string => {
    if (isAPIError(error)) {
        return error.message;
    }
    if (isNetworkError(error)) {
        return error.message;
    }
    if (isAuthError(error)) {
        return error.message;
    }
    if (isValidationError(error)) {
        return error.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return '알 수 없는 오류가 발생했습니다.';
};

// 에러 로깅
export const logError = (error: unknown, context: string, additionalInfo?: Record<string, any>) => {
    const errorInfo = {
        context,
        message: normalizeErrorMessage(error),
        timestamp: new Date().toISOString(),
        ...additionalInfo,
    };

    if (isAPIError(error)) {
        errorInfo.status = error.status;
        errorInfo.code = error.code;
    }

    console.error(`[${context}] 에러 발생:`, errorInfo);

    // 프로덕션에서는 에러 추적 서비스로 전송
    if (process.env.NODE_ENV === 'production') {
        // TODO: Sentry, LogRocket 등 에러 추적 서비스 연동
    }
};

// 안전한 함수 실행 래퍼
export const safeExecute = async <T>(
    fn: () => Promise<T>,
    context: string,
    fallback?: T
): Promise<T> => {
    try {
        return await fn();
    } catch (error) {
        logError(error, context);
        if (fallback !== undefined) {
            return fallback;
        }
        throw error;
    }
};

// 타임아웃 래퍼
export const withTimeout = <T>(
    promise: Promise<T>,
    timeoutMs: number,
    context: string
): Promise<T> => {
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
            reject(new NetworkError(`요청 시간이 초과되었습니다. (${context})`));
        }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
};

// 재시도 로직
export const withRetry = async <T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000,
    context: string
): Promise<T> => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // 인증 에러나 검증 에러는 재시도하지 않음
            if (isAuthError(error) || isValidationError(error)) {
                throw error;
            }

            if (attempt < maxRetries) {
                logError(error, `${context} (재시도 ${attempt}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
            }
        }
    }

    throw lastError;
}; 