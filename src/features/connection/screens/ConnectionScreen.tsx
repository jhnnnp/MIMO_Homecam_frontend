import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useConnection } from '@/features/connection/services/useConnection';
import QRCodeDisplay from '@/features/connection/components/QRCodeDisplay';
import ConnectionInput from '@/shared/components/form/ConnectionInput';
import Button from '@/features/../shared/components/ui/Button';
import LoadingState from '@/shared/components/feedback/LoadingState';
import ErrorState from '../../../shared/components/feedback/ErrorState';

interface ConnectionScreenProps {
  cameraId?: string;
  mode?: 'publisher' | 'viewer';
}

export const ConnectionScreen: React.FC<ConnectionScreenProps> = ({
  cameraId = 'default_camera',
  mode = 'publisher'
}) => {
  const [showConnectionInput, setShowConnectionInput] = useState(false);
  
  const {
    connectionData,
    connectionStatus,
    isConnecting,
    isGenerating,
    error,
    generatePinCode,
    generateQRCode,
    connectWithPin,
    connectWithQR,
    refreshConnection,
    disconnectConnection,
    clearError,
    timeLeft,
    isExpired,
    canRefresh
  } = useConnection({ cameraId, autoRefresh: true });

  const handleGeneratePin = async () => {
    try {
      await generatePinCode(cameraId);
    } catch (err) {
      Alert.alert('오류', 'PIN 코드 생성에 실패했습니다.');
    }
  };

  const handleGenerateQR = async () => {
    try {
      await generateQRCode(cameraId);
    } catch (err) {
      Alert.alert('오류', 'QR 코드 생성에 실패했습니다.');
    }
  };

  const handleConnect = async (type: 'pin' | 'qr', data: string) => {
    try {
      const result = type === 'pin' 
        ? await connectWithPin(data)
        : await connectWithQR(data);
      
      if (result) {
        Alert.alert('성공', '카메라에 성공적으로 연결되었습니다!');
        setShowConnectionInput(false);
      }
      return result;
    } catch (err) {
      Alert.alert('오류', '연결에 실패했습니다.');
      return null;
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshConnection();
      Alert.alert('성공', '연결이 갱신되었습니다.');
    } catch (err) {
      Alert.alert('오류', '연결 갱신에 실패했습니다.');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectConnection();
      Alert.alert('성공', '연결이 종료되었습니다.');
    } catch (err) {
      Alert.alert('오류', '연결 종료에 실패했습니다.');
    }
  };

  const handleBackToSelection = () => {
    setShowConnectionInput(false);
    clearError();
  };

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={clearError}
        onBack={mode === 'viewer' ? handleBackToSelection : undefined}
      />
    );
  }

  if (isGenerating) {
    return <LoadingState message="연결 생성 중..." />;
  }

  if (isConnecting) {
    return <LoadingState message="연결 중..." />;
  }

  // 뷰어 모드 - 연결 입력 화면
  if (mode === 'viewer') {
    if (showConnectionInput) {
      return (
        <View style={styles.container}>
          <ConnectionInput
            onConnect={handleConnect}
            isConnecting={isConnecting}
          />
          <View style={styles.buttonContainer}>
            <Button
              title="뒤로가기"
              onPress={handleBackToSelection}
              variant="secondary"
            />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <View style={styles.selectionContainer}>
          <Button
            title="PIN 코드로 연결"
            onPress={() => setShowConnectionInput(true)}
            style={styles.selectionButton}
          />
          <Button
            title="QR 코드로 연결"
            onPress={() => setShowConnectionInput(true)}
            style={styles.selectionButton}
          />
        </View>
      </View>
    );
  }

  // 퍼블리셔 모드 - 연결 생성 화면
  if (connectionData) {
    return (
      <ScrollView style={styles.container}>
        <QRCodeDisplay
          connectionData={connectionData}
          onRefresh={canRefresh ? handleRefresh : undefined}
          onDisconnect={handleDisconnect}
          timeLeft={timeLeft}
          canRefresh={canRefresh}
        />
        
        {isExpired && (
          <View style={styles.expiredContainer}>
            <Button
              title="새로운 연결 생성"
              onPress={() => {
                disconnectConnection();
                setShowConnectionInput(false);
              }}
              variant="primary"
            />
          </View>
        )}
      </ScrollView>
    );
  }

  // 연결 생성 선택 화면
  return (
    <View style={styles.container}>
      <View style={styles.selectionContainer}>
        <Button
          title="PIN 코드 생성"
          onPress={handleGeneratePin}
          style={styles.selectionButton}
        />
        <Button
          title="QR 코드 생성"
          onPress={handleGenerateQR}
          style={styles.selectionButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  selectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 20,
  },
  selectionButton: {
    width: '100%',
    paddingVertical: 15,
  },
  buttonContainer: {
    padding: 20,
  },
  expiredContainer: {
    padding: 20,
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 10,
  },
});
