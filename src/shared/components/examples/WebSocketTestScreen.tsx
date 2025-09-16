import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    StatusBar,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppBar from '@/shared/components/layout/AppBar';
import { colors, spacing, radius, elevation, typography } from '@/design/tokens';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/app/navigation/AppNavigator';

type WebSocketTestScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'WebSocketTest'>;

interface WebSocketTestScreenProps {
    navigation: WebSocketTestScreenNavigationProp;
}

interface Message {
    id: string;
    text: string;
    timestamp: Date;
    type: 'sent' | 'received' | 'system';
}

export default function WebSocketTestScreen({ navigation }: WebSocketTestScreenProps) {
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [serverUrl, setServerUrl] = useState('ws://192.168.0.9:8080');
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');

    const wsRef = useRef<WebSocket | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    const addMessage = (text: string, type: 'sent' | 'received' | 'system') => {
        const newMessage: Message = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            text,
            timestamp: new Date(),
            type,
        };
        setMessages(prev => [...prev, newMessage]);
    };

    const connectWebSocket = () => {
        if (isConnected) {
            disconnectWebSocket();
            return;
        }

        try {
            setConnectionStatus('connecting');
            addMessage('연결 시도 중...', 'system');

            const ws = new WebSocket(serverUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                setIsConnected(true);
                setConnectionStatus('connected');
                addMessage('웹소켓 연결 성공!', 'system');
            };

            ws.onmessage = (event) => {
                addMessage(`수신: ${event.data}`, 'received');
            };

            ws.onclose = (event) => {
                setIsConnected(false);
                setConnectionStatus('disconnected');
                addMessage(`연결 종료: ${event.code} - ${event.reason}`, 'system');
            };

            ws.onerror = (error) => {
                setConnectionStatus('error');
                addMessage('연결 오류 발생', 'system');
                console.error('WebSocket error:', error);
            };

        } catch (error) {
            setConnectionStatus('error');
            addMessage('연결 실패', 'system');
            console.error('Connection error:', error);
        }
    };

    const disconnectWebSocket = () => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
        setConnectionStatus('disconnected');
        addMessage('연결 해제됨', 'system');
    };

    const sendMessage = () => {
        if (!inputText.trim() || !isConnected) return;

        try {
            wsRef.current?.send(inputText);
            addMessage(`전송: ${inputText}`, 'sent');
            setInputText('');
        } catch (error) {
            addMessage('메시지 전송 실패', 'system');
            console.error('Send error:', error);
        }
    };

    const clearMessages = () => {
        setMessages([]);
    };

    const sendTestMessage = (message: string) => {
        if (!isConnected) {
            Alert.alert('연결 필요', '먼저 웹소켓에 연결해주세요.');
            return;
        }
        setInputText(message);
    };

    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    const getStatusColor = () => {
        switch (connectionStatus) {
            case 'connected': return colors.success;
            case 'connecting': return colors.warning;
            case 'error': return colors.error;
            default: return colors.textSecondary;
        }
    };

    const getStatusText = () => {
        switch (connectionStatus) {
            case 'connected': return '연결됨';
            case 'connecting': return '연결 중...';
            case 'error': return '오류';
            default: return '연결 안됨';
        }
    };

    return (
        <>
            <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
            <View style={styles.container}>
                <SafeAreaView style={styles.safeArea}>
                    <AppBar
                        title="웹소켓 테스트"
                        showBackButton
                        onBackPress={() => navigation.goBack()}
                    />
                    <ScrollView style={styles.scrollContainer}>
                        {/* Connection Settings */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="wifi" size={20} color={colors.primary} />
                                <Text style={styles.sectionTitle}>연결 설정</Text>
                            </View>
                            <TextInput
                                style={styles.urlInput}
                                value={serverUrl}
                                onChangeText={setServerUrl}
                                placeholder="웹소켓 서버 URL"
                                placeholderTextColor={colors.textSecondary}
                            />
                            <TouchableOpacity
                                style={[
                                    styles.connectButton,
                                    { backgroundColor: isConnected ? colors.error : colors.primary }
                                ]}
                                onPress={connectWebSocket}
                                disabled={connectionStatus === 'connecting'}
                            >
                                <Ionicons
                                    name={isConnected ? "close-circle" : "wifi"}
                                    size={20}
                                    color={colors.surface}
                                />
                                <Text style={styles.connectButtonText}>
                                    {isConnected ? '연결 해제' : '연결'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Quick Test Messages */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="send" size={20} color={colors.primary} />
                                <Text style={styles.sectionTitle}>빠른 테스트</Text>
                            </View>
                            <View style={styles.quickButtons}>
                                <TouchableOpacity
                                    style={styles.quickButton}
                                    onPress={() => sendTestMessage('ping')}
                                >
                                    <Text style={styles.quickButtonText}>Ping</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.quickButton}
                                    onPress={() => sendTestMessage('{"type": "test", "data": "hello"}')}
                                >
                                    <Text style={styles.quickButtonText}>JSON</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.quickButton}
                                    onPress={() => sendTestMessage('camera_status')}
                                >
                                    <Text style={styles.quickButtonText}>카메라 상태</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Messages */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="chatbubble-ellipses" size={20} color={colors.primary} />
                                <Text style={styles.sectionTitle}>메시지 로그</Text>
                            </View>
                            <View style={styles.messagesHeader}>
                                <TouchableOpacity onPress={clearMessages}>
                                    <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                            <ScrollView
                                ref={scrollViewRef}
                                style={styles.messagesList}
                                showsVerticalScrollIndicator={false}
                                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                            >
                                {messages.map((message) => (
                                    <View key={message.id} style={styles.messageItem}>
                                        <View style={[
                                            styles.messageBubble,
                                            message.type === 'sent' && styles.sentMessage,
                                            message.type === 'received' && styles.receivedMessage,
                                            message.type === 'system' && styles.systemMessage,
                                        ]}>
                                            <Text style={[
                                                styles.messageText,
                                                message.type === 'system' && styles.systemMessageText
                                            ]}>
                                                {message.text}
                                            </Text>
                                            <Text style={styles.messageTime}>
                                                {message.timestamp.toLocaleTimeString()}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Input */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="send" size={20} color={colors.primary} />
                                <Text style={styles.sectionTitle}>메시지 입력</Text>
                            </View>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.messageInput}
                                    value={inputText}
                                    onChangeText={setInputText}
                                    placeholder="메시지를 입력하세요..."
                                    placeholderTextColor={colors.textSecondary}
                                    multiline
                                    maxLength={500}
                                />
                                <TouchableOpacity
                                    style={[styles.sendButton, !isConnected && styles.sendButtonDisabled]}
                                    onPress={sendMessage}
                                    disabled={!isConnected}
                                >
                                    <Ionicons name="send" size={20} color={colors.surface} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    safeArea: {
        flex: 1,
    },
    scrollContainer: {
        flex: 1,
        padding: spacing.lg,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        ...elevation['1'],
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.text,
    },
    urlInput: {
        borderWidth: 1,
        borderColor: colors.divider,
        borderRadius: radius.md,
        padding: spacing.md,
        fontSize: 14,
        color: colors.text,
        marginBottom: spacing.md,
        backgroundColor: colors.surfaceAlt,
    },
    connectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.md,
    },
    connectButtonText: {
        color: colors.surface,
        fontSize: 14,
        fontWeight: '600',
    },
    quickTestCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        ...elevation['2'],
    },
    quickButtons: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    quickButton: {
        flex: 1,
        padding: spacing.sm,
        backgroundColor: colors.primary + '10',
        borderRadius: radius.md,
        alignItems: 'center',
    },
    quickButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
    },
    messagesContainer: {
        flex: 1,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        ...elevation['2'],
        overflow: 'hidden',
    },
    messagesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    messagesList: {
        flex: 1,
        padding: spacing.md,
    },
    messageItem: {
        marginBottom: spacing.sm,
    },
    messageBubble: {
        padding: spacing.md,
        borderRadius: radius.lg,
        maxWidth: '80%',
        alignSelf: 'flex-start',
    },
    sentMessage: {
        backgroundColor: colors.primary,
        alignSelf: 'flex-end',
    },
    receivedMessage: {
        backgroundColor: colors.surfaceAlt,
    },
    systemMessage: {
        backgroundColor: colors.warning + '20',
        alignSelf: 'center',
        maxWidth: '90%',
    },
    messageText: {
        fontSize: 14,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    systemMessageText: {
        color: colors.warning,
        fontWeight: '600',
    },
    messageTime: {
        fontSize: 10,
        color: colors.textSecondary,
        alignSelf: 'flex-end',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: spacing.lg,
        gap: spacing.sm,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
    },
    messageInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.divider,
        borderRadius: radius.lg,
        padding: spacing.md,
        fontSize: 14,
        color: colors.text,
        backgroundColor: colors.surfaceAlt,
        maxHeight: 100,
        minHeight: 44,
    },
    sendButton: {
        backgroundColor: colors.primary,
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: colors.textSecondary,
    },
}); 