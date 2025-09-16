import { api } from '@/shared/services/api/api';

export interface ConnectionGenerateRequest {
  cameraId: string;
  connectionType: 'pin' | 'qr';
  customPin?: string;
}

export interface ConnectionGenerateResponse {
  connectionId: string;
  pinCode?: string;
  qrCode?: string;
  qrImage?: string;
  expiresAt: string;
  ttl: number;
  type: 'pin' | 'qr';
  cameraInfo: {
    id: number;
    name: string;
    deviceId: string;
  };
  media: {
    publisherUrl: string;
  };
  message: string;
}

export interface ConnectionConnectRequest {
  connectionType: 'pin' | 'qr';
  pinCode?: string;
  qrCode?: string;
}

export interface ConnectionConnectResponse {
  connectionId: string;
  pinCode?: string;
  cameraId: string;
  cameraName: string;
  status: string;
  connectionType: 'pin' | 'qr';
  media: {
    viewerUrl: string;
  };
  message: string;
}

export interface ConnectionStatus {
  id?: string;
  pinCode?: string;
  status: 'active' | 'expired' | 'error';
  cameraInfo?: any;
  viewers?: number;
  viewerList?: any[];
  error?: string;
}

export interface ActiveConnections {
  qr: {
    total: number;
    cameras: number;
    viewers: number;
  };
  pin: {
    total: number;
    cameras: number;
    viewers: number;
  };
  total: {
    cameras: number;
    viewers: number;
    connections: number;
  };
}

class ConnectionService {
  /**
   * 연결 생성 (PIN 또는 QR)
   */
  async generateConnection(data: ConnectionGenerateRequest): Promise<ConnectionGenerateResponse> {
    const response = await api.post('/connections/generate', data);
    return response.data.data;
  }

  /**
   * 연결 실행 (PIN 입력 또는 QR 스캔)
   */
  async connectToCamera(data: ConnectionConnectRequest): Promise<ConnectionConnectResponse> {
    const response = await api.post('/connections/connect', data);
    return response.data.data;
  }

  /**
   * 연결 갱신
   */
  async refreshConnection(connectionId: string, connectionType: 'pin' | 'qr'): Promise<ConnectionGenerateResponse> {
    const response = await api.post(`/connections/${connectionId}/refresh`, { connectionType });
    return response.data.data;
  }

  /**
   * 연결 상태 확인
   */
  async getConnectionStatus(connectionId: string, type?: 'pin' | 'qr'): Promise<ConnectionStatus> {
    const params = type ? `?type=${type}` : '';
    const response = await api.get(`/connections/${connectionId}/status${params}`);
    return response.data.data;
  }

  /**
   * 연결 종료
   */
  async disconnectConnection(connectionId: string, connectionType: 'pin' | 'qr'): Promise<void> {
    await api.delete(`/connections/${connectionId}`, { data: { connectionType } });
  }

  /**
   * 활성 연결 목록 조회
   */
  async getActiveConnections(): Promise<ActiveConnections> {
    const response = await api.get('/connections/active');
    return response.data.data;
  }

  /**
   * PIN 코드 생성 (간편 메서드)
   */
  async generatePinCode(cameraId: string, customPin?: string): Promise<ConnectionGenerateResponse> {
    return this.generateConnection({
      cameraId,
      connectionType: 'pin',
      customPin
    });
  }

  /**
   * QR 코드 생성 (간편 메서드)
   */
  async generateQRCode(cameraId: string): Promise<ConnectionGenerateResponse> {
    return this.generateConnection({
      cameraId,
      connectionType: 'qr'
    });
  }

  /**
   * PIN 코드로 연결 (간편 메서드)
   */
  async connectWithPin(pinCode: string): Promise<ConnectionConnectResponse> {
    return this.connectToCamera({
      connectionType: 'pin',
      pinCode
    });
  }

  /**
   * QR 코드로 연결 (간편 메서드)
   */
  async connectWithQR(qrCode: string): Promise<ConnectionConnectResponse> {
    return this.connectToCamera({
      connectionType: 'qr',
      qrCode
    });
  }
}

export const connectionService = new ConnectionService();
