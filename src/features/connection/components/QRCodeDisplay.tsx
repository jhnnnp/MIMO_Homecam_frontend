import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ConnectionGenerateResponse } from '@/features/connection/services/connectionService';

interface QRCodeDisplayProps {
  connectionData: ConnectionGenerateResponse;
  onRefresh?: () => void;
  onDisconnect?: () => void;
  timeLeft?: number;
  canRefresh?: boolean;
  isLoading?: boolean;
  error?: string | null;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  connectionData,
  onRefresh,
  onDisconnect,
  timeLeft = 0,
  canRefresh = false,
  isLoading = false,
  error = null
}) => {
  const [qrImageLoading, setQrImageLoading] = useState(false);
  const [qrImageError, setQrImageError] = useState<string | null>(null);
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleRefresh = () => {
    if (canRefresh && onRefresh) {
      onRefresh();
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      '연결 종료',
      '연결을 종료하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '종료', 
          style: 'destructive',
          onPress: onDisconnect 
        }
      ]
    );
  };

  // 에러 상태 표시
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={48} color="#FF3B30" />
          <Text style={styles.errorTitle}>연결 실패</Text>
          <Text style={styles.errorText}>{error}</Text>
          {canRefresh && (
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <Ionicons name="refresh-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>다시 시도</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // 로딩 상태 표시
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>연결 준비 중...</Text>
        </View>
      </View>
    );
  }

  if (connectionData.type === 'pin') {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Ionicons name="key-outline" size={24} color="#007AFF" />
          <Text style={styles.title}>PIN 코드 연결</Text>
        </View>
        
        <View style={styles.pinContainer}>
          <Text style={styles.pinCode}>{connectionData.pinCode}</Text>
          <View style={styles.pinDivider} />
          <Text style={styles.pinSubtext}>6자리 PIN 코드</Text>
        </View>
        
        <Text style={styles.instruction}>
          📱 뷰어 앱에서 위 PIN 코드를 입력하세요
        </Text>
        
        <View style={styles.statusContainer}>
          <View style={styles.statusItem}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.statusText}>만료: {formatTime(timeLeft)}</Text>
          </View>
          <View style={styles.statusItem}>
            <Ionicons name="link-outline" size={16} color="#666" />
            <Text style={styles.statusText}>ID: {connectionData.connectionId}</Text>
          </View>
          <View style={styles.statusItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#4CAF50" />
            <Text style={[styles.statusText, { color: '#4CAF50' }]}>연결 대기 중</Text>
          </View>
        </View>
        
        <View style={styles.buttonContainer}>
          {canRefresh && (
            <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
              <Ionicons name="refresh-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>새 PIN 생성</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
            <Ionicons name="stop-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>연결 종료</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>QR 코드 연결</Text>
      <View style={styles.qrContainer}>
        {connectionData.qrImage ? (
          <Image 
            source={{ uri: connectionData.qrImage }} 
            style={styles.qrCode}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.qrPlaceholder}>
            <Text style={styles.qrPlaceholderText}>QR 코드 로딩 중...</Text>
          </View>
        )}
      </View>
      <Text style={styles.instruction}>
        뷰어 앱에서 위 QR 코드를 스캔하세요
      </Text>
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          만료 시간: {formatTime(timeLeft)}
        </Text>
        <Text style={styles.infoText}>
          연결 ID: {connectionData.connectionId}
        </Text>
      </View>
      <View style={styles.buttonContainer}>
        {canRefresh && (
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Text style={styles.buttonText}>갱신</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
          <Text style={styles.buttonText}>연결 종료</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  pinContainer: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 280,
    alignItems: 'center',
  },
  pinCode: {
    fontSize: 52,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#007AFF',
    letterSpacing: 10,
    fontFamily: 'monospace',
  },
  pinDivider: {
    width: 60,
    height: 2,
    backgroundColor: '#E5E5E7',
    marginVertical: 12,
  },
  pinSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  qrContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrCode: {
    width: 200,
    height: 200,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
  },
  qrPlaceholderText: {
    color: '#666',
    fontSize: 16,
  },
  instruction: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  statusContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 15,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  infoContainer: {
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    maxWidth: 320,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    flex: 1,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  disconnectButton: {
    backgroundColor: '#FF3B30',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    flex: 1,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
