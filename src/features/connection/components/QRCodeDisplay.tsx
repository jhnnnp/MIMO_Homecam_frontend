import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ConnectionGenerateResponse } from '@/features/connection/services/connectionService';

interface QRCodeDisplayProps {
  connectionData: ConnectionGenerateResponse;
  onRefresh?: () => void;
  onDisconnect?: () => void;
  timeLeft?: number;
  canRefresh?: boolean;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  connectionData,
  onRefresh,
  onDisconnect,
  timeLeft = 0,
  canRefresh = false
}) => {
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

  if (connectionData.type === 'pin') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>PIN 코드 연결</Text>
        <View style={styles.pinContainer}>
          <Text style={styles.pinCode}>{connectionData.pinCode}</Text>
        </View>
        <Text style={styles.instruction}>
          뷰어 앱에서 위 PIN 코드를 입력하세요
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
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  pinContainer: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pinCode: {
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#007AFF',
    letterSpacing: 8,
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
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
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
    gap: 10,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  disconnectButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
