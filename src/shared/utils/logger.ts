import { Platform } from 'react-native';
import config from '@/app/config';

// ============================================================================
// CENTRALIZED LOGGER - 중앙 로깅 시스템
// ============================================================================

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    CRITICAL = 4,
}

export interface LogContext {
    hook?: string;
    action?: string;
    userId?: string;
    cameraId?: string;
    sessionId?: string;
    [key: string]: any;
}

export interface LogEntry {
    timestamp: number;
    level: LogLevel;
    message: string;
    context?: LogContext;
    error?: Error;
    data?: any;
}

class Logger {
    private static instance: Logger;
    private logLevel: LogLevel = LogLevel.INFO;
    private isDevelopment: boolean = __DEV__;
    private logs: LogEntry[] = [];
    private maxLogs: number = 1000;

    private constructor() {
        this.setupGlobalErrorHandler();
    }

    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    // ============================================================================
    // 로그 레벨 설정
    // ============================================================================

    setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    getLogLevel(): LogLevel {
        return this.logLevel;
    }

    // ============================================================================
    // 로깅 메서드들
    // ============================================================================

    debug(message: string, context?: LogContext, data?: any): void {
        this.log(LogLevel.DEBUG, message, context, data);
    }

    info(message: string, context?: LogContext, data?: any): void {
        this.log(LogLevel.INFO, message, context, data);
    }

    warn(message: string, context?: LogContext, data?: any): void {
        this.log(LogLevel.WARN, message, context, data);
    }

    error(message: string, context?: LogContext, error?: Error, data?: any): void {
        this.log(LogLevel.ERROR, message, context, data, error);
    }

    critical(message: string, context?: LogContext, error?: Error, data?: any): void {
        this.log(LogLevel.CRITICAL, message, context, data, error);
    }

    // ============================================================================
    // 훅 전용 로깅 메서드들
    // ============================================================================

    hook(hookName: string, action: string, message: string, data?: any): void {
        this.info(message, { hook: hookName, action }, data);
    }

    hookError(hookName: string, action: string, message: string, error?: Error, data?: any): void {
        this.error(message, { hook: hookName, action }, error, data);
    }

    hookWarn(hookName: string, action: string, message: string, data?: any): void {
        this.warn(message, { hook: hookName, action }, data);
    }

    // ============================================================================
    // 카메라 관련 로깅
    // ============================================================================

    camera(cameraId: string, action: string, message: string, data?: any): void {
        this.info(message, { hook: 'useCamera', action, cameraId }, data);
    }

    cameraError(cameraId: string, action: string, message: string, error?: Error, data?: any): void {
        this.error(message, { hook: 'useCamera', action, cameraId }, error, data);
    }

    // ============================================================================
    // 스트리밍 관련 로깅
    // ============================================================================

    streaming(streamId: string, action: string, message: string, data?: any): void {
        this.info(message, { hook: 'useCameraStream', action, streamId }, data);
    }

    streamingError(streamId: string, action: string, message: string, error?: Error, data?: any): void {
        this.error(message, { hook: 'useCameraStream', action, streamId }, error, data);
    }

    // ============================================================================
    // 이벤트 관련 로깅
    // ============================================================================

    event(eventId: string, action: string, message: string, data?: any): void {
        this.info(message, { hook: 'useEvent', action, eventId }, data);
    }

    eventError(eventId: string, action: string, message: string, error?: Error, data?: any): void {
        this.error(message, { hook: 'useEvent', action, eventId }, error, data);
    }

    // ============================================================================
    // 모션 감지 관련 로깅
    // ============================================================================

    motion(action: string, message: string, data?: any): void {
        this.info(message, { hook: 'useMotionDetection', action }, data);
    }

    motionError(action: string, message: string, error?: Error, data?: any): void {
        this.error(message, { hook: 'useMotionDetection', action }, error, data);
    }

    // ============================================================================
    // 알림 관련 로깅
    // ============================================================================

    notification(action: string, message: string, data?: any): void {
        this.info(message, { hook: 'useNotification', action }, data);
    }

    notificationError(action: string, message: string, error?: Error, data?: any): void {
        this.error(message, { hook: 'useNotification', action }, error, data);
    }

