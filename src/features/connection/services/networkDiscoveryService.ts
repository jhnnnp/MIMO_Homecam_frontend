import { logger } from '@/shared/utils/logger';

interface ServerInfo {
    ip: string;
    port: number;
    isAvailable: boolean;
    responseTime?: number;
}

interface NetworkRange {
    baseIP: string;
    startRange: number;
    endRange: number;
}

class NetworkDiscoveryService {
    private static instance: NetworkDiscoveryService;
    private discoveredServers: ServerInfo[] = [];
    private currentServerIP: string | null = null;
    private scanInProgress: boolean = false;

    // 일반적인 로컬 네트워크 범위들
    private commonNetworkRanges: NetworkRange[] = [
        { baseIP: '192.168.0', startRange: 1, endRange: 254 },
        { baseIP: '192.168.1', startRange: 1, endRange: 254 },
        { baseIP: '192.168.123', startRange: 1, endRange: 254 },
        { baseIP: '10.0.0', startRange: 1, endRange: 254 },
        { baseIP: '172.16.0', startRange: 1, endRange: 254 },
    ];

    private constructor() { }

    static getInstance(): NetworkDiscoveryService {
        if (!NetworkDiscoveryService.instance) {
            NetworkDiscoveryService.instance = new NetworkDiscoveryService();
        }
        return NetworkDiscoveryService.instance;
    }

    /**
 * 단일 IP에서 서버 상태 확인
 */
    private async checkServerHealth(ip: string, port: number = 4001, timeout: number = 3000): Promise<ServerInfo> {
        const startTime = Date.now();

        try {
            // AbortController 안전 확인
            if (typeof AbortController === 'undefined') {
                throw new Error('AbortController not supported');
            }

            // 간단한 fetch를 사용해서 서버 응답 확인
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                try {
                    controller.abort();
                } catch (abortError) {
                    // abort 실패는 무시
                }
            }, timeout);

