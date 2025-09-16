import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './src/features/auth/screens/LoginScreen';

export default function App() {
    const [showLogin, setShowLogin] = useState(false);

    console.log('🎯 Simple App render - showLogin:', showLogin);

    if (showLogin) {
        return (
            <SafeAreaProvider>
                <LoginScreen navigation={{ navigate: () => console.log('Navigate called') }} />
                <StatusBar style="dark" />
            </SafeAreaProvider>
        );
    }

    return (
        <SafeAreaProvider>
            <View style={styles.container}>
                <Text style={styles.title}>🎉 MIMO 홈캠</Text>
                <Text style={styles.subtitle}>간단한 테스트 버전입니다</Text>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => {
                            console.log('Button pressed!');
                            setShowLogin(true);
                        }}
                    >
                        <Text style={styles.buttonText}>
                            로그인 화면 보기
                        </Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.info}>
                    위 버튼을 눌러 로그인 화면을 테스트해보세요!
                </Text>
            </View>
            <StatusBar style="dark" />
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2563EB',
        marginBottom: 16,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        color: '#374151',
        marginBottom: 32,
        textAlign: 'center',
    },
    buttonContainer: {
        marginVertical: 24,
    },
    button: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    info: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
        marginTop: 16,
    },
}); 