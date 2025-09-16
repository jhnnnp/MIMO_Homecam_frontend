import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { RTCView } from 'react-native-webrtc';

interface WebRTCVideoPlayerProps {
    stream?: any;
    style?: any;
    objectFit?: 'contain' | 'cover';
    mirror?: boolean;
    onError?: (error: string) => void;
}

export const WebRTCVideoPlayer: React.FC<WebRTCVideoPlayerProps> = ({
    stream,
    style,
    objectFit = 'cover',
    mirror = false,
    onError
}) => {
    const videoRef = useRef<any>(null);

    useEffect(() => {
        if (stream && videoRef.current) {
            console.log('📺 [WebRTC Video] 스트림 설정됨:', stream.id);
        }
    }, [stream]);

    if (!stream) {
        return (
            <View style={[styles.container, style]}>
                <Text style={styles.placeholderText}>스트림을 기다리는 중...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, style]}>
            <RTCView
                ref={videoRef}
                streamURL={stream.toURL()}
                style={styles.video}
                objectFit={objectFit}
                mirror={mirror}
                onError={(error) => {
                    console.error('📺 [WebRTC Video] 오류:', error);
                    onError?.(error);
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    video: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    placeholderText: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
    },
}); 