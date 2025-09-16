import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';

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
    metadata?: {
        resolution: string;
        frameRate: number;
        bitrate: number;
        audioEnabled: boolean;
    };
}

export interface RecordingSettings {
    quality: '480p' | '720p' | '1080p';
    frameRate: 24 | 30 | 60;
    audioEnabled: boolean;
    maxDuration: number; // 초 단위, 0 = 무제한
    autoSave: boolean;
    compression: 'low' | 'medium' | 'high';
}

class RecordingService {
    private activeRecordings: Map<string, RecordingSession> = new Map();
    private camera: Camera | null = null;
    private settings: RecordingSettings = {
        quality: '720p',
        frameRate: 30,
        audioEnabled: true,
        maxDuration: 0, // 무제한
        autoSave: true,
        compression: 'medium',
    };

    // 카메라 참조 설정
    setCameraRef(camera: Camera) {
        this.camera = camera;
    }

    // 녹화 설정 업데이트
    updateSettings(newSettings: Partial<RecordingSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
        console.log('⚙️ 녹화 설정 업데이트됨:', this.settings);
    }

    // 녹화 설정 조회
    getSettings(): RecordingSettings {
        return { ...this.settings };
    }

    // 녹화 시작
    async startRecording(cameraId: string): Promise<RecordingSession> {
        try {
            if (!this.camera) {
                throw new Error('카메라가 초기화되지 않았습니다.');
            }

            // 녹화 디렉토리 생성
            await this.ensureRecordingDirectory();

            // 녹화 파일명 생성
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `recording_${cameraId}_${timestamp}.mp4`;
            const filePath = `${FileSystem.documentDirectory}recordings/${fileName}`;

            // 녹화 세션 생성
            const session: RecordingSession = {
                id: `recording_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                cameraId,
                fileName,
                filePath,
                duration: 0,
                size: 0,
                createdAt: new Date(),
                status: 'recording',
                metadata: {
                    resolution: this.settings.quality,
                    frameRate: this.settings.frameRate,
                    bitrate: this.getBitrate(),
                    audioEnabled: this.settings.audioEnabled,
                },
            };

            // 카메라 녹화 시작
            const recording = await this.camera.recordAsync({
                quality: this.getVideoQuality(),
                maxDuration: this.settings.maxDuration || undefined,
                mute: !this.settings.audioEnabled,
                codec: 'h264',
                bitrate: this.getBitrate(),
                frameRate: this.settings.frameRate,
            });

            // 녹화 완료 처리
            session.status = 'completed';
            session.duration = recording.duration || 0;
            session.size = recording.size || 0;

            // 파일 정보 업데이트
            const fileInfo = await FileSystem.getInfoAsync(filePath);
            if (fileInfo.exists) {
                session.size = fileInfo.size || 0;
            }

            // 썸네일 생성
            await this.generateThumbnail(session);

            // 자동 저장 설정된 경우 갤러리에 저장
            if (this.settings.autoSave) {
                await this.saveToGallery(session);
            }

            this.activeRecordings.set(session.id, session);
            console.log('✅ 녹화 완료:', session.fileName);

            return session;
        } catch (error) {
            console.error('❌ 녹화 시작 실패:', error);
            throw new Error('녹화를 시작할 수 없습니다.');
        }
    }

    // 녹화 중지
    async stopRecording(sessionId: string): Promise<RecordingSession | null> {
        try {
            const session = this.activeRecordings.get(sessionId);
            if (!session) {
                throw new Error('녹화 세션을 찾을 수 없습니다.');
            }

            if (this.camera && session.status === 'recording') {
                await this.camera.stopRecording();
                session.status = 'completed';
                console.log('🛑 녹화 중지됨:', session.fileName);
            }

            return session;
        } catch (error) {
            console.error('❌ 녹화 중지 실패:', error);
            return null;
        }
    }

    // 스냅샷 촬영
    async takeSnapshot(cameraId: string): Promise<string> {
        try {
            if (!this.camera) {
                throw new Error('카메라가 초기화되지 않았습니다.');
            }

            // 스냅샷 디렉토리 생성
            await this.ensureSnapshotDirectory();

            // 스냅샷 파일명 생성
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `snapshot_${cameraId}_${timestamp}.jpg`;
            const filePath = `${FileSystem.documentDirectory}snapshots/${fileName}`;

            // 스냅샷 촬영
            const photo = await this.camera.takePictureAsync({
                quality: 0.8,
                base64: false,
                exif: true,
            });

            // 파일 이동
            await FileSystem.moveAsync({
                from: photo.uri,
                to: filePath,
            });

            console.log('📸 스냅샷 촬영됨:', fileName);
            return filePath;
        } catch (error) {
            console.error('❌ 스냅샷 촬영 실패:', error);
            throw new Error('스냅샷을 촬영할 수 없습니다.');
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
            console.log('📁 녹화 디렉토리 생성됨');
        }
    }

    // 스냅샷 디렉토리 생성
    private async ensureSnapshotDirectory(): Promise<void> {
        const snapshotsDir = `${FileSystem.documentDirectory}snapshots/`;
        const dirInfo = await FileSystem.getInfoAsync(snapshotsDir);

        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(snapshotsDir, { intermediates: true });
            console.log('📁 스냅샷 디렉토리 생성됨');
        }
    }

    // 파일명에서 카메라 ID 추출
    private extractCameraIdFromFileName(fileName: string): string {
        const match = fileName.match(/recording_(.+?)_/);
        return match ? match[1] : 'unknown';
    }

    // 비디오 품질 설정
    private getVideoQuality(): Camera.Constants.VideoQuality {
        switch (this.settings.quality) {
            case '480p':
                return Camera.Constants.VideoQuality['480p'];
            case '720p':
                return Camera.Constants.VideoQuality['720p'];
            case '1080p':
                return Camera.Constants.VideoQuality['1080p'];
            default:
                return Camera.Constants.VideoQuality['720p'];
        }
    }

    // 비트레이트 계산
    private getBitrate(): number {
        switch (this.settings.quality) {
            case '480p':
                return 1000000; // 1 Mbps
            case '720p':
                return 2000000; // 2 Mbps
            case '1080p':
                return 4000000; // 4 Mbps
            default:
                return 2000000; // 2 Mbps
        }
    }

    // 활성 녹화 세션 조회
    getActiveRecordings(): RecordingSession[] {
        return Array.from(this.activeRecordings.values());
    }

    // 특정 녹화 세션 조회
    getRecording(sessionId: string): RecordingSession | undefined {
        return this.activeRecordings.get(sessionId);
    }

    // 모든 녹화 중지
    async stopAllRecordings(): Promise<void> {
        try {
            const activeSessions = this.getActiveRecordings().filter(
                session => session.status === 'recording'
            );

            for (const session of activeSessions) {
                await this.stopRecording(session.id);
            }

            console.log('🛑 모든 녹화 중지됨');
        } catch (error) {
            console.error('❌ 모든 녹화 중지 실패:', error);
        }
    }

    // 리소스 정리
    cleanup(): void {
        this.camera = null;
        this.activeRecordings.clear();
        console.log('🧹 녹화 서비스 정리 완료');
    }
}

// 싱글톤 인스턴스
export const recordingService = new RecordingService();
export default recordingService; 