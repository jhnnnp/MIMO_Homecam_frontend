import { logger } from '@/shared/utils/logger';

interface SimpleServerInfo {
    ip: string;
    port: number;
    isOnline: boolean;
}

class SimpleNetworkDiscovery {
    private static instance: SimpleNetworkDiscovery;
    private currentIP: string | null = null;

    private constructor() { }

    static getInstance(): SimpleNetworkDiscovery {
        if (!SimpleNetworkDiscovery.instance) {
            SimpleNetworkDiscovery.instance = new SimpleNetworkDiscovery();
        }
        return SimpleNetworkDiscovery.instance;
    }

    /**
     * 간단한 서버 핑 테스트
     */
    private async pingServer(ip: string, port: number = 4001): Promise<boolean> {
        try {
            const startTime = Date.now();

            const response = await Promise.race([
                fetch(`http://${ip}:${port}/api/profile`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                }),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), 3000)
                )
            ]);

            const endTime = Date.now();
            logger.debug(`✅ 서버 응답: ${ip} (${endTime - startTime}ms)`);

            // 토큰이 없어도 서버가 응답하면 서버가 실행 중인 것으로 간주
            return response instanceof Response;
        } catch (error) {
            logger.debug(`❌ 서버 응답 없음: ${ip}`);
            return false;
        }
    }

    /**
     * 일반적인 로컬 IP 범위에서 서버 검색
     */
    async findServer(): Promise<string | null> {
        // 현재 설정된 IP가 있다면 먼저 확인
        if (this.currentIP) {
            const isOnline = await this.pingServer(this.currentIP);
            if (isOnline) {
                logger.info(`✅ 기존 서버 사용 가능: ${this.currentIP}`);
                return this.currentIP;
            }
            logger.warn(`❌ 기존 서버 응답 없음: ${this.currentIP}`);
        }

        // 일반적인 로컬 네트워크 IP들 (현재 IP를 우선)
        const commonIPs = [
            '192.168.0.9',    // 현재 실제 IP (우선)
            '192.168.0.1',
            '192.168.0.100',
            '192.168.0.101',
            '192.168.1.1',
            '192.168.1.100',
            '192.168.1.101',
            '192.168.123.103', // 기존 기본값
            '10.0.0.1',
            '172.16.0.1',
        ];

        logger.info('🔍 서버 검색 시작...');

        // 순차적으로 확인 (동시 요청으로 인한 문제 방지)
        for (const ip of commonIPs) {
            try {
                const isOnline = await this.pingServer(ip);
                if (isOnline) {
                    this.currentIP = ip;
                    logger.info(`🎯 서버 발견: ${ip}`);
                    return ip;
                }
            } catch (error) {
                // 개별 IP 확인 실패는 무시하고 계속
                continue;
            }
        }

        // 동적 범위 스캔 (최후의 수단)
        const ranges = ['192.168.0', '192.168.1'];
        for (const range of ranges) {
            // 몇 개의 일반적인 IP만 확인
            const testIPs = [1, 2, 100, 101, 102, 103, 104, 105];

            for (const lastOctet of testIPs) {
                const ip = `${range}.${lastOctet}`;
                try {
                    const isOnline = await this.pingServer(ip);
                    if (isOnline) {
                        this.currentIP = ip;
                        logger.info(`🎯 서버 발견: ${ip}`);
                        return ip;
                    }
                } catch (error) {
                    // 계속 진행
                    continue;
                }
            }
        }

        logger.error('❌ 사용 가능한 서버를 찾을 수 없습니다');
        return null;
    }

    /**
     * 현재 IP 반환
     */
    getCurrentIP(): string | null {
        return this.currentIP;
    }

    /**
     * IP 수동 설정
     */
    setCurrentIP(ip: string): void {
        this.currentIP = ip;
        logger.info(`📍 서버 IP 설정: ${ip}`);
    }

    /**
     * 현재 서버 연결 상태 확인
     */
    async checkCurrentServer(): Promise<boolean> {
        if (!this.currentIP) {
            return false;
        }
        return await this.pingServer(this.currentIP);
    }
}

export const simpleNetworkDiscovery = SimpleNetworkDiscovery.getInstance();
export type { SimpleServerInfo }; 