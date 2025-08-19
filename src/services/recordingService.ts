import { ApiResponse, Recording, PresignedUrl } from '../types/api';
import apiService from './api';

export interface RecordingCreateRequest {
    eventId: number;
    fileName: string;
    duration: number;
    fileSize: number;
    index: number;
    s3Key?: string;
    metadata?: Record<string, any>;
}

export interface RecordingUpdateRequest {
    fileName?: string;
    duration?: number;
    fileSize?: number;
    s3Key?: string;
    metadata?: Record<string, any>;
}

export interface RecordingStatsResponse {
    totalRecordings: number;
    totalSize: number;
    totalDuration: number;
    recordingsByCamera: Record<number, number>;
    averageFileSize: number;
    averageDuration: number;
}

export interface MediaPresignRequest {
    fileName: string;
    fileType: string;
    eventId?: number;
}

class RecordingService {
    // 녹화 파일 목록 조회
    async getRecordings(page?: number, limit?: number): Promise<ApiResponse<Recording[]>> {
        const params = new URLSearchParams();
        if (page) params.append('page', page.toString());
        if (limit) params.append('limit', limit.toString());

        const url = params.toString() ? `/recordings?${params.toString()}` : '/recordings';
        return await apiService.get<Recording[]>(url);
    }

    // 새 녹화 파일 생성
    async createRecording(recording: RecordingCreateRequest): Promise<ApiResponse<Recording>> {
        return await apiService.post<Recording>('/recordings', recording);
    }

    // 녹화 파일 상세 조회
    async getRecordingById(id: number): Promise<ApiResponse<Recording>> {
        return await apiService.get<Recording>(`/recordings/${id}`);
    }

    // 녹화 파일 업데이트
    async updateRecording(id: number, updates: RecordingUpdateRequest): Promise<ApiResponse<Recording>> {
        return await apiService.put<Recording>(`/recordings/${id}`, updates);
    }

    // 녹화 파일 삭제
    async deleteRecording(id: number): Promise<ApiResponse<void>> {
        return await apiService.delete<void>(`/recordings/${id}`);
    }

    // 녹화 파일 통계 조회
    async getRecordingStats(): Promise<ApiResponse<RecordingStatsResponse>> {
        return await apiService.get<RecordingStatsResponse>('/recordings/stats');
    }

    // 업로드용 Presigned URL 생성
    async getUploadPresignedUrl(request: MediaPresignRequest): Promise<ApiResponse<PresignedUrl>> {
        return await apiService.post<PresignedUrl>('/media/presign', request);
    }

    // 업로드 완료 통지
    async completeUpload(s3Key: string, eventId?: number): Promise<ApiResponse<void>> {
        return await apiService.post<void>('/media/complete', { s3Key, eventId });
    }

    // 다운로드용 Presigned URL
    async getDownloadPresignedUrl(recordingId: number): Promise<ApiResponse<PresignedUrl>> {
        return await apiService.get<PresignedUrl>(`/clips/${recordingId}/presign-get`);
    }
}

export const recordingService = new RecordingService();
export default recordingService; 