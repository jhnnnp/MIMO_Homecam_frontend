import { simpleNetworkDiscovery } from '../services/simpleNetworkDiscovery';
import { logger } from '../utils/logger';

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
}

class ConfigService {
    private static instance: ConfigService;
    private config: AppConfig;
    private isInitialized: boolean = false;

    private constructor() {
        // 기본 설정 - 자동 감지로 대체될 예정
        this.config = {
            apiBaseUrl: 'http://localhost:4001/api', // 기본값
            wsBaseUrl: 'ws://localhost:8080', // 기본값
            serverPort: 4001,
            environment: __DEV__ ? 'development' : 'production',
            autoDiscovery: true,
            api: {
                retryAttempts: 3,
                retryDelay: 1000,
                timeout: 10000,
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
    private getCurrentNetworkRange(): string[] {
        // React Native에서는 직접 네트워크 정보를 가져올 수 없으므로
        // 일반적인 로컬 네트워크 범위들을 시도
        const commonRanges = [
            '192.168.1',   // 일반적인 홈 라우터
            '192.168.0',   // 일반적인 홈 라우터
            '192.168.78',  // 현재 사용 중인 범위
            '10.0.0',      // 기업용
            '172.16.0',    // 기업용
        ];
        
        return commonRanges;
    }

    /**
     * 가능한 IP 주소들 생성
     */
    private generatePossibleIPs(): string[] {
        const ranges = this.getCurrentNetworkRange();
        const ips: string[] = [];
        
        ranges.forEach(range => {
            // 각 범위에서 1-254까지 시도
            for (let i = 1; i <= 254; i++) {
                ips.push(`${range}.${i}`);
            }
        });
        
        return ips;
    }

    /**
     * 백엔드 서버 자동 검색
     */
    private async findBackendServer(): Promise<string | null> {
        logger.info('🔍 백엔드 서버 자동 검색 시작...');
        
        const possibleIPs = this.generatePossibleIPs();
        const batchSize = 10; // 동시에 10개씩 테스트
        
        for (let i = 0; i < possibleIPs.length; i += batchSize) {
            const batch = possibleIPs.slice(i, i + batchSize);
            
            const promises = batch.map(async (ip) => {
                try {
                    const response = await Promise.race([
                        fetch(`http://${ip}:${this.config.serverPort}/api/health`, {
                            method: 'GET',
                            headers: { 'Accept': 'application/json' },
                            timeout: 2000,
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

            if (this.config.autoDiscovery) {
                logger.info('🔍 자동 서버 검색 활성화됨');

                // 백엔드 서버 자동 검색
                const serverIP = await this.findBackendServer();

                if (serverIP) {
                    await this.updateServerIP(serverIP);
                    logger.info(`✅ 서버 자동 발견: ${serverIP}`);
                } else {
                    logger.warn('⚠️ 자동 서버 발견 실패, 기본 설정 사용');
                }
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
        this.config.wsBaseUrl = `ws://${newIP}:8080`; // WebSocket은 항상 8080 포트

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
