import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ConnectionConnectResponse } from '@/features/$CURRENT_FEATURE$/services/connectionService';

interface ConnectionInputProps {
  onConnect: (type: 'pin' | 'qr', data: string) => Promise<ConnectionConnectResponse | null>;
  isConnecting?: boolean;
}

export const ConnectionInput: React.FC<ConnectionInputProps> = ({
  onConnect,
  isConnecting = false
}) => {
  const [connectionType, setConnectionType] = useState<'pin' | 'qr'>('pin');
  const [pinCode, setPinCode] = useState('');
  const [qrCode, setQrCode] = useState('');

  const handleConnect = async () => {
    if (connectionType === 'pin') {
      if (!pinCode.trim()) {
        Alert.alert('오류', 'PIN 코드를 입력해주세요.');
        return;
      }
      if (!/^\d{6}$/.test(pinCode)) {
        Alert.alert('오류', 'PIN 코드는 6자리 숫자여야 합니다.');
        return;
      }
      await onConnect('pin', pinCode);
    } else {
      if (!qrCode.trim()) {
        Alert.alert('오류', 'QR 코드를 입력해주세요.');
        return;
      }
      await onConnect('qr', qrCode);
    }
  };

  const handleTypeChange = (type: 'pin' | 'qr') => {
    setConnectionType(type);
    setPinCode('');
    setQrCode('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>카메라 연결</Text>
      
      {/* 연결 방식 선택 */}
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            connectionType === 'pin' && styles.typeButtonActive
          ]}
          onPress={() => handleTypeChange('pin')}
        >
          <Text style={[
            styles.typeButtonText,
            connectionType === 'pin' && styles.typeButtonTextActive
          ]}>
            PIN 코드
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.typeButton,
            connectionType === 'qr' && styles.typeButtonActive
          ]}
          onPress={() => handleTypeChange('qr')}
        >
          <Text style={[
            styles.typeButtonText,
            connectionType === 'qr' && styles.typeButtonTextActive
          ]}>
            QR 코드
          </Text>
        </TouchableOpacity>
      </View>

      {/* PIN 코드 입력 */}
      {connectionType === 'pin' && (
        <View style={styles.inputContainer}>
          <Text style={styles.label}>PIN 코드 입력</Text>
          <TextInput
            style={styles.pinInput}
            value={pinCode}
            onChangeText={setPinCode}
            placeholder="123456"
            keyboardType="numeric"
            maxLength={6}
            textAlign="center"
            editable={!isConnecting}
          />
          <Text style={styles.helpText}>
            6자리 숫자 PIN 코드를 입력하세요
          </Text>
        </View>
      )}

      {/* QR 코드 입력 */}
      {connectionType === 'qr' && (
        <View style={styles.inputContainer}>
          <Text style={styles.label}>QR 코드 입력</Text>
          <TextInput
            style={styles.qrInput}
            value={qrCode}
            onChangeText={setQrCode}
            placeholder="QR 코드 데이터를 입력하거나 붙여넣으세요"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={!isConnecting}
          />
          <Text style={styles.helpText}>
            QR 코드를 스캔하거나 데이터를 직접 입력하세요
          </Text>
        </View>
      )}

      {/* 연결 버튼 */}
      <TouchableOpacity
        style={[styles.connectButton, isConnecting && styles.connectButtonDisabled]}
        onPress={handleConnect}
        disabled={isConnecting}
      >
        <Text style={styles.connectButtonText}>
          {isConnecting ? '연결 중...' : '연결하기'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 30,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  inputContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  pinInput: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 4,
    marginBottom: 10,
  },
  qrInput: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 14,
    marginBottom: 10,
    minHeight: 80,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  connectButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  connectButtonDisabled: {
    backgroundColor: '#ccc',
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