            const response = await fetch(`http://${ip}:${port}/api/health`, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                },
            });

            clearTimeout(timeoutId);
            const responseTime = Date.now() - startTime;

            if (response && response.ok) {
                logger.debug(`✅ 서버 발견: ${ip}:${port} (${responseTime}ms)`);
                return {
                    ip,
                    port,
                    isAvailable: true,
                    responseTime,
                };
            } else {
                return {
                    ip,
                    port,
                    isAvailable: false,
                };
            }
        } catch (error) {
            // 모든 에러를 안전하게 처리
            logger.debug(`❌ 서버 응답 없음: ${ip}:${port} - ${error instanceof Error ? error.message : 'Unknown error'}`);
            return {
                ip,
                port,
                isAvailable: false,
            };
        }
    }

    /**
     * 네트워크 범위 스캔
     */
    private async scanNetworkRange(range: NetworkRange, port: number = 4001): Promise<ServerInfo[]> {
        const servers: ServerInfo[] = [];
        const batchSize = 10; // 동시에 스캔할 IP 수

        logger.info(`🔍 네트워크 스캔 시작: ${range.baseIP}.${range.startRange}-${range.endRange}`);

        for (let i = range.startRange; i <= range.endRange; i += batchSize) {
            const batch: Promise<ServerInfo>[] = [];

            for (let j = i; j < Math.min(i + batchSize, range.endRange + 1); j++) {
                const ip = `${range.baseIP}.${j}`;
                batch.push(this.checkServerHealth(ip, port, 2000)); // 짧은 타임아웃
            }

            const results = await Promise.all(batch);
            const availableServers = results.filter(server => server.isAvailable);
            servers.push(...availableServers);

            // 서버를 찾으면 빠른 종료
            if (availableServers.length > 0) {
                logger.info(`🎯 서버 발견됨! 스캔 중단`);
                break;
            }
        }

        return servers;
    }

    /**
     * 전체 네트워크에서 서버 검색
     */
    async discoverServers(port: number = 4001): Promise<ServerInfo[]> {
        if (this.scanInProgress) {
            logger.warn('⚠️ 이미 스캔이 진행 중입니다');
            return this.discoveredServers;
        }

        this.scanInProgress = true;
        this.discoveredServers = [];

        try {
            logger.info('🔍 네트워크 서버 검색 시작...');

            // 현재 설정된 IP가 있다면 먼저 확인
            if (this.currentServerIP) {
                const currentServer = await this.checkServerHealth(this.currentServerIP, port);
                if (currentServer.isAvailable) {
                    logger.info(`✅ 기존 서버 여전히 사용 가능: ${this.currentServerIP}`);
                    this.discoveredServers = [currentServer];
                    return this.discoveredServers;
                } else {
                    logger.warn(`❌ 기존 서버 응답 없음: ${this.currentServerIP}`);
                }
            }

            // 네트워크 범위별로 스캔
            for (const range of this.commonNetworkRanges) {
                const servers = await this.scanNetworkRange(range, port);
                this.discoveredServers.push(...servers);

                // 서버를 찾으면 다른 범위는 스캔하지 않음
                if (servers.length > 0) {
                    break;
                }
            }

            // 응답 시간 기준으로 정렬 (빠른 순)
            this.discoveredServers.sort((a, b) => {
                const timeA = a.responseTime || 9999;
                const timeB = b.responseTime || 9999;
                return timeA - timeB;
            });

            if (this.discoveredServers.length > 0) {
                const bestServer = this.discoveredServers[0];
                this.currentServerIP = bestServer.ip;
                logger.info(`🎯 최적 서버 선택: ${bestServer.ip}:${bestServer.port} (${bestServer.responseTime}ms)`);
            } else {
                logger.error('❌ 사용 가능한 서버를 찾을 수 없습니다');
            }

            return this.discoveredServers;

        } catch (error) {
            logger.error('❌ 네트워크 검색 실패:', error instanceof Error ? error : new Error('Unknown error'));
            return [];
        } finally {
            this.scanInProgress = false;
        }
    }

    /**
     * 자동으로 최적의 서버 IP 반환
     */
    async getOptimalServerIP(port: number = 4001): Promise<string | null> {
        const servers = await this.discoverServers(port);
        if (servers.length > 0) {
            return servers[0].ip;
        }
        return null;
    }

    /**
     * 현재 사용 중인 서버 IP 반환
     */
    getCurrentServerIP(): string | null {
        return this.currentServerIP;
    }

    /**
     * 서버 IP 수동 설정
     */
    setCurrentServerIP(ip: string): void {
        this.currentServerIP = ip;
        logger.info(`📍 서버 IP 수동 설정: ${ip}`);
    }

    /**
     * 발견된 모든 서버 목록 반환
     */
    getDiscoveredServers(): ServerInfo[] {
        return [...this.discoveredServers];
    }

    /**
     * 주기적으로 서버 상태 확인 및 IP 업데이트
     */
    async startAutoDiscovery(intervalMs: number = 30000): Promise<void> {
        logger.info(`🔄 자동 서버 검색 시작 (${intervalMs}ms 간격)`);

        const autoScan = async () => {
            try {
                await this.discoverServers();
            } catch (error) {
                logger.error('❌ 자동 검색 실패:', error instanceof Error ? error : new Error('Unknown error'));
            }
        };

        // 즉시 한 번 실행
        await autoScan();

        // 주기적 실행
        setInterval(autoScan, intervalMs);
    }

    /**
     * 빠른 연결성 테스트 (기존 서버만)
     */
    async quickHealthCheck(): Promise<boolean> {
        if (!this.currentServerIP) {
            return false;
        }

        const result = await this.checkServerHealth(this.currentServerIP, 4001, 5000);
        return result.isAvailable;
    }
}

export const networkDiscovery = NetworkDiscoveryService.getInstance();
export type { ServerInfo, NetworkRange }; 