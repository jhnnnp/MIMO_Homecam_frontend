import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Camera } from 'expo-camera';
import { Alert } from 'react-native';

export interface RecordingSession {
    id: string;
    cameraId: string;
    fileName: string;
    filePath: string;
    duration: number;
    size: number;
    createdAt: Date;
    status: 'recording' | 'completed' | 'failed';
    thumbnailPath?: string;
}

export interface RecordingSettings {
    quality: 'low' | 'medium' | 'high' | 'max';
    maxDuration: number; // 초 단위
    autoSave: boolean;
    includeAudio: boolean;
}

class RecordingService {
    private activeRecordings: Map<string, RecordingSession> = new Map();
    private recordingSettings: RecordingSettings = {
        quality: 'high',
        maxDuration: 3600, // 1시간
        autoSave: true,
        includeAudio: true,
    };

    // 녹화 설정 업데이트
    updateSettings(settings: Partial<RecordingSettings>) {
        this.recordingSettings = { ...this.recordingSettings, ...settings };
    }

    // 현재 설정 조회
    getSettings(): RecordingSettings {
        return { ...this.recordingSettings };
    }

    // 녹화 시작
    async startRecording(
        cameraRef: React.RefObject<Camera>,
        cameraId: string
    ): Promise<RecordingSession> {
        try {
            // 권한 확인
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                throw new Error('미디어 라이브러리 접근 권한이 필요합니다.');
            }

            if (!cameraRef.current) {
                throw new Error('카메라가 초기화되지 않았습니다.');
            }

            // 녹화 세션 생성
            const sessionId = `recording_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const fileName = `MIMO_${cameraId}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.mp4`;
            const filePath = `${FileSystem.documentDirectory}recordings/${fileName}`;

            // 녹화 디렉토리 생성
            await this.ensureRecordingDirectory();

            // 녹화 품질 설정
            const quality = this.getQualitySetting();

            console.log('🎬 녹화 시작:', fileName);

            // 카메라 녹화 시작
            const recording = await cameraRef.current.recordAsync({
                quality,
                maxDuration: this.recordingSettings.maxDuration,
                mute: !this.recordingSettings.includeAudio,
            });

            // 녹화 세션 정보 생성
            const session: RecordingSession = {
                id: sessionId,
                cameraId,
                fileName,
                filePath: recording.uri,
                duration: recording.duration || 0,
                size: 0,
                createdAt: new Date(),
                status: 'recording',
            };

            this.activeRecordings.set(sessionId, session);

            // 녹화 완료 후 처리
            await this.handleRecordingComplete(session, recording);

            return session;
        } catch (error) {
            console.error('❌ 녹화 시작 실패:', error);
            throw new Error(`녹화를 시작할 수 없습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }
    }

    // 녹화 중지
    async stopRecording(sessionId: string): Promise<RecordingSession | null> {
        try {
            const session = this.activeRecordings.get(sessionId);
            if (!session) {
                throw new Error('녹화 세션을 찾을 수 없습니다.');
            }

            console.log('🛑 녹화 중지:', session.fileName);

            // 녹화 세션 상태 업데이트
            session.status = 'completed';
            this.activeRecordings.delete(sessionId);

            // 파일 정보 업데이트
            const fileInfo = await FileSystem.getInfoAsync(session.filePath);
            if (fileInfo.exists) {
                session.size = fileInfo.size || 0;
            }

            // 썸네일 생성
            await this.generateThumbnail(session);

            // 자동 저장 설정이 활성화된 경우 갤러리에 저장
            if (this.recordingSettings.autoSave) {
                await this.saveToGallery(session);
            }

            return session;
        } catch (error) {
            console.error('❌ 녹화 중지 실패:', error);
            throw new Error(`녹화를 중지할 수 없습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }
    }

    // 모든 활성 녹화 중지
    async stopAllRecordings(): Promise<RecordingSession[]> {
        const stoppedSessions: RecordingSession[] = [];

        for (const sessionId of this.activeRecordings.keys()) {
            try {
                const session = await this.stopRecording(sessionId);
                if (session) {
                    stoppedSessions.push(session);
                }
            } catch (error) {
                console.error(`❌ 녹화 중지 실패 (${sessionId}):`, error);
            }
        }

        return stoppedSessions;
    }

    // 녹화 완료 처리
    private async handleRecordingComplete(session: RecordingSession, recording: any) {
        try {
            // 파일 정보 업데이트
            const fileInfo = await FileSystem.getInfoAsync(recording.uri);
            if (fileInfo.exists) {
                session.size = fileInfo.size || 0;
                session.duration = recording.duration || 0;
            }

            // 썸네일 생성
            await this.generateThumbnail(session);

            // 자동 저장 설정이 활성화된 경우 갤러리에 저장
            if (this.recordingSettings.autoSave) {
                await this.saveToGallery(session);
            }

            console.log('✅ 녹화 완료:', session.fileName);
        } catch (error) {
            console.error('❌ 녹화 완료 처리 실패:', error);
            session.status = 'failed';
        }
    }

    // 썸네일 생성
    private async generateThumbnail(session: RecordingSession): Promise<void> {
        try {
            // 실제 구현에서는 비디오의 첫 프레임을 추출하여 썸네일 생성
            // 현재는 임시로 빈 파일 생성
            const thumbnailPath = session.filePath.replace('.mp4', '_thumb.jpg');
            session.thumbnailPath = thumbnailPath;

            console.log('🖼️ 썸네일 생성:', thumbnailPath);
        } catch (error) {
            console.error('❌ 썸네일 생성 실패:', error);
        }
    }

    // 갤러리에 저장
    async saveToGallery(session: RecordingSession): Promise<void> {
        try {
            const asset = await MediaLibrary.createAssetAsync(session.filePath);
            await MediaLibrary.createAlbumAsync('MIMO', asset, false);

            console.log('💾 갤러리에 저장됨:', session.fileName);
        } catch (error) {
            console.error('❌ 갤러리 저장 실패:', error);
            throw new Error('갤러리에 저장할 수 없습니다.');
        }
    }

    // 녹화 파일 삭제
    async deleteRecording(sessionId: string): Promise<boolean> {
        try {
            const session = this.activeRecordings.get(sessionId);
            if (!session) {
                throw new Error('녹화 세션을 찾을 수 없습니다.');
            }

            // 파일 삭제
            await FileSystem.deleteAsync(session.filePath, { idempotent: true });

            // 썸네일 삭제
            if (session.thumbnailPath) {
                await FileSystem.deleteAsync(session.thumbnailPath, { idempotent: true });
            }

            this.activeRecordings.delete(sessionId);
            console.log('🗑️ 녹화 파일 삭제됨:', session.fileName);

            return true;
        } catch (error) {
            console.error('❌ 녹화 파일 삭제 실패:', error);
            return false;
        }
    }

    // 녹화 목록 조회
    async getRecordings(): Promise<RecordingSession[]> {
        try {
            const recordingsDir = `${FileSystem.documentDirectory}recordings/`;
            const dirInfo = await FileSystem.getInfoAsync(recordingsDir);

            if (!dirInfo.exists) {
                return [];
            }

            const files = await FileSystem.readDirectoryAsync(recordingsDir);
            const recordings: RecordingSession[] = [];

            for (const fileName of files) {
                if (fileName.endsWith('.mp4')) {
                    const filePath = `${recordingsDir}${fileName}`;
                    const fileInfo = await FileSystem.getInfoAsync(filePath);

                    if (fileInfo.exists) {
                        const session: RecordingSession = {
                            id: `recording_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            cameraId: this.extractCameraIdFromFileName(fileName),
                            fileName,
                            filePath,
                            duration: 0, // 실제로는 비디오 메타데이터에서 추출
                            size: fileInfo.size || 0,
                            createdAt: new Date(fileInfo.modificationTime || Date.now()),
                            status: 'completed',
                            thumbnailPath: filePath.replace('.mp4', '_thumb.jpg'),
                        };

                        recordings.push(session);
                    }
                }
            }

            return recordings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        } catch (error) {
            console.error('❌ 녹화 목록 조회 실패:', error);
            return [];
        }
    }

    // 녹화 디렉토리 생성
    private async ensureRecordingDirectory(): Promise<void> {
        const recordingsDir = `${FileSystem.documentDirectory}recordings/`;
        const dirInfo = await FileSystem.getInfoAsync(recordingsDir);

        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(recordingsDir, { intermediates: true });
        }
    }

    // 품질 설정 변환
    private getQualitySetting(): any {
        switch (this.recordingSettings.quality) {
            case 'low':
                return Camera.Constants.VideoQuality['480p'];
            case 'medium':
                return Camera.Constants.VideoQuality['720p'];
            case 'high':
                return Camera.Constants.VideoQuality['1080p'];
            case 'max':
                return Camera.Constants.VideoQuality['4k'];
            default:
                return Camera.Constants.VideoQuality['1080p'];
        }
    }

    // 파일명에서 카메라 ID 추출
    private extractCameraIdFromFileName(fileName: string): string {
        const match = fileName.match(/MIMO_(.+?)_/);
        return match ? match[1] : 'unknown';
    }

    // 활성 녹화 세션 조회
    getActiveRecordings(): RecordingSession[] {
        return Array.from(this.activeRecordings.values());
    }

    // 녹화 중인지 확인
    isRecording(cameraId?: string): boolean {
        if (cameraId) {
            return Array.from(this.activeRecordings.values()).some(
                session => session.cameraId === cameraId && session.status === 'recording'
            );
        }
        return this.activeRecordings.size > 0;
    }

    // 저장 공간 사용량 조회
    async getStorageUsage(): Promise<{ used: number; total: number }> {
        try {
            const recordingsDir = `${FileSystem.documentDirectory}recordings/`;
            const dirInfo = await FileSystem.getInfoAsync(recordingsDir);

            if (!dirInfo.exists) {
                return { used: 0, total: 0 };
            }

            const files = await FileSystem.readDirectoryAsync(recordingsDir);
            let totalSize = 0;

            for (const fileName of files) {
                const filePath = `${recordingsDir}${fileName}`;
                const fileInfo = await FileSystem.getInfoAsync(filePath);
                if (fileInfo.exists) {
                    totalSize += fileInfo.size || 0;
                }
            }

            // 전체 저장 공간은 디바이스에 따라 다름
            return { used: totalSize, total: 0 };
        } catch (error) {
            console.error('❌ 저장 공간 사용량 조회 실패:', error);
            return { used: 0, total: 0 };
        }
    }

    // 오래된 녹화 파일 정리
    async cleanupOldRecordings(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
        try {
            const recordings = await this.getRecordings();
            const cutoffTime = Date.now() - maxAge;
            let deletedCount = 0;

            for (const recording of recordings) {
                if (recording.createdAt.getTime() < cutoffTime) {
                    const deleted = await this.deleteRecording(recording.id);
                    if (deleted) {
                        deletedCount++;
                    }
                }
            }

            console.log(`🧹 ${deletedCount}개의 오래된 녹화 파일 정리됨`);
            return deletedCount;
        } catch (error) {
            console.error('❌ 오래된 녹화 파일 정리 실패:', error);
            return 0;
        }
    }
}

// 싱글톤 인스턴스
export const recordingService = new RecordingService();
export default recordingService; 