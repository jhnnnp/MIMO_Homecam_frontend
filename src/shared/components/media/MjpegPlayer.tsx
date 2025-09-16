import React, { useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, Text } from 'react-native';
import { MediaWsClient } from '../services/mediaWsClient';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    // @ts-ignore React Native provides btoa
    return typeof btoa !== 'undefined' ? btoa(binary) : '';
}

interface MjpegPlayerProps {
    url: string;
    style?: any;
}

export const MjpegPlayer: React.FC<MjpegPlayerProps> = ({ url, style }) => {
    const clientRef = useRef<MediaWsClient | null>(null);
    const [frameUri, setFrameUri] = useState<string | null>(null);
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

    useEffect(() => {
        const client = new MediaWsClient({
            url,
            onOpen: () => setStatus('connected'),
            onClose: () => setStatus('error'),
            onError: () => setStatus('error'),
            onBinaryFrame: (buf) => {
                const base64 = arrayBufferToBase64(buf);
                if (base64) setFrameUri(`data:image/jpeg;base64,${base64}`);
            },
            onJsonMessage: (msg) => {
                // stream_info/meta 등 처리 가능
            },
        });
        clientRef.current = client;
        client.connect();
        return () => {
            client.close();
            clientRef.current = null;
        };
    }, [url]);

    if (!frameUri) {
        return (
            <View style={[styles.container, style]}>
                <Text style={styles.text}>{status === 'connecting' ? '연결 중...' : '프레임 대기 중...'}</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, style]}>
            <Image source={{ uri: frameUri }} style={styles.image} resizeMode="cover" />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
    image: { width: '100%', height: '100%' },
    text: { color: '#fff' }
}); 