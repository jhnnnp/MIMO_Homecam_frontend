import { useState, useCallback, useEffect } from 'react';
import { connectionService, ConnectionGenerateResponse, ConnectionConnectResponse, ConnectionStatus } from './connectionService';

export interface UseConnectionOptions {
  cameraId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseConnectionReturn {
  // 상태
  connectionData: ConnectionGenerateResponse | null;
  connectionStatus: ConnectionStatus | null;
  isConnecting: boolean;
  isGenerating: boolean;
  error: string | null;
  
  // 액션
  generatePinCode: (cameraId: string, customPin?: string) => Promise<void>;
  generateQRCode: (cameraId: string) => Promise<void>;
  connectWithPin: (pinCode: string) => Promise<ConnectionConnectResponse | null>;
  connectWithQR: (qrCode: string) => Promise<ConnectionConnectResponse | null>;
  refreshConnection: () => Promise<void>;
  disconnectConnection: () => Promise<void>;
  checkConnectionStatus: () => Promise<void>;
  clearError: () => void;
  
  // 유틸리티
  timeLeft: number; // 남은 시간 (초)
  isExpired: boolean;
  canRefresh: boolean;
}

export const useConnection = (options: UseConnectionOptions = {}): UseConnectionReturn => {
  const { cameraId, autoRefresh = true, refreshInterval = 30000 } = options;
  
  const [connectionData, setConnectionData] = useState<ConnectionGenerateResponse | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 남은 시간 계산
  const timeLeft = connectionData 
    ? Math.max(0, Math.floor((new Date(connectionData.expiresAt).getTime() - Date.now()) / 1000))
    : 0;
  
  const isExpired = timeLeft === 0 && connectionData !== null;
  const canRefresh = connectionData !== null && !isConnecting && !isGenerating;

  // 에러 클리어
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // PIN 코드 생성
  const generatePinCode = useCallback(async (cameraId: string, customPin?: string) => {
    try {
      setIsGenerating(true);
      setError(null);
      
      const data = await connectionService.generatePinCode(cameraId, customPin);
      setConnectionData(data);
      setConnectionStatus(null);
    } catch (err: any) {
      setError(err.message || 'PIN 코드 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // QR 코드 생성
  const generateQRCode = useCallback(async (cameraId: string) => {
    try {
      setIsGenerating(true);
      setError(null);
      
      const data = await connectionService.generateQRCode(cameraId);
      setConnectionData(data);
      setConnectionStatus(null);
    } catch (err: any) {
      setError(err.message || 'QR 코드 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // PIN 코드로 연결
  const connectWithPin = useCallback(async (pinCode: string): Promise<ConnectionConnectResponse | null> => {
    try {
      setIsConnecting(true);
      setError(null);
      
      const result = await connectionService.connectWithPin(pinCode);
      setConnectionStatus({
        id: result.connectionId,
        pinCode: result.pinCode,
        status: 'active',
        cameraInfo: {
          cameraId: result.cameraId,
          cameraName: result.cameraName
        },
        connectionType: 'pin'
      });
      
      return result;
    } catch (err: any) {
      setError(err.message || 'PIN 코드 연결에 실패했습니다.');
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // QR 코드로 연결
  const connectWithQR = useCallback(async (qrCode: string): Promise<ConnectionConnectResponse | null> => {
    try {
      setIsConnecting(true);
      setError(null);
      
      const result = await connectionService.connectWithQR(qrCode);
      setConnectionStatus({
        id: result.connectionId,
        status: 'active',
        cameraInfo: {
          cameraId: result.cameraId,
          cameraName: result.cameraName
        },
        connectionType: 'qr'
      });
      
      return result;
    } catch (err: any) {
      setError(err.message || 'QR 코드 연결에 실패했습니다.');
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // 연결 갱신
  const refreshConnection = useCallback(async () => {
    if (!connectionData) return;
    
    try {
      setIsGenerating(true);
      setError(null);
      
      const newData = await connectionService.refreshConnection(
        connectionData.connectionId, 
        connectionData.type
      );
      setConnectionData(newData);
    } catch (err: any) {
      setError(err.message || '연결 갱신에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  }, [connectionData]);

  // 연결 종료
  const disconnectConnection = useCallback(async () => {
    if (!connectionData) return;
    
    try {
      await connectionService.disconnectConnection(
        connectionData.connectionId, 
        connectionData.type
      );
      setConnectionData(null);
      setConnectionStatus(null);
    } catch (err: any) {
      setError(err.message || '연결 종료에 실패했습니다.');
    }
  }, [connectionData]);

  // 연결 상태 확인
  const checkConnectionStatus = useCallback(async () => {
    if (!connectionData) return;
    
    try {
      const status = await connectionService.getConnectionStatus(
        connectionData.connectionId, 
        connectionData.type
      );
      setConnectionStatus(status);
    } catch (err: any) {
      setError(err.message || '연결 상태 확인에 실패했습니다.');
    }
  }, [connectionData]);

  // 자동 갱신
  useEffect(() => {
    if (!autoRefresh || !connectionData || isExpired) return;

    const interval = setInterval(() => {
      if (timeLeft <= 60) { // 1분 이하일 때 갱신
        refreshConnection();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, connectionData, isExpired, timeLeft, refreshInterval, refreshConnection]);

  // 만료 시 자동 정리
  useEffect(() => {
    if (isExpired && connectionData) {
      setConnectionData(null);
      setConnectionStatus(null);
    }
  }, [isExpired, connectionData]);

  return {
    // 상태
    connectionData,
    connectionStatus,
    isConnecting,
    isGenerating,
    error,
    
    // 액션
    generatePinCode,
    generateQRCode,
    connectWithPin,
    connectWithQR,
    refreshConnection,
    disconnectConnection,
    checkConnectionStatus,
    clearError,
    
    // 유틸리티
    timeLeft,
    isExpired,
    canRefresh
  };
};