    // ============================================================================
    // 뷰어 연결 관련 로깅
    // ============================================================================

    viewer(viewerId: string, action: string, message: string, data?: any): void {
        this.info(message, { hook: 'useViewerConnection', action, viewerId }, data);
    }

    viewerError(viewerId: string, action: string, message: string, error?: Error, data?: any): void {
        this.error(message, { hook: 'useViewerConnection', action, viewerId }, error, data);
    }

    // ============================================================================
    // 내부 로깅 로직
    // ============================================================================

    private log(
        level: LogLevel,
        message: string,
        context?: LogContext,
        data?: any,
        error?: Error
    ): void {
        if (level < this.logLevel) return;

        const logEntry: LogEntry = {
            timestamp: Date.now(),
            level,
            message,
            context,
            error,
            data,
        };

        // 로그 배열에 추가
        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // 개발 환경에서 콘솔 출력
        if (this.isDevelopment) {
            this.outputToConsole(logEntry);
        }

        // 프로덕션 환경에서 원격 로깅 (필요시)
        if (!this.isDevelopment && level >= LogLevel.ERROR) {
            this.sendToRemoteLogger(logEntry);
        }
    }

    private outputToConsole(entry: LogEntry): void {
        const { level, message, context, error, data } = entry;
        const timestamp = new Date(entry.timestamp).toISOString();
        const contextStr = context ? ` [${JSON.stringify(context)}]` : '';
        const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : '';
        const errorStr = error ? ` | Error: ${error.message}` : '';

        const logMessage = `[${timestamp}] ${LogLevel[level]}: ${message}${contextStr}${dataStr}${errorStr}`;

        // 무한 재귀 방지를 위해 console.error 대신 console.log 사용
        switch (level) {
            case LogLevel.DEBUG:
                console.debug(logMessage);
                break;
            case LogLevel.INFO:
                console.info(logMessage);
                break;
            case LogLevel.WARN:
                console.warn(logMessage);
                break;
            case LogLevel.ERROR:
            case LogLevel.CRITICAL:
                // console.error 대신 console.log 사용하여 무한 재귀 방지
                console.log(`❌ ERROR: ${logMessage}`);
                if (error) {
                    console.log(`❌ STACK: ${error.stack}`);
                }
                break;
        }
    }

    private async sendToRemoteLogger(entry: LogEntry): Promise<void> {
        try {
            // 원격 로깅 서비스로 전송 (예: Sentry, LogRocket 등)
            // 실제 구현에서는 해당 서비스의 SDK를 사용
            console.log('Sending to remote logger:', entry);
        } catch (error) {
            console.error('Failed to send log to remote logger:', error);
        }
    }

    // ============================================================================
    // 로그 관리
    // ============================================================================

    getLogs(level?: LogLevel, limit?: number): LogEntry[] {
        let filteredLogs = this.logs;

        if (level !== undefined) {
            filteredLogs = filteredLogs.filter(log => log.level >= level);
        }

        if (limit) {
            filteredLogs = filteredLogs.slice(-limit);
        }

        return filteredLogs;
    }

    clearLogs(): void {
        this.logs = [];
    }

    exportLogs(): string {
        return JSON.stringify(this.logs, null, 2);
    }

    // ============================================================================
    // 글로벌 에러 핸들러 설정
    // ============================================================================

    private setupGlobalErrorHandler(): void {
        // 무한 재귀 방지를 위해 글로벌 에러 핸들러 비활성화
        // 필요시 별도의 에러 보고 시스템 사용
        console.log('글로벌 에러 핸들러는 무한 재귀 방지를 위해 비활성화되었습니다.');
    }

    // ============================================================================
    // 성능 측정
    // ============================================================================

    time(label: string): void {
        if (this.isDevelopment) {
            console.time(label);
        }
    }

    timeEnd(label: string): void {
        if (this.isDevelopment) {
            console.timeEnd(label);
        }
    }

    // ============================================================================
    // 메모리 사용량 로깅
    // ============================================================================

