import { simpleNetworkDiscovery } from '@/features/connection/services/simpleNetworkDiscovery';
import { logger } from '@/shared/utils/logger';
import { networkUtils } from '@/shared/utils/networkUtils';

interface AppConfig {
    apiBaseUrl: string;
    wsBaseUrl: string;
    serverPort: number;
    environment: 'development' | 'production';
    autoDiscovery: boolean;
    api: {
        retryAttempts: number;
        retryDelay: number;
        timeout: number;
    };
    websocket: {
        host: string;
        port: number;
        secure: boolean;
        reconnectAttempts: number;
        heartbeatInterval: number;
    };
}

class ConfigService {
    private static instance: ConfigService;
    private config: AppConfig;
    private isInitialized: boolean = false;

    private constructor() {
        // 기본 설정 - 자동 감지로 대체될 예정
        this.config = {
            apiBaseUrl: 'http://localhost:4001/api', // 기본값
            wsBaseUrl: 'ws://localhost:4001', // 기본값을 API 포트로 통일
            serverPort: 4001,
            environment: __DEV__ ? 'development' : 'production',
            autoDiscovery: true,
            api: {
                retryAttempts: 3,
                retryDelay: 1000,
                timeout: 10000,
            },
            websocket: {
                host: 'localhost',
                port: 8080, // 별도 WebSocket 서버 포트
                secure: false,
                reconnectAttempts: 5,
                heartbeatInterval: 30000,
            },
        };
    }

    static getInstance(): ConfigService {
        if (!ConfigService.instance) {
            ConfigService.instance = new ConfigService();
        }
        return ConfigService.instance;
    }

    /**
     * 현재 기기의 네트워크 IP 범위 추정
     */
    private async getCurrentNetworkRanges(): Promise<string[]> {
        try {
            const localIP = await networkUtils.getLocalIP();
            // a.b.c.d → a.b.c
            const parts = localIP.split('.');
            if (parts.length === 4) {
                const dynamicRange = `${parts[0]}.${parts[1]}.${parts[2]}`;
                return [dynamicRange, '192.168.73', '192.168.1', '192.168.0', '10.0.0', '172.16.0'];
            }
        } catch { /* ignore */ }
        return ['192.168.1', '192.168.0', '10.0.0', '172.16.0'];
    }

    /**
     * 가능한 IP 주소들 생성
     */
    private async generatePossibleIPs(): Promise<string[]> {
        const ranges = await this.getCurrentNetworkRanges();
        const ips: string[] = [];
        for (const range of ranges) {
            for (let i = 1; i <= 254; i++) {
                ips.push(`${range}.${i}`);
            }
        }
        return ips;
    }

    /**
     * 백엔드 서버 자동 검색
     */
    private async findBackendServer(): Promise<string | null> {
        logger.info('🔍 백엔드 서버 자동 검색 시작...');

        const possibleIPs = await this.generatePossibleIPs();
        const batchSize = 20; // 동시에 10개씩 테스트

        for (let i = 0; i < Math.min(possibleIPs.length, 100); i += batchSize) {
            const batch = possibleIPs.slice(i, i + batchSize);

            const promises = batch.map(async (ip) => {
                try {
                    const response = await Promise.race([
                        fetch(`http://${ip}:${this.config.serverPort}/api/health`, {
                            method: 'GET',
                            headers: { 'Accept': 'application/json' },
                        }),
                        new Promise<never>((_, reject) =>
                            setTimeout(() => reject(new Error('Timeout')), 2000)
                        )
                    ]);

                    if (response && response.ok) {
                        logger.info(`✅ 백엔드 서버 발견: ${ip}:${this.config.serverPort}`);
                        return ip;
                    }
                } catch (error) {
                    // 무시 - 서버가 없거나 응답하지 않음
                }
                return null;
            });

            const results = await Promise.all(promises);
            const foundIP = results.find(ip => ip !== null);

            if (foundIP) {
                return foundIP;
            }
        }

        logger.warn('⚠️ 백엔드 서버를 찾을 수 없습니다.');
        return null;
    }

