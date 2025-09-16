import { Platform } from 'react-native';
import { NetworkInfo } from 'react-native-network-info';

/**
 * 네트워크 유틸리티 클래스
 * 동적 IP 감지 및 환경 설정 관리
 */
export class NetworkUtils {
    private static instance: NetworkUtils;
    private cachedIP: string | null = null;

    private constructor() { }

    static getInstance(): NetworkUtils {
        if (!NetworkUtils.instance) {
            NetworkUtils.instance = new NetworkUtils();
        }
        return NetworkUtils.instance;
    }

    /**
     * 현재 디바이스의 로컬 IP 주소를 가져옴
     */
    async getLocalIP(): Promise<string> {
        if (this.cachedIP) {
            return this.cachedIP;
        }

        try {
            if (Platform.OS === 'ios') {
                const ip = await NetworkInfo.getIPV4Address();
                this.cachedIP = ip || '192.168.123.103';
            } else {
                // Android의 경우
                const ip = await NetworkInfo.getIPV4Address();
                this.cachedIP = ip || '192.168.123.103';
            }

            console.log('🌐 [NETWORK] 감지된 IP 주소:', this.cachedIP);
            return this.cachedIP;
        } catch (error) {
            console.warn('⚠️ [NETWORK] IP 감지 실패, 하드코딩된 IP 사용:', error);
            this.cachedIP = '192.168.123.103'; // 하드코딩된 IP 사용
            return this.cachedIP;
        }
    }

    /**
     * 개발 환경에서 사용할 API URL 생성
     */
    async getApiUrl(): Promise<string> {
        const ip = await this.getLocalIP();
        return `http://${ip}:4001/api`;
    }

    /**
     * 개발 환경에서 사용할 WebSocket URL 생성
     */
    async getWebSocketUrl(): Promise<string> {
        const ip = await this.getLocalIP();
        return `ws://${ip}:4001`;
    }

    /**
     * 환경 변수 동적 업데이트
     */
    async updateEnvironmentVariables(): Promise<void> {
        try {
            const apiUrl = await this.getApiUrl();
            const wsUrl = await this.getWebSocketUrl();

            // 환경 변수 동적 설정 (런타임에서만 가능)
            if (typeof global !== 'undefined') {
                (global as any).EXPO_PUBLIC_API_URL = apiUrl;
                (global as any).EXPO_PUBLIC_WS_URL = wsUrl;
            }

            console.log('✅ [NETWORK] 환경 변수 업데이트 완료');
            console.log('🌐 [NETWORK] API URL:', apiUrl);
            console.log('🔌 [NETWORK] WebSocket URL:', wsUrl);
        } catch (error) {
            console.error('❌ [NETWORK] 환경 변수 업데이트 실패:', error);
        }
    }

    /**
     * 네트워크 연결 상태 확인
     */
    async checkNetworkConnection(): Promise<boolean> {
        try {
            const ip = await this.getLocalIP();
            return ip !== 'localhost' && ip !== '127.0.0.1';
        } catch (error) {
            console.warn('⚠️ [NETWORK] 네트워크 연결 확인 실패:', error);
            return false;
        }
    }

    /**
     * 캐시된 IP 초기화
     */
    clearCache(): void {
        this.cachedIP = null;
        console.log('🗑️ [NETWORK] IP 캐시 초기화');
    }
}

// 싱글톤 인스턴스 export
export const networkUtils = NetworkUtils.getInstance(); 