    logMemoryUsage(context?: LogContext): void {
        if (typeof performance !== 'undefined' && performance.memory) {
            const memory = (performance as any).memory;
            this.info('Memory usage', context, {
                used: `${Math.round(memory.usedJSHeapSize / 1048576)} MB`,
                total: `${Math.round(memory.totalJSHeapSize / 1048576)} MB`,
                limit: `${Math.round(memory.jsHeapSizeLimit / 1048576)} MB`,
            });
        }
    }
}

// ============================================================================
// 싱글톤 인스턴스 내보내기
// ============================================================================

export const logger = Logger.getInstance();

// ============================================================================
// 편의 함수들
// ============================================================================

export const logHook = (hookName: string, action: string, message: string, data?: any) => {
    logger.hook(hookName, action, message, data);
};

export const logHookError = (hookName: string, action: string, message: string, error?: Error, data?: any) => {
    logger.hookError(hookName, action, message, error, data);
};

export const logCamera = (cameraId: string, action: string, message: string, data?: any) => {
    logger.camera(cameraId, action, message, data);
};

export const logCameraError = (cameraId: string, action: string, message: string, error?: Error, data?: any) => {
    logger.cameraError(cameraId, action, message, error, data);
};

export const logStreaming = (streamId: string, action: string, message: string, data?: any) => {
    logger.streaming(streamId, action, message, data);
};

export const logStreamingError = (streamId: string, action: string, message: string, error?: Error, data?: any) => {
    logger.streamingError(streamId, action, message, error, data);
};

export const logEvent = (eventId: string, action: string, message: string, data?: any) => {
    logger.event(eventId, action, message, data);
};

export const logEventError = (eventId: string, action: string, message: string, error?: Error, data?: any) => {
    logger.eventError(eventId, action, message, error, data);
};

export const logMotion = (action: string, message: string, data?: any) => {
    logger.motion(action, message, data);
};

export const logMotionError = (action: string, message: string, error?: Error, data?: any) => {
    logger.motionError(action, message, error, data);
};

export const logNotification = (action: string, message: string, data?: any) => {
    logger.notification(action, message, data);
};

export const logNotificationError = (action: string, message: string, error?: Error, data?: any) => {
    logger.notificationError(action, message, error, data);
};

export const logViewer = (viewerId: string, action: string, message: string, data?: any) => {
    logger.viewer(viewerId, action, message, data);
};

export const logViewerError = (viewerId: string, action: string, message: string, error?: Error, data?: any) => {
    logger.viewerError(viewerId, action, message, error, data);
};

// ============================================================================
// createLogger 함수 - 서비스별 로거 생성
// ============================================================================

export const createLogger = (serviceName: string) => {
    return {
        debug: (message: string, data?: any) => logger.debug(message, { service: serviceName }, data),
        info: (message: string, data?: any) => logger.info(message, { service: serviceName }, data),
        warn: (message: string, data?: any) => logger.warn(message, { service: serviceName }, data),
        error: (message: string, error?: Error, data?: any) => logger.error(message, { service: serviceName }, error, data),
        critical: (message: string, error?: Error, data?: any) => logger.critical(message, { service: serviceName }, error, data),
        // 인증 서비스 전용 메서드들
        logUserAction: (action: string, data?: any) => logger.info(`User Action: ${action}`, { service: serviceName, action }, data),
        logAuthEvent: (event: string, data?: any) => logger.info(`Auth Event: ${event}`, { service: serviceName, event }, data),
        // API 서비스 전용 메서드들
        logApiRequest: (method: string, url: string, data?: any) => logger.info(`API Request: ${method} ${url}`, { service: serviceName, method, url }, data),
        logApiResponse: (method: string, url: string, status: number, data?: any) => logger.info(`API Response: ${method} ${url} (${status})`, { service: serviceName, method, url, status }, data),
        logApiError: (method: string, url: string, error?: Error) => logger.error(`API Error: ${method} ${url}`, { service: serviceName, method, url }, error),
        // WebSocket 서비스 전용 메서드들
        logWebSocketEvent: (event: string, data?: any) => logger.info(`WebSocket: ${event}`, { service: serviceName, event }, data),
    };
}; 