    /**
     * 설정 초기화 및 네트워크 디스커버리 시작
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            logger.info('🚀 Config 서비스 초기화 시작...');

            let discoveredIP: string | null = null;

            if (this.config.autoDiscovery) {
                logger.info('🔍 자동 서버 검색 활성화됨');
                discoveredIP = await this.findBackendServer();
            }

            // 자동 검색이 실패했더라도 기본 네트워크 범위에서 재시도하지 않고 기존 설정 유지
            if (discoveredIP) {
                await this.updateServerIP(discoveredIP);
                logger.info(`✅ 서버 자동 발견: ${discoveredIP}`);
            } else {
                logger.warn('⚠️ 자동 서버 발견 실패, 기본 설정 사용');
            }

            this.isInitialized = true;
            logger.info('✅ Config 서비스 초기화 완료');

        } catch (error) {
            logger.error('❌ Config 서비스 초기화 실패:', error instanceof Error ? error : new Error('Unknown error'));
            this.isInitialized = true; // 실패해도 기본 설정으로 진행
        }
    }

    /**
     * 서버 IP 업데이트
     */
    async updateServerIP(newIP: string): Promise<void> {
        logger.info(`🔄 서버 IP 업데이트: ${this.getServerIP()} -> ${newIP}`);

        this.config.apiBaseUrl = `http://${newIP}:${this.config.serverPort}/api`;
        this.config.wsBaseUrl = `ws://${newIP}:${this.config.serverPort}`; // WS도 API 포트 사용 (/ws 경로는 클라이언트에서 추가)

        // WebSocket 설정도 업데이트
        this.config.websocket.host = newIP;

        simpleNetworkDiscovery.setCurrentIP(newIP);

        // 다른 서비스들에게 IP 변경 알림
        this.notifyIPChange(newIP);
    }

    /**
     * IP 변경 알림 (다른 서비스들이 구독할 수 있도록)
     */
    private notifyIPChange(newIP: string): void {
        // 향후 다른 서비스들이 IP 변경을 구독할 수 있도록 이벤트 시스템 구현 가능
        logger.info(`📢 IP 변경 알림: ${newIP}`);
    }

    /**
     * 현재 API Base URL 반환
     */
    getApiBaseUrl(): string {
        return this.config.apiBaseUrl;
    }

    /**
     * 현재 WebSocket Base URL 반환
     */
    getWsBaseUrl(): string {
        return this.config.wsBaseUrl;
    }

    /**
     * 현재 WebSocket URL 반환 (getWebSocketUrl 별칭)
     */
    getWebSocketUrl(): string {
        return this.config.wsBaseUrl;
    }

    /**
     * 현재 서버 IP 반환
     */
    getServerIP(): string {
        try {
            const url = new URL(this.config.apiBaseUrl);
            return url.hostname;
        } catch {
            return 'localhost';
        }
    }

    /**
     * 서버 포트 반환
     */
    getServerPort(): number {
        return this.config.serverPort;
    }

    /**
     * 환경 설정 반환
     */
    getEnvironment(): 'development' | 'production' {
        return this.config.environment;
    }

    /**
     * 자동 디스커버리 활성화/비활성화
     */
    setAutoDiscovery(enabled: boolean): void {
        this.config.autoDiscovery = enabled;
        logger.info(`🔄 자동 디스커버리 ${enabled ? '활성화' : '비활성화'}`);
    }

    /**
     * 수동으로 서버 연결 테스트
     */
    async testConnection(): Promise<boolean> {
        try {
            // AbortController로 타임아웃 처리
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                try {
                    controller.abort();
                } catch (abortError) {
                    // abort 실패는 무시
                }
            }, 5000);

            const response = await fetch(`${this.config.apiBaseUrl}/health`, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                },
            });

            clearTimeout(timeoutId);
            return response && response.ok;
        } catch (error) {
            logger.error('❌ 연결 테스트 실패:', error instanceof Error ? error : new Error('Unknown error'));
            return false;
        }
    }

    /**
     * 네트워크 재검색 강제 실행
     */
    async forceRediscover(): Promise<boolean> {
        logger.info('🔄 네트워크 재검색 강제 실행...');

        const serverIP = await this.findBackendServer();

        if (serverIP && serverIP !== this.getServerIP()) {
            await this.updateServerIP(serverIP);
            return true;
        }

        return false;
    }

    /**
     * 발견된 서버 목록 반환
     */
    getDiscoveredServers() {
        // 간단한 버전에서는 현재 IP만 반환
        const currentIP = simpleNetworkDiscovery.getCurrentIP();
        return currentIP ? [{ ip: currentIP, port: this.config.serverPort, isOnline: true }] : [];
    }

    /**
     * API 설정 반환
     */
    getApiConfig() {
        return this.config.api;
    }

    /**
     * 전체 설정 객체 반환 (디버깅용)
     */
    getConfig(): AppConfig {
        return { ...this.config };
    }
}

// 싱글톤 인스턴스
const configService = ConfigService.getInstance();

// 편의 함수들
export const getApiBaseUrl = (): string => configService.getApiBaseUrl();
export const getWsBaseUrl = (): string => configService.getWsBaseUrl();
export const getWebSocketUrl = (): string => configService.getWebSocketUrl();
export const getServerIP = (): string => configService.getServerIP();
export const getServerPort = (): number => configService.getServerPort();
export const initializeConfig = (): Promise<void> => configService.initialize();
export const forceRediscover = (): Promise<boolean> => configService.forceRediscover();
export const testConnection = (): Promise<boolean> => configService.testConnection();

export default configService;
export type { AppConfig };
